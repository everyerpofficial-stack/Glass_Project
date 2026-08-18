import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Plus,
  Trash2,
  Save,
  RefreshCw,
  Printer,
  FileSpreadsheet,
  Search,
  UserCheck,
  ChevronDown,
  CalendarDays,
  FileText,
  MessageSquare,
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
import { nf } from "@/lib/gq";
import { toast } from "sonner";

export const Route = createFileRoute("/order")({
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

/* ─── Main Order Page ────────────────────────────────────────────── */
function OrderPage() {
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

  return (
    <div className="min-h-screen bg-background">
      {/* ── PAGE HEADER ───────────────────────────── */}
      <div className="border-b border-border bg-card px-3 sm:px-6 py-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-0.5">
              <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
              {" / "}
              <span className="text-primary">Customer Invoice (Order / Sales Invoice)</span>
            </div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground leading-tight">
              {inv._saved ? inv.no : "New Order"}
            </h1>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={newInvoice}>
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
              <span className="hidden sm:inline">R/Print</span>
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={saveInvoice}
            >
              <Save className="h-3.5 w-3.5" /> Save
            </Button>
          </div>
        </div>
      </div>

      {/* ── CONTENT ──────────────────────────── */}
      <div className="p-3 sm:p-4">
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-4">

          {/* ════ LEFT COLUMN ════ */}
          <div className="space-y-4">

            {/* 1. Order Header */}
            <Section title="Order Details" accent="bg-red-500/5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <FieldLabel>Order No</FieldLabel>
                  <Input className="h-8 text-xs font-mono" value={inv.orderNo || ""} onChange={(e) => updateInvField("orderNo", e.target.value)} />
                </div>
                <div>
                  <FieldLabel>Date</FieldLabel>
                  <Input type="date" className="h-8 text-xs" value={inv.date || ""} onChange={(e) => updateInvField("date", e.target.value)} />
                </div>
                <div>
                  <FieldLabel>PI No</FieldLabel>
                  <Input className="h-8 text-xs font-mono" value={inv.no || ""} onChange={(e) => updateInvField("no", e.target.value)} />
                </div>
                <div>
                  <FieldLabel>Date</FieldLabel>
                  <Input type="date" className="h-8 text-xs" value={inv.date || ""} readOnly />
                </div>
              </div>
            </Section>

            {/* 2. Customer */}
            <Section
              title="Customer"
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
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-2">
                  <FieldLabel>Customer</FieldLabel>
                  <Input className="h-8 text-xs" value={inv.cust?.name || ""} onChange={(e) => updateInvField("cust.name", e.target.value)} />
                </div>
                <div>
                  <FieldLabel>Cl. Balance</FieldLabel>
                  <Input type="number" className="h-8 text-xs font-mono" value={inv.cust?.clBalance || ""} onChange={(e) => updateInvField("cust.clBalance", e.target.value === "" ? "" : Number(e.target.value))} />
                </div>
                <div>
                  <FieldLabel>Sales Person</FieldLabel>
                  <Input className="h-8 text-xs" value={inv.salesPerson || ""} onChange={(e) => updateInvField("salesPerson", e.target.value)} />
                </div>
                <div>
                  <FieldLabel>P.O. No.</FieldLabel>
                  <Input className="h-8 text-xs" value={inv.poNo || ""} onChange={(e) => updateInvField("poNo", e.target.value)} />
                </div>
                <div>
                  <FieldLabel>Freight Type</FieldLabel>
                  <Select value={inv.freightType || "To be Billed"} onValueChange={(v) => updateInvField("freightType", v)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="To be Billed">To be Billed</SelectItem>
                      <SelectItem value="Prepaid">Prepaid</SelectItem>
                      <SelectItem value="FOB">FOB</SelectItem>
                      <SelectItem value="Ex-Works">Ex-Works</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Section>

            {/* 3. Items Grid */}
            <Section title="Booking Items">
              <div className="overflow-x-auto -mx-3 sm:-mx-4">
                <table className="w-full text-[11px] border-collapse" style={{ minWidth: "850px" }}>
                  <thead>
                    <tr className="border-b border-border bg-muted/20">
                      {["Sr.", "Bk No", "Date", "Product", "Thick", "Qty", "Area", "Amount", "Glass Name", "Weight", "Job Type", "Act Area"].map((h, i) => (
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
                  <FieldLabel>Payment Term</FieldLabel>
                  <Select value={inv.delivery?.paymentTerm || ""} onValueChange={(v) => updateInvField("delivery.paymentTerm", v)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="100% Advance">100% Advance</SelectItem>
                      <SelectItem value="50% Advance">50% Advance</SelectItem>
                      <SelectItem value="30 Days Credit">30 Days Credit</SelectItem>
                      <SelectItem value="45 Days Credit">45 Days Credit</SelectItem>
                      <SelectItem value="60 Days Credit">60 Days Credit</SelectItem>
                      <SelectItem value="COD">COD</SelectItem>
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
                  <FieldLabel>Unloading Type</FieldLabel>
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
              <div className="ml-auto flex gap-2">
                <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5 bg-green-500/10 border-green-500/30 text-green-600 hover:bg-green-500/20">
                  <CalendarDays className="h-3.5 w-3.5" /> Change Delivery Date
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
                <span className="text-[11px] font-bold uppercase tracking-widest text-foreground">Particular</span>
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

                {/* Unloading/Handling */}
                <div className="flex justify-between items-center py-1.5 text-[11px] border-b border-border/30">
                  <span className="text-foreground">Unloading/Handling</span>
                  <Input type="number" className="h-6 text-[10px] font-mono w-[70px] text-right" value={inv.ch?.unloadingHandling || ""} onChange={(e) => updateInvField("ch.unloadingHandling", e.target.value === "" ? "" : Number(e.target.value))} />
                </div>

                {/* Green Tax */}
                <div className="flex justify-between items-center py-1.5 text-[11px] border-b border-border/30">
                  <span className="text-foreground">Green tax</span>
                  <Input type="number" className="h-6 text-[10px] font-mono w-[70px] text-right" value={inv.ch?.greenTax || ""} onChange={(e) => updateInvField("ch.greenTax", e.target.value === "" ? "" : Number(e.target.value))} />
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
                  <span className="text-red-500 font-bold">Net Value</span>
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
    </div>
  );
}
