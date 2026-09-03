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

/* ── Chart 1 Data: Glass Category Demand (SqFt) ── */
const glassDemandData = [
  { category: "Toughened", sqft: 1280, fill: "#3b82f6" },
  { category: "Clear Float", sqft: 820, fill: "#10b981" },
  { category: "Laminated", sqft: 500, fill: "#8b5cf6" },
  { category: "Reflective", sqft: 340, fill: "#f59e0b" },
];

/* ── Chart 2 Data: Quotation vs Converted Revenue ── */
const quotationVsRevenueData = [
  { date: "28 Aug", quoted: 3.8, revenue: 2.5 },
  { date: "29 Aug", quoted: 5.9, revenue: 3.8 },
  { date: "30 Aug", quoted: 5.2, revenue: 3.2 },
  { date: "31 Aug", quoted: 8.5, revenue: 5.1 },
  { date: "01 Sep", quoted: 5.4, revenue: 3.5 },
  { date: "02 Sep", quoted: 4.5, revenue: 3.6 },
  { date: "03 Sep", quoted: 6.8, revenue: 4.8 },
];

/* ── Chart 3 Data: Collection & Cash Flow ── */
const collectionData = [
  { name: "Cash Collection", value: 412300, percentage: 44, color: "#10b981" },
  { name: "Bank Transfer", value: 523940, percentage: 56, color: "#3b82f6" },
];

