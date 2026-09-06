import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CheckCircle2,
  Clock,
  CreditCard,
  Building2,
  Banknote,
  Receipt,
  Wallet,
  Calendar,
  Sparkles,
} from "lucide-react";
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
  customerInvoices,
  customerTotalDue,
  onClose,
  onConfirm,
}: {
  open: boolean;
  invoice?: any;
  customerInvoices?: any[] | undefined;
  customerTotalDue?: number | undefined;
  onClose: () => void;
  onConfirm: (paymentDetails: ConfirmPaymentDetails, activeInvoice?: any) => void;
}) {
  if (!open) return null;
  const initialInv =
    invoice || (customerInvoices && customerInvoices.length > 0 ? customerInvoices[0] : null);
  if (!initialInv && (!customerInvoices || customerInvoices.length === 0)) return null;

  return (
    <ConfirmPaymentModalBody
      initialInvoice={initialInv}
      customerInvoices={customerInvoices}
      customerTotalDue={customerTotalDue}
      onClose={onClose}
      onConfirm={onConfirm}
    />
  );
}

function ConfirmPaymentModalBody({
  initialInvoice,
  customerInvoices,
  customerTotalDue,
  onClose,
  onConfirm,
}: {
  initialInvoice: any;
  customerInvoices?: any[] | undefined;
  customerTotalDue?: number | undefined;
  onClose: () => void;
  onConfirm: (paymentDetails: ConfirmPaymentDetails, activeInvoice?: any) => void;
}) {
  const [selectedInvId, setSelectedInvId] = useState<string>(initialInvoice?.id || "");

  const activeInvoice = React.useMemo(() => {
    if (selectedInvId && customerInvoices && customerInvoices.length > 0) {
      const found = customerInvoices.find((x: any) => String(x.id) === String(selectedInvId));
      if (found) return found;
    }
    return initialInvoice;
  }, [selectedInvId, customerInvoices, initialInvoice]);

  const grandTotal = Number(activeInvoice?.totals?.grandTotal) || 0;
  const isPre = activeInvoice?.docType === "pre_proforma";
  const alreadyPaid = isPre ? 0 : Number(activeInvoice?.paidAmount || 0);
  const pendingAmount = Math.max(0, grandTotal - alreadyPaid);

  const [paidAmountStr, setPaidAmountStr] = useState<string>(
    isPre && activeInvoice?.paidAmount !== undefined && activeInvoice?.paidAmount !== null
      ? String(activeInvoice.paidAmount)
      : String(pendingAmount),
  );

  React.useEffect(() => {
    const activeIsPre = activeInvoice?.docType === "pre_proforma";
    const activeGrand = Number(activeInvoice?.totals?.grandTotal) || 0;
    const activePaid = activeIsPre ? 0 : Number(activeInvoice?.paidAmount || 0);
    const activePending = Math.max(0, activeGrand - activePaid);

    if (activeIsPre && activeInvoice?.paidAmount !== undefined && activeInvoice?.paidAmount !== null) {
      setPaidAmountStr(String(activeInvoice.paidAmount));
    } else {
      setPaidAmountStr(String(activePending));
    }
  }, [activeInvoice]);

  const [paymentType, setPaymentType] = useState<string>(
    activeInvoice?.delivery?.paymentType === "Cash" ? "Cash" : "Bank Transfer",
  );
  const [refNo, setRefNo] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [dueDate, setDueDate] = useState<string>(
    activeInvoice?.dueDate || new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
  );

  const numericPaid = Number(paidAmountStr) || 0;
  const remainingBalance = Math.max(0, pendingAmount - numericPaid);
  const isFullPaid = numericPaid >= pendingAmount && pendingAmount > 0;
  const hasPaidAmount = numericPaid > 0;

  const getStatusBadge = () => {
    if (remainingBalance <= 0 && grandTotal > 0) {
      return (
        <span className="px-3 py-1 rounded-full text-[11px] font-extrabold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 shadow-2xs">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> PAID IN FULL
        </span>
      );
    } else if (numericPaid > 0 || alreadyPaid > 0) {
      return (
        <span className="px-3 py-1 rounded-full text-[11px] font-extrabold bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 flex items-center gap-1.5 shadow-2xs">
          <Clock className="h-3.5 w-3.5 text-blue-600" /> PARTIALLY PAID
        </span>
      );
    } else {
      return (
        <span className="px-3 py-1 rounded-full text-[11px] font-extrabold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1.5 shadow-2xs">
          <Clock className="h-3.5 w-3.5 text-amber-600" /> CREDIT / UNPAID
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
    onConfirm(
      {
        paidAmount: numericPaid,
        paymentType: hasPaidAmount ? paymentType : "Credit",
        refNo,
        notes,
        dueDate: isFullPaid ? "" : dueDate,
      },
      activeInvoice,
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-slate-900/70 backdrop-blur-sm animate-in fade-in-50 sm:items-center sm:p-4">
      <div
        style={{ paddingBottom: "var(--safe-bottom)" }}
        className="w-full max-w-lg overflow-hidden rounded-t-2xl border border-slate-200/80 dark:border-slate-800 bg-white shadow-2xl dark:bg-slate-900 max-h-[92dvh] animate-in slide-in-from-bottom-4 sm:my-auto sm:max-h-[90vh] sm:rounded-2xl sm:slide-in-from-bottom-0"
      >
        {/* Modal Header */}
        <div className="bg-slate-900 px-5 py-4 text-white flex items-center justify-between gap-3 border-b border-slate-800">
          <div>
            <div className="text-[10px] uppercase font-bold tracking-widest text-blue-400 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
              Customer Payment & Settlement
            </div>
            <h3 className="text-base font-extrabold text-white mt-0.5 tracking-tight flex items-center gap-2">
              <CreditCard className="h-4.5 w-4.5 text-blue-400" />
              {hasPaidAmount ? `Record Payment (${paymentType})` : "Confirm Order / Payment"}
            </h3>
            <div className="text-xs text-slate-300 font-mono mt-1 flex items-center gap-2">
              <span className="bg-slate-800 px-2 py-0.5 rounded border border-slate-700 text-slate-200">
                Doc No: <strong className="text-white">{activeInvoice?.no || activeInvoice?.orderNo}</strong>
              </span>
              <span>•</span>
              <span className="truncate max-w-[200px] font-semibold text-slate-200">
                {activeInvoice?.cust?.name || activeInvoice?.custName || "Customer"}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white bg-white/10 hover:bg-white/20 rounded-full h-8 w-8 shrink-0 flex items-center justify-center transition-all text-xs font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-4 sm:p-5 space-y-4 text-xs overflow-y-auto overscroll-contain max-h-[calc(92dvh-75px)] sm:max-h-[calc(90vh-70px)]"
        >
          {/* Total Customer Outstanding Due Banner */}
          {customerTotalDue !== undefined && (
            <div className="bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-amber-500/5 dark:from-amber-950/40 dark:to-amber-900/20 border-l-4 border-l-amber-500 border border-amber-200/80 dark:border-amber-800/60 rounded-xl p-3.5 flex items-center justify-between shadow-2xs">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
                  <Wallet className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-300">
                    Total Customer Due
                  </div>
                  <div className="text-[11px] text-amber-700/90 dark:text-amber-400 font-medium">
                    Outstanding balance across all confirmed invoices
                  </div>
                </div>
              </div>
              <div className="text-right">
                <span className="font-mono text-lg sm:text-xl font-black text-amber-800 dark:text-amber-200 block">
                  ₹ {nf(customerTotalDue)}
                </span>
              </div>
            </div>
          )}

          {/* Select Due Invoice Dropdown */}
          {customerInvoices && customerInvoices.length > 0 && (
            <div className="bg-slate-50/90 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl p-3 space-y-1.5">
              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                <Receipt className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                Select Due Invoice to Pay *
              </label>
              <select
                value={selectedInvId}
                onChange={(e) => setSelectedInvId(e.target.value)}
                className="w-full h-9 text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 cursor-pointer shadow-2xs transition-all"
              >
                {customerInvoices.map((inv: any) => {
                  const gTotal = Number(inv.totals?.grandTotal) || 0;
                  const paid = Number(inv.paidAmount || 0);
                  const pending = Math.max(0, gTotal - paid);
                  return (
                    <option key={inv.id} value={inv.id}>
                      Invoice #{inv.no || inv.orderNo} — Due: ₹{nf(pending)} (Total: ₹{nf(gTotal)})
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          {/* Main Calculation Summary Card */}
          <div className="bg-slate-50/90 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl p-3 space-y-2.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700/60">
              <span className="text-slate-600 dark:text-slate-400 font-extrabold uppercase text-[10px] tracking-wider flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
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
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 shadow-2xs">
                <span className="text-[9px] font-extrabold text-slate-500 dark:text-slate-400 uppercase block tracking-wider">
                  Total
                </span>
                <span className="font-mono text-sm font-extrabold text-slate-900 dark:text-slate-100 block mt-1">
                  ₹ {nf(grandTotal)}
                </span>
              </div>

              {alreadyPaid > 0 && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 shadow-2xs">
                  <span className="text-[9px] font-extrabold text-blue-600 dark:text-blue-400 uppercase block tracking-wider">
                    Prev Paid
                  </span>
                  <span className="font-mono text-sm font-extrabold text-blue-600 dark:text-blue-400 block mt-1">
                    ₹ {nf(alreadyPaid)}
                  </span>
                </div>
              )}

              <div className="bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-xl p-2.5 shadow-2xs">
                <span className="text-[9px] font-extrabold text-emerald-700 dark:text-emerald-400 uppercase block tracking-wider">
                  {alreadyPaid > 0 ? "Paying Now" : "Amount Paid"}
                </span>
                <span className="font-mono text-sm font-extrabold text-emerald-700 dark:text-emerald-300 block mt-1">
                  ₹ {nf(numericPaid)}
                </span>
              </div>

              <div
                className={cn(
                  "border rounded-xl p-2.5 shadow-2xs transition-all",
                  remainingBalance > 0
                    ? "bg-amber-50/80 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/80 text-amber-800 dark:text-amber-300"
                    : "bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/80 text-emerald-800 dark:text-emerald-300",
                )}
              >
                <span className="text-[9px] font-extrabold uppercase block tracking-wider">
                  {alreadyPaid > 0 ? "Balance Left" : "Remaining"}
                </span>
                <span className="font-mono text-sm font-extrabold block mt-1">
                  ₹ {nf(remainingBalance)}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Payment Presets */}
          <div>
            <div className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span>Quick Amount Presets</span>
              <span className="text-slate-600 dark:text-slate-400 font-mono text-[11px] font-bold">
                {alreadyPaid > 0
                  ? `Pending: ₹${nf(pendingAmount)} (Total: ₹${nf(grandTotal)})`
                  : `Total: ₹${nf(grandTotal)}`}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => handleApplyPreset("zero")}
                className={cn(
                  "py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer shadow-2xs",
                  numericPaid === 0
                    ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                    : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-slate-800 dark:text-slate-200",
                )}
              >
                Full Credit (₹0)
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset("full")}
                disabled={pendingAmount <= 0}
                className={cn(
                  "py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer shadow-2xs",
                  numericPaid === pendingAmount && pendingAmount > 0
                    ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                    : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-slate-800 dark:text-slate-200",
                  pendingAmount <= 0 && "opacity-50 cursor-not-allowed",
                )}
              >
                Full Paid (₹{nf(pendingAmount)})
              </button>
            </div>
          </div>

          {/* Amount Paid Input */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Enter Paid Amount (₹)
              </label>
              <span className="text-[11px] font-mono font-bold text-slate-500">
                Max: ₹{nf(pendingAmount)}
              </span>
            </div>
            <div className="relative flex items-center">
              <span className="absolute left-3 text-slate-400 font-extrabold text-sm">₹</span>
              <Input
                type="number"
                min="0"
                max={pendingAmount}
                step="any"
                className={cn(
                  "pl-8 h-10 text-sm font-mono font-bold bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all",
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
              <span className="text-[11px] text-rose-500 font-semibold mt-1 block">
                Amount cannot exceed pending balance of ₹${nf(pendingAmount)}
              </span>
            )}
          </div>

          {/* TWO RECTANGULAR OPTIONS: CASH & BANK ONLY (Shown ONLY if paid amount > 0) */}
          {hasPaidAmount && (
            <div className="space-y-1.5 animate-in fade-in-50">
              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Select Payment Mode (Cash / Bank)
              </label>

              <div className="grid grid-cols-2 gap-2.5">
                {/* Option 1: CASH */}
                <button
                  type="button"
                  onClick={() => setPaymentType("Cash")}
                  className={cn(
                    "relative flex items-center gap-3 p-2.5 rounded-xl border-2 text-left transition-all cursor-pointer",
                    paymentType === "Cash"
                      ? "bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-600 text-emerald-950 dark:text-emerald-100 shadow-xs ring-2 ring-emerald-500/20"
                      : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300 text-slate-600 dark:text-slate-400 hover:bg-slate-50/80",
                  )}
                >
                  <div
                    className={cn(
                      "h-8 w-8 rounded-lg flex items-center justify-center shrink-0 font-bold text-base",
                      paymentType === "Cash"
                        ? "bg-emerald-600 text-white shadow-2xs"
                        : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300",
                    )}
                  >
                    <Banknote className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center justify-between">
                      <span>Cash Payment</span>
                      {paymentType === "Cash" && (
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      )}
                    </div>
                    <div className="text-[10px] text-slate-500 font-medium mt-0.5 truncate">
                      Physical Cash
                    </div>
                  </div>
                </button>

                {/* Option 2: BANK */}
                <button
                  type="button"
                  onClick={() => setPaymentType("Bank Transfer")}
                  className={cn(
                    "relative flex items-center gap-3 p-2.5 rounded-xl border-2 text-left transition-all cursor-pointer",
                    paymentType === "Bank Transfer"
                      ? "bg-blue-50/80 dark:bg-blue-950/40 border-blue-600 text-blue-950 dark:text-blue-100 shadow-xs ring-2 ring-blue-500/20"
                      : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300 text-slate-600 dark:text-slate-400 hover:bg-slate-50/80",
                  )}
                >
                  <div
                    className={cn(
                      "h-8 w-8 rounded-lg flex items-center justify-center shrink-0 font-bold text-base",
                      paymentType === "Bank Transfer"
                        ? "bg-blue-600 text-white shadow-2xs"
                        : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300",
                    )}
                  >
                    <Building2 className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center justify-between">
                      <span>Bank Transfer</span>
                      {paymentType === "Bank Transfer" && (
                        <span className="h-2 w-2 rounded-full bg-blue-500" />
                      )}
                    </div>
                    <div className="text-[10px] text-slate-500 font-medium mt-0.5 truncate">
                      NEFT / RTGS / Online
                    </div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Payment Due Date (Hidden if Full Paid) */}
          {!isFullPaid && (
            <div className="bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/80 rounded-xl p-3 space-y-1">
              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-amber-600" />
                Payment Due Date
              </label>
              <Input
                type="date"
                className="h-9 text-xs font-mono font-semibold bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 rounded-lg"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          )}

          {/* Reference & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                Ref / Txn No. (Optional)
              </label>
              <Input
                type="text"
                placeholder="e.g. HDFC-98421"
                className="h-9 text-xs font-mono bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/40"
                value={refNo}
                onChange={(e) => setRefNo(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                Payment Note (Optional)
              </label>
              <Input
                type="text"
                placeholder="e.g. Advance paid"
                className="h-9 text-xs bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/40"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          {/* Footer Action Buttons */}
          <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-slate-200 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="h-9 text-xs px-4 font-bold border-slate-300 dark:border-slate-700 rounded-xl cursor-pointer hover:bg-slate-100"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={numericPaid > pendingAmount}
              className="h-9 text-xs font-extrabold px-5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md rounded-xl cursor-pointer gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <CheckCircle2 className="h-4 w-4" />
              Confirm Payment
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
