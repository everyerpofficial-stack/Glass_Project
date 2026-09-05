import { Link, useRouterState } from "@tanstack/react-router";
import {
  BarChart3,
  Bell,
  ChevronDown,
  ChevronLeft,
  ClipboardList,
  FileText,
  LayoutDashboard,
  MoreHorizontal,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Users,
  Factory,
  Calendar,
  ChevronRight,
  RefreshCw,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useGQ } from "@/lib/store";
import { GlobalSearch } from "./GlobalSearch";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/booking", label: "Proforma Invoice", icon: ClipboardList },
  { to: "/order", label: "Order Confirm", icon: ShoppingCart },
  { to: "/customers", label: "Customers", icon: Users },
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

/* The phone tab bar carries four destinations plus More. Six tabs at 9px — what
   this used to be — is below the size at which a label is readable or a target
   is hittable, so the long tail moved into the More sheet. */
const MOBILE_TABS = [
  { to: "/", label: "Home", icon: LayoutDashboard },
  { to: "/booking", label: "Proforma", icon: ClipboardList },
  { to: "/order", label: "Orders", icon: ShoppingCart },
  { to: "/customers", label: "Customers", icon: Users },
] as const;

const MORE_LINKS = [
  {
    to: "/work-order",
    label: "Work Order & Stickers",
    icon: Factory,
    hint: "Cut sheets, barcodes",
  },
  { to: "/reports", label: "Reports", icon: BarChart3, hint: "Revenue and volume trends" },
  { to: "/settings", label: "Settings", icon: Settings, hint: "Company, terms, numbering" },
  { to: "/checks", label: "System Checks", icon: ShieldCheck, hint: "Storage, sync, calculations" },
] as const;

const TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/booking": "Proforma Invoice",
  "/order": "Order Confirm",
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
  const locationSearch = useRouterState({ select: (s) => s.location.search }) as Record<
    string,
    unknown
  >;
  const [collapsed, setCollapsed] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
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

  /* A route change closes the More sheet; leaving it open over the new page is
     the single most common bottom-sheet bug on a phone. */
  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

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

  /* The primary action of the page the user is standing on, as a thumb-reach
     button. It is suppressed inside a form view, where the page already owns
     Save / Back and a second "new" would discard the draft in progress. */
  const quickAction = useMemo(() => {
    if (locationSearch?.["view"] === "form") return null;
    if (pathname === "/" || pathname === "/booking") {
      return {
        label: "New Proforma Invoice",
        to: "/booking" as const,
        search: { view: "form", action: "new" },
      };
    }
    if (pathname === "/customers") {
      return { label: "Add Customer", to: "/customers" as const, search: { action: "new" } };
    }
    return null;
  }, [pathname, locationSearch]);

  const syncLabel = sheetSyncing ? "Syncing…" : sheetError ? "Offline" : "Live Sync";

  return (
    <TooltipProvider delayDuration={100}>
      <div className="app-shell flex min-h-[100dvh] bg-background text-foreground">
        {/* ══════════ DESKTOP SIDEBAR ══════════ */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-30 hidden h-screen shrink-0 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border overflow-hidden transition-[width] duration-200 ease-in-out md:flex",
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
          <nav className="flex flex-1 flex-col gap-1.5 overflow-y-auto overscroll-contain hide-scrollbar px-3 py-4">
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
        <div
          className={cn(
            "flex min-w-0 flex-1 flex-col transition-[padding] duration-200 ease-in-out",
            collapsed ? "md:pl-[68px]" : "md:pl-[240px]",
          )}
        >
          {/* ── Top header ──
              On a phone this is the only chrome at the top of the screen: brand
              mark, page title, and the three controls worth a thumb. Navigation
              itself lives in the bottom tab bar, so there is no hamburger to
              reach for at the far corner of the device. */}
          <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur-sm pt-safe">
            <div className="flex h-14 items-center justify-between gap-2 px-3 sm:px-6 lg:px-8">
              {/* Left: identity + current page */}
              <div className="flex items-center gap-2.5 min-w-0">
                {/* Mobile brand mark */}
                <Link
                  to="/"
                  aria-label="Dashboard"
                  className="md:hidden shrink-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {settings.logo ? (
                    <img
                      src={settings.logo}
                      alt="Logo"
                      className="h-9 w-9 rounded-lg object-contain"
                    />
                  ) : (
                    <span className="grid h-9 w-9 place-items-center rounded-lg bg-blue-600 text-[11px] font-bold tracking-wider text-white">
                      {initials.slice(0, 2)}
                    </span>
                  )}
                </Link>

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
                <div className="min-w-0 md:hidden">
                  <div className="truncate text-[15px] font-bold leading-tight text-foreground">
                    {title}
                  </div>
                  <div className="truncate text-[10px] leading-tight text-muted-foreground">
                    {company}
                  </div>
                </div>
              </div>

              {/* Right: search, sync, notifications, date, profile */}
              <div className="flex shrink-0 items-center gap-1 sm:gap-3">
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
                <button
                  className="grid h-10 w-10 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/60 active:bg-muted lg:hidden"
                  onClick={() => setSearchOpen(true)}
                  aria-label="Search"
                >
                  <Search className="h-[18px] w-[18px]" />
                </button>

                {/* Live Sync Status & Manual Refresh Button.
                    This is the only thing on screen that reacts to a background
                    sync — the data underneath it is never cleared or hidden
                    while a refresh is in flight, so a slow or failing Apps
                    Script degrades to a red badge instead of a blank page.
                    On a phone it shrinks to the dot and the refresh glyph. */}
                <button
                  onClick={() => loadFromSheet()}
                  disabled={sheetSyncing || !settings.sheetUrl}
                  title={syncTitle}
                  aria-label={syncLabel}
                  className={cn(
                    "flex h-9 items-center gap-1.5 rounded-full border px-2 sm:px-2.5 text-xs font-semibold transition-colors disabled:opacity-50",
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
                  <span className="hidden md:inline">{syncLabel}</span>
                  <RefreshCw className={cn("h-3 w-3", sheetSyncing && "animate-spin")} />
                </button>

                {/* Notification bell — desktop only; on a phone it lives in the
                    More sheet rather than stealing a thumb-sized slot. */}
                <button className="relative hidden h-9 w-9 items-center justify-center rounded-lg hover:bg-muted/60 transition-colors md:flex">
                  <Bell className="h-[18px] w-[18px] text-muted-foreground" />
                  <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-red-500 text-[9px] font-bold text-white flex items-center justify-center ring-2 ring-white">
                    2
                  </span>
                </button>

                {/* Date display (Desktop) */}
                <div className="hidden lg:flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  <span className="font-medium">{formatDate()}</span>
                </div>

                {/* User avatar + name. Tapping it on a phone opens the same
                    account / navigation sheet as the More tab. */}
                <button
                  type="button"
                  onClick={() => setMoreOpen(true)}
                  className="flex items-center gap-2 rounded-lg pl-1 sm:pl-2 sm:border-l sm:border-border md:pointer-events-none"
                  aria-label="Account and more"
                >
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-blue-600 text-[11px] font-bold text-white">
                    {userInitials}
                  </span>
                  <span className="hidden text-left md:block min-w-0">
                    <span className="block text-[12px] font-semibold text-foreground leading-tight truncate">
                      {userName}
                    </span>
                    <span className="block text-[10px] text-muted-foreground leading-tight">
                      Admin
                    </span>
                  </span>
                  <ChevronDown className="hidden h-3 w-3 text-muted-foreground md:block" />
                </button>
              </div>
            </div>
          </header>

          {/* ── Page content ── */}
          <main className="min-w-0 flex-1 md:pb-10">{children}</main>
        </div>

        {/* ══════════ MOBILE QUICK ACTION ══════════
            The one thing the current page is for, parked in the thumb arc just
            above the tab bar. */}
        {quickAction && (
          <Link
            to={quickAction.to}
            search={quickAction.search as never}
            aria-label={quickAction.label}
            title={quickAction.label}
            style={{
              bottom: "calc(var(--app-bottom-nav-h) + var(--safe-bottom) + 0.875rem)",
              right: "calc(var(--safe-right) + 1rem)",
            }}
            className="app-fab fixed z-40 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/30 transition-transform active:scale-95 md:hidden print:hidden"
          >
            <Plus className="h-6 w-6" />
          </Link>
        )}

        {/* ══════════ MOBILE BOTTOM TAB BAR ══════════ */}
        <nav
          aria-label="Primary"
          className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-border bg-card/95 backdrop-blur-sm pb-safe md:hidden print:hidden"
        >
          {MOBILE_TABS.map((item) => {
            const active = pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                data-nav
                aria-current={active ? "page" : undefined}
                style={{ height: "var(--app-bottom-nav-h)" }}
                className={cn(
                  "relative flex min-w-0 flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-colors",
                  active ? "text-blue-600" : "text-muted-foreground",
                )}
              >
                {active && (
                  <span className="absolute top-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-blue-600" />
                )}
                <item.icon
                  className={cn("h-5 w-5 transition-transform", active && "scale-110")}
                  strokeWidth={active ? 2.4 : 1.9}
                />
                <span className="max-w-full truncate px-0.5">{item.label}</span>
              </Link>
            );
          })}

          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            style={{ height: "var(--app-bottom-nav-h)" }}
            aria-haspopup="dialog"
            aria-expanded={moreOpen}
            className={cn(
              "relative flex min-w-0 flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-colors",
              MORE_LINKS.some((l) => l.to === pathname) || moreOpen
                ? "text-blue-600"
                : "text-muted-foreground",
            )}
          >
            {MORE_LINKS.some((l) => l.to === pathname) && (
              <span className="absolute top-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-blue-600" />
            )}
            <MoreHorizontal className="h-5 w-5" strokeWidth={1.9} />
            <span>More</span>
          </button>
        </nav>

        {/* ══════════ MOBILE "MORE" SHEET ══════════ */}
        <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
          <SheetContent
            side="bottom"
            style={{ paddingBottom: "var(--safe-bottom)" }}
            className="max-h-[88dvh] overflow-y-auto rounded-t-2xl border-border p-0 [&>button.absolute]:hidden md:hidden"
          >
            <SheetTitle className="sr-only">Account and navigation</SheetTitle>

            {/* Grab handle */}
            <div className="sticky top-0 z-10 flex flex-col items-center bg-background pt-2.5 pb-1">
              <span className="h-1 w-10 rounded-full bg-border" />
            </div>

            <div className="space-y-4 px-4 pb-6">
              {/* Company / account card */}
              <Link
                to="/settings"
                className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-3"
              >
                {settings.logo ? (
                  <img
                    src={settings.logo}
                    alt="Logo"
                    className="h-11 w-11 shrink-0 rounded-lg object-contain"
                  />
                ) : (
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-blue-600 text-xs font-bold tracking-wide text-white">
                    {initials}
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-foreground">
                    {company}
                  </span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {settings.gstin || "Add GSTIN in settings"}
                  </span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Link>

              {/* Sync state, in words rather than as a coloured dot */}
              <button
                type="button"
                onClick={() => loadFromSheet()}
                disabled={sheetSyncing || !settings.sheetUrl}
                className="flex w-full items-center gap-3 rounded-xl border border-border p-3 text-left transition-colors active:bg-muted/50 disabled:opacity-60"
              >
                <span
                  className={cn(
                    "grid h-9 w-9 shrink-0 place-items-center rounded-lg",
                    sheetError
                      ? "bg-red-500/10 text-red-600"
                      : "bg-emerald-500/10 text-emerald-600",
                  )}
                >
                  <RefreshCw className={cn("h-4 w-4", sheetSyncing && "animate-spin")} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-semibold text-foreground">
                    {sheetSyncing
                      ? "Syncing…"
                      : sheetError
                        ? "Offline — tap to retry"
                        : "Refresh data"}
                  </span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {!settings.sheetUrl
                      ? "Add a Sheet URL in Settings"
                      : lastSyncedAt
                        ? `Last synced ${new Date(lastSyncedAt).toLocaleTimeString("en-IN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}`
                        : "Live synced across all devices"}
                  </span>
                </span>
              </button>

              {/* Secondary destinations */}
              <div className="overflow-hidden rounded-xl border border-border">
                {MORE_LINKS.map((item, i) => {
                  const active = pathname === item.to;
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      data-nav
                      className={cn(
                        "flex items-center gap-3 p-3 transition-colors active:bg-muted/60",
                        i > 0 && "border-t border-border",
                        active && "bg-blue-600/8",
                      )}
                    >
                      <span
                        className={cn(
                          "grid h-9 w-9 shrink-0 place-items-center rounded-lg",
                          active ? "bg-blue-600 text-white" : "bg-muted text-muted-foreground",
                        )}
                      >
                        <item.icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span
                          className={cn(
                            "block text-[13px] font-semibold",
                            active ? "text-blue-700" : "text-foreground",
                          )}
                        >
                          {item.label}
                        </span>
                        <span className="block truncate text-[11px] text-muted-foreground">
                          {item.hint}
                        </span>
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </Link>
                  );
                })}
              </div>

              <div className="flex items-center justify-between gap-3 px-1 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  {formatDate()}
                </span>
                <span className="truncate">
                  Signed in as <span className="font-semibold text-foreground">{userName}</span>
                </span>
              </div>

              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => setMoreOpen(false)}
                type="button"
              >
                <X className="h-4 w-4" />
                Close
              </Button>
            </div>
          </SheetContent>
        </Sheet>

        <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
      </div>
    </TooltipProvider>
  );
}
