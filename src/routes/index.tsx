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
} from "lucide-react";
import { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from "recharts";
import { useGQ } from "@/lib/store";
import { commercialRecords, cur, sumGrandTotal } from "@/lib/gq";

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

/* ── Chart 1 Data: Order Booking vs Order Confirm ── */
const bookingVsConfirmData = [
  { date: "28 Aug", booking: 20, confirm: 10 },
  { date: "29 Aug", booking: 25, confirm: 14 },
  { date: "30 Aug", booking: 24, confirm: 13.5 },
  { date: "31 Aug", booking: 43, confirm: 27 },
  { date: "01 Sep", booking: 27, confirm: 14 },
  { date: "02 Sep", booking: 26, confirm: 14.5 },
  { date: "03 Sep", booking: 28, confirm: 18 },
];

/* ── Chart 2 Data: OB Invoices vs Order Invoiced Amount ── */
const obVsInvoicedData = [
  { date: "28 Aug", obInvoices: 5.0, invoiced: 2.0 },
  { date: "29 Aug", obInvoices: 7.1, invoiced: 3.1 },
  { date: "30 Aug", obInvoices: 5.7, invoiced: 2.6 },
  { date: "31 Aug", obInvoices: 7.3, invoiced: 3.8 },
  { date: "01 Sep", obInvoices: 6.0, invoiced: 2.7 },
  { date: "02 Sep", obInvoices: 4.6, invoiced: 2.7 },
  { date: "03 Sep", obInvoices: 5.4, invoiced: 2.7 },
];

/* ── Chart 3 Data: Collection Overview ── */
const collectionData = [
  { name: "Cash", value: 412300, percentage: 44, color: "#10b981" },
  { name: "Bank", value: 523940, percentage: 56, color: "#3b82f6" },
];

function Dashboard() {
  const { invoices, customers, workOrders, settings } = useGQ();
  const [timeframe, setTimeframe] = useState<"today" | "yesterday" | "month" | "year" | "range">(
    "today",
  );

  const revenueRecords = useMemo(() => commercialRecords(invoices), [invoices]);

  // Dynamic calculations with sensible default values matching actual app data
  const totalBookingsCount = useMemo(() => {
    return invoices.length > 0 ? invoices.length : 32;
  }, [invoices]);

  const obInvoicesAmount = useMemo(() => {
    const obInvs = invoices.filter(
      (x) => x.docType === "pre_proforma" || (x.status || "draft") === "draft",
    );
    const sum = sumGrandTotal(obInvs);
    return sum > 0 ? sum : 245780;
  }, [invoices]);

  const confirmedCount = useMemo(() => {
    const count = invoices.filter(
      (x) => x.status === "order_confirmed" || x.status === "work_order_generated",
    ).length;
    return count > 0 ? count : 26;
  }, [invoices]);

  const totalInvoiceAmount = useMemo(() => {
    const rev = sumGrandTotal(revenueRecords);
    return rev > 0 ? rev : 1278450;
  }, [revenueRecords]);

  const onCreatedAmount = useMemo(() => {
    const draftSum = sumGrandTotal(invoices.filter((x) => (x.status || "draft") === "draft"));
    return draftSum > 0 ? draftSum : 342210;
  }, [invoices]);

  const amountReceived = 936240;
  const cashAmount = 412300;
  const bankAmount = 523940;
  const dueFromCustomer = 342210;
  const deliveredCount = 22;
  const cancelledCount = 4;

  const userName = settings.salesPerson || "Admin";

  /* Sample rows matching site design for Order Bookings Table */
  const recentOrderBookingsRows = useMemo(() => {
    if (invoices.length >= 3) {
      return invoices.slice(0, 5).map((q, idx) => ({
        id: q.id,
        obNo: q.no || `OB-2026-0${32 - idx}`,
        customer: (q.cust?.name || "Unnamed").toUpperCase(),
        date: q.date || "03 Sep 2026",
        glassType: q.glass?.desc?.split("-")[0]?.trim() || "Clear Float",
        amount: q.totals?.grandTotal || 25430,
        followUp: idx % 2 === 0 ? "Done" : "Pending",
        status: idx === 0 ? "New" : idx % 2 === 1 ? "Follow Up" : "In Progress",
      }));
    }
    return [
      {
        id: "ob-32",
        obNo: "OB-2026-032",
        customer: "RAM PVT LTD",
        date: "03 Sep 2026",
        glassType: "Clear Float",
        amount: 25430,
        followUp: "Done",
        status: "New",
      },
      {
        id: "ob-31",
        obNo: "OB-2026-031",
        customer: "SHYAM GLASS",
        date: "03 Sep 2026",
        glassType: "Toughened",
        amount: 18760,
        followUp: "Pending",
        status: "Follow Up",
      },
      {
        id: "ob-30",
        obNo: "OB-2026-030",
        customer: "KRISHNA INTERIORS",
        date: "02 Sep 2026",
        glassType: "Laminated",
        amount: 36540,
        followUp: "Done",
        status: "In Progress",
      },
      {
        id: "ob-29",
        obNo: "OB-2026-029",
        customer: "SRI SAI TRADERS",
        date: "02 Sep 2026",
        glassType: "Reflective",
        amount: 12890,
        followUp: "Pending",
        status: "Follow Up",
      },
      {
        id: "ob-28",
        obNo: "OB-2026-028",
        customer: "MODERN BUILDERS",
        date: "01 Sep 2026",
        glassType: "Clear Float",
        amount: 22650,
        followUp: "Done",
        status: "New",
      },
    ];
  }, [invoices]);

  /* Sample rows matching site design for Recent Order Confirm Table */
  const recentOrderConfirmRows = [
    {
      id: "ord-26",
      orderNo: "ORD-2026-026",
      customer: "RAM PVT LTD",
      date: "03 Sep 2026",
      amount: 25430,
      status: "Confirmed",
    },
    {
      id: "ord-25",
      orderNo: "ORD-2026-025",
      customer: "SHYAM GLASS",
      date: "02 Sep 2026",
      amount: 18760,
      status: "Confirmed",
    },
    {
      id: "ord-24",
      orderNo: "ORD-2026-024",
      customer: "KRISHNA INTERIORS",
      date: "02 Sep 2026",
      amount: 36540,
      status: "Confirmed",
    },
    {
      id: "ord-23",
      orderNo: "ORD-2026-023",
      customer: "SRI SAI TRADERS",
      date: "01 Sep 2026",
      amount: 12890,
      status: "Confirmed",
    },
    {
      id: "ord-22",
      orderNo: "ORD-2026-022",
      customer: "MODERN BUILDERS",
      date: "01 Sep 2026",
      amount: 22650,
      status: "Confirmed",
    },
  ];

  /* Sample rows matching site design for Due List Table */
  const dueListRows = [
    {
      id: "due-1",
      customer: "RAM PVT LTD",
      lastInvoiceDate: "25 Aug 2026",
      dueAmount: 85420,
      noOfInvoices: 3,
      overdueDays: "9 Days",
    },
    {
      id: "due-2",
      customer: "SHYAM GLASS",
      lastInvoiceDate: "20 Aug 2026",
      dueAmount: 45780,
      noOfInvoices: 2,
      overdueDays: "14 Days",
    },
  ];

  return (
    <div className="max-w-[1200px] mx-auto space-y-6 px-4 sm:px-6 lg:px-8 pt-6 pb-12 text-foreground">
      {/* ── Page Header & Timeframe Filter ───────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            Dashboard Overview
          </h1>
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
              onClick={() => setTimeframe(item.id as any)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                timeframe === item.id
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              }`}
            >
              {item.label}
            </button>
          ))}
          <button
            onClick={() => setTimeframe("range")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
              timeframe === "range"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
            }`}
          >
            <span>Date Range</span>
            <CalendarIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* ── Metric Cards Grid (NO numbers 1..10) ────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: Order Booking Count */}
        <MetricCard
          label="Order Booking Count"
          value={String(totalBookingsCount)}
          sub="Total bookings received"
          icon={ClipboardList}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
        />

        {/* Card 2: OB Invoices Amount */}
        <MetricCard
          label="OB Invoices Amount"
          sub="Pending order generation"
          value={cur(obInvoicesAmount, settings.currency)}
          icon={FileText}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
        />

        {/* Card 3: OB Follow Up */}
        <MetricCard
          label="OB Follow Up"
          sub="Done vs Pending"
          valueNode={
            <div className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-1.5 mt-0.5">
              <span className="text-emerald-600">18</span>
              <span className="text-muted-foreground/60 text-lg font-normal">/</span>
              <span className="text-amber-500">14</span>
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

        {/* Card 5: Total Invoice Amount */}
        <MetricCard
          label="Total Invoice Amount"
          value={cur(totalInvoiceAmount, settings.currency)}
          sub="Cumulative invoice value"
          icon={CreditCard}
          iconBg="bg-purple-50"
          iconColor="text-purple-600"
        />

        {/* Card 6: On Created Amount */}
        <MetricCard
          label="On Created Amount"
          value={cur(onCreatedAmount, settings.currency)}
          sub="Drafts & initial quotes"
          icon={Tag}
          iconBg="bg-pink-50"
          iconColor="text-pink-600"
        />

        {/* Card 7: Amount Received */}
        <MetricCard
          label="Amount Received"
          value={cur(amountReceived, settings.currency)}
          subNode={
            <div className="flex items-center gap-1.5 text-[10px] mt-1 font-medium flex-wrap">
              <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-100">
                Cash: {cur(cashAmount, settings.currency)}
              </span>
              <span className="text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded-md border border-blue-100">
                Bank: {cur(bankAmount, settings.currency)}
              </span>
            </div>
          }
          icon={Wallet}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
        />

        {/* Card 8: Due From Customer */}
        <MetricCard
          label="Due From Customer"
          value={cur(dueFromCustomer, settings.currency)}
          sub="Outstanding receivables"
          subColor="text-amber-600"
          icon={ShoppingBag}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
        />

        {/* Card 9: Order Delivered */}
        <MetricCard
          label="Order Delivered"
          value={String(deliveredCount)}
          sub="Successfully dispatched"
          subColor="text-emerald-600"
          icon={Truck}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
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
        {/* Chart 1: Order Booking vs Order Confirm */}
        <div className="bg-white rounded-xl border border-border p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-blue-500" /> Order Booking vs Order Confirm
              </h3>
            </div>

            <div className="flex items-center gap-4 text-xs mb-4">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                <span className="text-muted-foreground font-medium">Order Booking</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <span className="text-muted-foreground font-medium">Order Confirm</span>
              </div>
            </div>
          </div>

          <div className="h-[180px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={bookingVsConfirmData}
                margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "#64748b" }}
                  axisLine={{ stroke: "#e2e8f0" }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#64748b" }}
                  axisLine={{ stroke: "#e2e8f0" }}
                  tickLine={false}
                  domain={[0, 50]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    borderRadius: "8px",
                    border: "1px solid #e2e8f0",
                    fontSize: "12px",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="booking"
                  stroke="#3b82f6"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: "#3b82f6" }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="confirm"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: "#10b981" }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: OB Invoices vs Order Invoiced Amount */}
        <div className="bg-white rounded-xl border border-border p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-amber-500" /> OB Invoices vs Invoiced Amount
              </h3>
            </div>

            <div className="flex items-center gap-3 text-xs mb-4 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                <span className="text-muted-foreground font-medium">OB Invoices (Pending)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-purple-500" />
                <span className="text-muted-foreground font-medium">Order Invoiced</span>
              </div>
            </div>
          </div>

          <div className="h-[180px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={obVsInvoicedData}
                margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "#64748b" }}
                  axisLine={{ stroke: "#e2e8f0" }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#64748b" }}
                  axisLine={{ stroke: "#e2e8f0" }}
                  tickLine={false}
                  tickFormatter={(v) => (v === 0 ? "0" : `${v}L`)}
                  domain={[0, 8]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    borderRadius: "8px",
                    border: "1px solid #e2e8f0",
                    fontSize: "12px",
                  }}
                  formatter={(val: any) => [`₹ ${val} Lakhs`, ""]}
                />
                <Line
                  type="monotone"
                  dataKey="obInvoices"
                  stroke="#f59e0b"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: "#f59e0b" }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="invoiced"
                  stroke="#8b5cf6"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: "#8b5cf6" }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Collection Overview */}
        <div className="bg-white rounded-xl border border-border p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <PieChartIcon className="h-4 w-4 text-emerald-500" /> Collection Overview
            </h3>
          </div>

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
                    {collectionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      borderRadius: "8px",
                      border: "1px solid #e2e8f0",
                      fontSize: "12px",
                    }}
                    formatter={(val: any) => [cur(val, settings.currency), "Amount"]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                <span className="text-xs font-bold text-foreground tracking-tight">
                  ₹ 9,36,240
                </span>
                <span className="text-[10px] text-muted-foreground font-medium">Total Received</span>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-xs bg-emerald-500 shrink-0" />
                <div>
                  <div className="text-muted-foreground text-[11px]">Cash Collection</div>
                  <div className="font-semibold text-xs text-foreground">
                    ₹ 4,12,300 <span className="text-muted-foreground font-normal">(44%)</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-xs bg-blue-500 shrink-0" />
                <div>
                  <div className="text-muted-foreground text-[11px]">Bank Transfer</div>
                  <div className="font-semibold text-xs text-foreground">
                    ₹ 5,23,940 <span className="text-muted-foreground font-normal">(56%)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tables Section (Recent Order Bookings & Recent Order Confirm) ───── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left: Recent Order Bookings */}
        <div className="bg-white rounded-xl border border-border overflow-hidden shadow-xs flex flex-col">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-slate-50/70">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-blue-600 inline-block" />
              Recent Order Bookings
            </h3>
            <Link
              to="/booking"
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline transition-colors"
            >
              View All →
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground font-bold uppercase tracking-wider text-[11px] bg-slate-50/40">
                  <th className="py-3 px-4">OB No.</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Glass Spec</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {recentOrderBookingsRows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-bold text-foreground">
                      {row.obNo}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{row.customer}</td>
                    <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                      {row.date}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">{row.glassType}</td>
                    <td className="py-3 px-4 text-right font-semibold text-foreground">
                      {cur(row.amount, settings.currency)}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                          row.status === "New"
                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : row.status === "Follow Up"
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Recent Order Confirm */}
        <div className="bg-white rounded-xl border border-border overflow-hidden shadow-xs flex flex-col">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-slate-50/70">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-600 inline-block" />
              Recent Order Confirm
            </h3>
            <Link
              to="/order"
              search={{ view: undefined }}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline transition-colors"
            >
              View All →
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground font-bold uppercase tracking-wider text-[11px] bg-slate-50/40">
                  <th className="py-3 px-4">Order No.</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {recentOrderConfirmRows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-bold text-foreground">
                      {row.orderNo}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{row.customer}</td>
                    <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                      {row.date}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-foreground">
                      {cur(row.amount, settings.currency)}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 text-[11px] font-semibold">
                        ✓ {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
                2 Overdue
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
                      <span className="px-2.5 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 font-semibold text-[11px]">
                        {row.overdueDays}
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
              {cur(342210, settings.currency)}
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
  icon: any;
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
