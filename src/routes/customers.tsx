import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Users,
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  FileText,
  Edit3,
  Trash2,
  Building,
  UserPlus,
  PlusCircle,
} from "lucide-react";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useGQ } from "@/lib/store";
import { blankInvoice } from "@/lib/gq";
import { toast } from "sonner";

export const Route = createFileRoute("/customers")({
  component: CustomersPage,
});

function CustomersPage() {
  const navigate = useNavigate();
  const { customers, invoices, saveCustomer, deleteCustomer, setInv, settings } = useGQ();
  const [search, setSearch] = useState("");
  const [openModal, setOpenModal] = useState(false);
  const [editCust, setEditCust] = useState<any>(null);

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    gstin: "",
    addr: "",
    ship: "",
  });

  const handleOpenAdd = () => {
    setEditCust(null);
    setFormData({ name: "", phone: "", email: "", gstin: "", addr: "", ship: "" });
    setOpenModal(true);
  };

  const handleOpenEdit = (c: any) => {
    setEditCust(c);
    setFormData({
      name: c.name || "",
      phone: c.phone || "",
      email: c.email || "",
      gstin: c.gstin || "",
      addr: c.addr || "",
      ship: c.ship || "",
    });
    setOpenModal(true);
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast.error("Customer name is required");
      return;
    }
    const rec = editCust ? { ...editCust, ...formData } : { ...formData };
    saveCustomer(rec);
    setOpenModal(false);
  };

  const createQuoteForCust = (c: any) => {
    setInv((prev) => ({
      ...blankInvoice(settings),
      cust: { ...c },
    }));
    toast.success(`Started quote for ${c.name}`);
    navigate({ to: "/quote" });
  };

  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        String(c.name || "").toLowerCase().includes(q) ||
        String(c.phone || "").toLowerCase().includes(q) ||
        String(c.gstin || "").toLowerCase().includes(q) ||
        String(c.email || "").toLowerCase().includes(q)
      );
    });
  }, [customers, search]);

  return (
    <div className="space-y-6 pb-12">
      {/* ---------- Top Header ---------- */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Customer Directory</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Manage customer database, GSTIN records, addresses, and client history
          </p>
        </div>

        <Dialog open={openModal} onOpenChange={setOpenModal}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={handleOpenAdd} className="shadow-sm">
              <UserPlus className="h-4 w-4 mr-1.5" /> Add New Customer
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editCust ? "Edit Customer Details" : "Add New Customer"}</DialogTitle>
              <DialogDescription>
                Store customer details for instant selection during quote creation.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              <div>
                <Label>Customer / Company Name *</Label>
                <Input
                  className="h-9 text-xs"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Krishna Glass House"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Phone Number</Label>
                  <Input
                    className="h-9 text-xs"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 9876543210"
                  />
                </div>
                <div>
                  <Label>GSTIN Number</Label>
                  <Input
                    className="h-9 text-xs font-mono"
                    value={formData.gstin}
                    onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                    placeholder="29ABCDE1234F1Z5"
                  />
                </div>
              </div>

              <div>
                <Label>Email Address</Label>
                <Input
                  className="h-9 text-xs"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="contact@company.com"
                />
              </div>

              <div>
                <Label>Billing Address</Label>
                <Textarea
                  className="text-xs"
                  rows={2}
                  value={formData.addr}
                  onChange={(e) => setFormData({ ...formData, addr: e.target.value })}
                  placeholder="Billing street address, city, state"
                />
              </div>

              <div>
                <Label>Shipping / Dispatch Address</Label>
                <Textarea
                  className="text-xs"
                  rows={2}
                  value={formData.ship}
                  onChange={(e) => setFormData({ ...formData, ship: e.target.value })}
                  placeholder="Delivery address if different from billing"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenModal(false)}>Cancel</Button>
              <Button onClick={handleSubmit}>Save Customer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* ---------- Search Bar ---------- */}
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9 h-9 text-xs"
          placeholder="Search customer name, phone, GSTIN..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* ---------- Customer Cards Grid ---------- */}
      {filteredCustomers.length === 0 ? (
        <Card className="border border-border/60 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-full bg-muted p-4 text-muted-foreground">
              <Users className="h-8 w-8" />
            </div>
            <h3 className="mt-4 text-sm font-semibold">No customers found</h3>
            <p className="mt-1 text-xs text-muted-foreground max-w-sm">
              {search ? "No clients match your search query." : "Add customers to quickly select them when building quotes."}
            </p>
            <Button size="sm" onClick={handleOpenAdd} className="mt-4">
              <UserPlus className="h-4 w-4 mr-1" /> Add Customer
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredCustomers.map((c) => {
            const customerQuotes = invoices.filter(
              (inv) => String(inv.cust?.name || "").toLowerCase() === String(c.name || "").toLowerCase()
            );

            return (
              <Card key={c.id || c.name} className="border border-border/60 shadow-sm hover:border-primary/40 transition-colors">
                <CardHeader className="pb-3 flex flex-row items-start justify-between">
                  <div className="space-y-1 min-w-0">
                    <CardTitle className="text-base font-semibold truncate flex items-center gap-1.5">
                      <Building className="h-4 w-4 text-primary shrink-0" />
                      <span className="truncate">{c.name}</span>
                    </CardTitle>
                    {c.gstin && (
                      <Badge variant="outline" className="font-mono text-[10px] bg-primary/5 border-primary/20">
                        GSTIN: {c.gstin}
                      </Badge>
                    )}
                  </div>
                  <Badge variant="secondary" className="text-[10px] shrink-0">
                    {customerQuotes.length} {customerQuotes.length === 1 ? "Quote" : "Quotes"}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-3 text-xs pt-1">
                  {c.phone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-3.5 w-3.5 text-muted-foreground/70" />
                      <span className="text-foreground font-mono">{c.phone}</span>
                    </div>
                  )}

                  {c.email && (
                    <div className="flex items-center gap-2 text-muted-foreground truncate">
                      <Mail className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
                      <span className="truncate text-foreground">{c.email}</span>
                    </div>
                  )}

                  {c.addr && (
                    <div className="flex items-start gap-2 text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground/70 mt-0.5 shrink-0" />
                      <span className="line-clamp-2 text-foreground">{c.addr}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between border-t border-border/40 pt-3 mt-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-primary"
                      onClick={() => createQuoteForCust(c)}
                    >
                      <PlusCircle className="h-3.5 w-3.5 mr-1" /> New Quote
                    </Button>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        onClick={() => handleOpenEdit(c)}
                        title="Edit Customer"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-red-500"
                        onClick={() => deleteCustomer(c.id)}
                        title="Delete Customer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
