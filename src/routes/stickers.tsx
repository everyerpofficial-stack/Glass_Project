import { createFileRoute, Link } from "@tanstack/react-router";
import { Printer, Tag, RefreshCw } from "lucide-react";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGQ } from "@/lib/store";
import { toast } from "sonner";

export const Route = createFileRoute("/stickers")({
  component: StickersPage,
});

/* ── Pure JS Code128B barcode SVG (same as work-order) ────────────── */
function generateBarcodeSVG(text: string, height = 36, barWidth = 1.2): string {
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

  let checksum = 104;
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

/* ─── Main Stickers Page ─────────────────────────────────────────────── */
function StickersPage() {
  const { workOrders, invoices, settings } = useGQ();
  const [selectedWOId, setSelectedWOId] = useState<string>("");
  const [labelsPerRow, setLabelsPerRow] = useState<number>(2);

  const activeWO = useMemo(
    () => workOrders.find((x) => x.id === selectedWOId),
    [workOrders, selectedWOId],
  );

  /* Build label data from work order */
  const labels = useMemo(() => {
    if (!activeWO) return [];
    return activeWO.pieces.map((piece: any, idx: number) => ({
      customer: activeWO.customer,
      piNo: activeWO.piNo,
      woNo: activeWO.woNo?.replace("WO-", "") || activeWO.orderNo,
      size: `${piece.heightMM} X ${piece.widthMM}`,
      sn: piece.sr,
      glassType: activeWO.glassDesc || `${activeWO.thickness}mm ${activeWO.productName}`,
      pieceOf: piece.pieceOf,
      shape: piece.shape,
      code: `${idx + 1} ${piece.shape === "BLOCK" ? "W1" : "SD1"}`,
      partyWO: activeWO.orderNo,
      barcode: piece.barcode,
    }));
  }, [activeWO]);

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
              <span className="text-primary">Sticker Labels</span>
            </div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground leading-tight flex items-center gap-2">
              <Tag className="h-5 w-5 text-yellow-500" />
              Sticker Labels
            </h1>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Select work order */}
            <Select value={selectedWOId} onValueChange={setSelectedWOId}>
              <SelectTrigger className="h-8 text-xs w-52">
                <SelectValue placeholder="Select work order…" />
              </SelectTrigger>
              <SelectContent>
                {workOrders.length === 0 && (
                  <div className="px-3 py-2 text-xs text-muted-foreground">No work orders yet</div>
                )}
                {workOrders.map((wo) => (
                  <SelectItem key={wo.id} value={wo.id}>
                    {wo.woNo} — {wo.customer?.split(" ").slice(0, 2).join(" ") || "—"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* Labels per row */}
            <Select value={String(labelsPerRow)} onValueChange={(v) => setLabelsPerRow(Number(v))}>
              <SelectTrigger className="h-8 text-xs w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 per row</SelectItem>
                <SelectItem value="2">2 per row</SelectItem>
                <SelectItem value="3">3 per row</SelectItem>
                <SelectItem value="4">4 per row</SelectItem>
              </SelectContent>
            </Select>
            {labels.length > 0 && (
              <Button
                size="sm"
                className="h-8 text-xs gap-1.5 bg-yellow-600 hover:bg-yellow-700 text-black font-bold"
                onClick={handlePrint}
              >
                <Printer className="h-3.5 w-3.5" /> Print Labels
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ── LABELS ──────────────────────────── */}
      <div className="p-3 sm:p-4">
        {!activeWO ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-yellow-500/10 flex items-center justify-center mb-4">
              <Tag className="h-8 w-8 text-yellow-500/60" />
            </div>
            <h2 className="text-lg font-semibold text-foreground mb-1">No Labels to Show</h2>
            <p className="text-sm text-muted-foreground max-w-md">
              Generate a Work Order first, then select it here to preview and print barcode sticker labels for each glass piece.
            </p>
          </div>
        ) : (
          <div className="sticker-print-area">
            {/* Info bar */}
            <div className="mb-4 flex items-center justify-between text-xs text-muted-foreground print:hidden">
              <span>{labels.length} label(s) for {activeWO.customer}</span>
              <span className="font-mono">WO: {activeWO.woNo}</span>
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
                  className="sticker-label bg-[#FFD700] text-black rounded-lg print:rounded-none border-2 border-yellow-700/30 p-3 print:p-2 flex flex-col gap-1 break-inside-avoid"
                  style={{ minHeight: "140px" }}
                >
                  {/* Customer name */}
                  <div className="text-[11px] font-black uppercase leading-tight tracking-wide truncate">
                    {label.customer}
                  </div>

                  {/* PI / WO / Size / SN row */}
                  <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px]">
                    <div><span className="font-bold">PI :</span> <span className="font-mono">{label.piNo}</span></div>
                    <div><span className="font-bold">WO :</span> <span className="font-mono">{label.woNo}</span></div>
                    <div><span className="font-bold">Size :</span> <span className="font-mono font-bold">{label.size}</span></div>
                    <div><span className="font-bold">SN :</span> <span className="font-mono">{label.sn}</span></div>
                  </div>

                  {/* Glass type */}
                  <div className="text-[9px] uppercase leading-tight truncate">
                    {label.glassType} <span className="font-bold">of {label.pieceOf?.split(" of ")[1] || "1"}</span>
                  </div>

                  {/* Shape + Code */}
                  <div className="flex items-center justify-between text-[10px]">
                    <div className="font-black text-sm">{label.shape}</div>
                    <div className="text-[9px]"><span className="font-bold">Code :</span> {label.code}</div>
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
