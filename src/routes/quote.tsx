import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Plus,
  Trash2,
  Save,
  Printer,
  FileSpreadsheet,
  UserPlus,
  Calculator,
  Sparkles,
  ChevronDown,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useGQ } from "@/lib/store";
import { blankItem, cur, G, nf } from "@/lib/gq";
import { toast } from "sonner";

export const Route = createFileRoute("/quote")({
  component: QuoteBuilder,
});

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
    syncOne,
    draftState,
  } = useGQ();

  const [custModalOpen, setCustModalOpen] = useState(false);
  const [chargesOpen, setChargesOpen] = useState(false);
  const [newCust, setNewCust] = useState({
    name: "",
    phone: "",
    email: "",
    gstin: "",
    addr: "",
    ship: "",
  });

  const updateInvField = (path: string, val: any) => {
    setInv((prev: any) => {
      const copy = JSON.parse(JSON.stringify(prev));
      const parts = path.split(".");
      let target: any = copy;
      for (let i = 0; i < parts.length - 1; i++) {
        const key = parts[i];
        if (key && target && typeof target === "object") {
          target = target[key];
        }
      }
      const lastKey = parts[parts.length - 1];
      if (lastKey && target && typeof target === "object") {
        target[lastKey] = val;
      }
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

  const selectCustomer = (name: string) => {
    const existing = customers.find((c) => c.name === name);
    if (existing) {
      setInv((prev) => ({ ...prev, cust: { ...existing } }));
      toast.success(`Loaded ${name}`);
    }
  };

  const handleSaveModalCustomer = () => {
    if (!newCust.name.trim()) {
      toast.error("Customer name is required");
      return;
    }
    saveCustomer(newCust);
    setInv((prev) => ({ ...prev, cust: { ...newCust } }));
    setCustModalOpen(false);
    setNewCust({ name: "", phone: "", email: "", gstin: "", addr: "", ship: "" });
  };

  const validLines = totals.lines?.filter((l: any) => l.ok) || [];

  return (
    <div className="max-w-[1100px] mx-auto space-y-0 pb-10">
      {/* ── Page header ────────────────────────────────── */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              {inv.no || "PI-1001"}
            </h1>
            <Badge
              variant="outline"
              className="text-[10px] font-medium rounded-md px-2 py-0.5"
            >
              {inv._saved ? "Saved" : "Draft"}
            </Badge>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">{draftState}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="text-xs" onClick={newInvoice}>
            <Plus className="h-3.5 w-3.5 mr-1" /> New Quote
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={() => {
              setInv((prev) => {
                const copy = JSON.parse(JSON.stringify(prev));
                copy.items = [
                  { id: "it-1", desc: "Toughened Clear Glass", l1: "36", l2: "13 3/8", qty: 1, rate: 807, shape: "BLOCK", holes: 0, cutouts: 0, remark: "" },
                  { id: "it-2", desc: "Toughened Clear Glass", l1: "36 3/8", l2: "15", qty: 1, rate: 807, shape: "BLOCK", holes: 0, cutouts: 0, remark: "" },
                ];
                return copy;
              });
              toast.success("Sample sizes loaded");
            }}
          >
            <Sparkles className="h-3.5 w-3.5 mr-1" /> Demo Items
          </Button>
        </div>
      </div>

      {/* ── Main two-column layout ──────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_272px] gap-5 items-start">
        {/* LEFT column: all form sections */}
        <div className="space-y-4">

          {/* ── 1. Quote meta ──────────────────────────── */}
          <Card className="border border-border/60 shadow-none">
            <CardContent className="pt-4 pb-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <Label className="field-label">PI Number</Label>
                  <Input
                    className="h-8 text-xs font-mono mt-1"
                    value={inv.no || ""}
                    onChange={(e) => updateInvField("no", e.target.value)}
                  />
                </div>
                <div>
                  <Label className="field-label">Date</Label>
                  <Input
                    type="date"
                    className="h-8 text-xs mt-1"
                    value={inv.date || ""}
                    onChange={(e) => updateInvField("date", e.target.value)}
                  />
                </div>
                <div>
                  <Label className="field-label">Sales Person</Label>
                  <Input
                    className="h-8 text-xs mt-1"
                    value={inv.salesPerson || ""}
                    onChange={(e) => updateInvField("salesPerson", e.target.value)}
                    placeholder="Office"
                  />
                </div>
                <div>
                  <Label className="field-label">Party PO No.</Label>
                  <Input
                    className="h-8 text-xs mt-1"
                    value={inv.poNo || ""}
                    onChange={(e) => updateInvField("poNo", e.target.value)}
                    placeholder="—"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── 2. Customer ────────────────────────────── */}
          <Card className="border border-border/60 shadow-none">
            <CardHeader className="py-3 px-4 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium text-foreground">Customer</CardTitle>
              <div className="flex items-center gap-2">
                {customers.length > 0 && (
                  <Select onValueChange={selectCustomer}>
                    <SelectTrigger className="h-7 text-xs w-44 border-dashed">
                      <SelectValue placeholder="Select saved customer…" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((c) => (
                        <SelectItem key={c.id || c.name} value={c.name}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <Dialog open={custModalOpen} onOpenChange={setCustModalOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="h-7 text-xs">
                      <UserPlus className="h-3.5 w-3.5 mr-1" /> Add
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-sm">
                    <DialogHeader>
                      <DialogTitle>New Customer</DialogTitle>
                      <DialogDescription>Save for future quotes.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 py-1 text-xs">
                      <div>
                        <Label>Name *</Label>
                        <Input
                          className="h-8 mt-1"
                          value={newCust.name}
                          onChange={(e) => setNewCust({ ...newCust, name: e.target.value })}
                          placeholder="Company / person name"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label>Phone</Label>
                          <Input className="h-8 mt-1" value={newCust.phone} onChange={(e) => setNewCust({ ...newCust, phone: e.target.value })} />
                        </div>
                        <div>
                          <Label>GSTIN</Label>
                          <Input className="h-8 mt-1 font-mono" value={newCust.gstin} onChange={(e) => setNewCust({ ...newCust, gstin: e.target.value })} />
                        </div>
                      </div>
                      <div>
                        <Label>Address</Label>
                        <Textarea rows={2} className="mt-1 text-xs" value={newCust.addr} onChange={(e) => setNewCust({ ...newCust, addr: e.target.value })} />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" size="sm" onClick={() => setCustModalOpen(false)}>Cancel</Button>
                      <Button size="sm" onClick={handleSaveModalCustomer}>Save Customer</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent className="pt-0 pb-4 px-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="field-label">Customer Name *</Label>
                  <Input className="h-8 text-xs mt-1" value={inv.cust?.name || ""} onChange={(e) => updateInvField("cust.name", e.target.value)} placeholder="M/s. Name" />
                </div>
                <div>
                  <Label className="field-label">GSTIN</Label>
                  <Input className="h-8 text-xs mt-1 font-mono" value={inv.cust?.gstin || ""} onChange={(e) => updateInvField("cust.gstin", e.target.value)} placeholder="29ABCDE1234F1Z5" />
                </div>
                <div>
                  <Label className="field-label">Phone</Label>
                  <Input className="h-8 text-xs mt-1" value={inv.cust?.phone || ""} onChange={(e) => updateInvField("cust.phone", e.target.value)} placeholder="+91…" />
                </div>
                <div>
                  <Label className="field-label">Email</Label>
                  <Input className="h-8 text-xs mt-1" value={inv.cust?.email || ""} onChange={(e) => updateInvField("cust.email", e.target.value)} placeholder="billing@company.com" />
                </div>
                <div>
                  <Label className="field-label">Billing Address</Label>
                  <Textarea rows={2} className="text-xs mt-1" value={inv.cust?.addr || ""} onChange={(e) => updateInvField("cust.addr", e.target.value)} placeholder="Street, City, State" />
                </div>
                <div>
                  <Label className="field-label">Dispatch Address</Label>
                  <Textarea rows={2} className="text-xs mt-1" value={inv.cust?.ship || ""} onChange={(e) => updateInvField("cust.ship", e.target.value)} placeholder="Same as billing if blank" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── 3. Glass specs ─────────────────────────── */}
          <Card className="border border-border/60 shadow-none">
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm font-medium text-foreground">Glass Specifications</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 pb-4 px-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label className="field-label">Glass Description</Label>
                  <Input className="h-8 text-xs mt-1" value={inv.glass?.desc || ""} onChange={(e) => updateInvField("glass.desc", e.target.value)} placeholder="Toughened Clear Glass" />
                </div>
                <div>
                  <Label className="field-label">Thickness (mm)</Label>
                  <Select value={String(inv.glass?.thickness || 5)} onValueChange={(v) => updateInvField("glass.thickness", Number(v))}>
                    <SelectTrigger className="h-8 text-xs mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[3, 4, 5, 6, 8, 10, 12, 15, 19].map((mm) => (
                        <SelectItem key={mm} value={String(mm)}>{mm} mm</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="field-label">Default Rate ({settings.rateUnit === "sqft" ? "₹/Sq.Ft" : "₹/Sq.Mtr"})</Label>
                  <Input type="number" className="h-8 text-xs mt-1 font-mono" value={inv.glass?.defaultRate ?? ""} onChange={(e) => updateInvField("glass.defaultRate", e.target.value === "" ? "" : Number(e.target.value))} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── 4. Line items ──────────────────────────── */}
          <Card className="border border-border/60 shadow-none">
            <CardHeader className="py-3 px-4 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium text-foreground">Line Items</CardTitle>
              <Button size="sm" onClick={addItemRow} className="h-7 text-xs">
                <Plus className="h-3.5 w-3.5 mr-1" /> Add Row
              </Button>
            </CardHeader>
            <CardContent className="pt-0 pb-4 px-4 space-y-2">
              {/* Header row */}
              <div className="grid items-center gap-x-2 text-[10px] uppercase tracking-wider text-muted-foreground font-medium pb-1 border-b border-border/50"
                style={{ gridTemplateColumns: "24px 1fr 104px 104px 56px 82px 82px 28px" }}>
                <span className="text-center">#</span>
                <span>Description</span>
                <span>Height (L1)</span>
                <span>Width (L2)</span>
                <span className="text-center">Qty</span>
                <span>Rate</span>
                <span className="text-right">Amount</span>
                <span />
              </div>

              {/* Item rows */}
              {inv.items.map((item: any, idx: number) => {
                const calculatedLine = totals.lines?.[idx];
                const isL1Valid = item.l1 ? G.parseInch(item.l1).ok : true;
                const isL2Valid = item.l2 ? G.parseInch(item.l2).ok : true;
                return (
                  <div
                    key={item.id || idx}
                    className="grid items-center gap-x-2"
                    style={{ gridTemplateColumns: "24px 1fr 104px 104px 56px 82px 82px 28px" }}
                  >
                    <span className="text-center text-xs text-muted-foreground font-mono">{idx + 1}</span>
                    <Input
                      className="h-9 text-xs"
                      value={item.desc || ""}
                      onChange={(e) => updateItem(idx, "desc", e.target.value)}
                      placeholder={inv.glass?.desc || "Item description"}
                    />
                    <Input
                      className={`h-9 text-sm font-mono tracking-wide ${!isL1Valid ? "border-destructive" : ""}`}
                      value={item.l1 || ""}
                      onChange={(e) => updateItem(idx, "l1", e.target.value)}
                      placeholder="36 3/8"
                    />
                    <Input
                      className={`h-9 text-sm font-mono tracking-wide ${!isL2Valid ? "border-destructive" : ""}`}
                      value={item.l2 || ""}
                      onChange={(e) => updateItem(idx, "l2", e.target.value)}
                      placeholder="13 3/8"
                    />
                    <Input
                      type="number"
                      className="h-9 text-sm font-mono text-center"
                      value={item.qty ?? 1}
                      onChange={(e) => updateItem(idx, "qty", Number(e.target.value))}
                    />
                    <Input
                      type="number"
                      className="h-9 text-sm font-mono"
                      value={item.rate ?? ""}
                      onChange={(e) => updateItem(idx, "rate", e.target.value === "" ? "" : Number(e.target.value))}
                      placeholder={String(inv.glass?.defaultRate || "")}
                    />
                    <div className="h-9 flex items-center justify-end">
                      <span className="text-sm font-mono font-medium text-foreground">
                        {calculatedLine?.ok ? nf(calculatedLine.amount) : <span className="text-muted-foreground/50 text-xs">—</span>}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground/50 hover:text-destructive"
                      onClick={() => removeItemRow(idx)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                );
              })}

              {/* Add row + area summary */}
              <div className="flex items-center justify-between pt-2">
                <Button variant="ghost" size="sm" onClick={addItemRow} className="h-7 text-xs text-muted-foreground hover:text-foreground -ml-2">
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add line
                </Button>
                <div className="text-[11px] text-muted-foreground">
                  {inv.items.length} item{inv.items.length !== 1 ? "s" : ""} · Area:{" "}
                  <span className="font-medium text-foreground">
                    {settings.rateUnit === "sqft" ? `${totals.sqft} Sq.Ft` : `${totals.sqm} Sq.M`}
                  </span>
                  {totals.qty > 0 && (
                    <> · Qty: <span className="font-medium text-foreground">{totals.qty}</span></>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── 5. Charges & Tax (collapsible) ─────────── */}
          <Collapsible open={chargesOpen} onOpenChange={setChargesOpen}>
            <CollapsibleTrigger asChild>
              <button className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-border/60 bg-card text-sm font-medium text-foreground hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-2">
                  <Calculator className="h-4 w-4 text-muted-foreground" />
                  Charges, Wastage & Tax
                </div>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${chargesOpen ? "rotate-180" : ""}`} />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <Card className="border border-border/60 border-t-0 rounded-t-none shadow-none">
                <CardContent className="pt-4 pb-4 px-4 space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div>
                      <Label className="field-label">Wastage Mode</Label>
                      <Select value={inv.ch?.wastageMode || "none"} onValueChange={(v) => updateInvField("ch.wastageMode", v)}>
                        <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="percent">Percentage %</SelectItem>
                          <SelectItem value="manual">Manual Area</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="field-label">Wastage %</Label>
                      <Input type="number" className="h-8 text-xs mt-1" value={inv.ch?.wastagePercent ?? 0} onChange={(e) => updateInvField("ch.wastagePercent", Number(e.target.value))} disabled={inv.ch?.wastageMode !== "percent"} />
                    </div>
                    <div>
                      <Label className="field-label">Wastage Rate</Label>
                      <Input type="number" className="h-8 text-xs mt-1" value={inv.ch?.wastageRate ?? ""} onChange={(e) => updateInvField("ch.wastageRate", Number(e.target.value))} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <Label className="field-label">Admin Charge (₹)</Label>
                      <Input type="number" className="h-8 text-xs mt-1" value={inv.ch?.adminCharge ?? 0} onChange={(e) => updateInvField("ch.adminCharge", Number(e.target.value))} />
                    </div>
                    <div>
                      <Label className="field-label">Discount (%)</Label>
                      <Input type="number" className="h-8 text-xs mt-1" value={inv.ch?.discountPercent ?? 0} onChange={(e) => updateInvField("ch.discountPercent", Number(e.target.value))} />
                    </div>
                    <div>
                      <Label className="field-label">Insurance (%)</Label>
                      <Input type="number" className="h-8 text-xs mt-1" value={inv.ch?.insurancePercent ?? 0} onChange={(e) => updateInvField("ch.insurancePercent", Number(e.target.value))} />
                    </div>
                    <div>
                      <Label className="field-label">GST Type</Label>
                      <Select value={inv.ch?.gstType || "cgst_sgst"} onValueChange={(v) => updateInvField("ch.gstType", v)}>
                        <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cgst_sgst">CGST + SGST</SelectItem>
                          <SelectItem value="igst">IGST</SelectItem>
                          <SelectItem value="none">Exempt</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-foreground">Auto Round Off</p>
                      <p className="text-[11px] text-muted-foreground">Round grand total to nearest rupee</p>
                    </div>
                    <Switch
                      checked={String(inv.ch?.roundOff) === "1" || inv.ch?.roundOff === 1}
                      onCheckedChange={(checked) => updateInvField("ch.roundOff", checked ? 1 : 0)}
                    />
                  </div>
                </CardContent>
              </Card>
            </CollapsibleContent>
          </Collapsible>
        </div>

        {/* RIGHT column: summary + save ──────────────── */}
        <div className="sticky top-20">
          <Card className="border border-border/60 shadow-none">
            <CardHeader className="py-3 px-4 border-b border-border/40">
              <CardTitle className="text-sm font-medium text-foreground">Quote Summary</CardTitle>
            </CardHeader>
            <CardContent className="pt-3 pb-4 px-4">
              {/* Breakdown rows */}
              <div className="space-y-0 text-xs">
                <SumRow label="Glass Amount" value={cur(totals.glassAmount, settings.currency)} />
                {Boolean(totals.wastageAmount) && <SumRow label="Wastage" value={cur(totals.wastageAmount, settings.currency)} />}
                <SumRow label="Basic Amount" value={cur(totals.basicAmount, settings.currency)} bold />
                {Boolean(totals.adminCharge) && <SumRow label="Admin Charge" value={cur(totals.adminCharge, settings.currency)} />}
                {Boolean(totals.discount) && <SumRow label="Discount" value={`-${cur(totals.discount, settings.currency)}`} accent="green" />}
                {Boolean(totals.insurance) && <SumRow label="Insurance" value={cur(totals.insurance, settings.currency)} />}
                <SumRow label="Assessable Value" value={cur(totals.assessableValue, settings.currency)} bold />
                {Boolean(totals.cgst) && <SumRow label={`CGST ${totals.settings?.cgstPercent}%`} value={cur(totals.cgst, settings.currency)} />}
                {Boolean(totals.sgst) && <SumRow label={`SGST ${totals.settings?.sgstPercent}%`} value={cur(totals.sgst, settings.currency)} />}
                {Boolean(totals.igst) && <SumRow label={`IGST ${totals.settings?.igstPercent}%`} value={cur(totals.igst, settings.currency)} />}
                {Boolean(totals.roundOff) && (
                  <SumRow label="Round Off" value={totals.roundOff > 0 ? `+${totals.roundOff}` : String(totals.roundOff)} muted />
                )}
              </div>

              {/* Grand Total */}
              <div className="mt-3 pt-3 border-t border-border/60">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-semibold text-foreground">Grand Total</span>
                  <span className="text-lg font-bold font-mono text-foreground">
                    {cur(totals.grandTotal, settings.currency)}
                  </span>
                </div>
                {totals.amountInWords && (
                  <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed italic">
                    {totals.amountInWords}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="mt-4 space-y-2">
                <Button className="w-full h-9 text-sm" onClick={saveInvoice}>
                  <Save className="h-3.5 w-3.5 mr-1.5" /> Save Quotation
                </Button>
                {settings.sheetUrl && (
                  <Button
                    variant="outline"
                    className="w-full h-8 text-xs"
                    onClick={() => { saveInvoice(); syncOne(inv); }}
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5" /> Save & Sync to Sheet
                  </Button>
                )}
                <Button
                  variant="ghost"
                  className="w-full h-8 text-xs text-muted-foreground"
                  onClick={() => { saveInvoice(); navigate({ to: "/invoice", search: { id: inv.id } }); }}
                >
                  <Printer className="h-3.5 w-3.5 mr-1.5" /> View & Print Invoice
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

/* Helper component for summary rows */
function SumRow({
  label,
  value,
  bold = false,
  muted = false,
  accent,
}: {
  label: string;
  value: string;
  bold?: boolean;
  muted?: boolean;
  accent?: "green";
}) {
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-border/30 last:border-0">
      <span className={muted ? "text-muted-foreground/70" : "text-muted-foreground"}>{label}</span>
      <span
        className={`font-mono tabular-nums ${bold ? "font-semibold text-foreground" : ""} ${muted ? "text-muted-foreground/70" : "text-foreground"} ${accent === "green" ? "text-emerald-600 dark:text-emerald-400" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}
