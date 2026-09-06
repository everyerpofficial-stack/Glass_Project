import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CheckCircle2,
  Clock,
  Wallet,
  Building2,
  Banknote,
  FileText,
  BarChart3,
  Calendar,
  X,
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

    if (
      activeIsPre &&
      activeInvoice?.paidAmount !== undefined &&
      activeInvoice?.paidAmount !== null
    ) {
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
        <span className="px-3 py-1 rounded-full text-[11px] font-extrabold bg-emerald-100 text-emerald-700 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800 flex items-center gap-1.5 shadow-2xs">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> PAID IN
          FULL
        </span>
      );
    } else if (numericPaid > 0 || alreadyPaid > 0) {
      return (
        <span className="px-3 py-1 rounded-full text-[11px] font-extrabold bg-blue-100 text-blue-700 border border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800 flex items-center gap-1.5 shadow-2xs">
          <Clock className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" /> PARTIALLY PAID
        </span>
      );
    } else {
      return (
        <span className="px-3 py-1 rounded-full text-[11px] font-extrabold bg-amber-100 text-amber-700 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800 flex items-center gap-1.5 shadow-2xs">
          <Clock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" /> CREDIT / UNPAID
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in-50">
      <div
        style={{ paddingBottom: "var(--safe-bottom)" }}
        className="w-full max-w-[550px] overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white shadow-2xl dark:bg-slate-900 max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-150"
      >
        {/* Modal Header */}
        <div className="bg-white dark:bg-slate-900 px-4 py-3 sm:px-5 sm:py-3.5 text-slate-900 dark:text-white flex items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl sm:rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-800 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 shadow-2xs">
              <Wallet className="h-4.5 sm:h-5 w-4.5 sm:w-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white tracking-tight truncate">
                {hasPaidAmount ? `Record Payment (${paymentType})` : "Confirm Order / Payment"}
              </h3>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold mt-0.5 flex items-center gap-1.5 truncate">
                <span>
                  Doc No:{" "}
                  <strong className="text-slate-700 dark:text-slate-200">
                    {activeInvoice?.no || activeInvoice?.orderNo}
                  </strong>
                </span>
                <span>•</span>
                <span className="truncate">
                  Customer:{" "}
                  <strong className="text-slate-700 dark:text-slate-200">
                    {activeInvoice?.cust?.name || activeInvoice?.custName || "Customer"}
                  </strong>
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full h-7 w-7 sm:h-8 sm:w-8 shrink-0 flex items-center justify-center transition-all text-xs font-bold cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-4 sm:p-4.5 space-y-3.5 text-xs overflow-y-auto overscroll-contain flex-1"
        >
          {/* Total Customer Outstanding Due Banner */}
          {customerTotalDue !== undefined && (
            <div className="bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 rounded-xl p-3 flex items-center justify-between shadow-2xs">
              <div>
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  TOTAL CUSTOMER DUE
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                  Outstanding balance across all confirmed invoices
                </div>
              </div>
              <div className="text-right pl-3 shrink-0">
                <span className="font-mono text-xl sm:text-2xl font-black text-blue-950 dark:text-blue-100 block">
                  ₹ {nf(customerTotalDue)}
                </span>
              </div>
            </div>
          )}

          {/* Select Due Invoice Dropdown */}
          {customerInvoices && customerInvoices.length > 0 && (
            <div className="space-y-1">
              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                SELECT DUE INVOICE TO PAY *
              </label>
              <select
                value={selectedInvId}
                onChange={(e) => setSelectedInvId(e.target.value)}
                className="w-full h-9 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800 px-3 outline-none focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 cursor-pointer shadow-2xs transition-all text-slate-800 dark:text-slate-100"
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

          {/* Payment Summary Section */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400 font-extrabold uppercase text-[10px] tracking-wider">
                PAYMENT SUMMARY
              </span>
              {getStatusBadge()}
            </div>

            <div
              className={cn(
                "grid gap-2",
                alreadyPaid > 0 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3",
              )}
            >
              {/* Card 1: TOTAL */}
              <div className="bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-xl p-2.5 flex items-center gap-2 shadow-2xs">
                <div className="h-7 w-7 rounded-lg bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-600 flex items-center justify-center shrink-0">
                  <FileText className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0">
                  <span className="text-[9px] font-extrabold text-slate-400 dark:text-slate-400 uppercase block tracking-wider truncate">
                    TOTAL
                  </span>
                  <span className="font-mono text-xs font-black text-slate-900 dark:text-slate-100 block mt-0.5 truncate">
                    ₹ {nf(grandTotal)}
                  </span>
                </div>
              </div>

              {/* Card 2: PREV PAID (if any) */}
              {alreadyPaid > 0 && (
                <div className="bg-amber-50/60 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-xl p-2.5 flex items-center gap-2 shadow-2xs">
                  <div className="h-7 w-7 rounded-lg bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                    <Clock className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[9px] font-extrabold text-amber-700 dark:text-amber-400 uppercase block tracking-wider truncate">
                      PREV PAID
                    </span>
                    <span className="font-mono text-xs font-black text-amber-700 dark:text-amber-300 block mt-0.5 truncate">
                      ₹ {nf(alreadyPaid)}
                    </span>
                  </div>
                </div>
              )}

              {/* Card 3: PAYING NOW */}
              <div className="bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-xl p-2.5 flex items-center gap-2 shadow-2xs">
                <div className="h-7 w-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Wallet className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0">
                  <span className="text-[9px] font-extrabold text-emerald-700 dark:text-emerald-400 uppercase block tracking-wider truncate">
                    {alreadyPaid > 0 ? "PAYING NOW" : "AMOUNT PAID"}
                  </span>
                  <span className="font-mono text-xs font-black text-emerald-700 dark:text-emerald-300 block mt-0.5 truncate">
                    ₹ {nf(numericPaid)}
                  </span>
                </div>
              </div>

              {/* Card 4: BALANCE LEFT */}
              <div
                className={cn(
                  "border rounded-xl p-2.5 flex items-center gap-2 shadow-2xs transition-all",
                  remainingBalance > 0
                    ? "bg-blue-50/60 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900/30 text-blue-700 dark:text-blue-300"
                    : "bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30 text-emerald-700 dark:text-emerald-300",
                )}
              >
                <div
                  className={cn(
                    "h-7 w-7 rounded-lg flex items-center justify-center shrink-0",
                    remainingBalance > 0
                      ? "bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400"
                      : "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400",
                  )}
                >
                  <BarChart3 className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0">
                  <span className="text-[9px] font-extrabold uppercase block tracking-wider truncate">
                    {alreadyPaid > 0 ? "BALANCE LEFT" : "REMAINING"}
                  </span>
                  <span className="font-mono text-xs font-black block mt-0.5 truncate">
                    ₹ {nf(remainingBalance)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Row: Quick Amount Presets & Enter Paid Amount */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 items-end">
            {/* Quick Amount Presets */}
            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                QUICK AMOUNT PRESETS
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleApplyPreset("zero")}
                  className={cn(
                    "py-2 px-2.5 rounded-lg border text-xs font-bold transition-all cursor-pointer shadow-2xs text-center",
                    numericPaid === 0
                      ? "bg-blue-600 text-white border-blue-600 shadow-2xs"
                      : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-slate-700 dark:text-slate-200",
                  )}
                >
                  Full Credit (₹0)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset("full")}
                  disabled={pendingAmount <= 0}
                  className={cn(
                    "py-2 px-2.5 rounded-lg border text-xs font-bold transition-all cursor-pointer shadow-2xs text-center",
                    numericPaid === pendingAmount && pendingAmount > 0
                      ? "bg-blue-600 text-white border-blue-600 shadow-2xs"
                      : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-slate-700 dark:text-slate-200",
                    pendingAmount <= 0 && "opacity-50 cursor-not-allowed",
                  )}
                >
                  Full Paid (₹{nf(pendingAmount)})
                </button>
              </div>
            </div>

            {/* Enter Paid Amount */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  ENTER PAID AMOUNT (₹)
                </label>
                <span className="text-[10px] font-mono font-semibold text-slate-400">
                  Max: ₹{nf(pendingAmount)}
                </span>
              </div>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-slate-600 dark:text-slate-400 font-extrabold text-xs">
                  ₹
                </span>
                <Input
                  type="number"
                  min="0"
                  max={pendingAmount}
                  step="any"
                  className={cn(
                    "pl-7 h-9 text-xs font-mono font-bold bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all",
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
                      toast.warning(
                        `Payment cannot exceed pending balance of ₹${nf(pendingAmount)}`,
                      );
                      setPaidAmountStr(String(pendingAmount));
                    } else {
                      setPaidAmountStr(val);
                    }
                  }}
                />
              </div>
            </div>
          </div>
          {numericPaid > pendingAmount && (
            <span className="text-[11px] text-rose-500 font-semibold block -mt-2">
              Amount cannot exceed pending balance of ₹{nf(pendingAmount)}
            </span>
          )}

          {/* SELECT PAYMENT MODE (CASH & BANK ONLY) */}
          {hasPaidAmount && (
            <div className="space-y-1 animate-in fade-in-50">
              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                SELECT PAYMENT MODE *
              </label>

              <div className="grid grid-cols-2 gap-2.5">
                {/* Option 1: CASH */}
                <button
                  type="button"
                  onClick={() => setPaymentType("Cash")}
                  className={cn(
                    "relative flex items-center gap-2.5 p-2.5 rounded-xl border-2 text-left transition-all cursor-pointer",
                    paymentType === "Cash"
                      ? "bg-blue-50/60 dark:bg-blue-950/40 border-blue-600 text-blue-950 dark:text-blue-100 shadow-2xs"
                      : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300 text-slate-600 dark:text-slate-400 hover:bg-slate-50",
                  )}
                >
                  <div
                    className={cn(
                      "h-8 w-8 rounded-lg flex items-center justify-center shrink-0 font-bold text-sm",
                      paymentType === "Cash"
                        ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300"
                        : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300",
                    )}
                  >
                    <Banknote className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-extrabold tracking-tight text-slate-900 dark:text-slate-100 truncate">
                      Cash Payment
                    </div>
                    <div className="text-[10px] text-slate-500 font-medium mt-0.5 truncate">
                      Physical Cash
                    </div>
                  </div>
                  {/* Radio Indicator */}
                  <div
                    className={cn(
                      "h-4 w-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-all",
                      paymentType === "Cash"
                        ? "border-blue-600 bg-blue-600 text-white"
                        : "border-slate-300 dark:border-slate-600 bg-transparent",
                    )}
                  >
                    {paymentType === "Cash" && (
                      <div className="h-1.5 w-1.5 rounded-full bg-white" />
                    )}
                  </div>
                </button>

                {/* Option 2: BANK */}
                <button
                  type="button"
                  onClick={() => setPaymentType("Bank Transfer")}
                  className={cn(
                    "relative flex items-center gap-2.5 p-2.5 rounded-xl border-2 text-left transition-all cursor-pointer",
                    paymentType === "Bank Transfer"
                      ? "bg-blue-50/60 dark:bg-blue-950/40 border-blue-600 text-blue-950 dark:text-blue-100 shadow-2xs"
                      : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300 text-slate-600 dark:text-slate-400 hover:bg-slate-50",
                  )}
                >
                  <div
                    className={cn(
                      "h-8 w-8 rounded-lg flex items-center justify-center shrink-0 font-bold text-sm",
                      paymentType === "Bank Transfer"
                        ? "bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-300"
                        : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300",
                    )}
                  >
                    <Building2 className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-extrabold tracking-tight text-slate-900 dark:text-slate-100 truncate">
                      Bank Transfer
                    </div>
                    <div className="text-[10px] text-slate-500 font-medium mt-0.5 truncate">
                      NEFT / RTGS / Online
                    </div>
                  </div>
                  {/* Radio Indicator */}
                  <div
                    className={cn(
                      "h-4 w-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-all",
                      paymentType === "Bank Transfer"
                        ? "border-blue-600 bg-blue-600 text-white"
                        : "border-slate-300 dark:border-slate-600 bg-transparent",
                    )}
                  >
                    {paymentType === "Bank Transfer" && (
                      <div className="h-1.5 w-1.5 rounded-full bg-white" />
                    )}
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Payment Due Date (Hidden if Full Paid) */}
          {!isFullPaid && (
            <div className="bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/80 rounded-xl p-2.5 space-y-1">
              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-amber-600" />
                Payment Due Date
              </label>
              <Input
                type="date"
                className="h-9 text-xs font-mono font-semibold bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          )}

          {/* Reference & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                REF / TXN NO. (OPTIONAL)
              </label>
              <Input
                type="text"
                placeholder="e.g. HDFC-98421"
                className="h-9 text-xs font-mono bg-slate-50/50 focus:bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500/40"
                value={refNo}
                onChange={(e) => setRefNo(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                PAYMENT NOTE (OPTIONAL)
              </label>
              <Input
                type="text"
                placeholder="e.g. Advance paid"
                className="h-9 text-xs bg-slate-50/50 focus:bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500/40"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          {/* Footer Action Buttons */}
          <div className="pt-2.5 flex items-center justify-end gap-2.5 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="h-9 text-xs px-4 font-extrabold bg-slate-100 hover:bg-slate-200 border-none text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 rounded-lg cursor-pointer transition-all"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={numericPaid > pendingAmount}
              className="h-9 text-xs font-extrabold px-5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm rounded-lg cursor-pointer gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
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
