import { Link, useRouterState } from "@tanstack/react-router";
import {
  BarChart3,
  ChevronLeft,
  ClipboardList,
  FileText,
  LayoutDashboard,
  Menu,
  Plus,
  Search,
  Settings,
  ShoppingCart,
  Users,
  Factory,
  Tag,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useGQ } from "@/lib/store";
import { GlobalSearch } from "./GlobalSearch";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/booking", label: "SGU Booking", icon: ClipboardList },
  { to: "/order", label: "Order Confirm", icon: ShoppingCart },
  { to: "/work-order", label: "Work Order", icon: Factory },
  { to: "/stickers", label: "Stickers", icon: Tag },
  { to: "/customers", label: "Customers", icon: Users },
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

const TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/booking": "SGU Booking",
  "/order": "Order Confirm",
  "/work-order": "Work Order",
  "/stickers": "Sticker Labels",
  "/customers": "Customers",
  "/invoice": "Invoice",
  "/reports": "Reports",
  "/settings": "Settings",
  "/checks": "System Checks",
};

/* ── Sidebar nav link (reused in desktop sidebar & mobile sheet) ─── */
function NavLink({
  item,
  pathname,
  collapsed = false,
  onClick,
}: {
  item: (typeof NAV)[number];
  pathname: string;
  collapsed?: boolean;
  onClick?: () => void;
}) {
  const active = pathname === item.to;
  return (
    <Link
      to={item.to}
      onClick={onClick}
      className={cn(
        "group relative flex items-center gap-3 rounded-md px-3 py-2.5 text-[13px] font-medium transition-all duration-150",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
        collapsed && "justify-center px-0",
      )}
    >
      {/* Active indicator pill */}
      <span
        className={cn(
          "absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r-full bg-sidebar-primary transition-all duration-200",
          active ? "opacity-100 scale-y-100" : "opacity-0 scale-y-0",
        )}
      />
      <item.icon
        className={cn(
          "h-[16px] w-[16px] shrink-0 transition-opacity",
          active ? "opacity-100" : "opacity-60 group-hover:opacity-90",
        )}
      />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [collapsed, setCollapsed] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
      {/* ══════════ DESKTOP SIDEBAR ══════════ */}
      <aside
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-300 ease-out md:flex",
          collapsed ? "w-[74px]" : "w-[248px]",
        )}
      >
        {/* Logo */}
        <div className="flex h-14 items-center gap-2.5 border-b border-sidebar-border px-4 overflow-hidden">
          {settings.logo ? (
            <img src={settings.logo} alt="Company Logo" className="h-8 w-auto max-w-[160px] object-contain bg-white/90 p-0.5 rounded" />
          ) : (
            <>
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
            </>
          )}
        </div>

        {/* Nav items */}
        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-2 py-3">
          {NAV.map((item) =>
            collapsed ? (
              <Tooltip key={item.to}>
                <TooltipTrigger asChild>
                  <NavLink item={item} pathname={pathname} collapsed />
                </TooltipTrigger>
                <TooltipContent side="right">{item.label}</TooltipContent>
              </Tooltip>
            ) : (
              <NavLink key={item.to} item={item} pathname={pathname} />
            ),
          )}
        </nav>

        {/* Company + collapse toggle */}
        <div className="border-t border-sidebar-border p-2">
          <Link
            to="/settings"
            className={cn(
              "flex items-center gap-2.5 rounded-md px-2 py-2 transition-colors hover:bg-sidebar-accent/50",
              collapsed && "justify-center",
            )}
          >
            {settings.logo ? (
              <img src={settings.logo} alt="Logo" className="h-7 w-7 shrink-0 object-contain rounded bg-white p-0.5" />
            ) : (
              <div className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-sidebar-accent text-[10px] font-bold tracking-wide text-sidebar-accent-foreground">
                {initials}
              </div>
            )}
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

      {/* ══════════ MAIN COLUMN ══════════ */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* ── Top header ── */}
        <header className="sticky top-0 z-30 flex h-12 items-center border-b border-border bg-background/95 backdrop-blur-sm">
          <div className="flex flex-1 items-center justify-between gap-2 px-3 sm:px-5 lg:px-7">

            {/* Left side — mobile: hamburger menu + page title | desktop: breadcrumb */}
            <div className="flex items-center gap-2 min-w-0">
              {/* Mobile hamburger → Sheet */}
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 md:hidden shrink-0"
                    aria-label="Open navigation menu"
                  >
                    <Menu className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[272px] p-0 bg-sidebar border-sidebar-border">
                  {/* Sheet header */}
                  <div className="flex h-14 items-center gap-3 border-b border-sidebar-border px-4">
                    {settings.logo ? (
                      <img src={settings.logo} alt="Company Logo" className="h-8 w-auto max-w-[160px] object-contain bg-white/90 p-0.5 rounded" />
                    ) : (
                      <>
                        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-sidebar-border bg-sidebar-accent text-[11px] font-bold tracking-widest text-sidebar-accent-foreground">
                          GQ
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-[13px] font-semibold text-sidebar-accent-foreground tracking-tight">
                            Glass Quote
                          </div>
                          <div className="truncate text-[10px] uppercase tracking-[0.12em] text-sidebar-foreground/40 font-medium">
                            Pro
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                  {/* Nav links */}
                  <nav className="flex flex-col gap-0.5 px-2 py-3">
                    {NAV.map((item) => (
                      <NavLink
                        key={item.to}
                        item={item}
                        pathname={pathname}
                        onClick={() => setMobileMenuOpen(false)}
                      />
                    ))}
                  </nav>
                  {/* Company row at bottom */}
                  <div className="absolute bottom-0 left-0 right-0 border-t border-sidebar-border p-3 bg-sidebar">
                    <div className="flex items-center gap-2.5">
                      <div className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-sidebar-accent text-[10px] font-bold tracking-wide text-sidebar-accent-foreground">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-[12px] font-medium text-sidebar-foreground/90">{company}</div>
                        <div className="truncate text-[10px] text-sidebar-foreground/40">
                          {settings.gstin || "Add GSTIN in settings"}
                        </div>
                      </div>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>

              {/* Mobile: compact page title */}
              <span className="text-sm font-semibold text-foreground md:hidden truncate">{title}</span>

              {/* Desktop: breadcrumb */}
              <Breadcrumb className="hidden md:block">
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
            </div>

            {/* Right: search + new quote */}
            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              {/* Desktop search box */}
              <button
                onClick={() => setSearchOpen(true)}
                className="hidden h-8 w-48 items-center gap-2 rounded-md border border-input bg-background px-3 text-xs text-muted-foreground transition-colors hover:border-ring/40 hover:bg-muted/40 lg:flex"
              >
                <Search className="h-3.5 w-3.5" />
                <span className="flex-1 text-left">Search…</span>
                <kbd className="rounded border border-border px-1 text-[10px] font-mono">⌘K</kbd>
              </button>
              {/* Mobile search icon */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 lg:hidden"
                onClick={() => setSearchOpen(true)}
                aria-label="Search"
              >
                <Search className="h-4 w-4" />
              </Button>
              {/* New Booking CTA */}
              <Button asChild size="sm" className="h-8 text-xs px-2.5 sm:px-3">
                <Link to="/booking">
                  <Plus className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline ml-1">New Booking</span>
                </Link>
              </Button>
            </div>
          </div>
        </header>

        {/* ── Page content ── */}
        <main className="min-w-0 flex-1 px-3 pb-24 pt-4 sm:px-5 md:pb-10 lg:px-7">
          {children}
        </main>
      </div>

      {/* ══════════ MOBILE BOTTOM NAV ══════════ */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-sidebar-border bg-sidebar px-1 pb-[env(safe-area-inset-bottom)] md:hidden">
        {NAV.slice(0, 5).map((item) => {
          const active = pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[9.5px] font-medium transition-colors min-w-0",
                active ? "text-sidebar-accent-foreground" : "text-sidebar-foreground/55",
              )}
            >
              {/* Active dot indicator */}
              {active && (
                <span className="absolute top-1 left-1/2 -translate-x-1/2 h-0.5 w-4 rounded-full bg-sidebar-primary" />
              )}
              <item.icon
                className={cn(
                  "h-[18px] w-[18px] transition-transform duration-150",
                  active && "scale-110",
                )}
              />
              <span className="truncate max-w-full px-0.5">{item.label}</span>
            </Link>
          );
        })}
        {/* Settings — 6th item shown as "More" */}
        <Link
          to="/settings"
          className={cn(
            "relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[9.5px] font-medium transition-colors min-w-0",
            pathname === "/settings" ? "text-sidebar-accent-foreground" : "text-sidebar-foreground/55",
          )}
        >
          {pathname === "/settings" && (
            <span className="absolute top-1 left-1/2 -translate-x-1/2 h-0.5 w-4 rounded-full bg-sidebar-primary" />
          )}
          <Settings className={cn("h-[18px] w-[18px] transition-transform duration-150", pathname === "/settings" && "scale-110")} />
          <span className="truncate max-w-full px-0.5">Settings</span>
        </Link>
      </nav>

      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}
