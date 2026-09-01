import React from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { dmy, nf } from "@/lib/gq";
import {
  FileText,
  User,
  Phone,
  Mail,
  MapPin,
  UserCheck,
  Printer,
  Edit3,
  CheckCircle2,
  Clock,
  AlertCircle,
} from "lucide-react";
import { useNavigate } from "@tanstack/react-router";

interface InvoiceDetailModalProps {
  invoice: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (invoice: any) => void;
}

export function InvoiceDetailModal({
  invoice,
  open,
  onOpenChange,
  onEdit,
}: InvoiceDetailModalProps) {
  const navigate = useNavigate();
  if (!invoice) return null;

  const grandTotal = Number(invoice.totals?.grandTotal || 0);
  const paidAmount = Number(invoice.paidAmount || 0);
  const pendingAmount = Math.max(0, grandTotal - paidAmount);
  const isPaidFull = pendingAmount <= 0 && grandTotal > 0;
  const isPre = invoice.docType === "pre_proforma";
  const docTypeLabel = isPre ? "Order Booking" : "Proforma Invoice";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 gap-0">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-5 rounded-t-lg">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-primary/20 text-primary-foreground border border-primary/40">
                  {docTypeLabel}
                </span>
                <span className="text-xs text-slate-300 font-mono">
                  {dmy(invoice.date)}
                </span>
              </div>
              <h2 className="text-xl font-bold tracking-tight mt-1 font-mono flex items-center gap-2">
                <FileText className="h-5 w-5 text-emerald-400" />
                {invoice.no}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              {isPre ? (
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 inline-flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" /> Order Booking
                </span>
              ) : isPaidFull ? (
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 inline-flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Fully Paid
                </span>
              ) : paidAmount > 0 ? (
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 inline-flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5" /> Partial Payment
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-500/20 text-red-300 border border-red-500/40 inline-flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" /> Payment Pending
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* Key Amount Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-muted/30 border border-border rounded-lg p-3">
              <div className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">
                Total Amount
              </div>
              <div className="text-lg font-bold text-foreground font-mono mt-0.5">
                ₹ {nf(grandTotal)}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">
                Grand total bill
              </div>
            </div>

            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-3">
              <div className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400 tracking-wider">
                Paid Amount
              </div>
              <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
                ₹ {nf(paidAmount)}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">
                Received so far
              </div>
            </div>

            <div
              className={`rounded-lg p-3 border ${
                pendingAmount > 0
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400"
                  : "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
              }`}
            >
              <div className="text-[10px] font-bold uppercase tracking-wider">
                Pending Balance
              </div>
              <div className="text-lg font-bold font-mono mt-0.5">
                ₹ {nf(pendingAmount)}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">
                {pendingAmount > 0 ? "Amount remaining to pay" : "No balance due"}
              </div>
            </div>
          </div>

          {/* Details Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Customer Details */}
            <div className="bg-card border border-border rounded-lg p-3.5 space-y-2">
              <div className="font-bold text-foreground flex items-center gap-1.5 pb-1 border-b border-border/50 text-xs">
                <User className="h-3.5 w-3.5 text-primary" /> Customer Details
              </div>
              <div className="space-y-1">
                <div className="font-bold text-sm text-foreground">
                  {invoice.cust?.name || "—"}
                </div>
                {invoice.cust?.phone && (
                  <div className="flex items-center gap-1.5 text-muted-foreground font-mono">
                    <Phone className="h-3 w-3" /> {invoice.cust.phone}
                  </div>
                )}
                {invoice.cust?.email && (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Mail className="h-3 w-3" /> {invoice.cust.email}
                  </div>
                )}
                {invoice.cust?.gstin && (
                  <div className="text-[11px] font-mono text-muted-foreground">
                    <span className="font-semibold text-foreground">GSTIN:</span>{" "}
                    {invoice.cust.gstin}
                  </div>
                )}
                {invoice.cust?.addr && (
                  <div className="flex items-start gap-1.5 text-muted-foreground mt-1">
                    <MapPin className="h-3 w-3 shrink-0 mt-0.5" />
                    <span>{invoice.cust.addr}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Sales & Booking Details */}
            <div className="bg-card border border-border rounded-lg p-3.5 space-y-2">
              <div className="font-bold text-foreground flex items-center gap-1.5 pb-1 border-b border-border/50 text-xs">
                <UserCheck className="h-3.5 w-3.5 text-primary" /> Order Information & Staff
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase font-semibold">
                    Sales Person (Taken By)
                  </div>
                  <div className="font-semibold text-foreground mt-0.5">
                    {invoice.salesPerson || "Office"}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase font-semibold">
                    P.O. Number
                  </div>
                  <div className="font-mono text-foreground mt-0.5">
                    {invoice.poNo || "—"}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase font-semibold">
                    Booking Reference
                  </div>
                  <div className="font-mono text-foreground mt-0.5">
                    {invoice.preProformaNo || invoice.orderNo || "—"}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase font-semibold">
                    Freight Type
                  </div>
                  <div className="text-foreground mt-0.5">
                    {invoice.freightType || "To be Billed"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Items Breakdown Table */}
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="bg-muted/40 px-3 py-2 text-xs font-bold border-b border-border text-foreground">
              Item Details ({invoice.items?.length || 0} items)
            </div>
            <div className="overflow-x-auto max-h-56">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/20 text-[10px] font-bold uppercase text-muted-foreground border-b border-border">
                  <tr>
                    <th className="p-2">#</th>
                    <th className="p-2">Product / Glass</th>
                    <th className="p-2 text-center">Thick</th>
                    <th className="p-2 text-center">Qty</th>
                    <th className="p-2 text-right">Area</th>
                    <th className="p-2 text-right">Rate</th>
                    <th className="p-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 font-mono text-[11px]">
                  {invoice.items?.map((item: any, idx: number) => (
                    <tr key={item.id || idx} className="hover:bg-muted/10">
                      <td className="p-2 text-muted-foreground">{idx + 1}</td>
                      <td className="p-2 font-sans font-medium text-foreground">
                        {invoice.productName || item.desc || "Glass Item"}
                      </td>
                      <td className="p-2 text-center font-sans">
                        {invoice.glass?.thickness || item.thickness || 5} mm
                      </td>
                      <td className="p-2 text-center">{item.qty || 1}</td>
                      <td className="p-2 text-right">{item.sqft || item.sqm || "—"}</td>
                      <td className="p-2 text-right">₹ {nf(item.rate || 0)}</td>
                      <td className="p-2 text-right font-bold text-emerald-600">
                        ₹ {nf(item.amount || 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-border gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1.5"
                onClick={() => {
                  onOpenChange(false);
                  navigate({ to: "/invoice", search: { id: invoice.id } });
                }}
              >
                <Printer className="h-3.5 w-3.5" /> Print / PDF
              </Button>
              {onEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs gap-1.5 text-primary border-primary/30"
                  onClick={() => {
                    onOpenChange(false);
                    onEdit(invoice);
                  }}
                >
                  <Edit3 className="h-3.5 w-3.5" /> Edit Invoice
                </Button>
              )}
            </div>
            <Button
              variant="secondary"
              size="sm"
              className="h-8 text-xs"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
