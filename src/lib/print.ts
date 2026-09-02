/* =====================================================================
   Printing.

   Printing used to open a second browser window and copy the target element's
   outerHTML into it. That window loads no stylesheet, so every Tailwind class
   on the copied markup meant nothing: the barcode sticker — `bg-[#FFD700]`,
   a grid, sized type — arrived as a few lines of unstyled text in the corner
   of the page, and the cut sheet lost its rules and column widths. It also put
   a stray `about:blank` window in front of the user on every print.

   This prints the live document instead. The markup being printed is the same
   markup already on screen, with the same stylesheet attached, so the paper
   matches the preview exactly and no second window is involved.
   ===================================================================== */

export type PrintOrientation = "portrait" | "landscape";

const PAGE_STYLE_ID = "gq-print-page-rule";

/* `@page` cannot be scoped by a selector or toggled with a class, so the rule
   for this particular document is injected just before printing and dropped
   once the dialog closes. */
function setPageRule(orientation: PrintOrientation, margin: string) {
  let el = document.getElementById(PAGE_STYLE_ID) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement("style");
    el.id = PAGE_STYLE_ID;
    document.head.appendChild(el);
  }
  el.textContent = `@page { size: A4 ${orientation}; margin: ${margin}; }`;
}

/* Print one region of the current page.

   Clones the target element into a dedicated `#printroot` attached directly to
   `document.body`. This guarantees that the printed document starts at `scrollTop = 0`
   at the top of Page 1 without any modal offsets, backdrop artifacts, or parent
   scroll offsets affecting paper layout. */
export function printElement(
  el: Element | null | undefined,
  opts: { orientation?: PrintOrientation; margin?: string } = {},
): boolean {
  if (typeof document === "undefined" || typeof window === "undefined") return false;
  if (!el) return false;

  const { orientation = "portrait", margin = "6mm 4mm" } = opts;

  let printRoot = document.getElementById("printroot");
  if (!printRoot) {
    printRoot = document.createElement("div");
    printRoot.id = "printroot";
    document.body.appendChild(printRoot);
  }

  // Clear previous root contents & append clone of target element
  printRoot.innerHTML = "";
  const clone = el.cloneNode(true) as HTMLElement;
  clone.setAttribute("data-print-area", "");
  printRoot.appendChild(clone);

  el.setAttribute("data-print-area", "");
  document.documentElement.setAttribute("data-printing", "");
  setPageRule(orientation, margin);

  let done = false;
  const cleanup = () => {
    if (done) return;
    done = true;
    if (printRoot) printRoot.innerHTML = "";
    el.removeAttribute("data-print-area");
    document.documentElement.removeAttribute("data-printing");
    document.getElementById(PAGE_STYLE_ID)?.remove();
    window.removeEventListener("afterprint", cleanup);
  };

  window.addEventListener("afterprint", cleanup);
  try {
    window.print();
  } finally {
    /* Chrome blocks on print() and fires afterprint, but not every engine does
       — without a fallback a missed event would leave the page stuck with the
       rest of the UI hidden. cleanup() is idempotent, so both may run. */
    window.setTimeout(cleanup, 1000);
  }
  return true;
}

