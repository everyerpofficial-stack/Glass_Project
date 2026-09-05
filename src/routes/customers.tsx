import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
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
  X,
} from "lucide-react";
import { useState, useMemo, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useGQ } from "@/lib/store";
import { TableSkeleton } from "@/components/app/DataSkeleton";
import { ConfirmDelete } from "@/components/app/ConfirmDelete";
import {
  ConfirmPaymentModal,
  type ConfirmPaymentDetails,
} from "@/components/app/ConfirmPaymentModal";
import {
  blankInvoice,
  commercialRecords,
  dedupeCustomers,
  dmy,
  formatOrderId,
  formatPiNo,
  isCancelled,
  nf,
  today,
} from "@/lib/gq";
import { toast } from "sonner";
import { DesktopOnly, MobileList, MobileRecordCard } from "@/components/app/MobileRecord";

export const Route = createFileRoute("/customers")({
  /* ?action=new opens the Add Customer dialog straight away — the target of
     the mobile quick-action button. */
  validateSearch: (search: Record<string, unknown>): { action?: string | undefined } => ({
    action: typeof search["action"] === "string" ? (search["action"] as string) : undefined,
  }),
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

/* Everything the customer list shows about one customer. Extracted from the
   table row so the phone card computes it exactly the same way. */
function customerSummary(c: any, invoices: any[], payments: any[]) {
  const customerQuotes = invoices.filter(
    (inv) =>
      String(inv.cust?.name || "").toLowerCase() === String(c.name || "").toLowerCase() &&
      !isCancelled(inv),
  );
  const custPays = payments.filter(
    (p) => String(p.custName || "").toLowerCase() === String(c.name || "").toLowerCase(),
  );
  const totalPaidFromPayments = custPays.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const totalPaidFromInvoices = customerQuotes.reduce(
    (sum, inv) => sum + (Number(inv.paidAmount) || 0),
    0,
  );
  const totalAmount = customerQuotes.reduce(
    (sum, inv) => sum + (Number(inv.totals?.grandTotal) || 0),
    0,
  );
  const receivedAmount = Math.max(totalPaidFromPayments, totalPaidFromInvoices);
  return {
    customerQuotes,
    totalAmount,
    receivedAmount,
    dueAmount: Math.max(0, totalAmount - receivedAmount),
  };
}

/* Color palettes for avatars */
const AVATAR_COLORS = [
  "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
  "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
];

function isPaymentForCancelledInv(p: any, invs: any[]) {
  const invNo = String(p.invoiceNo || "")
    .trim()
    .toLowerCase();
  if (!invNo && !p.invoiceId) return false;
  const targetInv = invs.find(
    (x: any) =>
      (p.invoiceId && String(x.id) === String(p.invoiceId)) ||
      (invNo &&
        (String(x.no || "").toLowerCase() === invNo ||
          String(x.orderNo || "").toLowerCase() === invNo ||
          String(x.preProformaNo || "").toLowerCase() === invNo)),
  );
  return Boolean(targetInv && isCancelled(targetInv));
}

function CustomersPage() {
  const navigate = useNavigate();
  const searchParams = useSearch({ strict: false }) as { action?: string };
  const {
    customers,
    invoices,
    payments,
    saveCustomer,
    deleteCustomer,
    savePayment,
    deletePayment,
    patchInvoice,
    setInv,
    settings,
    hydrated,
  } = useGQ();
  const [search, setSearch] = useState("");

  /* Edit / Add Modal state */
  const [openModal, setOpenModal] = useState(false);
  const [editCust, setEditCust] = useState<any>(null);

  /* Customer Details Popup Modal state */
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [viewCust, setViewCust] = useState<any>(null);

  /* Pay Modal state */
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [payModalInvoice, setPayModalInvoice] = useState<any>(null);

  const handlePayClick = (c: any, customerQuotes: any[], e: React.MouseEvent) => {
    e.stopPropagation();
    const unpaidInv =
      customerQuotes.find(
        (inv) =>
          !isCancelled(inv) &&
          Math.max(0, (Number(inv.totals?.grandTotal) || 0) - (Number(inv.paidAmount) || 0)) > 0,
      ) || customerQuotes[0];

    if (unpaidInv) {
      setPayModalInvoice(unpaidInv);
      setPayModalOpen(true);
    } else {
      handleOpenDetails(c, e);
      setShowAddPayment(true);
    }
  };

  const handleConfirmPaymentDetails = (details: ConfirmPaymentDetails) => {
    if (!payModalInvoice) return;
    const grandTotal = Number(payModalInvoice.totals?.grandTotal) || 0;
    const currentPaid = Number(payModalInvoice.paidAmount) || 0;
    const pendingAmount = Math.max(0, grandTotal - currentPaid);

    if (details.paidAmount > pendingAmount) {
      toast.error(`Payment amount cannot exceed pending balance of ₹${nf(pendingAmount)}`);
      return;
    }

    const newPaidAmount = Math.min(grandTotal, currentPaid + details.paidAmount);
    const remaining = Math.max(0, grandTotal - newPaidAmount);

    patchInvoice(payModalInvoice.id, {
      paidAmount: newPaidAmount,
      remainingBalance: remaining,
      paymentStatus:
        newPaidAmount >= grandTotal ? "PAID" : newPaidAmount > 0 ? "PARTIAL" : "UNPAID",
      dueDate: details.dueDate || payModalInvoice.dueDate,
    });

    savePayment({
      date: new Date().toISOString().split("T")[0],
      custName: payModalInvoice.cust?.name || payModalInvoice.custName || "",
      invoiceNo: payModalInvoice.no || payModalInvoice.orderNo || "",
      invoiceId: payModalInvoice.id,
      amount: details.paidAmount,
      mode: details.paymentType,
      refNo: details.refNo,
      notes: details.notes,
    });

    toast.success(`Payment of ₹${nf(details.paidAmount)} recorded successfully`);
    setPayModalOpen(false);
    setPayModalInvoice(null);
  };

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

  /* One-shot: consume ?action=new once, then drop it from the URL so a refresh
     does not reopen the dialog over work already in progress. */
  const quickAddConsumed = useRef(false);
  useEffect(() => {
    if (searchParams?.action === "new") {
      if (quickAddConsumed.current) return;
      quickAddConsumed.current = true;
      handleOpenAdd();
      navigate({ to: "/customers", search: {} as any, replace: true });
    } else {
      quickAddConsumed.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams?.action]);

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
    const name = String(c?.name || "")
      .trim()
      .toLowerCase();
    const candidates = invoices.filter(
      (x) =>
        String(x.cust?.name || "")
          .trim()
          .toLowerCase() === name &&
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
    toast.success(`Started Proforma Invoice for ${c.name}`);
    navigate({ to: "/booking" });
  };

  /* Filter customer's invoices and payments when detail popup is open.
     Restricted to one record per order: a confirmed booking and the Proforma
     Invoice raised from it both carry the same grandTotal, so the ledger was
     billing this customer twice for every confirmed order — and the Due Balance
     underneath, being Total Invoiced minus Total Paid, inherited the error. */
  const viewCustNameLower = String(viewCust?.name || "")
    .trim()
    .toLowerCase();

  const customerInvoices = useMemo(() => {
    if (!viewCustNameLower) return [];
    return invoices.filter(
      (inv) =>
        String(inv.cust?.name || "")
          .trim()
          .toLowerCase() === viewCustNameLower,
    );
  }, [invoices, viewCustNameLower]);

  const customerPayments = useMemo(() => {
    if (!viewCustNameLower) return [];
    return payments.filter(
      (p) =>
        String(p.custName || "")
          .trim()
          .toLowerCase() === viewCustNameLower,
    );
  }, [payments, viewCustNameLower]);

  const totalInvoicedForViewCust = useMemo(() => {
    return customerInvoices
      .filter((item) => !isCancelled(item))
      .reduce((acc, item) => acc + (Number(item.totals?.grandTotal) || 0), 0);
  }, [customerInvoices]);

  const totalPaidForViewCust = useMemo(() => {
    const totalFromPayments = customerPayments
      .filter((p) => !isPaymentForCancelledInv(p, invoices))
      .reduce((acc, item) => acc + (Number(item.amount) || 0), 0);

    const totalFromInvoices = customerInvoices
      .filter((item) => !isCancelled(item))
      .reduce((acc, item) => acc + (Number(item.paidAmount) || 0), 0);

    return Math.max(totalFromPayments, totalFromInvoices);
  }, [customerPayments, customerInvoices, invoices]);

  const dueBalanceForViewCust = Math.max(0, totalInvoicedForViewCust - totalPaidForViewCust);

  const handleAddPaymentSubmit = () => {
    const enteredAmt = Number(payFormData.amount);
    if (!payFormData.amount || isNaN(enteredAmt) || enteredAmt <= 0) {
      toast.error("Enter a valid payment amount");
      return;
    }
    if (!viewCust) return;

    const targetInvNo = payFormData.invoiceNo || customerInvoices[0]?.no || "";
    const targetInv = targetInvNo
      ? invoices.find(
          (x) =>
            String(x.no || "").toLowerCase() === String(targetInvNo).toLowerCase() ||
            String(x.orderNo || "").toLowerCase() === String(targetInvNo).toLowerCase(),
        )
      : null;

    const invPending = targetInv
      ? Math.max(0, Number(targetInv.totals?.grandTotal || 0) - Number(targetInv.paidAmount || 0))
      : dueBalanceForViewCust;

    const maxAllowed = targetInv ? invPending : dueBalanceForViewCust;

    if (maxAllowed <= 0 && dueBalanceForViewCust <= 0) {
      toast.error("This customer has no pending balance due.");
      return;
    }

    if (maxAllowed > 0 && enteredAmt > maxAllowed) {
      toast.error(`Payment amount cannot exceed pending balance of ₹${nf(maxAllowed)}`);
      return;
    }

    savePayment({
      custName: viewCust.name,
      custId: viewCust.id,
      invoiceNo: targetInvNo,
      date: payFormData.date,
      amount: enteredAmt,
      mode: payFormData.mode,
      refNo: payFormData.refNo,
      notes: payFormData.notes,
    });

    if (targetInvNo) {
      const targetInv = invoices.find(
        (x) =>
          String(x.no || "").toLowerCase() === String(targetInvNo).toLowerCase() ||
          String(x.orderNo || "").toLowerCase() === String(targetInvNo).toLowerCase(),
      );
      if (targetInv && !isCancelled(targetInv)) {
        const curPaid = Number(targetInv.paidAmount || 0);
        const newPaid = curPaid + Number(payFormData.amount);
        const gTotal = Number(targetInv.totals?.grandTotal || 0);
        const newRemaining = Math.max(0, gTotal - newPaid);
        const newPaymentStatus = newRemaining <= 0 ? "paid" : newPaid > 0 ? "partial" : "unpaid";
        patchInvoice(targetInv.id, {
          paidAmount: newPaid,
          remainingBalance: newRemaining,
          paymentStatus: newPaymentStatus,
          paymentRef: payFormData.refNo || targetInv.paymentRef,
          paymentNotes: payFormData.notes || targetInv.paymentNotes,
        });
      }
    }

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
        list.push({
          id:
            inv.cust.id ||
            "cus-" +
              Math.abs(nameLower.split("").reduce((a, b) => (a << 5) - a + b.charCodeAt(0), 0)),
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
    });
    return dedupeCustomers(list);
  }, [customers, invoices]);

  /* Metrics counts */
  const totalCustomers = allCustomers.length;
  const activeCount = useMemo(
    () => allCustomers.filter((c) => (c.status || "active") === "active").length,
    [allCustomers],
  );
  const pendingKycCount = useMemo(
    () => allCustomers.filter((c) => c.status === "pending").length,
    [allCustomers],
  );

  const customerTotals = useMemo(() => {
    let grandTotalSum = 0;
    let receivedSum = 0;
    let dueSum = 0;

    allCustomers.forEach((c) => {
      const nameLower = String(c.name || "")
        .trim()
        .toLowerCase();
      const customerQuotes = invoices.filter(
        (inv) =>
          String(inv.cust?.name || "")
            .trim()
            .toLowerCase() === nameLower && !isCancelled(inv),
      );
      const custPays = payments.filter(
        (p) =>
          String(p.custName || "")
            .trim()
            .toLowerCase() === nameLower && !isPaymentForCancelledInv(p, invoices),
      );

      const totalPaidFromPayments = custPays.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      const totalPaidFromInvoices = customerQuotes.reduce(
        (sum, inv) => sum + (Number(inv.paidAmount) || 0),
        0,
      );
      const totalAmount = customerQuotes.reduce(
        (sum, inv) => sum + (Number(inv.totals?.grandTotal) || 0),
        0,
      );
      const receivedAmount = Math.max(totalPaidFromPayments, totalPaidFromInvoices);
      const dueAmount = Math.max(0, totalAmount - receivedAmount);

      grandTotalSum += totalAmount;
      receivedSum += receivedAmount;
      dueSum += dueAmount;
    });

    return { grandTotalSum, receivedSum, dueSum };
  }, [allCustomers, invoices, payments]);

  const ALPHABET = ["ALL", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")];
  const [letterFilter, setLetterFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  /* Filtered customers list */
  const filteredCustomers = useMemo(() => {
    return allCustomers.filter((c) => {
      const nameStr = String(c.name || "").trim();
      const q = search.toLowerCase().trim();

      const cInvoices = invoices.filter(
        (inv) =>
          String(inv.cust?.name || "").toLowerCase() === nameStr.toLowerCase() ||
          (c.id && String(inv.cust?.id || "") === String(c.id)),
      );
      const matchInvoiceNo = cInvoices.some(
        (inv) =>
          String(inv.no || "")
            .toLowerCase()
            .includes(q) ||
          String(inv.orderNo || "")
            .toLowerCase()
            .includes(q) ||
          String(inv.preProformaNo || "")
            .toLowerCase()
            .includes(q) ||
          formatPiNo(inv.no).toLowerCase().includes(q) ||
          formatOrderId(inv.orderNo).toLowerCase().includes(q),
      );

      const matchSearch =
        !search ||
        nameStr.toLowerCase().includes(q) ||
        String(c.phone || "")
          .toLowerCase()
          .includes(q) ||
        String(c.gstin || "")
          .toLowerCase()
          .includes(q) ||
        String(c.city || "")
          .toLowerCase()
          .includes(q) ||
        String(c.id || "")
          .toLowerCase()
          .includes(q) ||
        matchInvoiceNo;

      const matchLetter = letterFilter === "ALL" || nameStr.toUpperCase().startsWith(letterFilter);

      return matchSearch && matchLetter;
    });
  }, [allCustomers, invoices, search, letterFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredCustomers.length / (pageSize || filteredCustomers.length || 1)),
  );

  const paginatedCustomers = useMemo(() => {
    if (pageSize === 0) return filteredCustomers;
    const start = (page - 1) * pageSize;
    return filteredCustomers.slice(start, start + pageSize);
  }, [filteredCustomers, page, pageSize]);

  return (
    <div className="w-full space-y-4 px-3 pt-4 pb-2 sm:space-y-5 sm:px-6 sm:pt-6 sm:pb-12 lg:px-8">
      {/* ── Page Title Header ───────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Customers</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage customer database, invoice history, and payment records
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Add / Edit Customer Modal */}
          <Dialog open={openModal} onOpenChange={setOpenModal}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                onClick={handleOpenAdd}
                className="h-8 text-xs gap-1.5 bg-primary text-primary-foreground font-semibold shadow-sm"
              >
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
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel"
                      className="h-8 text-xs font-mono"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          phone: e.target.value.replace(/\D/g, "").slice(0, 10),
                        })
                      }
                      maxLength={10}
                      placeholder="9799998611"
                    />
                  </div>
                  <div>
                    <Label>GSTIN Number</Label>
                    <Input
                      className="h-8 text-xs font-mono uppercase"
                      value={formData.gstin}
                      onChange={(e) =>
                        setFormData({ ...formData, gstin: e.target.value.toUpperCase() })
                      }
                      placeholder="08AACCH4208C1Z3"
                    />
                  </div>
                </div>

                <div>
                  <Label>Email Address</Label>
                  <Input
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    autoCapitalize="none"
                    className="h-8 text-xs"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="hindustan@live.in"
                  />
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
                <Button variant="outline" size="sm" onClick={() => setOpenModal(false)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSubmit}>
                  Save Customer
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* ── Summary Metric Cards ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        {/* Card 1: TOTAL CUSTOMERS */}
        <div className="bg-white rounded-xl border border-border p-2.5 sm:p-4 shadow-xs">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Users className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="min-w-0">
              <div className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Total Customers
              </div>
              <div className="text-base sm:text-xl font-bold tracking-tight text-foreground">
                {totalCustomers}
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: TOTAL AMOUNT */}
        <div className="bg-white rounded-xl border border-border p-2.5 sm:p-4 shadow-xs">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="min-w-0">
              <div className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Total Amount
              </div>
              <div className="text-sm sm:text-xl font-bold tracking-tight text-foreground font-mono truncate">
                ₹ {nf(customerTotals.grandTotalSum)}
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: TOTAL RECEIVED AMOUNT */}
        <div className="bg-white rounded-xl border border-border p-2.5 sm:p-4 shadow-xs">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="min-w-0">
              <div className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Total Received
              </div>
              <div className="text-sm sm:text-xl font-bold tracking-tight text-emerald-600 font-mono truncate">
                ₹ {nf(customerTotals.receivedSum)}
              </div>
            </div>
          </div>
        </div>

        {/* Card 4: TOTAL DUE AMOUNT */}
        <div className="bg-white rounded-xl border border-border p-2.5 sm:p-4 shadow-xs">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="min-w-0">
              <div className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Total Due
              </div>
              <div className="text-sm sm:text-xl font-bold tracking-tight text-amber-600 font-mono truncate">
                ₹ {nf(customerTotals.dueSum)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Toolbar Row (Search + Customer Count) ─────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-border rounded-xl p-4 shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9 h-8 text-xs bg-background"
            placeholder="Search by name, contact number, invoice no..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-muted-foreground">
            <span className="font-bold text-foreground">{filteredCustomers.length}</span> customers
          </span>
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
              {search
                ? "No clients match your filter criteria."
                : "Click below to add your first customer."}
            </p>
            <Button size="sm" onClick={handleOpenAdd} className="mt-4 h-8 text-xs">
              <UserPlus className="h-3.5 w-3.5 mr-1.5" /> Add Customer
            </Button>
          </div>
        ) : (
          <>
            {/* ── Phone: one card per customer ── */}
            <MobileList className="p-2.5">
              {paginatedCustomers.map((c: any, i: number) => {
                const { customerQuotes, totalAmount, receivedAmount, dueAmount } = customerSummary(
                  c,
                  invoices,
                  payments,
                );
                const colorClass = AVATAR_COLORS[i % AVATAR_COLORS.length];
                return (
                  <MobileRecordCard
                    key={c.id || i}
                    accent={dueAmount > 0 ? "bg-amber-500" : "bg-emerald-500"}
                    onClick={() => handleOpenDetails(c)}
                    subject={
                      <span className="flex items-center gap-2">
                        <span
                          className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold ${colorClass}`}
                        >
                          {getInitials(c.name)}
                        </span>
                        <span className="truncate">{c.name}</span>
                      </span>
                    }
                    meta={[
                      c.phone || null,
                      c.addr || c.city || null,
                      `${customerQuotes.length} invoice${customerQuotes.length === 1 ? "" : "s"}`,
                    ]}
                    fields={[
                      { label: "Total", value: `₹ ${nf(totalAmount)}` },
                      { label: "Received", value: `₹ ${nf(receivedAmount)}`, tone: "positive" },
                      {
                        label: "Due",
                        value: `₹ ${nf(dueAmount)}`,
                        tone: dueAmount > 0 ? "warning" : "positive",
                      },
                    ]}
                    actions={
                      <>
                        {c.phone && (
                          <a
                            href={`tel:${String(c.phone).replace(/\s+/g, "")}`}
                            className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-md border border-border bg-background text-xs font-semibold text-foreground"
                          >
                            <Phone className="h-3.5 w-3.5" /> Call
                          </a>
                        )}
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-9 w-9 text-amber-600 border-amber-500/30"
                          title="Work Order & Stickers"
                          onClick={() => openWorkOrderForCust(c)}
                        >
                          <Factory className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-9 w-9"
                          title="View details"
                          onClick={() => handleOpenDetails(c)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-9 w-9"
                          title="Edit customer"
                          onClick={() => handleOpenEdit(c)}
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <ConfirmDelete
                          title={`Delete ${c.name || "this customer"}?`}
                          description="This permanently removes the customer profile from this device and from your Google Sheet. Their invoices and payments are kept, but will no longer be linked to a saved profile."
                          onConfirm={() => deleteCustomer(c.id)}
                        >
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-9 w-9 text-rose-600 border-rose-500/30"
                            title="Delete customer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </ConfirmDelete>
                      </>
                    }
                  />
                );
              })}
            </MobileList>

            {/* ── Tablet and up: the full table ── */}
            <DesktopOnly className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Contact</th>
                    <th className="py-3 px-4">Address</th>
                    <th className="py-3 px-4 text-center">Invoices</th>
                    <th className="py-3 px-4 text-right">Total Amount</th>
                    <th className="py-3 px-4 text-right">Received Amount</th>
                    <th className="py-3 px-4 text-right">Due Amount</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 text-xs">
                  {paginatedCustomers.map((c, i) => {
                    const { customerQuotes, totalAmount, receivedAmount, dueAmount } =
                      customerSummary(c, invoices, payments);

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
                            <div
                              className={`h-8 w-8 rounded-full font-bold text-xs flex items-center justify-center shrink-0 ${colorClass}`}
                            >
                              {getInitials(c.name)}
                            </div>
                            <div>
                              <div className="font-semibold text-foreground leading-tight hover:underline text-primary">
                                {c.name}
                              </div>
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

                        {/* Address */}
                        <td className="py-3 px-4 text-muted-foreground max-w-[220px]">
                          {c.addr || c.city ? (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-muted-foreground/70 shrink-0" />
                              <span className="truncate">{c.addr || c.city}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground/60">—</span>
                          )}
                        </td>

                        {/* Invoices Count */}
                        <td className="py-3 px-4 text-center font-mono font-bold text-foreground">
                          {customerQuotes.length}
                        </td>

                        {/* Total Amount */}
                        <td className="py-3 px-4 text-right font-mono font-bold text-foreground">
                          ₹ {nf(totalAmount)}
                        </td>

                        {/* Received Amount */}
                        <td className="py-3 px-4 text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                          ₹ {nf(receivedAmount)}
                        </td>

                        {/* Due Amount */}
                        <td className="py-3 px-4 text-right font-mono font-bold">
                          <span
                            className={
                              dueAmount > 0
                                ? "text-amber-600 dark:text-amber-400"
                                : "text-emerald-600 dark:text-emerald-400"
                            }
                          >
                            ₹ {nf(dueAmount)}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          <div
                            className="flex items-center justify-end gap-1.5"
                            onClick={(e) => e.stopPropagation()}
                          >
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
            </DesktopOnly>
          </>
        )}

        {/* ── Pagination Bar ────────────────────────────────────────── */}
        {filteredCustomers.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 border-t border-border bg-muted/20 text-xs">
            <div className="text-muted-foreground font-medium">
              Showing{" "}
              <span className="font-bold text-foreground">
                {(page - 1) * (pageSize || filteredCustomers.length) + 1}
              </span>{" "}
              to{" "}
              <span className="font-bold text-foreground">
                {Math.min(page * (pageSize || filteredCustomers.length), filteredCustomers.length)}
              </span>{" "}
              of <span className="font-bold text-foreground">{filteredCustomers.length}</span>{" "}
              customers
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
        <DialogContent className="max-h-[92dvh] w-[calc(100%-1rem)] max-w-3xl overflow-y-auto p-3 sm:w-full sm:p-6">
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
                    <CreditCard className="h-3.5 w-3.5" /> Payment History (
                    {customerPayments.length})
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
                        <div>
                          <span className="text-muted-foreground">Name:</span>{" "}
                          <span className="font-medium">{viewCust.name}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Phone:</span>{" "}
                          <span className="font-mono">{viewCust.phone || "N/A"}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Email:</span>{" "}
                          {viewCust.email || "N/A"}
                        </div>
                        <div>
                          <span className="text-muted-foreground">GSTIN:</span>{" "}
                          <span className="font-mono">{viewCust.gstin || "N/A"}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">City:</span>{" "}
                          {viewCust.city || "Jaipur"}
                        </div>
                      </div>
                    </div>

                    <div className="bg-muted/20 border border-border rounded-lg p-3 space-y-2">
                      <div className="font-semibold text-foreground text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" /> Address Details
                      </div>
                      <div className="space-y-1">
                        <div>
                          <span className="text-muted-foreground font-semibold">
                            Billing Address:
                          </span>
                          <p className="text-muted-foreground text-[11px] whitespace-pre-line mt-0.5">
                            {viewCust.addr || "No billing address stored."}
                          </p>
                        </div>
                        <div className="pt-1">
                          <span className="text-muted-foreground font-semibold">
                            Dispatch / Delivery Address:
                          </span>
                          <p className="text-muted-foreground text-[11px] whitespace-pre-line mt-0.5">
                            {viewCust.ship || "Same as billing address."}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Financial Summary */}
                  <div className="grid grid-cols-3 gap-1.5 sm:gap-3">
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-2 sm:p-3 text-center">
                      <div className="text-[8px] sm:text-[10px] font-bold uppercase text-blue-600">
                        Total Billed
                      </div>
                      <div className="text-xs sm:text-base font-bold font-mono text-blue-700 mt-0.5 truncate">
                        ₹{nf(totalInvoicedForViewCust)}
                      </div>
                    </div>
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2 sm:p-3 text-center">
                      <div className="text-[8px] sm:text-[10px] font-bold uppercase text-emerald-600">
                        Total Paid
                      </div>
                      <div className="text-xs sm:text-base font-bold font-mono text-emerald-700 mt-0.5 truncate">
                        ₹{nf(totalPaidForViewCust)}
                      </div>
                    </div>
                    <div
                      className={`border rounded-lg p-2 sm:p-3 text-center ${dueBalanceForViewCust > 0 ? "bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-300" : "bg-emerald-500/10 border-emerald-500/20 text-emerald-700"}`}
                    >
                      <div className="text-[8px] sm:text-[10px] font-bold uppercase tracking-wider">
                        Due Balance
                      </div>
                      <div className="text-xs sm:text-base font-bold font-mono mt-0.5 truncate">
                        ₹{nf(Math.max(0, dueBalanceForViewCust))}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" size="sm" onClick={() => handleOpenEdit(viewCust)}>
                      <Edit3 className="h-3.5 w-3.5 mr-1" /> Edit Customer Info
                    </Button>
                    <Button size="sm" onClick={() => createQuoteForCust(viewCust)}>
                      <PlusCircle className="h-3.5 w-3.5 mr-1" /> Create Proforma Invoice
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
                    <>
                      <MobileList>
                        {customerInvoices.map((inv: any) => (
                          <MobileRecordCard
                            key={inv.id}
                            accent={
                              isCancelled(inv)
                                ? "bg-rose-500"
                                : inv.status === "order_confirmed"
                                  ? "bg-emerald-500"
                                  : "bg-amber-500"
                            }
                            dimmed={isCancelled(inv)}
                            code={inv.no}
                            badge={
                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                  isCancelled(inv)
                                    ? "bg-rose-500/10 text-rose-600"
                                    : inv.status === "order_confirmed"
                                      ? "bg-emerald-500/10 text-emerald-600"
                                      : "bg-amber-500/10 text-amber-600"
                                }`}
                              >
                                {isCancelled(inv)
                                  ? "Cancelled (not billed)"
                                  : inv.status || "Draft"}
                              </span>
                            }
                            subject={
                              inv.docType === "proforma" ? "Order Confirm" : "Proforma Invoice"
                            }
                            meta={[inv.date, `${inv.items?.length || 0} items`]}
                            fields={[
                              {
                                label: "Grand Total",
                                value: `₹ ${nf(inv.totals?.grandTotal || 0)}`,
                                tone: "positive",
                              },
                            ]}
                            actions={
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-9 w-full gap-1.5 text-xs"
                                onClick={() => {
                                  setDetailModalOpen(false);
                                  navigate({ to: "/invoice", search: { id: inv.id } });
                                }}
                              >
                                <Printer className="h-3.5 w-3.5" /> Open PDF
                              </Button>
                            }
                          />
                        ))}
                      </MobileList>
                      <DesktopOnly className="overflow-x-auto border border-border rounded-lg">
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
                                <td className="p-2.5 text-muted-foreground font-sans">
                                  {inv.date}
                                </td>
                                <td className="p-2.5 font-sans">
                                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-muted font-medium">
                                    {inv.docType === "proforma"
                                      ? "Order Confirm"
                                      : "Proforma Invoice"}
                                  </span>
                                </td>
                                <td className="p-2.5 text-center font-sans">
                                  {inv.items?.length || 0}
                                </td>
                                <td className="p-2.5 text-right font-bold text-emerald-600">
                                  ₹ {nf(inv.totals?.grandTotal || 0)}
                                </td>
                                <td className="p-2.5 text-center font-sans">
                                  {/* Cancelled rows stay listed but no longer feed
                                    Total Invoiced, so they have to look
                                    different or the ledger looks like it lost
                                    money. */}
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                      isCancelled(inv)
                                        ? "bg-rose-500/10 text-rose-600"
                                        : inv.status === "order_confirmed"
                                          ? "bg-emerald-500/10 text-emerald-600"
                                          : "bg-amber-500/10 text-amber-600"
                                    }`}
                                  >
                                    {isCancelled(inv)
                                      ? "Cancelled (not billed)"
                                      : inv.status || "Draft"}
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
                      </DesktopOnly>
                    </>
                  )}
                </TabsContent>

                {/* ── TAB 3: PAYMENT HISTORY ─────────────────────────────── */}
                <TabsContent value="payments" className="space-y-4 pt-3">
                  {/* Top Bar with Totals + Add Payment Button */}
                  <div className="flex items-center justify-between gap-2 bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-lg flex-wrap">
                    <div>
                      <div className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                        Payment Ledger Summary
                      </div>
                      <div className="text-[11px] text-emerald-700/80 dark:text-emerald-400 mt-0.5 flex items-center gap-2 flex-wrap">
                        <span>
                          Total Payments Received:{" "}
                          <span className="font-bold font-mono text-emerald-700 dark:text-emerald-300">
                            ₹ {nf(totalPaidForViewCust)}
                          </span>
                        </span>
                        <span className="text-muted-foreground/40">|</span>
                        <span>
                          Remaining Due:{" "}
                          <span
                            className={`font-bold font-mono px-1.5 py-0.5 rounded text-xs inline-block ${
                              dueBalanceForViewCust > 0
                                ? "bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30"
                                : "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                            }`}
                          >
                            ₹ {nf(Math.max(0, dueBalanceForViewCust))}
                          </span>
                        </span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className={`h-8 text-xs gap-1.5 font-semibold shadow-xs transition-colors ${
                        showAddPayment
                          ? "bg-rose-100 hover:bg-rose-200 text-rose-700 border border-rose-300 dark:bg-rose-950/60 dark:hover:bg-rose-900/80 dark:text-rose-300 dark:border-rose-800"
                          : "bg-emerald-600 hover:bg-emerald-700 text-white"
                      }`}
                      onClick={() => setShowAddPayment((v) => !v)}
                    >
                      {showAddPayment ? (
                        <X className="h-3.5 w-3.5" />
                      ) : (
                        <Plus className="h-3.5 w-3.5" />
                      )}
                      {showAddPayment ? "Close" : "Record New Payment"}
                    </Button>
                  </div>

                  {/* Add Payment Form */}
                  {showAddPayment && (
                    <div className="bg-card border border-border rounded-xl p-4 space-y-3 shadow-sm text-xs">
                      <div className="font-bold text-foreground flex items-center gap-1.5 text-xs">
                        <CreditCard className="h-4 w-4 text-emerald-600" /> Record Payment Received
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                        <div>
                          <Label className="text-[10px]">Payment Date</Label>
                          <Input
                            type="date"
                            className="h-8 text-xs"
                            value={payFormData.date}
                            onChange={(e) =>
                              setPayFormData({ ...payFormData, date: e.target.value })
                            }
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
                              <SelectItem value="Bank Transfer">
                                Bank Transfer (NEFT/RTGS)
                              </SelectItem>
                              <SelectItem value="Cash">Cash</SelectItem>
                              <SelectItem value="Cheque">Cheque</SelectItem>
                              <SelectItem value="Credit Card">Credit / Debit Card</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <div className="flex items-center justify-between">
                            <Label className="text-[10px]">Amount Received (₹) *</Label>
                            {dueBalanceForViewCust > 0 && (
                              <span className="text-[10px] font-mono font-bold text-muted-foreground">
                                Max: ₹{nf(dueBalanceForViewCust)}
                              </span>
                            )}
                          </div>
                          <Input
                            type="number"
                            step="any"
                            min="0.01"
                            max={dueBalanceForViewCust > 0 ? dueBalanceForViewCust : undefined}
                            className={`h-8 text-xs font-mono font-bold mt-0.5 ${
                              dueBalanceForViewCust > 0 &&
                              Number(payFormData.amount) > dueBalanceForViewCust
                                ? "text-rose-600 border-rose-500 focus-visible:ring-rose-500"
                                : ""
                            }`}
                            placeholder={
                              dueBalanceForViewCust > 0
                                ? `Max ₹${nf(dueBalanceForViewCust)}`
                                : "e.g. 10000"
                            }
                            value={payFormData.amount}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === "") {
                                setPayFormData({ ...payFormData, amount: "" });
                                return;
                              }
                              const num = Number(val);
                              if (dueBalanceForViewCust > 0 && num > dueBalanceForViewCust) {
                                toast.warning(
                                  `Payment cannot exceed pending balance of ₹${nf(dueBalanceForViewCust)}`,
                                );
                                setPayFormData({
                                  ...payFormData,
                                  amount: String(dueBalanceForViewCust),
                                });
                              } else {
                                setPayFormData({ ...payFormData, amount: val });
                              }
                            }}
                          />
                          {dueBalanceForViewCust > 0 &&
                            Number(payFormData.amount) > dueBalanceForViewCust && (
                              <span className="text-[10px] text-rose-500 font-semibold mt-0.5 block">
                                Amount cannot exceed pending balance of ₹{nf(dueBalanceForViewCust)}
                              </span>
                            )}
                        </div>

                        <div>
                          <Label className="text-[10px]">Invoice Ref / No (Optional)</Label>
                          <Input
                            className="h-8 text-xs font-mono"
                            placeholder="e.g. PI-1001"
                            value={payFormData.invoiceNo}
                            onChange={(e) =>
                              setPayFormData({ ...payFormData, invoiceNo: e.target.value })
                            }
                          />
                        </div>

                        <div>
                          <Label className="text-[10px]">Transaction / Ref No.</Label>
                          <Input
                            className="h-8 text-xs font-mono"
                            placeholder="e.g. UPI-9872134"
                            value={payFormData.refNo}
                            onChange={(e) =>
                              setPayFormData({ ...payFormData, refNo: e.target.value })
                            }
                          />
                        </div>

                        <div>
                          <Label className="text-[10px]">Notes / Remarks</Label>
                          <Input
                            className="h-8 text-xs"
                            placeholder="e.g. 50% advance received"
                            value={payFormData.notes}
                            onChange={(e) =>
                              setPayFormData({ ...payFormData, notes: e.target.value })
                            }
                          />
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => setShowAddPayment(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                          onClick={handleAddPaymentSubmit}
                        >
                          Save Payment Record
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Payment History Table */}
                  {customerPayments.length === 0 ? (
                    <div className="text-center py-8 text-xs text-muted-foreground space-y-1">
                      <p>No payment entries recorded yet for {viewCust.name}.</p>
                      <p className="text-[11px] text-muted-foreground/70">
                        Click "Record New Payment" above to add payment logs.
                      </p>
                    </div>
                  ) : (
                    <>
                      <MobileList>
                        {customerPayments.map((pay: any) => (
                          <MobileRecordCard
                            key={pay.id}
                            accent="bg-emerald-500"
                            code={pay.invoiceNo || "—"}
                            badge={
                              <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                                {pay.mode || "UPI"}
                              </span>
                            }
                            subject={`₹ ${nf(pay.amount)}`}
                            meta={[pay.date, pay.refNo ? `Ref ${pay.refNo}` : null]}
                            footer={pay.notes || null}
                            actions={
                              <ConfirmDelete
                                title="Delete this payment record?"
                                description={`This permanently removes the ${settings.currency || "₹"} ${nf(pay.amount || 0)} payment dated ${dmy(pay.date)} from this device and from your Google Sheet. The customer’s outstanding balance will go back up by that amount.`}
                                onConfirm={() => deletePayment(pay.id)}
                              >
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-9 w-full gap-1.5 text-xs text-rose-600 border-rose-500/30"
                                >
                                  <Trash2 className="h-3.5 w-3.5" /> Delete payment
                                </Button>
                              </ConfirmDelete>
                            }
                          />
                        ))}
                      </MobileList>
                      <DesktopOnly className="overflow-x-auto border border-border rounded-lg">
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
                                <td className="p-2.5 font-mono text-muted-foreground">
                                  {pay.date}
                                </td>
                                <td className="p-2.5">
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                                    {pay.mode || "UPI"}
                                  </span>
                                </td>
                                <td className="p-2.5 font-mono text-muted-foreground">
                                  {pay.refNo || "—"}
                                </td>
                                <td className="p-2.5 font-mono font-medium text-foreground">
                                  {pay.invoiceNo || "—"}
                                </td>
                                <td className="p-2.5 text-right font-mono font-bold text-emerald-600">
                                  ₹ {nf(pay.amount)}
                                </td>
                                <td className="p-2.5 text-muted-foreground truncate max-w-[150px]">
                                  {pay.notes || "—"}
                                </td>
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
                      </DesktopOnly>
                    </>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── CONFIRM PAYMENT MODAL ── */}
      <ConfirmPaymentModal
        open={payModalOpen}
        invoice={payModalInvoice}
        onClose={() => setPayModalOpen(false)}
        onConfirm={handleConfirmPaymentDetails}
      />
    </div>
  );
}
