import { Link, useRouterState } from "@tanstack/react-router";
import {
  BarChart3,
  ChevronLeft,
  FileText,
  LayoutDashboard,
  PanelLeft,
  Plus,
  Search,
  Settings,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { cn } from "@/lib/utils";
import { useGQ } from "@/lib/store";
import { GlobalSearch } from "./GlobalSearch";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/quote", label: "New Quote", icon: Plus },
  { to: "/quotes", label: "Quotes", icon: FileText },
  { to: "/customers", label: "Customers", icon: Users },
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

const TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/quote": "New Quote",
  "/quotes": "Quotes",
  "/customers": "Customers",
  "/invoice": "Invoice",
  "/reports": "Reports",
  "/settings": "Settings",
};

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [collapsed, setCollapsed] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { settings } = useGQ();
  const title = TITLES[pathname] ?? "Glass Quote";

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const company = settings.coName || "Your company";
  const initials = useMemo(
    () =>
      String(company)
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((w: string) => w[0]?.toUpperCase())
        .join("") || "GQ",
    [company],
  );

  return (
    <div className="app-shell flex min-h-screen bg-background text-foreground">
      {/* ---------- sidebar (desktop) ---------- */}
      <aside
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-300 ease-out md:flex",
          collapsed ? "w-[74px]" : "w-[248px]",
        )}
      >
        <div className="flex h-14 items-center gap-3 border-b border-sidebar-border px-4">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-sidebar-border bg-sidebar-accent text-[11px] font-bold tracking-widest text-sidebar-accent-foreground">
            GQ
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="truncate text-[13px] font-semibold text-sidebar-accent-foreground tracking-tight">
                Glass Quote
              </div>
              <div className="truncate text-[10px] uppercase tracking-[0.12em] text-sidebar-foreground/40 font-medium">
                Pro
              </div>
            </div>
          )}
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-2 py-3">
          {NAV.map((item) => {
            const active = pathname === item.to;
            const link = (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "group relative flex items-center gap-3 rounded-md px-3 py-2 text-[13px] font-medium transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                  collapsed && "justify-center px-0",
                )}
              >
                <span
                  className={cn(
                    "absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-r-full bg-sidebar-primary transition-opacity",
                    active ? "opacity-100" : "opacity-0",
                  )}
                />
                <item.icon className={cn("h-[16px] w-[16px] shrink-0", active ? "opacity-100" : "opacity-60")} />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
            return collapsed ? (
              <Tooltip key={item.to}>
                <TooltipTrigger asChild>{link}</TooltipTrigger>
                <TooltipContent side="right">{item.label}</TooltipContent>
              </Tooltip>
            ) : (
              link
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border p-2">
          <Link
            to="/settings"
            className={cn(
              "flex items-center gap-2.5 rounded-md px-2 py-2 transition-colors hover:bg-sidebar-accent/50",
              collapsed && "justify-center",
            )}
          >
            <div className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-sidebar-accent text-[10px] font-bold tracking-wide text-sidebar-accent-foreground">
              {initials}
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <div className="truncate text-[12px] font-medium text-sidebar-foreground/90">
                  {company}
                </div>
                <div className="truncate text-[10px] text-sidebar-foreground/40">
                  {settings.gstin || "Add GSTIN in settings"}
                </div>
              </div>
            )}
          </Link>
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="mt-1 flex w-full items-center justify-center gap-2 rounded-md py-1.5 text-[11px] font-medium text-sidebar-foreground/35 transition-colors hover:bg-sidebar-accent/40 hover:text-sidebar-foreground/70"
          >
            <ChevronLeft className={cn("h-3.5 w-3.5 transition-transform", collapsed && "rotate-180")} />
            {!collapsed && "Collapse"}
          </button>
        </div>
      </aside>

      {/* ---------- main column ---------- */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-12 items-center border-b border-border bg-background/95 backdrop-blur-sm">
          <div className="flex flex-1 items-center justify-between gap-4 px-5 sm:px-7">
            {/* Left: breadcrumb only */}
            <Breadcrumb>
              <BreadcrumbList className="text-sm">
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">Home</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                {pathname !== "/" && (
                  <>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbPage className="font-medium text-foreground">{title}</BreadcrumbPage>
                    </BreadcrumbItem>
                  </>
                )}
              </BreadcrumbList>
            </Breadcrumb>

            {/* Right: search + action */}
            <div className="flex shrink-0 items-center gap-2">
              <button
                onClick={() => setSearchOpen(true)}
                className="hidden h-8 w-52 items-center gap-2 rounded-md border border-input bg-background px-3 text-xs text-muted-foreground transition-colors hover:border-ring/40 hover:bg-muted/40 lg:flex"
              >
                <Search className="h-3.5 w-3.5" />
                <span className="flex-1 text-left">Search…</span>
                <kbd className="rounded border border-border px-1 text-[10px] font-mono">⌘K</kbd>
              </button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 lg:hidden"
                onClick={() => setSearchOpen(true)}
                aria-label="Search"
              >
                <Search className="h-4 w-4" />
              </Button>
              <Button asChild size="sm" className="h-8 text-xs px-3">
                <Link to="/quote">
                  <Plus className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline ml-1">New Quote</span>
                </Link>
              </Button>
            </div>
          </div>
        </header>

        <main className="min-w-0 flex-1 px-5 pb-24 pt-5 sm:px-7 md:pb-10">{children}</main>
      </div>

      {/* ---------- mobile bottom nav ---------- */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-sidebar-border bg-sidebar px-1 pb-[env(safe-area-inset-bottom)] md:hidden">
        {NAV.slice(0, 5).map((item) => {
          const active = pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-2 text-[10px] font-medium transition-colors",
                active ? "text-sidebar-accent-foreground" : "text-sidebar-foreground/60",
              )}
            >
              <item.icon className="h-[18px] w-[18px]" />
              {item.label}
            </Link>
          );
        })}
        <Link
          to="/settings"
          className="flex flex-1 flex-col items-center gap-1 py-2 text-[10px] font-medium text-sidebar-foreground/60"
        >
          <PanelLeft className="h-[18px] w-[18px]" />
          More
        </Link>
      </nav>

      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}
