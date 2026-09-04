import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/*
 * Mobile record cards.
 *
 * Every list in this app is a wide table: ten columns on Order Confirm, eight
 * on Proforma Invoice, eight on Customers. On a 390px screen that is a strip of
 * sideways-scrolling text where nothing lines up with anything and the action
 * buttons are two swipes off the right edge.
 *
 * Below `md` those tables are replaced by these cards — the same fields, one
 * record per card, read top to bottom. The desktop tables are untouched; each
 * list renders `<MobileList>` for phones and keeps its `<table>` behind
 * `hidden md:block`.
 */

export type FieldTone = "default" | "positive" | "warning" | "danger" | "muted";

const TONE_CLASS: Record<FieldTone, string> = {
  default: "text-foreground",
  positive: "text-emerald-600 dark:text-emerald-400",
  warning: "text-amber-600 dark:text-amber-400",
  danger: "text-rose-600 dark:text-rose-400",
  muted: "text-muted-foreground",
};

export type RecordField = {
  label: string;
  value: ReactNode;
  tone?: FieldTone;
  mono?: boolean;
};

/** Vertical stack of record cards. Hidden from `md` up, where the table wins. */
export function MobileList({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("space-y-2.5 md:hidden", className)}>{children}</div>;
}

/** Wraps the desktop table so it only exists from `md` up. */
export function DesktopOnly({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("hidden md:block", className)}>{children}</div>;
}

export function MobileRecordCard({
  code,
  badge,
  subject,
  meta,
  fields,
  actions,
  onClick,
  accent,
  dimmed,
  footer,
}: {
  /** Document number or short identifier, shown top-left in mono. */
  code?: ReactNode;
  /** Status pill, shown next to the code. */
  badge?: ReactNode;
  /** The thing the record is about — usually the customer name. */
  subject?: ReactNode;
  /** Short secondary facts (date, phone, item count); joined with dots. */
  meta?: ReactNode[];
  /** The numeric columns, laid out as a label/value grid. */
  fields?: RecordField[];
  /** Buttons. Taps inside this row never reach the card's own onClick. */
  actions?: ReactNode;
  onClick?: () => void;
  /** Left edge colour, e.g. "bg-emerald-500", to carry row status. */
  accent?: string;
  /** Cancelled or otherwise inactive records read back at lower contrast. */
  dimmed?: boolean;
  footer?: ReactNode;
}) {
  const interactive = Boolean(onClick);
  const cols = fields?.length ? Math.min(fields.length, 3) : 0;

  return (
    <div
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      className={cn(
        "m-card relative overflow-hidden p-3",
        accent && "pl-4",
        dimmed && "opacity-70",
        interactive &&
          "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      )}
    >
      {accent && <span className={cn("absolute inset-y-0 left-0 w-1", accent)} />}

      {/* Identity row */}
      {(code || badge || subject) && (
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            {(code || badge) && (
              <div className="flex flex-wrap items-center gap-1.5">
                {code && (
                  <span className="font-mono text-[12px] font-bold text-primary">{code}</span>
                )}
                {badge}
              </div>
            )}
            {subject && (
              <div className="mt-0.5 truncate text-[14px] font-bold leading-snug text-foreground">
                {subject}
              </div>
            )}
            {meta && meta.filter(Boolean).length > 0 && (
              <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-muted-foreground">
                {meta.filter(Boolean).map((m, i) => (
                  <span key={i} className="flex items-center gap-1.5">
                    {i > 0 && (
                      <span aria-hidden className="text-muted-foreground/40">
                        •
                      </span>
                    )}
                    <span className="truncate">{m}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
          {interactive && (
            <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/60" />
          )}
        </div>
      )}

      {/* Numeric fields */}
      {cols > 0 && (
        <div
          className={cn(
            "mt-2.5 grid gap-x-3 gap-y-2 border-t border-border/60 pt-2.5",
            cols === 1 && "grid-cols-1",
            cols === 2 && "grid-cols-2",
            cols >= 3 && "grid-cols-3",
          )}
        >
          {fields!.map((f, i) => (
            <div key={i} className="m-field">
              <span className="m-field-label">{f.label}</span>
              <span
                className={cn(
                  "m-field-value",
                  f.mono !== false && "font-mono tabular-nums",
                  TONE_CLASS[f.tone ?? "default"],
                )}
              >
                {f.value}
              </span>
            </div>
          ))}
        </div>
      )}

      {footer && <div className="mt-2.5 text-[11px] text-muted-foreground">{footer}</div>}

      {/* Actions. The stopPropagation keeps a button tap from also opening the
          record — the same guard the desktop rows use on their action cells. */}
      {actions && (
        <div
          className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-border/60 pt-2.5"
          onClick={(e) => e.stopPropagation()}
        >
          {actions}
        </div>
      )}
    </div>
  );
}

/** Empty state shared by the mobile lists. */
export function MobileEmpty({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-border py-10 text-center text-xs text-muted-foreground">
      {children}
    </div>
  );
}

/**
 * Some tables genuinely have to stay tables on a phone — the work order cut
 * sheet is a grid of measurements that only means anything in columns. Those
 * get an explicit affordance instead of a silently clipped edge.
 */
export function SwipeHint({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "mb-1.5 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground md:hidden",
        className,
      )}
    >
      <span className="h-px flex-1 bg-border" />
      <span className="flex items-center gap-1">
        Swipe to see all columns
        <ChevronRight className="h-3 w-3" />
      </span>
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}

/**
 * Sticky action bar for the long create/edit forms.
 *
 * On a phone the Save button lives at the bottom of a summary panel that is
 * itself at the bottom of a form several screens tall, so committing a document
 * meant scrolling past every field to find it. This pins the running total and
 * the primary action to the bottom of the viewport, just above the tab bar.
 */
export function MobileActionBar({
  label,
  value,
  children,
}: {
  label: string;
  value: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      style={{ bottom: "calc(var(--app-bottom-nav-h) + var(--safe-bottom))" }}
      className="app-action-bar fixed inset-x-0 z-30 flex items-center gap-3 border-t border-border bg-card/95 px-3 py-2 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] backdrop-blur-sm md:hidden print:hidden"
    >
      <div className="min-w-0">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <div className="truncate font-mono text-[15px] font-bold text-foreground">{value}</div>
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-2">{children}</div>
    </div>
  );
}
