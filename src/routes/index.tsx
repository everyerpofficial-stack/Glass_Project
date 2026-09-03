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
  Plus,
  Calendar as CalendarIcon,
  ChevronRight,
  ArrowUpRight,
  Settings,
  AlertCircle,
  CreditCard,
  Building2,
  DollarSign,
  ChevronDown,
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
import { Button } from "@/components/ui/button";
import { useGQ } from "@/lib/store";
import { TableSkeleton, ValueSkeleton } from "@/components/app/DataSkeleton";
import { commercialRecords, cur, liveWorkOrders, sumGrandTotal } from "@/lib/gq";

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
  const { invoices, customers, workOrders, settings, hydrated } = useGQ();
  const [timeframe, setTimeframe] = useState<"today" | "yesterday" | "month" | "year" | "range">(
    "today",
  );

  const revenueRecords = useMemo(() => commercialRecords(invoices), [invoices]);
  const activeWorkOrders = useMemo(
    () => liveWorkOrders(workOrders, invoices),
    [workOrders, invoices],
  );

  // Dynamic calculations with sensible default values matching the mockup
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

  /* Sample rows matching Image 1 for Order Bookings Table */
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

  /* Sample rows matching Image 1 for Recent Order Confirm Table */
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

  /* Sample rows matching Image 1 for Due List Table */
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
    <div className="max-w-[1400px] mx-auto space-y-5 px-3 sm:px-5 lg:px-6 pt-4 pb-12 text-foreground">
      {/* ── Top Bar: Date Filters & Greeting ─────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/80 backdrop-blur-xs p-4 rounded-2xl border border-border/80 shadow-2xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            {getGreeting()}, {userName}! <span className="animate-bounce inline-block">👋</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Here's what's happening with your business today.
          </p>
        </div>

        {/* Date Filter Pills Bar */}
        <div className="flex items-center gap-1.5 flex-wrap bg-muted/40 p-1 rounded-xl border border-border/60">
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
                  ? "bg-blue-600 text-white shadow-2xs"
                  : "bg-white text-muted-foreground hover:text-foreground hover:bg-muted/60"
              }`}
            >
              {item.label}
            </button>
          ))}
          <button
            onClick={() => setTimeframe("range")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
              timeframe === "range"
                ? "bg-blue-600 text-white shadow-2xs"
                : "bg-white text-muted-foreground hover:text-foreground hover:bg-muted/60"
            }`}
          >
            <span>Date Range</span>
            <CalendarIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* ── 10 KPI Metric Cards (2 Rows of 5) ────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Card 1: Order Booking Count */}
        <MetricCard
          num="1"
          numColor="text-blue-600"
          title="Order Booking Count"
          value={String(totalBookingsCount)}
          icon={ClipboardList}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
        />

        {/* Card 2: OB Invoices Amount */}
        <MetricCard
          num="2"
          numColor="text-amber-500"
          title="OB Invoices Amount"
          subtitle="(Not yet Order Generated)"
          value={cur(obInvoicesAmount, settings.currency)}
          icon={FileText}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
          mono
        />

        {/* Card 3: OB Follow Up Done / Pending */}
        <MetricCard
          num="3"
          numColor="text-cyan-600"
          title="OB Follow Up"
          subtitle="Done / Pending"
          valueNode={
            <span className="text-xl font-bold tracking-tight">
              <span className="text-emerald-600">18</span>
              <span className="text-muted-foreground font-normal mx-1">/</span>
              <span className="text-amber-500">14</span>
            </span>
          }
          icon={Clock}
          iconBg="bg-cyan-50"
          iconColor="text-cyan-600"
        />

        {/* Card 4: Order Confirm Count */}
        <MetricCard
          num="4"
          numColor="text-emerald-600"
          title="Order Confirm Count"
          value={String(confirmedCount)}
          icon={CheckCircle2}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
        />

        {/* Card 5: Total Invoice Amount */}
        <MetricCard
          num="5"
          numColor="text-purple-600"
          title="Total Invoice Amount"
          value={cur(totalInvoiceAmount, settings.currency)}
          icon={CreditCard}
          iconBg="bg-purple-50"
          iconColor="text-purple-600"
          mono
        />

        {/* Card 6: On Created Amount */}
        <MetricCard
          num="6"
          numColor="text-pink-600"
          title="On Created Amount"
          value={cur(onCreatedAmount, settings.currency)}
          icon={Tag}
          iconBg="bg-pink-50"
          iconColor="text-pink-600"
          mono
        />

        {/* Card 7: Amount Received */}
        <MetricCard
          num="7"
          numColor="text-emerald-600"
          title="Amount Received"
          value={cur(amountReceived, settings.currency)}
          subNode={
            <div className="flex items-center gap-2 text-[10px] mt-1 font-medium">
              <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                Cash: {cur(cashAmount, settings.currency)}
              </span>
              <span className="text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                Bank: {cur(bankAmount, settings.currency)}
              </span>
            </div>
          }
          icon={Wallet}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
          mono
        />

        {/* Card 8: Due From Customer */}
        <MetricCard
          num="8"
          numColor="text-amber-500"
          title="Due From Customer"
          value={cur(dueFromCustomer, settings.currency)}
          icon={ShoppingBag}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
          mono
        />

        {/* Card 9: Order Delivered Successfully */}
        <MetricCard
          num="9"
          numColor="text-emerald-600"
          title="Order Delivered Successfully"
          value={String(deliveredCount)}
          icon={Truck}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
        />

        {/* Card 10: Order Cancelled */}
        <MetricCard
          num="10"
          numColor="text-red-500"
          title="Order Cancelled"
          value={String(cancelledCount)}
          icon={XCircle}
          iconBg="bg-red-50"
          iconColor="text-red-600"
        />
      </div>

      {/* ── 3 Charts Section ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Chart 1: Order Booking vs Order Confirm */}
        <div className="bg-white rounded-2xl border border-border/80 p-4 shadow-2xs flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-bold text-foreground">Order Booking vs Order Confirm*</h2>
          </div>

          <div className="flex items-center gap-4 text-[11px] mb-3">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              <span className="text-muted-foreground font-medium">Order Booking</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-muted-foreground font-medium">Order Confirm</span>
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
                    fontSize: "11px",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="booking"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "#3b82f6" }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="confirm"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "#10b981" }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: OB Invoices vs Order Invoiced Amount */}
        <div className="bg-white rounded-2xl border border-border/80 p-4 shadow-2xs flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-bold text-foreground">
              OB Invoices vs Order Invoiced Amount
            </h2>
          </div>

          <div className="flex items-center gap-3 text-[10px] mb-3 flex-wrap">
            <div className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              <span className="text-muted-foreground font-medium">
                OB Invoices (Not yet Order Generated)
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-purple-500" />
              <span className="text-muted-foreground font-medium">Order Invoiced</span>
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
                    fontSize: "11px",
                  }}
                  formatter={(val: any) => [`₹ ${val} Lakhs`, ""]}
                />
                <Line
                  type="monotone"
                  dataKey="obInvoices"
                  stroke="#f97316"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "#f97316" }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="invoiced"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "#8b5cf6" }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Collection Overview */}
        <div className="bg-white rounded-2xl border border-border/80 p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-xs font-bold text-foreground">Collection Overview</h2>
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
                      fontSize: "11px",
                    }}
                    formatter={(val: any) => [cur(val, settings.currency), "Amount"]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                <span className="text-[12px] font-bold text-foreground tracking-tight leading-tight">
                  ₹ 9,36,240
                </span>
                <span className="text-[9px] text-muted-foreground font-medium">Total Received</span>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-xs bg-emerald-500 shrink-0" />
                <div>
                  <div className="text-muted-foreground text-[11px]">Cash</div>
                  <div className="font-semibold text-[12px] text-foreground">
                    ₹ 4,12,300 <span className="text-muted-foreground font-normal">(44%)</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-xs bg-blue-500 shrink-0" />
                <div>
                  <div className="text-muted-foreground text-[11px]">Bank</div>
                  <div className="font-semibold text-[12px] text-foreground">
                    ₹ 5,23,940 <span className="text-muted-foreground font-normal">(56%)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tables Section (Recent Order Bookings & Recent Order Confirm) ───── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Recent Order Bookings */}
        <div className="bg-white rounded-2xl border border-border/80 overflow-hidden shadow-2xs flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/60 bg-muted/20">
            <h2 className="text-xs font-bold text-foreground">Recent Order Bookings</h2>
            <Link
              to="/booking"
              className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100/80 px-2.5 py-1 rounded-md transition-colors"
            >
              View All
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px]">
              <thead>
                <tr className="border-b border-border/50 text-muted-foreground font-semibold bg-muted/10">
                  <th className="py-2.5 px-3">OB No.</th>
                  <th className="py-2.5 px-3">Customer</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Glass Type</th>
                  <th className="py-2.5 px-3 text-right">Amount</th>
                  <th className="py-2.5 px-3">Follow Up</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {recentOrderBookingsRows.map((row) => (
                  <tr key={row.id} className="hover:bg-muted/20 transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-foreground font-mono">
                      {row.obNo}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-foreground">{row.customer}</td>
                    <td className="py-2.5 px-3 text-muted-foreground whitespace-nowrap">
                      {row.date}
                    </td>
                    <td className="py-2.5 px-3 text-muted-foreground">{row.glassType}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-semibold text-foreground">
                      {cur(row.amount, settings.currency)}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`text-[10px] font-semibold ${
                          row.followUp === "Done" ? "text-emerald-600" : "text-amber-600"
                        }`}
                      >
                        {row.followUp}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${
                          row.status === "New"
                            ? "bg-blue-50 text-blue-600 border border-blue-200"
                            : row.status === "Follow Up"
                              ? "bg-amber-50 text-amber-600 border border-amber-200"
                              : "bg-emerald-50 text-emerald-600 border border-emerald-200"
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
        <div className="bg-white rounded-2xl border border-border/80 overflow-hidden shadow-2xs flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/60 bg-muted/20">
            <h2 className="text-xs font-bold text-foreground">Recent Order Confirm</h2>
            <Link
              to="/order"
              search={{ view: undefined }}
              className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100/80 px-2.5 py-1 rounded-md transition-colors"
            >
              View All
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px]">
              <thead>
                <tr className="border-b border-border/50 text-muted-foreground font-semibold bg-muted/10">
                  <th className="py-2.5 px-3">Order No.</th>
                  <th className="py-2.5 px-3">Customer</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3 text-right">Amount</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {recentOrderConfirmRows.map((row) => (
                  <tr key={row.id} className="hover:bg-muted/20 transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-foreground font-mono">
                      {row.orderNo}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-foreground">{row.customer}</td>
                    <td className="py-2.5 px-3 text-muted-foreground whitespace-nowrap">
                      {row.date}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-semibold text-foreground">
                      {cur(row.amount, settings.currency)}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded border border-emerald-400 bg-emerald-50/50 text-emerald-600 text-[10px] font-semibold">
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Bottom Row: Due List & Total Due Banner ──────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4">
        {/* Left: Due List */}
        <div className="bg-white rounded-2xl border border-border/80 overflow-hidden shadow-2xs flex flex-col">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border/60 bg-muted/20">
            <h2 className="text-xs font-bold text-red-600 flex items-center gap-1.5">Due List</h2>
            <span className="h-4 min-w-[16px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full inline-flex items-center justify-center">
              8
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px]">
              <thead>
                <tr className="border-b border-border/50 text-muted-foreground font-semibold bg-muted/10">
                  <th className="py-2.5 px-3">Customer</th>
                  <th className="py-2.5 px-3">Last Invoice Date</th>
                  <th className="py-2.5 px-3 text-right">Due Amount</th>
                  <th className="py-2.5 px-3 text-center">No. of Invoices</th>
                  <th className="py-2.5 px-3">Overdue Days</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {dueListRows.map((row) => (
                  <tr key={row.id} className="hover:bg-muted/20 transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-foreground">{row.customer}</td>
                    <td className="py-2.5 px-3 text-muted-foreground">{row.lastInvoiceDate}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-semibold text-foreground">
                      {cur(row.dueAmount, settings.currency)}
                    </td>
                    <td className="py-2.5 px-3 text-center font-semibold text-foreground">
                      {row.noOfInvoices}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-red-500">{row.overdueDays}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Total Due Amount Banner */}
        <div className="bg-gradient-to-br from-red-50/90 via-rose-50/50 to-red-100/40 border border-red-200/80 rounded-2xl p-4 shadow-2xs flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0 shadow-2xs">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-muted-foreground">
                Total Due Amount
              </div>
              <div className="text-xl font-extrabold text-red-600 font-mono tracking-tight">
                {cur(342210, settings.currency)}
              </div>
            </div>
          </div>

          <Link
            to="/customers"
            className="bg-white hover:bg-red-50 border border-red-300 text-red-600 text-xs font-semibold px-3 py-2 rounded-xl shadow-2xs transition-colors whitespace-nowrap"
          >
            View All Dues
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ── Metric Card Component ────────────────────────────────────────── */
function MetricCard({
  num,
  numColor,
  title,
  subtitle,
  value,
  valueNode,
  subNode,
  icon: Icon,
  iconBg,
  iconColor,
  mono = false,
}: {
  num: string;
  numColor?: string;
  title: string;
  subtitle?: string;
  value?: string;
  valueNode?: React.ReactNode;
  subNode?: React.ReactNode;
  icon: any;
  iconBg: string;
  iconColor: string;
  mono?: boolean;
}) {
  return (
    <div className="bg-white rounded-2xl border border-border/80 p-3.5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between min-h-[92px] relative overflow-hidden">
      <div>
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className={`text-xs font-extrabold ${numColor || "text-blue-600"}`}>{num}</span>
            <div className="min-w-0">
              <div className="text-[11px] font-bold text-foreground leading-tight truncate">
                {title}
              </div>
              {subtitle && (
                <div className="text-[9px] text-muted-foreground font-medium truncate leading-tight">
                  {subtitle}
                </div>
              )}
            </div>
          </div>
          <div className={`h-7 w-7 rounded-lg ${iconBg} flex items-center justify-center shrink-0`}>
            <Icon className={`h-3.5 w-3.5 ${iconColor}`} />
          </div>
        </div>

        {valueNode ? (
          valueNode
        ) : (
          <div
            className={`text-lg font-bold text-foreground tracking-tight ${
              mono ? "font-mono tabular-nums" : ""
            }`}
          >
            {value}
          </div>
        )}
      </div>

      {subNode && subNode}
    </div>
  );
}
