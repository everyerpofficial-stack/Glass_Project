import React, { useState, useMemo, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  dmy,
  nf,
  getPaymentDueDateInfo,
  workOrderBelongsTo,
  buildPrintHTML,
  computeTotals,
  formatOrderId,
  formatPiNo,
  isCancelled,
  uid,
} from "@/lib/gq";
import { useGQ } from "@/lib/store";
import { printElement } from "@/lib/print";
import { CutSheetGroup } from "@/components/app/CutSheetGroup";
import { SheetFitToggle, SheetViewHint } from "@/components/app/SheetViewport";
import { useSheetViewport } from "@/hooks/use-sheet-viewport";
import {
  FileText,
  User,
  Phone,
  Mail,
  MapPin,
  UserCheck,
  Printer,
  Edit3,
  CheckCircle2,
  Clock,
  AlertCircle,
  Calendar,
  Factory,
  Tag,
  BarChart3,
  X,
  Layers,
  Sparkles,
  CreditCard,
  Plus,
  History,
  Trash2,
} from "lucide-react";

/* ── Pure JS Code128B barcode SVG generator ────────────────────────── */
function generateBarcodeSVG(text: string, height = 36, barWidth = 1.2): string {
  const CODE128B: Record<string, string> = {
    " ": "11011001100",
    "!": "11001101100",
    '"': "11001100110",
    "#": "10010011000",
    $: "10010001100",
    "%": "10001001100",
    "&": "10011001000",
    "'": "10011000100",
    "(": "10001100100",
    ")": "11001001000",
    "*": "11001000100",
    "+": "11000100100",
    ",": "10110011100",
    "-": "10011011100",
    ".": "10011001110",
    "/": "10111001100",
    "0": "10011101100",
    "1": "10011100110",
    "2": "11001110010",
    "3": "11001011100",
    "4": "11001001110",
    "5": "11011100100",
    "6": "11001110100",
    "7": "11101101110",
    "8": "11101001100",
    "9": "11100101100",
    ":": "11100100110",
    ";": "11101100100",
    "<": "11100110100",
    "=": "11100110010",
    ">": "11011011000",
    "?": "11011000110",
    "@": "11000110110",
    A: "10100011000",
    B: "10001011000",
    C: "10001000110",
    D: "10110001000",
    E: "10001101000",
    F: "10001100010",
    G: "11010001000",
    H: "11000101000",
    I: "11000100010",
    J: "10110111000",
    K: "10110001110",
    L: "10001101110",
    M: "10111011000",
    N: "10111000110",
    O: "10001110110",
    P: "11101110110",
    Q: "11010001110",
    R: "11000101110",
    S: "11011101000",
    T: "11011100010",
    U: "11011101110",
    V: "11101011000",
    W: "11101000110",
    X: "11100010110",
    Y: "11101101000",
    Z: "11101100010",
    "[": "11100011010",
    "\\": "11101111010",
    "]": "11001000010",
    "^": "11110001010",
    _: "10100110000",
    "`": "10100001100",
    a: "10010110000",
    b: "10010000110",
    c: "10000101100",
    d: "10000100110",
    e: "10110010000",
    f: "10110000100",
    g: "10011010000",
    h: "10011000010",
    i: "10000110100",
    j: "10000110010",
    k: "11000010010",
    l: "11001010000",
    m: "11110111010",
    n: "11000010100",
    o: "10001111010",
    p: "10100111100",
    q: "10010111100",
    r: "10010011110",
    s: "10111100100",
    t: "10011110100",
    u: "10011110010",
    v: "11110100100",
    w: "11110010100",
    x: "11110010010",
    y: "11011011110",
    z: "11011110110",
    "{": "11110110110",
    "|": "10101111000",
    "}": "10100011110",
    "~": "10001011110",
  };
  const START_B = "11010010000";
  const STOP = "1100011101011";

  let checksum = 104;
  let pattern = START_B;
  const safeText = String(text || "");
  for (let i = 0; i < safeText.length; i++) {
    const charCode = safeText.charCodeAt(i) - 32;
    checksum += charCode * (i + 1);
    pattern += CODE128B[safeText.charAt(i)] || "10101111000";
  }
  const checksumChar = String.fromCharCode((checksum % 103) + 32);
  pattern += CODE128B[checksumChar] || "10101111000";
  pattern += STOP;

  const totalWidth = pattern.length * barWidth;
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} ${height}" width="${totalWidth}" height="${height}">`;
  for (let i = 0; i < pattern.length; i++) {
    if (pattern[i] === "1") {
      svg += `<rect x="${i * barWidth}" y="0" width="${barWidth}" height="${height}" fill="black"/>`;
    }
  }
  svg += "</svg>";
  return svg;
}

interface InvoiceDetailModalProps {
  invoice: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (invoice: any) => void;
  initialTab?: "overview" | "proforma" | "cutsheet" | "stickers";
}

