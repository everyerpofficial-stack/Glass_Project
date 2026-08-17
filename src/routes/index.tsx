import { createFileRoute, Link } from "@tanstack/react-router";
import {
  FileText,
  Plus,
  Users,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  Settings,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGQ } from "@/lib/store";
import { cur, nf } from "@/lib/gq";

export const Route = createFileRoute("/")({
  component: Dashboard,
});

function Dashboard() {
  const { invoices, customers, settings } = useGQ();

  const totalQuotes = invoices.length;
  const totalCustomers = customers.length;
  const syncedQuotes = invoices.filter((x) => x.sync === "synced").length;
  const totalRevenue = invoices.reduce(
    (acc, inv) => acc + (Number(inv.totals?.grandTotal) || 0),
    0
  );
  const recentQuotes = invoices.slice(0, 8);

  return (
    <div className="max-w-[1100px] mx-auto space-y-5 pb-12">

      {/* ── Metrics ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          label="Quotations"
          value={String(totalQuotes)}
          sub={totalQuotes === 0 ? "none yet" : `${syncedQuotes} synced`}
        />
        <MetricCard
          label="Customers"
          value={String(totalCustomers)}
          sub={totalCustomers === 0 ? "none yet" : "saved profiles"}
        />
        <MetricCard
          label="Quote Value"
          value={totalRevenue > 0 ? cur(totalRevenue, settings.currency) : "—"}
          sub="combined total"
          mono
        />
        <MetricCard
          label="Sheet Sync"
          value={`${syncedQuotes} / ${totalQuotes}`}
          sub={settings.sheetUrl ? "connected" : "not configured"}
          status={settings.sheetUrl ? "ok" : "warn"}
          mono
        />
      </div>

      {/* ── Main content ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_256px] gap-5">

        {/* Recent quotes */}
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="text-sm font-medium text-foreground">Recent Quotations</span>
            <Link
              to="/quotes"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              All quotes <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>

          {recentQuotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-6">
              <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center mb-3">
                <FileText className="h-4 w-4 text-muted-foreground/50" />
              </div>
              <p className="text-sm font-medium text-foreground">No quotations yet</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs leading-relaxed">
                Create your first quote to start tracking glass calculations and customer orders.
              </p>
              <Button asChild size="sm" className="mt-4 h-8 text-xs px-4">
                <Link to="/quote">
                  <Plus className="h-3.5 w-3.5 mr-1" /> Create Quote
                </Link>
              </Button>
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/60">
                  <th className="text-left py-2.5 px-4 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Quote #</th>
                  <th className="text-left py-2.5 px-4 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Customer</th>
                  <th className="text-left py-2.5 px-4 text-[10px] uppercase tracking-wider text-muted-foreground font-medium hidden sm:table-cell">Date</th>
                  <th className="text-right py-2.5 px-4 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Amount</th>
                  <th className="py-2.5 px-4 w-16" />
                </tr>
              </thead>
              <tbody>
                {recentQuotes.map((q, i) => (
                  <tr
                    key={q.id}
                    className={`border-b border-border/40 last:border-0 hover:bg-muted/30 transition-colors ${i % 2 === 0 ? "" : ""}`}
                  >
                    <td className="py-3 px-4 font-mono text-[11px] font-medium text-foreground">{q.no || "—"}</td>
                    <td className="py-3 px-4">
                      <p className="font-medium text-foreground truncate max-w-[140px]">
                        {q.cust?.name || "Unnamed"}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate max-w-[140px]">
                        {q.glass?.desc || "—"}
                      </p>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground tabular-nums hidden sm:table-cell">{q.date || "—"}</td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-foreground tabular-nums">
                      {cur(q.totals?.grandTotal || 0, settings.currency)}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset ${
                        q.sync === "synced"
                          ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20"
                          : "bg-stone-50 text-stone-500 ring-stone-400/20 dark:bg-stone-500/10 dark:text-stone-400"
                      }`}>
                        {q.sync === "synced" ? "Synced" : "Local"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Right sidebar */}
        <div className="space-y-3">
          {/* Engine Config */}
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <span className="text-sm font-medium text-foreground">Engine Config</span>
              <Button asChild variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground">
                <Link to="/settings" aria-label="Settings">
                  <Settings className="h-3.5 w-3.5" />
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
                accent={settings.sheetUrl ? "green" : "amber"}
                last
              />
            </div>
          </div>

          {/* Customers */}
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <span className="text-sm font-medium text-foreground">Customers</span>
              <Link to="/customers" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                View all
              </Link>
            </div>
            <div className="px-4 py-3">
              {customers.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">No customers saved yet.</p>
              ) : (
                <div className="space-y-2.5">
                  {customers.slice(0, 5).map((c) => (
                    <div key={c.id || c.name} className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{c.name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {c.phone || c.email || "No contact"}
                        </p>
                      </div>
                      {c.gstin && (
                        <span className="text-[9px] text-muted-foreground font-mono shrink-0 mt-0.5 uppercase tracking-wide">GST</span>
                      )}
                    </div>
                  ))}
                  {customers.length > 5 && (
                    <p className="text-[10px] text-muted-foreground pt-1 border-t border-border/50">
                      +{customers.length - 5} more customers
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Quick actions */}
          <div className="grid grid-cols-2 gap-2">
            <Link
              to="/quotes"
              className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2.5 text-xs font-medium text-foreground hover:bg-muted/40 transition-colors"
            >
              <FileText className="h-3.5 w-3.5 text-muted-foreground" /> Quotes
            </Link>
            <Link
              to="/customers"
              className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2.5 text-xs font-medium text-foreground hover:bg-muted/40 transition-colors"
            >
              <Users className="h-3.5 w-3.5 text-muted-foreground" /> Customers
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  sub,
  mono = false,
  status,
}: {
  label: string;
  value: string;
  sub?: string;
  mono?: boolean;
  status?: "ok" | "warn";
}) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3.5">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">{label}</p>
      <p className={`mt-1.5 text-xl font-bold text-foreground tracking-tight ${mono ? "font-mono tabular-nums" : ""}`}>
        {value}
      </p>
      {sub && (
        <p className="text-[11px] mt-0.5 flex items-center gap-1 text-muted-foreground">
          {status === "ok" && <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />}
          {status === "warn" && <AlertCircle className="h-3 w-3 text-amber-500 shrink-0" />}
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
  accent?: "green" | "amber";
  last?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between py-2 ${!last ? "border-b border-border/40" : ""}`}>
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-xs font-medium tabular-nums ${
        accent === "green" ? "text-emerald-600 dark:text-emerald-400" :
        accent === "amber" ? "text-amber-600 dark:text-amber-400" :
        "text-foreground"
      }`}>
        {value}
      </span>
    </div>
  );
}
