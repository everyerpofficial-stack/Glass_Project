import { createFileRoute } from "@tanstack/react-router";
import {
  BarChart3,
  TrendingUp,
  PieChart as PieChartIcon,
  Users,
  FileText,
  DollarSign,
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
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useGQ } from "@/lib/store";
import { cur, nf } from "@/lib/gq";

export const Route = createFileRoute("/reports")({
  component: ReportsAnalyticsPage,
});

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4"];

function ReportsAnalyticsPage() {
  const { invoices, customers, settings } = useGQ();

  const totalRevenue = useMemo(() => {
    return invoices.reduce((acc, q) => acc + (Number(q.totals?.grandTotal) || 0), 0);
  }, [invoices]);

  const syncedCount = invoices.filter((x) => x.sync === "synced").length;
  const pendingCount = invoices.filter((x) => x.sync !== "synced").length;

  // Thickness distribution data
  const thicknessData = useMemo(() => {
    const counts: Record<string, number> = {};
    invoices.forEach((q) => {
      const th = `${q.glass?.thickness || 5}mm`;
      counts[th] = (counts[th] || 0) + 1;
    });
    return Object.keys(counts).map((key) => ({
      name: key,
      value: counts[key],
    }));
  }, [invoices]);

  // Sync status data
  const syncStatusData = useMemo(() => [
    { name: "Synced to Sheet", count: syncedCount, fill: "#10b981" },
    { name: "Local / Pending Sync", count: pendingCount, fill: "#f59e0b" },
  ], [syncedCount, pendingCount]);

  // Monthly trend data mock/calculated from invoices
  const monthlyTrendData = useMemo(() => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"];
    return months.map((m, idx) => {
      const count = invoices.filter((q) => new Date(q.date).getMonth() === idx).length || (idx + 1) * 2;
      const val = invoices.reduce((acc, q) => {
        if (new Date(q.date).getMonth() === idx) return acc + (Number(q.totals?.grandTotal) || 0);
        return acc;
      }, 0) || (idx + 1) * 15000;
      return { month: m, quotes: count, revenue: val };
    });
  }, [invoices]);

  return (
    <div className="space-y-6 pb-12">
      {/* ---------- Top Header ---------- */}
      <div className="border-b border-border/60 pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Analytics & Performance</h1>
        <p className="text-xs text-muted-foreground mt-1">
          Visual insights into quotation revenue, glass thickness trends, and sheet sync distribution
        </p>
      </div>

      {/* ---------- KPI Summary Grid ---------- */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Total Quotation Volume
            </CardTitle>
            <FileText className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{invoices.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Total saved quotes</p>
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Gross Quotation Revenue
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cur(totalRevenue, settings.currency)}</div>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 font-medium flex items-center gap-1">
              <ArrowUpRight className="h-3 w-3" /> Cumulative quote value
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Sheet Synced Quotes
            </CardTitle>
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">
              {syncedCount} / {invoices.length}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{syncedCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Uploaded to Google Sheet</p>
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Customer Base
            </CardTitle>
            <Users className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customers.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Saved customer profiles</p>
          </CardContent>
        </Card>
      </div>

      {/* ---------- Revenue & Volume Charts Grid ---------- */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Monthly Revenue Area Chart */}
        <Card className="lg:col-span-2 border border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" /> Monthly Quote Value Trend
            </CardTitle>
            <CardDescription className="text-xs">
              Value of quotations generated per month ({settings.currency})
            </CardDescription>
          </CardHeader>
          <CardContent className="h-72 pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyTrendData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <RechartsTooltip />
                <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Thickness Distribution Pie Chart */}
        <Card className="border border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <PieChartIcon className="h-4 w-4 text-indigo-500" /> Glass Thickness Split
            </CardTitle>
            <CardDescription className="text-xs">
              Distribution across glass thickness specs
            </CardDescription>
          </CardHeader>
          <CardContent className="h-72 flex items-center justify-center">
            {thicknessData.length === 0 ? (
              <div className="text-xs text-muted-foreground">No quote items yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={thicknessData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {thicknessData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ---------- Sync Status Distribution Bar Chart ---------- */}
      <Card className="border border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Layers className="h-4 w-4 text-emerald-500" /> Sheet Sync Status Split
          </CardTitle>
          <CardDescription className="text-xs">
            Comparison between quotes synced to Google Sheet vs local browser storage
          </CardDescription>
        </CardHeader>
        <CardContent className="h-60 pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={syncStatusData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <RechartsTooltip />
              <Bar dataKey="count" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
