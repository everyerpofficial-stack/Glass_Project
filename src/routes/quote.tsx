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
} from "lucide-react";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGQ } from "@/lib/store";
import { blankItem, cur, G, nf } from "@/lib/gq";
import { toast } from "sonner";

export const Route = createFileRoute("/quote")({
  component: QuoteBuilder,
});

/* ─── tiny shared helpers ─────────────────────────────────────────────── */
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
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/30">
        <span className="text-[11px] font-bold uppercase tracking-widest text-foreground flex items-center gap-1.5">
          <span className="w-1 h-3.5 rounded-full bg-primary inline-block" />
          {title}
        </span>
        {headerRight}
      </div>
      <div className="px-4 py-3">{children}</div>
    </div>
  );
}

/* ─── totals row helper ───────────────────────────────────────────────── */
function TRow({
  label,
  value,
  bold,
  muted,
  green,
}: {
  label: string;
  value: string | number;
  bold?: boolean;
  muted?: boolean;
  green?: boolean;
}) {
  return (
    <div className={`flex justify-between items-baseline py-[3px] text-[11px] border-b border-border/30 last:border-0 ${muted ? "opacity-60" : ""}`}>
      <span className="text-muted-foreground">{label}</span>
      <span
        className={`font-mono tabular-nums ${bold ? "font-semibold text-foreground" : "text-foreground"} ${green ? "text-emerald-600 dark:text-emerald-400" : ""}`}
      >
        {value}
      </span>
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
  const [calcItem, setCalcItem] = useState(0); // which item to show in "How this was calculated"

  /* ── field update helpers ── */
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

  /* ── calc item for "how this was calculated" ── */
  const selectedLine = totals.lines?.[calcItem];
  const selectedItem = inv.items[calcItem];

  /* ── gst fields visibility ── */
  const gstType = inv.ch?.gstType || "cgst_sgst";

  return (
    <div className="min-h-screen bg-background">
      {/* ── BREADCRUMB + PAGE HEADER ─────────────────────────── */}
      <div className="border-b border-border bg-card px-6 py-3 flex items-center justify-between">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-0.5">
            <Link to="/quotes" className="hover:text-foreground transition-colors">Glass Quote</Link>
            {" / "}
            <span className="text-primary">New Invoice</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-foreground leading-tight">
            {inv._saved ? inv.no : "New invoice"}
          </h1>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Enter sizes in inches. Everything else is calculated.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={newInvoice}
          >
            <RefreshCw className="h-3.5 w-3.5" /> Start fresh
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
            <Printer className="h-3.5 w-3.5" /> Print / Save PDF
          </Button>
          <Button
            size="sm"
            className="h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={saveInvoice}
          >
            <Save className="h-3.5 w-3.5" /> Save Invoice
          </Button>
        </div>
      </div>

      {/* ── TWO-COLUMN LAYOUT ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-0 items-start">
        {/* ── LEFT: form sections ───────────────────────────────── */}
        <div className="space-y-4 p-4 border-r border-border min-h-screen">

          {/* 1. Invoice details */}
          <Section title="Invoice details" headerRight={
            <span className="text-[10px] text-muted-foreground">
              {inv._saved ? "Saved" : "Draft"} saved {new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
            </span>
          }>
            <div className="grid grid-cols-4 gap-3">
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
              <div className="flex items-center gap-2">
                {/* Search saved customers */}
                <div className="relative">
                  <div className="flex items-center border border-border rounded-md h-7 px-2 gap-1.5 bg-background text-xs cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => setCustDropOpen((v) => !v)}>
                    <Search className="h-3 w-3 text-muted-foreground" />
                    <input
                      className="w-36 bg-transparent outline-none text-xs placeholder:text-muted-foreground"
                      placeholder="Search saved customer"
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
                  <UserCheck className="h-3 w-3" /> Save to customers
                </Button>
              </div>
            }
          >
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>M/S. — Customer Name</FieldLabel>
                <Input
                  className="h-8 text-xs"
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
                  className="h-8 text-xs"
                  value={inv.cust?.phone || ""}
                  onChange={(e) => updateInvField("cust.phone", e.target.value)}
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
                <FieldLabel>Billing Address</FieldLabel>
                <Textarea
                  rows={3}
                  className="text-xs resize-none"
                  value={inv.cust?.addr || ""}
                  onChange={(e) => updateInvField("cust.addr", e.target.value)}
                />
              </div>
              <div>
                <FieldLabel>Dispatch To</FieldLabel>
                <Textarea
                  rows={3}
                  className="text-xs resize-none"
                  value={inv.cust?.ship || ""}
                  onChange={(e) => updateInvField("cust.ship", e.target.value)}
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
                <FieldLabel>Order No.</FieldLabel>
                <Input
                  className="h-8 text-xs"
                  value={inv.orderNo || ""}
                  onChange={(e) => updateInvField("orderNo", e.target.value)}
                />
              </div>
            </div>
          </Section>

          {/* 3. Glass specification */}
          <Section title="Glass specification">
            <div className="grid grid-cols-4 gap-3">
              <div>
                <FieldLabel>Description of Goods</FieldLabel>
                <Input
                  className="h-8 text-xs"
                  value={inv.glass?.desc || ""}
                  onChange={(e) => updateInvField("glass.desc", e.target.value)}
                  placeholder="5 MM Grey Tinted T.G. With Rough Grind"
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

          {/* 4. Items table */}
          <Section
            title="Items"
            headerRight={
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-muted-foreground">
                  Rate is per {settings.rateUnit === "sqft" ? "Sq.Ft" : "Sq.Mtr"}
                </span>
                <Button size="sm" className="h-6 text-[11px] px-2 gap-1" onClick={addItemRow}>
                  <Plus className="h-3 w-3" /> Add Item
                </Button>
              </div>
            }
          >
            <div className="overflow-x-auto -mx-4">
              <table className="w-full text-[11px] border-collapse min-w-[900px]">
                <thead>
                  <tr className="border-b border-border bg-muted/20">
                    <th className="py-2 px-2 text-center text-[10px] font-semibold uppercase tracking-widest text-muted-foreground w-8">#</th>
                    <th className="py-2 px-2 text-left text-[10px] font-semibold uppercase tracking-widest text-muted-foreground min-w-[120px]">Description</th>
                    <th className="py-2 px-2 text-center text-[10px] font-semibold uppercase tracking-widest text-muted-foreground w-[90px]">L1 Inch</th>
                    <th className="py-2 px-2 text-center text-[10px] font-semibold uppercase tracking-widest text-muted-foreground w-[90px]">L2 Inch</th>
                    <th className="py-2 px-2 text-center text-[10px] font-semibold uppercase tracking-widest text-muted-foreground w-[80px]">MM</th>
                    <th className="py-2 px-2 text-center text-[10px] font-semibold uppercase tracking-widest text-muted-foreground w-[50px]">QTY</th>
                    <th className="py-2 px-2 text-center text-[10px] font-semibold uppercase tracking-widest text-muted-foreground w-[50px]">Hole</th>
                    <th className="py-2 px-2 text-center text-[10px] font-semibold uppercase tracking-widest text-muted-foreground w-[50px]">Cut</th>
                    <th className="py-2 px-2 text-center text-[10px] font-semibold uppercase tracking-widest text-muted-foreground w-[70px]">Area</th>
                    <th className="py-2 px-2 text-center text-[10px] font-semibold uppercase tracking-widest text-muted-foreground w-[70px]">Rate</th>
                    <th className="py-2 px-2 text-right text-[10px] font-semibold uppercase tracking-widest text-muted-foreground w-[80px]">Amount</th>
                    <th className="py-2 px-2 text-left text-[10px] font-semibold uppercase tracking-widest text-muted-foreground min-w-[80px]">Remark</th>
                    <th className="py-2 px-2 w-[52px]" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {inv.items.map((item: any, idx: number) => {
                    const line = totals.lines?.[idx];
                    const isL1Valid = item.l1 ? G.parseInch(item.l1).ok : true;
                    const isL2Valid = item.l2 ? G.parseInch(item.l2).ok : true;
                    const mmText = line?.ok
                      ? `${line.lMM} × ${line.wMM}`
                      : "—";
                    const areaText = line?.ok
                      ? settings.rateUnit === "sqft"
                        ? String(line.totalSqft)
                        : String(line.totalSqm)
                      : "—";

                    return (
                      <tr key={item.id || idx} className={`hover:bg-muted/10 ${!line?.ok && (item.l1 || item.l2) ? "bg-red-500/5" : ""}`}>
                        {/* # */}
                        <td className="py-1.5 px-2 text-center text-muted-foreground font-mono">
                          <div className="flex flex-col items-center gap-0.5">
                            <span className="text-[10px]">Item</span>
                            <span className="text-xs font-semibold">{idx + 1}</span>
                          </div>
                        </td>
                        {/* Description */}
                        <td className="py-1.5 px-1">
                          <Input
                            className="h-8 text-xs min-w-[100px]"
                            value={item.desc || ""}
                            onChange={(e) => updateItem(idx, "desc", e.target.value)}
                            placeholder={inv.glass?.desc || "Glass"}
                          />
                        </td>
                        {/* L1 */}
                        <td className="py-1.5 px-1">
                          <Input
                            className={`h-8 text-xs font-mono text-center w-[82px] ${!isL1Valid && item.l1 ? "border-destructive ring-1 ring-destructive/30" : ""}`}
                            value={item.l1 || ""}
                            onChange={(e) => updateItem(idx, "l1", e.target.value)}
                            placeholder="36 3/8"
                          />
                        </td>
                        {/* L2 */}
                        <td className="py-1.5 px-1">
                          <Input
                            className={`h-8 text-xs font-mono text-center w-[82px] ${!isL2Valid && item.l2 ? "border-destructive ring-1 ring-destructive/30" : ""}`}
                            value={item.l2 || ""}
                            onChange={(e) => updateItem(idx, "l2", e.target.value)}
                            placeholder="13 3/8"
                          />
                        </td>
                        {/* MM (auto) */}
                        <td className="py-1.5 px-2 text-center font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                          {mmText}
                        </td>
                        {/* QTY */}
                        <td className="py-1.5 px-1">
                          <Input
                            type="number"
                            className="h-8 text-xs font-mono text-center w-[44px]"
                            value={item.qty ?? 1}
                            min={1}
                            onChange={(e) => updateItem(idx, "qty", Number(e.target.value))}
                          />
                        </td>
                        {/* HOLE */}
                        <td className="py-1.5 px-1">
                          <Input
                            type="number"
                            className="h-8 text-xs font-mono text-center w-[44px]"
                            value={item.holes ?? 0}
                            min={0}
                            onChange={(e) => updateItem(idx, "holes", Number(e.target.value))}
                          />
                        </td>
                        {/* CUT */}
                        <td className="py-1.5 px-1">
                          <Input
                            type="number"
                            className="h-8 text-xs font-mono text-center w-[44px]"
                            value={item.cutouts ?? 0}
                            min={0}
                            onChange={(e) => updateItem(idx, "cutouts", Number(e.target.value))}
                          />
                        </td>
                        {/* AREA (auto) */}
                        <td className="py-1.5 px-2 text-center font-mono text-[11px] text-muted-foreground">
                          {areaText}
                        </td>
                        {/* RATE */}
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
                        {/* AMOUNT (auto) */}
                        <td className="py-1.5 px-2 text-right font-mono font-semibold text-xs whitespace-nowrap">
                          {line?.ok ? (
                            nf(line.amount)
                          ) : (
                            <span className="text-muted-foreground/40">—</span>
                          )}
                        </td>
                        {/* REMARK */}
                        <td className="py-1.5 px-1">
                          <Input
                            className="h-8 text-xs min-w-[72px]"
                            value={item.remark || ""}
                            onChange={(e) => updateItem(idx, "remark", e.target.value)}
                          />
                        </td>
                        {/* Actions */}
                        <td className="py-1.5 px-1">
                          <div className="flex items-center gap-0.5">
                            <button
                              title="Duplicate row"
                              className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                              onClick={() => duplicateItemRow(idx)}
                            >
                              <Copy className="h-3 w-3" />
                            </button>
                            <button
                              title="Remove row"
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
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <FieldLabel>Wastage</FieldLabel>
                  <Select
                    value={inv.ch?.wastageMode || "none"}
                    onValueChange={(v) => updateInvField("ch.wastageMode", v)}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="manual">Manual area</SelectItem>
                      <SelectItem value="percent">Percentage %</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <FieldLabel>Wastage Area</FieldLabel>
                  <Input
                    type="number"
                    className="h-8 text-xs font-mono"
                    value={inv.ch?.wastageArea ?? 0}
                    onChange={(e) => updateInvField("ch.wastageArea", Number(e.target.value))}
                    disabled={inv.ch?.wastageMode === "none"}
                  />
                </div>
                <div>
                  <FieldLabel>Wastage Rate</FieldLabel>
                  <Input
                    type="number"
                    className="h-8 text-xs font-mono"
                    value={inv.ch?.wastageRate ?? 0}
                    onChange={(e) => updateInvField("ch.wastageRate", Number(e.target.value))}
                  />
                </div>
                <div>
                  <FieldLabel>Template Charge</FieldLabel>
                  <Input
                    type="number"
                    className="h-8 text-xs font-mono"
                    value={inv.ch?.templateCharge ?? 0}
                    onChange={(e) => updateInvField("ch.templateCharge", Number(e.target.value))}
                  />
                </div>
              </div>

              {/* Row 2: charges */}
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <FieldLabel>Other Charges</FieldLabel>
                  <Input
                    type="number"
                    className="h-8 text-xs font-mono"
                    value={inv.ch?.otherCharges ?? 0}
                    onChange={(e) => updateInvField("ch.otherCharges", Number(e.target.value))}
                  />
                </div>
                <div>
                  <FieldLabel>Admin Charge</FieldLabel>
                  <Input
                    type="number"
                    className="h-8 text-xs font-mono"
                    value={inv.ch?.adminCharge ?? 0}
                    onChange={(e) => updateInvField("ch.adminCharge", Number(e.target.value))}
                  />
                </div>
                <div>
                  <FieldLabel>Discount %</FieldLabel>
                  <Input
                    type="number"
                    className="h-8 text-xs font-mono"
                    value={inv.ch?.discountPercent ?? 0}
                    onChange={(e) => updateInvField("ch.discountPercent", Number(e.target.value))}
                  />
                </div>
                <div>
                  <FieldLabel>Insurance %</FieldLabel>
                  <Input
                    type="number"
                    className="h-8 text-xs font-mono"
                    value={inv.ch?.insurancePercent ?? 0}
                    onChange={(e) => updateInvField("ch.insurancePercent", Number(e.target.value))}
                  />
                </div>
              </div>

              {/* Row 3: GST */}
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <FieldLabel>GST Type</FieldLabel>
                  <Select
                    value={gstType}
                    onValueChange={(v) => updateInvField("ch.gstType", v)}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cgst_sgst">CGST + SGST</SelectItem>
                      <SelectItem value="igst">IGST</SelectItem>
                      <SelectItem value="none">Exempt</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <FieldLabel>CGST %</FieldLabel>
                  <Input
                    type="number"
                    className="h-8 text-xs font-mono"
                    value={inv.ch?.cgstPercent ?? 9}
                    onChange={(e) => updateInvField("ch.cgstPercent", Number(e.target.value))}
                    disabled={gstType !== "cgst_sgst"}
                  />
                </div>
                <div>
                  <FieldLabel>SGST %</FieldLabel>
                  <Input
                    type="number"
                    className="h-8 text-xs font-mono"
                    value={inv.ch?.sgstPercent ?? 9}
                    onChange={(e) => updateInvField("ch.sgstPercent", Number(e.target.value))}
                    disabled={gstType !== "cgst_sgst"}
                  />
                </div>
                <div>
                  <FieldLabel>IGST %</FieldLabel>
                  <Input
                    type="number"
                    className="h-8 text-xs font-mono"
                    value={inv.ch?.igstPercent ?? 18}
                    onChange={(e) => updateInvField("ch.igstPercent", Number(e.target.value))}
                    disabled={gstType !== "igst"}
                  />
                </div>
              </div>

              {/* Row 4: Commission + Round off */}
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <FieldLabel>Commission</FieldLabel>
                  <Select
                    value={inv.ch?.commissionMode || "none"}
                    onValueChange={(v) => updateInvField("ch.commissionMode", v)}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="percent">Percent %</SelectItem>
                      <SelectItem value="fixed">Fixed ₹</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <FieldLabel>Commission Value</FieldLabel>
                  <Input
                    type="number"
                    className="h-8 text-xs font-mono"
                    value={inv.ch?.commissionValue ?? 0}
                    onChange={(e) => updateInvField("ch.commissionValue", Number(e.target.value))}
                    disabled={inv.ch?.commissionMode === "none"}
                  />
                </div>
                <div>
                  <FieldLabel>Commission On</FieldLabel>
                  <Select
                    value={inv.ch?.commissionBase || "basic"}
                    onValueChange={(v) => updateInvField("ch.commissionBase", v)}
                    disabled={inv.ch?.commissionMode === "none"}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
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
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
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
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10">
              <span className="text-[11px] font-semibold text-white/80 uppercase tracking-widest">
                How this was calculated
              </span>
              {/* Item selector */}
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

            <div className="p-4">
              {selectedLine && !selectedLine.ok ? (
                /* Problems panel */
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
                /* Trace table */
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

        </div>

        {/* ── RIGHT: Totals panel ───────────────────────────────── */}
        <div className="sticky top-0 p-3 border-t lg:border-t-0 bg-background">
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/20">
              <span className="text-[11px] font-bold uppercase tracking-widest text-foreground">Totals</span>
              <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 border border-emerald-500/20 uppercase tracking-wider">
                + {settings.rateUnit === "sqft" ? "Sq.Ft" : "Sq.Mtr"} Exact
              </span>
            </div>

            <div className="px-3 py-2.5 space-y-0">
              <TRow label="Pieces" value={totals.qty || 0} />
              <TRow
                label="Area (Sq.Mtr)"
                value={totals.sqm ?? "0.000"}
              />
              <TRow
                label="Sq.Ft / Sq.Mtr"
                value={`${totals.sqft ?? "0.000"} / ${totals.sqm ?? "0.000"}`}
              />

              <div className="py-1" />

              <TRow
                label="Glass amount"
                value={`₹ ${nf(totals.glassAmount ?? 0)}`}
              />
              <TRow
                label="Basic amount"
                value={`₹ ${nf(totals.basicAmount ?? 0)}`}
                bold
              />
              {Boolean(totals.adminCharge) && (
                <TRow
                  label="Admin charge"
                  value={`₹ ${nf(totals.adminCharge)}`}
                />
              )}
              <TRow
                label="Total"
                value={`₹ ${nf(totals.subTotal ?? 0)}`}
                bold
              />
              {Boolean(totals.insurance) && (
                <TRow
                  label={`Insurance ${totals.settings?.insurancePercent ?? 2}%`}
                  value={`₹ ${nf(totals.insurance)}`}
                />
              )}
              <TRow
                label="Assessable value"
                value={`₹ ${nf(totals.assessableValue ?? 0)}`}
                bold
              />
              {Boolean(totals.cgst) && (
                <TRow
                  label={`C-GST ${totals.settings?.cgstPercent ?? 9}%`}
                  value={`₹ ${nf(totals.cgst)}`}
                />
              )}
              {Boolean(totals.sgst) && (
                <TRow
                  label={`S-GST ${totals.settings?.sgstPercent ?? 9}%`}
                  value={`₹ ${nf(totals.sgst)}`}
                />
              )}
              {Boolean(totals.igst) && (
                <TRow
                  label={`IGST ${totals.settings?.igstPercent ?? 18}%`}
                  value={`₹ ${nf(totals.igst)}`}
                />
              )}
              {Boolean(totals.grossTotal) && (
                <TRow
                  label="Gross total"
                  value={`₹ ${nf(totals.grossTotal)}`}
                />
              )}
              {Boolean(totals.roundOff) && (
                <TRow
                  label="Round off"
                  value={totals.roundOff > 0 ? `₹ +${nf(totals.roundOff)}` : `₹ ${nf(totals.roundOff)}`}
                  muted
                />
              )}
            </div>

            {/* Grand Total */}
            <div className="px-3 pb-3 pt-1 border-t border-border/60 mt-1">
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-bold text-foreground">Grand total</span>
                <span className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                  ₹{nf(totals.grandTotal ?? 0)}
                </span>
              </div>
              {totals.amountInWords && (
                <p className="text-[10px] text-muted-foreground mt-1 italic leading-relaxed">
                  {totals.amountInWords}
                </p>
              )}
            </div>

            {/* Commission note (hidden from customer) */}
            {Boolean(totals.commission) && (
              <div className="px-3 pb-3">
                <div className="rounded bg-amber-500/10 border border-amber-500/20 px-2 py-1.5 text-[10px] text-amber-600 dark:text-amber-400">
                  Commission (internal only): ₹{nf(totals.commission)}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
