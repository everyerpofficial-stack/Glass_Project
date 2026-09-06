import { useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useGQ } from "@/lib/store";
import { dmy, nf } from "@/lib/gq";

/* Destinations mirror the sidebar. The previous list pointed at /quote, /quotes
   and a bare /invoice: the first two are redirect-only stubs and the third
   renders whichever draft happened to be loaded, so three of six entries went
   somewhere other than where they claimed. */
const PAGES = [
  { label: "Dashboard", to: "/" },
  { label: "Proforma Invoice", to: "/booking" },
  { label: "Order Confirm", to: "/order" },
  { label: "Work Order & Stickers", to: "/work-order" },
  { label: "Customers", to: "/customers" },
  { label: "Reports", to: "/reports" },
  { label: "Settings", to: "/settings" },
] as const;

export function GlobalSearch({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const navigate = useNavigate();
  const { invoices, customers, loadInvoice } = useGQ();

  /* Ctrl+K only ever searched the eight newest records. cmdk filters the items
     it is given, and this rendered `invoices.slice(0, 8)` — so an invoice
     number typed in full matched nothing unless that invoice happened to be
     among the last eight created, which on a real dataset it almost never is.
     Filter the whole set against the query first, then cap what is rendered:
     the cap is there to keep the list readable, not to decide what is
     searchable. */
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  const matchedInvoices = useMemo(() => {
    const rows = q
      ? invoices.filter((r: any) =>
          [r?.no, r?.orderNo, r?.preProformaNo, r?.cust?.name, r?.poNo, r?.projectRemark].some(
            (field) =>
              String(field ?? "")
                .toLowerCase()
                .includes(q),
          ),
        )
      : invoices;
    return rows.slice(0, 8);
  }, [invoices, q]);

  const matchedCustomers = useMemo(() => {
    const rows = q
      ? customers.filter((c: any) =>
          [c?.name, c?.phone, c?.email, c?.gstin, c?.city].some((field) =>
            String(field ?? "")
              .toLowerCase()
              .includes(q),
          ),
        )
      : customers;
    return rows.slice(0, 8);
  }, [customers, q]);

  const goto = (to: string) => {
    onOpenChange(false);
    navigate({ to });
  };

  /* One record with no `cust` object crashed this component, and because
     AppShell renders it on every page that took the whole app to the root error
     boundary — a genuinely blank screen. Rows arriving from the sheet are not
     guaranteed to be well formed, so every field is read defensively. */
  const openRecord = (rec: any) => {
    onOpenChange(false);
    loadInvoice(rec.id);
    navigate({
      to: rec?.docType === "proforma" ? "/order" : "/booking",
      search: { view: "form" },
    });
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        value={query}
        onValueChange={setQuery}
        placeholder="Search bookings, invoices, customers or pages…"
      />
      <CommandList>
        <CommandEmpty>Nothing matched your search.</CommandEmpty>
        <CommandGroup heading="Go to">
          {PAGES.map((p) => (
            <CommandItem key={p.to} value={p.label} onSelect={() => goto(p.to)}>
              {p.label}
            </CommandItem>
          ))}
        </CommandGroup>
        {matchedInvoices.length > 0 && (
          <CommandGroup heading="Bookings & Invoices">
            {matchedInvoices.map((r: any) => {
              const no = String(r?.no || r?.orderNo || "Untitled");
              const custName = String(r?.cust?.name || "No customer");
              /* cmdk runs its own pass over each item's `value`, so every field
                 the filter above accepts has to appear here as well — otherwise
                 a row matched on its PO number or order number is let through
                 and then hidden again. */
              const haystack = [no, r?.orderNo, r?.preProformaNo, custName, r?.poNo]
                .filter(Boolean)
                .join(" ");
              return (
                <CommandItem key={r?.id || no} value={haystack} onSelect={() => openRecord(r)}>
                  <span className="num">{no}</span>
                  <span className="text-muted-foreground">{custName}</span>
                  <span className="ml-auto num text-xs text-muted-foreground">
                    {dmy(r?.date || "")} · {nf(r?.totals?.grandTotal ?? 0)}
                  </span>
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}
        {matchedCustomers.length > 0 && (
          <CommandGroup heading="Customers">
            {matchedCustomers.map((c: any, i: number) => (
              <CommandItem
                key={c?.id || c?.name || i}
                value={[c?.name, c?.phone, c?.email, c?.gstin, c?.city].filter(Boolean).join(" ")}
                onSelect={() => goto("/customers")}
              >
                {String(c?.name || "Unnamed")}
                <span className="ml-auto num text-xs text-muted-foreground">
                  {String(c?.phone || "")}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
