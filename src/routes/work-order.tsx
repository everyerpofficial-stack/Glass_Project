import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Printer,
  FileText,
  Factory,
  ChevronDown,
  RefreshCw,
  Download,
} from "lucide-react";
import { useState, useMemo } from "react";
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
import { nf, dmy } from "@/lib/gq";
import { toast } from "sonner";

export const Route = createFileRoute("/work-order")({
  component: WorkOrderPage,
});

/* ── Pure JS Code128B barcode SVG generator ────────────────────────── */
function generateBarcodeSVG(text: string, height = 40, barWidth = 1.5): string {
  const CODE128B: Record<string, string> = {
    " ": "11011001100", "!": "11001101100", '"': "11001100110",
    "#": "10010011000", "$": "10010001100", "%": "10001001100",
    "&": "10011001000", "'": "10011000100", "(": "10001100100",
    ")": "11001001000", "*": "11001000100", "+": "11000100100",
    ",": "10110011100", "-": "10011011100", ".": "10011001110",
    "/": "10111001100", "0": "10011101100", "1": "10011100110",
    "2": "11001110010", "3": "11001011100", "4": "11001001110",
    "5": "11011100100", "6": "11001110100", "7": "11101101110",
    "8": "11101001100", "9": "11100101100", ":": "11100100110",
    ";": "11101100100", "<": "11100110100", "=": "11100110010",
    ">": "11011011000", "?": "11011000110", "@": "11000110110",
    A: "10100011000", B: "10001011000", C: "10001000110",
    D: "10110001000", E: "10001101000", F: "10001100010",
    G: "11010001000", H: "11000101000", I: "11000100010",
    J: "10110111000", K: "10110001110", L: "10001101110",
    M: "10111011000", N: "10111000110", O: "10001110110",
    P: "11101110110", Q: "11010001110", R: "11000101110",
    S: "11011101000", T: "11011100010", U: "11011101110",
    V: "11101011000", W: "11101000110", X: "11100010110",
    Y: "11101101000", Z: "11101100010", "[": "11100011010",
    "\\": "11101111010", "]": "11001000010", "^": "11110001010",
    _: "10100110000", "`": "10100001100", a: "10010110000",
    b: "10010000110", c: "10000101100", d: "10000100110",
    e: "10110010000", f: "10110000100", g: "10011010000",
    h: "10011000010", i: "10000110100", j: "10000110010",
    k: "11000010010", l: "11001010000", m: "11110111010",
    n: "11000010100", o: "10001111010", p: "10100111100",
    q: "10010111100", r: "10010011110", s: "10111100100",
    t: "10011110100", u: "10011110010", v: "11110100100",
    w: "11110010100", x: "11110010010", y: "11011011110",
    z: "11011110110", "{": "11110110110", "|": "10101111000",
    "}": "10100011110", "~": "10001011110",
  };
  const START_B = "11010010000";
  const STOP = "1100011101011";

  let checksum = 104; // Start B value
  let pattern = START_B;
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i) - 32;
    checksum += charCode * (i + 1);
    pattern += CODE128B[text[i]] || "10101111000";
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