export function InvoiceDetailModal({
  invoice: rawInvoice,
  open,
  onOpenChange,
  onEdit,
  initialTab = "overview",
}: InvoiceDetailModalProps) {
  const {
    invoices,
    workOrders,
    settings,
    payments,
    generateWorkOrder,
    saveWorkOrder,
    updateInvoiceStatus,
    savePayment,
    deletePayment,
    patchInvoice,
  } = useGQ();

  /* Find live invoice from store (falls back to rawInvoice if not found) */
  const invoice = useMemo(() => {
    if (!rawInvoice?.id) return rawInvoice;
    return invoices.find((x: any) => String(x.id) === String(rawInvoice.id)) || rawInvoice;
  }, [invoices, rawInvoice]);
  const [activeTab, setActiveTab] = useState<"overview" | "proforma" | "cutsheet" | "stickers">(
    initialTab,
  );
  const [labelsPerRow, setLabelsPerRow] = useState<number>(4);
  const [showRecordPayment, setShowRecordPayment] = useState(false);
  const [payDate, setPayDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [payMode, setPayMode] = useState("UPI / Google Pay");
  const [payAmount, setPayAmount] = useState("");
  const [payRefNo, setPayRefNo] = useState("");
  const [payNotes, setPayNotes] = useState("");
  /* Points at the printable element of whichever tab is open. Only one tab is
     mounted at a time, so a single ref is unambiguous — and it beats querying
     by class name, since `.wo-print-area` also exists on the /work-order route
     sitting behind this modal. */
  const printRef = useRef<HTMLDivElement>(null);

  /* Reset tab when modal opens */
  const invoiceId = invoice?.id;
  useEffect(() => {
    if (open) setActiveTab(initialTab);
  }, [open, invoiceId, initialTab]);

  /* Find existing Work Order (pure lookup, no side effects) */
  const activeWO = useMemo(
    () => (invoice ? (workOrders.find((w: any) => workOrderBelongsTo(w, invoice)) ?? null) : null),
    [workOrders, invoice],
  );

  /* Compute totals & proforma HTML */
  const totals = useMemo(
    () => (invoice && settings ? computeTotals(settings, invoice) : null),
    [settings, invoice],
  );
  const proformaHTML = useMemo(
    () => (invoice && totals && settings ? buildPrintHTML(settings, invoice, totals) : ""),
    [settings, invoice, totals],
  );

  /* Product-Grouped Pieces for Work Order Cut Sheet */
  const woProductGroups = useMemo(() => {
    if (!activeWO || !activeWO.pieces) return [];
    const map = new Map<string, { title: string; pieces: any[] }>();
    activeWO.pieces.forEach((p: any) => {
      const key = String(p.layerIdx !== undefined ? p.layerIdx : p.productName || "0");
      const title =
        p.productName || p.layerNo || activeWO.glassDesc || `${activeWO.thickness || 5}mm Glass`;
      if (!map.has(key)) {
        map.set(key, { title, pieces: [] });
      }
      map.get(key)!.pieces.push(p);
    });
    return Array.from(map.values());
  }, [activeWO]);

  /* The cut sheet's own width: the entered-size columns (L1/L2 and, when it is
     on, FREQ) are only there for an inch document, so an mm sheet is narrower
     and can be scaled less on a phone. */
  const docUnit = invoice?.inputUnit || activeWO?.inputUnit || "inch";
  const isMM = docUnit === "mm";
  const isFreqOn = !isMM && Boolean(invoice?.frequencyEnabled ?? activeWO?.frequencyEnabled);
  const sheet = useSheetViewport(isMM ? 820 : 990);

  /* Sticker labels data */
  const stickerLabels = useMemo(() => {
    if (!activeWO || !activeWO.pieces) return [];
    return activeWO.pieces.map((piece: any, idx: number) => ({
      customer: activeWO.customer || invoice?.cust?.name || "Customer",
      piNo: activeWO.piNo || invoice?.no,
      woNo: activeWO.woNo?.replace("WO-", "") || invoice?.orderNo || invoice?.no,
      size: `${piece.heightMM} X ${piece.widthMM}`,
      sn: piece.sr,
      glassType:
        activeWO.glassDesc || `${activeWO.thickness || 5}mm ${activeWO.productName || "Glass"}`,
      pieceOf: piece.pieceOf || `1 of ${activeWO.pieces.length}`,
      shape: piece.shape || "BLOCK",
      code: `${idx + 1} ${piece.shape === "BLOCK" ? "W1" : "SD1"}`,
      partyWO: activeWO.orderNo || invoice?.orderNo,
      barcode: piece.barcode || `000${idx + 1}`,
    }));
  }, [activeWO, invoice]);

  /* Matched payments for this invoice */
  const invoicePayments = useMemo(() => {
    if (!invoice || !payments) return [];
    const iNo = String(invoice.no || "")
      .trim()
      .toLowerCase();
    const oNo = String(invoice.orderNo || "")
      .trim()
      .toLowerCase();
    const preNo = String(invoice.preProformaNo || "")
      .trim()
      .toLowerCase();
    const pId = String(invoice.id || "")
      .trim()
      .toLowerCase();

    return (payments || []).filter((p: any) => {
      if (!p || !p.invoiceNo) return false;
      const pNo = String(p.invoiceNo).trim().toLowerCase();
      return (
        pNo === iNo ||
        (oNo && pNo === oNo) ||
        (preNo && pNo === preNo) ||
        pNo === pId ||
        formatPiNo(pNo) === formatPiNo(iNo)
      );
    });
  }, [invoice, payments]);

  const matchedPaymentsSum = useMemo(() => {
    return invoicePayments.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);
  }, [invoicePayments]);

  /* Early return AFTER all hooks */
  if (!open || !invoice) return null;

  const grandTotal = Number(invoice.totals?.grandTotal || totals?.grandTotal || 0);
  const paidAmount = Math.max(Number(invoice.paidAmount || 0), matchedPaymentsSum);
  const pendingAmount = Math.max(0, grandTotal - paidAmount);
  const isPaidFull = pendingAmount <= 0 && grandTotal > 0;
  const isPre = invoice.docType === "pre_proforma";
  const isConfirmed =
    invoice.docType === "proforma" ||
    invoice.status === "order_confirmed" ||
    invoice.status === "work_order_generated";
  const docTypeLabel = isPre ? "Proforma Invoice" : "Order Confirm";
  const dueInfo = getPaymentDueDateInfo(invoice, payments);
  const isDocCancelled = isCancelled(invoice);

  const handleRecordPaymentSubmit = () => {
    if (isDocCancelled) {
      toast.error("Cannot record payment on a cancelled document");
      return;
    }
    if (isPaidFull) {
      toast.error("This document is already fully paid. No balance due.");
      return;
    }
    const amt = Number(payAmount);
    if (isNaN(amt) || amt <= 0) {
      toast.error("Enter a valid payment amount");
      return;
    }
    if (amt > pendingAmount) {
      toast.error(`Payment amount cannot exceed pending balance of ₹${nf(pendingAmount)}`);
      return;
    }

    savePayment({
      id: uid("pay"),
      custName: invoice.cust?.name || "Customer",
      custId: invoice.cust?.id || "",
      invoiceNo: invoice.no || "",
      date: payDate,
      amount: amt,
      mode: payMode,
      refNo: payRefNo,
      notes: payNotes || "Payment received via Invoice Preview",
      createdAt: new Date().toISOString(),
    });

    const currentPaid = Number(invoice.paidAmount || 0);
    const updatedPaid = currentPaid + amt;
    const gTotal = Number(invoice.totals?.grandTotal || totals?.grandTotal || 0);
    const newRemaining = Math.max(0, gTotal - updatedPaid);
    const newPaymentStatus = newRemaining <= 0 ? "paid" : updatedPaid > 0 ? "partial" : "unpaid";

    patchInvoice(invoice.id, {
      paidAmount: updatedPaid,
      remainingBalance: newRemaining,
      paymentStatus: newPaymentStatus,
      paymentRef: payRefNo || invoice.paymentRef,
      paymentNotes: payNotes || invoice.paymentNotes,
    });

    toast.success(`Recorded ₹${amt.toLocaleString("en-IN")} payment for Invoice #${invoice.no}`);
    setShowRecordPayment(false);
    setPayAmount("");
    setPayRefNo("");
    setPayNotes("");
  };

  /* Ensure work order exists (called lazily when switching to cut sheet / stickers tab) */
  const ensureWorkOrder = () => {
    if (activeWO) return;
    if (!invoice.id) return;
    const wo = generateWorkOrder(invoice.id);
    if (wo) {
      saveWorkOrder(wo);
      updateInvoiceStatus(invoice.id, "work_order_generated");
    }
  };

  /* Print whichever document the open tab is showing.

     Every tab attaches `printRef` to its printable element, and only one tab is
     mounted at a time, so the ref always points at what the user is looking at.
     printElement() prints that element out of the live page — same DOM, same
     stylesheet — which is what makes the paper match the preview. The previous
     approach copied the element's HTML into a blank second window that had no
     stylesheet at all, so the sticker's colour, grid and type sizes were all
     dropped and it printed as plain text. */
  const handleGenerateWO = () => {
    if (!invoice?.id) return;
    const wo = generateWorkOrder(invoice.id);
    if (wo) {
      saveWorkOrder(wo);
      updateInvoiceStatus(invoice.id, "work_order_generated");
      toast.success(`Work Order #${wo.woNo} generated successfully!`);
    }
  };

  const printActive = (orientation: "portrait" | "landscape", margin = "6mm 4mm") => {
    if (!printElement(printRef.current, { orientation, margin })) {
      toast.error("Nothing to print on this tab yet.");
    }
  };

  const handlePrintProforma = () => printActive("portrait", "4mm 3mm");
  const handlePrintCutSheet = () => printActive("landscape", "5mm 4mm");
  const handlePrintStickers = () => printActive("portrait", "5mm");

  const handlePrintActive = () =>
    printActive(
      activeTab === "cutsheet" ? "landscape" : "portrait",
      activeTab === "stickers" ? "5mm" : "4mm 3mm",
    );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        style={{ paddingTop: "var(--safe-top)", paddingBottom: "var(--safe-bottom)" }}
        className="h-[100dvh] max-h-[100dvh] w-screen max-w-none overflow-hidden overflow-y-hidden rounded-none border-0 p-0 gap-0 flex flex-col shadow-2xl bg-background [&>button.absolute]:hidden sm:h-[94vh] sm:max-h-[94vh] sm:w-[98vw] sm:max-w-7xl sm:rounded-2xl sm:border sm:border-border/80"
      >
        <DialogTitle className="sr-only">
          {docTypeLabel} {invoice.no} Details
        </DialogTitle>

        {/* ════ HEADER ROW 1: Invoice Info + Actions ════ */}
        <div className="bg-card text-card-foreground px-3 py-2.5 sm:px-5 sm:py-3 border-b border-border shrink-0 flex items-center justify-between gap-2 sm:gap-4 print:hidden">
          {/* Left: Invoice identity */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-xs shrink-0">
              <FileText className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono font-bold text-primary">
                  #{formatPiNo(invoice.no)}
                </span>
                <span className="hidden max-w-[220px] truncate text-sm font-bold text-foreground sm:inline">
                  {invoice.cust?.name || "Customer"}
                </span>
                {isPaidFull ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 whitespace-nowrap">
                    ✓ Paid Full
                  </span>
                ) : paidAmount > 0 ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 whitespace-nowrap">
                    Partial Paid
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 whitespace-nowrap">
                    Credit / Pending
                  </span>
                )}
              </div>
              <div className="truncate text-[13px] font-bold text-foreground sm:hidden">
                {invoice.cust?.name || "Customer"}
              </div>
              <div className="text-[11px] text-muted-foreground font-mono mt-0.5">
                {dmy(invoice.date)} &nbsp;•&nbsp; ₹ {nf(grandTotal)}
              </div>
            </div>
          </div>

          {/* Right: Action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              className="h-9 gap-1 px-2.5 text-[11px] font-bold bg-slate-700 hover:bg-slate-800 text-white sm:h-7"
              onClick={handlePrintActive}
            >
              <Printer className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Print</span>
            </Button>
            <button
              onClick={() => onOpenChange(false)}
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-sm font-bold text-muted-foreground transition-colors hover:bg-rose-600 hover:text-white sm:h-7 sm:w-7 sm:text-xs"
              title="Close"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>

        {/* ════ HEADER ROW 2: Tab Navigation ════ */}
        <div className="bg-muted/40 px-3 py-1.5 sm:px-5 border-b border-border shrink-0 flex items-center gap-1.5 overflow-x-auto hide-scrollbar print:hidden">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === "overview"
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            <BarChart3 className="h-3.5 w-3.5" />
            Overview
          </button>

          <button
            onClick={() => setActiveTab("proforma")}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === "proforma"
                ? "bg-primary text-primary-foreground font-bold shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            <Printer className="h-3.5 w-3.5" />
            {isConfirmed ? "Confirm PDF" : "Proforma PDF"}
          </button>

          {isConfirmed && (
            <>
              <button
                onClick={() => {
                  ensureWorkOrder();
                  setActiveTab("cutsheet");
                }}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === "cutsheet"
                    ? "bg-amber-600 text-white shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <Factory className="h-3.5 w-3.5" />
                Work Order Cut Sheet
              </button>

              <button
                onClick={() => {
                  ensureWorkOrder();
                  setActiveTab("stickers");
                }}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === "stickers"
                    ? "bg-yellow-500 text-slate-950 font-bold shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <Tag className="h-3.5 w-3.5" />
                Barcode Stickers
              </button>
            </>
          )}
        </div>

        {/* ════ MAIN MODAL BODY AREA (SCROLLABLE EDGE-TO-EDGE) ════ */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-3 sm:p-6 bg-muted/20">
          {/* ─── TAB 1: OVERVIEW & DETAILS ─── */}
          {activeTab === "overview" && (
            <div className="space-y-5 animate-in fade-in-50">
              {isDocCancelled && (
                <div className="bg-rose-500/15 border border-rose-500/40 rounded-xl p-3.5 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-2 shadow-xs">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>
                    THIS DOCUMENT IS CANCELLED — IT IS READ-ONLY AND CANNOT BE EDITED OR PROCESSED.
                  </span>
                </div>
              )}

              {/* Financial KPI Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                {/* Total Amount */}
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 sm:p-3.5 shadow-sm">
                  <div className="text-[9px] sm:text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                    Total Amount
                  </div>
                  <div className="text-base sm:text-xl font-bold text-slate-900 dark:text-white font-mono mt-0.5 sm:mt-1">
                    ₹ {nf(grandTotal)}
                  </div>
                  <div className="text-[9px] sm:text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                    Grand bill total
                  </div>
                </div>

                {/* Paid Amount */}
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 sm:p-3.5 shadow-sm">
                  <div className="text-[9px] sm:text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                    ✓ Paid Amount
                  </div>
                  <div className="text-base sm:text-xl font-bold text-emerald-600 dark:text-emerald-400 font-mono mt-0.5 sm:mt-1">
                    ₹ {nf(paidAmount)}
                  </div>
                  <div className="text-[9px] sm:text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                    Received so far
                  </div>
                </div>

                {/* Pending Balance */}
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 sm:p-3.5 shadow-sm">
                  <div className="text-[9px] sm:text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                    {pendingAmount > 0 ? "⚠ Pending" : "✓ No Due"}
                  </div>
                  <div
                    className={`text-base sm:text-xl font-bold font-mono mt-0.5 sm:mt-1 ${
                      pendingAmount > 0
                        ? "text-red-600 dark:text-red-400"
                        : "text-emerald-600 dark:text-emerald-400"
                    }`}
                  >
                    ₹ {nf(pendingAmount)}
                  </div>
                  <div className="text-[9px] sm:text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                    {pendingAmount > 0 ? "Remaining to pay" : "Fully cleared"}
                  </div>
                </div>

                {/* Payment Due Date */}
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 sm:p-3.5 shadow-sm">
                  <div className="text-[9px] sm:text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                    Due Date
                  </div>
                  <div className="text-sm sm:text-base font-bold text-slate-900 dark:text-white font-mono mt-0.5 sm:mt-1">
                    {dmy(dueInfo.dueDate)}
                  </div>
                  <div className="text-[9px] sm:text-[10px] font-semibold mt-0.5 text-blue-600 dark:text-blue-400">
                    {dueInfo.label}
                  </div>
                </div>
              </div>

              {/* Record Payment Option / Form Section */}
              {!isDocCancelled && (
                <div className="flex items-center justify-between bg-card border border-border rounded-xl p-3 shadow-xs">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-emerald-600" />
                    <span className="text-xs font-bold text-foreground">Payment Status</span>
                    <span className="text-[11px] text-muted-foreground hidden sm:inline">
                      (Paid: ₹ {nf(paidAmount)} | Balance: ₹ {nf(pendingAmount)})
                    </span>
                  </div>
                  {isPaidFull ? (
                    <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />{" "}
                      Fully Paid (No Due)
                    </span>
                  ) : (
                    <Button
                      size="sm"
                      className={`h-7 text-xs gap-1 px-3 font-bold transition-colors ${
                        showRecordPayment
                          ? "bg-rose-100 hover:bg-rose-200 text-rose-700 border border-rose-300 dark:bg-rose-950/60 dark:hover:bg-rose-900/80 dark:text-rose-300 dark:border-rose-800"
                          : "bg-emerald-600 hover:bg-emerald-700 text-white"
                      }`}
                      onClick={() => setShowRecordPayment((v) => !v)}
                    >
                      {showRecordPayment ? (
                        <X className="h-3.5 w-3.5" />
                      ) : (
                        <Plus className="h-3.5 w-3.5" />
                      )}
                      {showRecordPayment ? "Close" : "Record Payment"}
                    </Button>
                  )}
                </div>
              )}

              {showRecordPayment && !isDocCancelled && !isPaidFull && (
                <div className="bg-white dark:bg-slate-800 border-2 border-emerald-500/40 rounded-xl p-4 space-y-3 shadow-md animate-in fade-in-50 text-xs">
                  <div className="font-bold text-foreground flex items-center gap-1.5 text-xs pb-2 border-b border-border/50">
                    <CreditCard className="h-4 w-4 text-emerald-600" /> Payment Details for #
                    {invoice.no} ({invoice.cust?.name || "Customer"})
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-muted-foreground uppercase">
                        Payment Date
                      </label>
                      <Input
                        type="date"
                        className="h-8 text-xs mt-1 bg-background"
                        value={payDate}
                        onChange={(e) => setPayDate(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-muted-foreground uppercase">
                        Payment Mode
                      </label>
                      <Select value={payMode} onValueChange={setPayMode}>
                        <SelectTrigger className="h-8 text-xs mt-1 bg-background">
                          <SelectValue placeholder="Select mode" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="UPI / Google Pay">UPI / Google Pay</SelectItem>
                          <SelectItem value="Cash">Cash</SelectItem>
                          <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                          <SelectItem value="Cheque">Cheque</SelectItem>
                          <SelectItem value="Credit">Credit</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">
                          Amount Received (₹) *
                        </label>
                        <span className="text-[10px] font-mono font-bold text-muted-foreground">
                          Max: ₹{nf(pendingAmount)}
                        </span>
                      </div>
                      <Input
                        type="number"
                        step="any"
                        min="0.01"
                        max={pendingAmount}
                        placeholder={`Max ₹${nf(pendingAmount)}`}
                        className={`h-8 text-xs font-mono font-bold mt-1 bg-background ${
                          Number(payAmount) > pendingAmount
                            ? "text-rose-600 border-rose-500 focus-visible:ring-rose-500"
                            : "text-emerald-600"
                        }`}
                        value={payAmount}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === "") {
                            setPayAmount("");
                            return;
                          }
                          const num = Number(val);
                          if (num > pendingAmount) {
                            toast.warning(
                              `Payment cannot exceed pending balance of ₹${nf(pendingAmount)}`,
                            );
                            setPayAmount(String(pendingAmount));
                          } else {
                            setPayAmount(val);
                          }
                        }}
                      />
                      {Number(payAmount) > pendingAmount && (
                        <span className="text-[10px] text-rose-500 font-semibold mt-0.5 block">
                          Amount cannot exceed pending balance of ₹{nf(pendingAmount)}
                        </span>
                      )}
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-muted-foreground uppercase">
                        Transaction / Ref No.
                      </label>
                      <Input
                        type="text"
                        placeholder="e.g. UPI-9872134"
                        className="h-8 text-xs mt-1 bg-background"
                        value={payRefNo}
                        onChange={(e) => setPayRefNo(e.target.value)}
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase">
                        Notes / Remarks
                      </label>
                      <Input
                        type="text"
                        placeholder="e.g. Advance payment received"
                        className="h-8 text-xs mt-1 bg-background"
                        value={payNotes}
                        onChange={(e) => setPayNotes(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setShowRecordPayment(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1"
                      onClick={handleRecordPaymentSubmit}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Save Payment Record
                    </Button>
                  </div>
                </div>
              )}

              {/* Payment History Section */}
              <div className="bg-card border border-border rounded-xl p-3 sm:p-4 space-y-3 shadow-xs">
                <div className="flex items-center justify-between border-b border-border pb-2.5 gap-2">
                  <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                    <History className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-foreground">
                      Payment History
                    </span>
                    <span className="text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-1.5 sm:px-2 py-0.5 rounded-full border border-emerald-500/30 shrink-0">
                      {invoicePayments.length}
                    </span>
                  </div>
                  <div className="text-[11px] sm:text-xs font-mono font-bold text-foreground whitespace-nowrap">
                    Paid:{" "}
                    <span className="text-emerald-600 dark:text-emerald-400">
                      ₹ {nf(paidAmount)}
                    </span>
                  </div>
                </div>

                {invoicePayments.length > 0 ? (
                  <>
                    {/* ── Desktop table (hidden on mobile) ── */}
                    <div className="hidden sm:block overflow-x-auto">
                      <table className="w-full text-xs text-left border-collapse">
                        <thead>
                          <tr className="border-b border-border bg-muted/40 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            <th className="py-2 px-3">Date</th>
                            <th className="py-2 px-3">Payment Mode</th>
                            <th className="py-2 px-3">Ref / Txn No</th>
                            <th className="py-2 px-3">Notes / Remarks</th>
                            <th className="py-2 px-3 text-right">Amount Received</th>
                            {!isDocCancelled && <th className="py-2 px-3 text-center">Action</th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/40 font-mono">
                          {invoicePayments.map((p: any, idx: number) => (
                            <tr key={p.id || idx} className="hover:bg-muted/20 transition-colors">
                              <td className="py-2 px-3 text-foreground font-medium whitespace-nowrap">
                                {dmy(p.date || p.createdAt)}
                              </td>
                              <td className="py-2 px-3 font-sans whitespace-nowrap">
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                                  {p.mode || p.paymentType || "Cash"}
                                </span>
                              </td>
                              <td className="py-2 px-2.5 text-muted-foreground whitespace-nowrap">
                                {p.refNo || "—"}
                              </td>
                              <td className="py-2 px-3 text-muted-foreground font-sans truncate max-w-[200px]">
                                {p.notes || "—"}
                              </td>
                              <td className="py-2 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                                ₹ {nf(Number(p.amount || 0))}
                              </td>
                              {!isDocCancelled && (
                                <td className="py-2 px-3 text-center whitespace-nowrap">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-rose-500 hover:text-rose-700 hover:bg-rose-500/10 cursor-pointer"
                                    title="Delete payment record"
                                    onClick={() => {
                                      if (
                                        confirm(
                                          "Are you sure you want to delete this payment record?",
                                        )
                                      ) {
                                        deletePayment(p.id);
                                        toast.success("Payment record deleted");
                                      }
                                    }}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* ── Mobile card list (hidden on desktop) ── */}
                    <div className="sm:hidden space-y-2">
                      {invoicePayments.map((p: any, idx: number) => (
                        <div
                          key={p.id || idx}
                          className="bg-muted/20 border border-border/60 rounded-lg p-2.5 space-y-1.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-mono font-medium text-foreground">
                              {dmy(p.date || p.createdAt)}
                            </span>
                            <span className="text-sm font-mono font-bold text-emerald-600 dark:text-emerald-400">
                              ₹ {nf(Number(p.amount || 0))}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                              {p.mode || p.paymentType || "Cash"}
                            </span>
                            {!isDocCancelled && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-rose-500 hover:text-rose-700 hover:bg-rose-500/10 cursor-pointer"
                                title="Delete payment record"
                                onClick={() => {
                                  if (
                                    confirm("Are you sure you want to delete this payment record?")
                                  ) {
                                    deletePayment(p.id);
                                    toast.success("Payment record deleted");
                                  }
                                }}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                          {(p.refNo || p.notes) && (
                            <div className="text-[11px] text-muted-foreground space-y-0.5 pt-0.5 border-t border-border/40">
                              {p.refNo && (
                                <div className="font-mono">
                                  <span className="font-semibold text-foreground">Ref:</span>{" "}
                                  {p.refNo}
                                </div>
                              )}
                              {p.notes && (
                                <div className="truncate">
                                  <span className="font-semibold text-foreground">Note:</span>{" "}
                                  {p.notes}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-4 text-xs text-muted-foreground font-medium bg-muted/20 rounded-lg border border-dashed border-border/60">
                    No payment transactions recorded for this document yet.
                  </div>
                )}
              </div>

              {/* Customer & Order Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Customer Details */}
                <div className="bg-card border border-border rounded-xl p-4 space-y-2.5 shadow-xs">
                  <div className="font-bold text-foreground flex items-center gap-1.5 pb-2 border-b border-border/60 text-xs">
                    <User className="h-4 w-4 text-primary" /> Customer Information
                  </div>
                  <div className="space-y-1.5">
                    <div className="font-bold text-base text-foreground">
                      {invoice.cust?.name || "—"}
                    </div>
                    {invoice.cust?.phone && (
                      <div className="flex items-center gap-2 text-muted-foreground font-mono">
                        <Phone className="h-3.5 w-3.5 text-primary/70" /> {invoice.cust.phone}
                      </div>
                    )}
                    {invoice.cust?.email && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="h-3.5 w-3.5 text-primary/70" /> {invoice.cust.email}
                      </div>
                    )}
                    {invoice.cust?.gstin && (
                      <div className="text-xs font-mono text-muted-foreground">
                        <span className="font-semibold text-foreground">GSTIN:</span>{" "}
                        {invoice.cust.gstin}
                      </div>
                    )}
                    {invoice.cust?.addr && (
                      <div className="flex items-start gap-2 text-muted-foreground mt-1">
                        <MapPin className="h-3.5 w-3.5 text-primary/70 shrink-0 mt-0.5" />
                        <span>{invoice.cust.addr}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Sales & Booking Details */}
                <div className="bg-card border border-border rounded-xl p-4 space-y-2.5 shadow-xs">
                  <div className="font-bold text-foreground flex items-center gap-1.5 pb-2 border-b border-border/60 text-xs">
                    <UserCheck className="h-4 w-4 text-primary" /> Order Information & Staff
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase font-semibold">
                        Sales Person (Taken By)
                      </div>
                      <div className="font-semibold text-foreground mt-0.5">
                        {invoice.salesPerson || "Office"}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase font-semibold">
                        P.O. Number
                      </div>
                      <div className="font-mono text-foreground mt-0.5">{invoice.poNo || "—"}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase font-semibold">
                        Booking Reference
                      </div>
                      <div className="font-mono text-foreground mt-0.5">
                        {formatOrderId(invoice.preProformaNo || invoice.orderNo)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase font-semibold">
                        Freight Type
                      </div>
                      <div className="text-foreground mt-0.5">
                        {invoice.freightType || "To be Billed"}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase font-semibold">
                        Payment Mode
                      </div>
                      <div className="font-semibold text-foreground mt-0.5">
                        {invoice.delivery?.paymentType || invoice.delivery?.paymentTerm || "Credit"}
                      </div>
                    </div>
                    {invoice.paymentRef && (
                      <div>
                        <div className="text-[10px] text-muted-foreground uppercase font-semibold">
                          Payment Ref / Txn No
                        </div>
                        <div className="font-mono text-foreground mt-0.5">{invoice.paymentRef}</div>
                      </div>
                    )}
                    {invoice.paymentNotes && (
                      <div className="col-span-2">
                        <div className="text-[10px] text-muted-foreground uppercase font-semibold">
                          Payment Note
                        </div>
                        <div className="text-foreground mt-0.5 italic">{invoice.paymentNotes}</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Item Details Table */}
              <div className="border border-border rounded-xl overflow-hidden bg-card shadow-xs">
                <div className="bg-muted/40 px-4 py-2.5 text-xs font-bold border-b border-border text-foreground flex items-center justify-between">
                  <span>
                    Item Details ({invoice.items?.length || invoice.layers?.length || 0} items)
                  </span>
                  <span className="text-[11px] font-mono text-muted-foreground">
                    Total: ₹ {nf(grandTotal)}
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted/20 text-[10px] font-bold uppercase text-muted-foreground border-b border-border">
                      <tr>
                        <th className="py-2.5 px-3">#</th>
                        <th className="py-2.5 px-3">Product / Glass Description</th>
                        <th className="py-2.5 px-3 text-center">Thickness</th>
                        <th className="py-2.5 px-3 text-center">Qty</th>
                        <th className="py-2.5 px-3 text-center">Area</th>
                        <th className="py-2.5 px-3 text-right">Rate</th>
                        <th className="py-2.5 px-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {(invoice.items || invoice.layers || []).map((item: any, idx: number) => {
                        const computedLine = totals?.lines?.[idx];
                        const layerObj = invoice.layers?.[idx] || null;
                        const prodName =
                          layerObj?.productName ||
                          layerObj?.glassName ||
                          item.productName ||
                          item.glassName ||
                          invoice.productName ||
                          "Glass Item";
                        const thickness =
                          computedLine?.thickness ||
                          layerObj?.thickness ||
                          item.thickness ||
                          item.thk ||
                          invoice.glass?.thickness ||
                          5;
                        const qty =
                          computedLine?.pcs || computedLine?.qty || item.qty || item.pcs || 1;
                        const areaVal =
                          computedLine?.sqft || item.sqft || computedLine?.sqm || item.sqm || "—";

                        const rateVal = Number(
                          computedLine?.rate ??
                            (item.rate !== "" && item.rate != null ? item.rate : null) ??
                            (layerObj?.rate !== "" && layerObj?.rate != null
                              ? layerObj.rate
                              : null) ??
                            invoice.glass?.defaultRate ??
                            0,
                        );

                        const amountVal = Number(
                          computedLine?.amount ??
                            computedLine?.lineTotal ??
                            computedLine?.gross ??
                            (item.amount !== "" && item.amount != null ? item.amount : null) ??
                            (rateVal > 0
                              ? rateVal *
                                (Number(computedLine?.sqft || item.sqft || item.sqm || 0) || 1)
                              : 0),
                        );

                        return (
                          <tr key={idx} className="hover:bg-muted/10">
                            <td className="py-2.5 px-3 text-muted-foreground font-mono text-[11px]">
                              {idx + 1}
                            </td>
                            <td className="py-2.5 px-3 font-semibold text-foreground">
                              {prodName}
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono">{thickness} mm</td>
                            <td className="py-2.5 px-3 text-center font-bold font-mono">{qty}</td>
                            <td className="py-2.5 px-3 text-center font-mono text-muted-foreground">
                              {areaVal !== "—" ? nf(Number(areaVal), 3) : "—"}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-medium">
                              ₹ {nf(rateVal)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-foreground">
                              ₹ {nf(amountVal)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ─── TAB 2: PROFORMA / CONFIRM INVOICE (PRINTABLE DOCUMENT) ─── */}
          {activeTab === "proforma" && (
            <div className="animate-in fade-in-50 space-y-4">
              <div className="flex items-center justify-between px-2 print:hidden">
                <span className="text-xs text-muted-foreground font-semibold">
                  A4 Printable {isConfirmed ? "Order Confirm" : "Proforma Invoice"} PDF Preview
                </span>
                <Button
                  size="sm"
                  onClick={handlePrintProforma}
                  className="h-8 text-xs font-bold gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Printer className="h-3.5 w-3.5" /> Print / Save PDF
                </Button>
              </div>

              <div className="bg-card text-card-foreground border border-border/80 rounded-xl p-2 sm:p-6 shadow-md max-w-4xl mx-auto overflow-hidden print:p-0 print:border-none print:shadow-none print:rounded-none print:max-w-full print:w-full print:m-0">
                <div className="pdf-scale-wrapper print:!transform-none print:!origin-top-left">
                  <div
                    ref={printRef}
                    className="doc-preview bg-white text-black min-w-[760px] sm:min-w-0 print:p-0 print:m-0 print:min-w-full"
                    dangerouslySetInnerHTML={{ __html: proformaHTML || "" }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ─── TAB 3: WORK ORDER CUT SHEET ─── */}
          {activeTab === "cutsheet" && (
            <div className="animate-in fade-in-50 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-2 print:hidden">
                <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5">
                  <Factory className="h-4 w-4 text-amber-500" />
                  Work Order Cut Sheet for #{activeWO?.woNo || invoice.orderNo || invoice.no}
                </span>
                <div className="flex items-center gap-2">
                  <SheetFitToggle fit={sheet.fit} onToggle={sheet.toggleFit} className="flex-1" />
                  <Button
                    size="sm"
                    onClick={handlePrintCutSheet}
                    className="h-8 text-xs font-bold gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
                  >
                    <Printer className="h-3.5 w-3.5" /> Print Cut Sheet
                  </Button>
                </div>
              </div>

              {!activeWO ? (
                <div className="text-center py-16 bg-card border border-border rounded-xl">
                  <Factory className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-50" />
                  <p className="text-sm font-semibold text-foreground">
                    No Work Order generated yet
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 mb-4">
                    Generate a work order cut sheet and barcode stickers for this confirmed order.
                  </p>
                  <Button
                    onClick={handleGenerateWO}
                    className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold"
                  >
                    <Factory className="h-3.5 w-3.5 mr-1.5" />
                    Generate Work Order
                  </Button>
                </div>
              ) : (
                <>
                  <div ref={sheet.frameRef} className="wo-sheet-frame">
                    <div style={sheet.zoomStyle}>
                      <div
                        ref={printRef}
                        style={sheet.canvasStyle}
                        className="wo-print-area wo-sheet-canvas bg-white text-black p-3 sm:p-6 border border-gray-300 rounded-xl shadow-xs max-w-5xl mx-auto space-y-4 print:p-0 print:border-none print:shadow-none print:max-w-full print:w-full print:m-0"
                      >
                        {/* WO Header */}
                        <div className="border-b-2 border-black pb-3 mb-3">
                          <div className="flex flex-row justify-between items-start gap-4">
                            <div className="text-[11px] space-y-0.5 min-w-0">
                              <div className="truncate">
                                <span className="font-bold">Customer :</span>{" "}
                                {activeWO.customer || invoice.cust?.name || "—"}
                              </div>
                              <div>
                                <span className="font-bold">PI No. :</span>{" "}
                                <span className="font-mono font-bold">
                                  {activeWO.piNo || invoice.no || "—"}
                                </span>
                              </div>
                              <div>
                                <span className="font-bold">PI Date :</span>{" "}
                                {dmy(activeWO.piDate || invoice.date)}
                              </div>
                              <div className="break-words">
                                <span className="font-bold">Dispatch To :</span>{" "}
                                {activeWO.dispatchTo || invoice.cust?.addr || "—"}
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="text-xl font-black tracking-wide text-black">
                                WORK ORDER
                              </div>
                              <div className="text-[11px] mt-1 space-y-0.5">
                                <div>
                                  <span className="font-bold">Order No :</span>{" "}
                                  <span className="font-mono text-sm font-bold">
                                    {activeWO.orderNo || invoice.orderNo || invoice.no || "—"}
                                  </span>
                                </div>
                                <div>
                                  <span className="font-bold">Our Date :</span>{" "}
                                  {dmy(activeWO.piDate || invoice.date || new Date())}
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="mt-2 pt-2 border-t border-gray-300 text-[11px]">
                            <div>
                              <span className="font-bold">PO No. :</span>{" "}
                              {activeWO.poNo || invoice.poNo || "—"} &nbsp;&nbsp;{" "}
                              <span className="font-bold">Project :</span>{" "}
                              {activeWO.project || invoice.projectRemark || "—"}
                            </div>
                            <div className="mt-1 font-bold text-sm">
                              {activeWO.glassDesc ||
                                (activeWO.thickness
                                  ? `${activeWO.thickness}mm ${activeWO.productName || "Glass"}`
                                  : invoice.productName || "Glass")}
                            </div>
                          </div>
                        </div>

                        {/* WO Product-Grouped Tables */}
                        <div className="space-y-4">
                          {woProductGroups.length === 0 ? (
                            <div className="p-4 text-center text-xs text-muted-foreground">
                              No cut pieces recorded
                            </div>
                          ) : (
                            woProductGroups.map((grp: any, gIdx: number) => {
                              const isSqft = settings?.rateUnit === "sqft";

                              return (
                                <CutSheetGroup
                                  key={gIdx}
                                  group={grp}
                                  index={gIdx}
                                  isMM={isMM}
                                  isFreqOn={isFreqOn}
                                  isSqft={isSqft}
                                  areaUnitLabel={isSqft ? "sq.ft." : "sq.mtr"}
                                  totals={totals}
                                />
                              );
                            })
                          )}

                          {/* Overall Work Order Grand Summary Footer */}
                          <div className="border border-black bg-gray-100 p-2 font-bold text-[11px] flex flex-row justify-between gap-2">
                            <div>Grand Total: {activeWO.totalPieces} Pcs</div>
                            <div className="text-[11px]">
                              {nf(activeWO.totalSqm, 3)} SQM &nbsp;|&nbsp;{" "}
                              {nf(activeWO.totalSqft, 3)} SQFT &nbsp;|&nbsp; Weight:{" "}
                              {activeWO.weightKg || "—"} kg
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <SheetViewHint fit={sheet.fit} />
                </>
              )}
            </div>
          )}

          {/* ─── TAB 4: BARCODE STICKER LABELS ─── */}
          {activeTab === "stickers" && (
            <div className="animate-in fade-in-50 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-2 print:hidden">
                <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5">
                  <Tag className="h-4 w-4 text-yellow-500" />
                  {stickerLabels.length} Barcode Sticker Label(s)
                </span>
                <div className="flex items-center gap-2">
                  <Select
                    value={String(labelsPerRow)}
                    onValueChange={(v) => setLabelsPerRow(Number(v))}
                  >
                    <SelectTrigger className="h-8 text-xs w-28 bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 per row</SelectItem>
                      <SelectItem value="2">2 per row</SelectItem>
                      <SelectItem value="3">3 per row</SelectItem>
                      <SelectItem value="4">4 per row</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    size="sm"
                    onClick={handlePrintStickers}
                    className="h-8 text-xs font-bold gap-1.5 bg-yellow-500 hover:bg-yellow-600 text-black"
                  >
                    <Printer className="h-3.5 w-3.5" /> Print
                    <span className="hidden sm:inline">Sticker Labels</span>
                  </Button>
                </div>
              </div>

              {!stickerLabels.length ? (
                <div className="text-center py-16 text-xs text-muted-foreground">
                  No barcode stickers available for this order.
                </div>
              ) : (
                <div
                  ref={printRef}
                  className="sticker-print-area sticker-grid grid gap-3 max-w-5xl mx-auto print:gap-1"
                  style={{
                    gridTemplateColumns: `repeat(${labelsPerRow}, 1fr)`,
                  }}
                >
                  {stickerLabels.map((label: any, idx: number) => (
                    <div
                      key={idx}
                      className="sticker-label bg-[#FFD700] text-black rounded-xl border-2 border-yellow-600/40 p-3 flex flex-col gap-1 shadow-md break-inside-avoid"
                      style={{ minHeight: "140px" }}
                    >
                      {/* Customer name */}
                      <div className="text-[11px] font-black uppercase leading-tight tracking-wide truncate">
                        {label.customer}
                      </div>

                      {/* PI / WO / Size / SN row */}
                      <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px]">
                        <div>
                          <span className="font-bold">PI :</span>{" "}
                          <span className="font-mono">{label.piNo}</span>
                        </div>
                        <div>
                          <span className="font-bold">WO :</span>{" "}
                          <span className="font-mono">{label.woNo}</span>
                        </div>
                        <div>
                          <span className="font-bold">Size :</span>{" "}
                          <span className="font-mono font-bold">{label.size}</span>
                        </div>
                        <div>
                          <span className="font-bold">SN :</span>{" "}
                          <span className="font-mono">{label.sn}</span>
                        </div>
                      </div>

                      {/* Glass type */}
                      <div className="text-[9px] uppercase leading-tight truncate">
                        {label.glassType}{" "}
                        <span className="font-bold">
                          of {label.pieceOf?.split(" of ")[1] || "1"}
                        </span>
                      </div>

                      {/* Code and shape */}
                      <div className="text-[9px] font-bold uppercase flex justify-between items-center">
                        <span>{label.code}</span>
                        <span>{label.shape}</span>
                      </div>

                      {/* Barcode SVG */}
                      <div className="mt-1 pt-1 border-t border-black/20 flex flex-col items-center justify-center">
                        <div
                          className="w-full flex justify-center overflow-hidden"
                          dangerouslySetInnerHTML={{
                            __html: generateBarcodeSVG(label.barcode || label.sn, 30, 1.1),
                          }}
                        />
                        <div className="text-[9px] font-mono font-bold tracking-widest mt-0.5">
                          *{label.barcode || label.sn}*
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
