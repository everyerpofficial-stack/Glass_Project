import { createFileRoute, useSearch, useNavigate, Link } from "@tanstack/react-router";
import {
  Printer,
  Edit,
  Copy,
  FileSpreadsheet,
  ArrowLeft,
  CheckCircle2,
  Share2,
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
    <div className="space-y-6 pb-16">
      {/* ---------- Action Bar (Hidden on Print) ---------- */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-4 print:hidden">
        <div className="flex items-center gap-3">
          <Button asChild variant="outline" size="sm">
            <Link to="/quotes">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back to Quotes
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                Proforma Invoice #{targetInv.no}
              </h1>
              {targetInv.sync === "synced" ? (
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Synced
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px]">Local Record</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Customer: {targetInv.cust?.name || "Unnamed"} · Date: {dmy(targetInv.date)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleCopySummary}>
            <Share2 className="h-3.5 w-3.5 mr-1" /> Copy Summary
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              loadInvoice(targetInv.id, false);
              navigate({ to: "/quote" });
            }}
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
          >
            <Copy className="h-3.5 w-3.5 mr-1" /> Duplicate
          </Button>

          {settings.sheetUrl && (
            <Button variant="outline" size="sm" onClick={() => syncOne(targetInv)}>
              <FileSpreadsheet className="h-3.5 w-3.5 mr-1 text-emerald-500" /> Sync Sheet
            </Button>
          )}

          <Button size="sm" onClick={handlePrint} className="shadow-sm">
            <Printer className="h-4 w-4 mr-1.5" /> Print / Save PDF
          </Button>
        </div>
      </div>

      {/* ---------- Printable Document Card (100% Exact PDF Format) ---------- */}
      <Card className="border border-border/80 shadow-xl bg-white text-black max-w-4xl mx-auto overflow-hidden print:shadow-none print:border-none print:m-0 print:p-0">
        <CardContent className="p-4 sm:p-8 print:p-0">
          <div
            className="doc-preview bg-white text-black"
            dangerouslySetInnerHTML={{ __html: printHTML || "" }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
