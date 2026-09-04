import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle2, Clock } from "lucide-react";
import { nf } from "@/lib/gq";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export type ConfirmPaymentDetails = {
  paidAmount: number;
  paymentType: string;
  refNo: string;
  notes: string;
  dueDate?: string;
};

export function ConfirmPaymentModal({
  open,
  invoice,
  onClose,
  onConfirm,
}: {
  open: boolean;
  invoice: any;
  onClose: () => void;
  onConfirm: (paymentDetails: ConfirmPaymentDetails) => void;
}) {
  if (!open || !invoice) return null;
  return <ConfirmPaymentModalBody invoice={invoice} onClose={onClose} onConfirm={onConfirm} />;
}

function ConfirmPaymentModalBody({
  invoice,
  onClose,
  onConfirm,
}: {
  invoice: any;
  onClose: () => void;
  onConfirm: (paymentDetails: ConfirmPaymentDetails) => void;
}) {
  const grandTotal = Number(invoice.totals?.grandTotal) || 0;
  const isPre = invoice.docType === "pre_proforma";
  const alreadyPaid = isPre ? 0 : Number(invoice.paidAmount || 0);
  const pendingAmount = Math.max(0, grandTotal - alreadyPaid);

  const [paidAmountStr, setPaidAmountStr] = useState<string>(
    isPre && invoice.paidAmount !== undefined && invoice.paidAmount !== null
      ? String(invoice.paidAmount)
      : "0",
  );
  const [paymentType, setPaymentType] = useState<string>(
    invoice.delivery?.paymentType === "Cash" ? "Cash" : "Bank Transfer",
  );
  const [refNo, setRefNo] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [dueDate, setDueDate] = useState<string>(
    invoice.dueDate || new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
  );

  const numericPaid = Number(paidAmountStr) || 0;
  const remainingBalance = Math.max(0, pendingAmount - numericPaid);
  const isFullPaid = numericPaid >= pendingAmount && pendingAmount > 0;
  const hasPaidAmount = numericPaid > 0;

  const getStatusBadge = () => {
    if (remainingBalance <= 0 && grandTotal > 0) {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
          <CheckCircle2 className="h-3.5 w-3.5" /> PAID IN FULL
        </span>
      );
    } else if (numericPaid > 0 || alreadyPaid > 0) {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" /> PARTIALLY PAID
        </span>
      );
    } else {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" /> CREDIT / UNPAID
        </span>
      );
    }
  };

  const handleApplyPreset = (type: "zero" | "full") => {
    if (type === "zero") {
      setPaidAmountStr("0");
    } else if (type === "full") {
      setPaidAmountStr(String(pendingAmount));
      if (paymentType === "Credit") setPaymentType("Cash");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (numericPaid > pendingAmount) {
      toast.error(`Payment amount cannot exceed pending balance of ₹${nf(pendingAmount)}`);
      return;
    }
    if (numericPaid < 0) {
      toast.error("Payment amount cannot be negative");
      return;
    }
    onConfirm({
      paidAmount: numericPaid,
      paymentType: hasPaidAmount ? paymentType : "Credit",
      refNo,
      notes,
      dueDate: isFullPaid ? "" : dueDate,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-slate-900/60 backdrop-blur-xs animate-in fade-in-50 sm:items-center sm:p-4">
      <div
        style={{ paddingBottom: "var(--safe-bottom)" }}
        className="w-full max-w-md overflow-hidden rounded-t-2xl border border-border bg-white shadow-2xl dark:bg-slate-900 max-h-[92dvh] animate-in slide-in-from-bottom-4 sm:my-auto sm:max-h-[90vh] sm:rounded-xl sm:slide-in-from-bottom-0"
      >
        {/* Modal Header */}
        <div className="bg-slate-900 px-4 py-3 text-white flex items-start justify-between gap-2">
          <div>
            <div className="text-[9px] uppercase font-bold tracking-widest text-blue-400 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
              Order Confirmation & Payment
            </div>
            <h3 className="text-sm font-bold text-white mt-0.5">
              {hasPaidAmount
                ? `Record Payment (${paymentType})`
                : "Confirm Order (Credit / ₹0 Paid)"}
            </h3>
            <div className="text-[11px] text-slate-300 font-mono mt-0.5 flex items-center gap-1.5">
              <span>
                PI No: <strong className="text-white">{invoice.no || invoice.orderNo}</strong>
              </span>
              <span>·</span>
              <span className="truncate max-w-[160px]">{invoice.cust?.name || "Customer"}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white bg-white/10 hover:bg-white/20 rounded-full h-9 w-9 shrink-0 flex items-center justify-center transition-colors text-sm font-bold cursor-pointer sm:h-7 sm:w-7 sm:text-xs"
          >
            ✕
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-3.5 space-y-2.5 text-xs overflow-y-auto overscroll-contain max-h-[calc(92dvh-72px)] sm:max-h-[calc(90vh-60px)]"
        >
          {/* Main Calculation Summary Card */}
          <div className="bg-slate-50 dark:bg-slate-800/40 border border-border rounded-lg p-2.5 space-y-2">
            <div className="flex items-center justify-between pb-1.5 border-b border-border/60">
              <span className="text-muted-foreground font-bold uppercase text-[9px] tracking-wider">
                Payment Summary
              </span>
              {getStatusBadge()}
            </div>

            <div
              className={cn(
                "grid gap-2 text-center",
                alreadyPaid > 0 ? "grid-cols-4" : "grid-cols-3",
              )}
            >
              <div className="bg-white dark:bg-slate-800 border border-border rounded-md p-1.5 shadow-2xs">
                <span className="text-[8.5px] font-bold text-muted-foreground uppercase block">
                  Total
                </span>
                <span className="font-mono text-xs font-bold text-foreground block mt-0.5">
                  ₹ {nf(grandTotal)}
                </span>
              </div>

              {alreadyPaid > 0 && (
                <div className="bg-slate-100 dark:bg-slate-800/80 border border-border rounded-md p-1.5 shadow-2xs">
                  <span className="text-[8.5px] font-bold text-muted-foreground uppercase block">
                    Prev Paid
                  </span>
                  <span className="font-mono text-xs font-bold text-foreground block mt-0.5">
                    ₹ {nf(alreadyPaid)}
                  </span>
                </div>
              )}

              <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-md p-1.5 shadow-2xs">
                <span className="text-[8.5px] font-bold text-emerald-700 dark:text-emerald-400 uppercase block">
                  {alreadyPaid > 0 ? "Paying Now" : "Amount Paid"}
                </span>
                <span className="font-mono text-xs font-bold text-emerald-700 dark:text-emerald-300 block mt-0.5">
                  ₹ {nf(numericPaid)}
                </span>
              </div>

              <div
                className={cn(
                  "border rounded-md p-1.5 shadow-2xs",
                  remainingBalance > 0
                    ? "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400"
                    : "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400",
                )}
              >
                <span className="text-[8.5px] font-bold uppercase block">
                  {alreadyPaid > 0 ? "Balance Left" : "Remaining"}
                </span>
                <span className="font-mono text-xs font-bold block mt-0.5">
                  ₹ {nf(remainingBalance)}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Payment Presets */}
          <div>
            <div className="text-[9.5px] font-bold text-muted-foreground uppercase tracking-wider mb-1 flex items-center justify-between">
              <span>Quick Amount Presets</span>
              <span className="text-muted-foreground font-mono">
                {alreadyPaid > 0
                  ? `Pending: ₹${nf(pendingAmount)} (Total: ₹${nf(grandTotal)})`
                  : `Total: ₹${nf(grandTotal)}`}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleApplyPreset("zero")}
                className={cn(
                  "py-1.5 px-2.5 rounded-md border text-[11px] font-semibold transition-all cursor-pointer",
                  numericPaid === 0
                    ? "bg-slate-900 text-white border-slate-900 shadow-xs font-bold"
                    : "bg-white dark:bg-slate-800 border-border hover:bg-slate-100 text-foreground",
                )}
              >
                Full Credit (₹0)
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset("full")}
                disabled={pendingAmount <= 0}
                className={cn(
                  "py-1.5 px-2.5 rounded-md border text-[11px] font-semibold transition-all cursor-pointer",
                  numericPaid === pendingAmount && pendingAmount > 0
                    ? "bg-blue-600 text-white border-blue-600 shadow-xs font-bold"
                    : "bg-white dark:bg-slate-800 border-border hover:bg-slate-100 text-foreground",
                  pendingAmount <= 0 && "opacity-50 cursor-not-allowed",
                )}
              >
                Full Paid (₹{nf(pendingAmount)})
              </button>
            </div>
          </div>

          {/* Amount Paid Input */}
          <div>
            <div className="flex items-center justify-between mb-0.5">
              <label className="block text-[9.5px] font-bold uppercase tracking-wider text-muted-foreground">
                Enter Paid Amount (₹)
              </label>
              <span className="text-[10px] font-mono font-bold text-muted-foreground">
                Max: ₹{nf(pendingAmount)}
              </span>
            </div>
            <div className="relative flex items-center">
              <span className="absolute left-2.5 text-muted-foreground font-bold text-xs">₹</span>
              <Input
                type="number"
                min="0"
                max={pendingAmount}
                step="any"
                className={cn(
                  "pl-7 h-8 text-xs font-mono font-bold bg-white dark:bg-slate-800 border-border",
                  numericPaid > pendingAmount &&
                    "text-rose-600 border-rose-500 focus-visible:ring-rose-500",
                )}
                placeholder={`Max ₹${nf(pendingAmount)}`}
                value={paidAmountStr}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "") {
                    setPaidAmountStr("");
                    return;
                  }
                  const num = Number(val);
                  if (num > pendingAmount) {
                    toast.warning(`Payment cannot exceed pending balance of ₹${nf(pendingAmount)}`);
                    setPaidAmountStr(String(pendingAmount));
                  } else {
                    setPaidAmountStr(val);
                  }
                }}
              />
            </div>
            {numericPaid > pendingAmount && (
              <span className="text-[10px] text-rose-500 font-semibold mt-1 block">
                Amount cannot exceed pending balance of ₹{nf(pendingAmount)}
              </span>
            )}
          </div>

          {/* TWO RECTANGULAR OPTIONS: CASH & BANK ONLY (Shown ONLY if paid amount > 0) */}
          {hasPaidAmount && (
            <div className="space-y-1 animate-in fade-in-50">
              <label className="block text-[9.5px] font-bold uppercase tracking-wider text-muted-foreground">
                Select Payment Mode (Cash / Bank)
              </label>

              <div className="grid grid-cols-2 gap-2">
                {/* Option 1: CASH */}
                <button
                  type="button"
                  onClick={() => setPaymentType("Cash")}
                  className={cn(
                    "relative flex items-center gap-2.5 p-2 rounded-lg border-2 text-left transition-all cursor-pointer",
                    paymentType === "Cash"
                      ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-600 text-emerald-950 dark:text-emerald-100 shadow-2xs ring-1 ring-emerald-500/20"
                      : "bg-white dark:bg-slate-800 border-border hover:border-slate-300 text-muted-foreground hover:bg-slate-50",
                  )}
                >
                  <div
                    className={cn(
                      "h-7 w-7 rounded-md flex items-center justify-center shrink-0 font-bold text-sm",
                      paymentType === "Cash"
                        ? "bg-emerald-600 text-white shadow-2xs"
                        : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300",
                    )}
                  >
                    💵
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-bold tracking-tight text-foreground flex items-center justify-between">
                      <span>Cash Payment</span>
                      {paymentType === "Cash" && (
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      )}
                    </div>
                    <div className="text-[9px] text-muted-foreground font-medium mt-0.5 truncate">
                      Physical Cash
                    </div>
                  </div>
                </button>

                {/* Option 2: BANK */}
                <button
                  type="button"
                  onClick={() => setPaymentType("Bank Transfer")}
                  className={cn(
                    "relative flex items-center gap-2.5 p-2 rounded-lg border-2 text-left transition-all cursor-pointer",
                    paymentType === "Bank Transfer"
                      ? "bg-blue-50 dark:bg-blue-950/40 border-blue-600 text-blue-950 dark:text-blue-100 shadow-2xs ring-1 ring-blue-500/20"
                      : "bg-white dark:bg-slate-800 border-border hover:border-slate-300 text-muted-foreground hover:bg-slate-50",
                  )}
                >
                  <div
                    className={cn(
                      "h-7 w-7 rounded-md flex items-center justify-center shrink-0 font-bold text-sm",
                      paymentType === "Bank Transfer"
                        ? "bg-blue-600 text-white shadow-2xs"
                        : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300",
                    )}
                  >
                    🏦
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-bold tracking-tight text-foreground flex items-center justify-between">
                      <span>Bank Transfer</span>
                      {paymentType === "Bank Transfer" && (
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                      )}
                    </div>
                    <div className="text-[9px] text-muted-foreground font-medium mt-0.5 truncate">
                      NEFT / RTGS / Online
                    </div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Payment Due Date (Hidden if Full Paid) */}
          {!isFullPaid && (
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-lg p-2">
              <label className="block text-[9px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-400 mb-0.5">
                Payment Due Date
              </label>
              <Input
                type="date"
                className="h-7 text-xs font-mono bg-white dark:bg-slate-800 border-border"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          )}

          {/* Reference & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="block text-[9.5px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">
                Ref / Txn No. (Optional)
              </label>
              <Input
                type="text"
                placeholder="e.g. HDFC-98421"
                className="h-8 text-xs font-mono bg-white dark:bg-slate-800 border-border"
                value={refNo}
                onChange={(e) => setRefNo(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-[9.5px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">
                Payment Note (Optional)
              </label>
              <Input
                type="text"
                placeholder="e.g. Advance paid"
                className="h-8 text-xs bg-white dark:bg-slate-800 border-border"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          {/* Footer Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="h-8 text-xs px-3.5 font-semibold border-border cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={numericPaid > pendingAmount}
              className="h-8 text-xs font-bold px-4 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Confirm Payment
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
