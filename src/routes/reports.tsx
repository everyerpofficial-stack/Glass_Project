import { createFileRoute } from "@tanstack/react-router";
import {
  BarChart3,
  TrendingUp,
  PieChart as PieChartIcon,
  Users,
  FileText,
  Layers,
  ArrowUpRight,
} from "lucide-react";
import { useMemo } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { useGQ } from "@/lib/store";
import { commercialRecords, cur, sumGrandTotal } from "@/lib/gq";

export const Route = createFileRoute("/reports")({
  component: ReportsAnalyticsPage,
});

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4"];

function ReportsAnalyticsPage() {
  const { invoices, customers, settings } = useGQ();

  /* One row per commercial order. A confirmed booking and the Proforma Invoice
     generated from it both carry the same grandTotal, so summing `invoices`
     directly reported roughly twice the revenue actually written. Applies to
     the volume count and the monthly trend for the same reason. */
  const revenueRecords = useMemo(() => commercialRecords(invoices), [invoices]);

  const totalRevenue = useMemo(() => sumGrandTotal(revenueRecords), [revenueRecords]);

  const syncedCount = invoices.filter((x) => x.sync === "synced").length;
  const pendingCount = invoices.filter((x) => x.sync !== "synced").length;

  // Thickness distribution data
  const thicknessData = useMemo(() => {
    const counts: Record<string, number> = {};
    revenueRecords.forEach((q) => {
      const th = `${q.glass?.thickness || 5}mm`;
      counts[th] = (counts[th] || 0) + 1;
    });
    return Object.keys(counts).map((key) => ({
      name: key,
      value: counts[key],
    }));
  }, [revenueRecords]);

  // Sync status data
  const syncStatusData = useMemo(
    () => [
      { name: "Synced to Sheet", count: syncedCount, fill: "#10b981" },
      { name: "Local / Pending Sync", count: pendingCount, fill: "#f59e0b" },
    ],
    [syncedCount, pendingCount],
  );

  /* Monthly trend for the current year.
     This previously ran `... .length || (idx + 1) * 2` and
     `... .reduce(...) || (idx + 1) * 15000`, so any month with no bookings was
     backfilled with invented counts and invented rupee amounts — a finance
     report showing revenue that did not exist. It also covered only Jan–Aug and
     ignored the year, merging every January on record into one bar. */
  const reportYear = new Date().getFullYear();

  const monthlyTrendData = useMemo(() => {
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const buckets = months.map((month) => ({ month, quotes: 0, revenue: 0 }));

    revenueRecords.forEach((q) => {
      const d = new Date(q?.date);
      if (isNaN(d.getTime()) || d.getFullYear() !== reportYear) return;
      const bucket = buckets[d.getMonth()];
      if (!bucket) return;
      bucket.quotes += 1;
      bucket.revenue += Number(q?.totals?.grandTotal) || 0;
    });

    return buckets;
  }, [revenueRecords, reportYear]);

  return (
    <div className="max-w-[1200px] mx-auto space-y-6 px-4 sm:px-6 lg:px-8 pt-6 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Analytics & Performance
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Visual insights into quotation revenue, glass thickness trends, and sheet sync
          distribution
        </p>
      </div>

      {/* KPI Summary Grid */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <KPICard
          label="Total Quotation Volume"
          value={String(revenueRecords.length)}
          sub="Total saved quotes"
          icon={FileText}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
        />
        <KPICard
          label="Gross Quotation Revenue"
          value={cur(totalRevenue, settings.currency)}
          sub="Cumulative quote value"
          subColor="text-emerald-600"
          icon={TrendingUp}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
        />
        <KPICard
          label="Sheet Synced Quotes"
          value={String(syncedCount)}
          sub={`${syncedCount} / ${invoices.length} uploaded`}
          icon={Layers}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
        />
        <KPICard
          label="Customer Base"
          value={String(customers.length)}
          sub="Saved customer profiles"
          icon={Users}
          iconBg="bg-purple-50"
          iconColor="text-purple-600"
        />
      </div>

      {/* Revenue & Thickness Charts Grid */}
      <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
        {/* Monthly Revenue Area Chart */}
        <div className="bg-white rounded-xl border border-border shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-blue-500" /> Monthly Quote Value Trend
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Value of quotations generated per month ({settings.currency})
              </p>
            </div>
            <div className="text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-1.5 font-medium">
              {reportYear}
            </div>
          </div>
          <div className="px-4 py-4 h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyTrendData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <RechartsTooltip
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid #e2e8f0",
                    fontSize: "12px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#3b82f6"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorRevenue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Thickness Distribution Pie Chart */}
        <div className="bg-white rounded-xl border border-border shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <PieChartIcon className="h-4 w-4 text-purple-500" /> Glass Thickness Split
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Distribution across glass thickness specs
            </p>
          </div>
          <div className="px-4 py-4 h-[280px] flex items-center justify-center">
            {thicknessData.length === 0 ? (
              <div className="text-xs text-muted-foreground">No quote items yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={thicknessData}
                    cx="50%"
                    cy="45%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {thicknessData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid #e2e8f0",
                      fontSize: "12px",
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    iconSize={8}
                    formatter={(value: string) => (
                      <span className="text-[11px] text-gray-600 ml-1">{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Sync Status Distribution Bar Chart */}
      <div className="bg-white rounded-xl border border-border shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Layers className="h-4 w-4 text-emerald-500" /> Sheet Sync Status Split
          </h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Comparison between quotes synced to Google Sheet vs local browser storage
          </p>
        </div>
        <div className="px-4 py-4 h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={syncStatusData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
              />
              <RechartsTooltip
                contentStyle={{
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                  fontSize: "12px",
                }}
              />
              <Bar dataKey="count" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

/* ── KPI Card ─── */
function KPICard({
  label,
  value,
  sub,
  subColor,
  icon: Icon,
  iconBg,
  iconColor,
}: {
  label: string;
  value: string;
  sub?: string;
  subColor?: string;
  icon?: any;
  iconBg?: string;
  iconColor?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-border px-5 py-4 shadow-xs">
      <div className="flex items-start justify-between mb-2">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold leading-tight pr-2">
          {label}
        </p>
        {Icon && (
          <div
            className={`h-9 w-9 rounded-lg ${iconBg || "bg-blue-50"} flex items-center justify-center shrink-0`}
          >
            <Icon className={`h-[18px] w-[18px] ${iconColor || "text-blue-600"}`} />
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-foreground tracking-tight">{value}</p>
      {sub && (
        <p
          className={`text-[11px] mt-1 ${subColor || "text-muted-foreground"} flex items-center gap-1`}
        >
          {subColor && <ArrowUpRight className="h-3 w-3" />}
          {sub}
        </p>
      )}
    </div>
  );
}
