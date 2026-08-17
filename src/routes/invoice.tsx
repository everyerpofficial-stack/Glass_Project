import { createFileRoute, useSearch, useNavigate, Link } from "@tanstack/react-router";
import {
  Printer,
  Edit,
  Copy,
  FileSpreadsheet,
  ArrowLeft,
  CheckCircle2,
  Share2,
  Building2,
  FileText,
} from "lucide-react";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useGQ } from "@/lib/store";
import { computeTotals, cur, dmy, esc, nf } from "@/lib/gq";
import { toast } from "sonner";

export const Route = createFileRoute("/invoice")({
  component: InvoiceViewPage,
});

function InvoiceViewPage() {
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

  const handlePrint = () => {
    window.print();
  };

  const handleCopySummary = () => {
    const text = `PROFORMA INVOICE: ${targetInv.no}\nCustomer: ${targetInv.cust?.name}\nDate: ${targetInv.date}\nGrand Total: ${cur(totals.grandTotal, settings.currency)}`;
    navigator.clipboard.writeText(text);
    toast.success("Invoice summary copied to clipboard");
  };

  const termsList = (settings.terms || "").split("\n").filter((x: string) => x.trim());

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
              Customer: {targetInv.cust?.name || "Unnamed"} · Date: {targetInv.date}
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

      {/* ---------- Printable Document Card ---------- */}
      <Card className="border border-border/80 shadow-lg bg-card max-w-4xl mx-auto overflow-hidden print:shadow-none print:border-none print:m-0 print:p-0">
        <CardContent className="p-6 sm:p-10 space-y-6 text-xs text-foreground">
          {/* Header section: Company Logo & Details */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between border-b border-border/60 pb-6 gap-4">
            <div className="space-y-1 max-w-lg">
              <h2 className="text-xl font-bold uppercase tracking-tight text-primary">
                {settings.coName || "Your Company Name"}
              </h2>
              {settings.addr && (
                <p className="text-xs text-muted-foreground whitespace-pre-line leading-relaxed">
                  {settings.addr}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground pt-1">
                {settings.phone && <span>Ph: {settings.phone}</span>}
                {settings.email && <span>Email: {settings.email}</span>}
                {settings.gstin && <span className="font-semibold text-foreground">GST No: {settings.gstin}</span>}
              </div>
            </div>

            <div className="text-right space-y-1">
              <div className="inline-block rounded-lg bg-primary/10 border border-primary/20 px-3 py-1.5 text-center">
                <span className="text-xs font-bold uppercase tracking-widest text-primary">
                  {settings.title || "PROFORMA INVOICE"}
                </span>
              </div>
              <div className="text-sm font-mono font-bold text-foreground pt-1">
                {targetInv.no}
              </div>
              <div className="text-xs text-muted-foreground">
                Date: <span className="font-mono text-foreground">{dmy(targetInv.date)}</span>
              </div>
            </div>
          </div>

          {/* Meta Info & Customer Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border border-border/60 rounded-xl p-4 bg-muted/20">
            <div className="space-y-1">
              <div className="font-bold text-sm text-foreground">{targetInv.cust?.name || "Customer Name"}</div>
              {targetInv.cust?.addr && (
                <div className="text-muted-foreground whitespace-pre-line leading-relaxed">{targetInv.cust.addr}</div>
              )}
              {targetInv.cust?.phone && <div>Ph: <span className="font-mono">{targetInv.cust.phone}</span></div>}
              {targetInv.cust?.email && <div>Email: {targetInv.cust.email}</div>}
              {targetInv.cust?.gstin && <div className="font-semibold pt-1">GSTIN: <span className="font-mono">{targetInv.cust.gstin}</span></div>}
            </div>

            <div className="space-y-1 text-right sm:text-left sm:border-l sm:border-border/40 sm:pl-4">
              <div><span className="text-muted-foreground">Order No:</span> <span className="font-mono font-semibold">{targetInv.orderNo || "—"}</span></div>
              <div><span className="text-muted-foreground">Party PO No:</span> <span className="font-mono">{targetInv.poNo || "—"}</span></div>
              <div><span className="text-muted-foreground">Sales Person:</span> {targetInv.salesPerson || "Office"}</div>
              <div><span className="text-muted-foreground">Project Remark:</span> {targetInv.projectRemark || "—"}</div>
              {targetInv.cust?.ship && (
                <div className="pt-2">
                  <span className="text-muted-foreground font-semibold">Dispatch To:</span>
                  <div className="text-muted-foreground whitespace-pre-line">{targetInv.cust.ship}</div>
                </div>
              )}
            </div>
          </div>

          {/* Glass Header Specs */}
          <div className="rounded-lg bg-primary/5 border border-primary/10 p-3 flex flex-wrap items-center justify-between font-medium">
            <span>Glass Item: <strong className="text-foreground">{targetInv.glass?.desc || "Toughened Glass"}</strong></span>
            <span>Thickness: <strong className="text-foreground">{targetInv.glass?.thickness} mm</strong></span>
            {targetInv.glass?.batchNo && <span>Batch No: <strong className="text-foreground">{targetInv.glass.batchNo}</strong></span>}
          </div>

          {/* Line Items Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-foreground/20 text-muted-foreground uppercase text-[10px] tracking-wider bg-muted/40">
                  <th className="py-2.5 px-2 text-center w-8">SR</th>
                  <th className="py-2.5 px-2">Description</th>
                  <th className="py-2.5 px-2 text-center">L1 (Inch)</th>
                  <th className="py-2.5 px-2 text-center">L2 (Inch)</th>
                  <th className="py-2.5 px-2 text-right">Height</th>
                  <th className="py-2.5 px-2 text-right">Width</th>
                  <th className="py-2.5 px-2 text-center">Qty</th>
                  <th className="py-2.5 px-2 text-right">Tot Area</th>
                  <th className="py-2.5 px-2 text-right">Rate</th>
                  <th className="py-2.5 px-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {totals.lines.map((l: any, i: number) => {
                  const item = targetInv.items?.[i] || {};
                  if (!l.ok) return null;
                  return (
                    <tr key={i}>
                      <td className="py-2.5 px-2 text-center font-mono text-muted-foreground">{i + 1}</td>
                      <td className="py-2.5 px-2 font-medium">{item.desc || targetInv.glass?.desc}</td>
                      <td className="py-2.5 px-2 text-center font-mono">{item.l1}</td>
                      <td className="py-2.5 px-2 text-center font-mono">{item.l2}</td>
                      <td className="py-2.5 px-2 text-right font-mono">{l.lMM}</td>
                      <td className="py-2.5 px-2 text-right font-mono">{l.wMM}</td>
                      <td className="py-2.5 px-2 text-center font-mono font-semibold">{l.qty}</td>
                      <td className="py-2.5 px-2 text-right font-mono">
                        {settings.rateUnit === "sqft" ? l.totalSqft : l.totalSqm}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono">{nf(l.rate)}</td>
                      <td className="py-2.5 px-2 text-right font-mono font-semibold">{nf(l.amount)}</td>
                    </tr>
                  );
                })}
                <tr className="border-t-2 border-foreground/20 font-semibold bg-muted/10">
                  <td colSpan={6} className="py-2.5 px-2 text-right">Total</td>
                  <td className="py-2.5 px-2 text-center font-mono">{totals.qty}</td>
                  <td className="py-2.5 px-2 text-right font-mono">
                    {settings.rateUnit === "sqft" ? totals.sqft : totals.sqm}
                  </td>
                  <td></td>
                  <td className="py-2.5 px-2 text-right font-mono">{nf(totals.glassAmount)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Footer Breakdown & Bank Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
            <div className="space-y-3">
              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Summary Stats & Bank Details
              </div>
              <div className="font-mono text-[11px] space-y-1 text-muted-foreground">
                <div>Total Qty: <strong className="text-foreground">{totals.qty}</strong> | Sq.Ft: <strong className="text-foreground">{totals.sqft}</strong> | Sq.Mtr: <strong className="text-foreground">{totals.sqm}</strong></div>
                {Boolean(totals.weightKg) && <div>Estimated Glass Weight: <strong className="text-foreground">{totals.weightKg} kg</strong></div>}
              </div>

              {settings.bankName && (
                <div className="rounded-lg border border-border/60 p-3 text-xs space-y-1 bg-muted/10">
                  <div className="font-bold text-foreground">Bank Details for Payment:</div>
                  <div>Bank Name: <span className="font-semibold">{settings.bankName}</span></div>
                  <div>Account No: <span className="font-mono font-semibold">{settings.bankAcc}</span></div>
                  <div>IFSC Code: <span className="font-mono font-semibold">{settings.bankIfsc}</span></div>
                  {settings.bankBranch && <div>Branch: {settings.bankBranch}</div>}
                </div>
              )}
            </div>

            {/* Calculations Total Summary Table */}
            <div className="space-y-1 border border-border/60 rounded-xl p-4 bg-muted/20">
              <div className="flex justify-between py-1 border-b border-border/40">
                <span className="text-muted-foreground">Basic Amount:</span>
                <span className="font-mono font-medium">{nf(totals.basicAmount)}</span>
              </div>

              {Boolean(totals.adminCharge) && (
                <div className="flex justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground">Admin Charge:</span>
                  <span className="font-mono">{nf(totals.adminCharge)}</span>
                </div>
              )}

              {Boolean(totals.discount) && (
                <div className="flex justify-between py-1 border-b border-border/40 text-emerald-600">
                  <span>Discount:</span>
                  <span className="font-mono">-{nf(totals.discount)}</span>
                </div>
              )}

              <div className="flex justify-between py-1 border-b border-border/40">
                <span className="text-muted-foreground">Total:</span>
                <span className="font-mono font-medium">{nf(totals.subTotal)}</span>
              </div>

              {Boolean(totals.insurance) && (
                <div className="flex justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground">Insurance:</span>
                  <span className="font-mono">{nf(totals.insurance)}</span>
                </div>
              )}

              <div className="flex justify-between py-1 border-b border-border/40">
                <span className="text-muted-foreground">Assessable Value:</span>
                <span className="font-mono font-medium">{nf(totals.assessableValue)}</span>
              </div>

              {Boolean(totals.cgst) && (
                <div className="flex justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground">CGST ({totals.settings?.cgstPercent}%):</span>
                  <span className="font-mono">{nf(totals.cgst)}</span>
                </div>
              )}
              {Boolean(totals.sgst) && (
                <div className="flex justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground">SGST ({totals.settings?.sgstPercent}%):</span>
                  <span className="font-mono">{nf(totals.sgst)}</span>
                </div>
              )}
              {Boolean(totals.igst) && (
                <div className="flex justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground">IGST ({totals.settings?.igstPercent}%):</span>
                  <span className="font-mono">{nf(totals.igst)}</span>
                </div>
              )}

              {Boolean(totals.roundOff) && (
                <div className="flex justify-between py-1 border-b border-border/40 text-muted-foreground">
                  <span>Round Off:</span>
                  <span className="font-mono">{totals.roundOff}</span>
                </div>
              )}

              <div className="flex justify-between py-2 text-base font-bold text-primary pt-2 border-t-2 border-primary/20">
                <span>Grand Total:</span>
                <span className="font-mono">{cur(totals.grandTotal, settings.currency)}</span>
              </div>
            </div>
          </div>

          {/* Amount In Words */}
          {totals.amountInWords && (
            <div className="rounded-lg bg-muted/40 p-3 text-xs border border-border/40">
              <strong className="text-foreground">Amount in words:</strong>{" "}
              <span className="italic text-muted-foreground">{totals.amountInWords}</span>
            </div>
          )}

          {/* Terms & Conditions */}
          {termsList.length > 0 && (
            <div className="space-y-1.5 pt-2">
              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Terms & Conditions:
              </div>
              <ol className="list-decimal list-inside space-y-1 text-[11px] text-muted-foreground leading-relaxed">
                {termsList.map((term: string, idx: number) => (
                  <li key={idx}>{term}</li>
                ))}
              </ol>
            </div>
          )}

          {/* Signature Block */}
          <div className="grid grid-cols-4 gap-4 text-center text-[11px] text-muted-foreground pt-12 border-t border-border/40">
            <div className="border-t border-border/80 pt-2">Prepared By</div>
            <div className="border-t border-border/80 pt-2">Checked By</div>
            <div className="border-t border-border/80 pt-2">Sign & Seal</div>
            <div className="border-t border-border/80 pt-2 font-bold text-foreground">Authorised Signatory</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
