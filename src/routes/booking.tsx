import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import {
  Plus,
  Trash2,
  Ban,
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
import { useState, useMemo, useEffect, useRef } from "react";
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
import { TableSkeleton } from "@/components/app/DataSkeleton";
import { ConfirmDelete } from "@/components/app/ConfirmDelete";
import {
  blankItem,
  nf,
  uid,
  dmy,
  GLASS_TYPES,
  PRODUCTS_BY_TYPE,
  detectGlassTypeFromProduct,
  dedupeCustomers,
  formatOrderId,
  formatPiNo,
  workOrderBelongsTo,
  isSupersededBooking,
  supersededBookingNos,
} from "@/lib/gq";
import {
  ConfirmPaymentModal,
  type ConfirmPaymentDetails,
} from "@/components/app/ConfirmPaymentModal";

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

function formatProductNameForUnit(name: string, _targetUnit?: string): string {
  if (!name) return name;
  return name.replace(/\b(\d+)\s*inch\b/gi, "$1 MM").replace(/\b(\d+)\s*mm\b/gi, "$1 MM");
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
import { InvoiceDetailModal } from "@/components/app/InvoiceDetailModal";
import {
  DesktopOnly,
  MobileActionBar,
  MobileList,
  MobileRecordCard,
  SwipeHint,
} from "@/components/app/MobileRecord";

export const Route = createFileRoute("/booking")({
  /* /order already accepted ?view=; /booking did not, so Edit and Duplicate
     links from the invoice preview and the global search landed on the list
     instead of the form they asked for. */
  validateSearch: (
    search: Record<string, unknown>,
  ): {
    view?: string | undefined;
    id?: string | undefined;
    detailId?: string | undefined;
    action?: string | undefined;
    tab?: string | undefined;
  } => ({
    view: typeof search["view"] === "string" ? (search["view"] as string) : undefined,
    id: typeof search["id"] === "string" ? (search["id"] as string) : undefined,
    detailId: typeof search["detailId"] === "string" ? (search["detailId"] as string) : undefined,
    action: typeof search["action"] === "string" ? (search["action"] as string) : undefined,
    tab: typeof search["tab"] === "string" ? (search["tab"] as string) : undefined,
  }),
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
      <div
        className={`flex items-center justify-between px-3 sm:px-4 py-2.5 border-b border-border gap-2 flex-wrap ${accent || "bg-muted/30"}`}
      >
        <span className="text-[11px] font-bold uppercase tracking-widest text-foreground flex items-center gap-1.5">
          <span className="w-1 h-3.5 rounded-full bg-primary inline-block" />
          {title}
        </span>
        {/* `shrink-0` used to keep this block at its natural width: on a phone a
            header carrying several controls ran past the card's right edge and
            was clipped by the card's `overflow-hidden`, so the last control —
            Add Item on Product & Layers — could not be reached at all. It takes
            a row of its own below `sm` instead and wraps inside that row. */}
        {headerRight && <div className="w-full min-w-0 sm:w-auto sm:shrink-0">{headerRight}</div>}
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
    <div
      className={`grid grid-cols-[1fr_50px_60px_40px_65px] gap-1 items-center py-[3px] text-[11px] border-b border-border/30 last:border-0 ${highlight ? "bg-emerald-500/5" : ""}`}
    >
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

/* ─── Remark Selector Cell ────────────────────────────────────────── */
function RemarkCell({ value, onChange }: { value: string; onChange: (val: string) => void }) {
  return (
    <>
      <Input
        type="text"
        list="remark-presets"
        className="h-8 text-xs min-w-[110px] w-full bg-background font-medium"
        value={value || ""}
        placeholder="Enter custom remark..."
        onChange={(e) => onChange(e.target.value)}
      />
      <datalist id="remark-presets">
        <option value="BLOCK" />
        <option value="DESIGN" />
        <option value="DRAWING" />
      </datalist>
    </>
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
      // Parse formats: "60.3 x 51.2", "36 3/8 x 13 3/8", "34 6 x 66 7", "60.3, 51.2"
      let parts: string[] = [];
      if (/[xX×*]/.test(line)) {
        parts = line
          .split(/[xX×*]+/)
          .map((p) => p.trim())
          .filter(Boolean);
      } else if (line.includes(",")) {
        parts = line
          .split(",")
          .map((p) => p.trim())
          .filter(Boolean);
      } else if (line.includes("\t")) {
        parts = line
          .split("\t")
          .map((p) => p.trim())
          .filter(Boolean);
      } else {
        parts = line
          .split(/\s+/)
          .map((p) => p.trim())
          .filter(Boolean);
      }

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
      toast.error(
        inputUnit === "mm"
          ? "No valid sizes found. Use format: 60.3 x 51.2"
          : "No valid sizes found. Use format: 36 3/8 x 13 3/8",
      );
      return;
    }
    onApply(items);
    setText("");
    onClose();
    toast.success(`Added ${items.length} items`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4">
      <div
        style={{ paddingBottom: "var(--safe-bottom)" }}
        className="bg-card border border-border rounded-t-2xl shadow-2xl w-full max-w-lg max-h-[90dvh] overflow-y-auto sm:rounded-xl"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="text-sm font-semibold text-foreground flex items-center gap-2">
            <ClipboardPaste className="h-4 w-4 text-primary" />
            Bulk Size Entry ({inputUnit.toUpperCase()})
          </span>
          <button
            onClick={onClose}
            className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted text-muted-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <p className="text-xs text-muted-foreground">
            Paste sizes, one per line. Format:{" "}
            <code className="bg-muted px-1 py-0.5 rounded text-[10px]">L1 x L2</code> or{" "}
            <code className="bg-muted px-1 py-0.5 rounded text-[10px]">L1, L2</code>
          </p>
          <Textarea
            rows={12}
            className="font-mono text-xs resize-none"
            placeholder={
              inputUnit === "mm"
                ? "60.3 x 51.2\n60.3 x 52.0\n60.3 x 51.2\n60.3 x 52.2\n60.4 x 51.3"
                : "36 3/8 x 13 3/8\n48 1/16 x 24\n119 5/16 x 48"
            }
            value={text}
            onChange={(e) => setText(e.target.value)}
            autoFocus
          />
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">
              {text.split("\n").filter((l) => l.trim()).length} lines detected
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onClose}>
                Cancel
              </Button>
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

const handleInchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
  if (
    e.key === "Backspace" ||
    e.key === "Delete" ||
    e.key === "Tab" ||
    e.key === "Escape" ||
    e.key === "Enter" ||
    e.key.startsWith("Arrow") ||
    e.key === "Home" ||
    e.key === "End" ||
    e.ctrlKey ||
    e.metaKey
  ) {
    return;
  }
  if (e.key.length === 1 && !/[0-9 ./-]/.test(e.key)) {
    e.preventDefault();
  }
};

const handleDecimalKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
  if (
    e.key === "Backspace" ||
    e.key === "Delete" ||
    e.key === "Tab" ||
    e.key === "Escape" ||
    e.key === "Enter" ||
    e.key.startsWith("Arrow") ||
    e.key === "Home" ||
    e.key === "End" ||
    e.ctrlKey ||
    e.metaKey
  ) {
    return;
  }
  if (e.key.length === 1 && !/[0-9.]/.test(e.key)) {
    e.preventDefault();
  }
};

const handleIntegerKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
  if (
    e.key === "Backspace" ||
    e.key === "Delete" ||
    e.key === "Tab" ||
    e.key === "Escape" ||
    e.key === "Enter" ||
    e.key.startsWith("Arrow") ||
    e.key === "Home" ||
    e.key === "End" ||
    e.ctrlKey ||
    e.metaKey
  ) {
    return;
  }
  if (e.key.length === 1 && !/[0-9]/.test(e.key)) {
    e.preventDefault();
  }
};

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
    confirmPreProforma,
    confirmOrder,
    generateWorkOrder,
    saveWorkOrder,
    updateInvoiceStatus,
    toggleWhatsAppSent,
    workOrders,
    hydrated,
  } = useGQ();

  const searchParams = useSearch({ strict: false }) as {
    view?: string;
    id?: string;
    detailId?: string;
    action?: string;
    tab?: string;
  };

  const [bulkOpenLayerIdx, setBulkOpenLayerIdx] = useState<number | null>(null);
  const [savedSearch, setSavedSearch] = useState("");
  const [showForm, setShowForm] = useState(searchParams?.view === "form");
  const [detailInvoice, setDetailInvoice] = useState<any | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [targetConfirmInvoice, setTargetConfirmInvoice] = useState<any | null>(null);

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
    toast.success(
      `✨ Payment confirmed for ${activeInv.no || activeInv.orderNo}! Moved to Order Confirm.`,
    );
    navigate({ to: "/order", search: { view: undefined } as any });
  };
  /* ?view=form&action=new opens an empty Proforma Invoice — the target of the
     mobile quick-action button. The one-shot param is stripped straight after
     it is consumed so that a refresh, or a Back into this entry, does not wipe
     a draft the user has already started typing. */
  const quickNewConsumed = useRef(false);
  useEffect(() => {
    if (searchParams?.action === "new" && searchParams?.view === "form" && !searchParams?.id) {
      if (quickNewConsumed.current) return;
      quickNewConsumed.current = true;
      newInvoice("pre_proforma");
      setShowForm(true);
      navigate({ to: "/booking", search: { view: "form" } as any, replace: true });
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

  const preProformaInvoices = useMemo(() => {
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

  const pendingWhatsAppCount = useMemo(
    () => preProformaInvoices.filter((x) => !x.whatsappSent).length,
    [preProformaInvoices],
  );
  const sentWhatsAppCount = useMemo(
    () => preProformaInvoices.filter((x) => !!x.whatsappSent).length,
    [preProformaInvoices],
  );
  const totalSavedValue = useMemo(
    () =>
      preProformaInvoices.reduce((acc, item) => acc + (Number(item.totals?.grandTotal) || 0), 0),
    [preProformaInvoices],
  );

  const filteredSavedInvoices = useMemo(
    () =>
      preProformaInvoices.filter((item: any) => {
        const query = savedSearch.toLowerCase().trim();
        if (!query) return true;

        const piNoStr = formatPiNo(item.no).toLowerCase();
        const rawNoStr = String(item.no || "").toLowerCase();
        const preNoStr = String(item.preProformaNo || "").toLowerCase();
        const orderNoStr = String(item.orderNo || "").toLowerCase();
        const formattedOrderStr = formatOrderId(item.preProformaNo || item.orderNo).toLowerCase();
        const custNameStr = String(item.cust?.name || item.custName || "").toLowerCase();
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
    [preProformaInvoices, savedSearch],
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
      items:
        l.items && l.items.length > 0
          ? l.items
          : idx === 0 && inv.items && inv.items.length > 0
            ? inv.items
            : [blankItem()],
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

      let cleanVal = val;
      if (field === "l1" || field === "l2") {
        if (typeof cleanVal === "string") {
          cleanVal = cleanVal.replace(/[^0-9 ./-]/g, "");
        }
      } else if (field === "l1mm" || field === "l2mm" || field === "thk" || field === "rate") {
        if (typeof cleanVal === "string") {
          cleanVal = cleanVal.replace(/[^0-9.]/g, "");
        }
      } else if (
        [
          "qty",
          "holes",
          "cutouts",
          "bigHoles",
          "bigCutouts",
          "csks",
          "countersinks",
          "freq",
        ].includes(field)
      ) {
        if (typeof cleanVal === "string") {
          cleanVal = cleanVal.replace(/[^0-9]/g, "");
        }
      }

      copy.layers[layerIdx].items[itemIdx][field] = cleanVal;
      if (field === "remark") {
        copy.layers[layerIdx].items[itemIdx]["shape"] = val;
      }
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
      if (copy.layers[index]) {
        let cleanVal = val;
        if (field === "thickness" || field === "rate") {
          if (typeof cleanVal === "string") {
            cleanVal = cleanVal.replace(/[^0-9.]/g, "");
          }
        }
        copy.layers[index][field] = cleanVal;
      }
      copy.items = copy.layers.flatMap((l: any) => l.items || []);
      return copy;
    });
  };

  const { customers } = useGQ();
  const [custSearch, setCustSearch] = useState("");
  const [custDropOpen, setCustDropOpen] = useState(false);

  const uniqueCustomers = useMemo(() => dedupeCustomers(customers), [customers]);

  const filteredCustomers = useMemo(() => {
    const q = custSearch.toLowerCase().trim();
    if (!q) return uniqueCustomers;
    return uniqueCustomers.filter(
      (c: any) =>
        String(c?.name || "")
          .toLowerCase()
          .includes(q) ||
        String(c?.phone || "")
          .toLowerCase()
          .includes(q),
    );
  }, [uniqueCustomers, custSearch]);

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
    toast.success(`Loaded customer: ${c.name}`);
  };

  /* saveInvoice() returns false and toasts its own error when the customer name
     or the line items fail validation. Both of these used to ignore that, mark
     the booking "pi_sent" against a record that was never saved, and report
     success on top of the error the user had just been shown. */
  const handleSendPI = () => {
    if (!saveInvoice()) return;
    if (inv.id) updateInvoiceStatus(inv.id, "pi_sent");
    toast.success("Proforma Invoice saved & sent to customer for confirmation");
  };

  const handleAcceptAndMove = () => {
    if (!saveInvoice()) return;
    if (!inv.id) return;
    confirmPreProforma(inv.id);
    setShowForm(false);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* ── UNIFIED SECTION TABS ───────────────────────── */}
      <div className="bg-muted/40 border-b border-border px-3 sm:px-6 py-2 flex items-center gap-2 text-xs font-semibold flex-wrap">
        <span className="text-muted-foreground mr-1 text-[11px] font-bold uppercase tracking-wider">
          Proforma Section:
        </span>
        <Link
          to="/booking"
          className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground font-bold shadow-sm flex items-center gap-1.5"
        >
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          1. Proforma Invoice
        </Link>
        <Link
          to="/order"
          search={{ view: undefined }}
          className="px-3 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors flex items-center gap-1.5"
        >
          2. Order Confirm
        </Link>
      </div>

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
                  onClick={() => setShowForm(false)}
                  className="hover:text-foreground transition-colors"
                >
                  Proforma Invoice
                </button>
              ) : (
                <span className="text-primary font-semibold">Proforma Invoice</span>
              )}
              {showForm && (
                <>
                  {" / "}
                  <span className="text-primary font-semibold">
                    {inv._saved ? `Edit (${inv.no})` : "New Proforma Invoice"}
                  </span>
                </>
              )}
            </div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground leading-tight flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              {showForm
                ? inv._saved
                  ? "Edit Proforma Invoice"
                  : "New Proforma Invoice"
                : "Proforma Invoice Management"}
              {inv._saved && showForm && (
                <span className="text-xs font-mono font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded">
                  {inv.no}
                </span>
              )}
            </h1>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {showForm ? (
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1.5"
                onClick={() => setShowForm(false)}
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to Saved List
              </Button>
            ) : (
              /* RIGHT BUTTON: New Proforma Invoice */
              <Button
                size="sm"
                className="h-9 px-4 text-xs gap-1.5 bg-primary text-primary-foreground font-bold shadow-md hover:bg-primary/90"
                onClick={() => {
                  newInvoice("pre_proforma");
                  setShowForm(true);
                }}
              >
                <Plus className="h-4 w-4" />
                New Proforma Invoice
              </Button>
            )}
          </div>
        </div>

        {/* ── KPI METRICS CARDS (Shown only on management/list view) ─────────────────── */}
        {!showForm && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
            {/* Card 1: TOTAL PI */}
            <div className="bg-background border border-border/80 rounded-lg p-2 sm:p-3 shadow-xs">
              <div className="text-[9px] sm:text-[10px] font-bold uppercase text-muted-foreground tracking-wider">
                Total PI
              </div>
              <div className="text-base sm:text-xl font-bold text-foreground mt-0.5">
                {preProformaInvoices.length}
              </div>
              <div className="text-[9px] sm:text-[10px] text-muted-foreground mt-0.5">
                Total proforma invoices
              </div>
            </div>
            {/* Card 2: FOLLOWED UP */}
            <div className="bg-background border border-blue-500/30 rounded-lg p-2 sm:p-3 shadow-xs border-l-[3px] sm:border-l-4 border-l-blue-500">
              <div className="text-[9px] sm:text-[10px] font-bold uppercase text-blue-600 dark:text-blue-400 flex items-center gap-1 tracking-wider">
                <CheckCircle2 className="h-2.5 w-2.5 sm:h-3 sm:w-3" /> Followed Up
              </div>
              <div className="text-base sm:text-xl font-bold text-blue-600 dark:text-blue-400 mt-0.5">
                {sentWhatsAppCount}
              </div>
              <div className="text-[9px] sm:text-[10px] text-muted-foreground mt-0.5">
                Follow up completed
              </div>
            </div>
            {/* Card 3: PENDING FOLLOW UP */}
            <div className="bg-background border border-amber-500/30 rounded-lg p-2 sm:p-3 shadow-xs border-l-[3px] sm:border-l-4 border-l-amber-500">
              <div className="text-[9px] sm:text-[10px] font-bold uppercase text-amber-600 dark:text-amber-400 flex items-center gap-1 tracking-wider">
                <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3" /> Pending Follow Up
              </div>
              <div className="text-base sm:text-xl font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                {pendingWhatsAppCount}
              </div>
              <div className="text-[9px] sm:text-[10px] text-muted-foreground mt-0.5">
                Awaiting follow up
              </div>
            </div>
            {/* Card 4: INVOICE VALUE */}
            <div className="bg-background border border-border/80 rounded-lg p-2 sm:p-3 shadow-xs">
              <div className="text-[9px] sm:text-[10px] font-bold uppercase text-muted-foreground tracking-wider">
                Invoice Value
              </div>
              <div className="text-base sm:text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 font-mono">
                ₹ {nf(totalSavedValue)}
              </div>
              <div className="text-[9px] sm:text-[10px] text-muted-foreground mt-0.5">
                Saved quotes value
              </div>
            </div>
          </div>
        )}
      </div>

      {!showForm ? (
        /* ── ALL SAVED PROFORMA INVOICES TABLE (TOP DEFAULT VIEW) ────────── */
        <div className="p-3 sm:p-4 bg-muted/20 border-b border-border">
          <Section
            title="All Saved Proforma Invoices"
            headerRight={
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <Search className="h-3.5 w-3.5 absolute left-2.5 top-2 text-muted-foreground" />
                  <Input
                    className="h-7 text-xs pl-8 w-44 sm:w-60 bg-background"
                    placeholder="Search saved proforma invoice..."
                    value={savedSearch}
                    onChange={(e) => setSavedSearch(e.target.value)}
                  />
                </div>
                <span className="text-xs text-muted-foreground font-medium">
                  <span className="font-bold text-foreground">{filteredSavedInvoices.length}</span>{" "}
                  saved records
                </span>
              </div>
            }
          >
            {!hydrated ? (
              <TableSkeleton rows={6} cols={6} />
            ) : filteredSavedInvoices.length === 0 ? (
              <div className="text-center py-12 text-xs text-muted-foreground space-y-2">
                <p>
                  {savedSearch
                    ? "No matching Proforma Invoices found."
                    : "No saved Proforma Invoices found."}
                </p>
                <Button
                  size="sm"
                  className="h-8 text-xs gap-1.5 bg-primary text-primary-foreground font-semibold"
                  onClick={() => {
                    newInvoice();
                    setShowForm(true);
                  }}
                >
                  <Plus className="h-3.5 w-3.5" /> New Proforma Invoice
                </Button>
              </div>
            ) : (
              <>
                {/* ── Phone: one card per Proforma Invoice ── */}
                <MobileList>
                  {filteredSavedInvoices.map((item: any) => {
                    const isConfirmed =
                      item.status === "order_confirmed" || item.status === "work_order_generated";
                    const rowCancelled = item.status === "cancelled";
                    return (
                      <MobileRecordCard
                        key={item.id}
                        dimmed={rowCancelled}
                        accent={
                          rowCancelled
                            ? "bg-rose-500"
                            : isConfirmed
                              ? "bg-emerald-500"
                              : "bg-blue-500"
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
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (rowCancelled) {
                                toast.error("Cancelled invoice cannot be followed up");
                                return;
                              }
                              toggleWhatsAppSent(item.id);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                e.stopPropagation();
                                if (!rowCancelled) toggleWhatsAppSent(item.id);
                              }
                            }}
                            title={
                              rowCancelled
                                ? "Cancelled invoice"
                                : "Follow up status — tap to toggle"
                            }
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              rowCancelled
                                ? "bg-muted text-muted-foreground border border-border"
                                : item.whatsappSent
                                  ? "bg-emerald-500/15 text-emerald-600 border border-emerald-500/40"
                                  : "bg-red-500/15 text-red-600 border border-red-500/40"
                            }`}
                          >
                            {item.whatsappSent ? (
                              <CheckCircle2 className="h-3 w-3" />
                            ) : (
                              <X className="h-3 w-3" />
                            )}
                            Follow up
                          </span>
                        }
                        subject={item.cust?.name || "—"}
                        meta={[dmy(item.date), item.cust?.phone || null]}
                        fields={[
                          {
                            label: "Grand Total",
                            value: `₹ ${nf(item.totals?.grandTotal || 0)}`,
                            tone: "positive",
                          },
                          { label: "Items", value: item.items?.length || 0 },
                        ]}
                        actions={
                          rowCancelled ? (
                            <span className="rounded bg-rose-500/15 px-2 py-1 text-[10px] font-extrabold uppercase text-rose-600 border border-rose-500/30">
                              Cancelled
                            </span>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                className={`h-9 flex-1 gap-1.5 text-xs font-bold ${
                                  isConfirmed
                                    ? "bg-emerald-500/15 text-emerald-600 border border-emerald-500/40 hover:bg-emerald-500/25"
                                    : "bg-emerald-600 text-white hover:bg-emerald-700"
                                }`}
                                onClick={() => {
                                  loadInvoice(item.id, false);
                                  navigate({
                                    to: "/order",
                                    search: {
                                      view: "form",
                                      id: item.id,
                                      action: "confirm",
                                      from: "booking",
                                    } as any,
                                  });
                                }}
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                {isConfirmed ? "Confirmed" : "Confirm"}
                              </Button>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-9 w-9 text-primary border-primary/30"
                                title="Edit Proforma Invoice"
                                onClick={() => {
                                  loadInvoice(item.id, false);
                                  setShowForm(true);
                                  toast.success(`Loaded Proforma Invoice ${item.no} for editing`);
                                }}
                              >
                                <Edit3 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-9 w-9 text-emerald-600 border-emerald-500/30"
                                title="Print / Generate PDF"
                                onClick={() => {
                                  loadInvoice(item.id, false);
                                  navigate({ to: "/invoice", search: { id: item.id } });
                                }}
                              >
                                <Printer className="h-4 w-4" />
                              </Button>
                              <ConfirmDelete
                                title={`Cancel Proforma Invoice ${item.no}?`}
                                description={`Are you sure you want to cancel ${item.no} (${item.cust?.name || "unnamed customer"})? Its status becomes Cancelled: the record stays for the audit trail but stops counting towards revenue and dues.`}
                                confirmLabel="Cancel Proforma Invoice"
                                onConfirm={() => {
                                  updateInvoiceStatus(item.id, "cancelled");
                                  toast.info(`Proforma Invoice ${item.no} set to Cancelled`);
                                }}
                              >
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-9 w-9 text-amber-600 border-amber-500/30"
                                  title="Cancel Proforma Invoice"
                                >
                                  <Ban className="h-4 w-4" />
                                </Button>
                              </ConfirmDelete>
                            </>
                          )
                        }
                      />
                    );
                  })}
                </MobileList>

                {/* ── Tablet and up: the full table ── */}
                <DesktopOnly className="overflow-x-auto -mx-3 sm:-mx-4">
                  <table
                    className="w-full text-xs text-left border-collapse"
                    style={{ minWidth: "820px" }}
                  >
                    <thead>
                      <tr className="border-b border-border bg-muted/20 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        <th className="py-2.5 px-3">PI No</th>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Customer Name</th>
                        <th className="py-2.5 px-3">Phone No.</th>
                        <th className="py-2.5 px-3 text-center">Items</th>
                        <th className="py-2.5 px-3 text-right">Grand Total</th>
                        <th className="py-2.5 px-3 text-center">Follow Up</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40 text-xs">
                      {filteredSavedInvoices.map((item: any) => {
                        const isConfirmed =
                          item.status === "order_confirmed" ||
                          item.status === "work_order_generated";
                        const isCancelled = item.status === "cancelled";

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
                            <td className="py-2.5 px-3 text-muted-foreground font-mono">
                              {dmy(item.date)}
                            </td>
                            <td className="py-2.5 px-3 font-medium text-foreground">
                              {item.cust?.name || "—"}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-muted-foreground">
                              {item.cust?.phone || "—"}
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono">
                              {item.items?.length || 0}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-semibold text-emerald-600">
                              ₹ {nf(item.totals?.grandTotal || 0)}
                            </td>
                            <td
                              className="py-2.5 px-3 text-center"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (isCancelled) {
                                    toast.error("Cancelled invoice cannot be followed up");
                                    return;
                                  }
                                  toggleWhatsAppSent(item.id);
                                }}
                                className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
                                  isCancelled
                                    ? "bg-muted text-muted-foreground border border-border cursor-not-allowed opacity-60"
                                    : item.whatsappSent
                                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/25"
                                      : "bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/40 hover:bg-red-500/25"
                                }`}
                                title={
                                  isCancelled
                                    ? "Cancelled invoice"
                                    : item.whatsappSent
                                      ? "Status: Yes (Click to toggle)"
                                      : "Status: No (Click to toggle)"
                                }
                              >
                                {item.whatsappSent ? (
                                  <>
                                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                                    <span>Yes</span>
                                  </>
                                ) : (
                                  <>
                                    <X className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                                    <span>No</span>
                                  </>
                                )}
                              </button>
                            </td>
                            <td
                              className="py-2.5 px-3 text-right"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="flex items-center justify-end gap-1">
                                {/* Confirm & Convert Action Button */}
                                {!isCancelled && (
                                  <Button
                                    size="sm"
                                    className={`h-7 px-2 text-[11px] font-bold gap-1 transition-all ${
                                      isConfirmed
                                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/25"
                                        : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                                    }`}
                                    onClick={() => {
                                      loadInvoice(item.id, false);
                                      navigate({
                                        to: "/order",
                                        search: {
                                          view: "form",
                                          id: item.id,
                                          action: "confirm",
                                          from: "booking",
                                        } as any,
                                      });
                                    }}
                                    title={
                                      isConfirmed
                                        ? "Proforma Invoice Confirmed - Click to open Order Confirm"
                                        : "Confirm Proforma Invoice & Open Order Confirm"
                                    }
                                  >
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    <span>{isConfirmed ? "Confirmed" : "Confirm"}</span>
                                  </Button>
                                )}

                                {/* Edit Symbol Button */}
                                {!isCancelled && (
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-7 w-7 text-primary border-primary/30 hover:bg-primary/10"
                                    onClick={() => {
                                      loadInvoice(item.id, false);
                                      setShowForm(true);
                                      toast.success(
                                        `Loaded Proforma Invoice ${item.no} for editing`,
                                      );
                                    }}
                                    title="Edit Proforma Invoice"
                                  >
                                    <Edit3 className="h-3.5 w-3.5" />
                                  </Button>
                                )}

                                {/* Print Symbol Button */}
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-7 w-7 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10"
                                  onClick={() => {
                                    loadInvoice(item.id, false);
                                    toast.success(
                                      `Generating PDF for Proforma Invoice ${item.no}...`,
                                    );
                                    navigate({ to: "/invoice", search: { id: item.id } });
                                  }}
                                  title="Print / Generate PDF"
                                >
                                  <Printer className="h-3.5 w-3.5" />
                                </Button>

                                {/* Cancel Booking Button */}
                                {isCancelled ? (
                                  <span className="px-2 py-1 rounded text-[10px] font-extrabold uppercase bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                                    Cancelled
                                  </span>
                                ) : (
                                  <ConfirmDelete
                                    title={`Cancel Proforma Invoice ${item.no}?`}
                                    description={`Are you sure you want to cancel ${item.no} (${item.cust?.name || "unnamed customer"})? Its status becomes Cancelled: the record stays for the audit trail but stops counting towards revenue and dues.`}
                                    confirmLabel="Cancel Proforma Invoice"
                                    onConfirm={() => {
                                      updateInvoiceStatus(item.id, "cancelled");
                                      toast.info(`Proforma Invoice ${item.no} set to Cancelled`);
                                    }}
                                  >
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      className="h-7 w-7 text-amber-600 border-amber-500/30 hover:bg-amber-500/10"
                                      title="Cancel Proforma Invoice"
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
        /* ── PROFORMA INVOICE CREATION / EDITING FORM SECTION ─────────────── */
        <div id="order-booking-form" className="p-3 pb-24 sm:p-4 md:pb-4 w-full">
          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-4 w-full">
            {/* ════ LEFT COLUMN ════ */}
            <div className="space-y-4 min-w-0">
              {/* 1. Customer & Proforma Invoice Details */}
              <Section
                title="Customer & Proforma Invoice Details"
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
                              {c.phone && (
                                <div className="text-[10px] text-muted-foreground">{c.phone}</div>
                              )}
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
                    <FieldLabel>PI No</FieldLabel>
                    <Input
                      className="h-8 text-xs font-mono"
                      value={formatPiNo(inv.no)}
                      onChange={(e) => updateInvField("no", e.target.value)}
                    />
                  </div>
                  <div>
                    <FieldLabel>Date</FieldLabel>
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

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2 border-t border-border/40">
                  {/* Secondary Old Customer Selector */}
                  <div className="sm:col-span-4 bg-muted/40 p-2.5 rounded-lg border border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs mb-1">
                    <div className="flex items-center gap-2">
                      <UserCheck className="h-4 w-4 text-primary shrink-0" />
                      <div>
                        <span className="text-xs font-bold text-foreground">
                          Select Old / Existing Customer
                        </span>
                        <p className="text-[10px] text-muted-foreground">
                          Pick a saved customer from database to autofill customer details
                        </p>
                      </div>
                    </div>
                    <div className="w-full sm:w-72">
                      <Select
                        value={inv.cust?.name || ""}
                        onValueChange={(val) => {
                          const found = uniqueCustomers.find(
                            (c: any) =>
                              String(c.name || "")
                                .trim()
                                .toLowerCase() === String(val).trim().toLowerCase(),
                          );
                          if (found) selectCustomer(found);
                        }}
                      >
                        <SelectTrigger className="h-8 text-xs bg-background">
                          <SelectValue placeholder="-- Select Old Customer --" />
                        </SelectTrigger>
                        <SelectContent>
                          {uniqueCustomers.map((c: any) => (
                            <SelectItem key={c.id || c.name} value={c.name}>
                              <span className="font-semibold">{c.name}</span>{" "}
                              {c.phone ? `(${c.phone})` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <FieldLabel>Customer / M/S. Name</FieldLabel>
                    <Input
                      className="h-8 text-xs font-medium"
                      value={inv.cust?.name || ""}
                      onChange={(e) => updateInvField("cust.name", e.target.value)}
                      placeholder="Hindustan Float Glass Pvt Ltd"
                    />
                  </div>
                  <div>
                    <FieldLabel>GSTIN</FieldLabel>
                    <Input
                      className="h-8 text-xs font-mono uppercase"
                      value={inv.cust?.gstin || ""}
                      onChange={(e) => updateInvField("cust.gstin", e.target.value.toUpperCase())}
                      placeholder="08AACCH4208C1Z3"
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
                      placeholder="9799998611"
                    />
                  </div>
                  <div>
                    <FieldLabel>Email</FieldLabel>
                    <Input
                      className="h-8 text-xs"
                      value={inv.cust?.email || ""}
                      onChange={(e) => updateInvField("cust.email", e.target.value)}
                      placeholder="hindustan@live.in"
                    />
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
                      placeholder="S 5, Shri Govind Complex, Jhotwara, Jaipur"
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

              {/* Unified Product & Layers Section */}
              <Section
                title="Product & Layers"
                headerRight={
                  <div className="grid w-full grid-cols-2 items-center gap-1.5 text-xs sm:flex sm:w-auto sm:flex-wrap sm:justify-end sm:gap-2">
                    {/* Size Entry Type */}
                    <div className="min-w-0 flex items-center gap-1 bg-background border border-border/80 rounded px-1.5 py-0.5 shadow-xs">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase whitespace-nowrap">
                        Size:
                      </span>
                      <Select value={inputUnit} onValueChange={(v) => handleInputUnitChange(v)}>
                        <SelectTrigger className="h-6 min-w-0 text-[11px] border-0 shadow-none focus:ring-0 px-1 py-0 w-full sm:w-[60px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="mm">MM</SelectItem>
                          <SelectItem value="inch">Inch</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Frequency Toggle */}
                    <div
                      className={`min-w-0 flex items-center gap-1 bg-background border border-border/80 rounded px-1.5 py-0.5 shadow-xs transition-opacity ${
                        inputUnit === "mm" ? "opacity-50 pointer-events-none" : ""
                      }`}
                      title={
                        inputUnit === "mm"
                          ? "Frequency is available for Inch mode only"
                          : "Toggle Frequency column"
                      }
                    >
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase whitespace-nowrap">
                        Frequency:
                      </span>
                      <Select
                        disabled={inputUnit === "mm"}
                        value={isFreqOn ? "on" : "off"}
                        onValueChange={(v) => updateInvField("frequencyEnabled", v === "on")}
                      >
                        <SelectTrigger className="h-6 min-w-0 text-[11px] border-0 shadow-none focus:ring-0 px-1 py-0 w-full sm:w-[55px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="off">Off</SelectItem>
                          <SelectItem value="on">On</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Area Formula */}
                    <div className="min-w-0 flex items-center gap-1 bg-background border border-border/80 rounded px-1.5 py-0.5 shadow-xs">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase whitespace-nowrap">
                        Area Formula:
                      </span>
                      <Select
                        value={inv.ch?.extraAreaFormula || "+25mm"}
                        onValueChange={(v) => updateInvField("ch.extraAreaFormula", v)}
                      >
                        <SelectTrigger className="h-6 min-w-0 text-[11px] border-0 shadow-none focus:ring-0 px-1 py-0 w-full sm:w-[95px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="+25mm">+ 25 MM</SelectItem>
                          <SelectItem value="+25.4mm">+ 25.4 MM</SelectItem>
                          <SelectItem value="+50mm">+ 50 MM</SelectItem>
                          <SelectItem value="custom">Custom</SelectItem>
                        </SelectContent>
                      </Select>
                      {inv.ch?.extraAreaFormula === "custom" && (
                        <Input
                          type="number"
                          placeholder="MM"
                          className="h-6 w-14 shrink-0 text-xs font-mono px-1 py-0 text-center"
                          value={inv.ch?.extraAreaCustomMM || ""}
                          onChange={(e) =>
                            updateInvField(
                              "ch.extraAreaCustomMM",
                              e.target.value === "" ? "" : Number(e.target.value),
                            )
                          }
                        />
                      )}
                    </div>

                    {/* Rate Find Formula */}
                    <div className="min-w-0 flex items-center gap-1 bg-background border border-border/80 rounded px-1.5 py-0.5 shadow-xs">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase whitespace-nowrap">
                        Rate Formula:
                      </span>
                      <Select
                        value={settings.rateUnit}
                        onValueChange={(v) => updateInvField("ch.rateUnit", v)}
                      >
                        <SelectTrigger className="h-6 min-w-0 text-[11px] border-0 shadow-none focus:ring-0 px-1 py-0 w-full sm:w-[105px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sqm">Sq. Metr Net</SelectItem>
                          <SelectItem value="sqft">Sq. Feet Net</SelectItem>
                          <SelectItem value="piece">Per Piece</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Add Item Button */}
                    <Button
                      size="sm"
                      className="col-span-2 h-9 w-full text-[11px] px-2.5 gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs sm:col-span-1 sm:h-7 sm:w-auto"
                      onClick={addLayer}
                    >
                      <Plus className="h-3 w-3" /> Add Item
                    </Button>
                  </div>
                }
              >
                {(() => {
                  const extraAreaFormula = inv.ch?.extraAreaFormula || "+25mm";
                  const extraAreaLabel =
                    extraAreaFormula === "+25.4mm"
                      ? "+25.4 MM"
                      : extraAreaFormula === "+25mm"
                        ? "+25 MM"
                        : extraAreaFormula === "+50mm"
                          ? "+50 MM"
                          : extraAreaFormula === "custom"
                            ? inv.ch?.extraAreaCustomMM
                              ? `+${inv.ch.extraAreaCustomMM} MM`
                              : "+Custom"
                            : "(Exact)";

                  return (
                    <div className="space-y-6">
                      {layers.map((layer: any, layerIdx: number) => {
                        const layerName = layer.layerNo || `Item ${layerIdx + 1}`;
                        const prodInfo = layer.productName
                          ? `${layer.productName}${layer.thickness ? ` (${layer.thickness}mm)` : ""}`
                          : layer.thickness
                            ? `Glass (${layer.thickness}mm)`
                            : "";
                        const layerItems = layer.items || [blankItem()];

                        const formattedProducts = BASE_GLASS_PRODUCTS.map((baseName) =>
                          formatProductNameForUnit(baseName, inputUnit),
                        );
                        const curVal = layer.productName || layer.glassName || "";
                        const isPredefined = formattedProducts.includes(curVal);
                        const isCustomMode =
                          layer.isCustomProduct || (curVal !== "" && !isPredefined);

                        const isCustomGlassType = Boolean(
                          layer.isCustomGlassType ||
                          (layer.glassType &&
                            !GLASS_TYPES.includes(layer.glassType) &&
                            layer.glassType !==
                              detectGlassTypeFromProduct(
                                layer.productName || layer.glassName || "",
                              )),
                        );

                        return (
                          <div
                            key={layer.id || layerIdx}
                            className="space-y-3 p-3 rounded-lg border border-border/60 bg-card/40"
                          >
                            {/* Product Header Row for this layer */}
                            <div className="rounded-md border border-border/80 overflow-hidden bg-card shadow-xs">
                              <div className="hidden md:grid grid-cols-[90px_1fr_1.2fr_65px_85px_36px] gap-2 items-center px-3 py-2 bg-green-500/10 border-b border-border/60 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                <div className="text-center">ITEM</div>
                                <div>GLASS TYPE</div>
                                <div>PRODUCT NAME</div>
                                <div className="text-center">THK</div>
                                <div className="text-center">RATE</div>
                                <div></div>
                              </div>
                              <div className="grid grid-cols-2 gap-2 px-3 py-2.5 md:grid-cols-[90px_1fr_1.2fr_65px_85px_36px] md:items-center md:py-2">
                                <div className="order-1 md:order-none">
                                  <span className="field-label md:hidden">Item</span>
                                  <Input
                                    className="h-8 w-24 md:h-7 md:w-full text-xs bg-green-500/10 text-center font-semibold"
                                    value={
                                      layer.layerNo !== undefined && layer.layerNo !== ""
                                        ? layer.layerNo
                                        : `Item ${layerIdx + 1}`
                                    }
                                    onChange={(e) =>
                                      updateLayer(layerIdx, "layerNo", e.target.value)
                                    }
                                  />
                                </div>

                                {/* 1. GLASS TYPE Dropdown */}
                                <div className="order-3 col-span-2 md:order-none md:col-span-1">
                                  <span className="field-label md:hidden">Glass type</span>
                                  {isCustomGlassType ? (
                                    <div className="flex items-center gap-1">
                                      <Input
                                        autoFocus
                                        className="h-9 md:h-7 text-xs w-full bg-background font-medium"
                                        value={layer.glassType || ""}
                                        placeholder="Enter custom glass type..."
                                        onChange={(e) => {
                                          updateLayer(layerIdx, "glassType", e.target.value);
                                        }}
                                      />
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-9 w-9 md:h-7 md:w-7 text-muted-foreground hover:text-foreground shrink-0"
                                        title="Select from dropdown list"
                                        onClick={() => {
                                          updateLayer(layerIdx, "isCustomGlassType", false);
                                          const defaultType = GLASS_TYPES[0] || "Clear Glass";
                                          updateLayer(layerIdx, "glassType", defaultType);
                                          const rawProds = PRODUCTS_BY_TYPE[defaultType] || [];
                                          const firstItem = rawProds[0];
                                          if (firstItem) {
                                            const firstProd = formatProductNameForUnit(
                                              firstItem,
                                              inputUnit,
                                            );
                                            updateLayer(layerIdx, "productName", firstProd);
                                            updateLayer(layerIdx, "glassName", firstProd);
                                            const thk = extractThicknessFromProductName(firstProd);
                                            if (thk !== null)
                                              updateLayer(layerIdx, "thickness", thk);
                                          }
                                        }}
                                      >
                                        <ChevronDown className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                  ) : (
                                    <Select
                                      value={
                                        layer.glassType ||
                                        detectGlassTypeFromProduct(
                                          layer.productName || layer.glassName || "",
                                        )
                                      }
                                      onValueChange={(val) => {
                                        if (val === "__custom__") {
                                          updateLayer(layerIdx, "isCustomGlassType", true);
                                          updateLayer(layerIdx, "glassType", "");
                                        } else {
                                          updateLayer(layerIdx, "isCustomGlassType", false);
                                          updateLayer(layerIdx, "glassType", val);
                                          const rawProds = PRODUCTS_BY_TYPE[val] || [];
                                          const firstItem = rawProds[0];
                                          if (firstItem) {
                                            const firstProd = formatProductNameForUnit(
                                              firstItem,
                                              inputUnit,
                                            );
                                            updateLayer(layerIdx, "productName", firstProd);
                                            updateLayer(layerIdx, "glassName", firstProd);
                                            const thk = extractThicknessFromProductName(firstProd);
                                            if (thk !== null)
                                              updateLayer(layerIdx, "thickness", thk);
                                          }
                                        }
                                      }}
                                    >
                                      <SelectTrigger className="h-9 md:h-7 text-xs w-full bg-background border-border font-medium">
                                        <SelectValue placeholder="Select Glass Type" />
                                      </SelectTrigger>
                                      <SelectContent className="max-h-64">
                                        {GLASS_TYPES.map((gType, gIdx) => (
                                          <SelectItem key={gIdx} value={gType}>
                                            {gType}
                                          </SelectItem>
                                        ))}
                                        <SelectItem
                                          value="__custom__"
                                          className="font-semibold text-emerald-600 dark:text-emerald-400"
                                        >
                                          + Custom Glass Type
                                        </SelectItem>
                                      </SelectContent>
                                    </Select>
                                  )}
                                </div>

                                {/* 2. PRODUCT NAME Dropdown */}
                                <div className="order-4 col-span-2 md:order-none md:col-span-1">
                                  <span className="field-label md:hidden">Product name</span>
                                  {isCustomMode ? (
                                    <div className="flex items-center gap-1">
                                      <Input
                                        autoFocus
                                        className="h-9 md:h-7 text-xs w-full bg-background"
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
                                        className="h-9 w-9 md:h-7 md:w-7 text-muted-foreground hover:text-foreground shrink-0"
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
                                          const autoType = detectGlassTypeFromProduct(val);
                                          updateLayer(layerIdx, "glassType", autoType);
                                          const thk = extractThicknessFromProductName(val);
                                          if (thk !== null) {
                                            updateLayer(layerIdx, "thickness", thk);
                                          }
                                        }
                                      }}
                                    >
                                      <SelectTrigger className="h-9 md:h-7 text-xs w-full bg-background border-border">
                                        <SelectValue placeholder="Select Product Name" />
                                      </SelectTrigger>
                                      <SelectContent className="max-h-64">
                                        {(() => {
                                          const currentType =
                                            layer.glassType ||
                                            detectGlassTypeFromProduct(
                                              layer.productName || layer.glassName || "",
                                            );
                                          const rawProds =
                                            PRODUCTS_BY_TYPE[currentType] || BASE_GLASS_PRODUCTS;
                                          return rawProds.map((baseName, pIdx) => {
                                            const formattedName = formatProductNameForUnit(
                                              baseName,
                                              inputUnit,
                                            );
                                            return (
                                              <SelectItem key={pIdx} value={formattedName}>
                                                {formattedName}
                                              </SelectItem>
                                            );
                                          });
                                        })()}
                                        <SelectItem
                                          value="__custom__"
                                          className="font-semibold text-primary"
                                        >
                                          + Type Custom Product Name...
                                        </SelectItem>
                                      </SelectContent>
                                    </Select>
                                  )}
                                </div>
                                <div className="order-5 md:order-none">
                                  <span className="field-label md:hidden">Thickness (mm)</span>
                                  <Input
                                    type="text"
                                    inputMode="decimal"
                                    className="h-9 md:h-7 text-xs font-mono w-full text-center"
                                    value={layer.thickness || ""}
                                    onKeyDown={handleDecimalKeyDown}
                                    onChange={(e) => {
                                      const clean = e.target.value.replace(/[^0-9.]/g, "");
                                      e.target.value = clean;
                                      updateLayer(layerIdx, "thickness", clean);
                                    }}
                                  />
                                </div>
                                <div className="order-6 md:order-none">
                                  <span className="field-label md:hidden">Rate</span>
                                  <Input
                                    type="text"
                                    inputMode="decimal"
                                    className="h-9 md:h-7 text-xs font-mono w-full text-center"
                                    value={layer.rate || ""}
                                    onKeyDown={handleDecimalKeyDown}
                                    onChange={(e) => {
                                      const clean = e.target.value.replace(/[^0-9.]/g, "");
                                      e.target.value = clean;
                                      updateLayer(layerIdx, "rate", clean);
                                    }}
                                  />
                                </div>
                                <div className="order-2 flex items-end justify-end md:order-none md:items-center md:justify-center">
                                  <button
                                    title="Remove"
                                    aria-label="Remove item"
                                    className="h-9 w-9 md:h-7 md:w-7 flex items-center justify-center rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
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
                              <SwipeHint />
                              <div className="scroll-x -mx-3 sm:-mx-4 border rounded-md border-emerald-600/20">
                                <table
                                  className="w-full text-[11px] border-collapse"
                                  style={{
                                    minWidth:
                                      inputUnit === "mm"
                                        ? "1200px"
                                        : isFreqOn
                                          ? "1380px"
                                          : "1320px",
                                  }}
                                >
                                  <thead className="bg-emerald-500/10 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-300">
                                    <tr className="border-b border-emerald-600/30">
                                      <th
                                        rowSpan={2}
                                        className="py-2 px-2 text-[10px] font-bold uppercase tracking-wider text-center border-r border-emerald-600/20 align-middle w-10"
                                      >
                                        SR NO
                                      </th>

                                      {inputUnit !== "mm" && (
                                        <>
                                          {isFreqOn && (
                                            <th
                                              rowSpan={2}
                                              className="py-2 px-1 text-[10px] font-bold uppercase tracking-wider text-center border-r border-emerald-600/20 align-middle min-w-[55px]"
                                            >
                                              FREQ
                                            </th>
                                          )}
                                          <th
                                            rowSpan={2}
                                            className="py-2 px-2 text-[10px] font-bold uppercase tracking-wider text-center border-r border-emerald-600/20 align-middle min-w-[80px]"
                                          >
                                            <div>L1 IN</div>
                                            <div className="text-[8px] font-normal text-emerald-800/80 dark:text-emerald-400">
                                              (INCH)
                                            </div>
                                          </th>
                                          <th
                                            rowSpan={2}
                                            className="py-2 px-2 text-[10px] font-bold uppercase tracking-wider text-center border-r border-emerald-600/20 align-middle min-w-[80px]"
                                          >
                                            <div>L2 IN</div>
                                            <div className="text-[8px] font-normal text-emerald-800/80 dark:text-emerald-400">
                                              (INCH)
                                            </div>
                                          </th>
                                        </>
                                      )}

                                      <th
                                        colSpan={4}
                                        className="py-1.5 px-2 text-[10px] font-bold uppercase tracking-wider text-center border-r border-b border-emerald-600/20"
                                      >
                                        ACTUAL SIZE (ENTER)
                                      </th>

                                      <th
                                        rowSpan={2}
                                        className="py-2 px-2 text-[10px] font-bold uppercase tracking-wider text-center border-r border-emerald-600/20 align-middle min-w-[52px]"
                                      >
                                        HOLE
                                      </th>

                                      <th
                                        rowSpan={2}
                                        className="py-2 px-2 text-[10px] font-bold uppercase tracking-wider text-center border-r border-emerald-600/20 align-middle min-w-[60px]"
                                      >
                                        CUT OUT
                                      </th>

                                      <th
                                        rowSpan={2}
                                        className="py-2 px-2 text-[10px] font-bold uppercase tracking-wider text-center border-r border-emerald-600/20 align-middle min-w-[60px]"
                                      >
                                        <div>BIG</div>
                                        <div>HOLE</div>
                                      </th>

                                      <th
                                        rowSpan={2}
                                        className="py-2 px-2 text-[10px] font-bold uppercase tracking-wider text-center border-r border-emerald-600/20 align-middle min-w-[70px]"
                                      >
                                        <div>BIG</div>
                                        <div>CUT OUT</div>
                                      </th>

                                      <th
                                        rowSpan={2}
                                        className="py-2 px-2 text-[10px] font-bold uppercase tracking-wider text-center border-r border-emerald-600/20 align-middle min-w-[52px]"
                                      >
                                        CSK
                                      </th>

                                      <th
                                        colSpan={4}
                                        className="py-1.5 px-2 text-[10px] font-bold uppercase tracking-wider text-center border-r border-b border-emerald-600/20"
                                      >
                                        CHARGEABLE SIZE (MM)
                                      </th>

                                      <th
                                        rowSpan={2}
                                        className="py-2 px-2 text-[10px] font-bold uppercase tracking-wider text-right border-r border-emerald-600/20 align-middle min-w-[75px]"
                                      >
                                        AMOUNT
                                      </th>

                                      <th
                                        rowSpan={2}
                                        className="py-2 px-2 text-[10px] font-bold uppercase tracking-wider text-left border-r border-emerald-600/20 align-middle min-w-[100px]"
                                      >
                                        REMARK
                                      </th>

                                      <th
                                        rowSpan={2}
                                        className="py-2 px-1 text-[10px] font-bold uppercase tracking-wider text-center align-middle w-[52px]"
                                      ></th>
                                    </tr>

                                    <tr className="border-b-2 border-emerald-600/40">
                                      {/* Under ACTUAL SIZE (ENTER) */}
                                      <th className="py-1.5 px-2 text-[9px] font-bold uppercase tracking-wider text-center border-r border-emerald-600/20 min-w-[70px]">
                                        <div>HEIGHT</div>
                                        <div className="text-[8px] font-normal text-emerald-800/80 dark:text-emerald-400">
                                          (MM)
                                        </div>
                                      </th>
                                      <th className="py-1.5 px-2 text-[9px] font-bold uppercase tracking-wider text-center border-r border-emerald-600/20 min-w-[70px]">
                                        <div>WIDTH</div>
                                        <div className="text-[8px] font-normal text-emerald-800/80 dark:text-emerald-400">
                                          (MM)
                                        </div>
                                      </th>
                                      <th className="py-1.5 px-2 text-[9px] font-bold uppercase tracking-wider text-center border-r border-emerald-600/20 min-w-[45px]">
                                        PCS
                                      </th>
                                      <th className="py-1.5 px-2 text-[9px] font-bold uppercase tracking-wider text-center border-r border-emerald-600/20 min-w-[65px]">
                                        <div>AREA</div>
                                        <div className="text-[8px] font-normal lowercase tracking-normal">
                                          ({settings.rateUnit === "sqft" ? "sq. ft." : "sq mtr."})
                                        </div>
                                      </th>

                                      {/* Under CHARGEABLE SIZE (MM) */}
                                      <th className="py-1.5 px-2 text-[9px] font-bold uppercase tracking-wider text-center border-r border-emerald-600/20 min-w-[65px]">
                                        <div>HEIGHT</div>
                                        <div className="text-[8px] font-normal text-emerald-800/80 dark:text-emerald-400">
                                          (MM)
                                        </div>
                                        <div className="text-[8px] font-semibold text-emerald-700 dark:text-emerald-400 font-mono mt-0.5">
                                          {extraAreaLabel}
                                        </div>
                                      </th>
                                      <th className="py-1.5 px-2 text-[9px] font-bold uppercase tracking-wider text-center border-r border-emerald-600/20 min-w-[65px]">
                                        <div>WIDTH</div>
                                        <div className="text-[8px] font-normal text-emerald-800/80 dark:text-emerald-400">
                                          (MM)
                                        </div>
                                        <div className="text-[8px] font-semibold text-emerald-700 dark:text-emerald-400 font-mono mt-0.5">
                                          {extraAreaLabel}
                                        </div>
                                      </th>
                                      <th className="py-1.5 px-2 text-[9px] font-bold uppercase tracking-wider text-center border-r border-emerald-600/20 min-w-[45px]">
                                        PCS
                                      </th>
                                      <th className="py-1.5 px-2 text-[9px] font-bold uppercase tracking-wider text-center border-r border-emerald-600/20 min-w-[65px]">
                                        <div>AREA</div>
                                        <div className="text-[8px] font-normal lowercase tracking-normal">
                                          ({settings.rateUnit === "sqft" ? "sq. ft." : "sq mtr."})
                                        </div>
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
                                      const areaText = line?.ok
                                        ? settings.rateUnit === "sqft"
                                          ? String(line.totalSqft)
                                          : String(line.totalSqm)
                                        : "—";
                                      const chargeAreaText = line?.ok
                                        ? settings.rateUnit === "sqft"
                                          ? String(line.chargeAreaSqft)
                                          : String(line.chargeAreaSqm)
                                        : "—";

                                      return (
                                        <tr
                                          key={item.id || itemIdx}
                                          className={`hover:bg-muted/10 ${!line?.ok && (item.l1 || item.l2 || item.l1mm || item.l2mm) ? "bg-red-500/5" : ""}`}
                                        >
                                          {/* Sr No */}
                                          <td className="py-1.5 px-2 text-center text-muted-foreground font-mono w-10">
                                            <span className="text-xs font-semibold">
                                              {itemIdx + 1}
                                            </span>
                                          </td>

                                          {/* Inch Inputs (L1 IN & L2 IN) */}
                                          {inputUnit !== "mm" && (
                                            <>
                                              {isFreqOn && (
                                                <td className="py-1.5 px-1">
                                                  <Select
                                                    value={String(item.freq || 8)}
                                                    onValueChange={(v) =>
                                                      updateLayerItem(
                                                        layerIdx,
                                                        itemIdx,
                                                        "freq",
                                                        Number(v),
                                                      )
                                                    }
                                                  >
                                                    <SelectTrigger className="h-8 text-xs font-mono text-center w-full px-1 focus:ring-1">
                                                      <SelectValue>
                                                        {Number(item.freq) === 16 ? "1/16" : "1/8"}
                                                      </SelectValue>
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                      <SelectItem value="8">1/8</SelectItem>
                                                      <SelectItem value="16">1/16</SelectItem>
                                                    </SelectContent>
                                                  </Select>
                                                </td>
                                              )}
                                              <td className="py-1.5 px-1">
                                                <Input
                                                  className="h-8 text-xs font-mono text-center w-full"
                                                  value={item.l1 || ""}
                                                  onKeyDown={handleInchKeyDown}
                                                  onChange={(e) => {
                                                    const clean = e.target.value.replace(
                                                      /[^0-9 ./-]/g,
                                                      "",
                                                    );
                                                    e.target.value = clean;
                                                    updateLayerItem(layerIdx, itemIdx, "l1", clean);
                                                  }}
                                                  placeholder={isFreqOn ? "36 2" : "36 3/8"}
                                                />
                                              </td>
                                              <td className="py-1.5 px-1">
                                                <Input
                                                  className="h-8 text-xs font-mono text-center w-full"
                                                  value={item.l2 || ""}
                                                  onKeyDown={handleInchKeyDown}
                                                  onChange={(e) => {
                                                    const clean = e.target.value.replace(
                                                      /[^0-9 ./-]/g,
                                                      "",
                                                    );
                                                    e.target.value = clean;
                                                    updateLayerItem(layerIdx, itemIdx, "l2", clean);
                                                  }}
                                                  placeholder={isFreqOn ? "32 2" : "13 3/8"}
                                                />
                                              </td>
                                            </>
                                          )}

                                          {/* Actual Size Columns */}
                                          {inputUnit === "mm" ? (
                                            <>
                                              <td className="py-1.5 px-1">
                                                <Input
                                                  type="text"
                                                  inputMode="decimal"
                                                  className="h-8 text-xs font-mono text-center w-full"
                                                  value={item.l1mm ?? ""}
                                                  onKeyDown={handleDecimalKeyDown}
                                                  onChange={(e) => {
                                                    const clean = e.target.value.replace(
                                                      /[^0-9.]/g,
                                                      "",
                                                    );
                                                    e.target.value = clean;
                                                    updateLayerItem(
                                                      layerIdx,
                                                      itemIdx,
                                                      "l1mm",
                                                      clean,
                                                    );
                                                  }}
                                                  placeholder="60.3"
                                                />
                                              </td>
                                              <td className="py-1.5 px-1">
                                                <Input
                                                  type="text"
                                                  inputMode="decimal"
                                                  className="h-8 text-xs font-mono text-center w-full"
                                                  value={item.l2mm ?? ""}
                                                  onKeyDown={handleDecimalKeyDown}
                                                  onChange={(e) => {
                                                    const clean = e.target.value.replace(
                                                      /[^0-9.]/g,
                                                      "",
                                                    );
                                                    e.target.value = clean;
                                                    updateLayerItem(
                                                      layerIdx,
                                                      itemIdx,
                                                      "l2mm",
                                                      clean,
                                                    );
                                                  }}
                                                  placeholder="51.2"
                                                />
                                              </td>
                                            </>
                                          ) : (
                                            <>
                                              <td className="py-1.5 px-2 font-mono text-[11px] text-muted-foreground text-center whitespace-nowrap min-w-[70px]">
                                                {line?.ok ? line.lMM : "—"}
                                              </td>
                                              <td className="py-1.5 px-2 font-mono text-[11px] text-muted-foreground text-center whitespace-nowrap min-w-[70px]">
                                                {line?.ok ? line.wMM : "—"}
                                              </td>
                                            </>
                                          )}

                                          {/* PCS (Qty) */}
                                          <td className="py-1.5 px-1">
                                            <Input
                                              type="text"
                                              inputMode="numeric"
                                              className="h-8 text-xs font-mono text-center w-full"
                                              value={item.qty || ""}
                                              onKeyDown={handleIntegerKeyDown}
                                              onChange={(e) => {
                                                const s = e.target.value.replace(/[^0-9]/g, "");
                                                e.target.value = s;
                                                updateLayerItem(
                                                  layerIdx,
                                                  itemIdx,
                                                  "qty",
                                                  s === "" ? "" : Number(s),
                                                );
                                              }}
                                            />
                                          </td>

                                          {/* Actual Area */}
                                          <td className="py-1.5 px-2 font-mono text-[11px] text-center text-muted-foreground min-w-[65px]">
                                            {areaText}
                                          </td>

                                          {/* Hole */}
                                          <td className="py-1.5 px-1">
                                            <Input
                                              type="text"
                                              inputMode="numeric"
                                              className="h-8 text-xs font-mono text-center w-full"
                                              value={item.holes || ""}
                                              onKeyDown={handleIntegerKeyDown}
                                              onChange={(e) => {
                                                const s = e.target.value.replace(/[^0-9]/g, "");
                                                e.target.value = s;
                                                updateLayerItem(
                                                  layerIdx,
                                                  itemIdx,
                                                  "holes",
                                                  s === "" ? "" : Number(s),
                                                );
                                              }}
                                            />
                                          </td>

                                          {/* Cut Out */}
                                          <td className="py-1.5 px-1">
                                            <Input
                                              type="text"
                                              inputMode="numeric"
                                              className="h-8 text-xs font-mono text-center w-full"
                                              value={item.cutouts || ""}
                                              onKeyDown={handleIntegerKeyDown}
                                              onChange={(e) => {
                                                const s = e.target.value.replace(/[^0-9]/g, "");
                                                e.target.value = s;
                                                updateLayerItem(
                                                  layerIdx,
                                                  itemIdx,
                                                  "cutouts",
                                                  s === "" ? "" : Number(s),
                                                );
                                              }}
                                            />
                                          </td>

                                          {/* Big Hole */}
                                          <td className="py-1.5 px-1">
                                            <Input
                                              type="text"
                                              inputMode="numeric"
                                              className="h-8 text-xs font-mono text-center w-full"
                                              value={item.bigHoles || ""}
                                              onKeyDown={handleIntegerKeyDown}
                                              onChange={(e) => {
                                                const s = e.target.value.replace(/[^0-9]/g, "");
                                                e.target.value = s;
                                                updateLayerItem(
                                                  layerIdx,
                                                  itemIdx,
                                                  "bigHoles",
                                                  s === "" ? "" : Number(s),
                                                );
                                              }}
                                            />
                                          </td>

                                          {/* Big Cut Out */}
                                          <td className="py-1.5 px-1">
                                            <Input
                                              type="text"
                                              inputMode="numeric"
                                              className="h-8 text-xs font-mono text-center w-full"
                                              value={item.bigCutouts || ""}
                                              onKeyDown={handleIntegerKeyDown}
                                              onChange={(e) => {
                                                const s = e.target.value.replace(/[^0-9]/g, "");
                                                e.target.value = s;
                                                updateLayerItem(
                                                  layerIdx,
                                                  itemIdx,
                                                  "bigCutouts",
                                                  s === "" ? "" : Number(s),
                                                );
                                              }}
                                            />
                                          </td>

                                          {/* CSK */}
                                          <td className="py-1.5 px-1">
                                            <Input
                                              type="text"
                                              inputMode="numeric"
                                              className="h-8 text-xs font-mono text-center w-full"
                                              value={item.csks || item.countersinks || ""}
                                              onKeyDown={handleIntegerKeyDown}
                                              onChange={(e) => {
                                                const s = e.target.value.replace(/[^0-9]/g, "");
                                                e.target.value = s;
                                                updateLayerItem(
                                                  layerIdx,
                                                  itemIdx,
                                                  "csks",
                                                  s === "" ? "" : Number(s),
                                                );
                                              }}
                                            />
                                          </td>

                                          {/* Chargeable Height (MM) */}
                                          <td className="py-1.5 px-2 font-mono text-[11px] text-center text-muted-foreground whitespace-nowrap min-w-[65px]">
                                            {line?.ok ? line.lChgMM : "—"}
                                          </td>

                                          {/* Chargeable Width (MM) */}
                                          <td className="py-1.5 px-2 font-mono text-[11px] text-center text-muted-foreground whitespace-nowrap min-w-[65px]">
                                            {line?.ok ? line.wChgMM : "—"}
                                          </td>

                                          {/* Chargeable PCS */}
                                          <td className="py-1.5 px-2 font-mono text-[11px] text-center text-muted-foreground min-w-[45px]">
                                            {line?.ok ? item.qty : "—"}
                                          </td>

                                          {/* Chargeable Area (SQ MTR.) */}
                                          <td className="py-1.5 px-2 font-mono text-[11px] text-center text-emerald-700 dark:text-emerald-400 font-medium min-w-[65px]">
                                            {chargeAreaText}
                                          </td>

                                          {/* Amount */}
                                          <td className="py-1.5 px-2 font-mono font-semibold text-xs text-right whitespace-nowrap min-w-[75px]">
                                            {line?.ok ? (
                                              nf(line.amount)
                                            ) : (
                                              <span className="text-muted-foreground/40">—</span>
                                            )}
                                          </td>

                                          {/* Remark */}
                                          <td className="py-1.5 px-1 min-w-[120px]">
                                            <RemarkCell
                                              value={item.remark || ""}
                                              onChange={(val) =>
                                                updateLayerItem(layerIdx, itemIdx, "remark", val)
                                              }
                                            />
                                          </td>

                                          {/* Actions */}
                                          <td className="py-1.5 px-1 w-[52px]">
                                            <div className="flex items-center gap-0.5">
                                              <button
                                                title="Duplicate"
                                                className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                                onClick={() =>
                                                  duplicateLayerItemRow(layerIdx, itemIdx)
                                                }
                                              >
                                                <Copy className="h-3 w-3" />
                                              </button>
                                              <button
                                                title="Remove"
                                                className="h-7 w-7 flex items-center justify-center rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                                                onClick={() =>
                                                  removeLayerItemRow(layerIdx, itemIdx)
                                                }
                                              >
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
            </div>

            {/* ════ RIGHT COLUMN: Totals Panel ════ */}
            <div className="space-y-4">
              <div className="bg-card border border-border rounded-lg overflow-hidden xl:sticky xl:top-16 shadow-sm">
                <div className="px-3.5 py-2.5 border-b border-border bg-emerald-500/5 flex items-center justify-between gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                    <span className="w-1.5 h-3.5 rounded-full bg-emerald-500 inline-block" />
                    Totals
                  </span>
                  <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                    •{" "}
                    {settings.rateUnit === "sqft"
                      ? "SQ.FT"
                      : settings.rateUnit === "piece"
                        ? "PIECE"
                        : "SQ.MTR"}{" "}
                    {settings.areaRounding === "round" ? "ROUND" : "EXACT"}
                  </span>
                </div>

                <div className="p-3 sm:p-4 text-xs space-y-2 font-sans">
                  <div className="flex justify-between items-baseline py-1 border-b border-border/30 last:border-0">
                    <span className="text-muted-foreground">Pieces</span>
                    <span className="font-mono font-semibold text-foreground">
                      {totals.qty || 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline py-1 border-b border-border/30 last:border-0">
                    <span className="text-muted-foreground">Area (Sq.Mtr)</span>
                    <span className="font-mono font-semibold text-foreground">
                      {totals.sqm ?? "0.000"}
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline py-1 border-b border-border/30 last:border-0">
                    <span className="text-muted-foreground">Sq.Ft/Sq.Mtr</span>
                    <span className="font-mono font-semibold text-foreground">
                      {totals.sqft ?? "0.000"} / {totals.sqm ?? "0.000"}
                    </span>
                  </div>

                  <div className="flex justify-between items-baseline py-1 border-b border-border/30 last:border-0">
                    <span className="text-muted-foreground">Glass amount</span>
                    <span className="font-mono font-medium text-foreground">
                      ₹ {nf(totals.glassAmount ?? 0)}
                    </span>
                  </div>

                  {Boolean(totals.holeCharge) && (
                    <div className="flex justify-between items-baseline py-1 border-b border-border/30 last:border-0">
                      <span className="text-muted-foreground">
                        Hole charge {totals.holes ? `(${totals.holes} pcs)` : ""}
                      </span>
                      <span className="font-mono font-medium text-foreground">
                        ₹ {nf(totals.holeCharge)}
                      </span>
                    </div>
                  )}
                  {Boolean(totals.cutoutCharge) && (
                    <div className="flex justify-between items-baseline py-1 border-b border-border/30 last:border-0">
                      <span className="text-muted-foreground">
                        Cutout charge {totals.cutouts ? `(${totals.cutouts} pcs)` : ""}
                      </span>
                      <span className="font-mono font-medium text-foreground">
                        ₹ {nf(totals.cutoutCharge)}
                      </span>
                    </div>
                  )}
                  {Boolean(totals.bigHoleCharge) && (
                    <div className="flex justify-between items-baseline py-1 border-b border-border/30 last:border-0">
                      <span className="text-muted-foreground">
                        Big Hole charge {totals.bigHoles ? `(${totals.bigHoles} pcs)` : ""}
                      </span>
                      <span className="font-mono font-medium text-foreground">
                        ₹ {nf(totals.bigHoleCharge)}
                      </span>
                    </div>
                  )}
                  {Boolean(totals.bigCutoutCharge) && (
                    <div className="flex justify-between items-baseline py-1 border-b border-border/30 last:border-0">
                      <span className="text-muted-foreground">
                        Big Cutout charge {totals.bigCutouts ? `(${totals.bigCutouts} pcs)` : ""}
                      </span>
                      <span className="font-mono font-medium text-foreground">
                        ₹ {nf(totals.bigCutoutCharge)}
                      </span>
                    </div>
                  )}
                  {Boolean(totals.cskCharge || totals.countersinkCharge) && (
                    <div className="flex justify-between items-baseline py-1 border-b border-border/30 last:border-0">
                      <span className="text-muted-foreground">
                        CSK charge{" "}
                        {totals.csks || totals.countersinks
                          ? `(${totals.csks || totals.countersinks} pcs)`
                          : ""}
                      </span>
                      <span className="font-mono font-medium text-foreground">
                        ₹ {nf(totals.cskCharge || totals.countersinkCharge)}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between items-baseline py-1 border-b border-border/30 last:border-0">
                    <span className="text-muted-foreground">Basic amount</span>
                    <span className="font-mono font-medium text-foreground">
                      ₹ {nf(totals.basicAmount ?? 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline py-1 border-b border-border/30 last:border-0">
                    <span className="text-muted-foreground">Admin charge</span>
                    <span className="font-mono font-medium text-foreground">
                      ₹ {nf(totals.adminCharge ?? 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline py-1 border-b border-border/30 last:border-0 font-medium">
                    <span className="text-muted-foreground">Total</span>
                    <span className="font-mono text-foreground">₹ {nf(totals.subTotal ?? 0)}</span>
                  </div>
                  <div className="flex justify-between items-baseline py-1 border-b border-border/30 last:border-0">
                    <span className="text-muted-foreground">
                      Insurance {inv.insurancePct ?? 2}%
                    </span>
                    <span className="font-mono text-foreground">₹ {nf(totals.insurance ?? 0)}</span>
                  </div>
                  <div className="flex justify-between items-baseline py-1 border-b border-border/30 last:border-0 font-semibold">
                    <span className="text-foreground">Assessable value</span>
                    <span className="font-mono text-foreground">
                      ₹ {nf(totals.assessableValue ?? 0)}
                    </span>
                  </div>

                  {inv.gstType === "igst" ? (
                    <div className="flex justify-between items-baseline py-1 border-b border-border/30 last:border-0">
                      <span className="text-muted-foreground">I-GST {inv.taxPct ?? 18}%</span>
                      <span className="font-mono text-foreground">₹ {nf(totals.igst ?? 0)}</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between items-baseline py-1 border-b border-border/30 last:border-0">
                        <span className="text-muted-foreground">
                          C-GST {(inv.taxPct ?? 18) / 2}%
                        </span>
                        <span className="font-mono text-foreground">₹ {nf(totals.cgst ?? 0)}</span>
                      </div>
                      <div className="flex justify-between items-baseline py-1 border-b border-border/30 last:border-0">
                        <span className="text-muted-foreground">
                          S-GST {(inv.taxPct ?? 18) / 2}%
                        </span>
                        <span className="font-mono text-foreground">₹ {nf(totals.sgst ?? 0)}</span>
                      </div>
                    </>
                  )}

                  <div className="flex justify-between items-baseline py-1 border-b border-border/30 last:border-0">
                    <span className="text-muted-foreground">Gross total</span>
                    <span className="font-mono font-medium text-foreground">
                      ₹ {nf(totals.grossTotal ?? 0)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-2 px-2.5 bg-emerald-500/10 dark:bg-emerald-500/5 rounded-md border border-emerald-500/20 mt-3">
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      Grand total
                    </span>
                    <span className="font-mono font-bold text-lg text-emerald-600 dark:text-emerald-400">
                      ₹ {nf(totals.grandTotal ?? 0)}
                    </span>
                  </div>

                  <div className="pt-2 text-[11px] text-muted-foreground leading-normal border-t border-border/30 mt-3 font-medium">
                    <span className="font-semibold text-foreground">Amount in words:</span>{" "}
                    {totals.amountInWords}
                  </div>

                  <div className="pt-4 mt-4 border-t border-border">
                    <Button
                      size="lg"
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 shadow-md"
                      onClick={() => {
                        const ok = saveInvoice();
                        if (ok && inv.id) {
                          navigate({ to: "/invoice", search: { id: inv.id } });
                        }
                      }}
                    >
                      <Save className="h-4 w-4" /> Save & Print PI
                    </Button>
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

      {/* Confirm Payment & Order Modal */}
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
            navigate({ to: "/booking", search: { view: undefined } as any, replace: true });
          }
        }}
        onEdit={(item) => {
          loadInvoice(item.id, false);
          setShowForm(true);
          setDetailOpen(false);
        }}
      />
    </div>
  );
}
