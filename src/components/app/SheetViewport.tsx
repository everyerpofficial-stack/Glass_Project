/* Screen-only control for the cut sheet's mobile viewport (see
   use-sheet-viewport): fit the whole sheet on the screen, or show it at actual
   size and pan. On a desktop the sheet already fits, so the button is hidden. */

import { Maximize2, Minimize2 } from "lucide-react";

import { cn } from "@/lib/utils";

export function SheetFitToggle({
  fit,
  onToggle,
  className,
}: {
  fit: boolean;
  onToggle: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={fit ? "Show the cut sheet at actual size" : "Fit the cut sheet to the screen"}
      className={cn(
        "md:hidden inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-border bg-background px-2.5 text-[11px] font-bold text-foreground",
        className,
      )}
    >
      {fit ? <Maximize2 className="h-3.5 w-3.5" /> : <Minimize2 className="h-3.5 w-3.5" />}
      {fit ? "Actual size" : "Fit width"}
    </button>
  );
}

/* Says which of the two mobile views is on, so the fitted sheet reads as a
   deliberate overview rather than a rendering accident. */
export function SheetViewHint({ fit }: { fit: boolean }) {
  return (
    <p className="md:hidden mt-2 px-2 text-center text-[10px] text-muted-foreground print:hidden">
      {fit
        ? "Whole sheet fitted to the screen — tap Actual size to read the columns."
        : "Actual size — swipe the sheet sideways for the remaining columns."}
    </p>
  );
}
