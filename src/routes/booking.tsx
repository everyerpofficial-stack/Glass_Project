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
  Users,
  UserCheck,
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

const BASE_GLASS_PRODUCTS = [
  "04 mm Clear Glass",
  "05 mm Clear Glass",
  "06 mm Clear - T.G.",
  "08 mm Clear - T.G.",
  "10 mm Clear - T.G.",
  "12 mm Clear - T.G.",
  "15 mm Clear - T.G.",
  "19 mm Clear - T.G.",
  "05 mm Toughened Glass",
  "06 mm Toughened Glass",
  "08 mm Toughened Glass",
  "10 mm Toughened Glass",
  "12 mm Toughened Glass",
  "15 mm Toughened Glass",
  "19 mm Toughened Glass",
  "05 mm Frosted Glass",
  "06 mm Frosted - T.G.",
  "08 mm Frosted - T.G.",
  "10 mm Frosted - T.G.",
  "12 mm Frosted - T.G.",
  "06 mm Tinted - T.G.",
  "08 mm Tinted - T.G.",
  "10 mm Tinted - T.G.",
  "12 mm Tinted - T.G.",
  "06 mm Reflective Glass",
  "08 mm Reflective - T.G.",
  "10 mm Reflective - T.G.",
  "12 mm Reflective - T.G.",
  "06 mm Laminated Glass",
  "08 mm Laminated Glass",
  "10 mm Laminated Glass",
  "12 mm Laminated Glass",
  "Toughened Glass",
  "Clear Glass",
  "Frosted Glass",
  "Tinted Glass",
  "Reflective Glass",
  "Laminated Glass",
  "Mirror Glass",
];

function formatProductNameForUnit(name: string, targetUnit: string): string {
  if (!name) return name;
  if (targetUnit === "inch") {
    return name.replace(/\b(\d+)\s*mm\b/gi, "$1 Inch");
  } else {
    return name.replace(/\b(\d+)\s*inch\b/gi, "$1 mm");
  }
}

