import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Plus,
  Trash2,
  Save,
  RefreshCw,
  Copy,
  ChevronDown,
  ChevronUp,
  ClipboardPaste,
  X,
  FileSpreadsheet,
  Send,
  Printer,
  BarChart3,
  Mail,
  MessageSquare,
  Database,
  Globe,
  Search,
  Edit3,
  CheckCircle2,
  Clock,
  ArrowRight,
  ArrowLeft,
  FileText,
} from "lucide-react";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGQ } from "@/lib/store";
import { blankItem, nf, uid } from "@/lib/gq";
import { toast } from "sonner";

export const Route = createFileRoute("/booking")({
  component: BookingPage,
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

/* ─── Particulars Row ────────────────────────────────────────────── */
function PRow({
  label,
  qty,
  rate,
  per,
  amount,
  onRateChange,
  highlight,
}: {
  label: string;
  qty?: number | string;
  rate: number | string;
  per?: string;
  amount?: number | string;
  onRateChange?: (v: string) => void;
  highlight?: boolean;
}) {
  return (
    <div className={`grid grid-cols-[1fr_50px_60px_40px_65px] gap-1 items-center py-[3px] text-[11px] border-b border-border/30 last:border-0 ${highlight ? "bg-emerald-500/5" : ""}`}>
      <span className="text-foreground truncate">{label}</span>
      <span className="text-muted-foreground text-center font-mono">{qty ?? ""}</span>
      {onRateChange ? (
        <Input
          type="number"
          className="h-6 text-[10px] font-mono text-center px-1"
          value={rate ?? ""}
          onChange={(e) => onRateChange(e.target.value)}
        />
      ) : (
        <span className="text-foreground text-center font-mono">{rate}</span>
      )}
      <span className="text-muted-foreground text-center text-[9px]">{per || ""}</span>
      <span className="text-foreground text-right font-mono font-medium">{amount ?? ""}</span>
    </div>
  );
}

/* ─── Bulk Entry Modal ───────────────────────────────────────────── */
function BulkEntryModal({
  open,
  onClose,
  onApply,
  inputUnit,
}: {
  open: boolean;
  onClose: () => void;
  onApply: (items: any[]) => void;
  inputUnit: string;
}) {
  const [text, setText] = useState("");
  if (!open) return null;

  const handleApply = () => {
    const lines = text
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l);
    const items: any[] = [];
    for (const line of lines) {
      // Parse formats: "60.3 x 51.2", "60.3,51.2", "60.3 51.2", "60.3×51.2"
      const parts = line.split(/[x×,\s]+/).filter((p) => p);
      if (parts.length >= 2) {
        const item = blankItem();
        if (inputUnit === "mm") {
          item.l1mm = parts[0];
          item.l2mm = parts[1];
        } else {
          item.l1 = parts[0];
          item.l2 = parts[1];
        }
        if (parts[2]) item.qty = Number(parts[2]) || 1;
        items.push(item);
      }
    }
    if (items.length === 0) {
      toast.error("No valid sizes found. Use format: 60.3 x 51.2");
      return;
    }
    onApply(items);
    setText("");
    onClose();
    toast.success(`Added ${items.length} items`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="text-sm font-semibold text-foreground flex items-center gap-2">
            <ClipboardPaste className="h-4 w-4 text-primary" />
            Bulk Size Entry ({inputUnit.toUpperCase()})
          </span>
          <button onClick={onClose} className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted text-muted-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <p className="text-xs text-muted-foreground">
            Paste sizes, one per line. Format: <code className="bg-muted px-1 py-0.5 rounded text-[10px]">L1 x L2</code> or <code className="bg-muted px-1 py-0.5 rounded text-[10px]">L1, L2</code>
          </p>
          <Textarea
            rows={12}
            className="font-mono text-xs resize-none"
            placeholder={inputUnit === "mm"
              ? "60.3 x 51.2\n60.3 x 52.0\n60.3 x 51.2\n60.3 x 52.2\n60.4 x 51.3"
              : "36 3/8 x 13 3/8\n48 1/16 x 24\n119 5/16 x 48"}
            value={text}
            onChange={(e) => setText(e.target.value)}
            autoFocus
          />
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">
              {text.split("\n").filter((l) => l.trim()).length} lines detected
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onClose}>Cancel</Button>
              <Button size="sm" className="h-8 text-xs gap-1" onClick={handleApply}>
                <Plus className="h-3 w-3" /> Add All Items
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


/* ─── Main Booking Page ──────────────────────────────────────────── */
function BookingPage() {
  const navigate = useNavigate();
  const {
    inv,
    setInv,
    totals,
    settings,
    invoices,
    loadInvoice,
    deleteInvoice,
    saveInvoice,
    newInvoice,
    updateInvoiceStatus,
  } = useGQ();

  const [bulkOpenLayerIdx, setBulkOpenLayerIdx] = useState<number | null>(null);
  const [savedSearch, setSavedSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const inputUnit = inv.inputUnit || "inch";

  const preProformaInvoices = useMemo(
    () => invoices.filter((x: any) => !x.docType || x.docType === "pre_proforma"),
    [invoices]
  );

  const pendingCount = useMemo(
    () => preProformaInvoices.filter((x) => !x.status || x.status === "draft" || x.status === "pi_sent").length,
    [preProformaInvoices]
  );
  const confirmedCount = useMemo(
    () => preProformaInvoices.filter((x) => x.status === "order_confirmed" || x.status === "work_order_generated").length,
    [preProformaInvoices]
  );
  const totalSavedValue = useMemo(
    () => preProformaInvoices.reduce((acc, item) => acc + (Number(item.totals?.grandTotal) || 0), 0),
    [preProformaInvoices]
  );

  const filteredSavedInvoices = useMemo(
    () =>
      preProformaInvoices.filter((item: any) => {
        const query = savedSearch.toLowerCase().trim();
        if (!query) return true;
        return (
          item.no?.toLowerCase().includes(query) ||
          item.cust?.name?.toLowerCase().includes(query) ||
          item.cust?.phone?.toLowerCase().includes(query) ||
          item.cust?.gstin?.toLowerCase().includes(query)
        );
      }),
    [preProformaInvoices, savedSearch]
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

  const layers = useMemo(() => {
    if (!inv.layers || inv.layers.length === 0) {
      return [
        {
          id: "l1",
          layerNo: "Layer - 1",
          productName: inv.productName || "TOUGHENED GLASS",
          thickness: inv.glass?.thickness || 5,
          glassName: "",
          rate: "",
          process: "",
          status: "",
          items: inv.items && inv.items.length > 0 ? inv.items : [blankItem()],
        },
      ];
    }
    return inv.layers.map((l: any, idx: number) => ({
      ...l,
      items: l.items && l.items.length > 0 ? l.items : (idx === 0 && inv.items && inv.items.length > 0 ? inv.items : [blankItem()]),
    }));
  }, [inv.layers, inv.items, inv.productName, inv.glass?.thickness]);

  const allFlatItems = useMemo(() => {
    return layers.flatMap((l: any) => l.items || []);
  }, [layers]);

  const ensureLayersWithItems = (copy: any) => {
    if (!copy.layers || copy.layers.length === 0) {
      copy.layers = [
        {
          id: uid("layer"),
          layerNo: "Layer - 1",
          productName: copy.productName || "TOUGHENED GLASS",
          thickness: copy.glass?.thickness || 5,
          glassName: "",
          rate: "",
          process: "",
          status: "",
          items: copy.items && copy.items.length > 0 ? copy.items : [blankItem()],
        },
      ];
    }
    copy.layers.forEach((l: any, idx: number) => {
      if (!l.items || l.items.length === 0) {
        l.items = idx === 0 && copy.items && copy.items.length > 0 ? copy.items : [blankItem()];
      }
    });
  };

  const updateLayerItem = (layerIdx: number, itemIdx: number, field: string, val: any) => {
    setInv((prev: any) => {
      const copy = JSON.parse(JSON.stringify(prev));
      ensureLayersWithItems(copy);
      if (!copy.layers[layerIdx]) return prev;
      if (!copy.layers[layerIdx].items[itemIdx]) return prev;
      copy.layers[layerIdx].items[itemIdx][field] = val;
      copy.items = copy.layers.flatMap((l: any) => l.items || []);
      return copy;
    });
  };

  const addLayerItemRow = (layerIdx: number) => {
    setInv((prev: any) => {
      const copy = JSON.parse(JSON.stringify(prev));
      ensureLayersWithItems(copy);
      if (!copy.layers[layerIdx]) return prev;
      copy.layers[layerIdx].items.push(blankItem());
      copy.items = copy.layers.flatMap((l: any) => l.items || []);
      return copy;
    });
  };

  const removeLayerItemRow = (layerIdx: number, itemIdx: number) => {
    setInv((prev: any) => {
      const copy = JSON.parse(JSON.stringify(prev));
      ensureLayersWithItems(copy);
      if (!copy.layers[layerIdx]) return prev;
      if (copy.layers[layerIdx].items.length <= 1) {
        toast.error("At least one line item is required for this layer");
        return prev;
      }
      copy.layers[layerIdx].items.splice(itemIdx, 1);
      copy.items = copy.layers.flatMap((l: any) => l.items || []);
      return copy;
    });
  };

  const duplicateLayerItemRow = (layerIdx: number, itemIdx: number) => {
    setInv((prev: any) => {
      const copy = JSON.parse(JSON.stringify(prev));
      ensureLayersWithItems(copy);
      if (!copy.layers[layerIdx]) return prev;
      const dup = { ...copy.layers[layerIdx].items[itemIdx], id: uid("it") };
      copy.layers[layerIdx].items.splice(itemIdx + 1, 0, dup);
      copy.items = copy.layers.flatMap((l: any) => l.items || []);
      return copy;
    });
  };

  const handleBulkAdd = (layerIdx: number, itemsToAdd: any[]) => {
    setInv((prev: any) => {
      const copy = JSON.parse(JSON.stringify(prev));
      ensureLayersWithItems(copy);
      if (!copy.layers[layerIdx]) return prev;
      const currentItems = copy.layers[layerIdx].items;
      if (currentItems.length === 1 && !currentItems[0].l1 && !currentItems[0].l1mm) {
        copy.layers[layerIdx].items = itemsToAdd;
      } else {
        copy.layers[layerIdx].items.push(...itemsToAdd);
      }
      copy.items = copy.layers.flatMap((l: any) => l.items || []);
      return copy;
    });
  };

  const addLayer = () => {
    setInv((prev: any) => {
      const copy = JSON.parse(JSON.stringify(prev));
      ensureLayersWithItems(copy);
      const num = copy.layers.length + 1;
      copy.layers.push({
        id: uid("layer"),
        layerNo: `Layer - ${num}`,
        productName: "TOUGHENED GLASS",
        thickness: 5,
        glassName: "",
        rate: "",
        process: "",
        status: "",
        items: [blankItem()],
      });
      copy.items = copy.layers.flatMap((l: any) => l.items || []);
      return copy;
    });
  };

  const removeLayer = (index: number) => {
    setInv((prev: any) => {
      if (!prev.layers || prev.layers.length <= 1) {
        toast.error("At least one layer is required");
        return prev;
      }
      const copy = JSON.parse(JSON.stringify(prev));
      ensureLayersWithItems(copy);
      copy.layers.splice(index, 1);
      copy.items = copy.layers.flatMap((l: any) => l.items || []);
      return copy;
    });
  };

  const updateLayer = (index: number, field: string, val: any) => {
    setInv((prev: any) => {
      const copy = JSON.parse(JSON.stringify(prev));
      ensureLayersWithItems(copy);
      if (copy.layers[index]) copy.layers[index][field] = val;
      copy.items = copy.layers.flatMap((l: any) => l.items || []);
      return copy;
    });
  };

  const { customers } = useGQ();
  const [custSearch, setCustSearch] = useState("");
  const [custDropOpen, setCustDropOpen] = useState(false);

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
    toast.success(`Loaded customer: ${c.name}`);
  };

  const handleSendPI = () => {
    saveInvoice();
    if (inv.id) {
      updateInvoiceStatus(inv.id, "pi_sent");
    }
    toast.success("Pre Proforma saved & sent to customer for confirmation");
  };

  const handleAcceptAndMove = () => {
    saveInvoice();
    if (inv.id) {
      updateInvoiceStatus(inv.id, "pi_sent");
      toast.success("Pre Proforma generated & sent to customer! Moving to Proforma Invoice.");
      navigate({ to: "/order", search: { view: undefined } });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* ── UNIFIED SECTION TABS ───────────────────────── */}
      <div className="bg-muted/40 border-b border-border px-3 sm:px-6 py-2 flex items-center gap-2 text-xs font-semibold flex-wrap">
        <span className="text-muted-foreground mr-1 text-[11px] font-bold uppercase tracking-wider">Proforma Section:</span>
        <Link
          to="/booking"
          className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground font-bold shadow-sm flex items-center gap-1.5"
        >
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          1. Pre Proforma
        </Link>
        <Link
          to="/order"
          search={{ view: undefined }}
          className="px-3 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors flex items-center gap-1.5"
        >
          2. Proforma Invoice
        </Link>
      </div>

      {/* ── KPI CARDS & HEADER ACTIONS ──────────────────── */}
      <div className="border-b border-border bg-card px-3 sm:px-6 py-4 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-0.5">
              <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
              {" / "}
              {showForm ? (
                <button onClick={() => setShowForm(false)} className="hover:text-foreground transition-colors">
                  Pre Proforma
                </button>
              ) : (
                <span className="text-primary font-semibold">Pre Proforma</span>
              )}
              {showForm && (
                <>
                  {" / "}
                  <span className="text-primary font-semibold">
                    {inv._saved ? `Edit (${inv.no})` : "New Pre Proforma"}
                  </span>
                </>
              )}
            </div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground leading-tight flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              {showForm ? (inv._saved ? "Edit Pre Proforma" : "New Pre Proforma") : "Pre Proforma Management"}
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
                  <Save className="h-3.5 w-3.5" /> Save Pre Proforma
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs gap-1.5 border-emerald-600/50 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 font-semibold"
                  onClick={() => {
                    saveInvoice();
                    if (inv.id) {
                      toast.success(`Pre Proforma ${inv.no} saved. Opening PDF invoice...`);
                      navigate({ to: "/invoice", search: { id: inv.id } });
                    }
                  }}
                >
                  <Printer className="h-3.5 w-3.5" /> Print / PDF
                </Button>
                <Button
                  size="sm"
                  className="h-8 text-xs gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                  onClick={handleAcceptAndMove}
                >
                  <Send className="h-3.5 w-3.5" /> Generate & Send to Customer
                </Button>
              </>
            ) : (
              /* RIGHT BUTTON: New Pre Proforma */
              <Button
                size="sm"
                className="h-9 px-4 text-xs gap-1.5 bg-primary text-primary-foreground font-bold shadow-md hover:bg-primary/90"
                onClick={() => {
                  newInvoice();
                  setInv((prev: any) => ({ ...prev, docType: "pre_proforma" }));
                  setShowForm(true);
                }}
              >
                <Plus className="h-4 w-4" />
                New Pre Proforma
              </Button>
            )}
          </div>
        </div>

        {/* ── KPI METRICS CARDS (Shown only on management/list view) ─────────────────── */}
        {!showForm && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-background border border-border/80 rounded-lg p-3 shadow-xs">
              <div className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Total Saved</div>
              <div className="text-xl font-bold text-foreground mt-0.5">{invoices.length}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">Pre Proforma records</div>
            </div>
            <div className="bg-background border border-amber-500/30 rounded-lg p-3 shadow-xs border-l-4 border-l-amber-500">
              <div className="text-[10px] font-bold uppercase text-amber-600 dark:text-amber-400 flex items-center gap-1 tracking-wider">
                <Clock className="h-3 w-3" /> Pending Order
              </div>
              <div className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-0.5">{pendingCount}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">Awaiting workflow</div>
            </div>
            <div className="bg-background border border-emerald-500/30 rounded-lg p-3 shadow-xs border-l-4 border-l-emerald-500">
              <div className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400 flex items-center gap-1 tracking-wider">
                <CheckCircle2 className="h-3 w-3" /> Order Confirmed
              </div>
              <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{confirmedCount}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">Sent to workflow</div>
            </div>
            <div className="bg-background border border-border/80 rounded-lg p-3 shadow-xs">
              <div className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Total Value</div>
              <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 font-mono">₹ {nf(totalSavedValue)}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">Saved quotes value</div>
            </div>
          </div>
        )}
      </div>

      {!showForm ? (
        /* ── ALL SAVED PRE PROFORMAS TABLE (TOP DEFAULT VIEW) ────────── */
        <div className="p-3 sm:p-4 bg-muted/20 border-b border-border">
          <Section
            title="All Saved Pre Proformas"
            headerRight={
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <Search className="h-3.5 w-3.5 absolute left-2.5 top-2 text-muted-foreground" />
                  <Input
                    className="h-7 text-xs pl-8 w-44 sm:w-60 bg-background"
                    placeholder="Search saved pre proforma..."
                    value={savedSearch}
                    onChange={(e) => setSavedSearch(e.target.value)}
                  />
                </div>
                <span className="text-xs text-muted-foreground font-medium">
                  <span className="font-bold text-foreground">{filteredSavedInvoices.length}</span> saved records
                </span>
              </div>
            }
          >
            {filteredSavedInvoices.length === 0 ? (
              <div className="text-center py-12 text-xs text-muted-foreground space-y-2">
                <p>{savedSearch ? "No matching Pre Proformas found." : "No saved Pre Proformas found."}</p>
                <Button
                  size="sm"
                  className="h-8 text-xs gap-1.5 bg-primary text-primary-foreground font-semibold"
                  onClick={() => {
                    newInvoice();
                    setShowForm(true);
                  }}
                >
                  <Plus className="h-3.5 w-3.5" /> New Pre Proforma
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto -mx-3 sm:-mx-4">
                <table className="w-full text-xs text-left border-collapse" style={{ minWidth: "820px" }}>
                  <thead>
                    <tr className="border-b border-border bg-muted/20 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      <th className="py-2.5 px-3">Pre Proforma No</th>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Customer / M/S Name</th>
                      <th className="py-2.5 px-3">Phone / GSTIN</th>
                      <th className="py-2.5 px-3 text-center">Items</th>
                      <th className="py-2.5 px-3 text-right">Amount</th>
                      <th className="py-2.5 px-3 text-center">Order Status</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40 text-xs">
                    {filteredSavedInvoices.map((item: any) => {
                      const isConfirmed = item.status === "order_confirmed" || item.status === "work_order_generated";

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
                              {/* GO TO PROFORMA INVOICE BUTTON */}
                              <Button
                                size="sm"
                                className="h-7 text-xs px-2.5 gap-1 bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-xs"
                                onClick={() => {
                                  loadInvoice(item.id, false);
                                  toast.success(`Loaded Pre Proforma ${item.no}. Navigating to Proforma Invoice...`);
                                  navigate({ to: "/order", search: { view: "form" } });
                                }}
                                title="Go to Proforma Invoice"
                              >
                                Go to Proforma Invoice <ArrowRight className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs px-2 gap-1 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/5"
                                onClick={() => {
                                  loadInvoice(item.id, false);
                                  toast.success(`Generating PDF for Pre Proforma ${item.no}...`);
                                  navigate({ to: "/invoice", search: { id: item.id } });
                                }}
                                title="Print / Generate PDF"
                              >
                                <Printer className="h-3 w-3" /> PDF
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs px-2 gap-1 text-primary border-primary/30 hover:bg-primary/5"
                                onClick={() => {
                                  loadInvoice(item.id, false);
                                  setShowForm(true);
                                  toast.success(`Loaded Pre Proforma ${item.no} for editing`);
                                }}
                              >
                                <Edit3 className="h-3 w-3" /> Edit
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
        /* ── PRE PROFORMA CREATION / EDITING FORM SECTION ─────────────── */
        <div id="pre-proforma-form" className="p-3 sm:p-4 w-full">
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-4 w-full">

          {/* ════ LEFT COLUMN ════ */}
          <div className="space-y-4 min-w-0">
            {/* 1. Customer & Pre Proforma Details */}
            <Section
              title="Customer & Pre Proforma Details"
              headerRight={
                <div className="flex items-center gap-1.5 flex-wrap justify-end">
                  <div className="relative">
                    <div
                      className="flex items-center border border-border rounded-md h-7 px-2 gap-1.5 bg-background text-xs cursor-pointer hover:border-primary/50 transition-colors"
                      onClick={() => setCustDropOpen((v) => !v)}
                    >
                      <Search className="h-3 w-3 text-muted-foreground" />
                      <input
                        className="w-28 sm:w-40 bg-transparent outline-none text-xs placeholder:text-muted-foreground"
                        placeholder="Search saved customer"
                        value={custSearch}
                        onChange={(e) => {
                          setCustSearch(e.target.value);
                          setCustDropOpen(true);
                        }}
                        onFocus={() => setCustDropOpen(true)}
                      />
                    </div>
                    {custDropOpen && filteredCustomers.length > 0 && (
                      <div className="absolute right-0 top-8 z-50 bg-popover border border-border rounded-md shadow-lg w-64 max-h-48 overflow-y-auto">
                        {filteredCustomers.map((c: any) => (
                          <div
                            key={c.id || c.name}
                            className="px-3 py-2 text-xs hover:bg-muted cursor-pointer text-foreground border-b border-border/30 last:border-0"
                            onMouseDown={() => selectCustomer(c)}
                          >
                            <div className="font-semibold">{c.name}</div>
                            {c.phone && <div className="text-[10px] text-muted-foreground">{c.phone}</div>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              }
            >
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                <div>
                  <FieldLabel>Pre Proforma No</FieldLabel>
                  <Input className="h-8 text-xs font-mono" value={inv.no || ""} onChange={(e) => updateInvField("no", e.target.value)} />
                </div>
                <div>
                  <FieldLabel>Date</FieldLabel>
                  <Input type="date" className="h-8 text-xs" value={inv.date || ""} onChange={(e) => updateInvField("date", e.target.value)} />
                </div>
                <div>
                  <FieldLabel>P.O. No.</FieldLabel>
                  <Input className="h-8 text-xs" value={inv.poNo || ""} onChange={(e) => updateInvField("poNo", e.target.value)} placeholder="PO-1234" />
                </div>
                <div>
                  <FieldLabel>Sales Person</FieldLabel>
                  <Input className="h-8 text-xs" value={inv.salesPerson || ""} onChange={(e) => updateInvField("salesPerson", e.target.value)} placeholder="Office" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2 border-t border-border/40">
                <div className="sm:col-span-2">
                  <FieldLabel>Customer / M/S. Name</FieldLabel>
                  <Input className="h-8 text-xs font-medium" value={inv.cust?.name || ""} onChange={(e) => updateInvField("cust.name", e.target.value)} placeholder="Hindustan Float Glass Pvt Ltd" />
                </div>
                <div>
                  <FieldLabel>GSTIN</FieldLabel>
                  <Input className="h-8 text-xs font-mono" value={inv.cust?.gstin || ""} onChange={(e) => updateInvField("cust.gstin", e.target.value)} placeholder="08AACCH4208C1Z3" />
                </div>
                <div>
                  <FieldLabel>Phone</FieldLabel>
                  <Input className="h-8 text-xs font-mono" value={inv.cust?.phone || ""} onChange={(e) => updateInvField("cust.phone", e.target.value)} placeholder="9799998611" />
                </div>
                <div>
                  <FieldLabel>Email</FieldLabel>
                  <Input className="h-8 text-xs" value={inv.cust?.email || ""} onChange={(e) => updateInvField("cust.email", e.target.value)} placeholder="hindustan@live.in" />
                </div>
                <div>
                  <FieldLabel>Project Remark</FieldLabel>
                  <Input className="h-8 text-xs" value={inv.projectRemark || ""} onChange={(e) => updateInvField("projectRemark", e.target.value)} placeholder="Jhotwara Project" />
                </div>
                <div className="sm:col-span-2">
                  <FieldLabel>Billing Address</FieldLabel>
                  <Input className="h-8 text-xs" value={inv.cust?.addr || ""} onChange={(e) => updateInvField("cust.addr", e.target.value)} placeholder="S 5, Shri Govind Complex, Jhotwara, Jaipur" />
                </div>
                <div className="sm:col-span-2">
                  <FieldLabel>Dispatch Address</FieldLabel>
                  <Input className="h-8 text-xs" value={inv.cust?.ship || ""} onChange={(e) => updateInvField("cust.ship", e.target.value)} placeholder="Site / Shipping Address" />
                </div>
              </div>
            </Section>

            {/* Unified Product & Layers Section */}
            <Section
              title="Product & Layers"
              headerRight={
                <div className="flex items-center gap-2 flex-wrap justify-end text-xs">
                  {/* Size Entry Type */}
                  <div className="flex items-center gap-1 bg-background border border-border/80 rounded px-1.5 py-0.5 shadow-xs">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase whitespace-nowrap">Size:</span>
                    <Select value={inputUnit} onValueChange={(v) => updateInvField("inputUnit", v)}>
                      <SelectTrigger className="h-6 text-[11px] border-0 shadow-none focus:ring-0 px-1 py-0 w-[60px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mm">MM</SelectItem>
                        <SelectItem value="inch">Inch</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Extra Area Formula */}
                  <div className="flex items-center gap-1 bg-background border border-border/80 rounded px-1.5 py-0.5 shadow-xs">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase whitespace-nowrap">Extra Area:</span>
                    <Select value={inv.ch?.extraAreaFormula || "none"} onValueChange={(v) => updateInvField("ch.extraAreaFormula", v)}>
                      <SelectTrigger className="h-6 text-[11px] border-0 shadow-none focus:ring-0 px-1 py-0 w-[80px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="+25mm">+ 25 MM</SelectItem>
                        <SelectItem value="+50mm">+ 50 MM</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Rate Find Formula */}
                  <div className="flex items-center gap-1 bg-background border border-border/80 rounded px-1.5 py-0.5 shadow-xs">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase whitespace-nowrap">Rate Formula:</span>
                    <Select value={settings.rateUnit} onValueChange={(v) => updateInvField("ch.rateUnit", v)}>
                      <SelectTrigger className="h-6 text-[11px] border-0 shadow-none focus:ring-0 px-1 py-0 w-[105px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sqm">Sq. Metr Net</SelectItem>
                        <SelectItem value="sqft">Sq. Feet Net</SelectItem>
                        <SelectItem value="piece">Per Piece</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Add Layer Button */}
                  <Button size="sm" className="h-7 text-[11px] px-2.5 gap-1 bg-primary text-primary-foreground font-semibold" onClick={addLayer}>
                    <Plus className="h-3 w-3" /> Add Layer
                  </Button>
                </div>
              }
            >
              <div className="overflow-x-auto -mx-3 sm:-mx-4">
                <table className="w-full text-[11px] border-collapse" style={{ minWidth: "600px" }}>
                  <thead>
                    <tr className="border-b border-border bg-green-500/5">
                      {["Layer No", "Product Name", "Thk", "Glass Name", "Rate", "Process", "Status", ""].map((h, i) => (
                        <th key={i} className="py-2 px-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground whitespace-nowrap text-left">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {layers.map((layer: any, idx: number) => (
                      <tr key={layer.id || idx} className="hover:bg-muted/10">
                        <td className="py-1.5 px-2">
                          <Input className="h-7 text-xs w-[80px] bg-green-500/10" value={layer.layerNo || ""} onChange={(e) => updateLayer(idx, "layerNo", e.target.value)} />
                        </td>
                        <td className="py-1.5 px-1">
                          <Select value={layer.productName || "TOUGHENED GLASS"} onValueChange={(v) => updateLayer(idx, "productName", v)}>
                            <SelectTrigger className="h-7 text-xs min-w-[140px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="TOUGHENED GLASS">TOUGHENED GLASS</SelectItem>
                              <SelectItem value="LAMINATED GLASS">LAMINATED GLASS</SelectItem>
                              <SelectItem value="DGU">DGU</SelectItem>
                              <SelectItem value="HEAT STRENGTHENED">HEAT STRENGTHENED</SelectItem>
                              <SelectItem value="CLEAR FLOAT">CLEAR FLOAT</SelectItem>
                              <SelectItem value="TINTED FLOAT">TINTED FLOAT</SelectItem>
                              <SelectItem value="REFLECTIVE">REFLECTIVE</SelectItem>
                              <SelectItem value="LOW-E">LOW-E</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="py-1.5 px-1">
                          <Input type="number" className="h-7 text-xs font-mono w-[50px] text-center" value={layer.thickness || ""} onChange={(e) => updateLayer(idx, "thickness", Number(e.target.value))} />
                        </td>
                        <td className="py-1.5 px-1">
                          <Input className="h-7 text-xs min-w-[90px]" value={layer.glassName || ""} onChange={(e) => updateLayer(idx, "glassName", e.target.value)} placeholder="Clear T.G." />
                        </td>
                        <td className="py-1.5 px-1">
                          <Input type="number" className="h-7 text-xs font-mono w-[65px]" value={layer.rate || ""} onChange={(e) => updateLayer(idx, "rate", e.target.value)} />
                        </td>
                        <td className="py-1.5 px-1">
                          <Input className="h-7 text-xs min-w-[70px]" value={layer.process || ""} onChange={(e) => updateLayer(idx, "process", e.target.value)} />
                        </td>
                        <td className="py-1.5 px-1">
                          <Input className="h-7 text-xs w-[60px]" value={layer.status || ""} onChange={(e) => updateLayer(idx, "status", e.target.value)} />
                        </td>
                        <td className="py-1.5 px-1 w-8">
                          <button
                            title="Remove"
                            className="h-6 w-6 flex items-center justify-center rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                            onClick={() => removeLayer(idx)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>

            {/* 5. Items Grid per Layer */}
            {layers.map((layer: any, layerIdx: number) => {
              const layerName = layer.layerNo || `Layer - ${layerIdx + 1}`;
              const prodInfo = `${layer.productName || "TOUGHENED GLASS"}${layer.thickness ? ` (${layer.thickness}mm)` : ""}`;
              const layerItems = layer.items || [blankItem()];

              return (
                <Section
                  key={layer.id || layerIdx}
                  title={`Items — ${layerName} (${prodInfo})`}
                  headerRight={
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 text-[11px] px-2 gap-1"
                        onClick={() => setBulkOpenLayerIdx(layerIdx)}
                      >
                        <ClipboardPaste className="h-3 w-3" /> Bulk Entry
                      </Button>
                      <Button
                        size="sm"
                        className="h-6 text-[11px] px-2 gap-1"
                        onClick={() => addLayerItemRow(layerIdx)}
                      >
                        <Plus className="h-3 w-3" /> Add Row
                      </Button>
                    </div>
                  }
                >
                  <div className="overflow-x-auto -mx-3 sm:-mx-4">
                    <table className="w-full text-[11px] border-collapse" style={{ minWidth: inputUnit === "mm" ? "980px" : "1140px" }}>
                      <thead>
                        <tr className="border-b-2 border-green-600/30 bg-green-500/8">
                          {inputUnit === "mm"
                            ? ["Sr No", "L1 MM", "L2 MM", "Qty", "Area", "Charge Area", "Total Area", "Rate", "Amount", "Hole", "Cut Out", "Remark", ""].map((h, i) => (
                                <th key={i} className="py-2 px-2 text-[10px] font-semibold uppercase tracking-widest text-green-800 dark:text-green-400 whitespace-nowrap text-left">{h}</th>
                              ))
                            : ["Sr No", "L1 In", "L2 In", "L1 MM", "L2 MM", "Qty", "Area", "Charge Area", "Total Area", "Rate", "Amount", "Hole", "Cut Out", "Remark", ""].map((h, i) => (
                                <th key={i} className="py-2 px-2 text-[10px] font-semibold uppercase tracking-widest text-green-800 dark:text-green-400 whitespace-nowrap text-left">{h}</th>
                              ))
                          }
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40">
                        {layerItems.map((item: any, itemIdx: number) => {
                          let flatOffset = 0;
                          for (let k = 0; k < layerIdx; k++) {
                            flatOffset += (layers[k].items || []).length;
                          }
                          const flatIdx = flatOffset + itemIdx;
                          const line = totals.lines?.[flatIdx];
                          const areaText = line?.ok ? (settings.rateUnit === "sqft" ? String(line.totalSqft) : String(line.totalSqm)) : "—";
                          const chargeAreaText = line?.ok ? (settings.rateUnit === "sqft" ? String(line.chargeAreaSqft) : String(line.chargeAreaSqm)) : "—";
                          const totalAreaText = line?.ok ? (settings.rateUnit === "sqft" ? String(line.chargeAreaSqft || line.totalSqft) : String(line.chargeAreaSqm || line.totalSqm)) : "—";

                          return (
                            <tr key={item.id || itemIdx} className={`hover:bg-muted/10 ${!line?.ok && (item.l1 || item.l2 || item.l1mm || item.l2mm) ? "bg-red-500/5" : ""}`}>
                              {/* Sr No */}
                              <td className="py-1.5 px-2 text-center text-muted-foreground font-mono w-10">
                                <span className="text-xs font-semibold">{itemIdx + 1}</span>
                              </td>

                              {/* Inch columns (only if inputUnit is inch) */}
                              {inputUnit !== "mm" && (
                                <>
                                  <td className="py-1.5 px-1">
                                    <Input
                                      className="h-8 text-xs font-mono text-center w-[80px]"
                                      value={item.l1 || ""}
                                      onChange={(e) => updateLayerItem(layerIdx, itemIdx, "l1", e.target.value)}
                                      placeholder="36 3/8"
                                    />
                                  </td>
                                  <td className="py-1.5 px-1">
                                    <Input
                                      className="h-8 text-xs font-mono text-center w-[80px]"
                                      value={item.l2 || ""}
                                      onChange={(e) => updateLayerItem(layerIdx, itemIdx, "l2", e.target.value)}
                                      placeholder="13 3/8"
                                    />
                                  </td>
                                </>
                              )}

                              {/* MM columns */}
                              {inputUnit === "mm" ? (
                                <>
                                  <td className="py-1.5 px-1">
                                    <Input
                                      type="number"
                                      className="h-8 text-xs font-mono text-center w-[75px]"
                                      value={item.l1mm ?? ""}
                                      onChange={(e) => updateLayerItem(layerIdx, itemIdx, "l1mm", e.target.value)}
                                      placeholder="60.3"
                                      step="0.1"
                                    />
                                  </td>
                                  <td className="py-1.5 px-1">
                                    <Input
                                      type="number"
                                      className="h-8 text-xs font-mono text-center w-[75px]"
                                      value={item.l2mm ?? ""}
                                      onChange={(e) => updateLayerItem(layerIdx, itemIdx, "l2mm", e.target.value)}
                                      placeholder="51.2"
                                      step="0.1"
                                    />
                                  </td>
                                </>
                              ) : (
                                <>
                                  <td className="py-1.5 px-2 font-mono text-[11px] text-muted-foreground whitespace-nowrap w-[60px]">
                                    {line?.ok ? line.lMM : "—"}
                                  </td>
                                  <td className="py-1.5 px-2 font-mono text-[11px] text-muted-foreground whitespace-nowrap w-[60px]">
                                    {line?.ok ? line.wMM : "—"}
                                  </td>
                                </>
                              )}

                              {/* Qty */}
                              <td className="py-1.5 px-1">
                                <Input
                                  type="number"
                                  className="h-8 text-xs font-mono text-center w-[44px]"
                                  value={item.qty || ""}
                                  min={1}
                                  onChange={(e) => updateLayerItem(layerIdx, itemIdx, "qty", e.target.value === "" ? "" : Number(e.target.value))}
                                />
                              </td>

                              {/* Area */}
                              <td className="py-1.5 px-2 font-mono text-[11px] text-muted-foreground w-[65px]">{areaText}</td>

                              {/* Charge Area */}
                              <td className="py-1.5 px-2 font-mono text-[11px] text-muted-foreground w-[65px]">{chargeAreaText}</td>

                              {/* Total Area */}
                              <td className="py-1.5 px-2 font-mono text-[11px] text-foreground font-medium w-[65px]">{totalAreaText}</td>

                              {/* Rate */}
                              <td className="py-1.5 px-1">
                                <Input
                                  type="number"
                                  className="h-8 text-xs font-mono text-center w-[62px]"
                                  value={item.rate ?? ""}
                                  onChange={(e) => updateLayerItem(layerIdx, itemIdx, "rate", e.target.value === "" ? "" : Number(e.target.value))}
                                  placeholder={String(layer.rate || inv.glass?.defaultRate || "")}
                                />
                              </td>

                              {/* Amount */}
                              <td className="py-1.5 px-2 font-mono font-semibold text-xs text-right whitespace-nowrap w-[80px]">
                                {line?.ok ? nf(line.amount) : <span className="text-muted-foreground/40">—</span>}
                              </td>

                              {/* Hole */}
                              <td className="py-1.5 px-1">
                                <Input
                                  type="number"
                                  className="h-8 text-xs font-mono text-center w-[44px]"
                                  value={item.holes || ""}
                                  min={0}
                                  onChange={(e) => updateLayerItem(layerIdx, itemIdx, "holes", e.target.value === "" ? "" : Number(e.target.value))}
                                />
                              </td>

                              {/* Cut Out */}
                              <td className="py-1.5 px-1">
                                <Input
                                  type="number"
                                  className="h-8 text-xs font-mono text-center w-[44px]"
                                  value={item.cutouts || ""}
                                  min={0}
                                  onChange={(e) => updateLayerItem(layerIdx, itemIdx, "cutouts", e.target.value === "" ? "" : Number(e.target.value))}
                                />
                              </td>

                              {/* Remark */}
                              <td className="py-1.5 px-1">
                                <Input
                                  className="h-8 text-xs w-[90px]"
                                  value={item.remark || ""}
                                  onChange={(e) => updateLayerItem(layerIdx, itemIdx, "remark", e.target.value)}
                                  placeholder="Remark"
                                />
                              </td>

                              {/* Actions */}
                              <td className="py-1.5 px-1 w-[52px]">
                                <div className="flex items-center gap-0.5">
                                  <button title="Duplicate" className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" onClick={() => duplicateLayerItemRow(layerIdx, itemIdx)}>
                                    <Copy className="h-3 w-3" />
                                  </button>
                                  <button title="Remove" className="h-7 w-7 flex items-center justify-center rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors" onClick={() => removeLayerItemRow(layerIdx, itemIdx)}>
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </Section>
              );
            })}

            {/* 6. Bottom Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <FieldLabel>City</FieldLabel>
                <Input className="h-8 text-xs" value={inv.cust?.city || ""} onChange={(e) => updateInvField("cust.city", e.target.value)} placeholder="Jaipur" />
              </div>
              <div>
                <FieldLabel>Note</FieldLabel>
                <Input className="h-8 text-xs" value={inv.glass?.batchNo || ""} onChange={(e) => updateInvField("glass.batchNo", e.target.value)} />
              </div>
              <div>
                <FieldLabel>Process</FieldLabel>
                <Input className="h-8 text-xs" value={inv.process || ""} onChange={(e) => updateInvField("process", e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div>
                <FieldLabel>Total Qty</FieldLabel>
                <div className="h-8 flex items-center px-2 rounded-md border border-border bg-muted/30 text-xs font-mono text-foreground font-semibold">
                  {totals.qty || 0}
                </div>
              </div>
              <div>
                <FieldLabel>Act. Area SQM</FieldLabel>
                <div className="h-8 flex items-center px-2 rounded-md border border-border bg-muted/30 text-xs font-mono text-foreground">
                  {totals.sqm ?? "0.000"}
                </div>
              </div>
              <div>
                <FieldLabel>Total Area SQM</FieldLabel>
                <div className="h-8 flex items-center px-2 rounded-md border border-border bg-muted/30 text-xs font-mono text-foreground font-semibold">
                  {totals.chargeSqm || totals.sqm || "0.000"}
                </div>
              </div>
              <div>
                <FieldLabel>Act. Area SQF</FieldLabel>
                <div className="h-8 flex items-center px-2 rounded-md border border-border bg-muted/30 text-xs font-mono text-foreground">
                  {totals.sqft ?? "0.000"}
                </div>
              </div>
              <div>
                <FieldLabel>Total Area SQF</FieldLabel>
                <div className="h-8 flex items-center px-2 rounded-md border border-border bg-muted/30 text-xs font-mono text-foreground font-semibold">
                  {totals.chargeSqft || totals.sqft || "0.000"}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-2 gap-3">
              <div>
                <FieldLabel>Weight</FieldLabel>
                <div className="h-8 flex items-center px-2 rounded-md border border-border bg-muted/30 text-xs font-mono text-foreground">
                  {totals.weightKg || "0.000"}
                </div>
              </div>
              <div>
                <FieldLabel>Glass Name</FieldLabel>
                <div className="h-8 flex items-center px-2 rounded-md border border-border bg-green-500/10 text-xs text-foreground font-semibold">
                  {inv.glass?.desc || `${inv.glass?.thickness || ""}mm ${inv.productName || "TOUGHENED GLASS"}`}
                </div>
              </div>
            </div>

            {/* Quick Actions Row */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-[11px] gap-1.5 border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/5 font-semibold"
                onClick={() => {
                  saveInvoice();
                  if (inv.id) {
                    toast.success(`Opening PDF view for ${inv.no}...`);
                    navigate({ to: "/invoice", search: { id: inv.id } });
                  }
                }}
              >
                <Printer className="h-3 w-3" /> Print / PDF Invoice
              </Button>
              <Button variant="outline" size="sm" className="h-8 text-[11px] gap-1.5 border-sky-500/30 text-sky-600 hover:bg-sky-500/5">
                <Mail className="h-3 w-3" /> Email
              </Button>
              <Button variant="outline" size="sm" className="h-8 text-[11px] gap-1.5 border-sky-500/30 text-sky-600 hover:bg-sky-500/5">
                <MessageSquare className="h-3 w-3" /> Send SMS
              </Button>
              <Button variant="outline" size="sm" className="h-8 text-[11px] gap-1.5 border-sky-500/30 text-sky-600 hover:bg-sky-500/5">
                <FileSpreadsheet className="h-3 w-3" /> Export to Excel
              </Button>
              <Button variant="outline" size="sm" className="h-8 text-[11px] gap-1.5 border-sky-500/30 text-sky-600 hover:bg-sky-500/5">
                <Database className="h-3 w-3" /> Backup
              </Button>
            </div>
          </div>

          {/* ════ RIGHT COLUMN: Totals Panel ════ */}
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-lg overflow-hidden sticky top-14 shadow-sm">
              <div className="px-3.5 py-2.5 border-b border-border bg-emerald-500/5 flex items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                  <span className="w-1.5 h-3.5 rounded-full bg-emerald-500 inline-block" />
                  Totals
                </span>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                  • {settings.rateUnit === "sqft" ? "SQ.FT" : settings.rateUnit === "piece" ? "PIECE" : "SQ.MTR"} {settings.areaRounding === "round" ? "ROUND" : "EXACT"}
                </span>
              </div>

              <div className="p-3 sm:p-4 text-xs space-y-2 font-sans">
                <div className="flex justify-between items-baseline py-1 border-b border-border/30 last:border-0">
                  <span className="text-muted-foreground">Pieces</span>
                  <span className="font-mono font-semibold text-foreground">{totals.qty || 0}</span>
                </div>
                <div className="flex justify-between items-baseline py-1 border-b border-border/30 last:border-0">
                  <span className="text-muted-foreground">Area (Sq.Mtr)</span>
                  <span className="font-mono font-semibold text-foreground">{totals.sqm ?? "0.000"}</span>
                </div>
                <div className="flex justify-between items-baseline py-1 border-b border-border/30 last:border-0">
                  <span className="text-muted-foreground">Sq.Ft/Sq.Mtr</span>
                  <span className="font-mono font-semibold text-foreground">
                    {totals.sqft ?? "0.000"} / {totals.sqm ?? "0.000"}
                  </span>
                </div>

                <div className="flex justify-between items-baseline py-1 border-b border-border/30 last:border-0">
                  <span className="text-muted-foreground">Glass amount</span>
                  <span className="font-mono font-medium text-foreground">₹ {nf(totals.glassTotal ?? 0)}</span>
                </div>
                <div className="flex justify-between items-baseline py-1 border-b border-border/30 last:border-0">
                  <span className="text-muted-foreground">Basic amount</span>
                  <span className="font-mono font-medium text-foreground">₹ {nf(totals.basicTotal ?? totals.subTotal ?? 0)}</span>
                </div>
                <div className="flex justify-between items-baseline py-1 border-b border-border/30 last:border-0">
                  <span className="text-muted-foreground">Admin charge</span>
                  <span className="font-mono font-medium text-foreground">₹ {nf(totals.adminCharge ?? 0)}</span>
                </div>
                <div className="flex justify-between items-baseline py-1 border-b border-border/30 last:border-0 font-medium">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-mono text-foreground">₹ {nf(totals.taxableTotal ?? 0)}</span>
                </div>
                <div className="flex justify-between items-baseline py-1 border-b border-border/30 last:border-0">
                  <span className="text-muted-foreground">Insurance {inv.insurancePct ?? 2}%</span>
                  <span className="font-mono text-foreground">₹ {nf(totals.insuranceAmt ?? 0)}</span>
                </div>
                <div className="flex justify-between items-baseline py-1 border-b border-border/30 last:border-0 font-semibold">
                  <span className="text-foreground">Assessable value</span>
                  <span className="font-mono text-foreground">₹ {nf(totals.assessableVal ?? 0)}</span>
                </div>

                {inv.gstType === "igst" ? (
                  <div className="flex justify-between items-baseline py-1 border-b border-border/30 last:border-0">
                    <span className="text-muted-foreground">I-GST {inv.taxPct ?? 18}%</span>
                    <span className="font-mono text-foreground">₹ {nf(totals.taxAmt ?? 0)}</span>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-baseline py-1 border-b border-border/30 last:border-0">
                      <span className="text-muted-foreground">C-GST {((inv.taxPct ?? 18) / 2)}%</span>
                      <span className="font-mono text-foreground">₹ {nf(totals.cgstAmt ?? 0)}</span>
                    </div>
                    <div className="flex justify-between items-baseline py-1 border-b border-border/30 last:border-0">
                      <span className="text-muted-foreground">S-GST {((inv.taxPct ?? 18) / 2)}%</span>
                      <span className="font-mono text-foreground">₹ {nf(totals.sgstAmt ?? 0)}</span>
                    </div>
                  </>
                )}

                <div className="flex justify-between items-baseline py-1 border-b border-border/30 last:border-0">
                  <span className="text-muted-foreground">Gross total</span>
                  <span className="font-mono font-medium text-foreground">₹ {nf(totals.grossTotal ?? 0)}</span>
                </div>

                <div className="flex justify-between items-center py-2 px-2.5 bg-emerald-500/10 dark:bg-emerald-500/5 rounded-md border border-emerald-500/20 mt-3">
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">Grand total</span>
                  <span className="font-mono font-bold text-lg text-emerald-600 dark:text-emerald-400">₹ {nf(totals.grandTotal ?? 0)}</span>
                </div>

                <div className="pt-2 text-[11px] text-muted-foreground leading-normal border-t border-border/30 mt-3 font-medium">
                  <span className="font-semibold text-foreground">Amount in words:</span> {totals.amountInWords}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Bulk Entry Modal */}
      <BulkEntryModal
        open={bulkOpenLayerIdx !== null}
        onClose={() => setBulkOpenLayerIdx(null)}
        onApply={(items) => {
          if (bulkOpenLayerIdx !== null) {
            handleBulkAdd(bulkOpenLayerIdx, items);
          }
        }}
        inputUnit={inputUnit}
      />
    </div>
  );
}
