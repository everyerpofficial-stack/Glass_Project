import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  FileText,
  Plus,
  Search,
  Receipt,
  Edit,
  Copy,
  Trash2,
  RefreshCw,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Filter,
  FileSpreadsheet,
  Download,
} from "lucide-react";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useGQ } from "@/lib/store";
import { cur, nf } from "@/lib/gq";
import { toast } from "sonner";

export const Route = createFileRoute("/quotes")({
  component: QuotesList,
});

function QuotesList() {
  const navigate = useNavigate();
  const { invoices, settings, deleteInvoice, loadInvoice, syncOne, syncAll } = useGQ();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");

  const filteredInvoices = useMemo(() => {
    return invoices.filter((q) => {
      const matchSearch =
        !search ||
        String(q.no || "").toLowerCase().includes(search.toLowerCase()) ||
        String(q.cust?.name || "").toLowerCase().includes(search.toLowerCase()) ||
        String(q.glass?.desc || "").toLowerCase().includes(search.toLowerCase());

      if (!matchSearch) return false;

      if (tab === "synced") return q.sync === "synced";
      if (tab === "pending") return q.sync !== "synced";
      return true;
    });
  }, [invoices, search, tab]);

  const totalValue = useMemo(() => {
    return filteredInvoices.reduce((acc, q) => acc + (Number(q.totals?.grandTotal) || 0), 0);
  }, [filteredInvoices]);

  const unsyncedCount = invoices.filter((q) => q.sync !== "synced").length;

  return (
    <div className="space-y-4 pb-12 max-w-[1100px] mx-auto">
      {/* ── Top bar ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs text-muted-foreground">
            Browse, search, edit, duplicate, and sync saved proforma invoices
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {settings.sheetUrl && unsyncedCount > 0 && (
            <Button variant="outline" size="sm" onClick={syncAll}>
              <FileSpreadsheet className="h-4 w-4 mr-1 text-emerald-500" />
              Sync All ({unsyncedCount})
            </Button>
          )}
          <Button asChild size="sm" className="shadow-sm">
            <Link to="/quote">
              <Plus className="h-4 w-4 mr-1" /> New Quotation
            </Link>
          </Button>
        </div>
      </div>

      {/* ---------- Filters & Search ---------- */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9 h-9 text-xs"
            placeholder="Search by quote # or customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Tabs value={tab} onValueChange={setTab} className="w-full sm:w-auto">
          <TabsList className="h-9 text-xs">
            <TabsTrigger value="all" className="px-3 text-xs">
              All ({invoices.length})
            </TabsTrigger>
            <TabsTrigger value="synced" className="px-3 text-xs">
              Synced ({invoices.filter((x) => x.sync === "synced").length})
            </TabsTrigger>
            <TabsTrigger value="pending" className="px-3 text-xs">
              Pending Sync ({invoices.filter((x) => x.sync !== "synced").length})
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* ---------- Quotations Data Table ---------- */}
      <Card className="border border-border/60 shadow-sm">
        <CardHeader className="py-3 px-4 flex flex-row items-center justify-between bg-muted/20 border-b border-border/40">
          <div className="text-xs text-muted-foreground">
            Showing <span className="font-semibold text-foreground">{filteredInvoices.length}</span> quotes
          </div>
          <div className="text-xs font-semibold text-foreground">
            Combined Total: <span className="text-primary font-mono">{cur(totalValue, settings.currency)}</span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredInvoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <div className="rounded-full bg-muted p-4 text-muted-foreground">
                <FileText className="h-8 w-8" />
              </div>
              <h3 className="mt-4 text-sm font-semibold">No quotations found</h3>
              <p className="mt-1 text-xs text-muted-foreground max-w-sm">
                {search ? "No quotes match your search criteria." : "Create your first quotation to get started."}
              </p>
              <Button asChild size="sm" className="mt-4">
                <Link to="/quote">
                  <Plus className="h-4 w-4 mr-1" /> Create Quotation
                </Link>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border/60 text-muted-foreground uppercase text-[10px] tracking-wider bg-muted/10">
                    <th className="py-3 px-4">Quote No</th>
                    <th className="py-3 px-4">Customer Name</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Glass Specs</th>
                    <th className="py-3 px-4 text-center">Items</th>
                    <th className="py-3 px-4 text-right">Grand Total</th>
                    <th className="py-3 px-4 text-center">Sheet Sync</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filteredInvoices.map((q) => (
                    <tr key={q.id} className="group hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4 font-semibold font-mono text-foreground">
                        {q.no}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-foreground">{q.cust?.name || "Unnamed Customer"}</div>
                        <div className="text-[11px] text-muted-foreground">{q.cust?.phone || q.cust?.email || ""}</div>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground font-mono">{q.date}</td>
                      <td className="py-3 px-4">
                        <div className="truncate max-w-[180px] font-medium">{q.glass?.desc || "Glass"}</div>
                        <div className="text-[11px] text-muted-foreground">{q.glass?.thickness}mm</div>
                      </td>
                      <td className="py-3 px-4 text-center font-mono">{q.items?.length || 0}</td>
                      <td className="py-3 px-4 text-right font-semibold font-mono">
                        {cur(q.totals?.grandTotal || 0, settings.currency)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {q.sync === "synced" ? (
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">
                            <CheckCircle2 className="h-3 w-3 mr-1" /> Synced
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px]">
                            <Clock className="h-3 w-3 mr-1" /> Local
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 px-2 text-xs">
                              Actions
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="text-xs w-44">
                            <DropdownMenuItem
                              onClick={() => {
                                navigate({ to: "/invoice", search: { id: q.id } });
                              }}
                            >
                              <Receipt className="h-3.5 w-3.5 mr-2 text-primary" /> View / Print Invoice
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                loadInvoice(q.id, false);
                                navigate({ to: "/quote" });
                              }}
                            >
                              <Edit className="h-3.5 w-3.5 mr-2 text-indigo-500" /> Edit Quotation
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                loadInvoice(q.id, true);
                                navigate({ to: "/quote" });
                              }}
                            >
                              <Copy className="h-3.5 w-3.5 mr-2 text-amber-500" /> Duplicate Quote
                            </DropdownMenuItem>
                            {settings.sheetUrl && (
                              <DropdownMenuItem onClick={() => syncOne(q)}>
                                <FileSpreadsheet className="h-3.5 w-3.5 mr-2 text-emerald-500" /> Sync to Sheet
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600 dark:text-red-400 focus:text-red-600"
                              onClick={() => deleteInvoice(q.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete Quote
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
