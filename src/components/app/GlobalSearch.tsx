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

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search quotes, customers or pages…" />
      <CommandList>
        <CommandEmpty>Nothing matched your search.</CommandEmpty>
        <CommandGroup heading="Go to">
          <CommandItem onSelect={() => goto("/")}>Dashboard</CommandItem>
          <CommandItem onSelect={() => goto("/quote")}>New quote</CommandItem>
          <CommandItem onSelect={() => goto("/quotes")}>Quotes</CommandItem>
          <CommandItem onSelect={() => goto("/customers")}>Customers</CommandItem>
          <CommandItem onSelect={() => goto("/invoice")}>Invoice preview</CommandItem>
          <CommandItem onSelect={() => goto("/settings")}>Settings</CommandItem>
        </CommandGroup>
        {invoices.length > 0 && (
          <CommandGroup heading="Quotes">
            {invoices.slice(0, 8).map((r) => (
              <CommandItem
                key={r.id}
                value={r.no + " " + r.cust.name}
                onSelect={() => {
                  loadInvoice(r.id);
                  goto("/quote");
                }}
              >
                <span className="num">{r.no}</span>
                <span className="text-muted-foreground">{r.cust.name}</span>
                <span className="ml-auto num text-xs text-muted-foreground">
                  {dmy(r.date)} · {nf(r.totals?.grandTotal ?? 0)}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {customers.length > 0 && (
          <CommandGroup heading="Customers">
            {customers.slice(0, 8).map((c) => (
              <CommandItem key={c.id} value={c.name} onSelect={() => goto("/customers")}>
                {c.name}
                <span className="ml-auto num text-xs text-muted-foreground">{c.phone}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
