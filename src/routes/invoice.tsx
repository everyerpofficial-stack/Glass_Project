import { createFileRoute, useSearch, useNavigate, Link } from "@tanstack/react-router";
import { Printer, Edit, ArrowLeft, CheckCircle2, MoveHorizontal, X, Factory } from "lucide-react";
import { useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useGQ } from "@/lib/store";
import { buildPrintHTML, computeTotals, dmy, formatPiNo } from "@/lib/gq";
import { printElement } from "@/lib/print";

export const Route = createFileRoute("/invoice")({
  /* Three routes deep-link here with ?id=. Declaring the schema keeps the param
     typed and stops it being dropped on a navigate, the way /order and
     /work-order already do. */
  validateSearch: (search: Record<string, unknown>): { id?: string | undefined } => ({
    id: typeof search["id"] === "string" ? (search["id"] as string) : undefined,
  }),
  component: InvoiceViewPage,
});

export function InvoiceViewPage() {
  const navigate = useNavigate();
  const searchParams = useSearch({ strict: false }) as { id?: string };
  const { invoices, inv: activeInv, settings, loadInvoice } = useGQ();

  // Selected invoice record (either from URL search query ?id=... or active inv in state)
  /* A link to ?id=<deleted record> used to fall through to whatever draft was
     loaded, printing one document under another one’s link. Distinguish "not
     found" from "no id given" so the page can say which happened. */
  const requestedId = searchParams?.id;

  const foundRecord = invoices.find(
    (inv: any) =>
      inv.id === requestedId ||
      inv.no === requestedId ||
      inv.orderNo === requestedId ||
      inv.preProformaNo === requestedId,
  );

  const missing = requestedId && !foundRecord;
  const targetInv = foundRecord || activeInv;

  const isProforma = targetInv.docType === "proforma";

  const totals = useMemo(() => {
    return computeTotals(settings, targetInv);
  }, [settings, targetInv]);

  const printHTML = useMemo(() => {
    return buildPrintHTML(settings, targetInv, totals);
  }, [settings, targetInv, totals]);

  /* Print the document itself, not the page around it. */
  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = () => {
    printElement(printRef.current, { orientation: "portrait" });
  };

  return (
    <div className="space-y-4 sm:space-y-6 pb-20">
      {missing && (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-xs text-amber-700 dark:text-amber-400 print:hidden">
          That record no longer exists — it may have been deleted on another device. Showing the
          document currently open in the editor instead.
        </div>
      )}
      {/* ---------- Mobile / Desktop Action Header ---------- */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-3 sm:pb-4 print:hidden">
        <div className="flex items-center gap-2.5 min-w-0">
          <Button asChild variant="outline" size="sm" className="h-9 px-2.5 shrink-0">
            <Link to={isProforma ? "/order" : "/booking"}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">
                {isProforma ? "Back to Order Confirms" : "Back to Proforma Invoices"}
              </span>
            </Link>
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground truncate">
                {isProforma ? "Order Confirm" : "Proforma Invoice"} #{formatPiNo(targetInv.no)}
              </h1>
              {targetInv.sync === "synced" ? (
                <Badge
                  variant="outline"
                  className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] py-0"
                >
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Synced
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] py-0">
                  Local
                </Badge>
              )}
            </div>
            <p className="text-[11px] sm:text-xs text-muted-foreground truncate">
              {targetInv.cust?.name || "Unnamed"} · {dmy(targetInv.date)}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              loadInvoice(targetInv.id, false);
              navigate({ to: isProforma ? "/order" : "/booking", search: { view: "form" } });
            }}
            className="h-9 text-xs"
          >
            <Edit className="h-3.5 w-3.5 mr-1" /> Edit
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              navigate({
                to: isProforma ? "/order" : "/booking",
                search: { detailId: targetInv.id, tab: "cutsheet" } as any,
              });
            }}
            className="h-9 text-xs font-semibold bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40 cursor-pointer"
            title="View Work Order Cut Sheet & Barcode Stickers"
          >
            <Factory className="h-4 w-4 mr-1.5" /> Work Order
          </Button>

          <Button
            size="sm"
            onClick={handlePrint}
            className="h-9 text-xs font-semibold shadow-sm bg-primary text-primary-foreground"
          >
            <Printer className="h-4 w-4 mr-1.5" /> Print / Save PDF
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              navigate({ to: isProforma ? "/order" : "/booking", search: { view: "list" } });
            }}
            className="h-9 text-xs text-rose-600 dark:text-rose-400 border-rose-500/30 hover:bg-rose-500/10 font-semibold"
            title="Close preview and return"
          >
            <X className="h-4 w-4 mr-1" /> Close
          </Button>
        </div>
      </div>

      {/* Mobile Scroll Indicator Banner */}
      <div className="flex sm:hidden items-center justify-between px-3 py-2 rounded-md bg-muted/40 border border-border/50 text-[11px] text-muted-foreground print:hidden">
        <span className="flex items-center gap-1.5">
          <MoveHorizontal className="h-3.5 w-3.5 text-primary animate-pulse" />
          Swipe horizontally to view full Proforma Invoice PDF
        </span>
        <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
          A4 PDF Preview
        </Badge>
      </div>

      {/* ---------- Printable Document Card (100% Mobile & Print Responsive) ---------- */}
      <Card className="border border-border/80 shadow-lg bg-white text-black max-w-4xl mx-auto overflow-hidden print:shadow-none print:border-none print:m-0 print:p-0">
        <CardContent className="p-1 sm:p-6 print:p-0">
          <div className="overflow-x-auto w-full scrollbar-thin">
            <div
              ref={printRef}
              className="doc-preview bg-white text-black min-w-[650px] sm:min-w-0"
              dangerouslySetInnerHTML={{ __html: printHTML || "" }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
