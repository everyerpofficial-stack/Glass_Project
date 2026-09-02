import React, { useState, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { dmy, nf, getPaymentDueDateInfo, workOrderBelongsTo, buildPrintHTML, computeTotals } from "@/lib/gq";
import { useGQ } from "@/lib/store";
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
} from "lucide-react";

/* ── Pure JS Code128B barcode SVG generator ────────────────────────── */
function generateBarcodeSVG(text: string, height = 36, barWidth = 1.2): string {
  const CODE128B: Record<string, string> = {
    " ": "11011001100", "!": "11001101100", '"': "11001100110",
    "#": "10010011000", "$": "10010001100", "%": "10001001100",
    "&": "10011001000", "'": "10011000100", "(": "10001100100",
    ")": "11001001000", "*": "11001000100", "+": "11000100100",
    ",": "10110011100", "-": "10011011100", ".": "10011001110",
    "/": "10111001100", "0": "10011101100", "1": "10011100110",
    "2": "11001110010", "3": "11001011100", "4": "11001001110",
    "5": "11011100100", "6": "11001110100", "7": "11101101110",
    "8": "11101001100", "9": "11100101100", ":": "11100100110",
    ";": "11101100100", "<": "11100110100", "=": "11100110010",
    ">": "11011011000", "?": "11011000110", "@": "11000110110",
    A: "10100011000", B: "10001011000", C: "10001000110",
    D: "10110001000", E: "10001101000", F: "10001100010",
    G: "11010001000", H: "11000101000", I: "11000100010",
    J: "10110111000", K: "10110001110", L: "10001101110",
    M: "10111011000", N: "10111000110", O: "10001110110",
    P: "11101110110", Q: "11010001110", R: "11000101110",
    S: "11011101000", T: "11011100010", U: "11011101110",
    V: "11101011000", W: "11101000110", X: "11100010110",
    Y: "11101101000", Z: "11101100010", "[": "11100011010",
    "\\": "11101111010", "]": "11001000010", "^": "11110001010",
    _: "10100110000", "`": "10100001100", a: "10010110000",
    b: "10010000110", c: "10000101100", d: "10000100110",
    e: "10110010000", f: "10110000100", g: "10011010000",
    h: "10011000010", i: "10000110100", j: "10000110010",
    k: "11000010010", l: "11001010000", m: "11110111010",
    n: "11000010100", o: "10001111010", p: "10100111100",
    q: "10010111100", r: "10010011110", s: "10111100100",
    t: "10011110100", u: "10011110010", v: "11110100100",
    w: "11110010100", x: "11110010010", y: "11011011110",
    z: "11011110110", "{": "11110110110", "|": "10101111000",
    "}": "10100011110", "~": "10001011110",
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
  invoice,
  open,
  onOpenChange,
  onEdit,
  initialTab = "overview",
}: InvoiceDetailModalProps) {
  const { workOrders, settings, generateWorkOrder, saveWorkOrder, updateInvoiceStatus } = useGQ();
  const [activeTab, setActiveTab] = useState<"overview" | "proforma" | "cutsheet" | "stickers">(initialTab);
  const [labelsPerRow, setLabelsPerRow] = useState<number>(4);

  /* Reset tab when modal opens */
  const invoiceId = invoice?.id;
  useEffect(() => {
    if (open) setActiveTab(initialTab);
  }, [open, invoiceId, initialTab]);

  /* Find existing Work Order (pure lookup, no side effects) */
  const activeWO = useMemo(
    () => (invoice ? workOrders.find((w: any) => workOrderBelongsTo(w, invoice)) ?? null : null),
    [workOrders, invoice]
  );

  /* Compute totals & proforma HTML */
  const totals = useMemo(
    () => (invoice && settings ? computeTotals(settings, invoice) : null),
    [settings, invoice]
  );
  const proformaHTML = useMemo(
    () => (invoice && totals && settings ? buildPrintHTML(settings, invoice, totals) : ""),
    [settings, invoice, totals]
  );

  /* Product-Grouped Pieces for Work Order Cut Sheet */
  const woProductGroups = useMemo(() => {
    if (!activeWO || !activeWO.pieces) return [];
    const map = new Map<string, { title: string; pieces: any[] }>();
    activeWO.pieces.forEach((p: any) => {
      const key = String(p.layerIdx !== undefined ? p.layerIdx : (p.productName || "0"));
      const title = p.productName || p.layerNo || activeWO.glassDesc || `${activeWO.thickness || 5}mm Glass`;
      if (!map.has(key)) {
        map.set(key, { title, pieces: [] });
      }
      map.get(key)!.pieces.push(p);
    });
    return Array.from(map.values());
  }, [activeWO]);

  /* Sticker labels data */
  const stickerLabels = useMemo(() => {
    if (!activeWO || !activeWO.pieces) return [];
    return activeWO.pieces.map((piece: any, idx: number) => ({
      customer: activeWO.customer || invoice?.cust?.name || "Customer",
      piNo: activeWO.piNo || invoice?.no,
      woNo: activeWO.woNo?.replace("WO-", "") || invoice?.orderNo || invoice?.no,
      size: `${piece.heightMM} X ${piece.widthMM}`,
      sn: piece.sr,
      glassType: activeWO.glassDesc || `${activeWO.thickness || 5}mm ${activeWO.productName || "Glass"}`,
      pieceOf: piece.pieceOf || `1 of ${activeWO.pieces.length}`,
      shape: piece.shape || "BLOCK",
      code: `${idx + 1} ${piece.shape === "BLOCK" ? "W1" : "SD1"}`,
      partyWO: activeWO.orderNo || invoice?.orderNo,
      barcode: piece.barcode || `000${idx + 1}`,
    }));
  }, [activeWO, invoice]);

  /* Early return AFTER all hooks */
  if (!open || !invoice) return null;

  const grandTotal = Number(invoice.totals?.grandTotal || totals?.grandTotal || 0);
  const paidAmount = Number(invoice.paidAmount || 0);
  const pendingAmount = Math.max(0, grandTotal - paidAmount);
  const isPaidFull = pendingAmount <= 0 && grandTotal > 0;
  const isPre = invoice.docType === "pre_proforma";
  const docTypeLabel = isPre ? "Order Booking" : "Proforma Invoice";
  const dueInfo = getPaymentDueDateInfo(invoice);

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

  const handlePrintActive = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl w-[98vw] h-[94vh] max-h-[94vh] p-0 gap-0 overflow-hidden flex flex-col rounded-2xl border border-slate-700/80 shadow-2xl bg-background [&>button.absolute]:hidden">
        <DialogTitle className="sr-only">
          {docTypeLabel} {invoice.no} Details
        </DialogTitle>

        {/* ════ HEADER ROW 1: Invoice Info + Actions ════ */}
        <div className="bg-slate-900 text-slate-100 px-5 py-2.5 border-b border-slate-800/60 shrink-0 flex items-center justify-between gap-4 print:hidden">
          {/* Left: Invoice identity */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow shrink-0">
              <FileText className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono font-bold text-emerald-400">
                  #{invoice.no}
                </span>
                <span className="text-sm font-bold text-slate-100 truncate max-w-[200px]">
                  {invoice.cust?.name || "Customer"}
                </span>
                {isPaidFull ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 whitespace-nowrap">
                    ✓ Paid Full
                  </span>
                ) : paidAmount > 0 ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40 whitespace-nowrap">
                    Partial Paid
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 whitespace-nowrap">
                    Credit / Pending
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                Date: {dmy(invoice.date)} &nbsp;•&nbsp; Grand Total: ₹ {nf(grandTotal)}
              </div>
            </div>
          </div>

          {/* Right: Action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {onEdit && (
              <Button
                size="sm"
                className="h-7 text-[11px] gap-1 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-sm"
                onClick={() => {
                  onOpenChange(false);
                  onEdit(invoice);
                }}
              >
                <Edit3 className="h-3 w-3" />
                Edit Invoice
              </Button>
            )}
            <Button
              size="sm"
              className="h-7 text-[11px] gap-1 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              onClick={handlePrintActive}
            >
              <Printer className="h-3 w-3" />
              Print
            </Button>
            <button
              onClick={() => onOpenChange(false)}
              className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-red-600 text-slate-400 hover:text-white flex items-center justify-center transition-colors text-xs font-bold"
              title="Close"
            >
              ✕
            </button>
          </div>
        </div>

        {/* ════ HEADER ROW 2: Tab Navigation ════ */}
        <div className="bg-slate-950 px-5 py-1.5 border-b border-slate-800 shrink-0 flex items-center gap-1.5 overflow-x-auto print:hidden">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === "overview"
                ? "bg-emerald-600 text-white shadow-md"
                : "text-slate-400 hover:text-slate-100 hover:bg-slate-800"
            }`}
          >
            <BarChart3 className="h-3.5 w-3.5" />
            Overview
          </button>

          <button
            onClick={() => setActiveTab("proforma")}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === "proforma"
                ? "bg-blue-600 text-white shadow-md"
                : "text-slate-400 hover:text-slate-100 hover:bg-slate-800"
            }`}
          >
            <Printer className="h-3.5 w-3.5" />
            Proforma PDF
          </button>

          <button
            onClick={() => { ensureWorkOrder(); setActiveTab("cutsheet"); }}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === "cutsheet"
                ? "bg-amber-600 text-white shadow-md"
                : "text-slate-400 hover:text-slate-100 hover:bg-slate-800"
            }`}
          >
            <Factory className="h-3.5 w-3.5" />
            Work Order Cut Sheet
          </button>

          <button
            onClick={() => { ensureWorkOrder(); setActiveTab("stickers"); }}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === "stickers"
                ? "bg-yellow-500 text-black shadow-md"
                : "text-slate-400 hover:text-slate-100 hover:bg-slate-800"
            }`}
          >
            <Tag className="h-3.5 w-3.5" />
            Barcode Stickers
          </button>
        </div>

        {/* ════ MAIN MODAL BODY AREA (SCROLLABLE EDGE-TO-EDGE) ════ */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-900/30">

          {/* ─── TAB 1: OVERVIEW & DETAILS ─── */}
          {activeTab === "overview" && (
            <div className="space-y-5 animate-in fade-in-50">
              {/* Financial KPI Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* Total Amount */}
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 shadow-sm">
                  <div className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                    Total Amount
                  </div>
                  <div className="text-xl font-bold text-slate-900 dark:text-white font-mono mt-1">
                    ₹ {nf(grandTotal)}
                  </div>
                  <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                    Grand bill total
                  </div>
                </div>

                {/* Paid Amount */}
                <div className="bg-emerald-50 dark:bg-emerald-950/60 border-2 border-emerald-300 dark:border-emerald-700 rounded-xl p-3.5 shadow-sm">
                  <div className="text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-300 tracking-wider">
                    ✓ Paid Amount
                  </div>
                  <div className="text-xl font-bold text-emerald-700 dark:text-emerald-300 font-mono mt-1">
                    ₹ {nf(paidAmount)}
                  </div>
                  <div className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70 mt-0.5">
                    Received so far
                  </div>
                </div>

                {/* Pending Balance */}
                <div
                  className={`rounded-xl p-3.5 border-2 shadow-sm ${
                    pendingAmount > 0
                      ? "bg-red-50 dark:bg-red-950/60 border-red-300 dark:border-red-700"
                      : "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700"
                  }`}
                >
                  <div className={`text-[10px] font-bold uppercase tracking-wider ${
                    pendingAmount > 0 ? "text-red-700 dark:text-red-300" : "text-emerald-700 dark:text-emerald-300"
                  }`}>
                    {pendingAmount > 0 ? "⚠ Pending Balance" : "✓ No Balance Due"}
                  </div>
                  <div className={`text-xl font-bold font-mono mt-1 ${
                    pendingAmount > 0 ? "text-red-700 dark:text-red-300" : "text-emerald-700 dark:text-emerald-300"
                  }`}>
                    ₹ {nf(pendingAmount)}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {pendingAmount > 0 ? "Remaining to pay" : "Fully cleared"}
                  </div>
                </div>

                {/* Payment Due Date */}
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 shadow-sm">
                  <div className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                    Payment Due Date
                  </div>
                  <div className="text-base font-bold text-slate-900 dark:text-white font-mono mt-1">
                    {dmy(dueInfo.dueDate)}
                  </div>
                  <div className="text-[10px] font-semibold mt-0.5 text-blue-600 dark:text-blue-400">
                    {dueInfo.label}
                  </div>
                </div>
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
                      <div className="font-mono text-foreground mt-0.5">
                        {invoice.poNo || "—"}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase font-semibold">
                        Booking Reference
                      </div>
                      <div className="font-mono text-foreground mt-0.5">
                        {invoice.preProformaNo || invoice.orderNo || "—"}
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
                        <div className="font-mono text-foreground mt-0.5">
                          {invoice.paymentRef}
                        </div>
                      </div>
                    )}
                    {invoice.paymentNotes && (
                      <div className="col-span-2">
                        <div className="text-[10px] text-muted-foreground uppercase font-semibold">
                          Payment Note
                        </div>
                        <div className="text-foreground mt-0.5 italic">
                          {invoice.paymentNotes}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Item Details Table */}
              <div className="border border-border rounded-xl overflow-hidden bg-card shadow-xs">
                <div className="bg-muted/40 px-4 py-2.5 text-xs font-bold border-b border-border text-foreground flex items-center justify-between">
                  <span>Item Details ({invoice.items?.length || 0} items)</span>
                  <span className="text-[11px] font-mono text-muted-foreground">Total: ₹ {nf(grandTotal)}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted/20 text-[10px] font-bold uppercase text-muted-foreground border-b border-border">
                      <tr>
                        <th className="p-2.5">#</th>
                        <th className="p-2.5">Product / Glass Description</th>
                        <th className="p-2.5 text-center">Thickness</th>
                        <th className="p-2.5 text-center">Qty</th>
                        <th className="p-2.5 text-right">Area</th>
                        <th className="p-2.5 text-right">Rate</th>
                        <th className="p-2.5 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40 font-mono text-xs">
                      {invoice.items?.map((item: any, idx: number) => (
                        <tr key={item.id || idx} className="hover:bg-muted/10">
                          <td className="p-2.5 text-muted-foreground">{idx + 1}</td>
                          <td className="p-2.5 font-sans font-medium text-foreground">
                            {invoice.productName || item.desc || "Glass Item"}
                          </td>
                          <td className="p-2.5 text-center font-sans">
                            {invoice.glass?.thickness || item.thickness || 5} mm
                          </td>
                          <td className="p-2.5 text-center font-bold">{item.qty || 1}</td>
                          <td className="p-2.5 text-right">{item.sqft || item.sqm || "—"}</td>
                          <td className="p-2.5 text-right">₹ {nf(item.rate || 0)}</td>
                          <td className="p-2.5 text-right font-bold text-emerald-600 dark:text-emerald-400">
                            ₹ {nf(item.amount || 0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ─── TAB 2: PROFORMA INVOICE (PRINTABLE DOCUMENT) ─── */}
          {activeTab === "proforma" && (
            <div className="animate-in fade-in-50 space-y-4">
              <div className="flex items-center justify-between px-2 print:hidden">
                <span className="text-xs text-muted-foreground font-semibold">
                  A4 Printable Proforma Invoice PDF Preview
                </span>
                <Button size="sm" onClick={handlePrintActive} className="h-8 text-xs font-bold gap-1.5 bg-blue-600 hover:bg-blue-700 text-white">
                  <Printer className="h-3.5 w-3.5" /> Print / Save PDF
                </Button>
              </div>

              <div className="bg-white text-black border border-slate-700 rounded-xl p-4 sm:p-6 shadow-xl max-w-4xl mx-auto overflow-x-auto">
                <div
                  className="doc-preview bg-white text-black min-w-[650px] sm:min-w-0"
                  dangerouslySetInnerHTML={{ __html: proformaHTML || "" }}
                />
              </div>
            </div>
          )}

          {/* ─── TAB 3: WORK ORDER CUT SHEET ─── */}
          {activeTab === "cutsheet" && (
            <div className="animate-in fade-in-50 space-y-4">
              <div className="flex items-center justify-between px-2 print:hidden">
                <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5">
                  <Factory className="h-4 w-4 text-amber-500" />
                  Work Order Cut Sheet for #{activeWO?.woNo || invoice.orderNo || invoice.no}
                </span>
                <Button size="sm" onClick={handlePrintActive} className="h-8 text-xs font-bold gap-1.5 bg-amber-600 hover:bg-amber-700 text-white">
                  <Printer className="h-3.5 w-3.5" /> Print Cut Sheet
                </Button>
              </div>

              {!activeWO ? (
                <div className="text-center py-16 text-xs text-muted-foreground">Generating Work Order Cut Sheet...</div>
              ) : (
                <div className="wo-print-area bg-white text-black rounded-xl border border-slate-700 p-4 sm:p-6 shadow-xl max-w-4xl mx-auto overflow-x-auto">
                  {/* WO Header */}
                  <div className="border-b-2 border-black pb-3 mb-3">
                    <div className="flex justify-between items-start">
                      <div className="text-[11px] space-y-0.5">
                        <div><span className="font-bold">Customer :</span> {activeWO.customer || invoice.cust?.name}</div>
                        <div><span className="font-bold">PI No. :</span> {activeWO.piNo || invoice.no}</div>
                        <div><span className="font-bold">PI Date :</span> {dmy(activeWO.piDate || invoice.date)}</div>
                        <div><span className="font-bold">Dispatch To :</span> {activeWO.dispatchTo || invoice.cust?.addr || "—"}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-black tracking-wide text-black">WORK ORDER</div>
                        <div className="text-[11px] mt-1 space-y-0.5">
                          <div><span className="font-bold">Order No :</span> <span className="font-mono text-sm font-bold">{activeWO.orderNo || invoice.no}</span></div>
                          <div><span className="font-bold">Our Date :</span> {dmy(activeWO.piDate || invoice.date)}</div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 pt-2 border-t border-gray-300 text-[11px]">
                      <div><span className="font-bold">PO No. :</span> {activeWO.poNo || invoice.poNo || "—"} &nbsp;&nbsp; <span className="font-bold">Project :</span> {activeWO.project || "—"}</div>
                      <div className="mt-1 font-bold text-sm">{activeWO.glassDesc || `${activeWO.thickness || 5}mm ${activeWO.productName || "Glass"}`}</div>
                    </div>
                  </div>

                  {/* WO Product-Grouped Tables */}
                  <div className="space-y-4">
                    {woProductGroups.length === 0 ? (
                      <div className="p-4 text-center text-xs text-muted-foreground">No cut pieces recorded</div>
                    ) : (
                      woProductGroups.map((grp: any, gIdx: number) => {
                        const grpSqm = grp.pieces.reduce((sum: number, p: any) => sum + (Number(p.area) || 0), 0);
                        const grpPcs = grp.pieces.length;
                        return (
                          <div key={gIdx} className="border border-black overflow-hidden">
                            {/* Product Banner Header */}
                            <div className="bg-gray-100 border-b border-black px-3 py-1.5 font-bold text-[11px] uppercase flex items-center justify-between">
                              <span>Item {gIdx + 1}: {grp.title}</span>
                              <span className="text-[10px] font-mono font-normal">{grpPcs} Pcs • {nf(grpSqm, 3)} SQM</span>
                            </div>

                            <table className="w-full text-[10px] border-collapse" style={{ minWidth: "850px" }}>
                              <thead>
                                <tr className="bg-gray-50 border-b border-black">
                                  {["SR\nNo", "L1-Inch", "L2-Inch", "Height\nMM", "Width\nMM", "Qty", "Act Totl", "Hole", "Big\nHole", "Cut Out", "Big\nCutout", "Shape", "Barcode", "Remark"].map((h, i) => (
                                    <th key={i} className="border border-gray-400 px-1.5 py-1 text-[9px] font-bold uppercase text-black whitespace-pre-line text-center">{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {grp.pieces.map((piece: any, idx: number) => (
                                  <tr key={idx} className="border-b border-gray-300 hover:bg-gray-50">
                                    <td className="border border-gray-300 px-1.5 py-1 text-center font-bold">{piece.sr}</td>
                                    <td className="border border-gray-300 px-1.5 py-1 text-center font-mono">{piece.l1 || "—"}</td>
                                    <td className="border border-gray-300 px-1.5 py-1 text-center font-mono">{piece.l2 || "—"}</td>
                                    <td className="border border-gray-300 px-1.5 py-1 text-center font-mono font-semibold">{piece.heightMM}</td>
                                    <td className="border border-gray-300 px-1.5 py-1 text-center font-mono font-semibold">{piece.widthMM}</td>
                                    <td className="border border-gray-300 px-1.5 py-1 text-center font-bold">{piece.qty}</td>
                                    <td className="border border-gray-300 px-1.5 py-1 text-right font-mono">{nf(piece.area, 3)}</td>
                                    <td className="border border-gray-300 px-1.5 py-1 text-center">{piece.hole || ""}</td>
                                    <td className="border border-gray-300 px-1.5 py-1 text-center">{piece.bigHole || ""}</td>
                                    <td className="border border-gray-300 px-1.5 py-1 text-center">{piece.cutOut || ""}</td>
                                    <td className="border border-gray-300 px-1.5 py-1 text-center">{piece.bigCutout || ""}</td>
                                    <td className="border border-gray-300 px-1.5 py-1 text-center font-bold">{piece.shape}</td>
                                    <td className="border border-gray-300 px-1.5 py-1 text-center font-mono text-[9px]">{piece.barcode}</td>
                                    <td className="border border-gray-300 px-1.5 py-1 text-center text-[9px]">{piece.remark}</td>
                                  </tr>
                                ))}
                              </tbody>
                              <tfoot>
                                <tr className="bg-gray-100 border-t border-black font-bold">
                                  <td colSpan={5} className="border border-gray-400 px-2 py-1 text-right">Subtotal (Item {gIdx + 1})</td>
                                  <td className="border border-gray-400 px-1.5 py-1 text-center">{grpPcs}</td>
                                  <td className="border border-gray-400 px-1.5 py-1 text-right font-mono">{nf(grpSqm, 3)}</td>
                                  <td colSpan={7} className="border border-gray-400 px-2 py-1"></td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        );
                      })
                    )}

                    {/* Overall Work Order Grand Summary Footer */}
                    <div className="border border-black bg-gray-100 p-2 font-bold text-[11px] flex justify-between">
                      <div>Grand Total: {activeWO.totalPieces} Pcs</div>
                      <div>{nf(activeWO.totalSqm, 3)} SQM &nbsp;|&nbsp; {nf(activeWO.totalSqft, 3)} SQFT &nbsp;|&nbsp; Weight: {activeWO.weightKg || "—"} kg</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ─── TAB 4: BARCODE STICKER LABELS ─── */}
          {activeTab === "stickers" && (
            <div className="animate-in fade-in-50 space-y-4">
              <div className="flex items-center justify-between px-2 print:hidden">
                <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5">
                  <Tag className="h-4 w-4 text-yellow-500" />
                  {stickerLabels.length} Barcode Sticker Label(s)
                </span>
                <div className="flex items-center gap-2">
                  <Select value={String(labelsPerRow)} onValueChange={(v) => setLabelsPerRow(Number(v))}>
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

                  <Button size="sm" onClick={handlePrintActive} className="h-8 text-xs font-bold gap-1.5 bg-yellow-500 hover:bg-yellow-600 text-black">
                    <Printer className="h-3.5 w-3.5" /> Print Sticker Labels
                  </Button>
                </div>
              </div>

              {!stickerLabels.length ? (
                <div className="text-center py-16 text-xs text-muted-foreground">No barcode stickers available for this order.</div>
              ) : (
                <div
                  className="grid gap-3 max-w-5xl mx-auto print:gap-1"
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
                        <div><span className="font-bold">PI :</span> <span className="font-mono">{label.piNo}</span></div>
                        <div><span className="font-bold">WO :</span> <span className="font-mono">{label.woNo}</span></div>
                        <div><span className="font-bold">Size :</span> <span className="font-mono font-bold">{label.size}</span></div>
                        <div><span className="font-bold">SN :</span> <span className="font-mono">{label.sn}</span></div>
                      </div>

                      {/* Glass type */}
                      <div className="text-[9px] uppercase leading-tight truncate">
                        {label.glassType} <span className="font-bold">of {label.pieceOf?.split(" of ")[1] || "1"}</span>
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
                          dangerouslySetInnerHTML={{ __html: generateBarcodeSVG(label.barcode || label.sn, 30, 1.1) }}
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