/* ─── Main Work Order Page ───────────────────────────────────────────── */
function WorkOrderPage() {
  const {
    invoices,
    workOrders,
    settings,
    generateWorkOrder,
    saveWorkOrder,
    updateInvoiceStatus,
  } = useGQ();

  const [selectedOrderId, setSelectedOrderId] = useState<string>("");
  const [activeWO, setActiveWO] = useState<any>(null);

  /* Get confirmed orders */
  const confirmedOrders = useMemo(
    () => invoices.filter((x) => x.status === "order_confirmed" || x.status === "work_order_generated"),
    [invoices],
  );

  const handleGenerateWO = () => {
    if (!selectedOrderId) {
      toast.error("Select an order first");
      return;
    }
    const wo = generateWorkOrder(selectedOrderId);
    if (wo) {
      saveWorkOrder(wo);
      updateInvoiceStatus(selectedOrderId, "work_order_generated");
      setActiveWO(wo);
      toast.success("Work order generated!");
    }
  };

  const handleLoadExisting = (woId: string) => {
    const wo = workOrders.find((x) => x.id === woId);
    if (wo) setActiveWO(wo);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* ── PAGE HEADER ───────────────────────────── */}
      <div className="border-b border-border bg-card px-3 sm:px-6 py-3 print:hidden">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-0.5">
              <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
              {" / "}
              <span className="text-primary">Work Order</span>
            </div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground leading-tight flex items-center gap-2">
              <Factory className="h-5 w-5 text-amber-500" />
              Work Order
              {activeWO && <span className="text-amber-500 text-sm font-mono">#{activeWO.woNo}</span>}
            </h1>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Select order */}
            <Select value={selectedOrderId} onValueChange={setSelectedOrderId}>
              <SelectTrigger className="h-8 text-xs w-48">
                <SelectValue placeholder="Select confirmed order…" />
              </SelectTrigger>
              <SelectContent>
                {confirmedOrders.length === 0 && (
                  <div className="px-3 py-2 text-xs text-muted-foreground">No confirmed orders yet</div>
                )}
                {confirmedOrders.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.no} — {o.cust?.name || "Unknown"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              className="h-8 text-xs gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
              onClick={handleGenerateWO}
            >
              <Factory className="h-3.5 w-3.5" /> Generate WO
            </Button>
            {activeWO && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1.5"
                onClick={handlePrint}
              >
                <Printer className="h-3.5 w-3.5" /> Print
              </Button>
            )}
          </div>
        </div>

        {/* Existing work orders */}
        {workOrders.length > 0 && (
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Recent:</span>
            {workOrders.slice(0, 5).map((wo) => (
              <button
                key={wo.id}
                onClick={() => handleLoadExisting(wo.id)}
                className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${
                  activeWO?.id === wo.id
                    ? "bg-amber-500/15 border-amber-500/40 text-amber-700 dark:text-amber-400"
                    : "border-border hover:bg-muted/50 text-muted-foreground"
                }`}
              >
                {wo.woNo} · {wo.customer?.split(" ")[0] || "—"}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── WORK ORDER CONTENT ──────────────────────────── */}
      <div className="p-3 sm:p-4">
        {!activeWO ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-4">
              <Factory className="h-8 w-8 text-amber-500/60" />
            </div>
            <h2 className="text-lg font-semibold text-foreground mb-1">No Work Order Selected</h2>
            <p className="text-sm text-muted-foreground max-w-md">
              Select a confirmed order from the dropdown above and click "Generate WO" to create a work order for the factory.
            </p>
          </div>
        ) : (
          <div className="wo-print-area bg-white text-black rounded-lg border border-border shadow-sm overflow-hidden print:shadow-none print:border-none print:rounded-none">
            {/* WO Header */}
            <div className="border-b-2 border-black p-4 print:p-3">
              <div className="flex justify-between items-start">
                <div className="text-[11px] space-y-0.5">
                  <div><span className="font-bold">Customer :</span> {activeWO.customer}</div>
                  <div><span className="font-bold">PI No. :</span> {activeWO.piNo}</div>
                  <div><span className="font-bold">PI Date :</span> {dmy(activeWO.piDate)}</div>
                  <div><span className="font-bold">Dispatch To :</span> {activeWO.dispatchTo || "—"}</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-black tracking-wide text-black">WORK ORDER</div>
                  <div className="text-[11px] mt-1 space-y-0.5">
                    <div><span className="font-bold">Order No :</span> <span className="font-mono text-sm font-bold">{activeWO.orderNo}</span></div>
                    <div><span className="font-bold">Our Date :</span> {dmy(activeWO.piDate)}</div>
                    <div><span className="font-bold">Del Date :</span> —</div>
                  </div>
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-gray-300 text-[11px]">
                <div><span className="font-bold">PO No. :</span> {activeWO.poNo || "—"} &nbsp;&nbsp; <span className="font-bold">Project :</span> {activeWO.project || "—"}</div>
                <div className="mt-1 font-bold text-sm">{activeWO.glassDesc || `${activeWO.thickness}mm ${activeWO.productName}`}</div>
                {activeWO.layerInfo?.length > 0 && (
                  <div className="text-[10px] text-gray-600 mt-0.5">
                    {activeWO.layerInfo.map((l: any, i: number) => (
                      <span key={i}>{l.layerNo}: {l.productName} {l.thickness}mm{i < activeWO.layerInfo.length - 1 ? " | " : ""}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* WO Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-[10px] border-collapse" style={{ minWidth: "900px" }}>
                <thead>
                  <tr className="bg-gray-100 border-b-2 border-black">
                    {["SR\nNo", "L1-Inch", "L2-Inch", "Height\nMM", "Width\nMM", "Qty", "Act Totl", "Hole", "Big\nHole", "Cut Out", "Big\nCutout", "Shape", "Barcode", "Remark"].map((h, i) => (
                      <th key={i} className="border border-gray-400 px-1.5 py-1.5 text-[9px] font-bold uppercase text-black whitespace-pre-line text-center">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {activeWO.pieces.map((piece: any, idx: number) => (
                    <tr key={idx} className="border-b border-gray-300 hover:bg-gray-50">
                      <td className="border border-gray-300 px-1.5 py-1 text-center font-bold">{piece.sr}</td>
                      <td className="border border-gray-300 px-1.5 py-1 text-center font-mono">{piece.l1 || "—"}</td>
                      <td className="border border-gray-300 px-1.5 py-1 text-center font-mono">{piece.l2 || "—"}</td>
                      <td className="border border-gray-300 px-1.5 py-1 text-center font-mono font-semibold">{piece.heightMM}</td>
                      <td className="border border-gray-300 px-1.5 py-1 text-center font-mono font-semibold">{piece.widthMM}</td>
                      <td className="border border-gray-300 px-1.5 py-1 text-center">{piece.qty}</td>
                      <td className="border border-gray-300 px-1.5 py-1 text-right font-mono">{nf(piece.area, 3)}</td>
                      <td className="border border-gray-300 px-1.5 py-1 text-center">{piece.hole || ""}</td>
                      <td className="border border-gray-300 px-1.5 py-1 text-center">{piece.bigHole || ""}</td>
                      <td className="border border-gray-300 px-1.5 py-1 text-center">{piece.cutOut || ""}</td>
                      <td className="border border-gray-300 px-1.5 py-1 text-center">{piece.bigCutout || ""}</td>
                      <td className="border border-gray-300 px-1.5 py-1 text-center font-bold">{piece.shape}</td>
                      <td className="border border-gray-300 px-1.5 py-1 text-center font-mono text-[9px]">{piece.barcode}</td>
                      <td className="border border-gray-300 px-1.5 py-1 text-center text-[9px]">{piece.remark}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-100 border-t-2 border-black font-bold">
                    <td colSpan={5} className="border border-gray-400 px-2 py-1.5 text-right">Total</td>
                    <td className="border border-gray-400 px-1.5 py-1.5 text-center">{activeWO.totalPieces}</td>
                    <td className="border border-gray-400 px-1.5 py-1.5 text-right font-mono">{nf(activeWO.totalSqm, 3)}</td>
                    <td colSpan={7} className="border border-gray-400 px-2 py-1.5 text-[10px]">
                      Weight: {activeWO.weightKg || "—"} kg &nbsp;|&nbsp; SQF: {nf(activeWO.totalSqft, 3)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* WO Footer */}
            <div className="p-3 border-t-2 border-black text-[10px] flex justify-between print:p-2">
              <div>
                <span className="font-bold">Wastage :</span> — &nbsp;&nbsp;
                <span className="font-bold">Total Pcs :</span> {activeWO.totalPieces} &nbsp;&nbsp;
                <span className="font-bold">Weight :</span> {activeWO.weightKg || "—"} kg
              </div>
              <div className="text-right text-gray-500">
                Page 1
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
