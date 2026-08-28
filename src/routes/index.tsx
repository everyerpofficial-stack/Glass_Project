import { createFileRoute, Link } from "@tanstack/react-router";
import {
  FileText,
  Plus,
  Users,
  CheckCircle2,
  ArrowUpRight,
  ArrowRight,
  Settings,
  TrendingUp,
  ClipboardList,
  ShoppingCart,
  Factory,
  Tag,
  Calendar,
} from "lucide-react";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { useGQ } from "@/lib/store";
import { cur, nf } from "@/lib/gq";

export const Route = createFileRoute("/")(
  {
  component: Dashboard,
});

/* ── Greeting helper ─── */
function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function Dashboard() {
  const { invoices, customers, workOrders, settings } = useGQ();

  const totalBookings = invoices.length;
  const totalCustomers = customers.length;
  const draftCount = invoices.filter((x) => (x.status || "draft") === "draft").length;
  const piSentCount = invoices.filter((x) => x.status === "pi_sent").length;
  const confirmedCount = invoices.filter((x) => x.status === "order_confirmed").length;
  const woGeneratedCount = invoices.filter((x) => x.status === "work_order_generated").length;
  const totalRevenue = invoices.reduce(
    (acc, inv) => acc + (Number(inv.totals?.grandTotal) || 0),
    0
  );
  const recentBookings = invoices.slice(0, 5);
  const userName = settings.salesPerson || "Admin";

  return (
    <div className="max-w-[1200px] mx-auto space-y-6 px-4 sm:px-6 lg:px-8 pt-6 pb-12">

      {/* ── Greeting Banner ───────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            {getGreeting()}, {userName}! 👋
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Here's what's happening with your business today.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-white rounded-lg border border-border px-3 py-2 shadow-xs">
          <Calendar className="h-4 w-4" />
          <span className="font-medium">
            {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
          </span>
        </div>
      </div>

      {/* ── KPI Metric Cards ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Draft Pre Proformas"
          value={String(draftCount)}
          sub={draftCount === 0 ? "All clear" : "Pending invoice"}
          icon={ClipboardList}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
        />
        <MetricCard
          label="Pre Proformas Sent"
          value={String(piSentCount)}
          sub={piSentCount === 0 ? "None pending" : "Awaiting confirmation"}
          icon={FileText}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
        />
        <MetricCard
          label="Proforma Invoices Confirmed"
          value={String(confirmedCount + woGeneratedCount)}
          sub={`${workOrders.length} work orders`}
          icon={CheckCircle2}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
        />
        <MetricCard
          label="Total Revenue"
          value={totalRevenue > 0 ? cur(totalRevenue, settings.currency) : "₹ 0.00"}
          sub={`${totalBookings} records`}
          icon={TrendingUp}
          iconBg="bg-purple-50"
          iconColor="text-purple-600"
          mono
        />
      </div>

      {/* ── Workflow Pipeline ─────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-border p-5 shadow-xs">
        <h2 className="text-sm font-semibold text-foreground mb-4">Workflow Pipeline</h2>
        <div className="flex items-center justify-between flex-wrap gap-3">
          {[
            { step: "1", label: "Pre Proforma", count: draftCount, sublabel: `${draftCount} Pending`, color: "bg-blue-500", to: "/booking" as const, search: undefined },
            { step: "2", label: "Proforma Invoice", count: piSentCount, sublabel: `${piSentCount} Awaiting`, color: "bg-amber-500", to: "/order" as const, search: { view: undefined } },
            { step: "3", label: "Work Order", count: confirmedCount, sublabel: `${confirmedCount} In Progress`, color: "bg-emerald-500", to: "/work-order" as const, search: undefined },
            { step: "4", label: "Stickers", count: woGeneratedCount, sublabel: `${woGeneratedCount} Pending`, color: "bg-purple-500", to: "/stickers" as const, search: undefined },
          ].map((item: any, i, arr) => (
            <div key={i} className="flex items-center gap-3 flex-1 min-w-[180px]">
              <Link
                to={item.to}
                search={item.search}
                className="group flex items-center gap-3 rounded-xl border border-border bg-background/60 px-4 py-3 hover:bg-muted/40 transition-all flex-1"
              >
                <div className={`h-9 w-9 rounded-full ${item.color} flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-sm`}>
                  {item.step}
                </div>
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold text-foreground truncate">{item.label}</div>
                  <div className="text-[11px] text-muted-foreground">{item.sublabel}</div>
                </div>
              </Link>
              {i < arr.length - 1 && (
                <ArrowRight className="h-4 w-4 text-muted-foreground/30 shrink-0 hidden lg:block" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Main Content Grid ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5">

        {/* LEFT: Recent Pre Proformas Table */}
        <div className="bg-white rounded-xl border border-border overflow-hidden shadow-xs">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">Recent Pre Proformas</h2>
            <Link
              to="/booking"
              className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors bg-muted/50 rounded-md px-3 py-1.5 hover:bg-muted"
            >
              View All
            </Link>
          </div>

          {recentBookings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-6">
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mb-3">
                <FileText className="h-5 w-5 text-blue-400" />
              </div>
              <p className="text-sm font-semibold text-foreground">No Pre Proformas yet</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs leading-relaxed">
                Create your first Pre Proforma to start tracking glass calculations and customer orders.
              </p>
              <Button asChild size="sm" className="mt-4 h-8 text-xs px-4 bg-blue-600 hover:bg-blue-700">
                <Link to="/booking">
                  <Plus className="h-3.5 w-3.5 mr-1" /> New Pre Proforma
                </Link>
              </Button>
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/60">
                  <th className="text-left py-3 px-5 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Booking #</th>
                  <th className="text-left py-3 px-4 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Customer</th>
                  <th className="text-left py-3 px-4 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold hidden sm:table-cell">Date</th>
                  <th className="text-right py-3 px-4 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Amount</th>
                  <th className="py-3 px-4 w-20 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentBookings.map((q) => (
                  <tr
                    key={q.id}
                    className="border-b border-border/30 last:border-0 hover:bg-muted/20 transition-colors"
                  >
                    <td className="py-3.5 px-5 font-mono text-[12px] font-semibold text-foreground">{q.no || "—"}</td>
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-[12px] text-foreground truncate max-w-[180px]">
                        {(q.cust?.name || "Unnamed").toUpperCase()}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate max-w-[180px] mt-0.5">
                        {q.glass?.desc || "—"}
                      </p>
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground tabular-nums hidden sm:table-cell text-[12px]">{q.date || "—"}</td>
                    <td className="py-3.5 px-4 text-right font-mono font-semibold text-foreground tabular-nums text-[12px]">
                      {cur(q.totals?.grandTotal || 0, settings.currency)}
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={q.status || "draft"} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* RIGHT: Sidebar Cards */}
        <div className="space-y-4">
          {/* Engine Config */}
          <div className="bg-white rounded-xl border border-border overflow-hidden shadow-xs">
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground">Engine Configuration</h3>
              <Button asChild variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground">
                <Link to="/settings" aria-label="Settings">
                  <Settings className="h-4 w-4" />
                </Link>
              </Button>
            </div>
            <div className="px-4 py-3 space-y-0">
              <ConfigRow label="Preset" value={settings.preset || "anand"} />
              <ConfigRow label="Rate Unit" value={settings.rateUnit === "sqft" ? "Sq.Ft" : "Sq.Mtr"} />
              <ConfigRow label="CGST" value={settings.cgstPercent != null ? `${settings.cgstPercent}%` : "—"} />
              <ConfigRow label="SGST" value={settings.sgstPercent != null ? `${settings.sgstPercent}%` : "—"} />
              <ConfigRow label="Currency" value={settings.currency || "₹"} />
              <ConfigRow
                label="Sheet URL"
                value={settings.sheetUrl ? "Configured" : "Not set"}
                accent={settings.sheetUrl ? "green" : "red"}
                last
              />
            </div>
          </div>

          {/* Customers */}
          <div className="bg-white rounded-xl border border-border overflow-hidden shadow-xs">
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground">Customers</h3>
              <Link to="/customers" className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
                View All
              </Link>
            </div>
            <div className="px-4 py-3">
              {customers.length === 0 ? (
                <p className="text-xs text-muted-foreground py-3 text-center">No customers saved yet.</p>
              ) : (
                <div className="space-y-3">
                  {customers.slice(0, 4).map((c) => (
                    <div key={c.id || c.name} className="flex items-center gap-3">
                      <div className="grid h-9 w-9 place-items-center rounded-full bg-blue-50 text-[11px] font-bold text-blue-600 shrink-0">
                        {String(c.name || "?")
                          .split(/\s+/)
                          .slice(0, 2)
                          .map((w: string) => w[0]?.toUpperCase())
                          .join("")}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[12px] font-semibold text-foreground truncate">{(c.name || "Unnamed").toUpperCase()}</p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {c.email || c.phone || "No contact"}
                        </p>
                      </div>
                      <div className="shrink-0 flex flex-col items-end gap-0.5">
                        {c.gstin && (
                          <span className="text-[9px] text-muted-foreground font-mono uppercase tracking-wide">GST</span>
                        )}
                        <span className="inline-flex items-center gap-1 text-[9px] font-medium text-emerald-600">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          Active
                        </span>
                      </div>
                    </div>
                  ))}
                  {customers.length > 4 && (
                    <p className="text-[10px] text-muted-foreground pt-2 border-t border-border/50 text-center">
                      +{customers.length - 4} more customers
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Quick actions */}
          <div className="grid grid-cols-2 gap-2">
            <Link
              to="/booking"
              className="flex items-center gap-2.5 rounded-xl border border-border bg-white px-3.5 py-3 text-xs font-medium text-foreground hover:bg-muted/30 transition-colors shadow-xs"
            >
              <ClipboardList className="h-4 w-4 text-blue-500" /> Booking
            </Link>
            <Link
              to="/order"
              search={{ view: undefined }}
              className="flex items-center gap-2.5 rounded-xl border border-border bg-white px-3.5 py-3 text-xs font-medium text-foreground hover:bg-muted/30 transition-colors shadow-xs"
            >
              <ShoppingCart className="h-4 w-4 text-amber-500" /> Orders
            </Link>
            <Link
              to="/work-order"
              className="flex items-center gap-2.5 rounded-xl border border-border bg-white px-3.5 py-3 text-xs font-medium text-foreground hover:bg-muted/30 transition-colors shadow-xs"
            >
              <Factory className="h-4 w-4 text-emerald-500" /> Work Order
            </Link>
            <Link
              to="/customers"
              className="flex items-center gap-2.5 rounded-xl border border-border bg-white px-3.5 py-3 text-xs font-medium text-foreground hover:bg-muted/30 transition-colors shadow-xs"
            >
              <Users className="h-4 w-4 text-purple-500" /> Customers
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Status Badge ─────────────────────────────────────────────────── */
function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: "bg-stone-100 text-stone-600 ring-stone-300/40",
    pi_sent: "bg-blue-50 text-blue-700 ring-blue-500/20",
    order_confirmed: "bg-emerald-50 text-emerald-700 ring-emerald-500/20",
    work_order_generated: "bg-amber-50 text-amber-700 ring-amber-500/20",
  };
  const labels: Record<string, string> = {
    draft: "Draft",
    pi_sent: "PI Sent",
    order_confirmed: "Confirmed",
    work_order_generated: "WO Done",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${styles[status] || styles["draft"]}`}>
      {labels[status] || "Draft"}
    </span>
  );
}

function MetricCard({
  label,
  value,
  sub,
  mono = false,
  icon: Icon,
  iconBg,
  iconColor,
}: {
  label: string;
  value: string;
  sub?: string;
  mono?: boolean;
  icon?: any;
  iconBg?: string;
  iconColor?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-border px-5 py-4 shadow-xs">
      <div className="flex items-start justify-between mb-2">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold leading-tight pr-2">{label}</p>
        {Icon && (
          <div className={`h-9 w-9 rounded-lg ${iconBg || "bg-blue-50"} flex items-center justify-center shrink-0`}>
            <Icon className={`h-[18px] w-[18px] ${iconColor || "text-blue-600"}`} />
          </div>
        )}
      </div>
      <p className={`text-2xl font-bold text-foreground tracking-tight ${mono ? "font-mono tabular-nums" : ""}`}>
        {value}
      </p>
      {sub && (
        <p className="text-[11px] mt-1 text-muted-foreground">
          {sub}
        </p>
      )}
    </div>
  );
}

function ConfigRow({
  label,
  value,
  accent,
  last = false,
}: {
  label: string;
  value: string;
  accent?: "green" | "amber" | "red";
  last?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between py-2.5 ${!last ? "border-b border-border/40" : ""}`}>
      <span className="text-[12px] text-muted-foreground">{label}</span>
      <span className={`text-[12px] font-semibold tabular-nums ${
        accent === "green" ? "text-emerald-600" :
        accent === "amber" ? "text-amber-600" :
        accent === "red" ? "text-red-500" :
        "text-foreground"
      }`}>
        {value}
      </span>
    </div>
  );
}
