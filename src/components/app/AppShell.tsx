import { Link, useRouterState } from "@tanstack/react-router";
import {
  BarChart3,
  Bell,
  ChevronDown,
  ChevronLeft,
  ClipboardList,
  FileText,
  LayoutDashboard,
  Menu,
  Search,
  Settings,
  ShoppingCart,
  Users,
  Factory,
  Tag,
  Calendar,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useGQ } from "@/lib/store";
import { GlobalSearch } from "./GlobalSearch";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/booking", label: "Order Booking", icon: ClipboardList },
  { to: "/order", label: "Proforma Invoice", icon: ShoppingCart },
  { to: "/customers", label: "Customers", icon: Users },
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

const TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/booking": "Order Booking",
  "/order": "Proforma Invoice",
  "/work-order": "Work Order & Stickers",
  "/stickers": "Work Order & Stickers",
  "/customers": "Customers",
  "/invoice": "Invoice",
  "/reports": "Reports",
  "/settings": "Settings",
  "/checks": "System Checks",
};

/* ── Sidebar nav link ─── */
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
        "group relative flex items-center gap-3 rounded-lg transition-all duration-150 text-[13px]",
        collapsed ? "h-10 w-10 mx-auto justify-center px-0" : "px-3 py-2.5 font-medium",
        active
          ? "bg-blue-600 text-white font-semibold shadow-sm"
          : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground font-medium",
      )}
    >
      <item.icon
        className={cn(
          "h-[18px] w-[18px] shrink-0",
          active
            ? "text-white"
            : "text-sidebar-foreground/60 group-hover:text-sidebar-accent-foreground",
        )}
      />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  );
}