function extractThicknessFromProductName(name: string): number | null {
  if (!name) return null;
  const match = name.match(/^(\d+)\s*(?:mm|inch)/i);
  if (match && match[1]) {
    return parseInt(match[1], 10);
  }
  return null;
}
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
  const isFreqOn = inputUnit !== "mm" && Boolean(inv.frequencyEnabled);

  const handleInputUnitChange = (newUnit: string) => {
    setInv((prev: any) => {
      const copy = JSON.parse(JSON.stringify(prev));
      copy.inputUnit = newUnit;
      if (newUnit === "mm") {
        copy.frequencyEnabled = false;
      }
      if (copy.layers && copy.layers.length > 0) {
        copy.layers.forEach((l: any) => {
          if (l.productName) {
            l.productName = formatProductNameForUnit(l.productName, newUnit);
          }
          if (l.glassName) {
            l.glassName = formatProductNameForUnit(l.glassName, newUnit);
          }
        });
      }
      return copy;
    });
  };

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

  const sanitizeItemNo = (val: any, fallbackIdx: number) => {
    if (!val) return `Item ${fallbackIdx + 1}`;
    const str = String(val).trim();
    if (/^Layer\s*-?\s*/i.test(str)) {
      return str.replace(/^Layer\s*-?\s*/i, "Item ");
    }
    if (/^\d+$/.test(str)) {
      return `Item ${str}`;
    }
    return str;
  };

  const layers = useMemo(() => {
    if (!inv.layers || inv.layers.length === 0) {
      return [
        {
          id: "l1",
          layerNo: "Item 1",
          productName: inv.productName || "",
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
      layerNo: sanitizeItemNo(l.layerNo, idx),
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
          layerNo: "Item 1",
          productName: copy.productName || "",
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
      l.layerNo = sanitizeItemNo(l.layerNo, idx);
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
        layerNo: `Item ${num}`,
        productName: "",
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
                {/* Secondary Old Customer Selector */}
                <div className="sm:col-span-4 bg-muted/40 p-2.5 rounded-lg border border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs mb-1">
                  <div className="flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-primary shrink-0" />
                    <div>
                      <span className="text-xs font-bold text-foreground">Select Old / Existing Customer</span>
                      <p className="text-[10px] text-muted-foreground">Pick a saved customer from database to autofill customer details</p>
                    </div>
                  </div>
                  <div className="w-full sm:w-72">
                    <Select
                      value={inv.cust?.name || ""}
                      onValueChange={(val) => {
                        const found = customers.find((c: any) => c.name === val);
                        if (found) selectCustomer(found);
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs bg-background">
                        <SelectValue placeholder="-- Select Old Customer --" />
                      </SelectTrigger>
                      <SelectContent>
                        {customers.map((c: any) => (
                          <SelectItem key={c.id || c.name} value={c.name}>
                            <span className="font-semibold">{c.name}</span> {c.phone ? `(${c.phone})` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

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
                    <Select value={inputUnit} onValueChange={(v) => handleInputUnitChange(v)}>
                      <SelectTrigger className="h-6 text-[11px] border-0 shadow-none focus:ring-0 px-1 py-0 w-[60px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mm">MM</SelectItem>
                        <SelectItem value="inch">Inch</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Frequency Toggle */}
                  <div
                    className={`flex items-center gap-1 bg-background border border-border/80 rounded px-1.5 py-0.5 shadow-xs transition-opacity ${
                      inputUnit === "mm" ? "opacity-50 pointer-events-none" : ""
                    }`}
                    title={inputUnit === "mm" ? "Frequency is available for Inch mode only" : "Toggle Frequency column"}
                  >
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase whitespace-nowrap">Frequency:</span>
                    <Select
                      disabled={inputUnit === "mm"}
                      value={isFreqOn ? "on" : "off"}
                      onValueChange={(v) => updateInvField("frequencyEnabled", v === "on")}
                    >
                      <SelectTrigger className="h-6 text-[11px] border-0 shadow-none focus:ring-0 px-1 py-0 w-[55px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="off">Off</SelectItem>
                        <SelectItem value="on">On</SelectItem>
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
                    {inv.ch?.extraAreaFormula === "custom" && (
                      <Input
                        type="number"
                        placeholder="MM"
                        className="h-6 w-14 text-xs font-mono px-1 py-0 text-center"
                        value={inv.ch?.extraAreaCustomMM || ""}
                        onChange={(e) => updateInvField("ch.extraAreaCustomMM", e.target.value === "" ? "" : Number(e.target.value))}
                      />
                    )}
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

                  {/* Add Item Button */}
                  <Button size="sm" className="h-7 text-[11px] px-2.5 gap-1 bg-primary text-primary-foreground font-semibold" onClick={addLayer}>
                    <Plus className="h-3 w-3" /> Add Item
                  </Button>
                </div>
              }
            >
              {(() => {
                const extraAreaFormula = inv.ch?.extraAreaFormula || "none";
                const extraAreaLabel =
                  extraAreaFormula === "+25mm"
                    ? "+25 MM"
                    : extraAreaFormula === "+50mm"
                    ? "+50 MM"
                    : extraAreaFormula === "custom"
                    ? inv.ch?.extraAreaCustomMM
                      ? `+${inv.ch.extraAreaCustomMM} MM`
                      : "+Custom"
                    : null;

                return (
                  <div className="space-y-6">
                    {layers.map((layer: any, layerIdx: number) => {
                  const layerName = layer.layerNo || `Item ${layerIdx + 1}`;
                  const prodInfo = layer.productName
                    ? `${layer.productName}${layer.thickness ? ` (${layer.thickness}mm)` : ""}`
                    : (layer.thickness ? `Glass (${layer.thickness}mm)` : "");
                  const layerItems = layer.items || [blankItem()];

                  const formattedProducts = BASE_GLASS_PRODUCTS.map((baseName) =>
                    formatProductNameForUnit(baseName, inputUnit)
                  );
                  const curVal = layer.productName || layer.glassName || "";
                  const isPredefined = formattedProducts.includes(curVal);
                  const isCustomMode = layer.isCustomProduct || (curVal !== "" && !isPredefined);

                  return (
                    <div key={layer.id || layerIdx} className="space-y-3 p-3 rounded-lg border border-border/60 bg-card/40">
                      {/* Product Header Row for this layer */}
                      <div className="rounded-md border border-border/80 overflow-hidden bg-card shadow-xs">
                        <div className="grid grid-cols-[100px_1fr_75px_95px_36px] gap-2 items-center px-3 py-2 bg-green-500/10 border-b border-border/60 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                          <div className="text-center">ITEM</div>
                          <div>PRODUCT NAME</div>
                          <div className="text-center">THK</div>
                          <div className="text-center">RATE</div>
                          <div></div>
                        </div>
                        <div className="grid grid-cols-[100px_1fr_75px_95px_36px] gap-2 items-center px-3 py-2">
                          <div>
                            <Input
                              className="h-7 text-xs w-full bg-green-500/10 text-center font-semibold"
                              value={layer.layerNo !== undefined && layer.layerNo !== "" ? layer.layerNo : `Item ${layerIdx + 1}`}
                              onChange={(e) => updateLayer(layerIdx, "layerNo", e.target.value)}
                            />
                          </div>
                          <div>
                            {isCustomMode ? (
                              <div className="flex items-center gap-1">
                                <Input
                                  autoFocus
                                  className="h-7 text-xs w-full bg-background"
                                  value={layer.productName ?? layer.glassName ?? ""}
                                  placeholder="Enter custom product name..."
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    updateLayer(layerIdx, "productName", val);
                                    updateLayer(layerIdx, "glassName", val);
                                  }}
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-muted-foreground hover:text-foreground shrink-0"
                                  title="Select from dropdown list"
                                  onClick={() => {
                                    updateLayer(layerIdx, "isCustomProduct", false);
                                  }}
                                >
                                  <ChevronDown className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            ) : (
                              <Select
                                value={layer.productName || layer.glassName || ""}
                                onValueChange={(val) => {
                                  if (val === "__custom__") {
                                    updateLayer(layerIdx, "isCustomProduct", true);
                                    updateLayer(layerIdx, "productName", "");
                                    updateLayer(layerIdx, "glassName", "");
                                  } else {
                                    updateLayer(layerIdx, "productName", val);
                                    updateLayer(layerIdx, "glassName", val);
                                    const thk = extractThicknessFromProductName(val);
                                    if (thk !== null) {
                                      updateLayer(layerIdx, "thickness", thk);
                                    }
                                  }
                                }}
                              >
                                <SelectTrigger className="h-7 text-xs w-full bg-background border-border">
                                  <SelectValue placeholder="Select Product / Glass Name" />
                                </SelectTrigger>
                                <SelectContent className="max-h-64">
                                  {BASE_GLASS_PRODUCTS.map((baseName, pIdx) => {
                                    const formattedName = formatProductNameForUnit(baseName, inputUnit);
                                    return (
                                      <SelectItem key={pIdx} value={formattedName}>
                                        {formattedName}
                                      </SelectItem>
                                    );
                                  })}
                                  <SelectItem value="__custom__" className="font-semibold text-primary">
                                    + Type Custom Product Name...
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                          </div>
                          <div>
                            <Input
                              type="number"
                              className="h-7 text-xs font-mono w-full text-center"
                              value={layer.thickness || ""}
                              onChange={(e) => updateLayer(layerIdx, "thickness", Number(e.target.value))}
                            />
                          </div>
                          <div>
                            <Input
                              type="number"
                              className="h-7 text-xs font-mono w-full text-center"
                              value={layer.rate || ""}
                              onChange={(e) => updateLayer(layerIdx, "rate", e.target.value)}
                            />
                          </div>
                          <div className="flex justify-center">
                            <button
                              title="Remove"
                              className="h-7 w-7 flex items-center justify-center rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                              onClick={() => removeLayer(layerIdx)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Items Grid per Layer - Directly Below this layer header */}
                      <Section
                        title={`ITEMS — ${layerName.toUpperCase()} (${prodInfo.toUpperCase()})`}
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
                        <div className="overflow-x-auto -mx-3 sm:-mx-4 border rounded-md border-emerald-600/20">
                          <table className="w-full text-[11px] border-collapse" style={{ minWidth: inputUnit === "mm" ? "1200px" : isFreqOn ? "1380px" : "1320px" }}>
                            <thead className="bg-emerald-500/10 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-300">
                              <tr className="border-b border-emerald-600/30">
                                <th rowSpan={2} className="py-2 px-2 text-[10px] font-bold uppercase tracking-wider text-center border-r border-emerald-600/20 align-middle">
                                  SR NO
                                </th>

                                <th colSpan={inputUnit === "mm" ? 2 : (isFreqOn ? 5 : 4)} className="py-1.5 px-2 text-[10px] font-bold uppercase tracking-wider text-center border-r border-b border-emerald-600/20">
                                  ACTUAL SIZE (ENTER)
                                </th>

                                <th rowSpan={2} className="py-2 px-2 text-[10px] font-bold uppercase tracking-wider text-center border-r border-emerald-600/20 align-middle">
                                  PCS
                                </th>

                                <th rowSpan={2} className="py-2 px-2 text-[10px] font-bold uppercase tracking-wider text-center border-r border-emerald-600/20 align-middle">
                                  <div>AREA</div>
                                  <div className="text-[9px] font-normal lowercase tracking-normal">(sq mtr.)</div>
                                </th>

                                <th rowSpan={2} className="py-2 px-2 text-[10px] font-bold uppercase tracking-wider text-center border-r border-emerald-600/20 align-middle">
                                  HOLE
                                </th>

                                <th rowSpan={2} className="py-2 px-2 text-[10px] font-bold uppercase tracking-wider text-center border-r border-emerald-600/20 align-middle">
                                  CUT OUT
                                </th>

                                <th rowSpan={2} className="py-2 px-2 text-[10px] font-bold uppercase tracking-wider text-center border-r border-emerald-600/20 align-middle">
                                  <div>BIG</div>
                                  <div>HOLE</div>
                                </th>

                                <th rowSpan={2} className="py-2 px-2 text-[10px] font-bold uppercase tracking-wider text-center border-r border-emerald-600/20 align-middle">
                                  <div>BIG</div>
                                  <div>CUT OUT</div>
                                </th>

                                <th rowSpan={2} className="py-2 px-2 text-[10px] font-bold uppercase tracking-wider text-center border-r border-emerald-600/20 align-middle">
                                  CSK
                                </th>

                                <th colSpan={4} className="py-1.5 px-2 text-[10px] font-bold uppercase tracking-wider text-center border-r border-b border-emerald-600/20">
                                  CHARGEABLE SIZE (MM)
                                </th>

                                <th rowSpan={2} className="py-2 px-2 text-[10px] font-bold uppercase tracking-wider text-center border-r border-emerald-600/20 align-middle">
                                  RATE
                                </th>

                                <th rowSpan={2} className="py-2 px-2 text-[10px] font-bold uppercase tracking-wider text-right border-r border-emerald-600/20 align-middle">
                                  AMOUNT
                                </th>

                                <th rowSpan={2} className="py-2 px-2 text-[10px] font-bold uppercase tracking-wider text-left border-r border-emerald-600/20 align-middle">
                                  REMARK
                                </th>

                                <th rowSpan={2} className="py-2 px-1 text-[10px] font-bold uppercase tracking-wider text-center align-middle">
                                  
                                </th>
                              </tr>

                              <tr className="border-b-2 border-emerald-600/40">
                                {/* Under ACTUAL SIZE (ENTER) */}
                                {inputUnit === "mm" ? (
                                  <>
                                    <th className="py-1.5 px-2 text-[9px] font-bold uppercase tracking-wider text-center border-r border-emerald-600/20">
                                      <div>HEIGHT</div>
                                      <div className="text-[8px] font-normal text-emerald-800/80 dark:text-emerald-400">(MM)</div>
                                    </th>
                                    <th className="py-1.5 px-2 text-[9px] font-bold uppercase tracking-wider text-center border-r border-emerald-600/20">
                                      <div>WIDTH</div>
                                      <div className="text-[8px] font-normal text-emerald-800/80 dark:text-emerald-400">(MM)</div>
                                    </th>
                                  </>
                                ) : (
                                  <>
                                    {isFreqOn && (
                                      <th className="py-1.5 px-1 text-[9px] font-bold uppercase tracking-wider text-center border-r border-emerald-600/20">
                                        FREQ
                                      </th>
                                    )}
                                    <th className="py-1.5 px-2 text-[9px] font-bold uppercase tracking-wider text-center border-r border-emerald-600/20">
                                      <div>HEIGHT</div>
                                      <div className="text-[8px] font-normal text-emerald-800/80 dark:text-emerald-400">(IN)</div>
                                    </th>
                                    <th className="py-1.5 px-2 text-[9px] font-bold uppercase tracking-wider text-center border-r border-emerald-600/20">
                                      <div>WIDTH</div>
                                      <div className="text-[8px] font-normal text-emerald-800/80 dark:text-emerald-400">(IN)</div>
                                    </th>
                                    <th className="py-1.5 px-2 text-[9px] font-bold uppercase tracking-wider text-center border-r border-emerald-600/20">
                                      <div>HEIGHT</div>
                                      <div className="text-[8px] font-normal text-emerald-800/80 dark:text-emerald-400">(MM)</div>
                                    </th>
                                    <th className="py-1.5 px-2 text-[9px] font-bold uppercase tracking-wider text-center border-r border-emerald-600/20">
                                      <div>WIDTH</div>
                                      <div className="text-[8px] font-normal text-emerald-800/80 dark:text-emerald-400">(MM)</div>
                                    </th>
                                  </>
                                )}

                                {/* Under CHARGEABLE SIZE (MM) */}
                                <th className="py-1.5 px-2 text-[9px] font-bold uppercase tracking-wider text-center border-r border-emerald-600/20">
                                  <div>HEIGHT</div>
                                  <div className="text-[8px] font-normal text-emerald-800/80 dark:text-emerald-400">(MM)</div>
                                  {extraAreaLabel && (
                                    <div className="text-[8px] font-semibold text-emerald-700 dark:text-emerald-400 font-mono mt-0.5">{extraAreaLabel}</div>
                                  )}
                                </th>
                                <th className="py-1.5 px-2 text-[9px] font-bold uppercase tracking-wider text-center border-r border-emerald-600/20">
                                  <div>WIDTH</div>
                                  <div className="text-[8px] font-normal text-emerald-800/80 dark:text-emerald-400">(MM)</div>
                                  {extraAreaLabel && (
                                    <div className="text-[8px] font-semibold text-emerald-700 dark:text-emerald-400 font-mono mt-0.5">{extraAreaLabel}</div>
                                  )}
                                </th>
                                <th className="py-1.5 px-2 text-[9px] font-bold uppercase tracking-wider text-center border-r border-emerald-600/20">
                                  PCS
                                </th>
                                <th className="py-1.5 px-2 text-[9px] font-bold uppercase tracking-wider text-center border-r border-emerald-600/20">
                                  <div>AREA</div>
                                  <div className="text-[8px] font-normal lowercase tracking-normal">(sq mtr.)</div>
                                </th>
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

                                return (
                                  <tr key={item.id || itemIdx} className={`hover:bg-muted/10 ${!line?.ok && (item.l1 || item.l2 || item.l1mm || item.l2mm) ? "bg-red-500/5" : ""}`}>
                                    {/* Sr No */}
                                    <td className="py-1.5 px-2 text-center text-muted-foreground font-mono w-10">
                                      <span className="text-xs font-semibold">{itemIdx + 1}</span>
                                    </td>

                                    {/* Actual Size Inputs */}
                                    {inputUnit !== "mm" && (
                                      <>
                                        {isFreqOn && (
                                          <td className="py-1.5 px-1">
                                            <Select
                                              value={String(item.freq || 8)}
                                              onValueChange={(v) => updateLayerItem(layerIdx, itemIdx, "freq", Number(v))}
                                            >
                                              <SelectTrigger className="h-8 text-xs font-mono text-center w-[52px] px-1 focus:ring-1">
                                                <SelectValue />
                                              </SelectTrigger>
                                              <SelectContent>
                                                <SelectItem value="8">8</SelectItem>
                                                <SelectItem value="16">16</SelectItem>
                                              </SelectContent>
                                            </Select>
                                          </td>
                                        )}
                                        <td className="py-1.5 px-1">
                                          <Input
                                            className="h-8 text-xs font-mono text-center w-[75px]"
                                            value={item.l1 || ""}
                                            onChange={(e) => updateLayerItem(layerIdx, itemIdx, "l1", e.target.value)}
                                            placeholder={isFreqOn ? "36 2" : "36 3/8"}
                                          />
                                        </td>
                                        <td className="py-1.5 px-1">
                                          <Input
                                            className="h-8 text-xs font-mono text-center w-[75px]"
                                            value={item.l2 || ""}
                                            onChange={(e) => updateLayerItem(layerIdx, itemIdx, "l2", e.target.value)}
                                            placeholder={isFreqOn ? "32 2" : "13 3/8"}
                                          />
                                        </td>
                                        <td className="py-1.5 px-2 font-mono text-[11px] text-muted-foreground text-center whitespace-nowrap w-[55px]">
                                          {line?.ok ? line.lMM : "—"}
                                        </td>
                                        <td className="py-1.5 px-2 font-mono text-[11px] text-muted-foreground text-center whitespace-nowrap w-[55px]">
                                          {line?.ok ? line.wMM : "—"}
                                        </td>
                                      </>
                                    )}

                                    {inputUnit === "mm" && (
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
                                    )}

                                    {/* PCS (Qty) */}
                                    <td className="py-1.5 px-1">
                                      <Input
                                        type="number"
                                        className="h-8 text-xs font-mono text-center w-[46px]"
                                        value={item.qty || ""}
                                        min={1}
                                        onChange={(e) => updateLayerItem(layerIdx, itemIdx, "qty", e.target.value === "" ? "" : Number(e.target.value))}
                                      />
                                    </td>

                                    {/* Actual Area */}
                                    <td className="py-1.5 px-2 font-mono text-[11px] text-center text-muted-foreground w-[65px]">
                                      {areaText}
                                    </td>

                                    {/* Hole */}
                                    <td className="py-1.5 px-1">
                                      <Input
                                        type="number"
                                        className="h-8 text-xs font-mono text-center w-[42px]"
                                        value={item.holes || ""}
                                        min={0}
                                        onChange={(e) => updateLayerItem(layerIdx, itemIdx, "holes", e.target.value === "" ? "" : Number(e.target.value))}
                                      />
                                    </td>

                                    {/* Cut Out */}
                                    <td className="py-1.5 px-1">
                                      <Input
                                        type="number"
                                        className="h-8 text-xs font-mono text-center w-[42px]"
                                        value={item.cutouts || ""}
                                        min={0}
                                        onChange={(e) => updateLayerItem(layerIdx, itemIdx, "cutouts", e.target.value === "" ? "" : Number(e.target.value))}
                                      />
                                    </td>

                                    {/* Big Hole */}
                                    <td className="py-1.5 px-1">
                                      <Input
                                        type="number"
                                        className="h-8 text-xs font-mono text-center w-[42px]"
                                        value={item.bigHoles || ""}
                                        min={0}
                                        onChange={(e) => updateLayerItem(layerIdx, itemIdx, "bigHoles", e.target.value === "" ? "" : Number(e.target.value))}
                                      />
                                    </td>

                                    {/* Big Cut Out */}
                                    <td className="py-1.5 px-1">
                                      <Input
                                        type="number"
                                        className="h-8 text-xs font-mono text-center w-[42px]"
                                        value={item.bigCutouts || ""}
                                        min={0}
                                        onChange={(e) => updateLayerItem(layerIdx, itemIdx, "bigCutouts", e.target.value === "" ? "" : Number(e.target.value))}
                                      />
                                    </td>

                                    {/* CSK */}
                                    <td className="py-1.5 px-1">
                                      <Input
                                        type="number"
                                        className="h-8 text-xs font-mono text-center w-[42px]"
                                        value={item.csks || item.countersinks || ""}
                                        min={0}
                                        onChange={(e) => updateLayerItem(layerIdx, itemIdx, "csks", e.target.value === "" ? "" : Number(e.target.value))}
                                      />
                                    </td>

                                    {/* Chargeable Size (MM) Sub-columns */}
                                    {/* Height (MM) */}
                                    <td className="py-1.5 px-2 font-mono text-[11px] text-center text-muted-foreground whitespace-nowrap w-[60px]">
                                      {line?.ok ? line.lChgMM : "—"}
                                    </td>

                                    {/* Width (MM) */}
                                    <td className="py-1.5 px-2 font-mono text-[11px] text-center text-muted-foreground whitespace-nowrap w-[60px]">
                                      {line?.ok ? line.wChgMM : "—"}
                                    </td>

                                    {/* PCS */}
                                    <td className="py-1.5 px-2 font-mono text-[11px] text-center text-muted-foreground w-[40px]">
                                      {line?.ok ? item.qty : "—"}
                                    </td>

                                    {/* Chargeable Area (SQ MTR.) */}
                                    <td className="py-1.5 px-2 font-mono text-[11px] text-center text-emerald-700 dark:text-emerald-400 font-medium w-[65px]">
                                      {chargeAreaText}
                                    </td>

                                    {/* Rate */}
                                    <td className="py-1.5 px-1">
                                      <Input
                                        type="number"
                                        className="h-8 text-xs font-mono text-center w-[60px]"
                                        value={item.rate ?? ""}
                                        onChange={(e) => updateLayerItem(layerIdx, itemIdx, "rate", e.target.value === "" ? "" : Number(e.target.value))}
                                        placeholder={String(layer.rate || inv.glass?.defaultRate || "")}
                                      />
                                    </td>

                                    {/* Amount */}
                                    <td className="py-1.5 px-2 font-mono font-semibold text-xs text-right whitespace-nowrap w-[80px]">
                                      {line?.ok ? nf(line.amount) : <span className="text-muted-foreground/40">—</span>}
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
                    </div>
                  );
                })}
              </div>
            );
          })()}
            </Section>

            {/* 6. Bottom Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
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
              <div>
                <FieldLabel>Wastage</FieldLabel>
                <div className="h-8 flex items-center px-2 rounded-md border border-border bg-muted/30 text-xs font-mono text-foreground">
                  {totals.wastageArea ?? "0.000"}
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
