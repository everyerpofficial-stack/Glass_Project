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
import { computeTotals, cur, dmy, nf } from "@/lib/gq";
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

      {/* ---------- Printable Document Card ---------- */}
      <Card className="border border-border/80 shadow-lg bg-card max-w-4xl mx-auto overflow-hidden print:shadow-none print:border-none print:m-0 print:p-0">
        <CardContent className="p-6 sm:p-10 space-y-5 text-xs text-foreground">

          {/* 1. Header: Company Name & Credentials */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between border-b-2 border-foreground/80 pb-4 gap-4">
            <div className="space-y-1 max-w-lg">
              {settings.logo && (
                <img src={settings.logo} alt="Company Logo" className="h-10 sm:h-12 w-auto object-contain mb-1.5" />
              )}
              <h2 className="text-xl font-extrabold uppercase tracking-tight text-primary">
                {settings.coName || "Hindustan Float Glass Pvt. Ltd."}
              </h2>
              {settings.addr && (
                <p className="text-[11px] text-muted-foreground whitespace-pre-line leading-snug">
                  {settings.addr}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground pt-0.5 font-mono">
                {settings.phone && <span>Ph: {settings.phone}</span>}
                {settings.email && <span>E-mail: {settings.email}</span>}
                {settings.web && <span>Website: {settings.web}</span>}
              </div>
            </div>

            <div className="text-right space-y-1 shrink-0 font-mono text-[11px]">
              {settings.pan && (
                <div className="text-muted-foreground">
                  CIN : <span className="font-semibold text-foreground">{settings.pan}</span>
                </div>
              )}
              {settings.gstin && (
                <div className="font-bold text-foreground">
                  GST No : <span className="text-primary">{settings.gstin}</span>
                </div>
              )}
              <div className="text-[10px] text-muted-foreground pt-1">
                F No. /MKT/03 | Rev No./Date : 01/24/06/2023
              </div>
            </div>
          </div>

          {/* 2. Document Title Banner */}
          <div className="text-center py-1.5 border-y border-foreground/60 font-bold uppercase tracking-widest text-sm bg-muted/30">
            {settings.title || "PROFORMA INVOICE"}
          </div>

          {/* 3. Meta Details Grid */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 border border-foreground/40 rounded-md p-3 bg-muted/10 text-xs">
            <div className="space-y-1">
              <div><span className="font-semibold">Proforma No :</span> <span className="font-mono font-bold text-foreground">{targetInv.no}</span></div>
              <div><span className="text-muted-foreground">PI Date :</span> <span className="font-mono">{dmy(targetInv.date)}</span></div>
              <div><span className="text-muted-foreground">Order No :</span> <span className="font-mono">{targetInv.orderNo || "—"}</span></div>
            </div>
            <div className="space-y-1">
              <div><span className="text-muted-foreground">Project Remark :</span> <span>{targetInv.projectRemark || "—"}</span></div>
              <div><span className="text-muted-foreground">Sales Person :</span> <span className="font-medium">{targetInv.salesPerson || "Office"}</span></div>
              <div><span className="text-muted-foreground">Party PO No. :</span> <span className="font-mono">{targetInv.poNo || "—"}</span></div>
            </div>

            <div className="border-t border-border/60 pt-2 space-y-1 col-span-1">
              <div className="font-bold text-foreground">M/s. : {targetInv.cust?.name || "Customer Name"}</div>
              {targetInv.cust?.addr && (
                <div className="text-muted-foreground whitespace-pre-line leading-relaxed text-[11px]">
                  {targetInv.cust.addr}
                </div>
              )}
              {targetInv.cust?.phone && <div>Ph: <span className="font-mono">{targetInv.cust.phone}</span></div>}
              {targetInv.cust?.email && <div>Email: {targetInv.cust.email}</div>}
              {targetInv.cust?.gstin && (
                <div className="font-semibold pt-0.5">
                  GST# : <span className="font-mono">{targetInv.cust.gstin}</span>
                </div>
              )}
            </div>

            <div className="border-t border-border/60 pt-2 space-y-1 col-span-1 border-l border-border/40 pl-4">
              <div className="font-bold text-foreground">Dispatch To : {targetInv.cust?.name || "Customer Name"}</div>
              {targetInv.cust?.ship || targetInv.cust?.addr ? (
                <div className="text-muted-foreground whitespace-pre-line leading-relaxed text-[11px]">
                  {targetInv.cust?.ship || targetInv.cust?.addr}
                </div>
              ) : null}
              {targetInv.cust?.gstin && (
                <div className="font-semibold pt-0.5">
                  GST# : <span className="font-mono">{targetInv.cust.gstin}</span>
                </div>
              )}
            </div>
          </div>

          {/* 4. Glass Header Specs Bar */}
          <div className="rounded border border-primary/30 bg-primary/5 px-3 py-2 flex flex-wrap items-center justify-between font-semibold text-xs">
            <span>
              Item: <strong className="text-foreground">{targetInv.glass?.desc || "Glass Specification"}</strong>
            </span>
            {targetInv.glass?.batchNo && (
              <span className="font-mono">
                Job/Batch No: <strong className="text-foreground">{targetInv.glass.batchNo}</strong>
              </span>
            )}
            <span>
              Thickness: <strong className="text-foreground">{targetInv.glass?.thickness} mm</strong>
            </span>
          </div>

          {/* 5. Line Items Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse border border-foreground/30">
              <thead>
                <tr className="border-b border-foreground/40 text-foreground uppercase text-[10px] tracking-wider bg-muted/60 font-bold">
                  <th className="py-2 px-2 text-center border-r border-foreground/30 w-8">SR No</th>
                  <th className="py-2 px-2 border-r border-foreground/30">L1-Inch</th>
                  <th className="py-2 px-2 border-r border-foreground/30">L2-Inch</th>
                  <th className="py-2 px-2 text-right border-r border-foreground/30">Height</th>
                  <th className="py-2 px-2 text-right border-r border-foreground/30">Width</th>
                  <th className="py-2 px-2 text-center border-r border-foreground/30">Qty</th>
                  <th className="py-2 px-2 text-right border-r border-foreground/30">Tot Area</th>
                  <th className="py-2 px-2 text-right border-r border-foreground/30">Chargable Rate/SqMtr</th>
                  <th className="py-2 px-2 text-right border-r border-foreground/30">Amount</th>
                  <th className="py-2 px-2 text-center border-r border-foreground/30">Shape</th>
                  <th className="py-2 px-2 text-center">Remark</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-foreground/20">
                {totals.lines.map((l: any, i: number) => {
                  const item = targetInv.items?.[i] || {};
                  if (!l.ok) return null;
                  return (
                    <tr key={i} className="hover:bg-muted/10">
                      <td className="py-2 px-2 text-center font-mono text-muted-foreground border-r border-foreground/20">{i + 1}</td>
                      <td className="py-2 px-2 font-mono border-r border-foreground/20">{item.l1}</td>
                      <td className="py-2 px-2 font-mono border-r border-foreground/20">{item.l2}</td>
                      <td className="py-2 px-2 text-right font-mono border-r border-foreground/20">{l.lMM}</td>
                      <td className="py-2 px-2 text-right font-mono border-r border-foreground/20">{l.wMM}</td>
                      <td className="py-2 px-2 text-center font-mono font-semibold border-r border-foreground/20">{l.qty}</td>
                      <td className="py-2 px-2 text-right font-mono border-r border-foreground/20">
                        {settings.rateUnit === "sqft" ? l.totalSqft : l.totalSqm}
                      </td>
                      <td className="py-2 px-2 text-right font-mono border-r border-foreground/20">{nf(l.rate)}</td>
                      <td className="py-2 px-2 text-right font-mono font-semibold border-r border-foreground/20">{nf(l.amount)}</td>
                      <td className="py-2 px-2 text-center uppercase text-[10px] font-semibold border-r border-foreground/20">{item.shape || "BLOCK"}</td>
                      <td className="py-2 px-2 text-center text-muted-foreground">{item.remark || "—"}</td>
                    </tr>
                  );
                })}
                {/* Total Row */}
                <tr className="border-t-2 border-foreground/40 font-bold bg-muted/30">
                  <td colSpan={5} className="py-2 px-2 text-left uppercase border-r border-foreground/30">Total</td>
                  <td className="py-2 px-2 text-center font-mono border-r border-foreground/30">{totals.qty}</td>
                  <td className="py-2 px-2 text-right font-mono border-r border-foreground/30">
                    {settings.rateUnit === "sqft" ? totals.sqft : totals.sqm}
                  </td>
                  <td className="border-r border-foreground/30"></td>
                  <td className="py-2 px-2 text-right font-mono text-primary border-r border-foreground/30">{nf(totals.glassAmount)}</td>
                  <td className="border-r border-foreground/30"></td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 6. Operations & Sub-charges Box (Holes / Cutouts) */}
          {(totals.holes > 0 || totals.cutouts > 0 || totals.bigCutouts > 0) && (
            <div className="border border-foreground/30 rounded p-3 bg-muted/10 space-y-1 font-mono text-xs max-w-xs ml-auto">
              {totals.holes > 0 && (
                <div className="flex justify-between">
                  <span>Holes ({totals.holes})</span>
                  <span>@ ₹{totals.settings?.holeRate || 35}.00 = ₹{nf(totals.holeCharge)}</span>
                </div>
              )}
              {totals.cutouts > 0 && (
                <div className="flex justify-between">
                  <span>Cutout ({totals.cutouts})</span>
                  <span>@ ₹{totals.settings?.cutoutRate || 85}.00 = ₹{nf(totals.cutoutCharge)}</span>
                </div>
              )}
              {totals.bigCutouts > 0 && (
                <div className="flex justify-between">
                  <span>Big Cutout ({totals.bigCutouts})</span>
                  <span>@ ₹{totals.settings?.bigCutoutRate || 500}.00 = ₹{nf(totals.bigCutoutCharge)}</span>
                </div>
              )}
            </div>
          )}

          {/* 7. Summary Stats & Bank / Terms Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
            <div className="space-y-3">
              {/* Summary Stats bar */}
              <div className="rounded border border-foreground/30 p-2 bg-muted/20 font-mono text-[11px] flex flex-wrap gap-x-4 gap-y-1 font-semibold">
                <div>Qty : <span className="text-foreground">{totals.qty}</span></div>
                <div>Sq.Ft : <span className="text-foreground">{totals.sqft}</span></div>
                <div>Sq.Mtr. : <span className="text-foreground">{totals.sqm}</span></div>
                {Boolean(totals.weightKg) && <div>Weight : <span className="text-foreground">{totals.weightKg} kg</span></div>}
              </div>

              {/* Standard Disclaimers */}
              <div className="text-[10px] text-muted-foreground space-y-1 leading-snug">
                <div><strong>Validity of PI :</strong> This offer & rates are Valid for 07 days</div>
                <div><strong>Unloading by :</strong> Should be arranged by you</div>
                <div><strong>Packing Type :</strong> Extra</div>
                <div><strong>Delivery Period :</strong> 4/5 working days of SGU & 6/7 working days For Lami/DGU</div>
                <div><strong>Freight :</strong> Freight to pay basis</div>
                <div className="italic pt-1 text-[9.5px]">
                  Please make sure to double check the performa in terms of specification size, qty, rates & taxes. If there is any item not as per your requirement please get the same modified to reflect in PI.
                </div>
              </div>

              {/* Bank Details */}
              {settings.bankName && (
                <div className="rounded border border-border/80 p-3 text-xs space-y-1 bg-muted/10 font-mono">
                  <div className="font-bold text-foreground">Bank Details :</div>
                  <div className="text-primary font-bold">{settings.coName || "Ridhi Sidhi Glasses (India) Pvt. Ltd."}</div>
                  <div>Bank Name : <span className="font-semibold text-foreground">{settings.bankName}</span></div>
                  <div>A/c. No. : <span className="font-bold text-foreground">{settings.bankAcc}</span></div>
                  <div>IFSC : <span className="font-bold text-foreground">{settings.bankIfsc}</span></div>
                  {settings.bankBranch && <div>Branch : <span className="text-foreground">{settings.bankBranch}</span></div>}
                </div>
              )}
            </div>

            {/* Right: Calculations Total Summary Box */}
            <div className="space-y-1 border-2 border-foreground/40 rounded-lg p-4 bg-muted/20 text-xs">
              <div className="flex justify-between py-1 border-b border-border/40 font-mono">
                <span className="text-muted-foreground">Basic Amount</span>
                <span className="font-semibold">{nf(totals.basicAmount)}</span>
              </div>

              {Boolean(totals.adminCharge) && (
                <div className="flex justify-between py-1 border-b border-border/40 font-mono">
                  <span className="text-muted-foreground">Admin Charge</span>
                  <span>{nf(totals.adminCharge)}</span>
                </div>
              )}

              <div className="flex justify-between py-1 border-b border-border/40 font-mono font-semibold">
                <span>Total</span>
                <span>{nf(totals.subTotal)}</span>
              </div>

              {Boolean(totals.insurance) && (
                <div className="flex justify-between py-1 border-b border-border/40 font-mono">
                  <span className="text-muted-foreground">Insurance {totals.settings?.insurancePercent ?? 2}.00 %</span>
                  <span>{nf(totals.insurance)}</span>
                </div>
              )}

              <div className="flex justify-between py-1 border-b border-border/40 font-mono font-semibold">
                <span className="text-muted-foreground">Ass. Value</span>
                <span>{nf(totals.assessableValue)}</span>
              </div>

              {Boolean(totals.cgst) && (
                <div className="flex justify-between py-1 border-b border-border/40 font-mono">
                  <span className="text-muted-foreground">C-GST {totals.settings?.cgstPercent ?? 9}.00 %</span>
                  <span>{nf(totals.cgst)}</span>
                </div>
              )}
              {Boolean(totals.sgst) && (
                <div className="flex justify-between py-1 border-b border-border/40 font-mono">
                  <span className="text-muted-foreground">S-GST {totals.settings?.sgstPercent ?? 9}.00 %</span>
                  <span>{nf(totals.sgst)}</span>
                </div>
              )}
              {Boolean(totals.igst) && (
                <div className="flex justify-between py-1 border-b border-border/40 font-mono">
                  <span className="text-muted-foreground">IGST {totals.settings?.igstPercent ?? 18}.00 %</span>
                  <span>{nf(totals.igst)}</span>
                </div>
              )}

              {Boolean(totals.grossTotal) && (
                <div className="flex justify-between py-1 border-b border-border/40 font-mono">
                  <span className="text-muted-foreground">Gross Total</span>
                  <span>{nf(totals.grossTotal)}</span>
                </div>
              )}

              {Boolean(totals.roundOff) && (
                <div className="flex justify-between py-1 border-b border-border/40 font-mono text-muted-foreground">
                  <span>Round Off</span>
                  <span>{totals.roundOff > 0 ? `+${nf(totals.roundOff)}` : nf(totals.roundOff)}</span>
                </div>
              )}

              <div className="flex justify-between py-2 text-base font-bold text-primary pt-2 border-t-2 border-foreground/40 font-mono">
                <span>Grand Total</span>
                <span>₹{nf(totals.grandTotal)}</span>
              </div>
            </div>
          </div>

          {/* 8. Amount In Words */}
          {totals.amountInWords && (
            <div className="rounded border border-foreground/40 p-2.5 text-xs bg-muted/30">
              <strong className="text-foreground">Amount in words :</strong>{" "}
              <span className="font-semibold text-foreground">{totals.amountInWords}</span>
            </div>
          )}

          {/* 9. Product Standard Followed Box */}
          <div className="rounded border border-foreground/30 p-2 text-[10px] space-y-1 bg-muted/10 font-mono">
            <div className="font-bold text-foreground">Standard Followed by {settings.coName || "RIDHI SIDHI GLASS (I) PVT LTD"} :</div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-muted-foreground">
              <div>Tempered Flat Glass: IS 2553 (Part 1) :2018</div>
              <div>Heat Strengthened Glass: IS 2553 (Part 1) :2018</div>
              <div>Insulating Glass(Double & Step Glazing): IS 2553 (Part 1) :2018 /EN - 1279</div>
              <div>Lamination Glass: IS 2553 (Part 1) :2018 /EN - 12543</div>
            </div>
          </div>

          {/* 10. Terms & Conditions */}
          {termsList.length > 0 && (
            <div className="space-y-1 pt-1 text-[10px] text-muted-foreground">
              <div className="font-bold text-foreground uppercase tracking-wider">
                Terms & Conditions:
              </div>
              <ol className="list-decimal list-inside space-y-0.5 leading-snug">
                {termsList.map((term: string, idx: number) => (
                  <li key={idx}>{term}</li>
                ))}
              </ol>
            </div>
          )}

          {/* 11. Customer Acceptance & Signatures */}
          <div className="space-y-4 pt-6 border-t-2 border-foreground/40">
            <div className="text-center font-bold text-xs uppercase tracking-wider text-muted-foreground">
              Customer's Acceptance
            </div>
            <div className="grid grid-cols-4 gap-4 text-center text-[11px] text-muted-foreground pt-8">
              <div>
                <div className="font-bold text-foreground">RAHUL</div>
                <div className="border-t border-foreground/60 pt-1 mt-1">Prepared By</div>
              </div>
              <div>
                <div className="border-t border-foreground/60 pt-1 mt-6">Checked By</div>
              </div>
              <div>
                <div className="border-t border-foreground/60 pt-1 mt-6">Sign & Seal</div>
              </div>
              <div>
                <div className="border-t border-foreground/60 pt-1 mt-6 font-bold text-foreground">Authorised Signatory</div>
              </div>
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground font-mono pt-2 border-t border-border/40">
              <span>Subject to {settings.juris || "Jaipur Jurisdiction"}</span>
              <span>16-03-26 12:30 PM</span>
            </div>
          </div>

        </CardContent>
      </Card>
    </div>
  );
}
