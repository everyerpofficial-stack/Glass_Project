import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import {
  Save,
  RefreshCw,
  Printer,
  FileSpreadsheet,
  Search,
  ChevronDown,
  CalendarDays,
  FileText,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Lock,
  Unlock,
  BarChart3,
  Barcode,
  Edit3,
  Trash2,
  Plus,
  Clock,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGQ } from "@/lib/store";
import { TableSkeleton } from "@/components/app/DataSkeleton";
import { ConfirmDelete } from "@/components/app/ConfirmDelete";
import { nf, dmy, getPaymentDueDateInfo, nextSeqForPrefix, getNextProformaNo, uid, workOrderBelongsTo, formatOrderId } from "@/lib/gq";
import { toast } from "sonner";
import { InvoiceDetailModal } from "@/components/app/InvoiceDetailModal";

export const Route = createFileRoute("/order")({
  validateSearch: (search: Record<string, unknown>): { view?: string | undefined } => ({
    view: typeof search["view"] === "string" ? (search["view"] as string) : undefined,
  }),
  component: OrderPage,
});

/* ─── shared UI helpers ──────────────────────────────────────────── */
function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
      {children}
    </label>
  );
}

function Section({
  title,
  headerRight,
  children,
  accent,
}: {
  title: string;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
  accent?: string;
}) {
  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className={`flex items-center justify-between px-3 sm:px-4 py-2.5 border-b border-border gap-2 flex-wrap ${accent || "bg-muted/30"}`}>
        <span className="text-[11px] font-bold uppercase tracking-widest text-foreground flex items-center gap-1.5">
          <span className="w-1 h-3.5 rounded-full bg-primary inline-block" />
          {title}
        </span>
        {headerRight && <div className="shrink-0">{headerRight}</div>}
      </div>
      <div className="px-3 sm:px-4 py-3">{children}</div>
    </div>
  );
}



/* ─── Confirm Payment & Order Modal ──────────────────────────────────────
   Split in two on purpose. The visibility check lives in this hook-free outer
   shell; every useState sits in the body below. Doing the early return above
   the hooks (as this component used to) changed the hook count between the
   closed and open renders, which React rejects with "Rendered more hooks than
   during the previous render" — it crashed the page on Confirm Order. The
   split also gives the body fresh state on each open, since it unmounts. */
type ConfirmPaymentDetails = {
  paidAmount: number;
  paymentType: string;
  refNo: string;
  notes: string;
  dueDate?: string;
};

function ConfirmPaymentModal({
  open,
  invoice,
  onClose,
  onConfirm,
}: {
  open: boolean;
  invoice: any;
  onClose: () => void;
  onConfirm: (paymentDetails: ConfirmPaymentDetails) => void;
}) {
  if (!open || !invoice) return null;
  return <ConfirmPaymentModalBody invoice={invoice} onClose={onClose} onConfirm={onConfirm} />;
}

