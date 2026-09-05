/* =====================================================================
   Mobile viewport for the work order cut sheet.

   The cut sheet is a seventeen-column landscape factory document. It has to
   stay that document everywhere — the shop floor reads the same sheet on a
   phone that it gets off the printer — so it is never re-flowed into a phone
   layout. Instead the sheet keeps its desktop width on a phone and this hook
   decides how that width is shown:

     • Fit width (default) — the whole sheet is scaled down until it fits the
       screen, so the layout can be taken in at a glance exactly as it looks on
       a desktop.
     • Actual size — the sheet is left at its full width and the frame pans
       sideways, so every column stays legible.

   Both are screen-only. The print ref points at the sheet itself, which sits
   *inside* the frame, so neither the scaling nor the fixed width is part of
   what printElement() clones onto paper.
   ===================================================================== */

import { useEffect, useRef, useState, type CSSProperties } from "react";

import { useIsMobile } from "@/hooks/use-mobile";

export function useSheetViewport(canvasWidth: number) {
  const frameRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const [fit, setFit] = useState(true);
  const [scale, setScale] = useState(1);

  /* The frame is a plain full-width block, so scaling what is inside it never
     changes its own width — measuring it cannot feed back into itself. */
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const measure = () => {
      const available = frame.clientWidth;
      setScale(available > 0 ? Math.min(1, available / canvasWidth) : 1);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(frame);
    return () => ro.disconnect();
  }, [canvasWidth]);

  const onPhone = Boolean(isMobile);

  return {
    frameRef,
    fit,
    toggleFit: () => setFit((f) => !f),
    /* `zoom` rather than a transform: it shrinks the layout box with the
       content, so the page below the sheet does not keep the full-size gap a
       scaled-down transform would leave behind. */
    zoomStyle: (onPhone && fit && scale < 1 ? { zoom: scale } : undefined) as
      CSSProperties | undefined,
    /* On a phone the sheet keeps its desktop width and the frame scrolls. */
    canvasStyle: (onPhone ? { width: canvasWidth } : undefined) as CSSProperties | undefined,
  };
}
