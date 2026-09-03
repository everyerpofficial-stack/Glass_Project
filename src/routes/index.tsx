import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ClipboardList,
  FileText,
  CheckCircle2,
  TrendingUp,
  Clock,
  Wallet,
  ShoppingBag,
  Truck,
  XCircle,
  Tag,
  Calendar as CalendarIcon,
  CreditCard,
  BarChart3,
  PieChart as PieChartIcon,
  AlertCircle,
  ArrowUpRight,
  Layers,
} from "lucide-react";
import { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from "recharts";
import { useGQ } from "@/lib/store";
import {
  activeRecords,
  commercialRecords,
  computeTotals,
  cur,
  detectGlassTypeFromProduct,
  dmy,
  formatPiNo,
  getPaymentDueDateInfo,
  isCancelled,
  sumGrandTotal,
} from "@/lib/gq";

export const Route = createFileRoute("/")({
  component: Dashboard,
});

/* ── Greeting helper ─── */
function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/* ── Timeframe ─────────────────────────────────────────────────────────
   The Today / Yesterday / This Month / This Year pills used to be decoration:
   they set state that nothing read, so every range rendered the same all-time
   figures under a label claiming otherwise. */
type Timeframe = "today" | "yesterday" | "month" | "year" | "all";

function timeframeRange(tf: Timeframe): { from: number; to: number } | null {
  if (tf === "all") return null;
  const now = new Date();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const DAY = 86400000;
  if (tf === "today") return { from: midnight, to: midnight + DAY };
  if (tf === "yesterday") return { from: midnight - DAY, to: midnight };
  if (tf === "month") {
    return {
      from: new Date(now.getFullYear(), now.getMonth(), 1).getTime(),
      to: new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime(),
    };
  }
  return {
    from: new Date(now.getFullYear(), 0, 1).getTime(),
    to: new Date(now.getFullYear() + 1, 0, 1).getTime(),
  };
}

/* A document is dated by its own `date`; `createdAt` is only a fallback for
   rows rebuilt from the sheet's typed columns. */
function recordTime(rec: any): number {
  return Date.parse(rec?.date || "") || Date.parse(rec?.createdAt || "") || 0;
}

function withinRange(rec: any, range: { from: number; to: number } | null): boolean {
  if (!range) return true;
  const t = recordTime(rec);
  return t >= range.from && t < range.to;
}

const isPreProforma = (x: any) => !x?.docType || x.docType === "pre_proforma";

const DAY_LABEL: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short" };

const CHART_FILLS = ["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ef4444"];

/* Rupee amounts on a chart axis, short enough to fit a 10px tick. */
function compactAmount(v: number): string {
  const n = Number(v) || 0;
  if (Math.abs(n) >= 10000000) return `${(n / 10000000).toFixed(1)}Cr`;
  if (Math.abs(n) >= 100000) return `${(n / 100000).toFixed(1)}L`;
  if (Math.abs(n) >= 1000) return `${Math.round(n / 1000)}k`;
  return String(Math.round(n));
}

/* Every figure on this page is derived from live records. It used to fall back
   to invented ones whenever a real total came out empty — ₹9,36,240 received,
   ₹3,42,210 outstanding, 22 delivered, 4 cancelled, a two-row customer dues
   table and three fully hard-coded charts. On the live dataset not one invoice
   carries a non-zero `paidAmount`, so the Amount Received card was showing that
   invented ₹9,36,240 in production. An invoicing system may render an empty
   state; it may not make up money. */
function Dashboard() {
  const { invoices, payments, settings } = useGQ();
  const [timeframe, setTimeframe] = useState<Timeframe>("month");
  const [orderTab, setOrderTab] = useState<"all" | "booking" | "confirm">("all");

  const range = useMemo(() => timeframeRange(timeframe), [timeframe]);

  /* Supersession and cancellation are resolved against the whole dataset before
     the date filter runs. Filtering first would hide the Order Confirm that
     supersedes a Proforma Invoice and let the superseded row count as a second
     live order. */
  const liveRecords = useMemo(() => activeRecords(invoices), [invoices]);
  const scoped = useMemo(
    () => liveRecords.filter((r) => withinRange(r, range)),
    [liveRecords, range],
  );

  const piRecords = useMemo(() => scoped.filter(isPreProforma), [scoped]);
  const ocRecords = useMemo(() => scoped.filter((x) => x.docType === "proforma"), [scoped]);

  const totalBookingsCount = piRecords.length;
  const obInvoicesAmount = useMemo(() => sumGrandTotal(piRecords), [piRecords]);
  const onCreatedAmount = obInvoicesAmount;

  /* The store and /booking both write `whatsappSent`; this card read
     `followedUp`, a field nothing in the app has ever written. It therefore
     reported every Proforma Invoice as pending no matter how many had been
     followed up — two of them on the live sheet. */
  const obFollowUpDone = useMemo(
    () => piRecords.filter((x) => Boolean(x.whatsappSent)).length,
    [piRecords],
  );
  const obFollowUpPending = piRecords.length - obFollowUpDone;

  const confirmedCount = ocRecords.length;
  const totalInvoiceAmount = useMemo(() => sumGrandTotal(ocRecords), [ocRecords]);

  const { amountReceived, cashAmount, bankAmount } = useMemo(() => {
    let cash = 0;
    let bank = 0;

    // Helper to check if a payment belongs to a cancelled invoice
    const isPaymentForCancelledInv = (p: any) => {
      const invNo = String(p.invoiceNo || "").trim().toLowerCase();
      const invId = p.invoiceId ? String(p.invoiceId) : "";
      if (!invNo && !invId) return false;
      const inv = invoices.find(
        (x: any) =>
          (invId && String(x.id) === invId) ||
          (invNo &&
            (String(x.no || "").toLowerCase() === invNo ||
             String(x.orderNo || "").toLowerCase() === invNo ||
             String(x.preProformaNo || "").toLowerCase() === invNo)),
      );
      return Boolean(inv && isCancelled(inv));
    };

    // 1. Gather active payments in current range (excluding cancelled ones)
    const activePayments = payments.filter((p: any) => {
      if (!withinRange({ date: p.date, createdAt: p.createdAt }, range)) return false;
      const amount = Number(p.amount) || 0;
      if (amount <= 0) return false;
      if (isPaymentForCancelledInv(p)) return false;
      return true;
    });

    activePayments.forEach((p: any) => {
      const amt = Number(p.amount) || 0;
      const mode = String(p.mode || "").toLowerCase();
      if (mode.includes("cash")) cash += amt;
      else bank += amt;
    });

    // 2. Also account for any active order in ocRecords with paidAmount not already captured in payments
    for (const inv of ocRecords) {
      const p = Number(inv.paidAmount) || 0;
      if (!p) continue;
      const invNo = String(inv.no || "").toLowerCase();
      const invOrderNo = String(inv.orderNo || "").toLowerCase();
      const alreadyInPayments = activePayments
        .filter((pay) => {
          const pInv = String(pay.invoiceNo || "").toLowerCase();
          return (
            (pay.invoiceId && String(pay.invoiceId) === String(inv.id)) ||
            (pInv && (pInv === invNo || pInv === invOrderNo))
          );
        })
        .reduce((sum, pay) => sum + (Number(pay.amount) || 0), 0);

      const delta = Math.max(0, p - alreadyInPayments);
      if (delta > 0) {
        const mode = String(inv.delivery?.paymentType || inv.paymentMode || "").toLowerCase();
        if (mode.includes("cash")) cash += delta;
        else bank += delta;
      }
    }

    const total = cash + bank;
    return { amountReceived: total, cashAmount: cash, bankAmount: bank };
  }, [ocRecords, payments, invoices, range]);

  const dueFromCustomer = useMemo(
    () =>
      ocRecords.reduce(
        (acc, inv) =>
          acc + Math.max(0, (Number(inv.totals?.grandTotal) || 0) - (Number(inv.paidAmount) || 0)),
        0,
      ),
    [ocRecords],
  );

  /* A generated work order means production started, not that anything left the
     building — counting it as a delivery overstated dispatches. `delivered` is
     the flag the Delivered control actually sets. */
  const deliveredCount = useMemo(
    () => scoped.filter((x) => x.delivered === true || x.status === "delivered").length,
    [scoped],
  );

  /* Cancelled rows are excluded from `liveRecords` by design, so this counts
     them from the de-duplicated set instead. */
  const cancelledCount = useMemo(
    () => commercialRecords(invoices).filter((x) => isCancelled(x) && withinRange(x, range)).length,
    [invoices, range],
  );

  const userName = settings.salesPerson || "Admin";

  /* ── Chart 1: glass category demand, by area actually quoted ──────────
     Area per line comes from the calculation engine, and the glass type from
     the layer that line belongs to — records carry their product on
     `layers[].productName`, not on the empty top-level `productName`. */
  const glassDemandData = useMemo(() => {
    const bySqft = new Map<string, number>();
    scoped.forEach((rec) => {
      let totals: any;
      try {
        totals = computeTotals(settings, rec);
      } catch {
        totals = null;
      }
      const validLines = (totals?.lines || []).filter((line: any) => line?.ok);
      if (validLines.length > 0) {
        validLines.forEach((line: any) => {
          const category =
            line.glassType ||
            rec.layers?.[line.layerIdx]?.glassType ||
            detectGlassTypeFromProduct(
              line.productName ||
                line.glassName ||
                line.desc ||
                rec.productName ||
                rec.glass?.desc ||
                "",
            );
          bySqft.set(category, (bySqft.get(category) || 0) + (Number(line.totalSqft) || 0));
        });
      } else {
        const sqft = Number(rec.totals?.sqft) || Number(totals?.sqft) || 0;
        if (sqft > 0) {
          const firstLayer = rec.layers?.[0];
          const category =
            firstLayer?.glassType ||
            rec.glassType ||
            detectGlassTypeFromProduct(
              firstLayer?.productName ||
                firstLayer?.glassName ||
                rec.productName ||
                rec.glass?.desc ||
                "",
            );
          bySqft.set(category, (bySqft.get(category) || 0) + sqft);
        }
      }
    });
    return Array.from(bySqft.entries())
      .map(([category, sqft]) => ({ category, sqft: Math.round(sqft) }))
      .filter((d) => d.sqft > 0)
      .sort((a, b) => b.sqft - a.sqft)
      .slice(0, 5)
      .map((d, i) => ({ ...d, fill: CHART_FILLS[i % CHART_FILLS.length] as string }));
  }, [scoped, settings]);

  const glassDemandTotal = useMemo(
    () => glassDemandData.reduce((a, d) => a + d.sqft, 0),
    [glassDemandData],
  );

  /* ── Chart 2: quoted vs converted over the last 7 days ────────────────
     A rolling week, so it is deliberately independent of the pill selection. */
  const quotationVsRevenueData = useMemo(() => {
    const DAY = 86400000;
    const now = new Date();
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const days = Array.from({ length: 7 }, (_, i) => {
      const from = midnight - (6 - i) * DAY;
      return {
        from,
        to: from + DAY,
        date: new Date(from).toLocaleDateString("en-IN", DAY_LABEL),
        quoted: 0,
        revenue: 0,
      };
    });
    liveRecords.forEach((rec) => {
      const t = recordTime(rec);
      const bucket = days.find((d) => t >= d.from && t < d.to);
      if (!bucket) return;
      const amount = Number(rec.totals?.grandTotal) || 0;
      if (isPreProforma(rec)) bucket.quoted += amount;
      else bucket.revenue += amount;
    });
    return days.map(({ date, quoted, revenue }) => ({ date, quoted, revenue }));
  }, [liveRecords]);

  const weekHasActivity = useMemo(
    () => quotationVsRevenueData.some((d) => d.quoted > 0 || d.revenue > 0),
    [quotationVsRevenueData],
  );

  /* ── Chart 3: collection split, synchronized with active collections ─── */
  const collectionData = useMemo(() => {
    const out: { name: string; value: number; color: string }[] = [];
    if (cashAmount > 0) out.push({ name: "Cash Collection", value: cashAmount, color: "#10b981" });
    if (bankAmount > 0) out.push({ name: "Bank Transfer", value: bankAmount, color: "#3b82f6" });
    return out;
  }, [cashAmount, bankAmount]);

  const collectionTotal = useMemo(() => amountReceived, [amountReceived]);

  /* ── Customer dues, from the open balances that actually exist ────────
     Overdue days come from getPaymentDueDateInfo, the same helper /order uses
     for its due badge, so a customer's age here and the badge on their invoice
     can never disagree. The two rows this replaced were fixtures: RAM PVT LTD
     and SHYAM GLASS owing ₹85,420 and ₹45,780, printed whatever the books
     actually said. */
  const dueListRows = useMemo(() => {
    type DueRow = {
      id: string;
      customer: string;
      lastInvoiceDate: string;
      last: number;
      dueAmount: number;
      noOfInvoices: number;
      overdueDays: number;
    };
    const byCustomer = new Map<string, DueRow>();
    ocRecords.forEach((inv) => {
      const due = Math.max(
        0,
        (Number(inv.totals?.grandTotal) || 0) - (Number(inv.paidAmount) || 0),
      );
      if (due <= 0) return;
      const name = String(inv.cust?.name || "Unnamed Customer").toUpperCase();
      const t = recordTime(inv);
      const info = getPaymentDueDateInfo(inv);
      const overdue = info.status === "overdue" ? Math.abs(Number(info.daysLeft) || 0) : 0;
      const row = byCustomer.get(name);
      if (row) {
        row.dueAmount += due;
        row.noOfInvoices += 1;
        row.overdueDays = Math.max(row.overdueDays, overdue);
        if (t > row.last) {
          row.last = t;
          row.lastInvoiceDate = inv.date ? dmy(inv.date) : "—";
        }
      } else {
        byCustomer.set(name, {
          id: name,
          customer: name,
          lastInvoiceDate: inv.date ? dmy(inv.date) : "—",
          last: t,
          dueAmount: due,
          noOfInvoices: 1,
          overdueDays: overdue,
        });
      }
    });
    return Array.from(byCustomer.values())
      .sort((a, b) => b.overdueDays - a.overdueDays || b.dueAmount - a.dueAmount)
      .map((row) => ({
        ...row,
        overdueLabel:
          row.overdueDays > 0
            ? `${row.overdueDays} ${row.overdueDays === 1 ? "Day" : "Days"}`
            : "Not yet due",
      }));
  }, [ocRecords]);

  const overdueCount = useMemo(
    () => dueListRows.filter((r) => r.overdueDays > 0).length,
    [dueListRows],
  );

  /* Real Proforma Invoices from store invoices (Matches /booking page) */
  const recentOrderBookingsRows = useMemo(
    () =>
      piRecords.map((q) => {
        const lineDesc = q.items?.[0]?.desc || q.items?.[0]?.product || q.glass?.desc;
        const glassName = lineDesc
          ? String(lineDesc).split("-")[0]?.trim()
          : q.layers?.[0]?.productName || "—";
        return {
          id: String(q.id),
          obNo: formatPiNo(q.no || q.orderNo || q.id),
          customer: String(q.cust?.name || "Unnamed Customer").toUpperCase(),
          date: q.date ? dmy(q.date) : "—",
          glassType: glassName,
          amount: Number(q.totals?.grandTotal) || 0,
          followUp: q.whatsappSent ? "Done" : "Pending",
          status:
            q.status === "draft"
              ? "New"
              : q.status === "followup"
                ? "Follow Up"
                : q.status || "Pending",
        };
      }),
    [piRecords],
  );

  /* Real Order Confirms from store invoices (Matches /order page) */
  const recentOrderConfirmRows = useMemo(
    () =>
      ocRecords.map((q) => {
        const lineDesc = q.items?.[0]?.desc || q.items?.[0]?.product || q.glass?.desc;
        const glassName = lineDesc
          ? String(lineDesc).split("-")[0]?.trim()
          : q.layers?.[0]?.productName || "—";
        const grandTotal = Number(q.totals?.grandTotal) || 0;
        const paid = Number(q.paidAmount) || 0;
        /* `Number(x) !== undefined` is true for every x, NaN included, so a
           record without an explicit remainingBalance produced NaN here. */
        const stored = Number(q.remainingBalance);
        return {
          id: String(q.id),
          orderNo: formatPiNo(q.no || q.orderNo || q.id),
          customer: String(q.cust?.name || "Unnamed Customer").toUpperCase(),
          date: q.date ? dmy(q.date) : "—",
          amount: grandTotal,
          status:
            q.status === "work_order_generated"
              ? "Work Order"
              : q.status === "order_confirmed"
                ? "Confirmed"
                : "Proforma",
          advance: paid,
          balance: Number.isFinite(stored) ? stored : Math.max(0, grandTotal - paid),
          workOrderStatus: q.status === "work_order_generated" ? "Generated" : "Pending",
          paymentStatus:
            paid >= grandTotal && grandTotal > 0 ? "PAID" : paid > 0 ? "PARTIAL" : "UNPAID",
          glassType: glassName,
        };
      }),
    [ocRecords],
  );

  /* Combined recent activity & orders */
  const combinedRecentOrders = useMemo(() => {
    type OrderItem = {
      id: string;
      no: string;
      type: "booking" | "confirm";
      customer: string;
      date: string;
      glassType: string;
      amount: number;
      status: string;
      link: string;
    };

    const bookings: OrderItem[] = recentOrderBookingsRows.map((b) => ({
      id: String(b.id),
      no: String(b.obNo),
      type: "booking",
      customer: String(b.customer),
      date: String(b.date),
      glassType: String(b.glassType || "—"),
      amount: Number(b.amount),
      status: String(b.status),
      link: "/booking",
    }));

    const confirms: OrderItem[] = recentOrderConfirmRows.map((c) => ({
      id: String(c.id),
      no: String(c.orderNo),
      type: "confirm",
      customer: String(c.customer),
      date: String(c.date),
      glassType: String(c.glassType || "—"),
      amount: Number(c.amount),
      status: String(c.status),
      link: "/order",
    }));

    if (orderTab === "booking") return bookings;
    if (orderTab === "confirm") return confirms;

    const merged: OrderItem[] = [];
    const maxLen = Math.max(bookings.length, confirms.length);
    for (let i = 0; i < maxLen; i++) {
      const c = confirms[i];
      if (c) merged.push(c);
      const b = bookings[i];
      if (b) merged.push(b);
    }
    return merged;
  }, [recentOrderBookingsRows, recentOrderConfirmRows, orderTab]);

  return (
    <div className="w-full space-y-6 px-4 sm:px-6 lg:px-8 pt-6 pb-12 text-foreground">
      {/* ── Page Header & Timeframe Filter ───────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Dashboard Overview</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {getGreeting()}, {userName}! Here is your business activity and performance breakdown.
          </p>
        </div>

        {/* Date Filter Pills */}
        <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-xl border border-border shrink-0">
          {[
            { id: "today", label: "Today" },
            { id: "yesterday", label: "Yesterday" },
            { id: "month", label: "This Month" },
            { id: "year", label: "This Year" },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setTimeframe(item.id as Timeframe)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                timeframe === item.id
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              }`}
            >
              {item.label}
            </button>
          ))}
          {/* Was a "Date Range" pill with no picker behind it. Until a custom
              range is actually built, offering All Time is honest and useful. */}
          <button
            onClick={() => setTimeframe("all")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
              timeframe === "all"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
            }`}
          >
            <span>All Time</span>
            <CalendarIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* ── Metric Cards Grid (NO numbers 1..10) ────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: Proforma Invoice Count */}
        <MetricCard
          label="Proforma Invoice Count"
          value={String(totalBookingsCount)}
          sub="Total bookings received"
          icon={ClipboardList}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
        />

        {/* Card 2: PI Amount */}
        <MetricCard
          label="PI Amount"
          sub="Pending order generation"
          value={cur(obInvoicesAmount, settings.currency)}
          icon={FileText}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
        />

        {/* Card 3: PI Follow Up */}
        <MetricCard
          label="PI Follow Up"
          sub="Done vs Pending"
          valueNode={
            <div className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-1.5 mt-0.5">
              <span className="text-emerald-600">{obFollowUpDone}</span>
              <span className="text-muted-foreground/60 text-lg font-normal">/</span>
              <span className="text-amber-500">{obFollowUpPending}</span>
            </div>
          }
          icon={Clock}
          iconBg="bg-cyan-50"
          iconColor="text-cyan-600"
        />

        {/* Card 4: Order Confirm Count */}
        <MetricCard
          label="Order Confirm Count"
          value={String(confirmedCount)}
          sub="Confirmed orders"
          subColor="text-emerald-600"
          icon={CheckCircle2}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
        />

        {/* Card 5: Order Delivered */}
        <MetricCard
          label="Order Delivered"
          value={String(deliveredCount)}
          sub="Successfully dispatched"
          subColor="text-emerald-600"
          icon={Truck}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
        />

        {/* Card 6: Total Invoice Amount */}
        <MetricCard
          label="Total Invoice Amount"
          value={cur(totalInvoiceAmount, settings.currency)}
          sub="Cumulative invoice value"
          icon={CreditCard}
          iconBg="bg-purple-50"
          iconColor="text-purple-600"
        />

        {/* Card 7: On Created Amount */}
        <MetricCard
          label="On Created Amount"
          value={cur(onCreatedAmount, settings.currency)}
          sub="Drafts & initial quotes"
          icon={Tag}
          iconBg="bg-pink-50"
          iconColor="text-pink-600"
        />

        {/* Card 8: Amount Received */}
        <MetricCard
          label="Amount Received"
          value={cur(amountReceived, settings.currency)}
          subNode={
            <div className="flex items-center gap-1 text-[9.5px] mt-1.5 font-semibold flex-nowrap overflow-hidden">
              <span className="text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded-xs border border-emerald-200/60 shrink-0 whitespace-nowrap">
                Cash: {cur(cashAmount, settings.currency).replace(".00", "")}
              </span>
              <span className="text-blue-700 bg-blue-50 px-1 py-0.5 rounded-xs border border-blue-200/60 shrink-0 whitespace-nowrap">
                Bank: {cur(bankAmount, settings.currency).replace(".00", "")}
              </span>
            </div>
          }
          icon={Wallet}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
        />

        {/* Card 9: Due From Customer */}
        <MetricCard
          label="Due From Customer"
          value={cur(dueFromCustomer, settings.currency)}
          sub="Outstanding receivables"
          subColor="text-amber-600"
          icon={ShoppingBag}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
        />

        {/* Card 10: Order Cancelled */}
        <MetricCard
          label="Order Cancelled"
          value={String(cancelledCount)}
          sub="Cancelled orders"
          subColor="text-red-500"
          icon={XCircle}
          iconBg="bg-red-50"
          iconColor="text-red-600"
        />
      </div>

      {/* ── 3 Charts Section ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Chart 1: Glass Category Demand (SqFt) */}
        <div className="bg-white rounded-xl border border-border p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Layers className="h-4 w-4 text-blue-500" /> Glass Category Demand (SqFt)
              </h3>
            </div>

            <div className="flex items-center gap-4 text-xs mb-4 flex-wrap">
              {glassDemandData.map((d) => (
                <div key={d.category} className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.fill }} />
                  <span className="text-muted-foreground font-medium">
                    {d.category} (
                    {glassDemandTotal ? Math.round((d.sqft / glassDemandTotal) * 100) : 0}%)
                  </span>
                </div>
              ))}
              {!glassDemandData.length && (
                <span className="text-muted-foreground">No area quoted in this period</span>
              )}
            </div>
          </div>

          <div className="h-[180px] w-full min-w-0">
            {!glassDemandData.length ? (
              <div className="h-full flex flex-col items-center justify-center text-center gap-1">
                <Layers className="h-6 w-6 text-muted-foreground/40" />
                <p className="text-xs font-medium text-muted-foreground">No quoted area yet</p>
                <p className="text-[11px] text-muted-foreground/70">
                  Demand appears here once documents in this period carry sized items.
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={glassDemandData}
                  margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="category"
                    tick={{ fontSize: 10, fill: "#64748b" }}
                    axisLine={{ stroke: "#e2e8f0" }}
                    tickLine={false}
                  />
                  {/* Was pinned to [0, 1400] to frame the hard-coded numbers; a
                    real dataset either flattened against the ceiling or vanished
                    at the bottom of it. */}
                  <YAxis
                    tick={{ fontSize: 10, fill: "#64748b" }}
                    axisLine={{ stroke: "#e2e8f0" }}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      borderRadius: "8px",
                      border: "1px solid #e2e8f0",
                      fontSize: "12px",
                    }}
                    formatter={(val: any) => [`${val} SqFt`, "Demand"]}
                  />
                  <Bar dataKey="sqft" radius={[6, 6, 0, 0]}>
                    {glassDemandData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart 2: Quotation vs Converted Revenue */}
        <div className="bg-white rounded-xl border border-border p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-purple-500" /> Quotation vs Converted Revenue
              </h3>
            </div>

            <div className="flex items-center gap-3 text-xs mb-4 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                <span className="text-muted-foreground font-medium">Quoted</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <span className="text-muted-foreground font-medium">Converted</span>
              </div>
              <span className="text-muted-foreground/70 text-[11px]">Last 7 days</span>
            </div>
          </div>

          <div className="h-[180px] w-full min-w-0">
            {!weekHasActivity ? (
              <div className="h-full flex flex-col items-center justify-center text-center gap-1">
                <TrendingUp className="h-6 w-6 text-muted-foreground/40" />
                <p className="text-xs font-medium text-muted-foreground">
                  Nothing raised in the last 7 days
                </p>
                <p className="text-[11px] text-muted-foreground/70">
                  Quoted and converted values plot here as documents are created.
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={quotationVsRevenueData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorQuoted" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: "#64748b" }}
                    axisLine={{ stroke: "#e2e8f0" }}
                    tickLine={false}
                  />
                  {/* The series carries rupees. The axis used to be fixed at
                    [0, 10] and labelled in lakhs, so a real ₹7,802 day plotted
                    780x off-scale and read as "₹ 7802 Lakhs" in the tooltip. */}
                  <YAxis
                    tick={{ fontSize: 10, fill: "#64748b" }}
                    axisLine={{ stroke: "#e2e8f0" }}
                    tickLine={false}
                    tickFormatter={compactAmount}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      borderRadius: "8px",
                      border: "1px solid #e2e8f0",
                      fontSize: "12px",
                    }}
                    formatter={(val: any, name: any) => [
                      cur(Number(val), settings.currency),
                      name === "quoted" ? "Quoted" : "Converted",
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="quoted"
                    stroke="#f59e0b"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorQuoted)"
                    dot={{ r: 3, fill: "#f59e0b" }}
                    activeDot={{ r: 5 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorRevenue)"
                    dot={{ r: 3, fill: "#10b981" }}
                    activeDot={{ r: 5 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart 3: Collection & Cash Flow */}
        <div className="bg-white rounded-xl border border-border p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-emerald-500" /> Collection & Cash Flow
            </h3>
          </div>

          {collectionTotal > 0 ? (
            <div className="flex items-center justify-around h-[180px] relative">
              <div className="w-[150px] h-[150px] relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={collectionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={46}
                      outerRadius={66}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {collectionData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} strokeWidth={0} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#ffffff",
                        borderRadius: "8px",
                        border: "1px solid #e2e8f0",
                        fontSize: "12px",
                      }}
                      formatter={(val: number | string) => [
                        cur(Number(val), settings.currency),
                        "Amount",
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                  <span className="text-xs font-bold text-foreground tracking-tight">
                    {cur(collectionTotal, settings.currency)}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-medium">
                    Total Received
                  </span>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                {collectionData.map((entry) => (
                  <div key={entry.name} className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-xs shrink-0"
                      style={{ backgroundColor: entry.color }}
                    />
                    <div>
                      <div className="text-muted-foreground text-[11px]">{entry.name}</div>
                      <div className="font-semibold text-xs text-foreground">
                        {cur(entry.value, settings.currency)}{" "}
                        <span className="text-muted-foreground font-normal">
                          ({Math.round((entry.value / collectionTotal) * 100)}%)
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-[180px] flex flex-col items-center justify-center text-center gap-1">
              <Wallet className="h-6 w-6 text-muted-foreground/40" />
              <p className="text-xs font-medium text-muted-foreground">No payments recorded yet</p>
              <p className="text-[11px] text-muted-foreground/70">
                Collections appear here once a payment is recorded against an order.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Unified Recent Orders & Bookings Section ───────────────────── */}
      <div className="bg-white rounded-xl border border-border overflow-hidden shadow-xs flex flex-col">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-5 py-3.5 border-b border-border bg-slate-50/70 gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-blue-600 inline-block" />
              Recent Orders & Bookings
            </h3>
            {/* Filter Tabs */}
            <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-border">
              <button
                onClick={() => setOrderTab("all")}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                  orderTab === "all"
                    ? "bg-slate-900 text-white shadow-2xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-slate-100"
                }`}
              >
                All Orders ({recentOrderBookingsRows.length + recentOrderConfirmRows.length})
              </button>
              <button
                onClick={() => setOrderTab("booking")}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                  orderTab === "booking"
                    ? "bg-blue-600 text-white shadow-2xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-slate-100"
                }`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                Pending ({recentOrderBookingsRows.length})
              </button>
              <button
                onClick={() => setOrderTab("confirm")}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                  orderTab === "confirm"
                    ? "bg-emerald-600 text-white shadow-2xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-slate-100"
                }`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Confirmed ({recentOrderConfirmRows.length})
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs font-semibold">
            <Link
              to="/booking"
              className="text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1 transition-colors"
            >
              All Bookings →
            </Link>
            <span className="text-slate-300">|</span>
            <Link
              to="/order"
              search={{ view: undefined }}
              className="text-emerald-600 hover:text-emerald-700 hover:underline flex items-center gap-1 transition-colors"
            >
              All Confirmed →
            </Link>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border text-muted-foreground font-bold uppercase tracking-wider text-[11px] bg-slate-50/40">
                <th className="py-3 px-4">
                  {orderTab === "confirm"
                    ? "Invoice No."
                    : orderTab === "booking"
                      ? "PI No."
                      : "PI / Invoice No."}
                </th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Glass Spec</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {!combinedRecentOrders.length && (
                <tr>
                  <td colSpan={8} className="py-10 px-4 text-center text-muted-foreground">
                    No documents in this period.
                  </td>
                </tr>
              )}
              {combinedRecentOrders.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4 font-bold text-foreground">{formatPiNo(row.no)}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide ${
                        row.type === "booking"
                          ? "bg-blue-50 text-blue-700 border border-blue-200"
                          : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      }`}
                    >
                      {row.type === "booking" ? "Booking" : "Confirmed"}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-800">{row.customer}</td>
                  <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">{row.date}</td>
                  <td className="py-3 px-4 text-muted-foreground">{row.glassType}</td>
                  <td className="py-3 px-4 text-right font-semibold text-foreground">
                    {cur(row.amount, settings.currency)}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                        row.status === "Cancelled"
                          ? "bg-rose-50 text-rose-700 border border-rose-200"
                          : row.status === "Confirmed"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : row.status === "New"
                              ? "bg-blue-50 text-blue-700 border border-blue-200"
                              : row.status === "Follow Up"
                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                : "bg-purple-50 text-purple-700 border border-purple-200"
                      }`}
                    >
                      {row.status === "Confirmed" && "✓ "}
                      {row.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <Link
                      to={row.type === "booking" ? "/booking" : "/order"}
                      search={
                        row.id && !row.id.startsWith("ob-") && !row.id.startsWith("ord-")
                          ? ({ id: row.id } as any)
                          : ({ view: undefined } as any)
                      }
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 hover:text-blue-600 bg-slate-100 hover:bg-blue-50 px-2.5 py-1 rounded-md transition-colors border border-slate-200"
                    >
                      <span>View</span>
                      <ArrowUpRight className="h-3 w-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Bottom Section: Customer Dues List & Total Due Banner ─────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-5">
        {/* Left: Customer Dues List */}
        <div className="bg-white rounded-xl border border-border overflow-hidden shadow-xs flex flex-col">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-slate-50/70">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              Customer Dues Summary
              <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[11px] font-bold rounded-full ml-1">
                {overdueCount} Overdue
              </span>
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground font-bold uppercase tracking-wider text-[11px] bg-slate-50/40">
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Last Invoice Date</th>
                  <th className="py-3 px-4 text-right">Due Amount</th>
                  <th className="py-3 px-4 text-center">Invoices</th>
                  <th className="py-3 px-4">Overdue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {!dueListRows.length && (
                  <tr>
                    <td colSpan={5} className="py-8 px-4 text-center text-muted-foreground">
                      Nothing outstanding in this period.
                    </td>
                  </tr>
                )}
                {dueListRows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-bold text-foreground">{row.customer}</td>
                    <td className="py-3 px-4 text-muted-foreground">{row.lastInvoiceDate}</td>
                    <td className="py-3 px-4 text-right font-semibold text-foreground">
                      {cur(row.dueAmount, settings.currency)}
                    </td>
                    <td className="py-3 px-4 text-center font-medium text-foreground">
                      {row.noOfInvoices}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full font-semibold text-[11px] border ${
                          row.overdueDays > 0
                            ? "bg-red-50 text-red-700 border-red-200"
                            : "bg-slate-50 text-slate-600 border-slate-200"
                        }`}
                      >
                        {row.overdueLabel}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Total Due Banner */}
        <div className="bg-white border border-border rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                Total Outstanding Dues
              </span>
              <div className="h-9 w-9 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                <ShoppingBag className="h-4 w-4" />
              </div>
            </div>

            <div className="text-3xl font-extrabold text-red-600 tracking-tight">
              {cur(dueFromCustomer, settings.currency)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Pending collections across all active customer profiles.
            </p>
          </div>

          <div className="mt-5">
            <Link
              to="/customers"
              className="w-full inline-flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-xs transition-colors"
            >
              <span>View Customer Dues</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Metric Card Component (Clean & Unified Site Design) ───────────────────── */
function MetricCard({
  label,
  sub,
  subColor,
  value,
  valueNode,
  subNode,
  icon: Icon,
  iconBg,
  iconColor,
}: {
  label: string;
  sub?: string;
  subColor?: string;
  value?: string;
  valueNode?: React.ReactNode;
  subNode?: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-border px-4 py-3.5 shadow-xs hover:border-slate-300 transition-colors flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between gap-2 mb-2">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold leading-tight pr-1">
            {label}
          </p>
          <div className={`h-8 w-8 rounded-lg ${iconBg} flex items-center justify-center shrink-0`}>
            <Icon className={`h-4 w-4 ${iconColor}`} />
          </div>
        </div>

        {valueNode ? (
          valueNode
        ) : (
          <div className="text-2xl font-bold text-foreground tracking-tight">{value}</div>
        )}
      </div>

      {subNode ? (
        subNode
      ) : sub ? (
        <p className={`text-[11px] mt-1.5 ${subColor || "text-muted-foreground"}`}>{sub}</p>
      ) : null}
    </div>
  );
}
