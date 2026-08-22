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
import { nf } from "@/lib/gq";
import { toast } from "sonner";

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

/* ─── Searchable Pre Proforma Dropdown ────────────────────────────── */
function PreProformaSelector({
  availableBookings,
  selectedNo,
  onSelect,
  placeholder = "Select Pre Proforma Invoice...",
  className = "",
}: {
  availableBookings: any[];
  selectedNo?: string;
  onSelect: (bookingId: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return availableBookings;
    return availableBookings.filter((b) => {
      const no = String(b.no || "").toLowerCase();
      const cust = String(b.cust?.name || "").toLowerCase();
      const po = String(b.poNo || "").toLowerCase();
      const phone = String(b.cust?.phone || "").toLowerCase();
      return no.includes(q) || cust.includes(q) || po.includes(q) || phone.includes(q);
    });
  }, [availableBookings, search]);

  const selectedBooking = useMemo(
    () => availableBookings.find((b) => b.no === selectedNo || b.id === selectedNo),
    [availableBookings, selectedNo]
  );

  return (
    <div className={`relative ${className}`}>
      <div
        className="flex items-center justify-between border border-emerald-500/50 rounded-md h-8 px-2.5 bg-background text-xs cursor-pointer hover:border-emerald-600 focus:outline-none transition-colors shadow-xs"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="truncate font-mono font-medium text-foreground flex items-center gap-1.5 min-w-0">
          <FileText className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
          <span className="truncate">
            {selectedBooking
              ? `${selectedBooking.no} — ${selectedBooking.cust?.name || "No Name"}`
              : (selectedNo || placeholder)}
          </span>
        </span>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0 ml-1" />
      </div>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-9 z-50 bg-popover border border-border rounded-md shadow-2xl w-72 sm:w-96 max-h-80 flex flex-col overflow-hidden animate-in fade-in-50 zoom-in-95">
            {/* Search Input Box */}
            <div className="p-2 border-b border-border bg-muted/40 sticky top-0 z-10">
              <div className="relative flex items-center">
                <Search className="h-3.5 w-3.5 absolute left-2.5 text-muted-foreground" />
                <input
                  autoFocus
                  className="w-full bg-background border border-border rounded px-8 py-1.5 text-xs outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 placeholder:text-muted-foreground"
                  placeholder={`Search ${availableBookings.length} Pre Proformas (PI No, Customer, PO)...`}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button
                    className="absolute right-2 text-xs text-muted-foreground hover:text-foreground font-bold"
                    onClick={() => setSearch("")}
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* List of Pre Proforma Records */}
            <div className="overflow-y-auto divide-y divide-border/30 max-h-64">
              {filtered.length === 0 ? (
                <div className="p-4 text-center text-xs text-muted-foreground">
                  No matching Pre Proforma records found
                </div>
              ) : (
                filtered.map((b) => {
                  const isSel = b.no === selectedNo || b.id === selectedNo;
                  return (
                    <div
                      key={b.id}
                      className={`p-2.5 text-xs hover:bg-emerald-500/10 cursor-pointer transition-colors ${
                        isSel ? "bg-emerald-500/15 font-semibold" : ""
                      }`}
                      onClick={() => {
                        onSelect(b.id);
                        setOpen(false);
                        setSearch("");
                      }}
                    >
                      <div className="flex items-center justify-between font-mono">
                        <span className="font-bold text-emerald-700 dark:text-emerald-400">{b.no}</span>
                        <span className="text-[10px] text-muted-foreground">{b.date}</span>
                      </div>
                      <div className="text-foreground truncate font-medium mt-0.5">
                        {b.cust?.name || "Unnamed Customer"}
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-1">
                        <span>{b.items?.length || 0} items {b.poNo ? `• PO: ${b.poNo}` : ""}</span>
                        <span className="font-mono text-emerald-600 font-semibold">₹ {nf(b.totals?.grandTotal || 0)}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ─── Main Order Page ────────────────────────────────────────────── */
function OrderPage() {
  const navigate = useNavigate();
  const searchParams = useSearch({ strict: false }) as { view?: string };
  const {
    inv,
    setInv,
    totals,
    settings,
    invoices,
    customers,
    saveInvoice,
    saveCustomer,
    newInvoice,
    loadInvoice,
    confirmOrder,
    updateInvoiceStatus,
    deleteInvoice,
  } = useGQ();

  const [custSearch, setCustSearch] = useState("");
  const [custDropOpen, setCustDropOpen] = useState(false);
  const [selectedBookings, setSelectedBookings] = useState<string[]>([]);
  const [savedSearch, setSavedSearch] = useState("");
  const [showForm, setShowForm] = useState(searchParams?.view === "form");

  useEffect(() => {
    if (searchParams?.view === "form") {
      setShowForm(true);
    } else if (searchParams?.view === "list") {
      setShowForm(false);
    }
  }, [searchParams?.view]);

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
          item.cust?.name?.toLowerCase().includes(query) ||
          item.cust?.phone?.toLowerCase().includes(query) ||
          item.cust?.gstin?.toLowerCase().includes(query)
        );
      }),
    [proformaInvoices, savedSearch]
  );

  /* Get Pre Proformas available for loading into Proforma Invoice */
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
    setInv((prev: any) => ({ ...prev, cust: { ...c } }));
    setCustSearch("");
    setCustDropOpen(false);
    toast.success(`Loaded ${c.name}`);
  };

  /* select a pre proforma booking to load into proforma invoice */
  const handleSelectBooking = (bookingId: string) => {
    const booking = invoices.find((x: any) => x.id === bookingId);
    if (!booking) return;
    const copy = JSON.parse(JSON.stringify(booking));
    copy.id = "pi-" + Date.now().toString(36);
    copy.docType = "proforma";
    copy.preProformaNo = booking.no;
    copy.orderNo = booking.no ? (booking.no.startsWith("PI-") ? booking.no : "PI-" + booking.no) : "PI-" + Date.now().toString().slice(-4);
    copy.no = copy.orderNo;
    copy.date = new Date().toISOString().slice(0, 10);
    copy.status = "draft";
    copy._saved = false;
    if (!copy.delivery) copy.delivery = {};
    copy.delivery.paymentType = copy.delivery.paymentType || "Credit";
    setInv(copy);
    setShowForm(true);
    toast.success(`✨ Auto-filled data from Pre Proforma ${booking.no} into Proforma Invoice`);
  };

  const handleConfirmOrder = () => {
    if (!inv.id) {
      toast.error("Save the Proforma Invoice first");
      return;
    }
    if (inv.status === "work_order_generated") {
      toast.warning("This Proforma Invoice has already been sent to Work Order workflow and is locked from editing.");
      return;
    }
    saveInvoice();
    confirmOrder(inv.id);
    toast.success("Proforma Invoice generated & confirmed! Moved to Work Order & Stickers.");
    navigate({ to: "/work-order" });
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
          1. Pre Proforma
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
                <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={newInvoice}>
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Start Fresh</span>
                </Button>
                <Button
                  size="sm"
                  className="h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                  onClick={saveInvoice}
                >
                  <Save className="h-3.5 w-3.5" /> Save Invoice
                </Button>
                <Button
                  size="sm"
                  className="h-8 text-xs gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold"
                  onClick={handleConfirmOrder}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" /> Confirm & Send to Workflow
                </Button>
              </>
            ) : (
              /* RIGHT BUTTONS: Select Pre Proforma & New Invoice */
              <div className="flex items-center gap-2 flex-wrap">
                <PreProformaSelector
                  availableBookings={availableBookings}
                  onSelect={handleSelectBooking}
                  placeholder="⚡ Auto-Fill from Pre Proforma..."
                  className="w-64"
                />
                <Button
                  size="sm"
                  className="h-8 px-3 text-xs gap-1.5 bg-primary text-primary-foreground font-bold shadow-md hover:bg-primary/90"
                  onClick={() => {
                    newInvoice();
                    const newNo = "PI-" + Date.now().toString().slice(-4);
                    setInv((prev: any) => ({
                      ...prev,
                      docType: "proforma",
                      no: newNo,
                      orderNo: newNo,
                      delivery: { ...(prev.delivery || {}), paymentType: "Credit" },
                    }));
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
              <div className="text-xl font-bold text-foreground mt-0.5">{invoices.length}</div>
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
            {filteredSavedInvoices.length === 0 ? (
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
                <table className="w-full text-xs text-left border-collapse" style={{ minWidth: "850px" }}>
                  <thead>
                    <tr className="border-b border-border bg-muted/20 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      <th className="py-2.5 px-3">Invoice / PI No</th>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Customer / M/S Name</th>
                      <th className="py-2.5 px-3">Phone / GSTIN</th>
                      <th className="py-2.5 px-3 text-center">Items</th>
                      <th className="py-2.5 px-3 text-right">Grand Total</th>
                      <th className="py-2.5 px-3 text-center">Payment Type</th>
                      <th className="py-2.5 px-3 text-center">Order Status</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40 text-xs">
                    {filteredSavedInvoices.map((item: any) => {
                      const isConfirmed = item.status === "order_confirmed" || item.status === "work_order_generated";
                      const payType = item.delivery?.paymentType || item.delivery?.paymentTerm || "Credit";

                      return (
                        <tr key={item.id} className="hover:bg-muted/15 transition-colors">
                          <td className="py-2.5 px-3 font-mono font-semibold text-foreground">{item.no}</td>
                          <td className="py-2.5 px-3 text-muted-foreground">{item.date}</td>
                          <td className="py-2.5 px-3 font-medium text-foreground">{item.cust?.name || "—"}</td>
                          <td className="py-2.5 px-3 font-mono text-muted-foreground">
                            {item.cust?.phone || item.cust?.gstin || "—"}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono">{item.items?.length || 0}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-semibold text-emerald-600">
                            ₹ {nf(item.totals?.grandTotal || 0)}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 uppercase tracking-wider ${
                              payType === "Paid"
                                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                                : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                            }`}>
                              {payType}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 uppercase tracking-wider ${
                              isConfirmed
                                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                                : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                            }`}>
                              {isConfirmed ? (
                                <>
                                  <CheckCircle2 className="h-3 w-3" /> Order Confirmed
                                </>
                              ) : (
                                <>
                                  <Clock className="h-3 w-3" /> Pending Confirmation
                                </>
                              )}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* SEND TO WORKFLOW / CONFIRM ORDER BUTTON ON RIGHT */}
                              <Button
                                size="sm"
                                className={`h-7 text-xs px-2.5 gap-1 font-medium shadow-xs ${
                                  isConfirmed
                                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                    : "bg-amber-600 hover:bg-amber-700 text-white"
                                }`}
                                onClick={() => {
                                  confirmOrder(item.id);
                                  toast.success(`Order ${item.no} confirmed & sent to workflow! Navigating to Work Order...`);
                                  navigate({ to: "/work-order" });
                                }}
                                title="Send to Workflow"
                              >
                                Send to Workflow <ArrowRight className="h-3 w-3" />
                              </Button>

                              {!isConfirmed && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-xs px-2 gap-1 text-primary border-primary/30 hover:bg-primary/5"
                                  onClick={() => {
                                    loadInvoice(item.id, false);
                                    setShowForm(true);
                                    toast.success(`Loaded Proforma Invoice ${item.no} for editing`);
                                  }}
                                >
                                  <Edit3 className="h-3 w-3" /> Edit
                                </Button>
                              )}

                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs px-2 gap-1 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/5"
                                onClick={() => {
                                  loadInvoice(item.id, false);
                                  navigate({ to: "/invoice", search: { id: item.id } });
                                }}
                              >
                                <Printer className="h-3 w-3" /> Print
                              </Button>

                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-red-500"
                                onClick={() => deleteInvoice(item.id)}
                                title="Delete"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
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
                  <FieldLabel>Select Pre Proforma (Auto-Fill)</FieldLabel>
                  <PreProformaSelector
                    availableBookings={availableBookings}
                    selectedNo={inv.preProformaNo || inv.no}
                    onSelect={handleSelectBooking}
                    placeholder="Select Pre Proforma..."
                  />
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
                  <Input className="h-8 text-xs font-mono" value={inv.cust?.phone || ""} onChange={(e) => updateInvField("cust.phone", e.target.value)} />
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
                  <Input className="h-8 text-xs" value={inv.cust?.addr || ""} onChange={(e) => updateInvField("cust.addr", e.target.value)} />
                </div>
                <div className="sm:col-span-2">
                  <FieldLabel>Dispatch Address</FieldLabel>
                  <Input className="h-8 text-xs" value={inv.cust?.ship || ""} onChange={(e) => updateInvField("cust.ship", e.target.value)} />
                </div>
              </div>

              {/* Action buttons row */}
              <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-border/40">
                <Button variant="outline" size="sm" className="h-8 text-[11px] gap-1.5">
                  <CalendarDays className="h-3 w-3" /> Change Delivery
                </Button>
                <Button variant="outline" size="sm" className="h-8 text-[11px] gap-1.5">
                  <FileText className="h-3 w-3" /> Document
                </Button>
                <Button variant="outline" size="sm" className="h-8 text-[11px] gap-1.5 text-red-600 border-red-500/30 hover:bg-red-500/5">
                  <XCircle className="h-3 w-3" /> Order Cancel
                </Button>
                <Button variant="outline" size="sm" className="h-8 text-[11px] gap-1.5">
                  <Barcode className="h-3 w-3" /> Bar Code
                </Button>
                <Button variant="outline" size="sm" className="h-8 text-[11px] gap-1.5">
                  <Unlock className="h-3 w-3" /> UnLock Me
                </Button>
              </div>
            </Section>

            {/* 3. Select Pre Proforma / Items Grid */}
            <Section
              title="Pre Proforma Items & Details"
              headerRight={
                <PreProformaSelector
                  availableBookings={availableBookings}
                  selectedNo={inv.preProformaNo || inv.no}
                  onSelect={handleSelectBooking}
                  placeholder="Load Pre Proforma…"
                  className="w-56 sm:w-64"
                />
              }
            >
              <div className="overflow-x-auto -mx-3 sm:-mx-4">
                <table className="w-full text-[11px] border-collapse" style={{ minWidth: "850px" }}>
                  <thead>
                    <tr className="border-b border-border bg-muted/20">
                      {["Sr.", "Pre Proforma No", "Date", "Product", "Thick", "Qty", "Area", "Amount", "Glass Name", "Weight", "Job Type", "Act Area"].map((h, i) => (
                        <th key={i} className="py-2 px-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground whitespace-nowrap text-left">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {inv.items.map((item: any, idx: number) => {
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
                  <FieldLabel>Payment Type (Credit / Paid)</FieldLabel>
                  <Select value={inv.delivery?.paymentType || inv.delivery?.paymentTerm || "Credit"} onValueChange={(v) => { updateInvField("delivery.paymentType", v); updateInvField("delivery.paymentTerm", v); }}>
                    <SelectTrigger className="h-8 text-xs font-bold"><SelectValue placeholder="Select Payment Type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Credit" className="font-semibold text-amber-600 dark:text-amber-400">Credit</SelectItem>
                      <SelectItem value="Paid" className="font-semibold text-emerald-600 dark:text-emerald-400">Paid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <FieldLabel>Project Remark</FieldLabel>
                  <Input className="h-8 text-xs" value={inv.projectRemark || ""} onChange={(e) => updateInvField("projectRemark", e.target.value)} />
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
                <div>
                  <FieldLabel>Freight Remark</FieldLabel>
                  <Input className="h-8 text-xs" value={inv.delivery?.freightRemark || ""} onChange={(e) => updateInvField("delivery.freightRemark", e.target.value)} />
                </div>
              </div>
            </Section>

            {/* 5. Summary Fields */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
              <div>
                <FieldLabel>PI Advance</FieldLabel>
                <Input type="number" className="h-8 text-xs font-mono" value={inv.delivery?.piAdvance || ""} onChange={(e) => updateInvField("delivery.piAdvance", e.target.value)} />
              </div>
            </div>

            {/* 6. Action Buttons */}
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5 border-sky-500/30 text-sky-600 hover:bg-sky-500/5">
                <FileText className="h-3.5 w-3.5" /> Edit Trail
              </Button>
              <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5 border-sky-500/30 text-sky-600 hover:bg-sky-500/5">
                <MessageSquare className="h-3.5 w-3.5" /> SMS
              </Button>
              <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5 border-sky-500/30 text-sky-600 hover:bg-sky-500/5">
                <RefreshCw className="h-3.5 w-3.5" /> Update Sr. No
              </Button>
              <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5 border-sky-500/30 text-sky-600 hover:bg-sky-500/5">
                <BarChart3 className="h-3.5 w-3.5" /> Status
              </Button>
              <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5 border-sky-500/30 text-sky-600 hover:bg-sky-500/5">
                Name Change
              </Button>
              <div className="ml-auto flex gap-2">
                <Button
                  size="sm"
                  className="h-9 text-xs gap-1.5 bg-green-600 hover:bg-green-700 text-white font-bold"
                  onClick={handleConfirmOrder}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" /> Confirm Order
                </Button>
                <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5">
                  <FileSpreadsheet className="h-3.5 w-3.5" /> Export to Excel
                </Button>
              </div>
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
    </div>
  );
}
