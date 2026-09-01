/* Placeholders shown while the provider is still reading localStorage.

   Before this existed, every list route rendered its "No records yet" empty
   state during SSR and the first client render, because `invoices` and friends
   start as []. On a refresh that meant the user stared at "No Order Bookings
   yet" — indistinguishable from real data loss — until hydration landed and,
   on a cold connection, until the Apps Script round trip finished behind it.

   A skeleton is honest about the difference: it says "not read yet", where an
   empty state says "there is nothing". It also renders identically on the
   server and on the first client render, so it introduces no hydration
   mismatch. */
import { Skeleton } from "@/components/ui/skeleton";

export function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="divide-y divide-border/60" aria-busy="true" aria-label="Loading records">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 px-5 py-3.5">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton
              key={c}
              className={
                c === 0
                  ? "h-3.5 w-24 shrink-0"
                  : c === cols - 1
                    ? "h-3.5 w-14 ml-auto"
                    : "h-3.5 flex-1"
              }
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3 p-4" aria-busy="true" aria-label="Loading records">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-full shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-2.5 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ValueSkeleton({ className }: { className?: string }) {
  return <Skeleton className={className || "h-7 w-20"} />;
}
