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
  Download,
  Upload,
  CheckCircle2,
  Clock,
  AlertCircle,
  Eye,
  ShieldCheck,
  UserCheck,
  CreditCard,
  Receipt,
  Calendar,
  IndianRupee,
  ArrowRight,
  Printer,
  PlusCircle,
  Factory,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useGQ } from "@/lib/store";
import { TableSkeleton } from "@/components/app/DataSkeleton";
import { ConfirmDelete } from "@/components/app/ConfirmDelete";
import { blankInvoice, commercialRecords, dmy, nf, today } from "@/lib/gq";
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
  const { customers, invoices, payments, saveCustomer, deleteCustomer, savePayment, deletePayment, setInv, settings, hydrated } = useGQ();
  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  
  /* Edit / Add Modal state */
  const [openModal, setOpenModal] = useState(false);
  const [editCust, setEditCust] = useState<any>(null);

  /* Customer Details Popup Modal state */
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [viewCust, setViewCust] = useState<any>(null);

  /* Add Payment Form state inside Customer Details Popup */
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [payFormData, setPayFormData] = useState({
    date: today(),
    invoiceNo: "",
    mode: "UPI",
    amount: "",
    refNo: "",
    notes: "",
  });

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

  const handleOpenEdit = (c: any, e?: React.MouseEvent) => {
    e?.stopPropagation();
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

  const handleOpenDetails = (c: any, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setViewCust(c);
    setShowAddPayment(false);
    setDetailModalOpen(true);
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

  /* /work-order matches woId against work-order and invoice identifiers, never
     against a customer name — passing c.name here left the page silently blank.
     Resolve the customer's newest work-order-eligible invoice instead. */
  const openWorkOrderForCust = (c: any) => {
    const name = String(c?.name || "").trim().toLowerCase();
    const candidates = invoices.filter(
      (x) =>
        String(x.cust?.name || "").trim().toLowerCase() === name &&
        (x.status === "order_confirmed" ||
          x.status === "work_order_generated" ||
          x.docType === "proforma"),
    );
    if (!candidates.length) {
      toast.error(
        `${c?.name || "This customer"} has no confirmed Proforma Invoice yet — confirm one first.`,
      );
      return;
    }
    const stamp = (x: any) => Date.parse(x?.updatedAt || x?.createdAt || x?.date || "") || 0;
    const latest = candidates.reduce(
      (best, x) => (stamp(x) > stamp(best) ? x : best),
      candidates[0],
    );
    navigate({ to: "/work-order", search: { woId: latest.id } });
  };

  const createQuoteForCust = (c: any) => {
    setInv((prev: any) => ({
      ...blankInvoice(settings),
      cust: { ...c },
    }));
    toast.success(`Started Order Booking for ${c.name}`);
    navigate({ to: "/booking" });
  };

  /* Filter customer's invoices and payments when detail popup is open.
     Restricted to one record per order: a confirmed booking and the Proforma
     Invoice raised from it both carry the same grandTotal, so the ledger was
     billing this customer twice for every confirmed order — and the Due Balance
     underneath, being Total Invoiced minus Total Paid, inherited the error. */
  const customerInvoices = useMemo(() => {
    if (!viewCust) return [];
    const oneRowPerOrder = commercialRecords(invoices);
    return oneRowPerOrder.filter(
      (inv) => String(inv.cust?.name || "").toLowerCase() === String(viewCust.name || "").toLowerCase()
    );
  }, [invoices, viewCust]);

  const customerPayments = useMemo(() => {
    if (!viewCust) return [];
    return payments.filter(
      (p) => String(p.custName || "").toLowerCase() === String(viewCust.name || "").toLowerCase()
    );
  }, [payments, viewCust]);

  const totalInvoicedForViewCust = useMemo(() => {
    return customerInvoices.reduce((acc, item) => acc + (Number(item.totals?.grandTotal) || 0), 0);
  }, [customerInvoices]);

  const totalPaidForViewCust = useMemo(() => {
    return customerPayments.reduce((acc, item) => acc + (Number(item.amount) || 0), 0);
  }, [customerPayments]);

  const dueBalanceForViewCust = totalInvoicedForViewCust - totalPaidForViewCust;

  const handleAddPaymentSubmit = () => {
    if (!payFormData.amount || Number(payFormData.amount) <= 0) {
      toast.error("Enter a valid payment amount");
      return;
    }
    if (!viewCust) return;

    savePayment({
      custName: viewCust.name,
      custId: viewCust.id,
      invoiceNo: payFormData.invoiceNo || customerInvoices[0]?.no || "",
      date: payFormData.date,
      amount: Number(payFormData.amount),
      mode: payFormData.mode,
      refNo: payFormData.refNo,
      notes: payFormData.notes,
    });

    setPayFormData({
      date: today(),
      invoiceNo: "",
      mode: "UPI",
      amount: "",
      refNo: "",
      notes: "",
    });
    setShowAddPayment(false);
  };

  /* Combined customers list from store + invoices */
  const allCustomers = useMemo(() => {
    const list = [...customers];
    invoices.forEach((inv) => {
      if (inv.cust && inv.cust.name && String(inv.cust.name).trim()) {
        const nameLower = String(inv.cust.name).trim().toLowerCase();
        const exists = list.some((c) => String(c.name || "").trim().toLowerCase() === nameLower);
        if (!exists) {
          list.push({
            id: inv.cust.id || "cus-" + Math.abs(nameLower.split("").reduce((a, b) => (a << 5) - a + b.charCodeAt(0), 0)),
            name: inv.cust.name,
            phone: inv.cust.phone || "",
            email: inv.cust.email || "",
            gstin: inv.cust.gstin || "",
            city: inv.cust.city || inv.cust.ship || "",
            addr: inv.cust.addr || "",
            ship: inv.cust.ship || "",
            status: "active",
          });
        }
      }
    });
    return list;
  }, [customers, invoices]);

  /* Metrics counts */
  const totalCustomers = allCustomers.length;
  const activeCount = useMemo(() => allCustomers.filter((c) => (c.status || "active") === "active").length, [allCustomers]);
  const pendingKycCount = useMemo(() => allCustomers.filter((c) => c.status === "pending").length, [allCustomers]);

  /* Unique cities */
  const cities = useMemo(() => {
    const set = new Set<string>();
    allCustomers.forEach((c) => {
      if (c.city) set.add(c.city);
    });
    return Array.from(set);
  }, [allCustomers]);

  const ALPHABET = ["ALL", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")];
  const [letterFilter, setLetterFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  /* Filtered customers list */
  const filteredCustomers = useMemo(() => {
    return allCustomers.filter((c) => {
      const nameStr = String(c.name || "").trim();
      const q = search.toLowerCase();

      const matchSearch =
        !search ||
        nameStr.toLowerCase().includes(q) ||
        String(c.phone || "").toLowerCase().includes(q) ||
        String(c.gstin || "").toLowerCase().includes(q) ||
        String(c.city || "").toLowerCase().includes(q) ||
        String(c.id || "").toLowerCase().includes(q);

      const matchLetter =
        letterFilter === "ALL" ||
        nameStr.toUpperCase().startsWith(letterFilter);

      const matchCity = cityFilter === "all" || String(c.city || "").toLowerCase() === cityFilter.toLowerCase();
      const matchStatus = statusFilter === "all" || (c.status || "active") === statusFilter;

      return matchSearch && matchLetter && matchCity && matchStatus;
    });
  }, [allCustomers, search, letterFilter, cityFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredCustomers.length / (pageSize || filteredCustomers.length || 1)));

  const paginatedCustomers = useMemo(() => {
    if (pageSize === 0) return filteredCustomers;
    const start = (page - 1) * pageSize;
    return filteredCustomers.slice(start, start + pageSize);
  }, [filteredCustomers, page, pageSize]);

  return (
    <div className="max-w-[1200px] mx-auto space-y-5 px-4 sm:px-6 lg:px-8 pt-6 pb-12">
      {/* ── Page Title Header ───────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Customers</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage customer database, invoice history, and payment records
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={() => toast.info("Exporting customer data...")}>
            <Download className="h-3.5 w-3.5" /> Export
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={() => toast.info("Import customer CSV feature ready.")}>
            <Upload className="h-3.5 w-3.5" /> Import
          </Button>

          {/* Add / Edit Customer Modal */}
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
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                      maxLength={10}
                      placeholder="9799998611"
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

      {/* ── Summary Metric Cards ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-border p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Total Customers</div>
              <div className="text-xl font-bold tracking-tight text-foreground">{totalCustomers}</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-border p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Active</div>
              <div className="text-xl font-bold tracking-tight text-emerald-600">{activeCount || totalCustomers}</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-border p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Pending KYC / GST</div>
              <div className="text-xl font-bold tracking-tight text-amber-600">{pendingKycCount}</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-border p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Total Recorded Payments</div>
              <div className="text-xl font-bold tracking-tight text-emerald-600 font-mono">₹ {nf(payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0))}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Toolbar Row (Search + Filter Dropdowns + Count) ─────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-border rounded-xl p-4 shadow-xs">
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

      {/* ── A-Z Quick Jumper Bar ────────────────────────────── */}
      <div className="bg-white border border-border rounded-xl p-2 sm:p-2.5 shadow-xs overflow-x-auto">
        <div className="flex items-center gap-1 min-w-[650px] text-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mr-2 shrink-0">
            A–Z Jumper:
          </span>
          {ALPHABET.map((char) => {
            const active = letterFilter === char;
            return (
              <button
                key={char}
                type="button"
                onClick={() => {
                  setLetterFilter(char);
                  setPage(1);
                }}
                className={`h-7 px-2 rounded font-mono text-[11px] font-bold transition-all ${
                  active
                    ? "bg-primary text-primary-foreground shadow-xs scale-105"
                    : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {char}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Customer Data Table ────────────────────────────────────────── */}
      <div className="bg-white border border-border rounded-xl overflow-hidden shadow-xs">
        {!hydrated ? (
          <TableSkeleton rows={6} cols={6} />
        ) : filteredCustomers.length === 0 ? (
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
                  <th className="py-3 px-4 text-right">Payments Received</th>
                  <th className="py-3 px-4 text-center">KYC / GST</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 text-xs">
                {paginatedCustomers.map((c, i) => {
                  const customerQuotes = invoices.filter(
                    (inv) => String(inv.cust?.name || "").toLowerCase() === String(c.name || "").toLowerCase()
                  );
                  const custPays = payments.filter(
                    (p) => String(p.custName || "").toLowerCase() === String(c.name || "").toLowerCase()
                  );
                  const totalPaid = custPays.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

                  const colorClass = AVATAR_COLORS[i % AVATAR_COLORS.length];
                  const code = `CUS-${String(i + 230).padStart(4, "0")}`;

                  return (
                    <tr
                      key={c.id || i}
                      className="hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={(e) => handleOpenDetails(c, e)}
                    >
                      {/* Customer Info */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className={`h-8 w-8 rounded-full font-bold text-xs flex items-center justify-center shrink-0 ${colorClass}`}>
                            {getInitials(c.name)}
                          </div>
                          <div>
                            <div className="font-semibold text-foreground leading-tight hover:underline text-primary">
                              {c.name}
                            </div>
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
                        <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 text-[11px] font-semibold inline-flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          {customerQuotes.length} active
                        </span>
                      </td>

                      {/* Payments Received */}
                      <td className="py-3 px-4 text-right font-mono font-semibold">
                        <span className="text-emerald-600 font-bold">₹ {nf(totalPaid)}</span>
                        <div className="text-[10px] text-muted-foreground font-normal">{custPays.length} payments</div>
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

                      {/* Actions (Removed confusing + button as requested) */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950"
                            onClick={(e) => {
                              e.stopPropagation();
                              openWorkOrderForCust(c);
                            }}
                            title="Generate / View Work Order & Stickers for this Customer"
                          >
                            <Factory className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-primary"
                            onClick={(e) => handleOpenDetails(c, e)}
                            title="View Details, Invoices & Payment History"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            onClick={(e) => handleOpenEdit(c, e)}
                            title="Edit Customer"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </Button>
                          <ConfirmDelete
                            title={`Delete ${c.name || "this customer"}?`}
                            description="This permanently removes the customer profile from this device and from your Google Sheet. Their invoices and payments are kept, but will no longer be linked to a saved profile."
                            onConfirm={() => deleteCustomer(c.id)}
                          >
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-red-500"
                              title="Delete Customer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </ConfirmDelete>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Pagination Bar ────────────────────────────────────────── */}
        {filteredCustomers.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 border-t border-border bg-muted/20 text-xs">
            <div className="text-muted-foreground font-medium">
              Showing <span className="font-bold text-foreground">{(page - 1) * (pageSize || filteredCustomers.length) + 1}</span> to{" "}
              <span className="font-bold text-foreground">
                {Math.min(page * (pageSize || filteredCustomers.length), filteredCustomers.length)}
              </span>{" "}
              of <span className="font-bold text-foreground">{filteredCustomers.length}</span> customers
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground text-[11px]">Per Page:</span>
                <select
                  className="bg-background border border-border rounded px-2 py-1 text-xs outline-none font-semibold"
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={0}>All ({filteredCustomers.length})</option>
                </select>
              </div>

              {pageSize > 0 && totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="h-3.5 w-3.5 mr-0.5" /> Prev
                  </Button>
                  <span className="px-2 font-mono text-[11px] font-bold text-muted-foreground">
                    {page} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Next <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── CUSTOMER DETAILS & PAYMENT HISTORY POPUP MODAL ─────────────── */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {viewCust && (
            <div className="space-y-4">
              {/* Header */}
              <DialogHeader className="border-b border-border pb-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-sm shrink-0">
                    {getInitials(viewCust.name)}
                  </div>
                  <div>
                    <DialogTitle className="text-lg font-bold text-foreground leading-tight flex items-center gap-2">
                      {viewCust.name}
                      <span className="text-xs font-mono font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded">
                        CUS-{viewCust.id?.slice(-4) || "0230"}
                      </span>
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground mt-0.5 flex items-center gap-3 flex-wrap">
                      {viewCust.phone && (
                        <span className="flex items-center gap-1 font-mono">
                          <Phone className="h-3 w-3" /> {viewCust.phone}
                        </span>
                      )}
                      {viewCust.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" /> {viewCust.email}
                        </span>
                      )}
                      {viewCust.city && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {viewCust.city}
                        </span>
                      )}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              {/* Tabs for Details, Invoice History, Payment History */}
              <Tabs defaultValue="details" className="w-full">
                <TabsList className="grid grid-cols-3 w-full h-9 bg-muted/60 p-1">
                  <TabsTrigger value="details" className="text-xs gap-1.5">
                    <UserCheck className="h-3.5 w-3.5" /> Customer Details
                  </TabsTrigger>
                  <TabsTrigger value="invoices" className="text-xs gap-1.5">
                    <FileText className="h-3.5 w-3.5" /> Invoices ({customerInvoices.length})
                  </TabsTrigger>
                  <TabsTrigger value="payments" className="text-xs gap-1.5">
                    <CreditCard className="h-3.5 w-3.5" /> Payment History ({customerPayments.length})
                  </TabsTrigger>
                </TabsList>

                {/* ── TAB 1: CUSTOMER DETAILS ────────────────────────────── */}
                <TabsContent value="details" className="space-y-4 pt-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="bg-muted/20 border border-border rounded-lg p-3 space-y-2">
                      <div className="font-semibold text-foreground text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                        <Building className="h-3.5 w-3.5" /> Contact Information
                      </div>
                      <div className="space-y-1">
                        <div><span className="text-muted-foreground">Name:</span> <span className="font-medium">{viewCust.name}</span></div>
                        <div><span className="text-muted-foreground">Phone:</span> <span className="font-mono">{viewCust.phone || "N/A"}</span></div>
                        <div><span className="text-muted-foreground">Email:</span> {viewCust.email || "N/A"}</div>
                        <div><span className="text-muted-foreground">GSTIN:</span> <span className="font-mono">{viewCust.gstin || "N/A"}</span></div>
                        <div><span className="text-muted-foreground">City:</span> {viewCust.city || "Jaipur"}</div>
                      </div>
                    </div>

                    <div className="bg-muted/20 border border-border rounded-lg p-3 space-y-2">
                      <div className="font-semibold text-foreground text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" /> Address Details
                      </div>
                      <div className="space-y-1">
                        <div>
                          <span className="text-muted-foreground font-semibold">Billing Address:</span>
                          <p className="text-muted-foreground text-[11px] whitespace-pre-line mt-0.5">{viewCust.addr || "No billing address stored."}</p>
                        </div>
                        <div className="pt-1">
                          <span className="text-muted-foreground font-semibold">Dispatch / Delivery Address:</span>
                          <p className="text-muted-foreground text-[11px] whitespace-pre-line mt-0.5">{viewCust.ship || "Same as billing address."}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Financial Summary */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-center">
                      <div className="text-[10px] font-bold uppercase text-blue-600">Total Billed</div>
                      <div className="text-base font-bold font-mono text-blue-700 mt-0.5">₹ {nf(totalInvoicedForViewCust)}</div>
                    </div>
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 text-center">
                      <div className="text-[10px] font-bold uppercase text-emerald-600">Total Paid</div>
                      <div className="text-base font-bold font-mono text-emerald-700 mt-0.5">₹ {nf(totalPaidForViewCust)}</div>
                    </div>
                    <div className={`border rounded-lg p-3 text-center ${dueBalanceForViewCust > 0 ? "bg-rose-500/10 border-rose-500/20 text-rose-700" : "bg-muted/30 border-border text-foreground"}`}>
                      <div className="text-[10px] font-bold uppercase text-muted-foreground">Due Balance</div>
                      <div className="text-base font-bold font-mono mt-0.5">₹ {nf(Math.max(0, dueBalanceForViewCust))}</div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" size="sm" onClick={() => handleOpenEdit(viewCust)}>
                      <Edit3 className="h-3.5 w-3.5 mr-1" /> Edit Customer Info
                    </Button>
                    <Button size="sm" onClick={() => createQuoteForCust(viewCust)}>
                      <PlusCircle className="h-3.5 w-3.5 mr-1" /> Create Order Booking
                    </Button>
                  </div>
                </TabsContent>

                {/* ── TAB 2: INVOICES & QUOTES ───────────────────────────── */}
                <TabsContent value="invoices" className="space-y-3 pt-3">
                  {customerInvoices.length === 0 ? (
                    <div className="text-center py-8 text-xs text-muted-foreground">
                      No invoices or quotes recorded yet for {viewCust.name}.
                    </div>
                  ) : (
                    <div className="overflow-x-auto border border-border rounded-lg">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-muted/40 border-b border-border text-[10px] font-bold uppercase text-muted-foreground">
                          <tr>
                            <th className="p-2.5">Doc No</th>
                            <th className="p-2.5">Date</th>
                            <th className="p-2.5">Type</th>
                            <th className="p-2.5 text-center">Items</th>
                            <th className="p-2.5 text-right">Grand Total</th>
                            <th className="p-2.5 text-center">Status</th>
                            <th className="p-2.5 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/40 font-mono">
                          {customerInvoices.map((inv) => (
                            <tr key={inv.id} className="hover:bg-muted/20">
                              <td className="p-2.5 font-bold text-foreground">{inv.no}</td>
                              <td className="p-2.5 text-muted-foreground font-sans">{inv.date}</td>
                              <td className="p-2.5 font-sans">
                                <span className="px-1.5 py-0.5 rounded text-[10px] bg-muted font-medium">
                                  {inv.docType === "proforma" ? "Proforma Invoice" : "Order Booking"}
                                </span>
                              </td>
                              <td className="p-2.5 text-center font-sans">{inv.items?.length || 0}</td>
                              <td className="p-2.5 text-right font-bold text-emerald-600">₹ {nf(inv.totals?.grandTotal || 0)}</td>
                              <td className="p-2.5 text-center font-sans">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  inv.status === "order_confirmed" ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"
                                }`}>
                                  {inv.status || "Draft"}
                                </span>
                              </td>
                              <td className="p-2.5 text-right font-sans">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-6 text-[10px] px-2 gap-1"
                                  onClick={() => {
                                    setDetailModalOpen(false);
                                    navigate({ to: "/invoice", search: { id: inv.id } });
                                  }}
                                >
                                  <Printer className="h-3 w-3" /> PDF
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </TabsContent>

                {/* ── TAB 3: PAYMENT HISTORY ─────────────────────────────── */}
                <TabsContent value="payments" className="space-y-4 pt-3">
                  {/* Top Bar with Totals + Add Payment Button */}
                  <div className="flex items-center justify-between gap-2 bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-lg flex-wrap">
                    <div>
                      <div className="text-xs font-bold text-emerald-800 dark:text-emerald-300">Payment Ledger Summary</div>
                      <div className="text-[11px] text-emerald-700/80 dark:text-emerald-400 mt-0.5">
                        Total Payments Received: <span className="font-bold font-mono">₹ {nf(totalPaidForViewCust)}</span> | Remaining Due: <span className="font-bold font-mono">₹ {nf(Math.max(0, dueBalanceForViewCust))}</span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className="h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
                      onClick={() => setShowAddPayment((v) => !v)}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      {showAddPayment ? "Cancel Form" : "Record New Payment"}
                    </Button>
                  </div>

                  {/* Add Payment Form */}
                  {showAddPayment && (
                    <div className="bg-card border border-border rounded-xl p-4 space-y-3 shadow-sm text-xs">
                      <div className="font-bold text-foreground flex items-center gap-1.5 text-xs">
                        <CreditCard className="h-4 w-4 text-emerald-600" /> Record Payment Received
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <div>
                          <Label className="text-[10px]">Payment Date</Label>
                          <Input
                            type="date"
                            className="h-8 text-xs"
                            value={payFormData.date}
                            onChange={(e) => setPayFormData({ ...payFormData, date: e.target.value })}
                          />
                        </div>

                        <div>
                          <Label className="text-[10px]">Payment Mode</Label>
                          <Select
                            value={payFormData.mode}
                            onValueChange={(v) => setPayFormData({ ...payFormData, mode: v })}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="UPI">UPI / Google Pay</SelectItem>
                              <SelectItem value="Bank Transfer">Bank Transfer (NEFT/RTGS)</SelectItem>
                              <SelectItem value="Cash">Cash</SelectItem>
                              <SelectItem value="Cheque">Cheque</SelectItem>
                              <SelectItem value="Credit Card">Credit / Debit Card</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label className="text-[10px]">Amount Received (₹) *</Label>
                          <Input
                            type="number"
                            className="h-8 text-xs font-mono font-bold"
                            placeholder="e.g. 10000"
                            value={payFormData.amount}
                            onChange={(e) => setPayFormData({ ...payFormData, amount: e.target.value })}
                          />
                        </div>

                        <div>
                          <Label className="text-[10px]">Invoice Ref / No (Optional)</Label>
                          <Input
                            className="h-8 text-xs font-mono"
                            placeholder="e.g. PI-1001"
                            value={payFormData.invoiceNo}
                            onChange={(e) => setPayFormData({ ...payFormData, invoiceNo: e.target.value })}
                          />
                        </div>

                        <div>
                          <Label className="text-[10px]">Transaction / Ref No.</Label>
                          <Input
                            className="h-8 text-xs font-mono"
                            placeholder="e.g. UPI-9872134"
                            value={payFormData.refNo}
                            onChange={(e) => setPayFormData({ ...payFormData, refNo: e.target.value })}
                          />
                        </div>

                        <div>
                          <Label className="text-[10px]">Notes / Remarks</Label>
                          <Input
                            className="h-8 text-xs"
                            placeholder="e.g. 50% advance received"
                            value={payFormData.notes}
                            onChange={(e) => setPayFormData({ ...payFormData, notes: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-1">
                        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setShowAddPayment(false)}>
                          Cancel
                        </Button>
                        <Button size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold" onClick={handleAddPaymentSubmit}>
                          Save Payment Record
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Payment History Table */}
                  {customerPayments.length === 0 ? (
                    <div className="text-center py-8 text-xs text-muted-foreground space-y-1">
                      <p>No payment entries recorded yet for {viewCust.name}.</p>
                      <p className="text-[11px] text-muted-foreground/70">Click "Record New Payment" above to add payment logs.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto border border-border rounded-lg">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-muted/40 border-b border-border text-[10px] font-bold uppercase text-muted-foreground">
                          <tr>
                            <th className="p-2.5">Date</th>
                            <th className="p-2.5">Payment Mode</th>
                            <th className="p-2.5">Ref / Txn ID</th>
                            <th className="p-2.5">Invoice #</th>
                            <th className="p-2.5 text-right">Amount Paid</th>
                            <th className="p-2.5">Notes</th>
                            <th className="p-2.5 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/40 text-xs">
                          {customerPayments.map((pay) => (
                            <tr key={pay.id} className="hover:bg-muted/20">
                              <td className="p-2.5 font-mono text-muted-foreground">{pay.date}</td>
                              <td className="p-2.5">
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                                  {pay.mode || "UPI"}
                                </span>
                              </td>
                              <td className="p-2.5 font-mono text-muted-foreground">{pay.refNo || "—"}</td>
                              <td className="p-2.5 font-mono font-medium text-foreground">{pay.invoiceNo || "—"}</td>
                              <td className="p-2.5 text-right font-mono font-bold text-emerald-600">₹ {nf(pay.amount)}</td>
                              <td className="p-2.5 text-muted-foreground truncate max-w-[150px]">{pay.notes || "—"}</td>
                              <td className="p-2.5 text-right">
                                <ConfirmDelete
                                  title="Delete this payment record?"
                                  description={`This permanently removes the ${settings.currency || "₹"} ${nf(pay.amount || 0)} payment dated ${dmy(pay.date)} from this device and from your Google Sheet. The customer’s outstanding balance will go back up by that amount.`}
                                  onConfirm={() => deletePayment(pay.id)}
                                >
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-muted-foreground hover:text-red-500"
                                    title="Delete Payment Record"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </ConfirmDelete>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