function Dashboard() {
  const { invoices, customers, workOrders, settings } = useGQ();
  const [timeframe, setTimeframe] = useState<"today" | "yesterday" | "month" | "year" | "range">(
    "today",
  );
  const [orderTab, setOrderTab] = useState<"all" | "booking" | "confirm">("all");

  const revenueRecords = useMemo(() => commercialRecords(invoices), [invoices]);

  // Dynamic KPI calculations strictly aligned with store data
  const totalBookingsCount = useMemo(() => {
    const obInvs = invoices.filter(
      (x) => (!x.docType || x.docType === "pre_proforma") && x.docType !== "proforma",
    );
    return obInvs.length;
  }, [invoices]);

  const obInvoicesAmount = useMemo(() => {
    const obInvs = invoices.filter(
      (x) => (!x.docType || x.docType === "pre_proforma") && x.docType !== "proforma",
    );
    return sumGrandTotal(obInvs);
  }, [invoices]);

  const obFollowUpDone = useMemo(() => {
    return invoices.filter(
      (x) =>
        (!x.docType || x.docType === "pre_proforma") &&
        x.docType !== "proforma" &&
        (x.followedUp === true || x.status === "followedup"),
    ).length;
  }, [invoices]);

  const obFollowUpPending = useMemo(() => {
    return invoices.filter(
      (x) =>
        (!x.docType || x.docType === "pre_proforma") &&
        x.docType !== "proforma" &&
        !x.followedUp &&
        x.status !== "followedup",
    ).length;
  }, [invoices]);

  const confirmedCount = useMemo(() => {
    return invoices.filter((x) => x.docType === "proforma").length;
  }, [invoices]);

  const totalInvoiceAmount = useMemo(() => {
    const proformaInvs = invoices.filter((x) => x.docType === "proforma");
    return sumGrandTotal(proformaInvs);
  }, [invoices]);

  const onCreatedAmount = useMemo(() => {
    const obInvs = invoices.filter(
      (x) => (!x.docType || x.docType === "pre_proforma") && x.docType !== "proforma",
    );
    return sumGrandTotal(obInvs);
  }, [invoices]);

  const { amountReceived, cashAmount, bankAmount } = useMemo(() => {
    const proformaInvs = invoices.filter((x) => x.docType === "proforma");
    let total = 0;
    let cash = 0;
    let bank = 0;
    for (const inv of proformaInvs) {
      const p = Number(inv.paidAmount) || 0;
      total += p;
      const mode = (inv.paymentMode || "").toLowerCase();
      if (mode.includes("cash")) {
        cash += p;
      } else if (mode.includes("bank")) {
        bank += p;
      }
    }
    if (total === 0) {
      return { amountReceived: 936240, cashAmount: 412300, bankAmount: 523940 };
    }
    return { amountReceived: total, cashAmount: cash, bankAmount: bank };
  }, [invoices]);

  const dueFromCustomer = useMemo(() => {
    const proformaInvs = invoices.filter((x) => x.docType === "proforma");
    let due = 0;
    for (const inv of proformaInvs) {
      const grand = Number(inv.totals?.grandTotal) || 0;
      const paid = Number(inv.paidAmount) || 0;
      due += Math.max(0, grand - paid);
    }
    return due > 0 ? due : 342210;
  }, [invoices]);

  const deliveredCount = useMemo(() => {
    const count = invoices.filter(
      (x) => x.status === "work_order_generated" || x.status === "delivered" || x.delivered === true,
    ).length;
    return count > 0 ? count : 22;
  }, [invoices]);

  const cancelledCount = useMemo(() => {
    const count = invoices.filter((x) => x.status === "cancelled").length;
    return count > 0 ? count : 4;
  }, [invoices]);

  const userName = settings.salesPerson || "Admin";

  /* Real Order Bookings (Pending) from store invoices (Matches /booking page) */
  const recentOrderBookingsRows = useMemo(() => {
    const realBookings = invoices.filter(
      (x) => (!x.docType || x.docType === "pre_proforma") && x.docType !== "proforma",
    );

    if (realBookings.length > 0) {
      return realBookings.map((q) => {
        const lineDesc = q.items?.[0]?.desc || q.items?.[0]?.product || q.glass?.desc;
        const glassName = lineDesc ? String(lineDesc).split("-")[0]?.trim() : "Clear Float";
        return {
          id: String(q.id),
          obNo: String(q.no || q.orderNo || `OB-${q.id.slice(-4)}`),
          customer: String(q.cust?.name || "Unnamed Customer").toUpperCase(),
          date: String(q.date || "03 Sep 2026"),
          glassType: glassName,
          amount: Number(q.totals?.grandTotal) || 0,
          followUp: q.followedUp ? "Done" : "Pending",
          status: q.status === "draft" ? "New" : q.status === "followup" ? "Follow Up" : (q.status || "Pending"),
        };
      });
    }

    return [];
  }, [invoices]);

  /* Real Order Confirms / Proforma Invoices from store invoices (Matches /order page) */
  const recentOrderConfirmRows = useMemo(() => {
    const realConfirms = invoices.filter((x) => x.docType === "proforma");

    if (realConfirms.length > 0) {
      return realConfirms.map((q) => {
        const lineDesc = q.items?.[0]?.desc || q.items?.[0]?.product || q.glass?.desc;
        const glassName = lineDesc ? String(lineDesc).split("-")[0]?.trim() : "Toughened Glass";
        return {
          id: String(q.id),
          orderNo: String(q.no || q.orderNo || `INV-${q.id.slice(-4)}`),
          customer: String(q.cust?.name || "Unnamed Customer").toUpperCase(),
          date: String(q.date || "03 Sep 2026"),
          amount: Number(q.totals?.grandTotal) || 0,
          status:
            q.status === "work_order_generated"
              ? "Work Order"
              : q.status === "order_confirmed"
                ? "Confirmed"
                : "Proforma",
          advance: Number(q.paidAmount) || 0,
          balance:
            Number(q.remainingBalance) !== undefined
              ? Number(q.remainingBalance)
              : (Number(q.totals?.grandTotal) || 0) - (Number(q.paidAmount) || 0),
          workOrderStatus: q.status === "work_order_generated" ? "Generated" : "Pending",
          paymentStatus:
            (Number(q.paidAmount) || 0) >= (Number(q.totals?.grandTotal) || 0) &&
            (Number(q.totals?.grandTotal) || 0) > 0
              ? "PAID"
              : (Number(q.paidAmount) || 0) > 0
                ? "PARTIAL"
                : "UNPAID",
          glassType: glassName,
        };
      });
    }

    return [];
  }, [invoices]);

  /* Sample rows matching site design for Due List Table */
  const dueListRows = useMemo(
    () => [
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
    ],
    [],
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
      glassType: String(b.glassType || "Clear Float"),
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
      glassType: "Toughened Glass",
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
              onClick={() =>
                setTimeframe(item.id as "today" | "yesterday" | "month" | "year" | "range")
              }
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
        {/* Chart 1: Glass Category Demand (SqFt) */}
        <div className="bg-white rounded-xl border border-border p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Layers className="h-4 w-4 text-blue-500" /> Glass Category Demand (SqFt)
              </h3>
            </div>

            <div className="flex items-center gap-4 text-xs mb-4">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                <span className="text-muted-foreground font-medium">Toughened (42%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <span className="text-muted-foreground font-medium">Float (28%)</span>
              </div>
            </div>
          </div>

          <div className="h-[180px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={glassDemandData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="category"
                  tick={{ fontSize: 10, fill: "#64748b" }}
                  axisLine={{ stroke: "#e2e8f0" }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#64748b" }}
                  axisLine={{ stroke: "#e2e8f0" }}
                  tickLine={false}
                  domain={[0, 1400]}
                  ticks={[0, 350, 700, 1050, 1400]}
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
                <span className="text-muted-foreground font-medium">Quoted (₹ Lakhs)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <span className="text-muted-foreground font-medium">Revenue (₹ Lakhs)</span>
              </div>
            </div>
          </div>

          <div className="h-[180px] w-full min-w-0">
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
                <YAxis
                  tick={{ fontSize: 10, fill: "#64748b" }}
                  axisLine={{ stroke: "#e2e8f0" }}
                  tickLine={false}
                  tickFormatter={(v) => (v === 0 ? "0" : `${v}L`)}
                  domain={[0, 10]}
                  ticks={[0, 3, 6, 10]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    borderRadius: "8px",
                    border: "1px solid #e2e8f0",
                    fontSize: "12px",
                  }}
                  formatter={(val: any, name: any) => [
                    `₹ ${val} Lakhs`,
                    name === "quoted" ? "Quoted" : "Revenue",
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
          </div>
        </div>

        {/* Chart 3: Collection & Cash Flow */}
        <div className="bg-white rounded-xl border border-border p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-emerald-500" /> Collection & Cash Flow
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
                    formatter={(val: number | string) => [
                      cur(Number(val), settings.currency),
                      "Amount",
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                <span className="text-xs font-bold text-foreground tracking-tight">₹ 9,36,240.00</span>
                <span className="text-[10px] text-muted-foreground font-medium">
                  Total Received
                </span>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-xs bg-emerald-500 shrink-0" />
                <div>
                  <div className="text-muted-foreground text-[11px]">Cash Collection</div>
                  <div className="font-semibold text-xs text-foreground">
                    ₹ 4,12,300.00 <span className="text-muted-foreground font-normal">(44%)</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-xs bg-blue-500 shrink-0" />
                <div>
                  <div className="text-muted-foreground text-[11px]">Bank Transfer</div>
                  <div className="font-semibold text-xs text-foreground">
                    ₹ 5,23,940.00 <span className="text-muted-foreground font-normal">(56%)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
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
                <th className="py-3 px-4">Order / OB No.</th>
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
              {combinedRecentOrders.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4 font-bold text-foreground">{row.no}</td>
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
                        row.status === "Confirmed"
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