/* ── Format date ─── */
function formatDate() {
  const now = new Date();
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
  return `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [collapsed, setCollapsed] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { settings, loadFromSheet, sheetSyncing, sheetError, lastSyncedAt } = useGQ();
  const title = TITLES[pathname] ?? "Glass Quote";

  const syncTitle = !settings.sheetUrl
    ? "Configure Sheet URL in Settings"
    : sheetError
      ? `Showing the last data saved on this device. ${sheetError} — click to retry.`
      : lastSyncedAt
        ? `Live synced across all devices. Last update ${new Date(lastSyncedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}. Click to refresh.`
        : "Live synced across all devices. Click to refresh.";

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

  const company = settings.coName || "Your Company";
  const userName = settings.salesPerson || "Admin";
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

  const userInitials = useMemo(
    () =>
      String(userName)
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((w: string) => w[0]?.toUpperCase())
        .join("") || "A",
    [userName],
  );

  return (
    <TooltipProvider delayDuration={100}>
      <div className="app-shell flex min-h-screen bg-background text-foreground">
        {/* ══════════ DESKTOP SIDEBAR ══════════ */}
        <aside
          className={cn(
            "sticky top-0 hidden h-screen shrink-0 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border overflow-hidden transition-[width] duration-200 ease-in-out md:flex",
            collapsed ? "w-[68px]" : "w-[240px]",
          )}
        >
          {/* Logo & Company Header */}
          <div
            className={cn(
              "flex h-16 items-center border-b border-sidebar-border/60 px-4 overflow-hidden",
              collapsed ? "justify-center px-0" : "gap-3",
            )}
          >
            {collapsed ? (
              settings.logo ? (
                <img src={settings.logo} alt="Logo" className="h-8 w-8 object-contain rounded-md" />
              ) : (
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-blue-600 text-[12px] font-bold text-white shadow-xs">
                  {initials.slice(0, 2)}
                </div>
              )
            ) : settings.logo ? (
              <img
                src={settings.logo}
                alt="Company Logo"
                className="h-9 w-auto max-w-[170px] object-contain"
              />
            ) : (
              <>
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-blue-600 text-[12px] font-bold tracking-wider text-white shadow-xs">
                  {initials.slice(0, 2)}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-[14px] font-bold text-foreground tracking-tight leading-tight">
                    {company.split(" ").slice(0, 2).join(" ")}
                  </div>
                  <div className="truncate text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-medium">
                    {company.split(" ").slice(2).join(" ") || "GLASS PVT. LTD."}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Nav items */}
          <nav className="flex flex-1 flex-col gap-1.5 overflow-y-auto px-3 py-4">
            {NAV.map((item) =>
              collapsed ? (
                <Tooltip key={item.to} delayDuration={100}>
                  <TooltipTrigger asChild>
                    <div>
                      <NavLink item={item} pathname={pathname} collapsed />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="font-medium text-xs">
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              ) : (
                <NavLink key={item.to} item={item} pathname={pathname} />
              ),
            )}
          </nav>

          {/* Company footer + collapse toggle */}
          <div className="border-t border-sidebar-border/60 p-3 space-y-2">
            {collapsed ? (
              <Tooltip delayDuration={100}>
                <TooltipTrigger asChild>
                  <Link
                    to="/settings"
                    className="flex h-9 w-9 items-center justify-center mx-auto rounded-lg hover:bg-sidebar-accent transition-colors"
                  >
                    {settings.logo ? (
                      <img
                        src={settings.logo}
                        alt="Logo"
                        className="h-7 w-7 object-contain rounded-md"
                      />
                    ) : (
                      <div className="grid h-8 w-8 place-items-center rounded-lg bg-sidebar-accent text-[11px] font-bold text-sidebar-accent-foreground">
                        {initials}
                      </div>
                    )}
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right" className="font-medium text-xs">
                  {company}
                </TooltipContent>
              </Tooltip>
            ) : (
              <>
                <Link
                  to="/settings"
                  className="flex items-center gap-3 rounded-lg px-2.5 py-2 transition-colors hover:bg-sidebar-accent"
                >
                  {settings.logo ? (
                    <img
                      src={settings.logo}
                      alt="Logo"
                      className="h-7 w-7 shrink-0 object-contain rounded-md"
                    />
                  ) : (
                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-sidebar-accent text-[10px] font-bold tracking-wide text-sidebar-accent-foreground">
                      {initials}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[12px] font-semibold text-foreground">
                      {company}
                    </div>
                    <div className="truncate text-[10px] text-muted-foreground">
                      {settings.gstin || "Add GSTIN in settings"}
                    </div>
                  </div>
                </Link>
                <Link
                  to="/settings"
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground border border-sidebar-border/60 bg-background/50"
                >
                  <ChevronRight className="h-3 w-3" />
                  View Profile
                </Link>
              </>
            )}

            {/* Collapse Toggle Button */}
            <button
              onClick={() => setCollapsed((c) => !c)}
              className={cn(
                "flex items-center justify-center rounded-lg transition-colors hover:bg-sidebar-accent text-muted-foreground hover:text-foreground",
                collapsed
                  ? "h-9 w-9 mx-auto"
                  : "w-full gap-2 px-3 py-1.5 text-[11px] font-medium border border-sidebar-border/60",
              )}
              title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              <ChevronLeft
                className={cn(
                  "h-3.5 w-3.5 transition-transform duration-200",
                  collapsed && "rotate-180",
                )}
              />
              {!collapsed && <span>Collapse</span>}
            </button>
          </div>
        </aside>

        {/* ══════════ MAIN COLUMN ══════════ */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* ── Top header ── */}
          <header className="sticky top-0 z-30 flex h-14 items-center border-b border-border bg-white">
            <div className="flex flex-1 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
              {/* Left: Mobile hamburger + search */}
              <div className="flex items-center gap-3 min-w-0">
                {/* Mobile hamburger → Sheet */}
                <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                  <SheetTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 md:hidden shrink-0"
                      aria-label="Open navigation menu"
                    >
                      <Menu className="h-5 w-5" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent
                    side="left"
                    className="w-[272px] p-0 bg-sidebar border-sidebar-border"
                  >
                    {/* Sheet header */}
                    <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-4">
                      {settings.logo ? (
                        <img
                          src={settings.logo}
                          alt="Company Logo"
                          className="h-9 w-auto max-w-[180px] object-contain bg-white/10 p-1 rounded-lg"
                        />
                      ) : (
                        <>
                          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-blue-600 text-[12px] font-bold tracking-wider text-white">
                            {initials.slice(0, 2)}
                          </div>
                          <div className="min-w-0">
                            <div className="truncate text-[14px] font-bold text-white tracking-tight leading-tight">
                              {company.split(" ").slice(0, 2).join(" ")}
                            </div>
                            <div className="truncate text-[10px] uppercase tracking-[0.12em] text-sidebar-foreground/40 font-medium">
                              {company.split(" ").slice(2).join(" ") || "GLASS PVT. LTD."}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                    {/* Nav links */}
                    <nav className="flex flex-col gap-1 px-3 py-4">
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
                    <div className="absolute bottom-0 left-0 right-0 border-t border-sidebar-border/50 p-3 bg-sidebar">
                      <div className="flex items-center gap-2.5">
                        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-sidebar-accent text-[10px] font-bold tracking-wide text-sidebar-accent-foreground">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-[12px] font-semibold text-sidebar-foreground/90">
                            {company}
                          </div>
                          <div className="truncate text-[10px] text-sidebar-foreground/40">
                            {settings.gstin || "Add GSTIN in settings"}
                          </div>
                        </div>
                      </div>
                    </div>
                  </SheetContent>
                </Sheet>

                {/* Company selector (Desktop) */}
                <div className="hidden md:flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-border bg-background/60 hover:bg-muted/50 transition-colors cursor-default">
                  <div className="grid h-6 w-6 place-items-center rounded-md bg-blue-50 text-blue-600">
                    <FileText className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-sm font-medium text-foreground truncate max-w-[200px]">
                    {company}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </div>

                {/* Mobile: page title */}
                <span className="text-sm font-semibold text-foreground md:hidden truncate">
                  {title}
                </span>
              </div>

              {/* Right: search, notifications, date, user profile */}
              <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                {/* Desktop search box */}
                <button
                  onClick={() => setSearchOpen(true)}
                  className="hidden h-9 w-52 items-center gap-2 rounded-lg border border-border bg-background px-3 text-xs text-muted-foreground transition-colors hover:border-ring/40 hover:bg-muted/40 lg:flex"
                >
                  <Search className="h-3.5 w-3.5" />
                  <span className="flex-1 text-left">Search…</span>
                  <kbd className="rounded border border-border px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground/60">
                    ⌘K
                  </kbd>
                </button>
                {/* Mobile search icon */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 lg:hidden"
                  onClick={() => setSearchOpen(true)}
                  aria-label="Search"
                >
                  <Search className="h-4 w-4" />
                </Button>

                {/* Live Sync Status & Manual Refresh Button.
                    This is the only thing on screen that reacts to a background
                    sync — the data underneath it is never cleared or hidden
                    while a refresh is in flight, so a slow or failing Apps
                    Script degrades to a red badge instead of a blank page. */}
                <button
                  onClick={() => loadFromSheet()}
                  disabled={sheetSyncing || !settings.sheetUrl}
                  title={syncTitle}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors disabled:opacity-50",
                    sheetError
                      ? "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20 hover:bg-red-500/20"
                      : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20",
                  )}
                >
                  <span
                    className={cn(
                      "h-2 w-2 rounded-full",
                      sheetError ? "bg-red-500" : "bg-emerald-500",
                      sheetSyncing && "animate-ping",
                    )}
                  />
                  <span className="hidden md:inline">
                    {sheetSyncing ? "Syncing..." : sheetError ? "Offline" : "Live Sync"}
                  </span>
                  <RefreshCw className={cn("h-3 w-3", sheetSyncing && "animate-spin")} />
                </button>

                {/* Notification bell */}
                <button className="relative h-9 w-9 flex items-center justify-center rounded-lg hover:bg-muted/60 transition-colors">
                  <Bell className="h-[18px] w-[18px] text-muted-foreground" />
                  <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-red-500 text-[9px] font-bold text-white flex items-center justify-center ring-2 ring-white">
                    2
                  </span>
                </button>

                {/* Date display (Desktop) */}
                <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  <span className="font-medium">{formatDate()}</span>
                </div>

                {/* User avatar + name */}
                <div className="flex items-center gap-2 pl-2 border-l border-border">
                  <div className="grid h-8 w-8 place-items-center rounded-full bg-blue-600 text-[11px] font-bold text-white">
                    {userInitials}
                  </div>
                  <div className="hidden sm:block min-w-0">
                    <div className="text-[12px] font-semibold text-foreground leading-tight truncate">
                      {userName}
                    </div>
                    <div className="text-[10px] text-muted-foreground leading-tight">Admin</div>
                  </div>
                  <ChevronDown className="h-3 w-3 text-muted-foreground hidden sm:block" />
                </div>
              </div>
            </div>
          </header>

          {/* ── Page content ── */}
          <main className="min-w-0 flex-1 pb-24 md:pb-10">{children}</main>
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
                  active ? "text-blue-400" : "text-sidebar-foreground/55",
                )}
              >
                {active && (
                  <span className="absolute top-1 left-1/2 -translate-x-1/2 h-0.5 w-4 rounded-full bg-blue-500" />
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
          <Link
            to="/settings"
            className={cn(
              "relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[9.5px] font-medium transition-colors min-w-0",
              pathname === "/settings" ? "text-blue-400" : "text-sidebar-foreground/55",
            )}
          >
            {pathname === "/settings" && (
              <span className="absolute top-1 left-1/2 -translate-x-1/2 h-0.5 w-4 rounded-full bg-blue-500" />
            )}
            <Settings
              className={cn(
                "h-[18px] w-[18px] transition-transform duration-150",
                pathname === "/settings" && "scale-110",
              )}
            />
            <span className="truncate max-w-full px-0.5">Settings</span>
          </Link>
        </nav>

        <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
      </div>
    </TooltipProvider>
  );
}
