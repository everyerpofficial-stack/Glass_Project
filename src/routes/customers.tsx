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
  Download,
  Upload,
  CheckCircle2,
  Clock,
  AlertCircle,
  Eye,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useGQ } from "@/lib/store";
import { blankInvoice } from "@/lib/gq";
import { toast } from "sonner";

export const Route = createFileRoute("/customers")({
  component: CustomersPage,
});

/* Helper to get customer initials avatar */
function getInitials(name: string) {
  if (!name) return "CU";
  const parts = name.trim().split(" ");
  if (parts.length >= 2 && parts[0] && parts[1] && parts[0][0] && parts[1][0]) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

/* Color palettes for avatars */
const AVATAR_COLORS = [
  "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
  "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
];

function CustomersPage() {
  const navigate = useNavigate();
  const { customers, invoices, saveCustomer, deleteCustomer, setInv, settings } = useGQ();
  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [openModal, setOpenModal] = useState(false);
  const [editCust, setEditCust] = useState<any>(null);

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    gstin: "",
    city: "",
    addr: "",
    ship: "",
  });

  const handleOpenAdd = () => {
    setEditCust(null);
    setFormData({ name: "", phone: "", email: "", gstin: "", city: "", addr: "", ship: "" });
    setOpenModal(true);
  };

  const handleOpenEdit = (c: any) => {
    setEditCust(c);
    setFormData({
      name: c.name || "",
      phone: c.phone || "",
      email: c.email || "",
      gstin: c.gstin || "",
      city: c.city || "",
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
    toast.success(editCust ? "Customer updated" : "New customer added");
  };

  const createQuoteForCust = (c: any) => {
    setInv((prev) => ({
      ...blankInvoice(settings),
      cust: { ...c },
    }));
    toast.success(`Started Pre Proforma for ${c.name}`);
    navigate({ to: "/booking" });
  };

  /* Metrics counts */
  const totalCustomers = customers.length;
  const activeCount = useMemo(() => customers.filter((c) => (c.status || "active") === "active").length, [customers]);
  const pendingKycCount = useMemo(() => customers.filter((c) => c.status === "pending").length, [customers]);

  /* Unique cities */
  const cities = useMemo(() => {
    const set = new Set<string>();
    customers.forEach((c) => {
      if (c.city) set.add(c.city);
    });
    return Array.from(set);
  }, [customers]);

  /* Filtered customers list */
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const q = search.toLowerCase();
      const matchSearch =
        !search ||
        String(c.name || "").toLowerCase().includes(q) ||
        String(c.phone || "").toLowerCase().includes(q) ||
        String(c.gstin || "").toLowerCase().includes(q) ||
        String(c.city || "").toLowerCase().includes(q) ||
        String(c.id || "").toLowerCase().includes(q);

      const matchCity = cityFilter === "all" || String(c.city || "").toLowerCase() === cityFilter.toLowerCase();
      const matchStatus = statusFilter === "all" || (c.status || "active") === statusFilter;

      return matchSearch && matchCity && matchStatus;
    });
  }, [customers, search, cityFilter, statusFilter]);

  return (
    <div className="space-y-5 pb-12">
      {/* ── Page Title Header ───────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border/60 pb-3">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-0.5">
            Operations / <span className="text-primary">Customers</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">Customers</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage your customer database and client billing history
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={() => toast.info("Exporting customer data...")}>
            <Download className="h-3.5 w-3.5" /> Export
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={() => toast.info("Import customer CSV feature ready.")}>
            <Upload className="h-3.5 w-3.5" /> Import
          </Button>

          <Dialog open={openModal} onOpenChange={setOpenModal}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={handleOpenAdd} className="h-8 text-xs gap-1.5 bg-primary text-primary-foreground font-semibold shadow-sm">
                <Plus className="h-3.5 w-3.5" /> Add Customer
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
                    className="h-8 text-xs"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Hindustan Float Glass Pvt Ltd"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Phone Number</Label>
                    <Input
                      className="h-8 text-xs font-mono"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+91 9799998611"
                    />
                  </div>
                  <div>
                    <Label>GSTIN Number</Label>
                    <Input
                      className="h-8 text-xs font-mono"
                      value={formData.gstin}
                      onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                      placeholder="08AACCH4208C1Z3"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Email Address</Label>
                    <Input
                      className="h-8 text-xs"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="hindustan@live.in"
                    />
                  </div>
                  <div>
                    <Label>City / Branch</Label>
                    <Input
                      className="h-8 text-xs"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      placeholder="Jaipur / Mysore"
                    />
                  </div>
                </div>

                <div>
                  <Label>Billing Address</Label>
                  <Textarea
                    className="text-xs min-h-[50px]"
                    rows={2}
                    value={formData.addr}
                    onChange={(e) => setFormData({ ...formData, addr: e.target.value })}
                    placeholder="Street address, city, state"
                  />
                </div>

                <div>
                  <Label>Shipping / Dispatch Address</Label>
                  <Textarea
                    className="text-xs min-h-[50px]"
                    rows={2}
                    value={formData.ship}
                    onChange={(e) => setFormData({ ...formData, ship: e.target.value })}
                    placeholder="Site / delivery address"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" size="sm" onClick={() => setOpenModal(false)}>Cancel</Button>
                <Button size="sm" onClick={handleSubmit}>Save Customer</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* ── Summary Metric Cards (Matching Screenshot 3) ──────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border border-border/60 bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Total Customers</div>
              <div className="text-xl font-bold tracking-tight text-foreground">{totalCustomers}</div>
            </div>
          </div>
        </Card>

        <Card className="border border-border/60 bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Active</div>
              <div className="text-xl font-bold tracking-tight text-emerald-600">{activeCount || totalCustomers}</div>
            </div>
          </div>
        </Card>

        <Card className="border border-border/60 bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Pending KYC / GST</div>
              <div className="text-xl font-bold tracking-tight text-amber-600">{pendingKycCount}</div>
            </div>
          </div>
        </Card>

        <Card className="border border-border/60 bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-rose-500/10 text-rose-600 flex items-center justify-center shrink-0">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Due Balance</div>
              <div className="text-xl font-bold tracking-tight text-rose-600">₹ 0</div>
            </div>
          </div>
        </Card>
      </div>

      {/* ── Toolbar Row (Search + Filter Dropdowns + Count) ─────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card border border-border/60 rounded-lg p-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9 h-8 text-xs bg-background"
            placeholder="Search by name, phone, GSTIN, city..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-muted-foreground mr-1">
            <span className="font-bold text-foreground">{filteredCustomers.length}</span> customers
          </span>

          <Select value={cityFilter} onValueChange={setCityFilter}>
            <SelectTrigger className="h-8 text-xs w-32 bg-background">
              <SelectValue placeholder="All Cities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Cities</SelectItem>
              {cities.map((city) => (
                <SelectItem key={city} value={city}>{city}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 text-xs w-32 bg-background">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── Customer Data Table (Matching Screenshot 3) ──────────────── */}
      <div className="bg-card border border-border/60 rounded-lg overflow-hidden shadow-sm">
        {filteredCustomers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-3">
              <Users className="h-5 w-5 text-muted-foreground/60" />
            </div>
            <p className="text-sm font-semibold text-foreground">No customers found</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              {search ? "No clients match your filter criteria." : "Click below to add your first customer."}
            </p>
            <Button size="sm" onClick={handleOpenAdd} className="mt-4 h-8 text-xs">
              <UserPlus className="h-3.5 w-3.5 mr-1.5" /> Add Customer
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">City</th>
                  <th className="py-3 px-4 text-center">Invoices</th>
                  <th className="py-3 px-4 text-right">Due Balance</th>
                  <th className="py-3 px-4 text-center">KYC / GST</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 text-xs">
                {filteredCustomers.map((c, i) => {
                  const customerQuotes = invoices.filter(
                    (inv) => String(inv.cust?.name || "").toLowerCase() === String(c.name || "").toLowerCase()
                  );
                  const colorClass = AVATAR_COLORS[i % AVATAR_COLORS.length];
                  const code = `CUS-${String(i + 230).padStart(4, "0")}`;

                  return (
                    <tr key={c.id || i} className="hover:bg-muted/15 transition-colors">
                      {/* Customer Info */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className={`h-8 w-8 rounded-full font-bold text-xs flex items-center justify-center shrink-0 ${colorClass}`}>
                            {getInitials(c.name)}
                          </div>
                          <div>
                            <div className="font-semibold text-foreground leading-tight">{c.name}</div>
                            <div className="text-[10px] text-muted-foreground font-mono mt-0.5">{code}</div>
                          </div>
                        </div>
                      </td>

                      {/* Contact Info */}
                      <td className="py-3 px-4">
                        {c.phone ? (
                          <div className="flex items-center gap-1.5 font-mono text-foreground">
                            <Phone className="h-3 w-3 text-muted-foreground shrink-0" />
                            <span>{c.phone}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                        {c.email && (
                          <div className="text-[10px] text-muted-foreground truncate max-w-[150px] mt-0.5">
                            {c.email}
                          </div>
                        )}
                      </td>

                      {/* City */}
                      <td className="py-3 px-4 text-muted-foreground">
                        {c.city || c.addr?.split(",")?.[0] ? (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-muted-foreground/70 shrink-0" />
                            <span>{c.city || c.addr?.split(",")?.[0]}</span>
                          </div>
                        ) : (
                          "Jaipur"
                        )}
                      </td>

                      {/* Invoices Count */}
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 text-[11px] font-semibold">
                          {customerQuotes.length} active
                        </span>
                      </td>

                      {/* Due Balance */}
                      <td className="py-3 px-4 text-right font-mono font-semibold">
                        <span className="text-emerald-600 font-bold">₹ 0</span>
                        <div className="text-[10px] text-emerald-600 font-normal">Paid</div>
                      </td>

                      {/* KYC / GST Status */}
                      <td className="py-3 px-4 text-center">
                        {c.gstin ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 text-[10px] font-semibold">
                            <CheckCircle2 className="h-3 w-3" /> Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 text-[10px] font-semibold">
                            <Clock className="h-3 w-3" /> Pending
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                          (c.status || "active") === "active"
                            ? "bg-emerald-500/10 text-emerald-600"
                            : "bg-amber-500/10 text-amber-600"
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${
                            (c.status || "active") === "active" ? "bg-emerald-500" : "bg-amber-500"
                          }`} />
                          {(c.status || "active") === "active" ? "Active" : "Pending"}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-primary"
                            onClick={() => createQuoteForCust(c)}
                            title="New Pre Proforma"
                          >
                            <PlusCircle className="h-3.5 w-3.5" />
                          </Button>
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
                            onClick={() => {
                              deleteCustomer(c.id);
                              toast.success("Customer deleted");
                            }}
                            title="Delete Customer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
