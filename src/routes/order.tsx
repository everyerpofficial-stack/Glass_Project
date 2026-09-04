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
  Ban,
  Plus,
  Clock,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import { useState, useMemo, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useGQ } from "@/lib/store";
import { TableSkeleton } from "@/components/app/DataSkeleton";
import { ConfirmDelete } from "@/components/app/ConfirmDelete";
import {
  nf,
  dmy,
  getPaymentDueDateInfo,
  nextSeqForPrefix,
  getNextProformaNo,
  uid,
  workOrderBelongsTo,
  dedupeCustomers,
  formatOrderId,
  formatPiNo,
  isSupersededBooking,
  supersededBookingNos,
} from "@/lib/gq";
import { toast } from "sonner";
import { InvoiceDetailModal } from "@/components/app/InvoiceDetailModal";
import {
  ConfirmPaymentModal,
  type ConfirmPaymentDetails,
} from "@/components/app/ConfirmPaymentModal";

import {
  DesktopOnly,
  MobileActionBar,
  MobileList,
  MobileRecordCard,
  SwipeHint,
} from "@/components/app/MobileRecord";

export const Route = createFileRoute("/order")({
  validateSearch: (
    search: Record<string, unknown>,
  ): {
    view?: string | undefined;
    id?: string | undefined;
    detailId?: string | undefined;
    action?: string | undefined;
    from?: string | undefined;
    tab?: string | undefined;
  } => ({
    view: typeof search["view"] === "string" ? (search["view"] as string) : undefined,
    id: typeof search["id"] === "string" ? (search["id"] as string) : undefined,
    detailId: typeof search["detailId"] === "string" ? (search["detailId"] as string) : undefined,
    action: typeof search["action"] === "string" ? (search["action"] as string) : undefined,
    from: typeof search["from"] === "string" ? (search["from"] as string) : undefined,
    tab: typeof search["tab"] === "string" ? (search["tab"] as string) : undefined,
  }),
  component: OrderPage,
});

/* ── Timeframe Helper ────────────────────────────────────────── */
type Timeframe = "today" | "yesterday" | "month" | "year" | "custom";

function timeframeRange(
  tf: Timeframe,
  customStart?: string,
  customEnd?: string,
): { from: number; to: number } | null {
  const now = new Date();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const DAY = 86400000;
  if (tf === "today") return { from: midnight, to: midnight + DAY };
  if (tf === "yesterday") return { from: midnight - DAY, to: midnight };
  if (tf === "month") {
    return {
      from: new Date(now.getFullYear(), now.getMonth(), 1).getTime(),
      to: new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime(),
    };
  }
  if (tf === "year") {
    return {
      from: new Date(now.getFullYear(), 0, 1).getTime(),
      to: new Date(now.getFullYear() + 1, 0, 1).getTime(),
    };
  }
  if (tf === "custom") {
    const from = customStart ? new Date(customStart).getTime() : 0;
    const to = customEnd ? new Date(customEnd + "T23:59:59").getTime() : Date.now() + DAY * 365;
    return { from, to };
  }
  return null;
}

function recordTime(rec: any): number {
  return Date.parse(rec?.date || "") || Date.parse(rec?.createdAt || "") || 0;
}

function withinRange(rec: any, range: { from: number; to: number } | null): boolean {
  if (!range) return true;
  const t = recordTime(rec);
  return t >= range.from && t < range.to;
}

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
      <div
        className={`flex items-center justify-between px-3 sm:px-4 py-2.5 border-b border-border gap-2 flex-wrap ${accent || "bg-muted/30"}`}
      >
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

/* What a row owes. A payment is matched to a document by any of the numbers
   that document has been known by, and the recorded `paidAmount` wins when it
   is the larger of the two. Shared by the phone card and the desktop row so the
   two can never show different money for the same record. */
function settleAmounts(item: any, payments: any[]) {
  const grandTotal = Number(item.totals?.grandTotal || 0);
  const matchedPaymentsSum = (payments || [])
    .filter((p: any) => {
      if (!p || !p.invoiceNo) return false;
      const pNo = String(p.invoiceNo).trim().toLowerCase();
      const iNo = String(item.no || "")
        .trim()
        .toLowerCase();
      const oNo = String(item.orderNo || "")
        .trim()
        .toLowerCase();
      const preNo = String(item.preProformaNo || "")
        .trim()
        .toLowerCase();
      const pId = String(item.id || "")
        .trim()
        .toLowerCase();
      return (
        pNo === iNo ||
        (oNo && pNo === oNo) ||
        (preNo && pNo === preNo) ||
        pNo === pId ||
        formatPiNo(pNo) === formatPiNo(iNo)
      );
    })
    .reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);
  const paidAmount = Math.max(Number(item.paidAmount || 0), matchedPaymentsSum);
  return { grandTotal, paidAmount, remainingBalance: Math.max(0, grandTotal - paidAmount) };
}

