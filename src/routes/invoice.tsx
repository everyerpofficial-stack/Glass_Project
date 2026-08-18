import { createFileRoute, useSearch, useNavigate, Link } from "@tanstack/react-router";
import {
  Printer,
  Edit,
  Copy,
  FileSpreadsheet,
  ArrowLeft,
  CheckCircle2,
  Share2,
  MoveHorizontal,
} from "lucide-react";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useGQ } from "@/lib/store";
import { buildPrintHTML, computeTotals, cur, dmy } from "@/lib/gq";
import { toast } from "sonner";

export const Route = createFileRoute("/invoice")({
  component: InvoiceViewPage,
});

export function InvoiceViewPage() {
  const navigate = useNavigate();
  const searchParams = useSearch({ strict: false }) as { id?: string };
  const { invoices, inv: activeInv, settings, loadInvoice, syncOne } = useGQ();

  // Selected invoice record (either from URL search query ?id=... or active inv in state)
  const targetInv = useMemo(() => {
    if (searchParams?.id) {
      const found = invoices.find((x) => x.id === searchParams.id);
      if (found) return found;
    }
    return activeInv;
  }, [searchParams?.id, invoices, activeInv]);

  const totals = useMemo(() => {
    return computeTotals(settings, targetInv);
  }, [settings, targetInv]);

  const printHTML = useMemo(() => {
    return buildPrintHTML(settings, targetInv, totals);
  }, [settings, targetInv, totals]);

  const handlePrint = () => {
    window.print();
  };

  const handleCopySummary = () => {
    const text = `PROFORMA INVOICE: ${targetInv.no}\nCustomer: ${targetInv.cust?.name}\nDate: ${targetInv.date}\nGrand Total: ${cur(totals.grandTotal, settings.currency)}`;
    navigator.clipboard.writeText(text);
    toast.success("Invoice summary copied to clipboard");
  };

  return (
    <div className="space-y-4 sm:space-y-6 pb-20">
      {/* ---------- Mobile / Desktop Action Header ---------- */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-3 sm:pb-4 print:hidden">
        <div className="flex items-center gap-2.5 min-w-0">
          <Button asChild variant="outline" size="sm" className="h-9 px-2.5 shrink-0">
            <Link to="/quotes">
              <ArrowLeft className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Back to Quotes</span>
            </Link>
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground truncate">
                Invoice #{targetInv.no}
              </h1>
              {targetInv.sync === "synced" ? (
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] py-0">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Synced
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] py-0">Local</Badge>
              )}
            </div>
            <p className="text-[11px] sm:text-xs text-muted-foreground truncate">
              {targetInv.cust?.name || "Unnamed"} · {dmy(targetInv.date)}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleCopySummary} className="h-9 text-xs">
            <Share2 className="h-3.5 w-3.5 mr-1" /> Copy Summary
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              loadInvoice(targetInv.id, false);
              navigate({ to: "/quote" });
            }}
            className="h-9 text-xs"
          >
            <Edit className="h-3.5 w-3.5 mr-1" /> Edit Quote
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              loadInvoice(targetInv.id, true);
              navigate({ to: "/quote" });
            }}
            className="h-9 text-xs"
          >
            <Copy className="h-3.5 w-3.5 mr-1" /> Duplicate
          </Button>

          {settings.sheetUrl && (
            <Button variant="outline" size="sm" onClick={() => syncOne(targetInv)} className="h-9 text-xs">
              <FileSpreadsheet className="h-3.5 w-3.5 mr-1 text-emerald-500" /> Sync Sheet
            </Button>
          )}

          <Button size="sm" onClick={handlePrint} className="col-span-2 sm:col-span-1 h-9 text-xs font-semibold shadow-sm bg-primary text-primary-foreground">
            <Printer className="h-4 w-4 mr-1.5" /> Print / Save PDF
          </Button>
        </div>
      </div>

      {/* Mobile Scroll Indicator Banner */}
      <div className="flex sm:hidden items-center justify-between px-3 py-2 rounded-md bg-muted/40 border border-border/50 text-[11px] text-muted-foreground print:hidden">
        <span className="flex items-center gap-1.5">
          <MoveHorizontal className="h-3.5 w-3.5 text-primary animate-pulse" />
          Swipe horizontally to view full Proforma Invoice PDF
        </span>
        <Badge variant="secondary" className="text-[9px] px-1.5 py-0">A4 PDF Preview</Badge>
      </div>

      {/* ---------- Printable Document Card (100% Mobile & Print Responsive) ---------- */}
      <Card className="border border-border/80 shadow-lg bg-white text-black max-w-4xl mx-auto overflow-hidden print:shadow-none print:border-none print:m-0 print:p-0">
        <CardContent className="p-1 sm:p-6 print:p-0">
          <div className="overflow-x-auto w-full scrollbar-thin">
            <div
              className="doc-preview bg-white text-black min-w-[650px] sm:min-w-0"
              dangerouslySetInnerHTML={{ __html: printHTML || "" }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
