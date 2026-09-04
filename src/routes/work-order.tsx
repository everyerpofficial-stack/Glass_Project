import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import {
  Printer,
  FileText,
  Factory,
  Tag,
  ChevronDown,
  RefreshCw,
  Download,
  Grid,
  Search,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGQ } from "@/lib/store";
import { ListSkeleton } from "@/components/app/DataSkeleton";
import { nf, dmy, liveWorkOrders, workOrderBelongsTo, formatOrderId } from "@/lib/gq";
import { printElement } from "@/lib/print";
import { toast } from "sonner";

export const Route = createFileRoute("/work-order")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { tab?: string | undefined; woId?: string | undefined } => ({
    tab: typeof search["tab"] === "string" ? (search["tab"] as string) : undefined,
    woId: typeof search["woId"] === "string" ? (search["woId"] as string) : undefined,
  }),
  component: WorkOrderPage,
});

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

/* ── Searchable Order & Customer Selector Component ────────────────────────── */
function SearchableOrderSelector({
  confirmedOrders,
  selectedOrderId,
  onSelectOrder,
  loading = false,
}: {
  confirmedOrders: any[];
  selectedOrderId: string;
  onSelectOrder: (orderId: string) => void;
  loading?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedCustFilter, setSelectedCustFilter] = useState("all");

  const uniqueCustomers = useMemo(() => {
    const set = new Set<string>();
    confirmedOrders.forEach((o) => {
      if (o.cust?.name) set.add(o.cust.name);
    });
    return Array.from(set).sort();
  }, [confirmedOrders]);

  const filteredOrders = useMemo(() => {
    return confirmedOrders.filter((o) => {
      const q = search.toLowerCase().trim();
      const custName = String(o.cust?.name || "").toLowerCase();
      const orderNo = String(o.no || o.orderNo || "").toLowerCase();
      const poNo = String(o.poNo || "").toLowerCase();
      const phone = String(o.cust?.phone || "").toLowerCase();

      const matchesSearch =
        !q || custName.includes(q) || orderNo.includes(q) || poNo.includes(q) || phone.includes(q);

      const matchesCust =
        selectedCustFilter === "all" ||
        String(o.cust?.name || "").toLowerCase() === selectedCustFilter.toLowerCase();

      return matchesSearch && matchesCust;
    });
  }, [confirmedOrders, search, selectedCustFilter]);

  const selectedOrder = useMemo(
    () => confirmedOrders.find((o) => o.id === selectedOrderId),
    [confirmedOrders, selectedOrderId],
  );

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-between gap-2 border border-amber-500/50 rounded-md h-8 px-2.5 bg-background text-xs cursor-pointer hover:border-amber-600 focus:outline-none transition-colors shadow-xs w-56 sm:w-72"
      >
        <span className="truncate font-mono font-semibold text-foreground flex items-center gap-1.5 min-w-0">
          <Factory className="h-3.5 w-3.5 text-amber-500 shrink-0" />
          <span className="truncate">
            {selectedOrder
              ? `${selectedOrder.no || selectedOrder.orderNo} — ${selectedOrder.cust?.name || "Order"}`
              : "Select order / customer…"}
          </span>
        </span>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-9 z-50 bg-popover border border-border rounded-lg shadow-2xl w-80 sm:w-[420px] max-h-96 flex flex-col overflow-hidden animate-in fade-in-50 zoom-in-95">
            {/* Search & Customer Filter Header */}
            <div className="p-2.5 border-b border-border bg-muted/40 space-y-2 sticky top-0 z-10">
              <div className="relative flex items-center">
                <Search className="h-3.5 w-3.5 absolute left-2.5 text-muted-foreground" />
                <input
                  autoFocus
                  className="w-full bg-background border border-border rounded px-8 py-1.5 text-xs outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 placeholder:text-muted-foreground"
                  placeholder={`Search ${confirmedOrders.length} confirmed orders (Name, PI, PO)...`}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button
                    type="button"
                    className="absolute right-2 text-xs text-muted-foreground hover:text-foreground font-bold"
                    onClick={() => setSearch("")}
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Filter by Customer dropdown */}
              {uniqueCustomers.length > 0 && (
                <div className="flex items-center gap-1.5 text-[11px]">
                  <span className="text-muted-foreground shrink-0 font-medium">
                    Filter Customer:
                  </span>
                  <select
                    className="flex-1 bg-background border border-border rounded px-2 py-1 text-xs outline-none font-medium truncate"
                    value={selectedCustFilter}
                    onChange={(e) => setSelectedCustFilter(e.target.value)}
                  >
                    <option value="all">All Customers ({uniqueCustomers.length})</option>
                    {uniqueCustomers.map((cust) => (
                      <option key={cust} value={cust}>
                        {cust}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* List of Orders */}
            <div className="overflow-y-auto divide-y divide-border/30 max-h-72">
              {loading ? (
                <ListSkeleton rows={4} />
              ) : filteredOrders.length === 0 ? (
                <div className="p-4 text-center text-xs text-muted-foreground">
                  No matching confirmed orders found
                </div>
              ) : (
                filteredOrders.map((o) => {
                  const isSel = o.id === selectedOrderId;
                  return (
                    <div
                      key={o.id}
                      className={`p-2.5 text-xs hover:bg-amber-500/10 cursor-pointer transition-colors ${
                        isSel ? "bg-amber-500/15 font-semibold" : ""
                      }`}
                      onClick={() => {
                        onSelectOrder(o.id);
                        setOpen(false);
                      }}
                    >
                      <div className="flex items-center justify-between font-mono">
                        <span className="font-bold text-amber-700 dark:text-amber-400">
                          {o.no || o.orderNo}
                        </span>
                        <span className="text-[10px] text-muted-foreground">{o.date}</span>
                      </div>
                      <div className="text-foreground truncate font-bold text-sm mt-0.5">
                        {o.cust?.name || "Unnamed Customer"}
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-1">
                        <span>
                          {o.items?.length || 0} items {o.poNo ? `• PO: ${o.poNo}` : ""}
                        </span>
                        <span className="font-mono text-emerald-600 font-semibold">
                          ₹ {nf(o.totals?.grandTotal || 0)}
                        </span>
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

/* ─── Main Work Order & Stickers Page ─────────────────────────────────── */
function WorkOrderPage() {
  const searchParams = useSearch({ strict: false }) as { tab?: string; woId?: string };

  const {
    invoices,
    workOrders,
    settings,
    generateWorkOrder,
    saveWorkOrder,
    updateInvoiceStatus,
    hydrated,
  } = useGQ();

  const [activeTab, setActiveTab] = useState<"cutsheet" | "stickers">(
    searchParams?.tab === "stickers" ? "stickers" : "cutsheet",
  );
  const [selectedOrderId, setSelectedOrderId] = useState<string>("");
  const [activeWO, setActiveWO] = useState<any>(null);
  const [labelsPerRow, setLabelsPerRow] = useState<number>(4);

  useEffect(() => {
    if (searchParams?.tab === "stickers" || searchParams?.tab === "cutsheet") {
      setActiveTab(searchParams.tab);
    }
  }, [searchParams?.tab]);

  /* Get confirmed or proforma orders available for work order workflow */
  const confirmedOrders = useMemo(
    () =>
      invoices.filter(
        (x) =>
          x.status === "order_confirmed" ||
          x.status === "work_order_generated" ||
          x.docType === "proforma",
      ),
    [invoices],
  );

  const targetWoId = searchParams?.woId;

  /* Orders this page has already auto-generated a work order for, in this
     mount. The background sheet poll replaces `invoices` and `workOrders` with
     new arrays every 30s, which re-runs the effect below; without this guard a
     round-trip where the freshly-saved work order has not landed in the sheet
     yet makes the effect generate *another* one — a new uid each pass, piling
     duplicate rows into the WorkOrders tab. */
  const autoGenerated = useRef<Set<string>>(new Set());

  /* Work orders whose invoice still exists.
     An orphan — a work order left behind by a deleted Proforma Invoice — used
     to reach the two effects below and put them in a standoff: the first sees
     no active work order and adopts workOrders[0], the second sees that its
     invoice is gone and clears it, and round it goes. The page ended up
     rendering a cut sheet for an invoice that no longer existed, with an empty
     items table, which is exactly what deleting every invoice produced.
     Filtering here settles it: an orphan is never adopted, never listed in the
     selector, and never printed. */
  const availableWorkOrders = useMemo(
    () => liveWorkOrders(workOrders, invoices),
    [workOrders, invoices],
  );

  const findWorkOrderFor = useCallback(
    (key: string) =>
      availableWorkOrders.find(
        (x: any) =>
          x.id === key ||
          x.woNo === key ||
          x.orderId === key ||
          x.orderNo === key ||
          x.piNo === key,
      ),
    [availableWorkOrders],
  );

  // Auto-set and generate active WO from searchParams or available orders
  useEffect(() => {
    const adopt = (order: any) => {
      setSelectedOrderId(order.id);
      const existing = findWorkOrderFor(order.id);
      if (existing) {
        setActiveWO(existing);
        return;
      }
      if (autoGenerated.current.has(order.id)) return;
      autoGenerated.current.add(order.id);
      const generated = generateWorkOrder(order.id);
      if (generated) {
        saveWorkOrder(generated);
        updateInvoiceStatus(order.id, "work_order_generated");
        setActiveWO(generated);
      }
    };

    if (targetWoId) {
      const wo = findWorkOrderFor(targetWoId);
      if (wo) {
        setActiveWO(wo);
        if (wo.orderId) setSelectedOrderId(wo.orderId);
        return;
      }
      const invMatch = invoices.find(
        (x) => x.id === targetWoId || x.no === targetWoId || x.orderNo === targetWoId,
      );
      if (invMatch) {
        adopt(invMatch);
      } else if (invoices.length && !autoGenerated.current.has("__missing:" + targetWoId)) {
        /* A link pointed at something that is neither a work order nor an
           invoice (a stale bookmark, or a caller that passed the wrong key).
           Say so once instead of silently rendering an empty page. */
        autoGenerated.current.add("__missing:" + targetWoId);
        toast.error(`No order or work order found for "${targetWoId}"`);
      }
      return;
    }

    if (activeWO) return;
    if (availableWorkOrders.length > 0) {
      const first = availableWorkOrders[0];
      setActiveWO(first);
      if (first.orderId) setSelectedOrderId(first.orderId);
    } else if (confirmedOrders.length > 0) {
      adopt(confirmedOrders[0]);
    }
  }, [
    availableWorkOrders,
    invoices,
    confirmedOrders,
    targetWoId,
    activeWO,
    findWorkOrderFor,
    generateWorkOrder,
    saveWorkOrder,
    updateInvoiceStatus,
  ]);

  /* Clear the open work order once its invoice is gone — deleting a Proforma
     Invoice must empty the cut sheet and the sticker sheet with it. Uses the
     same workOrderBelongsTo rule the delete cascade does, so the two can never
     disagree and leave a document on screen for a record that is not there. */
  useEffect(() => {
    if (!activeWO) return;
    const stillExists = invoices.some((x) => workOrderBelongsTo(activeWO, x));
    if (!stillExists) {
      setActiveWO(null);
      setSelectedOrderId("");
    }
  }, [invoices, activeWO]);

  const handleSelectOrder = (orderId: string) => {
    setSelectedOrderId(orderId);
    const existingWO = availableWorkOrders.find(
      (w: any) => w.orderId === orderId || w.orderNo === orderId,
    );
    if (existingWO) {
      setActiveWO(existingWO);
      toast.success(`Loaded Work Order #${existingWO.woNo}`);
    } else {
      const wo = generateWorkOrder(orderId);
      if (wo) {
        saveWorkOrder(wo);
        updateInvoiceStatus(orderId, "work_order_generated");
        setActiveWO(wo);
        toast.success(`Work order #${wo.woNo} generated!`);
      }
    }
  };

  const handleGenerateWO = () => {
    if (!selectedOrderId) {
      toast.error("Select an order first");
      return;
    }
    handleSelectOrder(selectedOrderId);
  };

  const handleLoadExisting = (woId: string) => {
    const wo = workOrders.find((x) => x.id === woId);
    if (wo) {
      setActiveWO(wo);
      if (wo.orderId) setSelectedOrderId(wo.orderId);
    }
  };

  /* Print just the document, out of the live page — the cut sheet in landscape,
     the sticker sheet in portrait. A bare window.print() sent the whole route to
     paper, sidebar and toolbar included. */
  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = () => {
    if (
      !printElement(printRef.current, {
        orientation: activeTab === "cutsheet" ? "landscape" : "portrait",
      })
    ) {
      toast.error("Nothing to print yet.");
    }
  };

  /* Product-grouped pieces for Work Order Cut Sheet */
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

  /* Build sticker labels data from active work order */
  const labels = useMemo(() => {
    if (!activeWO || !activeWO.pieces) return [];
    return activeWO.pieces.map((piece: any, idx: number) => ({
      customer: activeWO.customer || "Customer",
      piNo: activeWO.piNo || activeWO.orderNo,
      woNo: activeWO.woNo?.replace("WO-", "") || activeWO.orderNo,
      size: `${piece.heightMM} X ${piece.widthMM}`,
      sn: piece.sr,
      glassType:
        activeWO.glassDesc || `${activeWO.thickness || 5}mm ${activeWO.productName || "Glass"}`,
      pieceOf: piece.pieceOf || `1 of ${activeWO.pieces.length}`,
      shape: piece.shape || "BLOCK",
      code: `${idx + 1} ${piece.shape === "BLOCK" ? "W1" : "SD1"}`,
      partyWO: activeWO.orderNo,
      barcode: piece.barcode || `000${idx + 1}`,
    }));
  }, [activeWO]);

  return (
    <div className="min-h-screen bg-background">
      {/* ── UNIFIED TABS TOP BAR ───────────────────────── */}
      <div className="bg-muted/40 border-b border-border px-3 sm:px-6 py-2 flex items-center justify-between gap-2 text-xs font-semibold flex-wrap print:hidden">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground mr-1 text-[11px] font-bold uppercase tracking-wider">
            Production Section:
          </span>
          <button
            onClick={() => setActiveTab("cutsheet")}
            className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${
              activeTab === "cutsheet"
                ? "bg-amber-600 text-white font-bold shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
            }`}
          >
            <Factory className="h-3.5 w-3.5" />
            1. Work Order Cut Sheet
          </button>
          <button
            onClick={() => setActiveTab("stickers")}
            className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${
              activeTab === "stickers"
                ? "bg-yellow-500 text-black font-bold shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
            }`}
          >
            <Tag className="h-3.5 w-3.5" />
            2. Barcode Sticker Labels
          </button>
        </div>

        {activeWO && (
          <div className="text-[11px] text-muted-foreground flex items-center gap-2">
            <span className="font-mono font-bold text-foreground bg-muted px-2 py-0.5 rounded border border-border">
              {activeWO.woNo}
            </span>
            <span className="hidden sm:inline font-semibold">{activeWO.customer}</span>
          </div>
        )}
      </div>

      {/* ── PAGE HEADER ───────────────────────────── */}
      <div className="border-b border-border bg-card px-3 sm:px-6 py-3 print:hidden">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-0.5">
              <Link to="/" className="hover:text-foreground transition-colors">
                Home
              </Link>
              {" / "}
              <span className="text-primary">Work Order & Stickers</span>
            </div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground leading-tight flex items-center gap-2">
              {activeTab === "cutsheet" ? (
                <>
                  <Factory className="h-5 w-5 text-amber-500" />
                  Work Order Cut Sheet
                </>
              ) : (
                <>
                  <Tag className="h-5 w-5 text-yellow-500" />
                  Barcode Sticker Labels
                </>
              )}
              {activeWO && (
                <span className="text-amber-500 text-sm font-mono">#{activeWO.woNo}</span>
              )}
            </h1>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Searchable Order & Customer Selector */}
            <SearchableOrderSelector
              confirmedOrders={confirmedOrders}
              selectedOrderId={selectedOrderId}
              onSelectOrder={handleSelectOrder}
              loading={!hydrated}
            />

            <Button
              size="sm"
              className="h-8 text-xs gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold"
              onClick={handleGenerateWO}
            >
              <Factory className="h-3.5 w-3.5" /> Generate WO
            </Button>

            {/* Sticker Layout Selector (Only shown on Stickers tab) */}
            {activeTab === "stickers" && (
              <Select
                value={String(labelsPerRow)}
                onValueChange={(v) => setLabelsPerRow(Number(v))}
              >
                <SelectTrigger className="h-8 text-xs w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 per row</SelectItem>
                  <SelectItem value="2">2 per row</SelectItem>
                  <SelectItem value="3">3 per row</SelectItem>
                  <SelectItem value="4">4 per row</SelectItem>
                </SelectContent>
              </Select>
            )}

            {activeWO && (
              <Button
                size="sm"
                className={`h-8 text-xs gap-1.5 font-bold ${
                  activeTab === "stickers"
                    ? "bg-yellow-500 hover:bg-yellow-600 text-black"
                    : "bg-slate-800 hover:bg-slate-900 text-white"
                }`}
                onClick={handlePrint}
              >
                <Printer className="h-3.5 w-3.5" />
                {activeTab === "stickers" ? "Print Sticker Labels" : "Print Cut Sheet"}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT AREA ──────────────────────────── */}
      <div className="p-3 sm:p-4">
        {!activeWO ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-4">
              <Factory className="h-8 w-8 text-amber-500/60" />
            </div>
            <h2 className="text-lg font-semibold text-foreground mb-1">No Work Order Selected</h2>
            <p className="text-sm text-muted-foreground max-w-md">
              Search & select a confirmed order from the dropdown above to create a work order and
              barcode stickers.
            </p>
          </div>
        ) : activeTab === "cutsheet" ? (
          /* ══════════ TAB 1: WORK ORDER CUT SHEET ══════════ */
          <div
            ref={printRef}
            className="wo-print-area bg-white text-black rounded-lg border border-border shadow-sm overflow-hidden print:shadow-none print:border-none print:rounded-none"
          >
            {/* WO Header */}
            <div className="border-b-2 border-black p-4 print:p-3">
              <div className="flex justify-between items-start">
                <div className="text-[11px] space-y-0.5">
                  <div>
                    <span className="font-bold">Customer :</span> {activeWO.customer}
                  </div>
                  <div>
                    <span className="font-bold">PI No. :</span> {activeWO.piNo}
                  </div>
                  <div>
                    <span className="font-bold">PI Date :</span> {dmy(activeWO.piDate)}
                  </div>
                  <div>
                    <span className="font-bold">Dispatch To :</span> {activeWO.dispatchTo || "—"}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-black tracking-wide text-black">WORK ORDER</div>
                  <div className="text-[11px] mt-1 space-y-0.5">
                    <div>
                      <span className="font-bold">Order No :</span>{" "}
                      <span className="font-mono text-sm font-bold">
                        {formatOrderId(activeWO.orderNo)}
                      </span>
                    </div>
                    <div>
                      <span className="font-bold">Our Date :</span> {dmy(activeWO.piDate)}
                    </div>
                    <div>
                      <span className="font-bold">Del Date :</span> —
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-gray-300 text-[11px]">
                <div>
                  <span className="font-bold">PO No. :</span> {activeWO.poNo || "—"} &nbsp;&nbsp;{" "}
                  <span className="font-bold">Project :</span> {activeWO.project || "—"}
                </div>
                <div className="mt-1 font-bold text-sm">
                  {activeWO.glassDesc || `${activeWO.thickness}mm ${activeWO.productName}`}
                </div>
                {activeWO.layerInfo?.length > 0 && (
                  <div className="text-[10px] text-gray-600 mt-0.5">
                    {activeWO.layerInfo.map((l: any, i: number) => (
                      <span key={i}>
                        {l.layerNo}: {l.productName} {l.thickness}mm
                        {i < activeWO.layerInfo.length - 1 ? " | " : ""}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* WO Product-Grouped Tables */}
            <div className="overflow-x-auto space-y-4">
              {woProductGroups.length === 0 ? (
                <div className="p-4 text-center text-xs text-muted-foreground">
                  No pieces recorded
                </div>
              ) : (
                woProductGroups.map((grp: any, gIdx: number) => {
                  const grpSqm = grp.pieces.reduce(
                    (sum: number, p: any) => sum + (Number(p.area) || 0),
                    0,
                  );
                  const grpPcs = grp.pieces.length;
                  const woUnit = activeWO?.inputUnit || "inch";
                  const isFreqOn = woUnit !== "mm" && Boolean(activeWO?.frequencyEnabled);
                  const isMM = woUnit === "mm";

                  const cutsheetHeaders = isMM
                    ? [
                        "SR\nNo",
                        "Height\nMM",
                        "Width\nMM",
                        "Qty",
                        "Act Totl",
                        "Hole",
                        "Big\nHole",
                        "Cut Out",
                        "Big\nCutout",
                        "Shape",
                        "Barcode",
                        "Remark",
                      ]
                    : isFreqOn
                      ? [
                          "SR\nNo",
                          "Freq",
                          "L1-Inch",
                          "L2-Inch",
                          "Height\nMM",
                          "Width\nMM",
                          "Qty",
                          "Act Totl",
                          "Hole",
                          "Big\nHole",
                          "Cut Out",
                          "Big\nCutout",
                          "Shape",
                          "Barcode",
                          "Remark",
                        ]
                      : [
                          "SR\nNo",
                          "L1-Inch",
                          "L2-Inch",
                          "Height\nMM",
                          "Width\nMM",
                          "Qty",
                          "Act Totl",
                          "Hole",
                          "Big\nHole",
                          "Cut Out",
                          "Big\nCutout",
                          "Shape",
                          "Barcode",
                          "Remark",
                        ];

                  return (
                    <div key={gIdx} className="border border-black overflow-hidden">
                      {/* Product Banner Header */}
                      <div className="bg-gray-100 border-b border-black px-3 py-1.5 font-bold text-[11px] uppercase flex items-center justify-between">
                        <span>
                          Item {gIdx + 1}: {grp.title}
                        </span>
                        <span className="text-[10px] font-mono font-normal">
                          {grpPcs} Pcs • {nf(grpSqm, 3)} SQM
                        </span>
                      </div>

                      <table
                        className="w-full text-[10px] border-collapse"
                        style={{ minWidth: isMM ? "750px" : "900px" }}
                      >
                        <thead>
                          <tr className="bg-gray-50 border-b border-black">
                            {cutsheetHeaders.map((h, i) => (
                              <th
                                key={i}
                                className="border border-gray-400 px-1.5 py-1 text-[9px] font-bold uppercase text-black whitespace-pre-line text-center"
                              >
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {grp.pieces.map((piece: any, idx: number) => {
                            const freqLabel = Number(piece.freq) === 16 ? "1/16" : "1/8";
                            return (
                              <tr key={idx} className="border-b border-gray-300 hover:bg-gray-50">
                                <td className="border border-gray-300 px-1.5 py-1 text-center font-bold">
                                  {piece.sr}
                                </td>
                                {!isMM && isFreqOn && (
                                  <td className="border border-gray-300 px-1.5 py-1 text-center font-mono">
                                    {freqLabel}
                                  </td>
                                )}
                                {!isMM && (
                                  <>
                                    <td className="border border-gray-300 px-1.5 py-1 text-center font-mono">
                                      {piece.l1 || "—"}
                                    </td>
                                    <td className="border border-gray-300 px-1.5 py-1 text-center font-mono">
                                      {piece.l2 || "—"}
                                    </td>
                                  </>
                                )}
                                <td className="border border-gray-300 px-1.5 py-1 text-center font-mono font-semibold">
                                  {piece.heightMM}
                                </td>
                                <td className="border border-gray-300 px-1.5 py-1 text-center font-mono font-semibold">
                                  {piece.widthMM}
                                </td>
                                <td className="border border-gray-300 px-1.5 py-1 text-center font-bold">
                                  {piece.qty}
                                </td>
                                <td className="border border-gray-300 px-1.5 py-1 text-right font-mono">
                                  {nf(piece.area, 3)}
                                </td>
                                <td className="border border-gray-300 px-1.5 py-1 text-center">
                                  {piece.hole || ""}
                                </td>
                                <td className="border border-gray-300 px-1.5 py-1 text-center">
                                  {piece.bigHole || ""}
                                </td>
                                <td className="border border-gray-300 px-1.5 py-1 text-center">
                                  {piece.cutOut || ""}
                                </td>
                                <td className="border border-gray-300 px-1.5 py-1 text-center">
                                  {piece.bigCutout || ""}
                                </td>
                                <td className="border border-gray-300 px-1.5 py-1 text-center font-bold">
                                  {piece.shape}
                                </td>
                                <td className="border border-gray-300 px-1.5 py-1 text-center font-mono text-[9px]">
                                  {piece.barcode}
                                </td>
                                <td className="border border-gray-300 px-1.5 py-1 text-center text-[9px]">
                                  {piece.remark}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot>
                          <tr className="bg-gray-100 border-t border-black font-bold">
                            <td
                              colSpan={isMM ? 3 : isFreqOn ? 6 : 5}
                              className="border border-gray-400 px-2 py-1 text-right"
                            >
                              Subtotal (Item {gIdx + 1})
                            </td>
                            <td className="border border-gray-400 px-1.5 py-1 text-center">
                              {grpPcs}
                            </td>
                            <td className="border border-gray-400 px-1.5 py-1 text-right font-mono">
                              {nf(grpSqm, 3)}
                            </td>
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
                <div>
                  {nf(activeWO.totalSqm, 3)} SQM &nbsp;|&nbsp; {nf(activeWO.totalSqft, 3)} SQFT
                  &nbsp;|&nbsp; Weight: {activeWO.weightKg || "—"} kg
                </div>
              </div>
            </div>

            {/* WO Footer */}
            <div className="p-3 border-t-2 border-black text-[10px] flex justify-between print:p-2">
              <div>
                <span className="font-bold">Wastage :</span> — &nbsp;&nbsp;
                <span className="font-bold">Total Pcs :</span> {activeWO.totalPieces} &nbsp;&nbsp;
                <span className="font-bold">Weight :</span> {activeWO.weightKg || "—"} kg
              </div>
              <div className="text-right text-gray-500">Page 1</div>
            </div>
          </div>
        ) : (
          /* ══════════ TAB 2: BARCODE STICKER LABELS ══════════ */
          <div ref={printRef} className="sticker-print-area">
            {/* Info bar */}
            <div className="mb-4 flex items-center justify-between text-xs text-muted-foreground print:hidden">
              <span className="font-semibold">
                {labels.length} label(s) generated for {activeWO.customer}
              </span>
              <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                WO: {activeWO.woNo}
              </span>
            </div>

            {/* Labels Grid */}
            <div
              className="grid gap-3 print:gap-0"
              style={{
                gridTemplateColumns: `repeat(${labelsPerRow}, 1fr)`,
              }}
            >
              {labels.map((label: any, idx: number) => (
                <div
                  key={idx}
                  className="sticker-label bg-[#FFD700] text-black rounded-lg print:rounded-none border-2 border-yellow-700/30 p-3 print:p-2 flex flex-col gap-1 break-inside-avoid shadow-xs"
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
                    <span className="font-bold">of {label.pieceOf?.split(" of ")[1] || "1"}</span>
                  </div>

                  {/* Shape + Code */}
                  <div className="flex items-center justify-between text-[10px]">
                    <div className="font-black text-sm">{label.shape}</div>
                    <div className="text-[9px]">
                      <span className="font-bold">Code :</span> {label.code}
                    </div>
                  </div>

                  {/* Party WO */}
                  <div className="text-[9px]">
                    <span className="font-bold">Party WO :</span> {label.partyWO}
                  </div>

                  {/* Barcode */}
                  <div className="flex flex-col items-center mt-auto pt-1">
                    <div
                      className="barcode-container"
                      dangerouslySetInnerHTML={{
                        __html: generateBarcodeSVG(label.barcode, 30, 1.0),
                      }}
                    />
                    <div className="text-[9px] font-mono font-bold mt-0.5 tracking-wider">
                      {label.barcode}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
