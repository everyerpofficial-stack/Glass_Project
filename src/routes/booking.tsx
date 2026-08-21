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
import { blankItem, G, nf, uid } from "@/lib/gq";
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
    saveInvoice,
    newInvoice,
    updateInvoiceStatus,
  } = useGQ();

  const [bulkOpen, setBulkOpen] = useState(false);
  const inputUnit = inv.inputUnit || "inch";

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

  const updateItem = (index: number, field: string, val: any) => {
    setInv((prev: any) => {
      const copy = JSON.parse(JSON.stringify(prev));
      copy.items[index][field] = val;
      return copy;
    });
  };

  const addItemRow = () => {
    setInv((prev: any) => {
      const copy = JSON.parse(JSON.stringify(prev));
      copy.items.push(blankItem());
      return copy;
    });
  };

  const removeItemRow = (index: number) => {
    setInv((prev: any) => {
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
    setInv((prev: any) => {
      const copy = JSON.parse(JSON.stringify(prev));
      const dup = { ...copy.items[index], id: "it-" + Date.now() };
      copy.items.splice(index + 1, 0, dup);
      return copy;
    });
  };

  const handleBulkAdd = (items: any[]) => {
    setInv((prev: any) => {
      const copy = JSON.parse(JSON.stringify(prev));
      // Remove empty first item if it exists
      if (copy.items.length === 1 && !copy.items[0].l1 && !copy.items[0].l1mm) {
        copy.items = items;
      } else {
        copy.items.push(...items);
      }
      return copy;
    });
  };

  const addLayer = () => {
    setInv((prev: any) => {
      const copy = JSON.parse(JSON.stringify(prev));
      if (!copy.layers) copy.layers = [];
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
      });
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
      copy.layers.splice(index, 1);
      return copy;
    });
  };

  const updateLayer = (index: number, field: string, val: any) => {
    setInv((prev: any) => {
      const copy = JSON.parse(JSON.stringify(prev));
      if (!copy.layers) copy.layers = [];
      if (copy.layers[index]) copy.layers[index][field] = val;
      return copy;
    });
  };

  const layers = inv.layers || [{ id: "l1", layerNo: "Layer - 1", productName: inv.productName || "TOUGHENED GLASS", thickness: inv.glass?.thickness || 5, glassName: "", rate: "", process: "", status: "" }];

  const handleSendPI = () => {
    saveInvoice();
    if (inv._saved && inv.id) {
      updateInvoiceStatus(inv.id, "pi_sent");
    }
    toast.success("PI saved & marked as sent to customer");
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
              <span className="text-primary">SGU Booking</span>
            </div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground leading-tight">
              {inv._saved ? inv.no : "New Booking"}
              {inv.status && (
                <span className={`ml-2 text-[10px] px-2 py-0.5 rounded-full font-medium uppercase tracking-wider ${
                  inv.status === "pi_sent" ? "bg-blue-500/10 text-blue-600" :
                  inv.status === "order_confirmed" ? "bg-emerald-500/10 text-emerald-600" :
                  inv.status === "work_order_generated" ? "bg-amber-500/10 text-amber-600" :
                  "bg-muted text-muted-foreground"
                }`}>
                  {inv.status === "pi_sent" ? "PI Sent" : inv.status === "order_confirmed" ? "Confirmed" : inv.status === "work_order_generated" ? "WO Generated" : "Draft"}
                </span>
              )}
            </h1>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={newInvoice}>
              <RefreshCw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Start fresh</span>
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={saveInvoice}
            >
              <Save className="h-3.5 w-3.5" /> Save
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
              onClick={handleSendPI}
            >
              <Send className="h-3.5 w-3.5" /> Send PI
            </Button>
          </div>
        </div>
      </div>

      {/* ── CONTENT ─────────────────────────────────── */}
      <div className="p-3 sm:p-4">
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4">

          {/* ════ LEFT COLUMN ════ */}
          <div className="space-y-4">
            {/* 1. Booking Header */}
            <Section title="Booking Details">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <FieldLabel>No</FieldLabel>
                  <Input className="h-8 text-xs font-mono" value={inv.no || ""} onChange={(e) => updateInvField("no", e.target.value)} />
                </div>
                <div>
                  <FieldLabel>Date</FieldLabel>
                  <Input type="date" className="h-8 text-xs" value={inv.date || ""} onChange={(e) => updateInvField("date", e.target.value)} />
                </div>
                <div>
                  <FieldLabel>Project Name</FieldLabel>
                  <Input className="h-8 text-xs" value={inv.projectRemark || ""} onChange={(e) => updateInvField("projectRemark", e.target.value)} placeholder="—" />
                </div>
                <div>
                  <FieldLabel>Party Name</FieldLabel>
                  <Input className="h-8 text-xs" value={inv.cust?.name || ""} onChange={(e) => updateInvField("cust.name", e.target.value)} />
                </div>
              </div>
            </Section>

            {/* 2. Size & Rate Config */}
            <Section title="Configuration" accent="bg-green-500/5">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div>
                  <FieldLabel>Size Entry Type</FieldLabel>
                  <Select value={inputUnit} onValueChange={(v) => updateInvField("inputUnit", v)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mm">MM</SelectItem>
                      <SelectItem value="inch">Inch</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <FieldLabel>Extra Area Formula</FieldLabel>
                  <Select value={inv.ch?.extraAreaFormula || "none"} onValueChange={(v) => updateInvField("ch.extraAreaFormula", v)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="+25mm">+ 25 MM</SelectItem>
                      <SelectItem value="+50mm">+ 50 MM</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <FieldLabel>Rate Find Formula</FieldLabel>
                  <Select value={settings.rateUnit} onValueChange={(v) => updateInvField("ch.rateUnit", v)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sqm">Sq. Metr Net</SelectItem>
                      <SelectItem value="sqft">Sq. Feet Net</SelectItem>
                      <SelectItem value="piece">Per Piece</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <FieldLabel>WO</FieldLabel>
                  <Input className="h-8 text-xs" value={inv.workOrderNo || ""} onChange={(e) => updateInvField("workOrderNo", e.target.value)} />
                </div>
                <div>
                  <FieldLabel>Final Rate</FieldLabel>
                  <Input
                    type="number"
                    className="h-8 text-xs font-mono"
                    value={inv.glass?.defaultRate ?? ""}
                    onChange={(e) => updateInvField("glass.defaultRate", e.target.value === "" ? "" : Number(e.target.value))}
                  />
                </div>
              </div>
            </Section>

            {/* 3. Product & Job Type */}
            <Section title="Product">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                <div>
                  <FieldLabel>Product Name</FieldLabel>
                  <Select value={inv.productName || "TOUGHENED GLASS"} onValueChange={(v) => updateInvField("productName", v)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TOUGHENED GLASS">TOUGHENED GLASS</SelectItem>
                      <SelectItem value="LAMINATED GLASS">LAMINATED GLASS</SelectItem>
                      <SelectItem value="DGU">DGU (Double Glazing)</SelectItem>
                      <SelectItem value="HEAT STRENGTHENED">HEAT STRENGTHENED</SelectItem>
                      <SelectItem value="CLEAR FLOAT">CLEAR FLOAT</SelectItem>
                      <SelectItem value="TINTED FLOAT">TINTED FLOAT</SelectItem>
                      <SelectItem value="REFLECTIVE">REFLECTIVE</SelectItem>
                      <SelectItem value="LOW-E">LOW-E</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <FieldLabel>Job Type</FieldLabel>
                  <Select value={inv.jobType || "WITH MATERIAL"} onValueChange={(v) => updateInvField("jobType", v)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="WITH MATERIAL">WITH MATERIAL</SelectItem>
                      <SelectItem value="WITHOUT MATERIAL">WITHOUT MATERIAL</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <FieldLabel>Glass Description</FieldLabel>
                  <Input className="h-8 text-xs" value={inv.glass?.desc || ""} onChange={(e) => updateInvField("glass.desc", e.target.value)} placeholder="12 mm Clear T.G." />
                </div>
                <div>
                  <FieldLabel>Thickness (MM)</FieldLabel>
                  <Input type="number" className="h-8 text-xs font-mono" value={inv.glass?.thickness || ""} onChange={(e) => updateInvField("glass.thickness", Number(e.target.value))} />
                </div>
              </div>
            </Section>

            {/* 4. Layer System */}
            <Section
              title="Layers"
              headerRight={
                <Button size="sm" className="h-6 text-[11px] px-2 gap-1" onClick={addLayer}>
                  <Plus className="h-3 w-3" /> Add Layer
                </Button>
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
                            <SelectTrigger className="h-7 text-xs min-w-[130px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="TOUGHENED GLASS">TOUGHENED GLASS</SelectItem>
                              <SelectItem value="LAMINATED GLASS">LAMINATED GLASS</SelectItem>
                              <SelectItem value="DGU">DGU</SelectItem>
                              <SelectItem value="HEAT STRENGTHENED">HEAT STRENGTHENED</SelectItem>
                              <SelectItem value="CLEAR FLOAT">CLEAR FLOAT</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="py-1.5 px-1">
                          <Input type="number" className="h-7 text-xs font-mono w-[50px] text-center" value={layer.thickness || ""} onChange={(e) => updateLayer(idx, "thickness", Number(e.target.value))} />
                        </td>
                        <td className="py-1.5 px-1">
                          <Input className="h-7 text-xs min-w-[90px]" value={layer.glassName || ""} onChange={(e) => updateLayer(idx, "glassName", e.target.value)} />
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

            {/* 5. Items Grid */}
            <Section
              title="Items"
              headerRight={
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="h-6 text-[11px] px-2 gap-1" onClick={() => setBulkOpen(true)}>
                    <ClipboardPaste className="h-3 w-3" /> Bulk Entry
                  </Button>
                  <Button size="sm" className="h-6 text-[11px] px-2 gap-1" onClick={addItemRow}>
                    <Plus className="h-3 w-3" /> Add Row
                  </Button>
                </div>
              }
            >
              <div className="overflow-x-auto -mx-3 sm:-mx-4">
                <table className="w-full text-[11px] border-collapse" style={{ minWidth: inputUnit === "mm" ? "900px" : "1050px" }}>
                  <thead>
                    <tr className="border-b-2 border-green-600/30 bg-green-500/8">
                      {inputUnit === "mm"
                        ? ["Sr No", "L1 MM", "L2 MM", "Qty", "Area", "Charge Area", "Total Area", "Rate", "Amount", "Hole", "Cut Out", ""].map((h, i) => (
                            <th key={i} className="py-2 px-2 text-[10px] font-semibold uppercase tracking-widest text-green-800 dark:text-green-400 whitespace-nowrap text-left">{h}</th>
                          ))
                        : ["Sr No", "L1 In", "L2 In", "L1 MM", "L2 MM", "Qty", "Area", "Charge Area", "Total Area", "Rate", "Amount", "Hole", "Cut Out", ""].map((h, i) => (
                            <th key={i} className="py-2 px-2 text-[10px] font-semibold uppercase tracking-widest text-green-800 dark:text-green-400 whitespace-nowrap text-left">{h}</th>
                          ))
                      }
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {inv.items.map((item: any, idx: number) => {
                      const line = totals.lines?.[idx];
                      const areaText = line?.ok ? (settings.rateUnit === "sqft" ? String(line.totalSqft) : String(line.totalSqm)) : "—";
                      const chargeAreaText = line?.ok ? (settings.rateUnit === "sqft" ? String(line.chargeAreaSqft) : String(line.chargeAreaSqm)) : "—";
                      const totalAreaText = line?.ok ? (settings.rateUnit === "sqft" ? String(line.chargeAreaSqft || line.totalSqft) : String(line.chargeAreaSqm || line.totalSqm)) : "—";

                      return (
                        <tr key={item.id || idx} className={`hover:bg-muted/10 ${!line?.ok && (item.l1 || item.l2 || item.l1mm || item.l2mm) ? "bg-red-500/5" : ""}`}>
                          {/* Sr No */}
                          <td className="py-1.5 px-2 text-center text-muted-foreground font-mono w-10">
                            <span className="text-xs font-semibold">{idx + 1}</span>
                          </td>

                          {/* Inch columns (only if inputUnit is inch) */}
                          {inputUnit !== "mm" && (
                            <>
                              <td className="py-1.5 px-1">
                                <Input
                                  className="h-8 text-xs font-mono text-center w-[80px]"
                                  value={item.l1 || ""}
                                  onChange={(e) => updateItem(idx, "l1", e.target.value)}
                                  placeholder="36 3/8"
                                />
                              </td>
                              <td className="py-1.5 px-1">
                                <Input
                                  className="h-8 text-xs font-mono text-center w-[80px]"
                                  value={item.l2 || ""}
                                  onChange={(e) => updateItem(idx, "l2", e.target.value)}
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
                                  onChange={(e) => updateItem(idx, "l1mm", e.target.value)}
                                  placeholder="60.3"
                                  step="0.1"
                                />
                              </td>
                              <td className="py-1.5 px-1">
                                <Input
                                  type="number"
                                  className="h-8 text-xs font-mono text-center w-[75px]"
                                  value={item.l2mm ?? ""}
                                  onChange={(e) => updateItem(idx, "l2mm", e.target.value)}
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
                              onChange={(e) => updateItem(idx, "qty", e.target.value === "" ? "" : Number(e.target.value))}
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
                              onChange={(e) => updateItem(idx, "rate", e.target.value === "" ? "" : Number(e.target.value))}
                              placeholder={String(inv.glass?.defaultRate || "")}
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
                              onChange={(e) => updateItem(idx, "holes", e.target.value === "" ? "" : Number(e.target.value))}
                            />
                          </td>

                          {/* Cut Out */}
                          <td className="py-1.5 px-1">
                            <Input
                              type="number"
                              className="h-8 text-xs font-mono text-center w-[44px]"
                              value={item.cutouts || ""}
                              min={0}
                              onChange={(e) => updateItem(idx, "cutouts", e.target.value === "" ? "" : Number(e.target.value))}
                            />
                          </td>

                          {/* Actions */}
                          <td className="py-1.5 px-1 w-[52px]">
                            <div className="flex items-center gap-0.5">
                              <button title="Duplicate" className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" onClick={() => duplicateItemRow(idx)}>
                                <Copy className="h-3 w-3" />
                              </button>
                              <button title="Remove" className="h-7 w-7 flex items-center justify-center rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors" onClick={() => removeItemRow(idx)}>
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
              <Button variant="outline" size="sm" className="h-8 text-[11px] gap-1.5 border-sky-500/30 text-sky-600 hover:bg-sky-500/5">
                <Printer className="h-3 w-3" /> Cover Print
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

          {/* ════ RIGHT COLUMN: Particulars Panel ════ */}
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-lg overflow-hidden sticky top-14">
              <div className="px-3 py-2 border-b border-border bg-green-500/10">
                <div className="grid grid-cols-[1fr_50px_60px_40px_65px] gap-1 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                  <span>Particular</span>
                  <span className="text-center">Qty</span>
                  <span className="text-center">Rate</span>
                  <span className="text-center">Per</span>
                  <span className="text-right">Amount</span>
                </div>
              </div>
              <div className="px-3 py-1 max-h-[calc(100vh-120px)] overflow-y-auto">
                <PRow label="Basic Amount" qty="" rate="" per="" amount={nf(totals.glassAmount ?? 0)} highlight />
                <PRow
                  label="Holes"
                  qty={totals.holes || 0}
                  rate={inv.ch?.holeRate ?? settings.holeRate ?? 35}
                  per="No"
                  amount={nf(totals.holeCharge ?? 0)}
                  onRateChange={(v) => updateInvField("ch.holeRate", v === "" ? "" : Number(v))}
                />
                <PRow
                  label="Cutout"
                  qty={totals.cutouts || 0}
                  rate={inv.ch?.cutoutRate ?? settings.cutoutRate ?? 85}
                  per="No"
                  amount={nf(totals.cutoutCharge ?? 0)}
                  onRateChange={(v) => updateInvField("ch.cutoutRate", v === "" ? "" : Number(v))}
                />
                <PRow
                  label="CSK"
                  qty={totals.csks || 0}
                  rate={inv.ch?.cskRate ?? 85}
                  per="No"
                  amount={nf(totals.cskCharge ?? 0)}
                  onRateChange={(v) => updateInvField("ch.cskRate", v === "" ? "" : Number(v))}
                />
                <PRow
                  label="Big Holes"
                  qty={totals.bigHoles || 0}
                  rate={inv.ch?.bigHoleRate ?? 150}
                  per="No"
                  amount={nf(totals.bigHoleCharge ?? 0)}
                  onRateChange={(v) => updateInvField("ch.bigHoleRate", v === "" ? "" : Number(v))}
                />
                <PRow
                  label="Big Cutout"
                  qty={totals.bigCutouts || 0}
                  rate={inv.ch?.bigCutoutRate ?? settings.bigCutoutRate ?? 500}
                  per="No"
                  amount={nf(totals.bigCutoutCharge ?? 0)}
                  onRateChange={(v) => updateInvField("ch.bigCutoutRate", v === "" ? "" : Number(v))}
                />
                <PRow
                  label="Jambo Charges"
                  qty=""
                  rate={inv.ch?.jamboChargePercent ?? 0}
                  per="%"
                  amount={nf(totals.jamboCharge ?? 0)}
                  onRateChange={(v) => updateInvField("ch.jamboChargePercent", v === "" ? "" : Number(v))}
                />
                <PRow
                  label="Non Economic"
                  qty=""
                  rate={inv.ch?.nonEconomicPercent ?? 0}
                  per="%"
                  amount={nf(totals.nonEconomicCharge ?? 0)}
                  onRateChange={(v) => updateInvField("ch.nonEconomicPercent", v === "" ? "" : Number(v))}
                />
                <PRow
                  label="Farma Cutting"
                  qty=""
                  rate={inv.ch?.farmaCuttingPercent ?? 10}
                  per="%"
                  amount={nf(totals.farmaCuttingCharge ?? 0)}
                  onRateChange={(v) => updateInvField("ch.farmaCuttingPercent", v === "" ? "" : Number(v))}
                />
                <PRow
                  label="Shape Cutting"
                  qty=""
                  rate={inv.ch?.shapeCuttingPercent ?? 10}
                  per="%"
                  amount={nf(totals.shapeCuttingCharge ?? 0)}
                  onRateChange={(v) => updateInvField("ch.shapeCuttingPercent", v === "" ? "" : Number(v))}
                />
                <PRow
                  label="Katra Polish"
                  qty=""
                  rate={inv.ch?.katraPolishRate ?? 150}
                  per="SqM"
                  amount={nf(totals.katraPolishCharge ?? 0)}
                  onRateChange={(v) => updateInvField("ch.katraPolishRate", v === "" ? "" : Number(v))}
                />
                <PRow
                  label="Design"
                  qty=""
                  rate={inv.ch?.designRate ?? 0}
                  per="SqM"
                  amount={nf(totals.designCharge ?? 0)}
                  onRateChange={(v) => updateInvField("ch.designRate", v === "" ? "" : Number(v))}
                />
                <PRow
                  label="Screen Print"
                  qty=""
                  rate={inv.ch?.screenPrintRate ?? 800}
                  per="SqM"
                  amount={nf(totals.screenPrintCharge ?? 0)}
                  onRateChange={(v) => updateInvField("ch.screenPrintRate", v === "" ? "" : Number(v))}
                />
                <PRow
                  label="Bewaling Charge"
                  qty=""
                  rate={inv.ch?.bewalingChargeRate ?? 0}
                  per="RMT"
                  amount={nf(totals.bewalingCharge ?? 0)}
                  onRateChange={(v) => updateInvField("ch.bewalingChargeRate", v === "" ? "" : Number(v))}
                />
                <PRow
                  label="Taper Charge"
                  qty=""
                  rate={inv.ch?.taperChargeRate ?? 0}
                  per="RMT"
                  amount={nf(totals.taperCharge ?? 0)}
                  onRateChange={(v) => updateInvField("ch.taperChargeRate", v === "" ? "" : Number(v))}
                />
                <PRow
                  label="Round Corner"
                  qty=""
                  rate={inv.ch?.roundCornerRate ?? 0}
                  per="NOS"
                  amount={nf(totals.roundCornerCharge ?? 0)}
                  onRateChange={(v) => updateInvField("ch.roundCornerRate", v === "" ? "" : Number(v))}
                />
                <PRow
                  label="Tapper"
                  qty=""
                  rate={inv.ch?.tapperRate ?? 0}
                  per="SqM"
                  amount={nf(totals.tapperCharge ?? 0)}
                  onRateChange={(v) => updateInvField("ch.tapperRate", v === "" ? "" : Number(v))}
                />
                <PRow
                  label="Wastage"
                  qty=""
                  rate={inv.ch?.wastageRate ?? 0}
                  per="SqM"
                  amount={nf(totals.wastageAmount ?? 0)}
                  onRateChange={(v) => updateInvField("ch.wastageRate", v === "" ? "" : Number(v))}
                />
                <PRow
                  label="Wastage 2"
                  qty=""
                  rate={inv.ch?.wastage2Rate ?? 0}
                  per="SqM"
                  amount={nf(totals.wastage2Amount ?? 0)}
                  onRateChange={(v) => updateInvField("ch.wastage2Rate", v === "" ? "" : Number(v))}
                />

                {/* Total section */}
                <div className="mt-2 pt-2 border-t-2 border-border">
                  <div className="flex justify-between items-baseline py-1 text-xs">
                    <span className="font-semibold text-foreground">Basic Amount</span>
                    <span className="font-mono font-bold text-foreground">₹ {nf(totals.basicAmount ?? 0)}</span>
                  </div>
                  <div className="flex justify-between items-baseline py-1 text-[11px]">
                    <span className="text-muted-foreground">Admin Charge</span>
                    <span className="font-mono text-foreground">₹ {nf(totals.adminCharge ?? 0)}</span>
                  </div>
                  <div className="flex justify-between items-baseline py-1 text-[11px]">
                    <span className="text-muted-foreground">Total</span>
                    <span className="font-mono font-semibold text-foreground">₹ {nf(totals.subTotal ?? 0)}</span>
                  </div>
                  {Boolean(totals.insurance) && (
                    <div className="flex justify-between items-baseline py-1 text-[11px]">
                      <span className="text-muted-foreground">Insurance</span>
                      <span className="font-mono text-foreground">₹ {nf(totals.insurance)}</span>
                    </div>
                  )}
                  {Boolean(totals.cgst) && (
                    <div className="flex justify-between items-baseline py-1 text-[11px]">
                      <span className="text-muted-foreground">C-GST</span>
                      <span className="font-mono text-foreground">₹ {nf(totals.cgst)}</span>
                    </div>
                  )}
                  {Boolean(totals.sgst) && (
                    <div className="flex justify-between items-baseline py-1 text-[11px]">
                      <span className="text-muted-foreground">S-GST</span>
                      <span className="font-mono text-foreground">₹ {nf(totals.sgst)}</span>
                    </div>
                  )}
                  {Boolean(totals.igst) && (
                    <div className="flex justify-between items-baseline py-1 text-[11px]">
                      <span className="text-muted-foreground">IGST</span>
                      <span className="font-mono text-foreground">₹ {nf(totals.igst)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-baseline py-2 text-sm mt-1 border-t border-border">
                    <span className="font-bold text-emerald-600">Grand Total</span>
                    <span className="font-mono font-bold text-lg text-emerald-600">₹ {nf(totals.grandTotal ?? 0)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side Quick Links */}
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <div className="px-3 py-2 border-b border-border bg-sky-500/5">
                <span className="text-[10px] font-bold uppercase tracking-widest text-foreground">Quick Actions</span>
              </div>
              <div className="p-2 grid grid-cols-1 gap-1">
                {[
                  { label: "PI Status", icon: BarChart3 },
                  { label: "Pending PI to Order", icon: FileSpreadsheet },
                  { label: "Production Status", icon: BarChart3 },
                  { label: "Glass Closing Stock", icon: Database },
                  { label: "Entry Log", icon: FileSpreadsheet },
                ].map((item) => (
                  <button
                    key={item.label}
                    className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[11px] font-medium text-sky-700 dark:text-sky-400 hover:bg-sky-500/8 transition-colors text-left"
                  >
                    <item.icon className="h-3 w-3 shrink-0" />
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Entry Modal */}
      <BulkEntryModal
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        onApply={handleBulkAdd}
        inputUnit={inputUnit}
      />
    </div>
  );
}
