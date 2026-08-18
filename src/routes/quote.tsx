import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import {
  Plus,
  Trash2,
  Save,
  Printer,
  RefreshCw,
  Copy,
  Search,
  UserCheck,
  AlertCircle,
  ChevronDown,
  ChevronUp,
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
import { blankItem, G, nf } from "@/lib/gq";
import { toast } from "sonner";

export const Route = createFileRoute("/quote")({
  component: QuoteBuilder,
});

/* ─── shared UI helpers ───────────────────────────────────────────────── */
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
}: {
  title: string;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 border-b border-border bg-muted/30 gap-2 flex-wrap">
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

/* label → value row for the Totals panel */
function TRow({
  label,
  value,
  bold,
  muted,
}: {
  label: string;
  value: string | number;
  bold?: boolean;
  muted?: boolean;
}) {
  return (
    <div
      className={`flex justify-between items-baseline py-[3px] text-[11px] border-b border-border/30 last:border-0 ${
        muted ? "opacity-60" : ""
      }`}
    >
      <span className="text-muted-foreground">{label}</span>
      <span
        className={`font-mono tabular-nums ${
          bold ? "font-semibold text-foreground" : "text-foreground"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

/* ─── Mobile item card ────────────────────────────────────────────────── */
function MobileItemCard({
  item,
  idx,
  line,
  settings,
  invGlassDesc,
  invGlassDefaultRate,
  updateItem,
  duplicateItemRow,
  removeItemRow,
}: {
  item: any;
  idx: number;
  line: any;
  settings: any;
  invGlassDesc: string;
  invGlassDefaultRate: any;
  updateItem: (index: number, field: string, val: any) => void;
  duplicateItemRow: (index: number) => void;
  removeItemRow: (index: number) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const isL1Valid = item.l1 ? G.parseInch(item.l1).ok : true;
  const isL2Valid = item.l2 ? G.parseInch(item.l2).ok : true;
  const mmText = line?.ok ? `${line.lMM}×${line.wMM}` : "—";
  const areaText = line?.ok
    ? settings.rateUnit === "sqft"
      ? String(line.totalSqft)
      : String(line.totalSqm)
    : "—";

  return (
    <div
      className={`rounded-lg border ${
        !line?.ok && (item.l1 || item.l2) ? "border-destructive/50 bg-red-500/5" : "border-border bg-card"
      } overflow-hidden`}
    >
      {/* Card header */}
      <div className="flex items-center justify-between px-3 py-2 bg-muted/30 border-b border-border/50">
        <div className="flex items-center gap-2">
          <span className="flex items-center justify-center h-5 w-5 rounded bg-primary/10 text-primary text-[10px] font-bold font-mono">
            {idx + 1}
          </span>
          <span className="text-xs font-medium text-foreground truncate max-w-[140px]">
            {item.desc || invGlassDesc || `Item ${idx + 1}`}
          </span>
          {line?.ok && (
            <span className="text-[10px] font-mono font-semibold text-emerald-600 dark:text-emerald-400">
              ₹{nf(line.amount)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            title="Duplicate"
            className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => duplicateItemRow(idx)}
          >
            <Copy className="h-3 w-3" />
          </button>
          <button
            title="Remove"
            className="h-7 w-7 flex items-center justify-center rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
            onClick={() => removeItemRow(idx)}
          >
            <Trash2 className="h-3 w-3" />
          </button>
          <button
            className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted text-muted-foreground transition-colors"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="p-3 space-y-2.5">
          {/* Row 1: Description */}
          <div>
            <FieldLabel>Description</FieldLabel>
            <Input
              className="h-8 text-xs w-full"
              value={item.desc || ""}
              onChange={(e) => updateItem(idx, "desc", e.target.value)}
              placeholder={invGlassDesc || "Glass description"}
            />
          </div>

          {/* Row 2: Dimensions */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <FieldLabel>L1 (inch)</FieldLabel>
              <Input
                className={`h-8 text-xs font-mono text-center ${!isL1Valid && item.l1 ? "border-destructive" : ""}`}
                value={item.l1 || ""}
                onChange={(e) => updateItem(idx, "l1", e.target.value)}
                placeholder="36 3/8"
              />
            </div>
            <div>
              <FieldLabel>L2 (inch)</FieldLabel>
              <Input
                className={`h-8 text-xs font-mono text-center ${!isL2Valid && item.l2 ? "border-destructive" : ""}`}
                value={item.l2 || ""}
                onChange={(e) => updateItem(idx, "l2", e.target.value)}
                placeholder="13 3/8"
              />
            </div>
            <div>
              <FieldLabel>MM (auto)</FieldLabel>
              <div className="h-8 flex items-center px-2 rounded-md border border-border bg-muted/30 text-[11px] font-mono text-muted-foreground">
                {mmText}
              </div>
            </div>
          </div>

          {/* Row 3: QTY / Holes / Cutouts / Area */}
          <div className="grid grid-cols-4 gap-2">
            <div>
              <FieldLabel>QTY</FieldLabel>
              <Input
                type="number"
                className="h-8 text-xs font-mono text-center"
                value={item.qty || ""}
                min={1}
                onChange={(e) => updateItem(idx, "qty", e.target.value === "" ? "" : Number(e.target.value))}
              />
            </div>
            <div>
              <FieldLabel>Holes</FieldLabel>
              <Input
                type="number"
                className="h-8 text-xs font-mono text-center"
                value={item.holes || ""}
                min={0}
                onChange={(e) => updateItem(idx, "holes", e.target.value === "" ? "" : Number(e.target.value))}
              />
            </div>
            <div>
              <FieldLabel>Cutouts</FieldLabel>
              <Input
                type="number"
                className="h-8 text-xs font-mono text-center"
                value={item.cutouts || ""}
                min={0}
                onChange={(e) => updateItem(idx, "cutouts", e.target.value === "" ? "" : Number(e.target.value))}
              />
            </div>
            <div>
              <FieldLabel>Area</FieldLabel>
              <div className="h-8 flex items-center px-2 rounded-md border border-border bg-muted/30 text-[11px] font-mono text-muted-foreground">
                {areaText}
              </div>
            </div>
          </div>

          {/* Row 4: Rate / Amount / Remark */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <FieldLabel>Rate</FieldLabel>
              <Input
                type="number"
                className="h-8 text-xs font-mono text-center"
                value={item.rate ?? ""}
                onChange={(e) => updateItem(idx, "rate", e.target.value === "" ? "" : Number(e.target.value))}
                placeholder={String(invGlassDefaultRate || "")}
              />
            </div>
            <div>
              <FieldLabel>Amount</FieldLabel>
              <div className="h-8 flex items-center justify-end px-2 rounded-md border border-border bg-muted/30 text-[11px] font-mono font-semibold text-foreground">
                {line?.ok ? nf(line.amount) : <span className="text-muted-foreground/40">—</span>}
              </div>
            </div>
            <div>
              <FieldLabel>Remark</FieldLabel>
              <Input
                className="h-8 text-xs"
                value={item.remark || ""}
                onChange={(e) => updateItem(idx, "remark", e.target.value)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── main component ──────────────────────────────────────────────────── */
function QuoteBuilder() {
  const navigate = useNavigate();
  const {
    inv,
    setInv,
    totals,
    settings,
    customers,
    saveInvoice,
    saveCustomer,
    newInvoice,
  } = useGQ();

  const [custSearch, setCustSearch] = useState("");
  const [custDropOpen, setCustDropOpen] = useState(false);
  const [calcItem, setCalcItem] = useState(0);

  /* ── field helpers ── */
  const updateInvField = (path: string, val: any) => {
    setInv((prev: any) => {
      const copy = JSON.parse(JSON.stringify(prev));
      const parts = path.split(".");
      let target: any = copy;
      for (let i = 0; i < parts.length - 1; i++) {
        const key = parts[i];
        if (key && target && typeof target === "object") target = target[key];
      }
      const lastKey = parts[parts.length - 1];
      if (lastKey && target && typeof target === "object") target[lastKey] = val;
      return copy;
    });
  };

  const updateItem = (index: number, field: string, val: any) => {
    setInv((prev) => {
      const copy = JSON.parse(JSON.stringify(prev));
      copy.items[index][field] = val;
      return copy;
    });
  };

  const addItemRow = () => {
    setInv((prev) => {
      const copy = JSON.parse(JSON.stringify(prev));
      copy.items.push(blankItem());
      return copy;
    });
  };

  const removeItemRow = (index: number) => {
    setInv((prev) => {
      if (prev.items.length <= 1) {
        toast.error("At least one line item is required");
        return prev;
      }
      const copy = JSON.parse(JSON.stringify(prev));
      copy.items.splice(index, 1);
      return copy;
    });
  };

  const duplicateItemRow = (index: number) => {
    setInv((prev) => {
      const copy = JSON.parse(JSON.stringify(prev));
      const dup = { ...copy.items[index], id: "it-" + Date.now() };
      copy.items.splice(index + 1, 0, dup);
      return copy;
    });
  };

  /* ── customer search ── */
  const filteredCustomers = useMemo(
    () =>
      customers.filter((c) =>
        c.name?.toLowerCase().includes(custSearch.toLowerCase())
      ),
    [customers, custSearch]
  );

  const selectCustomer = (c: any) => {
    setInv((prev) => ({ ...prev, cust: { ...c } }));
    setCustSearch("");
    setCustDropOpen(false);
    toast.success(`Loaded ${c.name}`);
  };

  /* ── calc trace ── */
  const selectedLine = totals.lines?.[calcItem];
  const gstType = inv.ch?.gstType || "cgst_sgst";

  return (
    <div className="min-h-screen bg-background">

      {/* ── PAGE HEADER ───────────────────────────── */}
      <div className="border-b border-border bg-card px-3 sm:px-6 py-3">
        {/* Top row: title + breadcrumb */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-0.5">
              <Link to="/quotes" className="hover:text-foreground transition-colors">
                Glass Quote
              </Link>
              {" / "}
              <span className="text-primary">New Invoice</span>
            </div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground leading-tight">
              {inv._saved ? inv.no : "New invoice"}
            </h1>
            <p className="text-[11px] text-muted-foreground mt-0.5 hidden sm:block">
              Enter sizes in inches. Everything else is calculated.
            </p>
          </div>

          {/* Action buttons — wrap on small screens */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={newInvoice}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Start fresh</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={() => {
                saveInvoice();
                navigate({ to: "/invoice", search: { id: inv.id } });
              }}
            >
              <Printer className="h-3.5 w-3.5" />
              <span className="hidden xs:inline">Print</span>
              <span className="hidden sm:inline"> / Save PDF</span>
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={saveInvoice}
            >
              <Save className="h-3.5 w-3.5" />
              Save
            </Button>
          </div>
        </div>
      </div>

      {/* ── CONTENT ───────────────────────────────── */}
      <div className="space-y-4 p-3 sm:p-4">

        {/* 1. Invoice details */}
        <Section
          title="Invoice details"
          headerRight={
            <span className="text-[10px] text-muted-foreground">
              {inv._saved ? "Saved" : "Draft"}{" "}
              {new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
            </span>
          }
        >
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <FieldLabel>Proforma No.</FieldLabel>
              <Input
                className="h-8 text-xs font-mono"
                value={inv.no || ""}
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
              <FieldLabel>Party PO No.</FieldLabel>
              <Input
                className="h-8 text-xs"
                value={inv.poNo || ""}
                onChange={(e) => updateInvField("poNo", e.target.value)}
                placeholder="—"
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
          </div>
        </Section>

        {/* 2. Customer */}
        <Section
          title="Customer"
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
                    onChange={(e) => { setCustSearch(e.target.value); setCustDropOpen(true); }}
                    onFocus={() => setCustDropOpen(true)}
                  />
                </div>
                {custDropOpen && filteredCustomers.length > 0 && (
                  <div className="absolute right-0 top-8 z-50 bg-popover border border-border rounded-md shadow-lg w-52 max-h-48 overflow-y-auto">
                    {filteredCustomers.map((c) => (
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
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => {
                  if (!String(inv.cust?.name || "").trim()) {
                    toast.error("Enter a customer name first");
                    return;
                  }
                  saveCustomer(inv.cust);
                }}
              >
                <UserCheck className="h-3 w-3" />
                <span className="hidden sm:inline">Save to customers</span>
                <span className="sm:hidden">Save</span>
              </Button>
            </div>
          }
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <FieldLabel>M/S. — Customer Name</FieldLabel>
              <Input className="h-8 text-xs" value={inv.cust?.name || ""} onChange={(e) => updateInvField("cust.name", e.target.value)} />
            </div>
            <div>
              <FieldLabel>GSTIN</FieldLabel>
              <Input className="h-8 text-xs font-mono" value={inv.cust?.gstin || ""} onChange={(e) => updateInvField("cust.gstin", e.target.value)} />
            </div>
            <div>
              <FieldLabel>Phone</FieldLabel>
              <Input className="h-8 text-xs" value={inv.cust?.phone || ""} onChange={(e) => updateInvField("cust.phone", e.target.value)} />
            </div>
            <div>
              <FieldLabel>Email</FieldLabel>
              <Input className="h-8 text-xs" value={inv.cust?.email || ""} onChange={(e) => updateInvField("cust.email", e.target.value)} />
            </div>
            <div>
              <FieldLabel>Billing Address</FieldLabel>
              <Textarea rows={3} className="text-xs resize-none" value={inv.cust?.addr || ""} onChange={(e) => updateInvField("cust.addr", e.target.value)} />
            </div>
            <div>
              <FieldLabel>Dispatch To</FieldLabel>
              <Textarea rows={3} className="text-xs resize-none" value={inv.cust?.ship || ""} onChange={(e) => updateInvField("cust.ship", e.target.value)} />
            </div>
            <div>
              <FieldLabel>Project Remark</FieldLabel>
              <Input className="h-8 text-xs" value={inv.projectRemark || ""} onChange={(e) => updateInvField("projectRemark", e.target.value)} />
            </div>
            <div>
              <FieldLabel>Order No.</FieldLabel>
              <Input className="h-8 text-xs" value={inv.orderNo || ""} onChange={(e) => updateInvField("orderNo", e.target.value)} />
            </div>
          </div>
        </Section>

        {/* 3. Glass specification */}
        <Section title="Glass specification">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <FieldLabel>Description of Goods</FieldLabel>
              <Input
                className="h-8 text-xs"
                value={inv.glass?.desc || ""}
                onChange={(e) => updateInvField("glass.desc", e.target.value)}
                placeholder="5 MM Grey Tinted T.G."
              />
            </div>
            <div>
              <FieldLabel>Thickness (MM)</FieldLabel>
              <Input
                type="number"
                className="h-8 text-xs font-mono"
                value={inv.glass?.thickness || ""}
                onChange={(e) => updateInvField("glass.thickness", Number(e.target.value))}
                placeholder="5"
              />
            </div>
            <div>
              <FieldLabel>Batch / Lot No.</FieldLabel>
              <Input
                className="h-8 text-xs font-mono"
                value={inv.glass?.batchNo || ""}
                onChange={(e) => updateInvField("glass.batchNo", e.target.value)}
              />
            </div>
            <div>
              <FieldLabel>Default Rate</FieldLabel>
              <Input
                type="number"
                className="h-8 text-xs font-mono"
                value={inv.glass?.defaultRate ?? ""}
                onChange={(e) =>
                  updateInvField("glass.defaultRate", e.target.value === "" ? "" : Number(e.target.value))
                }
                placeholder="807"
              />
            </div>
          </div>
        </Section>

        {/* 4. Items */}
        <Section
          title="Items"
          headerRight={
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="text-[10px] text-muted-foreground hidden sm:inline">
                Rate is per {settings.rateUnit === "sqft" ? "Sq.Ft" : "Sq.Mtr"}
              </span>
              <Button size="sm" className="h-6 text-[11px] px-2 gap-1" onClick={addItemRow}>
                <Plus className="h-3 w-3" /> Add Item
              </Button>
            </div>
          }
        >
          {/* ── Mobile card view (< md) ── */}
          <div className="md:hidden space-y-3">
            {inv.items.map((item: any, idx: number) => {
              const line = totals.lines?.[idx];
              return (
                <MobileItemCard
                  key={item.id || idx}
                  item={item}
                  idx={idx}
                  line={line}
                  settings={settings}
                  invGlassDesc={inv.glass?.desc || ""}
                  invGlassDefaultRate={inv.glass?.defaultRate}
                  updateItem={updateItem}
                  duplicateItemRow={duplicateItemRow}
                  removeItemRow={removeItemRow}
                />
              );
            })}
          </div>

          {/* ── Desktop table view (≥ md) ── */}
          <div className="hidden md:block overflow-x-auto -mx-4">
            <table className="w-full text-[11px] border-collapse" style={{ minWidth: "880px" }}>
              <thead>
                <tr className="border-b border-border bg-muted/20">
                  {["#", "Description", "L1 Inch", "L2 Inch", "MM", "QTY", "Hole", "Cut", "Area", "Rate", "Amount", "Remark", ""].map(
                    (h, i) => (
                      <th
                        key={i}
                        className="py-2 px-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground whitespace-nowrap text-left"
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {inv.items.map((item: any, idx: number) => {
                  const line = totals.lines?.[idx];
                  const isL1Valid = item.l1 ? G.parseInch(item.l1).ok : true;
                  const isL2Valid = item.l2 ? G.parseInch(item.l2).ok : true;
                  const mmText = line?.ok ? `${line.lMM}×${line.wMM}` : "—";
                  const areaText = line?.ok
                    ? settings.rateUnit === "sqft"
                      ? String(line.totalSqft)
                      : String(line.totalSqm)
                    : "—";

                  return (
                    <tr
                      key={item.id || idx}
                      className={`hover:bg-muted/10 ${!line?.ok && (item.l1 || item.l2) ? "bg-red-500/5" : ""}`}
                    >
                      <td className="py-1.5 px-2 text-center text-muted-foreground font-mono w-10">
                        <div className="flex flex-col items-center leading-none">
                          <span className="text-[9px]">Item</span>
                          <span className="text-xs font-semibold">{idx + 1}</span>
                        </div>
                      </td>
                      <td className="py-1.5 px-1">
                        <Input
                          className="h-8 text-xs w-full min-w-[90px]"
                          value={item.desc || ""}
                          onChange={(e) => updateItem(idx, "desc", e.target.value)}
                          placeholder={inv.glass?.desc || "Glass"}
                        />
                      </td>
                      <td className="py-1.5 px-1">
                        <Input
                          className={`h-8 text-xs font-mono text-center w-[80px] ${!isL1Valid && item.l1 ? "border-destructive" : ""}`}
                          value={item.l1 || ""}
                          onChange={(e) => updateItem(idx, "l1", e.target.value)}
                          placeholder="36 3/8"
                        />
                      </td>
                      <td className="py-1.5 px-1">
                        <Input
                          className={`h-8 text-xs font-mono text-center w-[80px] ${!isL2Valid && item.l2 ? "border-destructive" : ""}`}
                          value={item.l2 || ""}
                          onChange={(e) => updateItem(idx, "l2", e.target.value)}
                          placeholder="13 3/8"
                        />
                      </td>
                      <td className="py-1.5 px-2 font-mono text-[11px] text-muted-foreground whitespace-nowrap w-[90px]">
                        {mmText}
                      </td>
                      <td className="py-1.5 px-1">
                        <Input
                          type="number"
                          className="h-8 text-xs font-mono text-center w-[44px]"
                          value={item.qty || ""}
                          min={1}
                          onChange={(e) =>
                            updateItem(idx, "qty", e.target.value === "" ? "" : Number(e.target.value))
                          }
                        />
                      </td>
                      <td className="py-1.5 px-1">
                        <Input
                          type="number"
                          className="h-8 text-xs font-mono text-center w-[44px]"
                          value={item.holes || ""}
                          min={0}
                          onChange={(e) =>
                            updateItem(idx, "holes", e.target.value === "" ? "" : Number(e.target.value))
                          }
                        />
                      </td>
                      <td className="py-1.5 px-1">
                        <Input
                          type="number"
                          className="h-8 text-xs font-mono text-center w-[44px]"
                          value={item.cutouts || ""}
                          min={0}
                          onChange={(e) =>
                            updateItem(idx, "cutouts", e.target.value === "" ? "" : Number(e.target.value))
                          }
                        />
                      </td>
                      <td className="py-1.5 px-2 font-mono text-[11px] text-muted-foreground w-[70px]">
                        {areaText}
                      </td>
                      <td className="py-1.5 px-1">
                        <Input
                          type="number"
                          className="h-8 text-xs font-mono text-center w-[62px]"
                          value={item.rate ?? ""}
                          onChange={(e) =>
                            updateItem(idx, "rate", e.target.value === "" ? "" : Number(e.target.value))
                          }
                          placeholder={String(inv.glass?.defaultRate || "")}
                        />
                      </td>
                      <td className="py-1.5 px-2 font-mono font-semibold text-xs text-right whitespace-nowrap w-[80px]">
                        {line?.ok ? nf(line.amount) : <span className="text-muted-foreground/40">—</span>}
                      </td>
                      <td className="py-1.5 px-1">
                        <Input
                          className="h-8 text-xs min-w-[72px]"
                          value={item.remark || ""}
                          onChange={(e) => updateItem(idx, "remark", e.target.value)}
                        />
                      </td>
                      <td className="py-1.5 px-1 w-[52px]">
                        <div className="flex items-center gap-0.5">
                          <button
                            title="Duplicate"
                            className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                            onClick={() => duplicateItemRow(idx)}
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                          <button
                            title="Remove"
                            className="h-7 w-7 flex items-center justify-center rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                            onClick={() => removeItemRow(idx)}
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

        {/* 5. Charges & Tax */}
        <Section title="Charges &amp; tax for this invoice">
          <div className="space-y-3">
            {/* Row 1: wastage */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <FieldLabel>Wastage</FieldLabel>
                <Select value={inv.ch?.wastageMode || "none"} onValueChange={(v) => updateInvField("ch.wastageMode", v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="manual">Manual area</SelectItem>
                    <SelectItem value="percent">Percentage %</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <FieldLabel>Wastage Area</FieldLabel>
                <Input type="number" className="h-8 text-xs font-mono" value={inv.ch?.wastageArea || ""}
                  onChange={(e) => updateInvField("ch.wastageArea", e.target.value === "" ? "" : Number(e.target.value))}
                  disabled={inv.ch?.wastageMode === "none"} />
              </div>
              <div>
                <FieldLabel>Wastage Rate</FieldLabel>
                <Input type="number" className="h-8 text-xs font-mono" value={inv.ch?.wastageRate || ""}
                  onChange={(e) => updateInvField("ch.wastageRate", e.target.value === "" ? "" : Number(e.target.value))} />
              </div>
              <div>
                <FieldLabel>Template Charge</FieldLabel>
                <Input type="number" className="h-8 text-xs font-mono" value={inv.ch?.templateCharge || ""}
                  onChange={(e) => updateInvField("ch.templateCharge", e.target.value === "" ? "" : Number(e.target.value))} />
              </div>
            </div>

            {/* Row 2: other charges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <FieldLabel>Other Charges</FieldLabel>
                <Input type="number" className="h-8 text-xs font-mono" value={inv.ch?.otherCharges || ""}
                  onChange={(e) => updateInvField("ch.otherCharges", e.target.value === "" ? "" : Number(e.target.value))} />
              </div>
              <div>
                <FieldLabel>Admin Charge</FieldLabel>
                <Input type="number" className="h-8 text-xs font-mono" value={inv.ch?.adminCharge || ""}
                  onChange={(e) => updateInvField("ch.adminCharge", e.target.value === "" ? "" : Number(e.target.value))} />
              </div>
              <div>
                <FieldLabel>Discount %</FieldLabel>
                <Input type="number" className="h-8 text-xs font-mono" value={inv.ch?.discountPercent || ""}
                  onChange={(e) => updateInvField("ch.discountPercent", e.target.value === "" ? "" : Number(e.target.value))} />
              </div>
              <div>
                <FieldLabel>Insurance %</FieldLabel>
                <Input type="number" className="h-8 text-xs font-mono" value={inv.ch?.insurancePercent || ""}
                  onChange={(e) => updateInvField("ch.insurancePercent", e.target.value === "" ? "" : Number(e.target.value))} />
              </div>
            </div>

            {/* Row 3: GST */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <FieldLabel>GST Type</FieldLabel>
                <Select value={gstType} onValueChange={(v) => updateInvField("ch.gstType", v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cgst_sgst">CGST + SGST</SelectItem>
                    <SelectItem value="igst">IGST</SelectItem>
                    <SelectItem value="none">Exempt</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <FieldLabel>CGST %</FieldLabel>
                <Input type="number" className="h-8 text-xs font-mono" value={inv.ch?.cgstPercent || ""}
                  onChange={(e) => updateInvField("ch.cgstPercent", e.target.value === "" ? "" : Number(e.target.value))}
                  disabled={gstType !== "cgst_sgst"} />
              </div>
              <div>
                <FieldLabel>SGST %</FieldLabel>
                <Input type="number" className="h-8 text-xs font-mono" value={inv.ch?.sgstPercent || ""}
                  onChange={(e) => updateInvField("ch.sgstPercent", e.target.value === "" ? "" : Number(e.target.value))}
                  disabled={gstType !== "cgst_sgst"} />
              </div>
              <div>
                <FieldLabel>IGST %</FieldLabel>
                <Input type="number" className="h-8 text-xs font-mono" value={inv.ch?.igstPercent || ""}
                  onChange={(e) => updateInvField("ch.igstPercent", e.target.value === "" ? "" : Number(e.target.value))}
                  disabled={gstType !== "igst"} />
              </div>
            </div>

            {/* Row 4: commission + roundoff */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <FieldLabel>Commission</FieldLabel>
                <Select value={inv.ch?.commissionMode || "none"} onValueChange={(v) => updateInvField("ch.commissionMode", v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="percent">Percent %</SelectItem>
                    <SelectItem value="fixed">Fixed ₹</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <FieldLabel>Commission Value</FieldLabel>
                <Input type="number" className="h-8 text-xs font-mono" value={inv.ch?.commissionValue || ""}
                  onChange={(e) => updateInvField("ch.commissionValue", e.target.value === "" ? "" : Number(e.target.value))}
                  disabled={inv.ch?.commissionMode === "none"} />
              </div>
              <div>
                <FieldLabel>Commission On</FieldLabel>
                <Select value={inv.ch?.commissionBase || "basic"} onValueChange={(v) => updateInvField("ch.commissionBase", v)}
                  disabled={inv.ch?.commissionMode === "none"}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basic">Basic amount</SelectItem>
                    <SelectItem value="glass">Glass amount</SelectItem>
                    <SelectItem value="grand">Grand total</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <FieldLabel>Round Off Total</FieldLabel>
                <Select
                  value={String(inv.ch?.roundOff) === "1" || inv.ch?.roundOff === 1 ? "yes" : "no"}
                  onValueChange={(v) => updateInvField("ch.roundOff", v === "yes" ? 1 : 0)}
                >
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {inv.ch?.commissionMode !== "none" && (
              <p className="text-[11px] text-muted-foreground italic">
                Commission is tracked for you only. It never appears on the customer's invoice.
              </p>
            )}
          </div>
        </Section>

        {/* 6. How this was calculated */}
        <div className="bg-[#1a1a1a] border border-border/50 rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 border-b border-white/10 flex-wrap gap-2">
            <span className="text-[11px] font-semibold text-white/80 uppercase tracking-widest">
              How this was calculated
            </span>
            <div className="relative">
              <select
                className="appearance-none bg-white/10 text-white text-[11px] border border-white/20 rounded px-2 py-1 pr-6 cursor-pointer outline-none focus:ring-1 focus:ring-white/30"
                value={calcItem}
                onChange={(e) => setCalcItem(Number(e.target.value))}
              >
                {inv.items.map((_: any, idx: number) => (
                  <option key={idx} value={idx} className="bg-[#1a1a1a]">
                    Item {idx + 1}
                  </option>
                ))}
              </select>
              <ChevronDown className="h-3 w-3 text-white/50 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
          <div className="p-3 sm:p-4">
            {selectedLine && !selectedLine.ok ? (
              <div className="space-y-2">
                <div className="text-[11px] font-bold text-amber-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5" />
                  Item {calcItem + 1} Needs Attention
                </div>
                {selectedLine.errors?.map((err: string, i: number) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-600/20 text-red-400 border border-red-500/30">
                      Problem
                    </span>
                    <span className="text-[11px] text-white/70">{err}</span>
                  </div>
                ))}
              </div>
            ) : selectedLine?.ok ? (
              <div className="space-y-1.5">
                {selectedLine.trace?.map((t: any, i: number) => (
                  <div key={i} className="flex items-start justify-between gap-4 py-1 border-b border-white/5 last:border-0">
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] text-white/50 uppercase tracking-wider">{t.label}</div>
                      <div className="text-[11px] text-white/60 font-mono mt-0.5 truncate">{t.expr}</div>
                    </div>
                    <div className="text-[11px] font-mono font-semibold text-emerald-400 shrink-0">{t.value}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-[11px] text-white/40 italic py-2">
                Enter sizes for Item {calcItem + 1} to see the calculation breakdown.
              </div>
            )}
          </div>
        </div>

        {/* 7. TOTALS */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 border-b border-border bg-muted/20">
            <span className="text-[11px] font-bold uppercase tracking-widest text-foreground">Totals</span>
            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 border border-emerald-500/20 uppercase tracking-wider">
              + {settings.rateUnit === "sqft" ? "Sq.Ft" : "Sq.Mtr"} Exact
            </span>
          </div>

          {/* Stack vertically on mobile, side-by-side on md+ */}
          <div className="p-3 sm:p-4 flex flex-col md:flex-row gap-4 md:gap-8">
            {/* Breakdown rows */}
            <div className="flex-1 space-y-0">
              <TRow label="Pieces" value={totals.qty || 0} />
              <TRow label="Area (Sq.Mtr)" value={totals.sqm ?? "0.000"} />
              <TRow label="Sq.Ft / Sq.Mtr" value={`${totals.sqft ?? "0.000"} / ${totals.sqm ?? "0.000"}`} />
              <TRow label="Glass amount" value={`₹ ${nf(totals.glassAmount ?? 0)}`} />
              <TRow label="Basic amount" value={`₹ ${nf(totals.basicAmount ?? 0)}`} bold />
              {Boolean(totals.adminCharge) && (
                <TRow label="Admin charge" value={`₹ ${nf(totals.adminCharge)}`} />
              )}
              <TRow label="Total" value={`₹ ${nf(totals.subTotal ?? 0)}`} bold />
              {Boolean(totals.insurance) && (
                <TRow label={`Insurance ${totals.settings?.insurancePercent ?? 2}%`} value={`₹ ${nf(totals.insurance)}`} />
              )}
              <TRow label="Assessable value" value={`₹ ${nf(totals.assessableValue ?? 0)}`} bold />
              {Boolean(totals.cgst) && (
                <TRow label={`C-GST ${totals.settings?.cgstPercent ?? 9}%`} value={`₹ ${nf(totals.cgst)}`} />
              )}
              {Boolean(totals.sgst) && (
                <TRow label={`S-GST ${totals.settings?.sgstPercent ?? 9}%`} value={`₹ ${nf(totals.sgst)}`} />
              )}
              {Boolean(totals.igst) && (
                <TRow label={`IGST ${totals.settings?.igstPercent ?? 18}%`} value={`₹ ${nf(totals.igst)}`} />
              )}
              {Boolean(totals.grossTotal) && (
                <TRow label="Gross total" value={`₹ ${nf(totals.grossTotal)}`} />
              )}
              {Boolean(totals.roundOff) && (
                <TRow
                  label="Round off"
                  value={totals.roundOff > 0 ? `₹ +${nf(totals.roundOff)}` : `₹ ${nf(totals.roundOff)}`}
                  muted
                />
              )}
            </div>

            {/* Grand total — full-width on mobile, right-aligned on md+ */}
            <div className="flex flex-col items-start md:items-end justify-center md:min-w-[200px] border-t md:border-t-0 md:border-l border-border pt-4 md:pt-0 md:pl-6">
              <span className="text-xs text-muted-foreground font-medium mb-1">Grand total</span>
              <span className="text-3xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                ₹{nf(totals.grandTotal ?? 0)}
              </span>
              {totals.amountInWords && (
                <p className="text-[10px] text-muted-foreground italic mt-2 leading-relaxed max-w-[260px] md:text-right">
                  {totals.amountInWords}
                </p>
              )}
              {Boolean(totals.commission) && (
                <div className="mt-3 rounded bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 text-[10px] text-amber-600 dark:text-amber-400 md:text-right">
                  Commission (internal): ₹{nf(totals.commission)}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