function ConfirmPaymentModalBody({
  invoice,
  onClose,
  onConfirm,
}: {
  invoice: any;
  onClose: () => void;
  onConfirm: (paymentDetails: ConfirmPaymentDetails) => void;
}) {
  const grandTotal = Number(invoice.totals?.grandTotal) || 0;
  const [paidAmountStr, setPaidAmountStr] = useState<string>(
    invoice.paidAmount !== undefined && invoice.paidAmount !== null
      ? String(invoice.paidAmount)
      : "0"
  );
  const [paymentType, setPaymentType] = useState<string>(
    invoice.delivery?.paymentType || "Credit"
  );
  const [refNo, setRefNo] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [dueDate, setDueDate] = useState<string>(
    invoice.dueDate || new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
  );

  const numericPaid = Number(paidAmountStr) || 0;
  const remainingBalance = Math.max(0, grandTotal - numericPaid);
  const isFullPaid = numericPaid >= grandTotal && grandTotal > 0;

  const getStatusBadge = () => {
    if (numericPaid >= grandTotal && grandTotal > 0) {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
          <CheckCircle2 className="h-3.5 w-3.5" /> PAID IN FULL
        </span>
      );
    } else if (numericPaid > 0) {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" /> PARTIALLY PAID
        </span>
      );
    } else {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" /> CREDIT / UNPAID
        </span>
      );
    }
  };

  const handleApplyPreset = (type: "zero" | "full") => {
    if (type === "zero") {
      setPaidAmountStr("0");
      setPaymentType("Credit");
    } else if (type === "full") {
      setPaidAmountStr(String(grandTotal));
      if (paymentType === "Credit") setPaymentType("Bank Transfer");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm({
      paidAmount: numericPaid,
      paymentType,
      refNo,
      notes,
      dueDate: isFullPaid ? "" : dueDate,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in-50">
      <div className="bg-card border border-border rounded-xl shadow-2xl max-w-md w-full overflow-hidden my-auto">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 px-5 py-4 text-white flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase font-bold tracking-widest text-emerald-100 flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> Order Confirmation
            </div>
            <h3 className="text-base font-bold text-white mt-0.5">
              Record Payment & Confirm Order
            </h3>
            <div className="text-xs text-emerald-100/90 font-mono mt-0.5">
              PI No: <span className="font-bold underline">{invoice.no || invoice.orderNo}</span> · {invoice.cust?.name || "Customer"}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-emerald-100 hover:text-white bg-emerald-700/50 hover:bg-emerald-700 rounded-full h-7 w-7 flex items-center justify-center transition-colors text-sm font-bold"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 text-xs">
          {/* Main Calculation Summary Card */}
          <div className="bg-muted/40 border border-border rounded-lg p-3.5 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-border/50">
              <span className="text-muted-foreground font-semibold uppercase text-[10px] tracking-wider">
                Payment Status
              </span>
              {getStatusBadge()}
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-background border border-border/80 rounded-md p-2">
                <span className="text-[9px] font-bold text-muted-foreground uppercase block">
                  Total Amount
                </span>
                <span className="font-mono text-sm font-bold text-foreground block mt-0.5">
                  ₹ {nf(grandTotal)}
                </span>
              </div>

              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-md p-2">
                <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase block">
                  Amount Paid
                </span>
                <span className="font-mono text-sm font-bold text-emerald-700 dark:text-emerald-300 block mt-0.5">
                  ₹ {nf(numericPaid)}
                </span>
              </div>

              <div
                className={`border rounded-md p-2 ${
                  remainingBalance > 0
                    ? "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400"
                    : "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                }`}
              >
                <span className="text-[9px] font-bold uppercase block">
                  Remaining
                </span>
                <span className="font-mono text-sm font-bold block mt-0.5">
                  ₹ {nf(remainingBalance)}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Payment Presets */}
          <div>
            <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span>Quick Amount Presets</span>
              <span className="text-muted-foreground font-mono">Total: ₹ {nf(grandTotal)}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleApplyPreset("zero")}
                className={`py-1.5 px-2 rounded-md border text-[11px] font-medium transition-colors ${
                  numericPaid === 0
                    ? "bg-primary text-primary-foreground border-primary font-bold shadow-xs"
                    : "bg-background border-border hover:bg-muted text-foreground"
                }`}
              >
                Full Credit (₹0)
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset("full")}
                className={`py-1.5 px-2 rounded-md border text-[11px] font-medium transition-colors ${
                  numericPaid === grandTotal && grandTotal > 0
                    ? "bg-primary text-primary-foreground border-primary font-bold shadow-xs"
                    : "bg-background border-border hover:bg-muted text-foreground"
                }`}
              >
                Full Paid (₹{nf(grandTotal)})
              </button>
            </div>
          </div>

          {/* Amount Paid Input & Payment Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                Enter Paid Amount (₹)
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-2.5 text-muted-foreground font-bold text-xs">₹</span>
                <Input
                  type="number"
                  min="0"
                  step="any"
                  className="pl-7 h-9 text-xs font-mono font-bold"
                  placeholder="0.00"
                  value={paidAmountStr}
                  onChange={(e) => setPaidAmountStr(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                Payment Type / Mode
              </label>
              <Select value={paymentType} onValueChange={setPaymentType}>
                <SelectTrigger className="h-9 text-xs font-semibold">
                  <SelectValue placeholder="Select Payment Mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Credit">Credit / Pay Later</SelectItem>
                  <SelectItem value="Bank Transfer">Bank Transfer / NEFT</SelectItem>
                  <SelectItem value="UPI">UPI / GPay / PhonePe</SelectItem>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Cheque">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Payment Due Date (Hidden if Full Paid) */}
          {!isFullPaid && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-md p-2.5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 mb-1">
                Payment Due Date
              </label>
              <Input
                type="date"
                className="h-8 text-xs font-mono bg-background"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          )}

          {/* Reference & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                Reference / Txn No (Optional)
              </label>
              <Input
                className="h-8 text-xs font-mono"
                placeholder="e.g. HDFC-98421"
                value={refNo}
                onChange={(e) => setRefNo(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                Payment Note (Optional)
              </label>
              <Input
                className="h-8 text-xs"
                placeholder="e.g. Advance paid"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          {/* Modal Footer */}
          <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 text-xs"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              className="h-9 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 shadow-md"
            >
              <CheckCircle2 className="h-4 w-4" />
              Confirm Payment & Save Invoice
              <ArrowRight className="h-3.5 w-3.5 ml-0.5" />
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Main Order Page ────────────────────────────────────────────── */
function OrderPage() {
  const navigate = useNavigate();
  const searchParams = useSearch({ strict: false }) as { view?: string; id?: string };
  const {
    inv,
    setInv,
    totals,
    settings,
    invoices,
    customers,
    workOrders,
    saveInvoice,
    saveCustomer,
    newInvoice,
    loadInvoice,
    confirmOrder,
    generateWorkOrder,
    saveWorkOrder,
    updateInvoiceStatus,
    deleteInvoice,
    hydrated,
  } = useGQ();

  const [custSearch, setCustSearch] = useState("");
  const [custDropOpen, setCustDropOpen] = useState(false);
  const [selectedBookings, setSelectedBookings] = useState<string[]>([]);
  const [savedSearch, setSavedSearch] = useState("");
  const [showForm, setShowForm] = useState(searchParams?.view === "form");
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [targetConfirmInvoice, setTargetConfirmInvoice] = useState<any>(null);
  const [detailInvoice, setDetailInvoice] = useState<any | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => {
    if (searchParams?.id) {
      loadInvoice(searchParams.id, false);
      setShowForm(true);
    } else if (searchParams?.view === "form") {
      setShowForm(true);
    } else if (searchParams?.view === "list") {
      setShowForm(false);
    }
  }, [searchParams?.id, searchParams?.view, loadInvoice]);

  const proformaInvoices = useMemo(
    () => invoices.filter((x: any) => x.docType === "proforma"),
    [invoices]
  );

  const pendingCount = useMemo(
    () => proformaInvoices.filter((x) => !x.status || x.status === "draft" || x.status === "pi_sent").length,
    [proformaInvoices]
  );
  const confirmedCount = useMemo(
    () => proformaInvoices.filter((x) => x.status === "order_confirmed" || x.status === "work_order_generated").length,
    [proformaInvoices]
  );
  const totalSavedValue = useMemo(
    () => proformaInvoices.reduce((acc, item) => acc + (Number(item.totals?.grandTotal) || 0), 0),
    [proformaInvoices]
  );

  const filteredSavedInvoices = useMemo(
    () =>
      proformaInvoices.filter((item: any) => {
        const query = savedSearch.toLowerCase().trim();
        if (!query) return true;
        return (
          item.no?.toLowerCase().includes(query) ||
          item.preProformaNo?.toLowerCase().includes(query) ||
          item.orderNo?.toLowerCase().includes(query) ||
          item.cust?.name?.toLowerCase().includes(query) ||
          item.cust?.phone?.toLowerCase().includes(query) ||
          item.cust?.gstin?.toLowerCase().includes(query) ||
          formatOrderId(item.preProformaNo).toLowerCase().includes(query)
        );
      }),
    [proformaInvoices, savedSearch]
  );

  /* Get Order Bookings available for loading into Proforma Invoice */
  const availableBookings = useMemo(
    () => invoices.filter((x: any) => !x.docType || x.docType === "pre_proforma"),
    [invoices],
  );

  /* ── field helpers ── */
  const updateInvField = (path: string, val: any) => {
    setInv((prev: any) => {
      const copy = JSON.parse(JSON.stringify(prev));
      const parts = path.split(".");
      let target: any = copy;
      for (let i = 0; i < parts.length - 1; i++) {
        const key = parts[i];
        if (key && target && typeof target === "object") {
          if (!(key in target)) target[key] = {};
          target = target[key];
        }
      }
      const lastKey = parts[parts.length - 1];
      if (lastKey && target && typeof target === "object") target[lastKey] = val;
      return copy;
    });
  };

  /* ── customer search ── */
  const filteredCustomers = useMemo(
    () =>
      customers.filter((c: any) =>
        c.name?.toLowerCase().includes(custSearch.toLowerCase())
      ),
    [customers, custSearch]
  );

  const selectCustomer = (c: any) => {
    const hasSeparateShip = Boolean(c.ship && c.ship.trim() !== "" && c.ship !== c.addr);
    setInv((prev: any) => ({
      ...prev,
      cust: {
        ...c,
        sameAsBilling: false,
        ship: hasSeparateShip ? c.ship : "",
      },
    }));
    setCustSearch("");
    setCustDropOpen(false);
    toast.success(`Loaded ${c.name}`);
  };

  /* select an Order Booking to load into proforma invoice */
  const handleSelectBooking = (bookingId: string) => {
    const booking = invoices.find((x: any) => x.id === bookingId);
    if (!booking) return;
    const copy = JSON.parse(JSON.stringify(booking));
    copy.id = uid("inv-pi");
    copy.docType = "proforma";
    copy.preProformaNo = booking.no;
    /* Was `"PI-" + booking.no`, which turned booking OB-1001 into "PI-OB-1001"
       while the Confirm button on the booking list produced "PI-1004" for the
       same operation. Both now draw from the same sequence. */
    copy.orderNo = getNextProformaNo(invoices);
    copy.no = copy.orderNo;
    copy.sync = "local";
    copy.date = new Date().toISOString().slice(0, 10);
    copy.status = "draft";
    copy._saved = false;
    if (!copy.delivery) copy.delivery = {};
    copy.delivery.paymentType = copy.delivery.paymentType || "Credit";
    setInv(copy);
    setShowForm(true);
    toast.success(`✨ Auto-filled data from Order Booking ${booking.no} into Proforma Invoice`);
  };

  const handleOpenConfirmModal = (targetRecord?: any) => {
    const target = targetRecord || inv;
    if (!target || !target.id) {
      toast.error("Save the Proforma Invoice first");
      return;
    }
    if (target.status === "work_order_generated") {
      toast.warning("This Proforma Invoice has already been sent to Work Order workflow and is locked from editing.");
      return;
    }
    if (target === inv && !inv._saved) {
      /* saveInvoice() returns false and shows its own error when the customer
         name or the line items don't validate. Ignoring that opened the payment
         modal against a record that was never saved, so confirmOrder found
         nothing to update, generateWorkOrder reported "Order not found", and
         the page still announced "Order confirmed" and navigated away — a
         confirmation the system had not actually recorded. */
      if (!saveInvoice()) return;
    }
    setTargetConfirmInvoice(target);
    setConfirmModalOpen(true);
  };

  const handleConfirmPaymentAndMove = (paymentDetails: ConfirmPaymentDetails) => {
    if (!targetConfirmInvoice) return;
    /* confirmOrder is what persists paidAmount / remainingBalance /
       paymentStatus, writes the Payments row and flips the record to
       order_confirmed. Without it the modal collected the payment and threw it
       away: the invoice stayed a draft and no payment was ever recorded. */
    confirmOrder(targetConfirmInvoice.id, paymentDetails);

    /* Only mint a work order if this invoice does not already have one.
       generateWorkOrder stamps a fresh uid every call, so saveWorkOrder would
       append rather than update — confirming a second time (a double-click, or
       re-confirming after an edit) piled up duplicate work orders. The list
       view already guarded this; the modal did not. */
    const existingWO = workOrders.find((w: any) =>
      workOrderBelongsTo(w, targetConfirmInvoice),
    );
    if (!existingWO) {
      const wo = generateWorkOrder(targetConfirmInvoice.id);
      if (wo) {
        saveWorkOrder(wo);
        updateInvoiceStatus(targetConfirmInvoice.id, "work_order_generated");
      }
    }
    const confirmedId = targetConfirmInvoice.id;
    setConfirmModalOpen(false);
    setTargetConfirmInvoice(null);
    setShowForm(false);
    toast.success(`Proforma Invoice ${targetConfirmInvoice.no || targetConfirmInvoice.orderNo} saved & confirmed successfully!`);
    navigate({ to: "/invoice", search: { id: confirmedId } });
  };

  const handleConfirmOrder = () => {
    handleOpenConfirmModal(inv);
  };

  const isWorkflowLocked = inv.status === "work_order_generated";

  return (
    <div className="min-h-screen bg-background">
      {/* ── UNIFIED SECTION TABS ───────────────────────── */}
      <div className="bg-muted/40 border-b border-border px-3 sm:px-6 py-2 flex items-center gap-2 text-xs font-semibold flex-wrap">
        <span className="text-muted-foreground mr-1 text-[11px] font-bold uppercase tracking-wider">Proforma Section:</span>
        <Link
          to="/booking"
          className="px-3 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors flex items-center gap-1.5"
        >
          1. Order Booking
        </Link>
        <Link
          to="/order"
          search={{ view: undefined }}
          className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground font-bold shadow-sm flex items-center gap-1.5"
        >
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          2. Proforma Invoice
        </Link>
      </div>

      {/* ── WORKFLOW LOCK ALERT BANNER ──────────────── */}
      {isWorkflowLocked && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 px-3 sm:px-6 py-2 flex items-center justify-between gap-2 text-xs font-semibold text-amber-700 dark:text-amber-300">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 shrink-0 text-amber-600" />
            <span>This Proforma Invoice has been sent to Work Order workflow. It is locked from further editing.</span>
          </div>
          <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 font-mono text-[10px] font-bold uppercase">
            WORKFLOW LOCKED
          </span>
        </div>
      )}

      {/* ── KPI CARDS & HEADER ACTIONS ──────────────────── */}
      <div className="border-b border-border bg-card px-3 sm:px-6 py-4 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-0.5">
              <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
              {" / "}
              {showForm ? (
                <button onClick={() => setShowForm(false)} className="hover:text-foreground transition-colors">
                  Proforma Invoice
                </button>
              ) : (
                <span className="text-primary font-semibold">Proforma Invoice</span>
              )}
              {showForm && (
                <>
                  {" / "}
                  <span className="text-primary font-semibold">
                    {inv._saved ? `Edit (${inv.no})` : "New Invoice"}
                  </span>
                </>
              )}
            </div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground leading-tight flex items-center gap-2">
              <FileText className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              {showForm ? (inv._saved ? "Edit Proforma Invoice" : "New Invoice") : "Proforma Invoice Management"}
              {inv._saved && showForm && (
                <span className="text-xs font-mono font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded">
                  {inv.no}
                </span>
              )}
            </h1>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {showForm ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs gap-1.5"
                  onClick={() => setShowForm(false)}
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back to Saved List
                </Button>
              </>
            ) : (
              /* RIGHT BUTTON: New Invoice */
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  size="sm"
                  className="h-8 px-3 text-xs gap-1.5 bg-primary text-primary-foreground font-bold shadow-md hover:bg-primary/90"
                  onClick={() => {
                    newInvoice("proforma");
                    setShowForm(true);
                  }}
                >
                  <Plus className="h-4 w-4" />
                  New Invoice
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* ── KPI METRICS CARDS (Shown only on management/list view) ─────────────────── */}
        {!showForm && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-background border border-border/80 rounded-lg p-3 shadow-xs">
              <div className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Total Saved</div>
              {/* Counted every record in the store — bookings included — while
                  claiming to count proforma records, so it never agreed with
                  the table right below it. */}
              <div className="text-xl font-bold text-foreground mt-0.5">{proformaInvoices.length}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">Proforma records</div>
            </div>
            <div className="bg-background border border-amber-500/30 rounded-lg p-3 shadow-xs border-l-4 border-l-amber-500">
              <div className="text-[10px] font-bold uppercase text-amber-600 dark:text-amber-400 flex items-center gap-1 tracking-wider">
                <Clock className="h-3 w-3" /> Pending Order
              </div>
              <div className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-0.5">{pendingCount}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">Ready for workflow</div>
            </div>
            <div className="bg-background border border-emerald-500/30 rounded-lg p-3 shadow-xs border-l-4 border-l-emerald-500">
              <div className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400 flex items-center gap-1 tracking-wider">
                <CheckCircle2 className="h-3 w-3" /> Order Confirmed
              </div>
              <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{confirmedCount}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">In workflow</div>
            </div>
            <div className="bg-background border border-border/80 rounded-lg p-3 shadow-xs">
              <div className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Total Value</div>
              <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 font-mono">₹ {nf(totalSavedValue)}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">Proforma invoices value</div>
            </div>
          </div>
        )}
      </div>

      {!showForm ? (
        /* ── ALL SAVED PROFORMA INVOICES TABLE (TOP DEFAULT VIEW) ────────────────── */
        <div className="p-3 sm:p-4 bg-muted/20 border-b border-border">
          <Section
            title="All Proforma Invoices"
            headerRight={
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <Search className="h-3.5 w-3.5 absolute left-2.5 top-2 text-muted-foreground" />
                  <Input
                    className="h-7 text-xs pl-8 w-44 sm:w-60 bg-background"
                    placeholder="Search proforma invoice..."
                    value={savedSearch}
                    onChange={(e) => setSavedSearch(e.target.value)}
                  />
                </div>
                <span className="text-xs text-muted-foreground font-medium">
                  <span className="font-bold text-foreground">{filteredSavedInvoices.length}</span> total records
                </span>
              </div>
            }
          >
            {!hydrated ? (
              <TableSkeleton rows={6} cols={6} />
            ) : filteredSavedInvoices.length === 0 ? (
              <div className="text-center py-12 text-xs text-muted-foreground space-y-2">
                <p>{savedSearch ? "No matching Proforma Invoices found." : "No Proforma Invoices found."}</p>
                <Button
                  size="sm"
                  className="h-8 text-xs gap-1.5 bg-primary text-primary-foreground font-semibold"
                  onClick={() => {
                    newInvoice();
                    setShowForm(true);
                  }}
                >
                  <Plus className="h-3.5 w-3.5" /> New Invoice
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto -mx-3 sm:-mx-4">
                <table className="w-full text-xs text-left border-collapse" style={{ minWidth: "1050px" }}>
                  <thead>
                    <tr className="border-b border-border bg-muted/20 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      <th className="py-2.5 px-3">Invoice / PI No</th>
                      <th className="py-2.5 px-3">Order ID</th>
                      <th className="py-2.5 px-3">Date & Payment Due</th>
                      <th className="py-2.5 px-3">Customer / M/S Name</th>
                      <th className="py-2.5 px-3">Phone No.</th>
                      <th className="py-2.5 px-3 text-center">Items</th>
                      <th className="py-2.5 px-3 text-right">Total Balance</th>
                      <th className="py-2.5 px-3 text-right">Paid Amount</th>
                      <th className="py-2.5 px-3 text-right font-mono">Remaining Balance</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40 text-xs">
                    {filteredSavedInvoices.map((item: any) => {
                      const isConfirmed = item.status === "order_confirmed" || item.status === "work_order_generated";
                      const dueInfo = getPaymentDueDateInfo(item);
                      const grandTotal = Number(item.totals?.grandTotal || 0);
                      const paidAmount = Number(item.paidAmount || 0);
                      const remainingBalance = Math.max(0, grandTotal - paidAmount);
                      const rawOrder = item.preProformaNo || (item.orderNo !== item.no ? item.orderNo : undefined);
                      const orderId = formatOrderId(rawOrder);

                      return (
                        <tr
                          key={item.id}
                          className="hover:bg-muted/30 transition-colors cursor-pointer"
                          onClick={() => {
                            setDetailInvoice(item);
                            setDetailOpen(true);
                          }}
                        >
                          <td className="py-2.5 px-3 font-mono font-semibold text-primary">
                            <span className="hover:underline font-bold">
                              {item.no}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[11px] font-semibold text-muted-foreground">
                            {orderId !== "—" ? (
                              <span className="px-1.5 py-0.5 rounded bg-muted/60 text-foreground border border-border/50">
                                {orderId}
                              </span>
                            ) : (
                              <span className="text-muted-foreground/60">—</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[11px] leading-tight">
                            <div>{dmy(item.date)}</div>
                            <div className="mt-1">
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold inline-block ${dueInfo.badgeClass}`}>
                                {dueInfo.label}
                              </span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 font-medium text-foreground">{item.cust?.name || "—"}</td>
                          <td className="py-2.5 px-3 font-mono text-muted-foreground">
                            {item.cust?.phone || "—"}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono">{item.items?.length || 0}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-foreground">
                            ₹ {nf(grandTotal)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                            ₹ {nf(paidAmount)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold">
                            <span className={remainingBalance > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}>
                              ₹ {nf(remainingBalance)}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-7 w-7 text-primary border-primary/30 hover:bg-primary/10"
                                onClick={() => {
                                  loadInvoice(item.id, false);
                                  setShowForm(true);
                                  toast.success(`Loaded Proforma Invoice ${item.no} for editing`);
                                }}
                                title="Edit Proforma Invoice"
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                              </Button>

                              <Button
                                variant="outline"
                                size="icon"
                                className="h-7 w-7 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10"
                                onClick={() => {
                                  loadInvoice(item.id, false);
                                  navigate({ to: "/invoice", search: { id: item.id } });
                                }}
                                title="Print / Save PDF"
                              >
                                <Printer className="h-3.5 w-3.5" />
                              </Button>

                              <ConfirmDelete
                                title={`Delete Proforma Invoice ${item.no}?`}
                                description={`This permanently removes ${item.no} (${item.cust?.name || "no customer"}) from this device and from your Google Sheet, along with any work order generated from it. This cannot be undone.`}
                                onConfirm={() => deleteInvoice(item.id)}
                              >
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-7 w-7 text-rose-600 border-rose-500/30 hover:bg-rose-500/10"
                                  title="Delete"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </ConfirmDelete>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Section>
        </div>
      ) : (
        /* ── PROFORMA INVOICE CREATION / EDITING FORM SECTION ───────────── */
        <div id="proforma-form" className="p-3 sm:p-4 w-full">
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_280px] gap-4 w-full">

          {/* ════ LEFT COLUMN ════ */}
          <div className="space-y-4 min-w-0">

            {/* 1. Order Header */}
            <Section title="Proforma Invoice Details" accent="bg-emerald-500/5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <FieldLabel>Order / Invoice No</FieldLabel>
                  <Input className="h-8 text-xs font-mono bg-emerald-500/5" value={inv.orderNo || inv.no || ""} onChange={(e) => updateInvField("orderNo", e.target.value)} />
                </div>
                <div>
                  <FieldLabel>Invoice Date</FieldLabel>
                  <Input type="date" className="h-8 text-xs" value={inv.date || ""} onChange={(e) => updateInvField("date", e.target.value)} />
                </div>
                <div>
                  <FieldLabel>Order Booking Ref</FieldLabel>
                  <Input className="h-8 text-xs font-mono bg-muted/30" value={formatOrderId(inv.preProformaNo || inv.orderNo)} readOnly />
                </div>
                <div>
                  <FieldLabel>P.O. No.</FieldLabel>
                  <Input className="h-8 text-xs" value={inv.poNo || ""} onChange={(e) => updateInvField("poNo", e.target.value)} />
                </div>
              </div>
            </Section>

            {/* 2. Customer Details */}
            <Section
              title="Customer Details"
              headerRight={
                <div className="flex items-center gap-1.5 flex-wrap justify-end">
                  <div className="relative">
                    <div className="flex items-center border border-border rounded-md h-7 px-2 gap-1.5 bg-background text-xs cursor-pointer hover:border-primary/50 transition-colors"
                      onClick={() => setCustDropOpen((v) => !v)}>
                      <Search className="h-3 w-3 text-muted-foreground" />
                      <input
                        className="w-28 sm:w-36 bg-transparent outline-none text-xs placeholder:text-muted-foreground"
                        placeholder="Search saved"
                        value={custSearch}
                        onChange={(e) => { setCustSearch(e.target.value); setCustDropOpen(true); }}
                        onFocus={() => setCustDropOpen(true)}
                      />
                    </div>
                    {custDropOpen && filteredCustomers.length > 0 && (
                      <div className="absolute right-0 top-8 z-50 bg-popover border border-border rounded-md shadow-lg w-52 max-h-48 overflow-y-auto">
                        {filteredCustomers.map((c: any) => (
                          <div
                            key={c.id || c.name}
                            className="px-3 py-2 text-xs hover:bg-muted cursor-pointer text-foreground"
                            onMouseDown={() => selectCustomer(c)}
                          >
                            {c.name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              }
            >
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-2">
                  <FieldLabel>Customer / M/S. Name</FieldLabel>
                  <Input className="h-8 text-xs font-medium" value={inv.cust?.name || ""} onChange={(e) => updateInvField("cust.name", e.target.value)} />
                </div>
                <div>
                  <FieldLabel>GSTIN</FieldLabel>
                  <Input className="h-8 text-xs font-mono" value={inv.cust?.gstin || ""} onChange={(e) => updateInvField("cust.gstin", e.target.value)} />
                </div>
                <div>
                  <FieldLabel>Phone</FieldLabel>
                  <Input
                    className="h-8 text-xs font-mono"
                    value={inv.cust?.phone || ""}
                    onChange={(e) => updateInvField("cust.phone", e.target.value.replace(/\D/g, "").slice(0, 10))}
                    maxLength={10}
                  />
                </div>
                <div>
                  <FieldLabel>Email</FieldLabel>
                  <Input className="h-8 text-xs" value={inv.cust?.email || ""} onChange={(e) => updateInvField("cust.email", e.target.value)} />
                </div>
                <div>
                  <FieldLabel>Sales Person</FieldLabel>
                  <Input className="h-8 text-xs" value={inv.salesPerson || ""} onChange={(e) => updateInvField("salesPerson", e.target.value)} />
                </div>
                <div>
                  <FieldLabel>Project Remark</FieldLabel>
                  <Input className="h-8 text-xs" value={inv.projectRemark || ""} onChange={(e) => updateInvField("projectRemark", e.target.value)} />
                </div>
                <div>
                  <FieldLabel>Freight Type</FieldLabel>
                  <Select value={inv.freightType || "To be Billed"} onValueChange={(v) => updateInvField("freightType", v)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="To be Billed">Tobe Billed</SelectItem>
                      <SelectItem value="Prepaid">Prepaid</SelectItem>
                      <SelectItem value="FOB">FOB</SelectItem>
                      <SelectItem value="Ex-Works">Ex-Works</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-2">
                  <FieldLabel>Billing Address</FieldLabel>
                  <Input
                    className="h-8 text-xs"
                    value={inv.cust?.addr || ""}
                    onChange={(e) => {
                      const newAddr = e.target.value;
                      const isSame = Boolean(inv.cust?.addr && inv.cust?.ship === inv.cust?.addr);
                      updateInvField("cust.addr", newAddr);
                      if (isSame) {
                        updateInvField("cust.ship", newAddr);
                      }
                    }}
                  />
                </div>
                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <FieldLabel>Dispatch Address</FieldLabel>
                    <label className="flex items-center gap-1.5 text-xs text-primary font-medium cursor-pointer hover:underline">
                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary accent-primary cursor-pointer"
                        checked={Boolean(inv.cust?.sameAsBilling)}
                        onChange={(e) => {
                          const isChecked = e.target.checked;
                          updateInvField("cust.sameAsBilling", isChecked);
                          if (isChecked) {
                            updateInvField("cust.ship", inv.cust?.addr || "");
                          } else {
                            updateInvField("cust.ship", "");
                          }
                        }}
                      />
                      <span>Same as Billing Address</span>
                    </label>
                  </div>
                  <Input
                    className="h-8 text-xs"
                    value={inv.cust?.ship || ""}
                    onChange={(e) => {
                      updateInvField("cust.sameAsBilling", false);
                      updateInvField("cust.ship", e.target.value);
                    }}
                    placeholder="Site / Shipping Address"
                  />
                </div>
              </div>
            </Section>

            {/* 3. Order Booking Items & Details */}
            <Section title="Order Booking Items & Details">
              <div className="overflow-x-auto -mx-3 sm:-mx-4">
                <table className="w-full text-[11px] border-collapse" style={{ minWidth: "850px" }}>
                  <thead>
                    <tr className="border-b border-border bg-muted/20">
                      {["Sr.", "Order Booking No", "Date", "Product", "Thick", "Qty", "Area", "Amount", "Glass Name", "Weight", "Job Type", "Act Area"].map((h, i) => (
                        <th key={i} className="py-2 px-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground whitespace-nowrap text-left">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {/* `|| []` matters: a record rebuilt from the sheet's typed
                        columns (the path taken when `fullJSON` is missing or
                        unparseable) has no `items`, and mapping over undefined
                        took the whole page to the error boundary. */}
                    {(inv.items || []).map((item: any, idx: number) => {
                      const line = totals.lines?.[idx];
                      return (
                        <tr key={item.id || idx} className="hover:bg-muted/10">
                          <td className="py-1.5 px-2 text-center text-muted-foreground font-mono w-8">{idx + 1}</td>
                          <td className="py-1.5 px-2 text-xs font-mono text-muted-foreground w-[60px]">{inv.no || "—"}</td>
                          <td className="py-1.5 px-2 text-xs text-muted-foreground w-[80px]">{inv.date || "—"}</td>
                          <td className="py-1.5 px-2 text-xs text-foreground">{inv.productName || item.desc || "—"}</td>
                          <td className="py-1.5 px-2 text-xs font-mono text-center w-[45px]">{inv.glass?.thickness || "—"}</td>
                          <td className="py-1.5 px-2 text-xs font-mono text-center w-[40px]">{line?.ok ? line.qty : (item.qty || "—")}</td>
                          <td className="py-1.5 px-2 text-xs font-mono w-[65px]">
                            {line?.ok ? (settings.rateUnit === "sqft" ? line.totalSqft : line.totalSqm) : "—"}
                          </td>
                          <td className="py-1.5 px-2 text-xs font-mono font-semibold text-right w-[75px]">
                            {line?.ok ? nf(line.amount) : "—"}
                          </td>
                          <td className="py-1.5 px-2 text-xs text-foreground">{inv.glass?.desc || item.desc || "—"}</td>
                          <td className="py-1.5 px-2 text-xs font-mono w-[60px]">{totals.weightKg || "—"}</td>
                          <td className="py-1.5 px-2 text-xs text-muted-foreground w-[85px]">{inv.jobType || "—"}</td>
                          <td className="py-1.5 px-2 text-xs font-mono w-[60px]">
                            {line?.ok ? (settings.rateUnit === "sqft" ? line.totalSqft : line.totalSqm) : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Section>

            {/* 4. Delivery & Terms */}
            <Section title="Delivery & Terms">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <FieldLabel>Terms</FieldLabel>
                  <Select value={inv.delivery?.terms || "PI Terms"} onValueChange={(v) => updateInvField("delivery.terms", v)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PI Terms">PI Terms</SelectItem>
                      <SelectItem value="Standard Terms">Standard Terms</SelectItem>
                      <SelectItem value="Custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <FieldLabel>Validity of PI</FieldLabel>
                  <Input className="h-8 text-xs" value={inv.delivery?.validityOfPI || ""} onChange={(e) => updateInvField("delivery.validityOfPI", e.target.value)} />
                </div>
                <div>
                  <FieldLabel>Unloading by</FieldLabel>
                  <Input className="h-8 text-xs" value={inv.delivery?.unloadingType || ""} onChange={(e) => updateInvField("delivery.unloadingType", e.target.value)} />
                </div>
                <div>
                  <FieldLabel>Packing Type</FieldLabel>
                  <Input className="h-8 text-xs" value={inv.delivery?.packingType || ""} onChange={(e) => updateInvField("delivery.packingType", e.target.value)} />
                </div>
                <div>
                  <FieldLabel>Delivery Period</FieldLabel>
                  <Input className="h-8 text-xs" value={inv.delivery?.deliveryPeriod || ""} onChange={(e) => updateInvField("delivery.deliveryPeriod", e.target.value)} />
                </div>
                <div className="sm:col-span-2">
                  <FieldLabel>Freight Remark</FieldLabel>
                  <Input className="h-8 text-xs" value={inv.delivery?.freightRemark || ""} onChange={(e) => updateInvField("delivery.freightRemark", e.target.value)} />
                </div>
              </div>
            </Section>

            {/* 5. Summary Fields */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              <div>
                <FieldLabel>Qty</FieldLabel>
                <div className="h-8 flex items-center px-2 rounded-md border border-border bg-muted/30 text-xs font-mono text-foreground font-semibold">
                  {totals.qty || 0}
                </div>
              </div>
              <div>
                <FieldLabel>Weight</FieldLabel>
                <div className="h-8 flex items-center px-2 rounded-md border border-border bg-muted/30 text-xs font-mono text-foreground">
                  {totals.weightKg || "0.000"}
                </div>
              </div>
              <div>
                <FieldLabel>Total Area SQM</FieldLabel>
                <div className="h-8 flex items-center px-2 rounded-md border border-border bg-muted/30 text-xs font-mono text-foreground">
                  {totals.sqm ?? "0.000"}
                </div>
              </div>
              <div>
                <FieldLabel>Act. Area SQM</FieldLabel>
                <div className="h-8 flex items-center px-2 rounded-md border border-border bg-muted/30 text-xs font-mono text-foreground">
                  {totals.sqm ?? "0.000"}
                </div>
              </div>
              <div>
                <FieldLabel>Total Area SQF</FieldLabel>
                <div className="h-8 flex items-center px-2 rounded-md border border-border bg-muted/30 text-xs font-mono text-foreground">
                  {totals.sqft ?? "0.000"}
                </div>
              </div>
              <div>
                <FieldLabel>Act. Area SQF</FieldLabel>
                <div className="h-8 flex items-center px-2 rounded-md border border-border bg-muted/30 text-xs font-mono text-foreground">
                  {totals.sqft ?? "0.000"}
                </div>
              </div>
            </div>

            {/* 6. Action Buttons */}
            <div className="flex flex-wrap gap-2 justify-end">
              <Button
                type="button"
                size="sm"
                className="h-9 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 shadow-md"
                onClick={handleConfirmOrder}
                disabled={isWorkflowLocked}
              >
                <Save className="h-4 w-4" /> Save Invoice
              </Button>
            </div>
          </div>

          {/* ════ RIGHT COLUMN: Particular Panel ════ */}
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-lg overflow-hidden sticky top-14">
              <div className="px-3 py-2 border-b border-border bg-red-500/10">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-foreground">Particular</span>
                  <div className="flex gap-1">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Rate</span>
                    <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground ml-4">Amount</span>
                  </div>
                </div>
              </div>
              <div className="px-3 py-2 space-y-0">
                {/* Basic Amount */}
                <div className="flex justify-between py-1.5 text-[11px] border-b border-border/30">
                  <span className="text-foreground font-medium bg-blue-500/10 px-2 py-0.5 rounded">Basic Amount</span>
                  <span className="font-mono text-foreground bg-blue-500/20 px-2 py-0.5 rounded">{nf(totals.glassAmount ?? 0)}</span>
                </div>

                {/* Admin Charge */}
                <div className="flex justify-between items-center py-1.5 text-[11px] border-b border-border/30">
                  <span className="text-foreground">Admin Charge</span>
                  <Input type="number" className="h-6 text-[10px] font-mono w-[70px] text-right" value={inv.ch?.adminCharge || ""} onChange={(e) => updateInvField("ch.adminCharge", e.target.value === "" ? "" : Number(e.target.value))} />
                </div>

                {/* Freight */}
                <div className="flex justify-between items-center py-1.5 text-[11px] border-b border-border/30">
                  <span className="text-foreground">Freight</span>
                  <Input type="number" className="h-6 text-[10px] font-mono w-[70px] text-right" value={inv.ch?.freight || ""} onChange={(e) => updateInvField("ch.freight", e.target.value === "" ? "" : Number(e.target.value))} />
                </div>

                {/* Packing Charges */}
                <div className="flex justify-between items-center py-1.5 text-[11px] border-b border-border/30">
                  <span className="text-foreground">Packing Charges</span>
                  <Input type="number" className="h-6 text-[10px] font-mono w-[70px] text-right bg-green-500/15 border-green-500/30" value={inv.ch?.packingCharges || ""} onChange={(e) => updateInvField("ch.packingCharges", e.target.value === "" ? "" : Number(e.target.value))} />
                </div>

                {/* Total */}
                <div className="flex justify-between py-1.5 text-[11px] border-b border-border/30">
                  <span className="text-red-500 font-bold">Total</span>
                  <span className="font-mono font-bold text-foreground bg-green-500/20 px-2 py-0.5 rounded">{nf(totals.subTotal ?? 0)}</span>
                </div>

                {/* Insurance */}
                <div className="flex justify-between items-center py-1.5 text-[11px] border-b border-border/30">
                  <span className="text-foreground">Insurance</span>
                  <span className="font-mono text-foreground">{nf(totals.insurance ?? 0)}</span>
                </div>

                {/* Net Value */}
                <div className="flex justify-between py-1.5 text-[11px] border-b border-border/30">
                  <span className="text-red-500 font-bold">Ass. Value</span>
                  <span className="font-mono font-bold text-foreground bg-green-500/20 px-2 py-0.5 rounded">{nf(totals.assessableValue ?? 0)}</span>
                </div>

                {/* C-GST */}
                <div className="flex justify-between py-1.5 text-[11px] border-b border-border/30">
                  <span className="text-foreground">C-GST</span>
                  <span className="font-mono text-foreground">{nf(totals.cgst ?? 0)}</span>
                </div>

                {/* S-GST */}
                <div className="flex justify-between py-1.5 text-[11px] border-b border-border/30">
                  <span className="text-foreground">S-GST</span>
                  <span className="font-mono text-foreground">{nf(totals.sgst ?? 0)}</span>
                </div>

                {/* I-GST */}
                <div className="flex justify-between py-1.5 text-[11px] border-b border-border/30">
                  <span className="text-foreground">I-GST</span>
                  <span className="font-mono text-foreground">{nf(totals.igst ?? 0)}</span>
                </div>

                {/* Gross Total */}
                <div className="flex justify-between py-1.5 text-[11px] border-b border-border/30">
                  <span className="text-red-500 font-bold">Gross Total</span>
                  <span className="font-mono font-bold text-foreground bg-yellow-500/20 px-2 py-0.5 rounded">{nf(totals.grossTotal ?? 0)}</span>
                </div>

                {/* TCS Charge */}
                <div className="flex justify-between items-center py-1.5 text-[11px] border-b border-border/30">
                  <span className="text-foreground">TCS Charge</span>
                  <Input type="number" className="h-6 text-[10px] font-mono w-[70px] text-right" value={inv.ch?.tcsPercent || ""} onChange={(e) => updateInvField("ch.tcsPercent", e.target.value === "" ? "" : Number(e.target.value))} placeholder="%" />
                </div>

                {/* Round Off */}
                <div className="flex justify-between py-1.5 text-[11px] border-b border-border/30">
                  <span className="text-foreground">Round Off</span>
                  <span className="font-mono text-foreground">{totals.roundOff > 0 ? `+${nf(totals.roundOff)}` : nf(totals.roundOff ?? 0)}</span>
                </div>

                {/* Grand Total */}
                <div className="flex justify-between py-2 text-sm mt-1 border-t-2 border-border">
                  <span className="text-red-500 font-bold">Grand Total</span>
                  <span className="font-mono font-bold text-lg text-red-600 bg-red-500/10 px-3 py-0.5 rounded">{nf(totals.grandTotal ?? 0)}</span>
                </div>


              </div>
            </div>
          </div>
        </div>
      </div>
      )}
      {/* ── CONFIRM PAYMENT MODAL ───────────────────────── */}
      <ConfirmPaymentModal
        open={confirmModalOpen}
        invoice={targetConfirmInvoice}
        onClose={() => setConfirmModalOpen(false)}
        onConfirm={handleConfirmPaymentAndMove}
      />
      {/* ── INVOICE DETAIL POPUP MODAL ───────────────────── */}
      <InvoiceDetailModal
        invoice={detailInvoice}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onEdit={(item) => {
          loadInvoice(item.id, false);
          setShowForm(true);
        }}
      />
    </div>
  );
}
