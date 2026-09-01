import { useNavigate } from "@tanstack/react-router";
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
  { label: "Order Booking", to: "/booking" },
  { label: "Proforma Invoice", to: "/order" },
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
      <CommandInput placeholder="Search bookings, invoices, customers or pages…" />
      <CommandList>
        <CommandEmpty>Nothing matched your search.</CommandEmpty>
        <CommandGroup heading="Go to">
          {PAGES.map((p) => (
            <CommandItem key={p.to} value={p.label} onSelect={() => goto(p.to)}>
              {p.label}
            </CommandItem>
          ))}
        </CommandGroup>
        {invoices.length > 0 && (
          <CommandGroup heading="Bookings & Invoices">
            {invoices.slice(0, 8).map((r: any) => {
              const no = String(r?.no || r?.orderNo || "Untitled");
              const custName = String(r?.cust?.name || "No customer");
              return (
                <CommandItem
                  key={r?.id || no}
                  value={no + " " + custName}
                  onSelect={() => openRecord(r)}
                >
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
        {customers.length > 0 && (
          <CommandGroup heading="Customers">
            {customers.slice(0, 8).map((c: any, i: number) => (
              <CommandItem
                key={c?.id || c?.name || i}
                value={String(c?.name || "")}
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