/* ─── Main Order Page ────────────────────────────────────────────── */
function OrderPage() {
  const navigate = useNavigate();
  const searchParams = useSearch({ strict: false }) as {
    view?: string;
    id?: string;
    detailId?: string;
    action?: string;
    from?: string;
    tab?: string;
  };
  const {
    inv,
    setInv,
    totals,
    settings,
    invoices,
    customers,
    workOrders,
    payments,
    saveInvoice,
    saveCustomer,
    newInvoice,
    loadInvoice,
    confirmPreProforma,
    confirmOrder,
    generateWorkOrder,
    saveWorkOrder,
    updateInvoiceStatus,
    markAsDelivered,
    deleteInvoice,
    hydrated,
  } = useGQ();

  const isConfirmingFromBooking = useMemo(() => {
    return (
      searchParams?.action === "confirm" ||
      searchParams?.from === "booking" ||
      inv.docType === "pre_proforma" ||
      !inv.docType
    );
  }, [searchParams?.action, searchParams?.from, inv.docType]);

  const [custSearch, setCustSearch] = useState("");
  const [custDropOpen, setCustDropOpen] = useState(false);
  const [selectedBookings, setSelectedBookings] = useState<string[]>([]);
  const [savedSearch, setSavedSearch] = useState("");
  const [deliveryFilter, setDeliveryFilter] = useState<"all" | "delivered" | "not_delivered">(
    "all",
  );
  const [dueFilter, setDueFilter] = useState<"all" | "has_due" | "no_due">("all");
  const [showForm, setShowForm] = useState(searchParams?.view === "form");
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [targetConfirmInvoice, setTargetConfirmInvoice] = useState<any>(null);
  const [detailInvoice, setDetailInvoice] = useState<any | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deliveryConfirmTarget, setDeliveryConfirmTarget] = useState<any | null>(null);

  /* ?view=form&action=new opens an empty Order Confirm — the target of the
     mobile quick-action button. The one-shot param is stripped straight after
     it is consumed so a refresh cannot blank a draft already in progress. */
  const quickNewConsumed = useRef(false);
  useEffect(() => {
    if (searchParams?.action === "new" && searchParams?.view === "form" && !searchParams?.id) {
      if (quickNewConsumed.current) return;
      quickNewConsumed.current = true;
      newInvoice();
      setShowForm(true);
      navigate({ to: "/order", search: { view: "form" } as any, replace: true });
    } else if (searchParams?.action !== "new") {
      quickNewConsumed.current = false;
    }
  }, [searchParams?.action, searchParams?.view, searchParams?.id, newInvoice, navigate]);
  useEffect(() => {
    if (searchParams?.id && searchParams?.view === "form") {
      loadInvoice(searchParams.id, false);
      setShowForm(true);
    } else if (searchParams?.detailId || (searchParams?.id && searchParams?.view !== "form")) {
      const targetId = searchParams.detailId || searchParams.id;
      if (targetId) {
        const found = invoices.find(
          (x: any) =>
            String(x.id) === String(targetId) ||
            String(x.no) === String(targetId) ||
            String(x.orderNo) === String(targetId) ||
            String(x.preProformaNo) === String(targetId) ||
            formatPiNo(x.no) === targetId ||
            formatPiNo(x.orderNo) === targetId ||
            formatPiNo(x.preProformaNo) === targetId,
        );
        if (found) {
          setDetailInvoice(found);
          setDetailOpen(true);
          setShowForm(false);
        } else if (searchParams?.id) {
          loadInvoice(searchParams.id, false);
          setShowForm(true);
        }
      }
    } else if (searchParams?.view === "form") {
      setShowForm(true);
    } else if (searchParams?.view === "list") {
      setShowForm(false);
    }
  }, [searchParams?.id, searchParams?.detailId, searchParams?.view, loadInvoice, invoices]);

  const [timeframe, setTimeframe] = useState<Timeframe>("month");
  const [customStart, setCustomStart] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  });
  const [customEnd, setCustomEnd] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });

  const range = useMemo(
    () => timeframeRange(timeframe, customStart, customEnd),
    [timeframe, customStart, customEnd],
  );

  const proformaInvoices = useMemo(
    () => invoices.filter((x: any) => x.docType === "proforma" && withinRange(x, range)),
    [invoices, range],
  );

  const pendingCount = useMemo(
    () =>
      proformaInvoices.filter((x) => !x.status || x.status === "draft" || x.status === "pi_sent")
        .length,
    [proformaInvoices],
  );
  const confirmedCount = useMemo(
    () =>
      proformaInvoices.filter(
        (x) => x.status === "order_confirmed" || x.status === "work_order_generated",
      ).length,
    [proformaInvoices],
  );
  const cancelledCount = useMemo(
    () => proformaInvoices.filter((x: any) => x.status === "cancelled").length,
    [proformaInvoices],
  );
  const deliveredCount = useMemo(
    () =>
      proformaInvoices.filter(
        (x: any) =>
          x.status !== "cancelled" &&
          (x.deliveryStatus === "Delivered" || x.status === "delivered"),
      ).length,
    [proformaInvoices],
  );
  const totalDueAmount = useMemo(
    () =>
      proformaInvoices.reduce((acc, item: any) => {
        if (item.status === "cancelled") return acc;
        const grandTotal = Number(item.totals?.grandTotal || 0);
        const paidAmount = Number(item.paidAmount || 0);
        const due = Math.max(0, grandTotal - paidAmount);
        return acc + due;
      }, 0),
    [proformaInvoices],
  );

  const filteredSavedInvoices = useMemo(
    () =>
      proformaInvoices.filter((item: any) => {
        // 1. Delivery Status Filter
        const isDelivered = Boolean(item.delivered || item.deliveryStatus === "Delivered");
        if (deliveryFilter === "delivered" && !isDelivered) return false;
        if (deliveryFilter === "not_delivered" && isDelivered) return false;

        // 2. Due Status Filter
        const isCancelled = item.status === "cancelled";
        const grandTotal = Number(item.totals?.grandTotal || 0);
        const paidAmount = Number(item.paidAmount || 0);
        const remainingBalance = Math.max(0, grandTotal - paidAmount);
        const hasDue = remainingBalance > 0 && !isCancelled;

        if (dueFilter === "has_due" && !hasDue) return false;
        if (dueFilter === "no_due" && hasDue) return false;

        // 3. Safe Text Search Query
        const query = savedSearch.toLowerCase().trim();
        if (!query) return true;

        const piNoStr = formatPiNo(item.no).toLowerCase();
        const rawNoStr = String(item.no || "").toLowerCase();
        const preNoStr = String(item.preProformaNo || "").toLowerCase();
        const orderNoStr = String(item.orderNo || "").toLowerCase();
        const formattedOrderStr = formatOrderId(item.preProformaNo || item.orderNo).toLowerCase();
        const custNameStr = String(item.cust?.name || "").toLowerCase();
        const custPhoneStr = String(item.cust?.phone || "").toLowerCase();
        const custGstinStr = String(item.cust?.gstin || "").toLowerCase();

        return (
          piNoStr.includes(query) ||
          rawNoStr.includes(query) ||
          preNoStr.includes(query) ||
          orderNoStr.includes(query) ||
          formattedOrderStr.includes(query) ||
          custNameStr.includes(query) ||
          custPhoneStr.includes(query) ||
          custGstinStr.includes(query)
        );
      }),
    [proformaInvoices, savedSearch, deliveryFilter, dueFilter],
  );

  /* Get Order Bookings available for loading into Proforma Invoice */
  const availableBookings = useMemo(() => {
    const superseded = supersededBookingNos(invoices);
    return invoices.filter(
      (x: any) =>
        (!x.docType || x.docType === "pre_proforma") &&
        x.docType !== "proforma_converted" &&
        x.status !== "order_confirmed" &&
        x.status !== "work_order_generated" &&
        x.status !== "confirmed" &&
        !isSupersededBooking(x, superseded),
    );
  }, [invoices]);

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
  const uniqueCustomers = useMemo(() => dedupeCustomers(customers), [customers]);
  const filteredCustomers = useMemo(
    () =>
      uniqueCustomers.filter((c: any) => c.name?.toLowerCase().includes(custSearch.toLowerCase())),
    [uniqueCustomers, custSearch],
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
    toast.success(
      `✨ Auto-filled data from Proforma Invoice ${booking.no} into this Order Confirm`,
    );
  };

  const handleOpenConfirmModal = (targetRecord?: any) => {
    const target = targetRecord || inv;
    if (!target || !target.id) {
      toast.error("Invalid Proforma Invoice record");
      return;
    }

    /* Save current invoice state to ensure all fields/amounts are saved before modal opens */
    if (!saveInvoice()) return;

    /* Set target invoice for modal and open payment modal */
    const currentSaved = invoices.find((x: any) => x.id === (target.id || inv.id)) || target;
    setTargetConfirmInvoice(currentSaved);
    setConfirmModalOpen(true);
  };

  const handleConfirmPaymentAndMove = (paymentDetails: ConfirmPaymentDetails) => {
    if (!targetConfirmInvoice) return;

    let activeInv = targetConfirmInvoice;
    if (activeInv.docType === "pre_proforma" || !activeInv.docType) {
      const converted = confirmPreProforma(activeInv.id);
      if (converted) {
        activeInv = converted;
      }
    }

    confirmOrder(activeInv.id, paymentDetails);

    const existingWO = workOrders.find((w: any) => workOrderBelongsTo(w, activeInv));
    if (!existingWO) {
      const wo = generateWorkOrder(activeInv.id);
      if (wo) {
        saveWorkOrder(wo);
        updateInvoiceStatus(activeInv.id, "work_order_generated");
      }
    }

    setConfirmModalOpen(false);
    setTargetConfirmInvoice(null);
    setShowForm(false);
    toast.success(
      `Payment confirmed for ${activeInv.no || activeInv.orderNo}! Moved to Order Confirm.`,
    );
    loadInvoice(activeInv.id, false);
    navigate({ to: "/invoice", search: { id: activeInv.id } });
  };

  const handleConfirmOrder = () => {
    handleOpenConfirmModal(inv);
  };

  const isWorkflowLocked = inv.status === "work_order_generated";

  return (
    <div className="min-h-screen bg-background">
      {/* ── UNIFIED SECTION TABS ───────────────────────── */}
      <div className="bg-muted/40 border-b border-border px-3 sm:px-6 py-2 flex items-center gap-2 text-xs font-semibold flex-wrap">
        <span className="text-muted-foreground mr-1 text-[11px] font-bold uppercase tracking-wider">
          Proforma Section:
        </span>
        <Link
          to="/booking"
          className="px-3 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors flex items-center gap-1.5"
        >
          1. Proforma Invoice
        </Link>
        <Link
          to="/order"
          search={{ view: undefined }}
          className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground font-bold shadow-sm flex items-center gap-1.5"
        >
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          2. Order Confirm
        </Link>
      </div>

      {/* ── WORKFLOW LOCK ALERT BANNER ──────────────── */}
      {isWorkflowLocked && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 px-3 sm:px-6 py-2 flex items-center justify-between gap-2 text-xs font-semibold text-amber-700 dark:text-amber-300">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 shrink-0 text-amber-600" />
            <span>
              This Order Confirm record has been sent to Work Order workflow. It is locked from
              further editing.
            </span>
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
              <Link to="/" className="hover:text-foreground transition-colors">
                Home
              </Link>
              {" / "}
              {showForm ? (
                <button
                  onClick={() => {
                    if (isConfirmingFromBooking) {
                      navigate({ to: "/booking" });
                    } else {
                      setShowForm(false);
                      navigate({ to: "/order", search: { view: undefined } as any });
                    }
                  }}
                  className="hover:text-foreground transition-colors"
                >
                  {isConfirmingFromBooking ? "Proforma Invoice" : "Order Confirm"}
                </button>
              ) : (
                <span className="text-primary font-semibold">Order Confirm</span>
              )}
              {showForm && (
                <>
                  {" / "}
                  <span className="text-primary font-semibold">
                    {isConfirmingFromBooking
                      ? `Confirm (${inv.orderNo || inv.no || "Proforma"})`
                      : `Edit (${inv.no || inv.orderNo})`}
                  </span>
                </>
              )}
            </div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground leading-tight flex items-center gap-2">
              <FileText className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              {showForm
                ? isConfirmingFromBooking
                  ? "Confirm Order Invoice"
                  : "Edit Order Confirm"
                : "Order Confirm Management"}
              {showForm && (inv.no || inv.orderNo) && (
                <span className="text-xs font-mono font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded">
                  {inv.orderNo || inv.no}
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
                  onClick={() => {
                    if (isConfirmingFromBooking) {
                      navigate({ to: "/booking" });
                    } else {
                      setShowForm(false);
                      navigate({ to: "/order", search: { view: undefined } as any });
                    }
                  }}
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  {isConfirmingFromBooking ? "Back to Proforma List" : "Back to Saved List"}
                </Button>

                {!isConfirmingFromBooking && (
                  <Button
                    size="sm"
                    className="h-8 text-xs font-bold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md cursor-pointer"
                    onClick={() => {
                      if (saveInvoice()) {
                        toast.success(`Order Confirm ${inv.no || inv.orderNo} saved successfully`);
                        setShowForm(false);
                        navigate({ to: "/order", search: { view: undefined } as any });
                      }
                    }}
                  >
                    <Save className="h-3.5 w-3.5" />
                    Save Order Confirm
                  </Button>
                )}
              </>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center bg-slate-100 dark:bg-muted p-1 rounded-xl border border-border/80 text-xs font-medium gap-0.5">
                  <button
                    type="button"
                    onClick={() => setTimeframe("today")}
                    className={`px-3 py-1.5 rounded-lg transition-all font-semibold cursor-pointer ${
                      timeframe === "today"
                        ? "bg-blue-600 text-white shadow-xs"
                        : "text-muted-foreground hover:text-foreground hover:bg-slate-200/60 dark:hover:bg-muted/80"
                    }`}
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimeframe("yesterday")}
                    className={`px-3 py-1.5 rounded-lg transition-all font-semibold cursor-pointer ${
                      timeframe === "yesterday"
                        ? "bg-blue-600 text-white shadow-xs"
                        : "text-muted-foreground hover:text-foreground hover:bg-slate-200/60 dark:hover:bg-muted/80"
                    }`}
                  >
                    Yesterday
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimeframe("month")}
                    className={`px-3 py-1.5 rounded-lg transition-all font-semibold cursor-pointer ${
                      timeframe === "month"
                        ? "bg-blue-600 text-white shadow-xs"
                        : "text-muted-foreground hover:text-foreground hover:bg-slate-200/60 dark:hover:bg-muted/80"
                    }`}
                  >
                    This Month
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimeframe("year")}
                    className={`px-3 py-1.5 rounded-lg transition-all font-semibold cursor-pointer ${
                      timeframe === "year"
                        ? "bg-blue-600 text-white shadow-xs"
                        : "text-muted-foreground hover:text-foreground hover:bg-slate-200/60 dark:hover:bg-muted/80"
                    }`}
                  >
                    This Year
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimeframe("custom")}
                    className={`px-3 py-1.5 rounded-lg transition-all font-semibold flex items-center gap-1 cursor-pointer ${
                      timeframe === "custom"
                        ? "bg-blue-600 text-white shadow-xs"
                        : "text-muted-foreground hover:text-foreground hover:bg-slate-200/60 dark:hover:bg-muted/80"
                    }`}
                  >
                    <span>Custom Date</span>
                    <CalendarDays className="h-3.5 w-3.5" />
                  </button>
                </div>

                {timeframe === "custom" && (
                  <div className="flex items-center gap-1.5 bg-white dark:bg-muted p-1 rounded-xl border border-border text-xs">
                    <span className="text-[11px] font-bold text-muted-foreground pl-1">From:</span>
                    <input
                      type="date"
                      value={customStart}
                      onChange={(e) => setCustomStart(e.target.value)}
                      className="h-7 px-2 text-xs rounded-md border border-border bg-background font-mono"
                    />
                    <span className="text-[11px] font-bold text-muted-foreground">To:</span>
                    <input
                      type="date"
                      value={customEnd}
                      onChange={(e) => setCustomEnd(e.target.value)}
                      className="h-7 px-2 text-xs rounded-md border border-border bg-background font-mono"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── KPI METRICS CARDS (Shown only on management/list view) ─────────────────── */}
        {!showForm && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {/* Card 1: Total Order */}
            <div className="bg-background border border-border/80 rounded-lg p-3 shadow-xs">
              <div className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">
                Total Order
              </div>
              <div className="text-xl font-bold text-foreground mt-0.5">
                {proformaInvoices.length}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">Proforma records</div>
            </div>

            {/* Card 2: Order Confirmed */}
            <div className="bg-background border border-blue-500/30 rounded-lg p-3 shadow-xs border-l-4 border-l-blue-500">
              <div className="text-[10px] font-bold uppercase text-blue-600 dark:text-blue-400 flex items-center gap-1 tracking-wider">
                <CheckCircle2 className="h-3 w-3" /> Order Confirmed
              </div>
              <div className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-0.5">
                {confirmedCount}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">In workflow</div>
            </div>

            {/* Card 3: Cancelled */}
            <div className="bg-background border border-rose-500/30 rounded-lg p-3 shadow-xs border-l-4 border-l-rose-500">
              <div className="text-[10px] font-bold uppercase text-rose-600 dark:text-rose-400 flex items-center gap-1 tracking-wider">
                <XCircle className="h-3 w-3" /> Cancelled
              </div>
              <div className="text-xl font-bold text-rose-600 dark:text-rose-400 mt-0.5">
                {cancelledCount}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">Cancelled orders</div>
            </div>

            {/* Card 4: Delivery Status */}
            <div
              className={`bg-background border rounded-lg p-3 shadow-xs border-l-4 border-l-emerald-500 cursor-pointer transition-all ${
                deliveryFilter !== "all"
                  ? "ring-2 ring-emerald-500/50 bg-emerald-500/5"
                  : "hover:border-emerald-500/50"
              }`}
              onClick={() => {
                setDeliveryFilter((prev) =>
                  prev === "delivered"
                    ? "not_delivered"
                    : prev === "not_delivered"
                      ? "all"
                      : "delivered",
                );
              }}
              title="Click to toggle Delivery filter (All -> Delivered -> Not Delivered)"
            >
              <div className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400 flex items-center justify-between tracking-wider">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Delivery Status
                </span>
                {deliveryFilter !== "all" && (
                  <span className="text-[9px] bg-emerald-600 text-white px-1.5 py-0.5 rounded font-mono">
                    Filtered
                  </span>
                )}
              </div>
              <div className="text-xl font-bold mt-0.5 font-mono flex items-center gap-1">
                <span className="text-emerald-600 dark:text-emerald-400">{deliveredCount}</span>
                <span className="text-muted-foreground/60 font-normal">/</span>
                <span className="text-rose-600 dark:text-rose-400">{proformaInvoices.length}</span>
              </div>
              <div className="text-[10px] mt-0.5 flex items-center gap-1 font-semibold">
                <span className="text-emerald-600 dark:text-emerald-400">Yes</span>
                <span className="text-muted-foreground/60">/</span>
                <span className="text-rose-600 dark:text-rose-400">No</span>
              </div>
            </div>

            {/* Card 5: Total Due Amount */}
            <div
              className={`bg-background border rounded-lg p-3 shadow-xs border-l-4 border-l-amber-500 cursor-pointer transition-all ${
                dueFilter !== "all"
                  ? "ring-2 ring-amber-500/50 bg-amber-500/5"
                  : "hover:border-amber-500/50"
              }`}
              onClick={() => {
                setDueFilter((prev) =>
                  prev === "has_due" ? "no_due" : prev === "no_due" ? "all" : "has_due",
                );
              }}
              title="Click to toggle Due filter (All -> Has Due -> Fully Paid)"
            >
              <div className="text-[10px] font-bold uppercase text-amber-600 dark:text-amber-400 flex items-center justify-between tracking-wider">
                <span>Total Due Amount</span>
                {dueFilter !== "all" && (
                  <span className="text-[9px] bg-amber-600 text-white px-1.5 py-0.5 rounded font-mono">
                    Filtered
                  </span>
                )}
              </div>
              <div className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-0.5 font-mono">
                ₹ {nf(totalDueAmount)}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">
                Active outstanding dues
              </div>
            </div>
          </div>
        )}
      </div>

      {!showForm ? (
        /* ── ALL SAVED ORDER CONFIRMS TABLE (TOP DEFAULT VIEW) ────────────────── */
        <div className="p-3 sm:p-4 bg-muted/20 border-b border-border">
          <Section
            title="All Order Confirms"
            headerRight={
              <div className="flex items-center gap-2 flex-wrap">
                {/* Search Box */}
                <div className="relative">
                  <Search className="h-3.5 w-3.5 absolute left-2.5 top-2 text-muted-foreground" />
                  <Input
                    className="h-7 text-xs pl-8 w-36 sm:w-52 bg-background"
                    placeholder="Search order confirm..."
                    value={savedSearch}
                    onChange={(e) => setSavedSearch(e.target.value)}
                  />
                </div>

                {/* Delivery Filter Dropdown */}
                <Select value={deliveryFilter} onValueChange={(val: any) => setDeliveryFilter(val)}>
                  <SelectTrigger className="h-7 text-xs w-36 bg-background cursor-pointer">
                    <SelectValue placeholder="Delivery Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Delivery: All</SelectItem>
                    <SelectItem value="delivered">✓ Delivered (Yes)</SelectItem>
                    <SelectItem value="not_delivered">❌ Not Delivered (No)</SelectItem>
                  </SelectContent>
                </Select>

                {/* Due Status Filter Dropdown */}
                <Select value={dueFilter} onValueChange={(val: any) => setDueFilter(val)}>
                  <SelectTrigger className="h-7 text-xs w-36 bg-background cursor-pointer">
                    <SelectValue placeholder="Due Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Payment Due: All</SelectItem>
                    <SelectItem value="has_due">⚠️ Due Pending</SelectItem>
                    <SelectItem value="no_due">✓ Fully Paid (No Due)</SelectItem>
                  </SelectContent>
                </Select>

                {(deliveryFilter !== "all" || dueFilter !== "all" || savedSearch) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs px-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 font-semibold cursor-pointer"
                    onClick={() => {
                      setDeliveryFilter("all");
                      setDueFilter("all");
                      setSavedSearch("");
                    }}
                  >
                    Reset
                  </Button>
                )}

                <span className="text-xs text-muted-foreground font-medium">
                  <span className="font-bold text-foreground">{filteredSavedInvoices.length}</span>{" "}
                  records
                </span>
              </div>
            }
          >
            {!hydrated ? (
              <TableSkeleton rows={6} cols={6} />
            ) : filteredSavedInvoices.length === 0 ? (
              <div className="text-center py-12 text-xs text-muted-foreground space-y-2">
                <p>
                  {savedSearch ? "No matching Order Confirms found." : "No Order Confirms found."}
                </p>
                <Link to="/booking">
                  <Button
                    size="sm"
                    className="h-8 text-xs gap-1.5 bg-primary text-primary-foreground font-semibold cursor-pointer"
                  >
                    <FileText className="h-3.5 w-3.5" /> Go to Proforma Invoice
                  </Button>
                </Link>
              </div>
            ) : (
              <>
                {/* ── Phone: one card per Order Confirm ── */}
                <MobileList>
                  {filteredSavedInvoices.map((item: any) => {
                    const rowCancelled = item.status === "cancelled";
                    const { grandTotal, paidAmount, remainingBalance } = settleAmounts(
                      item,
                      payments,
                    );
                    const dueInfo = getPaymentDueDateInfo(item, payments);
                    const rawOrder =
                      item.preProformaNo || (item.orderNo !== item.no ? item.orderNo : undefined);
                    const orderId = formatOrderId(rawOrder);
                    const isDelivered = Boolean(item.delivered);

                    return (
                      <MobileRecordCard
                        key={item.id}
                        dimmed={rowCancelled}
                        accent={
                          rowCancelled
                            ? "bg-rose-500"
                            : remainingBalance > 0
                              ? "bg-amber-500"
                              : "bg-emerald-500"
                        }
                        onClick={() => {
                          setDetailInvoice(item);
                          setDetailOpen(true);
                        }}
                        code={
                          <span className={rowCancelled ? "line-through text-rose-600" : undefined}>
                            {formatPiNo(item.no)}
                          </span>
                        }
                        badge={
                          <>
                            {rowCancelled && (
                              <span className="rounded bg-rose-500 px-1.5 py-0.5 text-[9px] font-extrabold uppercase text-white">
                                Cancelled
                              </span>
                            )}
                            <span
                              className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${dueInfo.badgeClass}`}
                            >
                              {dueInfo.label}
                            </span>
                          </>
                        }
                        subject={item.cust?.name || "—"}
                        meta={[
                          dmy(item.date),
                          item.cust?.phone || null,
                          orderId !== "—" ? orderId : null,
                        ]}
                        fields={[
                          { label: "Total", value: `₹ ${nf(grandTotal)}` },
                          {
                            label: "Received",
                            value: `₹ ${nf(paidAmount)}`,
                            tone: "positive",
                          },
                          {
                            label: "Due",
                            value: `₹ ${nf(remainingBalance)}`,
                            tone: remainingBalance > 0 ? "warning" : "positive",
                          },
                        ]}
                        actions={
                          <>
                            {isDelivered ? (
                              <span className="inline-flex h-9 items-center gap-1 rounded-md border border-emerald-500/40 bg-emerald-500/15 px-2.5 text-[11px] font-bold text-emerald-600">
                                <CheckCircle2 className="h-3.5 w-3.5" /> Delivered
                              </span>
                            ) : !rowCancelled ? (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-9 gap-1.5 border-rose-500/40 bg-rose-500/10 text-[11px] font-bold text-rose-600"
                                onClick={() => setDeliveryConfirmTarget(item)}
                              >
                                <XCircle className="h-3.5 w-3.5" /> Not delivered
                              </Button>
                            ) : null}

                            <span className="flex-1" />

                            {!rowCancelled && (
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-9 w-9 text-primary border-primary/30"
                                title="Edit Order Confirm"
                                onClick={() => {
                                  loadInvoice(item.id, false);
                                  setShowForm(true);
                                  toast.success(`Loaded Order Confirm ${item.no} for editing`);
                                }}
                              >
                                <Edit3 className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-9 w-9 text-emerald-600 border-emerald-500/30"
                              title="Print / Save PDF"
                              onClick={() => {
                                loadInvoice(item.id, false);
                                navigate({ to: "/invoice", search: { id: item.id } });
                              }}
                            >
                              <Printer className="h-4 w-4" />
                            </Button>
                            {!rowCancelled && (
                              <ConfirmDelete
                                title={`Cancel Order Confirm ${item.no}?`}
                                description={`Are you sure you want to cancel ${item.no} (${item.cust?.name || "unnamed customer"})? Its status becomes Cancelled: the record stays for the audit trail but stops counting towards revenue and dues.`}
                                confirmLabel="Cancel Invoice"
                                onConfirm={() => {
                                  updateInvoiceStatus(item.id, "cancelled");
                                  toast.info(`Invoice ${item.no} set to Cancelled`);
                                }}
                              >
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-9 w-9 text-amber-600 border-amber-500/30"
                                  title="Cancel Invoice"
                                >
                                  <Ban className="h-4 w-4" />
                                </Button>
                              </ConfirmDelete>
                            )}
                          </>
                        }
                      />
                    );
                  })}
                </MobileList>

                {/* ── Tablet and up: the full table ── */}
                <DesktopOnly className="overflow-x-auto -mx-3 sm:-mx-4">
                  <table
                    className="w-full text-xs text-left border-collapse"
                    style={{ minWidth: "1050px" }}
                  >
                    <thead>
                      <tr className="border-b border-border bg-muted/20 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        <th className="py-2.5 px-3">PI No</th>
                        <th className="py-2.5 px-3">Order ID</th>
                        <th className="py-2.5 px-3">Date & Payment Due</th>
                        <th className="py-2.5 px-3">Customer Name</th>
                        <th className="py-2.5 px-3">Phone No.</th>
                        <th className="py-2.5 px-3 text-right">Total Amount</th>
                        <th className="py-2.5 px-3 text-right">Recivied Amount</th>
                        <th className="py-2.5 px-3 text-right font-mono">Due Amount</th>
                        <th className="py-2.5 px-3 text-center">Delivered</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40 text-xs">
                      {filteredSavedInvoices.map((item: any) => {
                        const isConfirmed =
                          item.status === "order_confirmed" ||
                          item.status === "work_order_generated";
                        const isCancelled = item.status === "cancelled";
                        const { grandTotal, paidAmount, remainingBalance } = settleAmounts(
                          item,
                          payments,
                        );
                        const dueInfo = getPaymentDueDateInfo(item, payments);
                        const rawOrder =
                          item.preProformaNo ||
                          (item.orderNo !== item.no ? item.orderNo : undefined);
                        const orderId = formatOrderId(rawOrder);

                        const isDelivered = Boolean(item.delivered);

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
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={
                                    isCancelled
                                      ? "line-through text-rose-600 dark:text-rose-400 font-bold"
                                      : "hover:underline font-bold"
                                  }
                                >
                                  {formatPiNo(item.no)}
                                </span>
                                {isCancelled && (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-rose-500 text-white shadow-2xs">
                                    Cancelled
                                  </span>
                                )}
                              </div>
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
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold inline-block ${dueInfo.badgeClass}`}
                                >
                                  {dueInfo.label}
                                </span>
                              </div>
                            </td>
                            <td className="py-2.5 px-3 font-medium text-foreground">
                              {item.cust?.name || "—"}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-muted-foreground">
                              {item.cust?.phone || "—"}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-foreground">
                              ₹ {nf(grandTotal)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                              ₹ {nf(paidAmount)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold">
                              <span
                                className={
                                  remainingBalance > 0
                                    ? "text-amber-600 dark:text-amber-400"
                                    : "text-emerald-600 dark:text-emerald-400"
                                }
                              >
                                ₹ {nf(remainingBalance)}
                              </span>
                            </td>
                            <td
                              className="py-2.5 px-3 text-center"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {isDelivered ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40 shadow-2xs">
                                  <CheckCircle2 className="h-3 w-3" /> Yes
                                </span>
                              ) : !isCancelled ? (
                                <button
                                  type="button"
                                  onClick={() => setDeliveryConfirmTarget(item)}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-500/15 hover:bg-rose-500/25 text-rose-600 dark:text-rose-400 border border-rose-500/40 shadow-2xs transition-all cursor-pointer"
                                >
                                  <XCircle className="h-3 w-3" /> No
                                </button>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-muted/60 text-muted-foreground border border-border/50">
                                  <XCircle className="h-3 w-3 text-muted-foreground" /> No
                                </span>
                              )}
                            </td>
                            <td
                              className="py-2.5 px-3 text-right"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="flex items-center justify-end gap-1">
                                {!isCancelled && (
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-7 w-7 text-primary border-primary/30 hover:bg-primary/10"
                                    onClick={() => {
                                      loadInvoice(item.id, false);
                                      setShowForm(true);
                                      toast.success(`Loaded Order Confirm ${item.no} for editing`);
                                    }}
                                    title="Edit Order Confirm"
                                  >
                                    <Edit3 className="h-3.5 w-3.5" />
                                  </Button>
                                )}

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

                                {isCancelled ? (
                                  <span className="px-2 py-1 rounded text-[10px] font-extrabold uppercase bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                                    Cancelled
                                  </span>
                                ) : (
                                  <ConfirmDelete
                                    title={`Cancel Order Confirm ${item.no}?`}
                                    description={`Are you sure you want to cancel ${item.no} (${item.cust?.name || "unnamed customer"})? Its status becomes Cancelled: the record stays for the audit trail but stops counting towards revenue and dues.`}
                                    confirmLabel="Cancel Invoice"
                                    onConfirm={() => {
                                      updateInvoiceStatus(item.id, "cancelled");
                                      toast.info(`Invoice ${item.no} set to Cancelled`);
                                    }}
                                  >
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      className="h-7 w-7 text-amber-600 border-amber-500/30 hover:bg-amber-500/10"
                                      title="Cancel Invoice"
                                    >
                                      <Ban className="h-3.5 w-3.5" />
                                    </Button>
                                  </ConfirmDelete>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </DesktopOnly>
              </>
            )}
          </Section>
        </div>
      ) : (
        /* ── ORDER CONFIRM CREATION / EDITING FORM SECTION ───────────── */
        <div id="proforma-form" className="p-3 pb-24 sm:p-4 md:pb-4 w-full">
          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_280px] gap-4 w-full">
            {/* ════ LEFT COLUMN ════ */}
            <div className="space-y-4 min-w-0">
              {/* 1. Order Header */}
              <Section title="Order Confirm Details" accent="bg-emerald-500/5">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <FieldLabel>Order / Invoice No</FieldLabel>
                    <Input
                      className="h-8 text-xs font-mono bg-emerald-500/5"
                      value={inv.orderNo || inv.no || ""}
                      onChange={(e) => updateInvField("orderNo", e.target.value)}
                    />
                  </div>
                  <div>
                    <FieldLabel>Invoice Date</FieldLabel>
                    <Input
                      type="date"
                      className="h-8 text-xs"
                      value={inv.date || ""}
                      onChange={(e) => updateInvField("date", e.target.value)}
                    />
                  </div>
                  <div>
                    <FieldLabel>Sales Person</FieldLabel>
                    <Input
                      className="h-8 text-xs"
                      value={inv.salesPerson || ""}
                      onChange={(e) => updateInvField("salesPerson", e.target.value)}
                      placeholder="Office"
                    />
                  </div>
                  <div>
                    <FieldLabel>P.O. No.</FieldLabel>
                    <Input
                      className="h-8 text-xs"
                      value={inv.poNo || ""}
                      onChange={(e) => updateInvField("poNo", e.target.value)}
                      placeholder="PO-1234"
                    />
                  </div>
                </div>
              </Section>

              {/* 2. Customer Details */}
              <Section
                title="Customer Details"
                headerRight={
                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    <div className="relative">
                      <div
                        className="flex items-center border border-border rounded-md h-7 px-2 gap-1.5 bg-background text-xs cursor-pointer hover:border-primary/50 transition-colors"
                        onClick={() => setCustDropOpen((v) => !v)}
                      >
                        <Search className="h-3 w-3 text-muted-foreground" />
                        <input
                          className="w-28 sm:w-36 bg-transparent outline-none text-xs placeholder:text-muted-foreground"
                          placeholder="Search saved"
                          value={custSearch}
                          onChange={(e) => {
                            setCustSearch(e.target.value);
                            setCustDropOpen(true);
                          }}
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
                    <Input
                      className="h-8 text-xs font-medium"
                      value={inv.cust?.name || ""}
                      onChange={(e) => updateInvField("cust.name", e.target.value)}
                    />
                  </div>
                  <div>
                    <FieldLabel>GSTIN</FieldLabel>
                    <Input
                      className="h-8 text-xs font-mono"
                      value={inv.cust?.gstin || ""}
                      onChange={(e) => updateInvField("cust.gstin", e.target.value)}
                    />
                  </div>
                  <div>
                    <FieldLabel>Phone</FieldLabel>
                    <Input
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel"
                      className="h-8 text-xs font-mono"
                      value={inv.cust?.phone || ""}
                      onChange={(e) =>
                        updateInvField("cust.phone", e.target.value.replace(/\D/g, "").slice(0, 10))
                      }
                      maxLength={10}
                    />
                  </div>
                  <div>
                    <FieldLabel>Email</FieldLabel>
                    <Input
                      className="h-8 text-xs"
                      value={inv.cust?.email || ""}
                      onChange={(e) => updateInvField("cust.email", e.target.value)}
                    />
                  </div>
                  <div>
                    <FieldLabel>Sales Person</FieldLabel>
                    <Input
                      className="h-8 text-xs"
                      value={inv.salesPerson || ""}
                      onChange={(e) => updateInvField("salesPerson", e.target.value)}
                    />
                  </div>
                  <div>
                    <FieldLabel>Project Remark</FieldLabel>
                    <Input
                      className="h-8 text-xs"
                      value={inv.projectRemark || ""}
                      onChange={(e) => updateInvField("projectRemark", e.target.value)}
                    />
                  </div>
                  <div>
                    <FieldLabel>Freight Type</FieldLabel>
                    <Select
                      value={inv.freightType || "To be Billed"}
                      onValueChange={(v) => updateInvField("freightType", v)}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
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
              <Section title="Proforma Invoice Items & Details">
                <SwipeHint />
                <div className="scroll-x -mx-3 sm:-mx-4">
                  <table
                    className="w-full text-[11px] border-collapse"
                    style={{ minWidth: "1000px" }}
                  >
                    <thead>
                      <tr className="border-b border-border bg-muted/20">
                        {[
                          { name: "Sr.", align: "text-center", minW: "min-w-[40px]" },
                          { name: "PI No", align: "text-left", minW: "min-w-[90px]" },
                          { name: "Date", align: "text-left", minW: "min-w-[90px]" },
                          { name: "Product", align: "text-left", minW: "min-w-[140px]" },
                          { name: "Thick", align: "text-center", minW: "min-w-[50px]" },
                          { name: "Qty", align: "text-center", minW: "min-w-[45px]" },
                          { name: "Area", align: "text-right", minW: "min-w-[70px]" },
                          { name: "Amount", align: "text-right", minW: "min-w-[80px]" },
                          { name: "Glass Name", align: "text-left", minW: "min-w-[120px]" },
                          { name: "Weight", align: "text-right", minW: "min-w-[70px]" },
                          { name: "Actual Area", align: "text-right", minW: "min-w-[80px]" },
                        ].map((h, i) => (
                          <th
                            key={i}
                            className={`py-2 px-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap ${h.align} ${h.minW}`}
                          >
                            {h.name}
                          </th>
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
                        const layerIdx = item.layerIdx !== undefined ? item.layerIdx : idx;
                        const layerObj = inv.layers?.[layerIdx] || null;
                        const productName =
                          layerObj?.productName ||
                          layerObj?.glassName ||
                          item.productName ||
                          inv.productName ||
                          "—";
                        const glassName =
                          layerObj?.glassType ||
                          layerObj?.glassName ||
                          item.glassName ||
                          item.glassType ||
                          inv.glass?.desc ||
                          "—";
                        const thickness =
                          layerObj?.thickness ||
                          item.thickness ||
                          item.thk ||
                          inv.glass?.thickness ||
                          "—";
                        const lineWeight = line?.ok
                          ? (line.totalSqm * Number(thickness || 5) * 2.5).toFixed(3)
                          : "—";

                        return (
                          <tr key={item.id || idx} className="hover:bg-muted/10">
                            <td className="py-2 px-2.5 text-center text-muted-foreground font-mono whitespace-nowrap min-w-[40px]">
                              {idx + 1}
                            </td>
                            <td className="py-2 px-2.5 text-xs font-mono text-muted-foreground whitespace-nowrap font-medium min-w-[90px]">
                              {inv.no || "—"}
                            </td>
                            <td className="py-2 px-2.5 text-xs text-muted-foreground whitespace-nowrap min-w-[90px]">
                              {inv.date || "—"}
                            </td>
                            <td className="py-2 px-2.5 text-xs text-foreground whitespace-nowrap font-medium min-w-[140px]">
                              {productName}
                            </td>
                            <td className="py-2 px-2.5 text-xs font-mono text-center whitespace-nowrap min-w-[50px]">
                              {thickness}
                            </td>
                            <td className="py-2 px-2.5 text-xs font-mono text-center whitespace-nowrap min-w-[45px]">
                              {line?.ok ? line.qty : item.qty || "—"}
                            </td>
                            <td className="py-2 px-2.5 text-xs font-mono text-right whitespace-nowrap min-w-[70px]">
                              {line?.ok
                                ? settings.rateUnit === "sqft"
                                  ? line.totalSqft
                                  : line.totalSqm
                                : "—"}
                            </td>
                            <td className="py-2 px-2.5 text-xs font-mono font-semibold text-right whitespace-nowrap min-w-[80px]">
                              {line?.ok ? nf(line.amount) : "—"}
                            </td>
                            <td className="py-2 px-2.5 text-xs text-foreground whitespace-nowrap font-medium min-w-[120px]">
                              {glassName}
                            </td>
                            <td className="py-2 px-2.5 text-xs font-mono text-right whitespace-nowrap min-w-[70px]">
                              {lineWeight}
                            </td>
                            <td className="py-2 px-2.5 text-xs font-mono text-right whitespace-nowrap min-w-[80px]">
                              {line?.ok
                                ? settings.rateUnit === "sqft"
                                  ? line.totalSqft
                                  : line.totalSqm
                                : "—"}
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
                    <Select
                      value={inv.delivery?.terms || "PI Terms"}
                      onValueChange={(v) => updateInvField("delivery.terms", v)}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PI Terms">PI Terms</SelectItem>
                        <SelectItem value="Standard Terms">Standard Terms</SelectItem>
                        <SelectItem value="Custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <FieldLabel>Validity of PI</FieldLabel>
                    <Input
                      className="h-8 text-xs"
                      value={inv.delivery?.validityOfPI || ""}
                      onChange={(e) => updateInvField("delivery.validityOfPI", e.target.value)}
                    />
                  </div>
                  <div>
                    <FieldLabel>Unloading by</FieldLabel>
                    <Input
                      className="h-8 text-xs"
                      value={inv.delivery?.unloadingType || ""}
                      onChange={(e) => updateInvField("delivery.unloadingType", e.target.value)}
                    />
                  </div>
                  <div>
                    <FieldLabel>Packing Type</FieldLabel>
                    <Input
                      className="h-8 text-xs"
                      value={inv.delivery?.packingType || ""}
                      onChange={(e) => updateInvField("delivery.packingType", e.target.value)}
                    />
                  </div>
                  <div>
                    <FieldLabel>Delivery Period</FieldLabel>
                    <Input
                      className="h-8 text-xs"
                      value={inv.delivery?.deliveryPeriod || ""}
                      onChange={(e) => updateInvField("delivery.deliveryPeriod", e.target.value)}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <FieldLabel>Freight Remark</FieldLabel>
                    <Input
                      className="h-8 text-xs"
                      value={inv.delivery?.freightRemark || ""}
                      onChange={(e) => updateInvField("delivery.freightRemark", e.target.value)}
                    />
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
                  <FieldLabel>Actual Area SQM</FieldLabel>
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
                  <FieldLabel>Actual Area SQF</FieldLabel>
                  <div className="h-8 flex items-center px-2 rounded-md border border-border bg-muted/30 text-xs font-mono text-foreground">
                    {totals.sqft ?? "0.000"}
                  </div>
                </div>
              </div>
            </div>

            {/* ════ RIGHT COLUMN: Particular Panel ════ */}
            <div className="space-y-4">
              <div className="bg-card border border-border rounded-lg overflow-hidden xl:sticky xl:top-16">
                <div className="px-3 py-2 border-b border-border bg-red-500/10">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-foreground">
                      Particular
                    </span>
                    <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground text-right">
                      Amount
                    </span>
                  </div>
                </div>
                <div className="px-3 py-2 space-y-0">
                  {/* Basic Amount */}
                  <div className="flex justify-between py-1.5 text-[11px] border-b border-border/30">
                    <span className="text-foreground font-medium bg-blue-500/10 px-2 py-0.5 rounded">
                      Basic Amount
                    </span>
                    <span className="font-mono text-foreground bg-blue-500/20 px-2 py-0.5 rounded">
                      {nf(totals.glassAmount ?? 0)}
                    </span>
                  </div>

                  {/* Admin Charge */}
                  <div className="flex justify-between items-center py-1.5 text-[11px] border-b border-border/30">
                    <span className="text-foreground">Admin Charge</span>
                    <Input
                      type="number"
                      className="h-6 text-[10px] font-mono w-[70px] text-right"
                      value={inv.ch?.adminCharge || ""}
                      onChange={(e) =>
                        updateInvField(
                          "ch.adminCharge",
                          e.target.value === "" ? "" : Number(e.target.value),
                        )
                      }
                    />
                  </div>

                  {/* Freight */}
                  <div className="flex justify-between items-center py-1.5 text-[11px] border-b border-border/30">
                    <span className="text-foreground">Freight</span>
                    <Input
                      type="number"
                      className="h-6 text-[10px] font-mono w-[70px] text-right"
                      value={inv.ch?.freight || ""}
                      onChange={(e) =>
                        updateInvField(
                          "ch.freight",
                          e.target.value === "" ? "" : Number(e.target.value),
                        )
                      }
                    />
                  </div>

                  {/* Packing Charges */}
                  <div className="flex justify-between items-center py-1.5 text-[11px] border-b border-border/30">
                    <span className="text-foreground">Packing Charges</span>
                    <Input
                      type="number"
                      className="h-6 text-[10px] font-mono w-[70px] text-right bg-green-500/15 border-green-500/30"
                      value={inv.ch?.packingCharges || ""}
                      onChange={(e) =>
                        updateInvField(
                          "ch.packingCharges",
                          e.target.value === "" ? "" : Number(e.target.value),
                        )
                      }
                    />
                  </div>

                  {/* Total */}
                  <div className="flex justify-between py-1.5 text-[11px] border-b border-border/30">
                    <span className="text-red-500 font-bold">Total</span>
                    <span className="font-mono font-bold text-foreground bg-green-500/20 px-2 py-0.5 rounded">
                      {nf(totals.subTotal ?? 0)}
                    </span>
                  </div>

                  {/* Insurance */}
                  <div className="flex justify-between items-center py-1.5 text-[11px] border-b border-border/30">
                    <span className="text-foreground">Insurance</span>
                    <span className="font-mono text-foreground">{nf(totals.insurance ?? 0)}</span>
                  </div>

                  {/* Net Value */}
                  <div className="flex justify-between py-1.5 text-[11px] border-b border-border/30">
                    <span className="text-red-500 font-bold">Ass. Value</span>
                    <span className="font-mono font-bold text-foreground bg-green-500/20 px-2 py-0.5 rounded">
                      {nf(totals.assessableValue ?? 0)}
                    </span>
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
                    <span className="font-mono font-bold text-foreground bg-yellow-500/20 px-2 py-0.5 rounded">
                      {nf(totals.grossTotal ?? 0)}
                    </span>
                  </div>

                  {/* TCS Charge */}
                  <div className="flex justify-between items-center py-1.5 text-[11px] border-b border-border/30">
                    <span className="text-foreground">TCS Charge</span>
                    <Input
                      type="number"
                      className="h-6 text-[10px] font-mono w-[70px] text-right"
                      value={inv.ch?.tcsPercent || ""}
                      onChange={(e) =>
                        updateInvField(
                          "ch.tcsPercent",
                          e.target.value === "" ? "" : Number(e.target.value),
                        )
                      }
                      placeholder="%"
                    />
                  </div>

                  {/* Round Off */}
                  <div className="flex justify-between py-1.5 text-[11px] border-b border-border/30">
                    <span className="text-foreground">Round Off</span>
                    <span className="font-mono text-foreground">
                      {totals.roundOff > 0 ? `+${nf(totals.roundOff)}` : nf(totals.roundOff ?? 0)}
                    </span>
                  </div>

                  {/* Grand Total */}
                  <div className="flex justify-between py-2 text-sm mt-1 border-t-2 border-border">
                    <span className="text-red-500 font-bold">Grand Total</span>
                    <span className="font-mono font-bold text-lg text-red-600 bg-red-500/10 px-3 py-0.5 rounded">
                      {nf(totals.grandTotal ?? 0)}
                    </span>
                  </div>

                  <div className="pt-3 mt-2 border-t border-border">
                    {isConfirmingFromBooking ? (
                      <Button
                        size="lg"
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 shadow-md cursor-pointer text-xs"
                        onClick={handleConfirmOrder}
                      >
                        <CheckCircle2 className="h-4 w-4" /> Confirm & Proceed to Payment
                      </Button>
                    ) : (
                      <Button
                        size="lg"
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 shadow-md cursor-pointer text-xs"
                        onClick={() => {
                          if (saveInvoice()) {
                            toast.success(
                              `Order Confirm ${inv.no || inv.orderNo} saved successfully`,
                            );
                            setShowForm(false);
                            navigate({ to: "/order", search: { view: undefined } as any });
                          }
                        }}
                      >
                        <Save className="h-4 w-4" /> Save Order Confirm
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* Phone: the running total and the commit action, always in reach */}
          <MobileActionBar label="Grand total" value={`₹ ${nf(totals.grandTotal ?? 0)}`}>
            {isConfirmingFromBooking ? (
              <Button
                className="h-10 gap-2 bg-emerald-600 px-4 text-xs font-bold text-white hover:bg-emerald-700"
                onClick={handleConfirmOrder}
              >
                <CheckCircle2 className="h-4 w-4" /> Confirm & Pay
              </Button>
            ) : (
              <Button
                className="h-10 gap-2 bg-emerald-600 px-4 text-xs font-bold text-white hover:bg-emerald-700"
                onClick={() => {
                  if (saveInvoice()) {
                    toast.success(`Order Confirm ${inv.no || inv.orderNo} saved successfully`);
                    setShowForm(false);
                    navigate({ to: "/order", search: { view: undefined } as any });
                  }
                }}
              >
                <Save className="h-4 w-4" /> Save Order
              </Button>
            )}
          </MobileActionBar>
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
        initialTab={(searchParams?.tab as any) || "overview"}
        onOpenChange={(open) => {
          setDetailOpen(open);
          if (
            !open &&
            (searchParams?.detailId || (searchParams?.id && searchParams?.view !== "form"))
          ) {
            navigate({ to: "/order", search: { view: undefined } as any, replace: true });
          }
        }}
        onEdit={(item) => {
          loadInvoice(item.id, false);
          setShowForm(true);
          setDetailOpen(false);
        }}
      />

      {/* ── DELIVERY STATUS CONFIRMATION DIALOG ───────────────── */}
      <Dialog
        open={Boolean(deliveryConfirmTarget)}
        onOpenChange={(open) => !open && setDeliveryConfirmTarget(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto w-12 h-12 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2 border border-emerald-500/30">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <DialogTitle className="text-center text-lg font-bold">
              Confirm Order Delivery
            </DialogTitle>
            <DialogDescription className="text-center text-xs text-muted-foreground pt-1">
              Are you sure Proforma Invoice{" "}
              <span className="font-mono font-bold text-foreground">
                #{deliveryConfirmTarget?.no}
              </span>{" "}
              (Customer:{" "}
              <span className="font-semibold text-foreground">
                {deliveryConfirmTarget?.cust?.name || "Customer"}
              </span>
              ) has been <span className="font-bold text-emerald-600">Delivered</span>?
              <br />
              <br />
              <span className="text-rose-600 font-semibold dark:text-rose-400">
                ⚠️ Once confirmed as Delivered, this status cannot be changed or reverted.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex sm:justify-center gap-2 pt-3">
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-4 text-xs font-semibold"
              onClick={() => setDeliveryConfirmTarget(null)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-9 px-5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md gap-1.5"
              onClick={() => {
                if (deliveryConfirmTarget) {
                  markAsDelivered(deliveryConfirmTarget.id);
                  toast.success(`Invoice #${deliveryConfirmTarget.no} marked as Delivered!`);
                  setDeliveryConfirmTarget(null);
                }
              }}
            >
              <CheckCircle2 className="h-4 w-4" /> Yes, Confirm Delivery
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
