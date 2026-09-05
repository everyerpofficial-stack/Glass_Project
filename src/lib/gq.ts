/* =====================================================================
   Glass Quote — data layer.
   This file is a faithful port of the original app.js data/storage/sync/
   print logic. Calculation is delegated entirely to ./calc.js (GlassCalc),
   which is unchanged. No formula lives here.
   ===================================================================== */
import G from "./calc.js";

/* ---------- default settings (verbatim from app.js) ---------- */
export const DEFAULT_TERMS = [
  "The above rates are quoted based on standard available sheet sizes.",
  "For odd shape 10% extra for cutting & 20% extra for grinding shall be charged.",
  "This Performa Invoice is valid only given sizes. In case any change new Performa Invoice will issued and we need approvel for the same.",
  "Delivery period will be 10 days after the receipt of PI conformation.",
  "Order will be processed upon receipt of this PI duly sealed and signed, Subject to commercial clearance and availability of raw materials.",
  "Order once confirmed will not be canceled or returned.",
  "The buyer shall be responsible for the correctness of the delivery address as stated in this PI.",
  "Unloading to be arranged by you.",
  "Breakage of 2% shall be born by you, Above 2% breakage shall be subject to Insurance Coverage.",
  "For Annealed Glass 100% Transit breakage at your risk.",
  "Any claim or rejection has to be brought to our notice within 7 days of delivery.",
  "Payment: 100% Advance.",
  "Validity: 30 days from the date of Performa Invoice.",
  "Errors & Omissions are Expected (E & OE).",
  "24% interest will be charged if payment is not made within due dates.",
];

export const BASE_SETTINGS: any = {
  coName: "Hindustan Float Glass Pvt. Ltd.",
  title: "PROFORMA INVOICE",
  addr: "S-5, Shree Govind Complex,\nPareek College Mode, Jhotwara Road,\nJaipur, Rajasthan, 302013",
  logo: "/logo.png",
  phone: "",
  email: "hindustan@live.in",
  gstin: "08AACCH4208C1Z3",
  pan: "U26109RJ2010PTC031953",
  web: "",
  juris: "Jaipur Jurisdiction",
  prefix: "PI-",
  nextNo: 1001,
  preset: "anand",
  currency: "₹",
  bankName: "HDFC BANK",
  bankAcc: "18432790000120",
  bankIfsc: "HDFC0001843",
  bankBranch: "New Sanganer Road Jaipur",
  terms: DEFAULT_TERMS.join("\n"),
  footer: "",
  extraAreaFormula: "+25mm",
  sheetUrl:
    "https://script.google.com/macros/s/AKfycbzfXV774Og0EuJXX-G7hyJTcnUVVTZtaEuRHliyJbCru9UDxMpnkXn6Vw79j6k8XjSm/exec",
};

export const GLASS_TYPES = [
  "Clear Glass",
  "Clear - T.G.",
  "Toughened Glass",
  "Frosted Glass",
  "Frosted - T.G.",
  "Tinted - T.G.",
  "Reflective Glass",
  "Reflective - T.G.",
  "Laminated Glass",
  "Mirror Glass",
];

export const PRODUCTS_BY_TYPE: Record<string, string[]> = {
  "Clear Glass": [
    "04 MM Clear Glass",
    "05 MM Clear Glass",
    "06 MM Clear Glass",
    "08 MM Clear Glass",
    "10 MM Clear Glass",
    "12 MM Clear Glass",
    "15 MM Clear Glass",
    "19 MM Clear Glass",
  ],
  "Clear - T.G.": [
    "06 MM Clear - T.G.",
    "08 MM Clear - T.G.",
    "10 MM Clear - T.G.",
    "12 MM Clear - T.G.",
    "15 MM Clear - T.G.",
    "19 MM Clear - T.G.",
  ],
  "Toughened Glass": [
    "05 MM Toughened Glass",
    "06 MM Toughened Glass",
    "08 MM Toughened Glass",
    "10 MM Toughened Glass",
    "12 MM Toughened Glass",
    "15 MM Toughened Glass",
    "19 MM Toughened Glass",
  ],
  "Frosted Glass": [
    "05 MM Frosted Glass",
    "06 MM Frosted Glass",
    "08 MM Frosted Glass",
    "10 MM Frosted Glass",
    "12 MM Frosted Glass",
  ],
  "Frosted - T.G.": [
    "06 MM Frosted - T.G.",
    "08 MM Frosted - T.G.",
    "10 MM Frosted - T.G.",
    "12 MM Frosted - T.G.",
  ],
  "Tinted - T.G.": [
    "06 MM Tinted - T.G.",
    "08 MM Tinted - T.G.",
    "10 MM Tinted - T.G.",
    "12 MM Tinted - T.G.",
  ],
  "Reflective Glass": [
    "06 MM Reflective Glass",
    "08 MM Reflective Glass",
    "10 MM Reflective Glass",
    "12 MM Reflective Glass",
  ],
  "Reflective - T.G.": [
    "06 MM Reflective - T.G.",
    "08 MM Reflective - T.G.",
    "10 MM Reflective - T.G.",
    "12 MM Reflective - T.G.",
  ],
  "Laminated Glass": [
    "06 MM Laminated Glass",
    "08 MM Laminated Glass",
    "10 MM Laminated Glass",
    "12 MM Laminated Glass",
  ],
  "Mirror Glass": ["04 MM Mirror Glass", "05 MM Mirror Glass", "06 MM Mirror Glass"],
};

export function detectGlassTypeFromProduct(prodName: string): string {
  if (!prodName || typeof prodName !== "string") return "Clear Glass";
  const trimmed = prodName.trim();
  if (!trimmed) return "Clear Glass";

  // 1. Direct match with GLASS_TYPES
  const exactType = GLASS_TYPES.find((t) => t.toLowerCase() === trimmed.toLowerCase());
  if (exactType) return exactType;

  // 2. Direct match with PRODUCTS_BY_TYPE list
  for (const [gType, prods] of Object.entries(PRODUCTS_BY_TYPE)) {
    if (prods.some((p) => p.toLowerCase() === trimmed.toLowerCase())) {
      return gType;
    }
  }

  // 3. Normalized keyword analysis
  const s = trimmed.toLowerCase();
  const isTG =
    /\b(t\.?\s*g\.?|tg|toughened|tough)\b/i.test(s) ||
    s.includes("t.g.") ||
    s.includes("clear t.g") ||
    s.includes("frosted t.g") ||
    s.includes("tinted t.g") ||
    s.includes("reflective t.g");

  // Check compound types with TG/toughened first
  if (isTG) {
    if (s.includes("frost")) return "Frosted - T.G.";
    if (s.includes("tint")) return "Tinted - T.G.";
    if (s.includes("reflect")) return "Reflective - T.G.";
    if (s.includes("clear") || s.includes("float")) return "Clear - T.G.";
    return "Toughened Glass";
  }

  // Types without TG
  if (s.includes("frost")) return "Frosted Glass";
  if (s.includes("tint")) return "Tinted - T.G.";
  if (s.includes("reflect")) return "Reflective Glass";
  if (s.includes("laminat") || /\blam\b/i.test(s)) return "Laminated Glass";
  if (s.includes("mirror")) return "Mirror Glass";
  if (s.includes("clear") || s.includes("float")) return "Clear Glass";

  // Check substring containment in GLASS_TYPES
  for (const gType of GLASS_TYPES) {
    if (s.includes(gType.toLowerCase())) {
      return gType;
    }
  }

  return "Clear Glass";
}

export const SAMPLE_INVOICE_07321: any = {
  id: "inv-07321",
  no: "07321",
  date: "2026-03-16",
  poNo: "",
  salesPerson: "Mr.I.S.",
  orderNo: "",
  projectRemark: "",
  cust: {
    name: "HINDUSTAN FLOAT GLASS PVT. LTD",
    gstin: "08AACCH4208CIZ3",
    phone: "",
    email: "hindustanorder@gmail.com",
    addr: "Shri Govind Complex, Pareek College Mode,, Jhotwara Road,, Jaipur\nRajasthan (State Code : 8)",
    ship: "Shri Govind Complex, Pareek College Mode,, Jhotwara Road,, Jaipur\nRajasthan (State Code : 8)",
  },
  glass: {
    desc: "12 mm Clear T.G.----+ With Polish Grinding",
    thickness: 12,
    batchNo: "12227",
    defaultRate: 1500,
  },
  items: [
    {
      id: "it-1",
      desc: "12 mm Clear T.G.----+ With Polish Grinding",
      l1: "119 5/16",
      l2: "48 1/16",
      qty: 1,
      holes: 4,
      cutouts: 2,
      bigCutouts: 0,
      rate: 1500,
      shape: "DRAWING",
      remark: "1",
    },
    {
      id: "it-2",
      desc: "12 mm Clear T.G.----+ With Polish Grinding",
      l1: "34 13/16",
      l2: "60 1/16",
      qty: 1,
      holes: 2,
      cutouts: 1,
      bigCutouts: 0,
      rate: 1500,
      shape: "DRAWING",
      remark: "2",
    },
    {
      id: "it-3",
      desc: "12 mm Clear T.G.----+ With Polish Grinding",
      l1: "83 14/16",
      l2: "29 15/16",
      qty: 1,
      holes: 4,
      cutouts: 1,
      bigCutouts: 0,
      rate: 1500,
      shape: "DRAWING",
      remark: "3",
    },
    {
      id: "it-4",
      desc: "12 mm Clear T.G.----+ With Polish Grinding",
      l1: "83 14/16",
      l2: "29 15/16",
      qty: 1,
      holes: 4,
      cutouts: 1,
      bigCutouts: 0,
      rate: 1500,
      shape: "DRAWING",
      remark: "4",
    },
    {
      id: "it-5",
      desc: "12 mm Clear T.G.----+ With Polish Grinding",
      l1: "119 5/16",
      l2: "48 12/16",
      qty: 1,
      holes: 4,
      cutouts: 1,
      bigCutouts: 1,
      rate: 1500,
      shape: "DRAWING",
      remark: "5",
    },
    {
      id: "it-6",
      desc: "12 mm Clear T.G.----+ With Polish Grinding",
      l1: "119 5/16",
      l2: "48 12/16",
      qty: 1,
      holes: 4,
      cutouts: 1,
      bigCutouts: 0,
      rate: 1500,
      shape: "DRAWING",
      remark: "6",
    },
    {
      id: "it-7",
      desc: "12 mm Clear T.G.----+ With Polish Grinding",
      l1: "119 5/16",
      l2: "48 12/16",
      qty: 1,
      holes: 4,
      cutouts: 1,
      bigCutouts: 0,
      rate: 1500,
      shape: "DRAWING",
      remark: "7",
    },
  ],
  ch: {
    wastageMode: "none",
    wastagePercent: 0,
    wastageArea: 0,
    wastageRate: 0,
    templateCharge: 0,
    otherCharges: 0,
    adminCharge: 50,
    discountPercent: 0,
    insurancePercent: 2,
    gstType: "cgst_sgst",
    cgstPercent: 9,
    sgstPercent: 9,
    igstPercent: 18,
    commissionMode: "none",
    commissionValue: 0,
    commissionBase: "basic",
    roundOff: 1,
  },
  sync: "synced",
  _saved: true,
  createdAt: "2026-03-16T12:30:00.000Z",
};

/* ---------- Customer Deduplication Helper ---------- */
export function dedupeCustomers(customers: any[]): any[] {
  if (!Array.isArray(customers) || customers.length === 0) return [];
  const map = new Map<string, any>();

  for (const c of customers) {
    if (!c) continue;
    const nameTrimmed = String(c.name || "").trim();
    if (!nameTrimmed) continue;

    const nameKey = nameTrimmed.toLowerCase();

    if (map.has(nameKey)) {
      const existing = map.get(nameKey);
      map.set(nameKey, {
        ...c,
        ...existing,
        id: existing.id || c.id,
        name: existing.name || c.name || nameTrimmed,
        phone: existing.phone || c.phone || "",
        email: existing.email || c.email || "",
        gstin: existing.gstin || c.gstin || "",
        city: existing.city || c.city || "",
        addr: existing.addr || c.addr || "",
        ship: existing.ship || c.ship || "",
        status: existing.status || c.status || "active",
      });
    } else {
      map.set(nameKey, {
        ...c,
        name: nameTrimmed,
        phone: c.phone || "",
        email: c.email || "",
        gstin: c.gstin || "",
        city: c.city || "",
        addr: c.addr || "",
        ship: c.ship || "",
        status: c.status || "active",
      });
    }
  }

  return Array.from(map.values());
}

/* ---------- localStorage (same 'gq.' keys as the original app) ---------- */
/* localStorage is this app's only offline copy, so a silent write failure means
   silent data loss. Storage can refuse a write for reasons the user can act on
   (private-mode quota, a full origin), so failures are surfaced once per session
   through this hook rather than being swallowed at 25 call sites. */
let storageFailureReported = false;
let onStorageFailure: ((key: string) => void) | null = null;

export function setStorageFailureHandler(fn: ((key: string) => void) | null) {
  onStorageFailure = fn;
}

export const LS = {
  get<T>(k: string, d: T): T {
    try {
      const v = localStorage.getItem("gq." + k);
      return v ? (JSON.parse(v) as T) : d;
    } catch {
      return d;
    }
  },
  set(k: string, v: unknown) {
    try {
      localStorage.setItem("gq." + k, JSON.stringify(v));
      return true;
    } catch {
      if (!storageFailureReported) {
        storageFailureReported = true;
        try {
          onStorageFailure?.(k);
        } catch {
          /* never let reporting a failure become a second failure */
        }
      }
      return false;
    }
  },
  /* Both keys are removed because early builds wrote un-prefixed keys. Removing
     a key that is not there is a no-op, so a throw here can only mean storage
     itself is unavailable — nothing to recover, and nothing worth interrupting
     the user over. */
  del(k: string) {
    try {
      localStorage.removeItem("gq." + k);
      localStorage.removeItem(k);
    } catch {
      /* storage unavailable — the key is already effectively gone */
    }
  },
  remove(k: string) {
    try {
      localStorage.removeItem("gq." + k);
      localStorage.removeItem(k);
    } catch {
      /* storage unavailable — the key is already effectively gone */
    }
  },
};

/* Next sequence number for a document prefix.
   Derived from the highest number already in use, never from the record count:
   counting means deleting OB-1002 makes the next booking OB-1002 as well, and
   two live documents sharing a number is not something an invoicing system can
   recover from. Scans the whole set so numbers survive deletions and rows
   created on another device. */
export function nextSeqForPrefix(records: any[], prefix: string, start = 1001): number {
  let max = start - 1;
  (records || []).forEach((r: any) => {
    const no = String((r && (r.no || r.orderNo)) || "");
    if (!no.toUpperCase().startsWith(prefix.toUpperCase())) return;
    const digits = no.slice(prefix.length).replace(/\D/g, "");
    if (!digits) return;
    const n = parseInt(digits, 10);
    if (Number.isFinite(n) && n > max) max = n;
  });
  return max + 1;
}

export function getNextProformaNo(records: any[], year?: string): string {
  const y = year || new Date().getFullYear().toString();
  const prefix = `${y}-`;
  let max = 0;
  (records || []).forEach((r: any) => {
    const no = String((r && (r.no || r.orderNo)) || "");
    if (no.includes(prefix)) {
      const parts = no.split(prefix);
      const suffix = parts[parts.length - 1] || "";
      const digits = suffix.replace(/\D/g, "");
      if (digits) {
        const n = parseInt(digits, 10);
        if (Number.isFinite(n) && n > max) max = n;
      }
    }
  });
  const nextSeq = max + 1;
  return `${prefix}${String(nextSeq).padStart(3, "0")}`;
}

export function getNextOrderNo(records: any[], start = 1001): string {
  let max = start - 1;
  (records || []).forEach((r: any) => {
    [r?.orderNo, r?.preProformaNo].forEach((val) => {
      if (!val) return;
      const str = String(val).trim().replace(/^OB-?/i, "");
      if (/^\d+$/.test(str)) {
        const n = parseInt(str, 10);
        if (Number.isFinite(n) && n > max) max = n;
      }
    });
  });
  return String(max + 1);
}

/* ---------- One record per commercial order ----------
   Confirming an Order Booking does not replace it: it mints a Proforma Invoice
   carrying a full copy of the booking's totals and keeps the booking row so the
   audit trail survives. Both rows therefore hold the same grandTotal, and every
   place that summed `invoices` straight — the dashboard's Total Revenue, the
   Reports revenue and monthly trend, and a customer's Total Invoiced (and so
   the Due Balance derived from it) — reported one order as two and roughly
   doubled the money on screen.

   A booking is superseded when it has been converted, or when some proforma
   names it as its `preProformaNo` (the /order "load a booking" path copies the
   booking without flipping the original's docType). Superseded bookings drop
   out; everything else counts exactly once. */
export function isSupersededBooking(rec: any, supersededNos: Set<string>): boolean {
  if (!rec) return false;
  if (rec.docType === "proforma_converted") return true;
  if (rec.docType === "proforma") return false;

  const no = String(rec.no || rec.orderNo || "").trim();
  return Boolean(no) && supersededNos.has(no);
}

/* Booking numbers that some proforma has already been raised against. Collected
   in one pass — checking each record against the whole list instead would make
   this quadratic, and it runs on every dashboard render. */
export function supersededBookingNos(invoices: any[]): Set<string> {
  const set = new Set<string>();
  (invoices || []).forEach((x: any) => {
    if (x?.docType !== "proforma") return;
    const ref = String(x?.preProformaNo || "").trim();
    if (ref) set.add(ref);
  });
  return set;
}

/* ---------- Work order ↔ invoice linkage ----------
   A work order is generated from an invoice and carries three references back:
   `orderId` (the invoice's record id) plus `piNo` / `orderNo` (its document
   numbers). Deleting an invoice used to look for work orders where
   `wo.orderNo === <invoice id>` or `wo.piNo === <invoice id>` — a document
   number compared against a record id, which never matches. Only the `orderId`
   arm ever worked, so any work order written without it survived its invoice,
   and the delete request sent to the sheet used the invoice's id against the
   WorkOrders tab (keyed by the work order's own id) and matched nothing at all.
   Orphans then reappeared on the next sync and the Work Order page rendered
   one for an invoice that no longer existed.

   One rule, used by both the delete cascade and the page's filtering, so the
   two can never disagree about what belongs to what. */
export function workOrderBelongsTo(wo: any, inv: any): boolean {
  if (!wo || !inv) return false;
  if (wo.orderId && inv.id && String(wo.orderId) === String(inv.id)) return true;

  /* Fall back to document numbers — compared like with like. */
  const invNos = [inv.no, inv.orderNo]
    .filter(Boolean)
    .map((v: any) => String(v).trim())
    .filter(Boolean);
  if (!invNos.length) return false;

  return [wo.piNo, wo.orderNo]
    .filter(Boolean)
    .map((v: any) => String(v).trim())
    .some((n: string) => n !== "" && invNos.includes(n));
}

/* Work orders whose invoice is still present. Anything else is an orphan: it
   must not be shown, auto-selected, or printed. */
export function liveWorkOrders(workOrders: any[], invoices: any[]): any[] {
  return (workOrders || []).filter((wo) =>
    (invoices || []).some((inv) => workOrderBelongsTo(wo, inv)),
  );
}

/* One row per commercial order, superseded bookings removed. This is the set to
   list documents from — it still includes cancelled ones, which have to stay
   visible in a customer's history and in the document tables. */
export function commercialRecords(invoices: any[]): any[] {
  const all = invoices || [];
  const superseded = supersededBookingNos(all);
  return all.filter((rec) => !isSupersededBooking(rec, superseded));
}

/* ---------- Cancellation ----------
   Cancelling replaced deleting so the audit trail survives a withdrawn order.
   That only works if a cancelled document stops counting as business: it was
   being listed *and* summed, so a cancelled order kept its full value in
   revenue, in the dashboard's Due From Customer, and in the customer's due
   balance — permanently, with no way to take it back out short of deleting the
   row the cancel feature exists to preserve.

   Hence two sets. `commercialRecords` is what you list; `activeRecords` is what
   you add up. */
export function isCancelled(rec: any): boolean {
  return String(rec?.status || "").toLowerCase() === "cancelled";
}

/* The set to use for any money total or live record count. */
export function activeRecords(invoices: any[]): any[] {
  return commercialRecords(invoices).filter((rec) => !isCancelled(rec));
}

export function sumGrandTotal(records: any[]): number {
  return (records || []).reduce(
    (acc: number, rec: any) => acc + (Number(rec?.totals?.grandTotal) || 0),
    0,
  );
}

export function loadSettings(): any {
  return Object.assign({}, BASE_SETTINGS, G.DEFAULTS, G.PRESETS.anand, LS.get("settings", {}));
}

/* ---------- helpers (verbatim behaviour) ---------- */
export function uid(p?: string) {
  return (p || "id") + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7);
}
export function esc(s: any) {
  return String(s == null ? "" : s).replace(
    /[&<>"]/g,
    (c) => (({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }) as any)[c],
  );
}
export function nf(v: any, d?: number) {
  const dd = d == null ? 2 : d;
  return (Number(v) || 0).toLocaleString("en-IN", {
    minimumFractionDigits: dd,
    maximumFractionDigits: dd,
  });
}
export function cur(v: any, currency = "\u20B9") {
  return currency + " " + nf(v);
}
export function today() {
  const d = new Date();
  return (
    d.getFullYear() +
    "-" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(d.getDate()).padStart(2, "0")
  );
}
export function dmy(iso: string) {
  if (!iso) return "";
  const p = iso.split("-");
  return p[2] + "-" + p[1] + "-" + p[0];
}

export function getPaymentDueDateInfo(inv: any, payments?: any[]) {
  if (!inv) return { dueDate: "", daysLeft: 0, status: "pending", label: "", badgeClass: "" };
  const invDateStr = inv.date || today();
  let dueDateStr = inv.dueDate;
  if (!dueDateStr) {
    const d = new Date(invDateStr);
    if (!isNaN(d.getTime())) {
      d.setDate(d.getDate() + 7);
      dueDateStr = d.toISOString().slice(0, 10);
    } else {
      dueDateStr = invDateStr;
    }
  }

  const grandTotal = Number(inv.totals?.grandTotal || 0);
  let paidAmount = Number(inv.paidAmount || 0);
  if (payments && Array.isArray(payments) && payments.length > 0) {
    const matchedPaid = payments
      .filter((p: any) => {
        if (!p || !p.invoiceNo) return false;
        const pNo = String(p.invoiceNo).trim().toLowerCase();
        const iNo = String(inv.no || "")
          .trim()
          .toLowerCase();
        const oNo = String(inv.orderNo || "")
          .trim()
          .toLowerCase();
        const preNo = String(inv.preProformaNo || "")
          .trim()
          .toLowerCase();
        const pId = String(inv.id || "")
          .trim()
          .toLowerCase();
        return (
          pNo === iNo ||
          (oNo && pNo === oNo) ||
          (preNo && pNo === preNo) ||
          pNo === pId ||
          formatPiNo(pNo) === formatPiNo(iNo)
        );
      })
      .reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);
    paidAmount = Math.max(paidAmount, matchedPaid);
  }

  const pendingAmount = Math.max(0, grandTotal - paidAmount);
  const isPaid = pendingAmount <= 0 && grandTotal > 0;

  if (isPaid) {
    return {
      dueDate: dueDateStr,
      daysLeft: 0,
      status: "paid",
      label: "Paid",
      badgeClass:
        "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-semibold",
    };
  }

  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);
  const targetDueDate = new Date(dueDateStr);
  targetDueDate.setHours(0, 0, 0, 0);

  const diffTime = targetDueDate.getTime() - todayDate.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const overdueDays = Math.abs(diffDays);
    return {
      dueDate: dueDateStr,
      daysLeft: diffDays,
      status: "overdue",
      label: `${overdueDays} ${overdueDays === 1 ? "day" : "days"} overdue`,
      badgeClass:
        "bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30 font-semibold",
    };
  } else if (diffDays === 0) {
    return {
      dueDate: dueDateStr,
      daysLeft: 0,
      status: "due_today",
      label: "Due today",
      badgeClass:
        "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-semibold",
    };
  } else {
    return {
      dueDate: dueDateStr,
      daysLeft: diffDays,
      status: "pending",
      label: `${diffDays} ${diffDays === 1 ? "day" : "days"} left`,
      badgeClass:
        "bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 font-semibold",
    };
  }
}

/* ---------- invoice model (verbatim from app.js) ---------- */
export function blankItem() {
  return {
    id: uid("it"),
    desc: "",
    freq: 8,
    l1: "",
    l2: "",
    l1mm: "",
    l2mm: "",
    qty: 1,
    holes: 0,
    cutouts: 0,
    bigCutouts: 0,
    countersinks: 0,
    csks: 0,
    bigHoles: 0,
    rate: "",
    shape: "BLOCK",
    remark: "",
  } as any;
}

export function blankInvoice(S: any, docType: string = "pre_proforma") {
  const tDay = today();
  const dObj = new Date();
  dObj.setDate(dObj.getDate() + 7);
  const defaultDue = dObj.toISOString().slice(0, 10);
  const y = new Date().getFullYear().toString();
  const initialNo = `${y}-001`;

  return {
    id: uid(docType === "proforma" ? "inv-pi" : "inv-ob"),
    docType,
    no: initialNo,
    orderNo: "",
    date: tDay,
    dueDate: defaultDue,
    poNo: "",
    salesPerson: "Office",
    projectRemark: "",
    inputUnit: S.inputUnit || "inch", // 'inch' | 'mm'
    frequencyEnabled: false,
    productName: "",
    jobType: "WITH MATERIAL",
    workOrderNo: "",
    freightType: "To be Billed",
    cust: { name: "", gstin: "", phone: "", email: "", addr: "", ship: "", clBalance: 0 },
    glass: {
      desc: "",
      thickness: 5,
      batchNo: "",
      defaultRate: 0,
    },
    // Layer system
    layers: [
      {
        id: uid("layer"),
        layerNo: "Item 1",
        productName: "",
        thickness: 5,
        glassName: "",
        rate: "",
        process: "",
        status: "",
      },
    ],
    items: [blankItem()],
    ch: {
      wastageMode: S.wastageMode,
      wastagePercent: S.wastagePercent,
      wastageArea: 0,
      wastageRate: S.wastageRate,
      wastage2Mode: "none",
      wastage2Percent: 0,
      wastage2Area: 0,
      wastage2Rate: 0,
      templateCharge: S.templateCharge,
      otherCharges: 0,
      adminCharge: S.adminCharge,
      discountPercent: 0,
      insurancePercent: S.insurancePercent,
      // Extended charges (Party Invoice Particulars)
      cskRate: S.cskRate || 85,
      bigHoleRate: S.bigHoleRate || 150,
      jamboChargePercent: S.jamboChargePercent || 0,
      nonEconomicPercent: S.nonEconomicPercent || 0,
      farmaCuttingPercent: S.farmaCuttingPercent || 0,
      shapeCuttingPercent: S.shapeCuttingPercent || 0,
      katraPolishRate: S.katraPolishRate || 0,
      designRate: S.designRate || 0,
      screenPrintRate: S.screenPrintRate || 0,
      bewalingChargeRate: S.bewalingChargeRate || 0,
      taperChargeRate: S.taperChargeRate || 0,
      roundCornerRate: S.roundCornerRate || 0,
      tapperRate: S.tapperRate || 0,
      // Customer Invoice charges
      freight: 0,
      unloadingHandling: 0,
      greenTax: 0,
      tcsPercent: 0,
      // Extra area
      extraAreaFormula:
        S.extraAreaFormula && S.extraAreaFormula !== "none" ? S.extraAreaFormula : "+25mm",
      extraAreaCustomMM: S.extraAreaCustomMM || 0,
      // GST
      gstType: S.gstType,
      cgstPercent: S.cgstPercent,
      sgstPercent: S.sgstPercent,
      igstPercent: S.igstPercent,
      commissionMode: S.commissionMode,
      commissionValue: S.commissionValue,
      commissionBase: S.commissionBase,
      roundOff: S.roundOff ? 1 : 0,
    },
    // Delivery & Terms fields (Customer Invoice)
    delivery: {
      terms: "PI Terms",
      paymentTerm: "",
      validityOfPI: "The offer & rates are valid for 07 days",
      unloadingType: "Should be arranged by you",
      packingType: "Extra",
      deliveryPeriod: "4/3 working days of SQUARE / 7 working days For Lam./CPU",
      freightRemark: "Freight to pay basis",
      piAdvance: "",
    },
    sync: "local",
    createdAt: new Date().toISOString(),
  } as any;
}

/* Percentage and per-SqM charges that no screen in the app can set. An early
   build of the booking route seeded four of them into every new invoice's
   `ch` — 10% farma cutting, 10% shape cutting, Rs 150/SqM katra polish and
   Rs 800/SqM screen print — so Basic Amount carried tens of thousands of
   rupees of charges that the document offered no way to switch off. A
   thirteen-piece order at Rs 1530/SqM billed Rs 1,16,929 instead of Rs 65,727.
   The first repair compared each key with `===` against the seeded number and
   bailed out whenever the same key also existed in settings, so a value that
   came back as the string "10" sailed through untouched. `ch` is not an
   authoring surface for any of these, so drop the keys outright and let the
   global settings be their only source. If a screen for them is ever added,
   it belongs in Settings, not on the invoice. */
const NON_INVOICE_CHARGE_KEYS = [
  "jamboChargePercent",
  "nonEconomicPercent",
  "farmaCuttingPercent",
  "shapeCuttingPercent",
  "katraPolishRate",
  "designRate",
  "screenPrintRate",
  "bewalingChargeRate",
  "taperChargeRate",
  "roundCornerRate",
  "tapperRate",
];

/* The same seeds can also sit in a browser's persisted settings blob. Nothing
   writes them there deliberately — there is no field for them — so clear them
   by value, comparing numerically so "150" is caught alongside 150. */
const LEGACY_CHARGE_SEEDS: Record<string, number> = {
  farmaCuttingPercent: 10,
  shapeCuttingPercent: 10,
  katraPolishRate: 150,
  screenPrintRate: 800,
};

/* Key that records the one-time move of stored documents off "+25.4mm".
   Until the Area Formula dropdown gained "+ 25 MM", it offered only "None",
   "+ 25.4 MM" and "Custom", and `blankInvoice` hard-coded "+25.4mm" into
   every new document — so no one ever *chose* 25.4 over 25, it was the only
   millimetre option on the menu. The reference sheet this suite reproduces
   adds a flat 25 mm (84" x 36" bills 2159 x 939, not 2159 x 940), so stored
   documents move onto it once. It runs once and only once: after this flag is
   set, "+ 25.4 MM" is a real choice again and is left exactly as selected. */
export const AREA_FORMULA_MIGRATION_KEY = "areaFormulaFlat25";

/* Move one `ch` off the old hard-coded default. An explicit "none", "+50mm"
   or "custom" was a deliberate choice even then, so those are left alone. */
export function migrateAreaFormula<T>(ch: T): T {
  if (ch && typeof ch === "object" && (ch as any).extraAreaFormula === "+25.4mm") {
    (ch as any).extraAreaFormula = "+25mm";
  }
  return ch;
}

/* Remove the un-editable charges from a saved invoice's `ch`. Mutates and
   returns the object it is given; safe on undefined. */
export function stripNonInvoiceCharges<T>(ch: T): T {
  if (!ch || typeof ch !== "object") return ch;
  for (const key of NON_INVOICE_CHARGE_KEYS) delete (ch as any)[key];
  return ch;
}

/* effective engine settings = global settings + this invoice's charges */
export function engineOpts(S: any, INV: any) {
  /* computeTotals runs inside the provider's useMemo, so anything that throws
     here takes down every route at once, not just the page being viewed. Rows
     rebuilt from the sheet's typed columns (the path used when `fullJSON` is
     missing or unparseable) carry no `ch` and no `glass`, and reading
     `INV.glass.thickness` off one of those was a blank screen with no way back
     short of clearing site data. Treat both as optional. */
  const inv = INV || {};
  const ch = stripNonInvoiceCharges(Object.assign({}, inv.ch || {}));

  const o: any = Object.assign({}, S, ch);
  for (const key in LEGACY_CHARGE_SEEDS) {
    if (Number(o[key]) === LEGACY_CHARGE_SEEDS[key]) o[key] = 0;
  }
  o.thicknessMM = inv.glass?.thickness;
  /* Only override when the record actually carries the flag — forcing `false`
     on a record with no `ch` would silently turn off rounding that the saved
     settings ask for. */
  if (ch.roundOff !== undefined) o.roundOff = String(ch.roundOff) === "1";
  o.inputUnit = inv.inputUnit || S.inputUnit || "inch";
  o.frequencyEnabled = o.inputUnit === "mm" ? false : Boolean(inv.frequencyEnabled);
  return G.settings(o);
}

/* single source of truth for every number shown in the UI */
export function computeTotals(S: any, INV: any) {
  INV = INV || {};
  let allItems: any[] = [];
  if (INV.layers && INV.layers.length > 0) {
    allItems = INV.layers.flatMap((l: any, idx: number) => {
      let lItems = l.items && l.items.length > 0 ? l.items : [];
      if (idx === 0 && lItems.length === 0 && INV.items && INV.items.length > 0) {
        lItems = INV.items;
      }
      return lItems.map((it: any) => {
        const itemRate =
          it.rate !== "" && it.rate != null
            ? Number(it.rate)
            : l.rate !== "" && l.rate != null
              ? Number(l.rate)
              : INV.glass?.defaultRate
                ? Number(INV.glass.defaultRate)
                : 0;
        const itemDesc =
          it.desc ||
          l.glassName ||
          (l.thickness
            ? `${l.thickness} mm ${l.productName || "Glass"}`
            : l.productName || INV.glass?.desc);
        return Object.assign({}, it, {
          rate: itemRate,
          desc: itemDesc,
          layerNo: l.layerNo || `Layer - ${idx + 1}`,
          layerIdx: idx,
          productName: l.productName || it.productName || "",
          thickness: l.thickness || it.thickness,
          glassName: l.glassName || it.glassName || "",
          glassType: l.glassType || it.glassType || "",
        });
      });
    });
  }
  if (!allItems.length) {
    allItems = (INV.items || []).map((it: any) =>
      Object.assign({}, it, {
        rate: it.rate === "" || it.rate == null ? INV.glass?.defaultRate : it.rate,
        desc: it.desc || INV.glass?.desc,
        layerIdx: 0,
        productName: it.productName || INV.productName || it.desc || INV.glass?.desc || "",
        glassName: it.glassName || INV.glass?.desc || "",
        glassType: it.glassType || INV.glassType || "",
      }),
    );
  }
  const res = G.calcInvoice(allItems, engineOpts(S, INV));
  if (res && Array.isArray(res.lines)) {
    res.lines = res.lines.map((line: any, idx: number) => {
      const src = allItems[idx] || {};
      return {
        ...src,
        ...line,
        productName: src.productName || line.productName || "",
        glassName: src.glassName || line.glassName || "",
        glassType: src.glassType || line.glassType || "",
        desc: src.desc || line.desc || "",
        layerIdx: src.layerIdx !== undefined ? src.layerIdx : line.layerIdx,
        layerNo: src.layerNo || line.layerNo,
      };
    });
  }
  return res;
}

export function isRateEntered(val: any): boolean {
  if (val === "" || val == null) return false;
  const str = String(val).trim();
  if (!str) return false;
  const num = Number(str);
  return !isNaN(num) && num > 0;
}

export function hasEnteredRateForInvoice(INV: any): boolean {
  if (!INV) return false;

  if (INV.layers && INV.layers.length > 0) {
    for (const l of INV.layers) {
      const layerRateOk = isRateEntered(l.rate);
      const items = l.items || [];
      if (items.length > 0) {
        for (const it of items) {
          const itemRateOk = isRateEntered(it.rate);
          if (!layerRateOk && !itemRateOk) {
            return false;
          }
          if (it.rate !== "" && it.rate != null && String(it.rate).trim() !== "" && !itemRateOk) {
            return false;
          }
        }
      } else {
        if (!layerRateOk) return false;
      }
    }
    return true;
  }

  if (INV.items && INV.items.length > 0) {
    for (const it of INV.items) {
      if (!isRateEntered(it.rate)) return false;
    }
    return true;
  }

  return false;
}

/* ---------- the saved record shape (unchanged columns) ---------- */
export function buildRecord(INV: any, TOT: any) {
  const rec = JSON.parse(JSON.stringify(INV));
  if (rec.layers && rec.layers.length > 0) {
    rec.items = rec.layers.flatMap((l: any, idx: number) => {
      const lItems =
        l.items && l.items.length > 0 ? l.items : idx === 0 && INV.items ? INV.items : [];
      return lItems.map((it: any) =>
        Object.assign({}, it, {
          layerIdx: idx,
          glassType: it.glassType || l.glassType || "",
          productName: it.productName || l.productName || "",
          glassName: it.glassName || l.glassName || "",
          thickness: it.thickness || l.thickness,
        }),
      );
    });
    if (!rec.productName && rec.layers[0]) {
      rec.productName = rec.layers[0].productName || rec.layers[0].glassName || "";
    }
    if (!rec.glassType && rec.layers[0]) {
      rec.glassType = rec.layers[0].glassType || "";
    }
  }
  rec.totals = {
    qty: TOT.qty,
    sqm: TOT.sqm,
    sqft: TOT.sqft,
    weightKg: TOT.weightKg,
    glassAmount: TOT.glassAmount,
    wastageArea: TOT.wastageArea,
    wastageAmount: TOT.wastageAmount,
    basicAmount: TOT.basicAmount,
    adminCharge: TOT.adminCharge,
    subTotal: TOT.subTotal,
    insurance: TOT.insurance,
    assessableValue: TOT.assessableValue,
    cgst: TOT.cgst,
    sgst: TOT.sgst,
    igst: TOT.igst,
    grossTotal: TOT.grossTotal,
    roundOff: TOT.roundOff,
    grandTotal: TOT.grandTotal,
    commission: TOT.commission,
    amountInWords: TOT.amountInWords,
  };
  rec.calc = TOT.lines
    .filter((l: any) => l.ok)
    .map((l: any, i: number) => ({
      sr: i + 1,
      lMM: l.lMM,
      wMM: l.wMM,
      lChgMM: G.round(l.lChgMM, 2),
      wChgMM: G.round(l.wChgMM, 2),
      sqm: l.totalSqm,
      sqft: l.totalSqft,
      amount: l.amount,
    }));
  rec._saved = true;
  rec.updatedAt = new Date().toISOString();
  return rec;
}

/* ---------- Apps Script transport (timeout + graceful failure) ----------
   Apps Script web apps have no hard response-time ceiling: a cold start plus
   a slow sheet read can hang a fetch() for a minute. Every request therefore
   runs under an AbortController so a stalled network can never freeze the UI
   or leave `sheetSyncing` stuck on. Writes get a longer budget than reads
   because aborting a write only loses the acknowledgement, not the row.

   The read budget was 8s, on the reasoning that the UI has cached data to fall
   back on. Measured against this deployment, that is under the floor rather
   than a safety margin: eight `getAll` calls in a row came back in 19.9s, 9.6s,
   3.3s, 5.4s, 2.9s, 7.0s, 4.0s, 3.1s. The first call after the script has gone
   idle pays a cold start of roughly twenty seconds, so the poll aborted, every
   tab was marked failed, and the header flipped to "Offline" while the backend
   was in fact healthy and answering. Aborting also does not stop the Apps
   Script execution — it keeps running server-side, and because Apps Script
   serialises executions per user, the retry 30s later queued behind the
   abandoned one and timed out too. That is the loop that made "Offline" stick.

   30s clears the measured cold start with headroom and still bounds a hang. */
export const SHEET_READ_TIMEOUT_MS = 30000;
export const SHEET_WRITE_TIMEOUT_MS = 15000;

export class SheetTimeoutError extends Error {
  constructor(ms: number) {
    super(`Google Sheets did not respond within ${Math.round(ms / 1000)}s`);
    this.name = "SheetTimeoutError";
  }
}

function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  /* AbortSignal.timeout() is not in every WebView this app is opened from, so
     drive the controller manually. */
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...init, signal: controller.signal })
    .catch((err: any) => {
      if (err && err.name === "AbortError") throw new SheetTimeoutError(timeoutMs);
      /* A cross-origin failure surfaces as an opaque "Failed to fetch"; name it
         so the toast is actionable instead of cryptic. */
      throw new Error(
        "Could not reach Google Apps Script. Check the deployment URL in Settings and that the web app is shared with \u201cAnyone\u201d.",
      );
    })
    .finally(() => clearTimeout(timer));
}

function withAction(sheetUrl: string, action: string) {
  return sheetUrl + (sheetUrl.indexOf("?") > -1 ? "&" : "?") + "action=" + action;
}

function sheetGet(sheetUrl: string, action: string): Promise<any> {
  return fetchWithTimeout(
    withAction(sheetUrl, action),
    { redirect: "follow" },
    SHEET_READ_TIMEOUT_MS,
  )
    .then((r) => r.json())
    .then((j) => {
      if (j && j.success) return j;
      throw new Error((j && j.message) || "Sheet returned an error");
    });
}

function sheetPost(
  sheetUrl: string,
  payload: any,
  timeoutMs = SHEET_WRITE_TIMEOUT_MS,
): Promise<any> {
  return fetchWithTimeout(
    sheetUrl,
    {
      method: "POST",
      redirect: "follow",
      /* text/plain keeps this a CORS "simple request" — an application/json
         body would trigger a preflight that Apps Script cannot answer. */
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
    },
    timeoutMs,
  )
    .then((r) => r.json())
    .then((j) => {
      if (j && j.success) return j;
      throw new Error((j && j.message) || "Sheet refused the request");
    });
}

/* Resolves with the sheet's own reply so the caller can surface a
   `numberConflict` (another record already carries this document number) or an
   `oversized` flag instead of just knowing that "it saved". */
export function postInvoice(sheetUrl: string, rec: any): Promise<any> {
  return sheetPost(sheetUrl, { action: "saveInvoice", invoice: rec });
}

/* ---------- Database wipe ----------
   Two things make this different from an ordinary write. It is four
   `deleteRows` calls behind the script lock plus a cold start, so the 15s
   single-record budget expires while the script is still working and the client
   reports a failure for a wipe that actually happened — it gets the bulk budget
   instead. And an Apps Script deployment older than the `clearAll` handler
   answers "Unknown POST action", which used to mean the sheet kept every record
   until somebody redeployed; the same generation gap `fetchSheetSnapshot`
   already covers for `getAll` is covered here by deleting the rows through the
   actions that deployment does know. */
export function clearAllSheetData(
  sheetUrl: string,
  onProgress?: (done: number, total: number) => void,
): Promise<any> {
  return sheetPost(sheetUrl, { action: "clearAll" }, SHEET_BULK_TIMEOUT_MS).catch((err: Error) => {
    if (!/Unknown POST action/i.test(err?.message || "")) throw err;
    return clearSheetRowByRow(sheetUrl, onProgress);
  });
}

/* Sequential by design: every deleteRow shifts the rows below it, and Apps
   Script serialises executions per account anyway, so issuing these in parallel
   would only race two deletes over the same moving row numbers. */
async function clearSheetRowByRow(
  sheetUrl: string,
  onProgress?: (done: number, total: number) => void,
): Promise<any> {
  const snap = await fetchSheetSnapshot(sheetUrl);

  type Job = { id: string; remove: (url: string, id: string) => Promise<boolean> };
  const jobs: Job[] = [];
  const collect = (tab: SheetTabResult<any>, remove: Job["remove"]) => {
    /* A tab that failed to read cannot be cleared, and reporting success on a
       partial wipe would leave rows behind that the caller believes are gone. */
    if (!tab.ok) throw tab.error;
    tab.data.forEach((row: any) => {
      if (row && row.id != null && row.id !== "") jobs.push({ id: String(row.id), remove });
    });
  };
  collect(snap.invoices, deleteInvoiceFromSheet);
  collect(snap.customers, deleteCustomerFromSheet);
  collect(snap.workOrders, deleteWorkOrderFromSheet);
  collect(snap.payments, deletePaymentFromSheet);

  let failed = 0;
  let done = 0;
  for (const job of jobs) {
    try {
      await job.remove(sheetUrl, job.id);
    } catch {
      failed += 1;
    }
    done += 1;
    onProgress?.(done, jobs.length);
  }

  if (failed) {
    throw new Error(
      `${jobs.length - failed} of ${jobs.length} rows were removed, ${failed} could not be deleted. ` +
        "Re-deploy code.gs (Deploy ▸ Manage deployments ▸ Edit ▸ New version) so the wipe runs in one pass.",
    );
  }
  return { success: true, action: "clearAll", cleared: jobs.length, legacy: true };
}

/* A delete the sheet answers with "not found" has already happened — that is a
   success, not something to retry forever. Anything else (timeout, CORS, a
   redeployed URL) means the row is still there and the local delete has to be
   remembered so the next background merge does not bring it back. */
const NOT_FOUND_RE = /not found/i;

function runDelete(p: Promise<any>): Promise<boolean> {
  return p.then(
    () => true,
    (err: Error) => {
      if (NOT_FOUND_RE.test(err?.message || "")) return true;
      throw err;
    },
  );
}

export function pingSheet(sheetUrl: string) {
  return sheetGet(sheetUrl, "ping");
}

/* ---------- Data fetch functions (read from Google Sheets) ---------- */
export function fetchInvoices(sheetUrl: string): Promise<any[]> {
  return sheetGet(sheetUrl, "getInvoices").then((j) => j.invoices || []);
}

export function fetchCustomers(sheetUrl: string): Promise<any[]> {
  return sheetGet(sheetUrl, "getCustomers").then((j) => j.customers || []);
}

export function fetchWorkOrders(sheetUrl: string): Promise<any[]> {
  return sheetGet(sheetUrl, "getWorkOrders").then((j) => j.workOrders || []);
}

export function fetchPayments(sheetUrl: string): Promise<any[]> {
  return sheetGet(sheetUrl, "getPayments").then((j) => j.payments || []);
}

/* ---------- Whole-database read ----------
   Each Apps Script invocation pays a cold start and Apps Script serialises
   concurrent executions for the same user, so four "parallel" tab reads
   actually queue up back-to-back. `action=getAll` (code.gs) returns all four
   collections from one execution. Older deployments do not know that action,
   so fall back to the four reads — issued through Promise.allSettled so one
   failing tab can never reject the whole load or blank out the others. */
export type SheetTabResult<T> = { ok: true; data: T[] } | { ok: false; error: Error };

export type SheetSnapshot = {
  invoices: SheetTabResult<any>;
  customers: SheetTabResult<any>;
  workOrders: SheetTabResult<any>;
  payments: SheetTabResult<any>;
};

function settledToResult(r: PromiseSettledResult<any[]>): SheetTabResult<any> {
  return r.status === "fulfilled"
    ? { ok: true, data: r.value || [] }
    : { ok: false, error: r.reason instanceof Error ? r.reason : new Error(String(r.reason)) };
}

function fetchAllTabsIndividually(sheetUrl: string): Promise<SheetSnapshot> {
  return Promise.allSettled([
    fetchInvoices(sheetUrl),
    fetchCustomers(sheetUrl),
    fetchWorkOrders(sheetUrl),
    fetchPayments(sheetUrl),
  ]).then(([invoices, customers, workOrders, payments]) => ({
    invoices: settledToResult(invoices),
    customers: settledToResult(customers),
    workOrders: settledToResult(workOrders),
    payments: settledToResult(payments),
  }));
}

export function fetchSheetSnapshot(sheetUrl: string): Promise<SheetSnapshot> {
  return sheetGet(sheetUrl, "getAll")
    .then((j) => {
      /* A tab whose read threw comes back as `[]` plus an entry in `failed`.
         Taking that `[]` at face value tells the merge the sheet holds no rows
         for that collection, and the merge then purges every synced row from
         the device — one bad tab wiping the local copy of the customer list.
         Only a tab that actually returned counts as authoritative. */
      const failed = (j && j.failed) || {};
      const tab = (key: keyof SheetSnapshot): SheetTabResult<any> =>
        failed[key]
          ? { ok: false, error: new Error(String(failed[key])) }
          : { ok: true, data: j[key] || [] };

      return {
        invoices: tab("invoices"),
        customers: tab("customers"),
        workOrders: tab("workOrders"),
        payments: tab("payments"),
      };
    })
    .catch((err: Error) => {
      /* Only an Apps Script deployment that predates `getAll` is worth retrying
         tab-by-tab. A timeout or a transport failure means the backend is slow
         or unreachable, and firing four more requests at it would just multiply
         the wait — report the failure and let the caller keep its cache. */
      if (/Unknown GET action/i.test(err.message || "")) {
        return fetchAllTabsIndividually(sheetUrl);
      }
      const failed = { ok: false as const, error: err };
      return {
        invoices: failed,
        customers: failed,
        workOrders: failed,
        payments: failed,
      };
    });
}

/* ---------- Data post functions (write to Google Sheets) ---------- */
export function postCustomer(sheetUrl: string, customer: any) {
  return sheetPost(sheetUrl, { action: "saveCustomer", customer });
}

export function postWorkOrder(sheetUrl: string, workOrder: any) {
  return sheetPost(sheetUrl, { action: "saveWorkOrder", workOrder });
}

export function postPayment(sheetUrl: string, payment: any) {
  return sheetPost(sheetUrl, { action: "savePayment", payment });
}

export function deleteInvoiceFromSheet(sheetUrl: string, id: string) {
  return runDelete(sheetPost(sheetUrl, { action: "deleteInvoice", id }));
}

export function deleteCustomerFromSheet(sheetUrl: string, id: string) {
  return runDelete(sheetPost(sheetUrl, { action: "deleteCustomer", id }));
}

export function deleteWorkOrderFromSheet(sheetUrl: string, id: string) {
  return runDelete(sheetPost(sheetUrl, { action: "deleteWorkOrder", id }));
}

export function deletePaymentFromSheet(sheetUrl: string, id: string) {
  return runDelete(sheetPost(sheetUrl, { action: "deletePayment", id }));
}

export function syncAllToSheet(
  sheetUrl: string,
  data: { invoices?: any[]; customers?: any[]; workOrders?: any[]; payments?: any[] },
) {
  return sheetPost(sheetUrl, { action: "syncAll", ...data }, SHEET_BULK_TIMEOUT_MS);
}

/* ---------- Chunked bulk push ----------
   "Push all to sheet" used to send every record in a single POST under the
   ordinary 15s write budget. Apps Script writes each row one at a time, so a
   real dataset blew straight past it: the client aborted and reported failure
   while the server carried on writing, the local `sync` flags were never
   cleared, and the obvious response — press it again — replayed the whole
   thing. Sending fixed-size batches keeps every request inside a budget the
   backend can actually meet, and makes progress durable: batch 3 failing does
   not undo batches 1 and 2. */
export const SHEET_BULK_TIMEOUT_MS = 120000;
export const SHEET_BULK_CHUNK = 25;

export type BulkPushResult = {
  results: { invoices: number; customers: number; workOrders: number; payments: number };
  failures: { collection: string; id: string; message: string }[];
  /* Ids the sheet confirmed, per collection — only these may be marked synced. */
  savedIds: Record<string, string[]>;
  batchErrors: string[];
};

function chunk<T>(rows: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < rows.length; i += size) out.push(rows.slice(i, i + size));
  return out;
}

export async function pushAllInChunks(
  sheetUrl: string,
  data: { invoices?: any[]; customers?: any[]; workOrders?: any[]; payments?: any[] },
  onProgress?: (done: number, total: number) => void,
): Promise<BulkPushResult> {
  const collections: (keyof typeof data)[] = ["invoices", "customers", "workOrders", "payments"];
  const out: BulkPushResult = {
    results: { invoices: 0, customers: 0, workOrders: 0, payments: 0 },
    failures: [],
    savedIds: { invoices: [], customers: [], workOrders: [], payments: [] },
    batchErrors: [],
  };

  const total = collections.reduce((n, key) => n + (data[key]?.length || 0), 0);
  let done = 0;

  for (const key of collections) {
    const rows = data[key] || [];
    for (const batch of chunk(rows, SHEET_BULK_CHUNK)) {
      const failedIds = new Set<string>();
      try {
        const res = await syncAllToSheet(sheetUrl, { [key]: batch });
        out.results[key] += Number(res?.results?.[key]) || 0;
        (res?.failures || []).forEach((f: any) => {
          out.failures.push(f);
          if (f?.id) failedIds.add(String(f.id));
        });
      } catch (err: any) {
        /* The batch never landed — every id in it stays unsynced. */
        out.batchErrors.push(err?.message || String(err));
        batch.forEach((r: any) => failedIds.add(String(r?.id ?? "")));
      }
      batch.forEach((r: any) => {
        const id = String(r?.id ?? "");
        if (id && !failedIds.has(id)) out.savedIds[key]!.push(id);
      });
      done += batch.length;
      onProgress?.(done, total);
    }
  }

  return out;
}

/* Strip OB- prefix to format order numbers cleanly (numbers only) */
export function formatOrderId(idOrNo: string | undefined | null): string {
  if (!idOrNo) return "—";
  const str = String(idOrNo).trim();
  if (str === "—" || str === "N/A" || str === "" || str === "0") return "—";
  const clean = str.replace(/^OB-?/i, "").trim();
  return clean || "—";
}

/* Format legacy numbers like OB-1007 or OB-1009 into clean PI No format (e.g. 2026-007, 2026-009, 2026-011) */
export function formatPiNo(idOrNo: string | undefined | null, defaultYear?: string): string {
  if (!idOrNo) return "—";
  const str = String(idOrNo).replace(/^#\s*/, "").trim();
  if (!str || str === "—" || str === "N/A" || str === "0") return "—";
  if (/^\d{4}-\d+$/.test(str)) return str;
  const digits = str.replace(/\D/g, "");
  if (!digits) return str;
  const y = defaultYear || new Date().getFullYear().toString();
  const num = parseInt(digits, 10);
  const seq = num > 1000 ? num - 1000 : num;
  return `${y}-${String(seq).padStart(3, "0")}`;
}

/* Robust matcher linking a payment record to its parent invoice / order / booking */
export function matchesInvoicePayment(inv: any, pay: any): boolean {
  if (!inv || !pay) return false;

  // 1. Direct invoice ID match
  if (
    pay.invoiceId &&
    inv.id &&
    String(pay.invoiceId).trim().toLowerCase() === String(inv.id).trim().toLowerCase()
  ) {
    return true;
  }

  // 2. Exact or normalized matching against invoice identifier fields
  const pNo = String(pay.invoiceNo || "")
    .replace(/^#\s*/, "")
    .trim()
    .toLowerCase();
  if (!pNo || pNo === "—" || pNo === "n/a" || pNo === "0") return false;

  const invIdentifiers = [
    String(inv.id || "")
      .trim()
      .toLowerCase(),
    String(inv.no || "")
      .replace(/^#\s*/, "")
      .trim()
      .toLowerCase(),
    String(inv.orderNo || "")
      .replace(/^#\s*/, "")
      .trim()
      .toLowerCase(),
    String(inv.preProformaNo || "")
      .replace(/^#\s*/, "")
      .trim()
      .toLowerCase(),
  ].filter(Boolean);

  if (invIdentifiers.includes(pNo)) return true;

  const formattedPNo = formatPiNo(pNo);
  if (formattedPNo && formattedPNo !== "—") {
    for (const id of invIdentifiers) {
      if (formatPiNo(id) === formattedPNo) return true;
    }
  }

  return false;
}

/* ---------- print / PDF (markup matching exact PDF proforma format) ---------- */
export function buildPrintHTML(
  S: any,
  INV: any,
  TOT: any,
  options?: {
    docTitle?: string;
    noLabel?: string;
    woNo?: string;
  },
) {
  const t = TOT,
    o = t.settings;

  let allItems: any[] = [];
  if (INV.layers && INV.layers.length > 0) {
    allItems = INV.layers.flatMap((l: any, idx: number) => {
      let lItems = l.items && l.items.length > 0 ? l.items : [];
      if (idx === 0 && lItems.length === 0 && INV.items && INV.items.length > 0) {
        lItems = INV.items;
      }
      return lItems.map((it: any) => ({
        ...it,
        layerIdx: idx,
        layerNo: l.layerNo || `Layer - ${idx + 1}`,
        productName: l.productName || "",
        thickness: l.thickness,
        glassName: l.glassName,
      }));
    });
  }
  if (!allItems.length) {
    allItems = (INV.items || []).map((it: any) => ({ ...it, layerIdx: 0 }));
  }

  const lines = TOT.lines
    .map((l: any, i: number) => ({ l, it: allItems[i] || {} }))
    .filter((x: any) => x.l.ok);
  if (!lines.length) return "";

  const terms = (S.terms || "").split("\n").filter((x: string) => x.trim());
  const unitCol = S.rateUnit === "sqft" ? "Sq.Ft" : "SqMtr";
  const productGroups: any[] = [];

  if (INV.layers && INV.layers.length > 0) {
    INV.layers.forEach((l: any, idx: number) => {
      const layerLines = lines.filter(
        (x: any) => x.it.layerIdx === idx || (idx === 0 && x.it.layerIdx === undefined),
      );
      if (layerLines.length > 0) {
        let prodDesc = l.productName || l.glassName;
        if (l.productName && l.thickness) {
          const thkUpper = String(l.thickness).toUpperCase() + "MM";
          const thkSpaceUpper = String(l.thickness).toUpperCase() + " MM";
          const pUpper = String(l.productName).toUpperCase();
          if (!pUpper.includes(thkUpper) && !pUpper.includes(thkSpaceUpper)) {
            prodDesc = `${l.productName} (${l.thickness}MM)`;
          }
        }
        if (!prodDesc) {
          prodDesc = l.thickness ? `${l.thickness} mm Glass` : "Glass";
        }
        productGroups.push({
          index: idx + 1,
          code: l.productCode || String(5904 + idx).padStart(5, "0"),
          title: prodDesc,
          lines: layerLines,
        });
      }
    });
  }

  if (productGroups.length === 0) {
    productGroups.push({
      index: 1,
      code: "05904",
      title:
        INV.glass?.desc ||
        (INV.glass?.thickness
          ? `${INV.glass.thickness} mm ${INV.productName || "Glass"}`
          : INV.productName || "Glass"),
      lines: lines,
    });
  }

  const inputUnit = INV.inputUnit || S.inputUnit || "inch";
  const isFreqOn = inputUnit !== "mm" && Boolean(INV.frequencyEnabled);
  const isMM = inputUnit === "mm";
  const areaUnitLabel = S.rateUnit === "sqft" ? "sq. ft." : "sq mtr.";

  let productTablesHTML = "";

  productGroups.forEach((grp: any) => {
    let grpQty = 0;
    let grpActualArea = 0;
    let grpChargeArea = 0;
    let grpHoles = 0;
    let grpCutouts = 0;
    let grpBigHoles = 0;
    let grpBigCutouts = 0;
    let grpCsks = 0;
    let grpAmount = 0;
    let srNo = 1;

    let rowsHTML = "";
    grp.lines.forEach((x: any) => {
      const lineObj = x.l;
      const it = x.it;

      const lineQty = Number(lineObj.qty) || 1;
      const lineActualArea =
        Number(S.rateUnit === "sqft" ? lineObj.totalSqft : lineObj.totalSqm) || 0;
      const lineChargeArea =
        Number(
          S.rateUnit === "sqft"
            ? (lineObj.chargeAreaSqft ?? lineObj.totalSqft)
            : (lineObj.chargeAreaSqm ?? lineObj.totalSqm),
        ) || 0;
      const lineAmount = Number(lineObj.amount) || 0;

      const holes = Number(it.holes) || 0;
      const cutouts = Number(it.cutouts) || 0;
      const bigHoles = Number(it.bigHoles) || 0;
      const bigCutouts = Number(it.bigCutouts) || 0;
      const csks = Number(it.csks || it.countersinks) || 0;

      grpQty += lineQty;
      grpActualArea += lineActualArea;
      grpChargeArea += lineChargeArea;
      grpHoles += holes;
      grpCutouts += cutouts;
      grpBigHoles += bigHoles;
      grpBigCutouts += bigCutouts;
      grpCsks += csks;
      grpAmount += lineAmount;

      const freqLabel = Number(it.freq) === 16 ? "1/16" : "1/8";

      rowsHTML += `
        <tr>
          <td class="c" style="border:1px solid #000; padding:2px; text-align:center; font-weight:600">${srNo++}</td>
          ${
            !isMM
              ? `${isFreqOn ? `<td class="c" style="border:1px solid #000; padding:2px; text-align:center; font-family:monospace">${freqLabel}</td>` : ""}
          <td class="c" style="border:1px solid #000; padding:2px; text-align:center; font-family:monospace">${esc(it.l1 || "")}</td>
          <td class="c" style="border:1px solid #000; padding:2px; text-align:center; font-family:monospace">${esc(it.l2 || "")}</td>`
              : ""
          }
          <td class="n" style="border:1px solid #000; padding:2px; text-align:center; font-family:monospace; font-weight:600">${lineObj.lMM || ""}</td>
          <td class="n" style="border:1px solid #000; padding:2px; text-align:center; font-family:monospace; font-weight:600">${lineObj.wMM || ""}</td>
          <td class="c" style="border:1px solid #000; padding:2px; text-align:center; font-weight:bold">${lineQty}</td>
          <td class="n" style="border:1px solid #000; padding:2px; text-align:right; font-family:monospace">${nf(lineActualArea, 3)}</td>

          <td class="c" style="border:1px solid #000; padding:2px; text-align:center; font-family:monospace">${holes > 0 ? holes : ""}</td>
          <td class="c" style="border:1px solid #000; padding:2px; text-align:center; font-family:monospace">${cutouts > 0 ? cutouts : ""}</td>
          <td class="c" style="border:1px solid #000; padding:2px; text-align:center; font-family:monospace">${bigHoles > 0 ? bigHoles : ""}</td>
          <td class="c" style="border:1px solid #000; padding:2px; text-align:center; font-family:monospace">${bigCutouts > 0 ? bigCutouts : ""}</td>
          <td class="c" style="border:1px solid #000; padding:2px; text-align:center; font-family:monospace">${csks > 0 ? csks : ""}</td>

          <td class="n" style="border:1px solid #000; padding:2px; text-align:center; font-family:monospace; color:#333">${lineObj.lChgMM || lineObj.lMM || ""}</td>
          <td class="n" style="border:1px solid #000; padding:2px; text-align:center; font-family:monospace; color:#333">${lineObj.wChgMM || lineObj.wMM || ""}</td>
          <td class="c" style="border:1px solid #000; padding:2px; text-align:center">${lineQty}</td>
          <td class="n" style="border:1px solid #000; padding:2px; text-align:right; font-family:monospace; font-weight:600">${nf(lineChargeArea, 3)}</td>

          <td class="n" style="border:1px solid #000; padding:2px; text-align:right; font-family:monospace; font-weight:bold">${nf(lineAmount)}</td>
          <td class="c" style="border:1px solid #000; padding:2px; text-align:left; font-size:6.5pt">${esc(it.remark || "")}</td>
        </tr>
      `;
    });

    const totalColspan = isMM ? 3 : isFreqOn ? 6 : 5;

    const theadHTML = `
      <thead>
        <tr style="background:#EDEDED; font-weight:bold">
          <th rowspan="2" style="border:1px solid #000; padding:2px; text-align:center; width:26px">SR NO</th>
          ${
            !isMM
              ? `${isFreqOn ? `<th rowspan="2" style="border:1px solid #000; padding:2px; text-align:center; width:34px">FREQ</th>` : ""}
          <th rowspan="2" style="border:1px solid #000; padding:2px; text-align:center; width:44px"><div>L1 IN</div><div style="font-size:6pt; font-weight:normal">(INCH)</div></th>
          <th rowspan="2" style="border:1px solid #000; padding:2px; text-align:center; width:44px"><div>L2 IN</div><div style="font-size:6pt; font-weight:normal">(INCH)</div></th>`
              : ""
          }
          <th colspan="4" style="border:1px solid #000; padding:2px; text-align:center">ACTUAL SIZE (ENTER)</th>
          <th rowspan="2" style="border:1px solid #000; padding:2px; text-align:center; width:28px">HOLE</th>
          <th rowspan="2" style="border:1px solid #000; padding:2px; text-align:center; width:34px">CUT OUT</th>
          <th rowspan="2" style="border:1px solid #000; padding:2px; text-align:center; width:32px"><div>BIG</div><div>HOLE</div></th>
          <th rowspan="2" style="border:1px solid #000; padding:2px; text-align:center; width:36px"><div>BIG</div><div>CUT OUT</div></th>
          <th rowspan="2" style="border:1px solid #000; padding:2px; text-align:center; width:28px">CSK</th>
          <th colspan="4" style="border:1px solid #000; padding:2px; text-align:center">CHARGEABLE SIZE (MM)</th>
          <th rowspan="2" style="border:1px solid #000; padding:2px; text-align:right; width:62px">AMOUNT</th>
          <th rowspan="2" style="border:1px solid #000; padding:2px; text-align:left; width:55px">REMARK</th>
        </tr>
        <tr style="background:#EDEDED; font-weight:bold">
          <th style="border:1px solid #000; padding:2px; text-align:center; width:38px"><div>HEIGHT</div><div style="font-size:6pt; font-weight:normal">(MM)</div></th>
          <th style="border:1px solid #000; padding:2px; text-align:center; width:38px"><div>WIDTH</div><div style="font-size:6pt; font-weight:normal">(MM)</div></th>
          <th style="border:1px solid #000; padding:2px; text-align:center; width:26px">PCS</th>
          <th style="border:1px solid #000; padding:2px; text-align:center; width:44px"><div>AREA</div><div style="font-size:5.5pt; font-weight:normal; text-transform:none">(${areaUnitLabel})</div></th>

          <th style="border:1px solid #000; padding:2px; text-align:center; width:38px"><div>HEIGHT</div></th>
          <th style="border:1px solid #000; padding:2px; text-align:center; width:38px"><div>WIDTH</div></th>
          <th style="border:1px solid #000; padding:2px; text-align:center; width:26px">PCS</th>
          <th style="border:1px solid #000; padding:2px; text-align:center; width:44px"><div>AREA</div><div style="font-size:5.5pt; font-weight:normal; text-transform:none">(${areaUnitLabel})</div></th>
        </tr>
      </thead>
    `;

    productTablesHTML += `
      <div style="border:1px solid #000; border-top:0">
        <!-- Product Header Row -->
        <table style="width:100%; border-collapse:collapse">
          <tr style="background:#eef2f6; font-weight:bold; font-size:8pt">
            <td style="border:1px solid #000; width:55px; text-align:center; padding:3px; background:#dbeafe; color:#1e40af">
              <b>${grp.index}</b><br><span style="font-size:7.5pt; font-family:monospace">${esc(grp.code)}</span>
            </td>
            <td style="border:1px solid #000; padding:4px 8px; text-align:left; font-size:8.5pt; text-transform:uppercase">
              <b>${esc(grp.title)}</b>
            </td>
          </tr>
        </table>

        <!-- Product Size Items Table -->
        <table class="items2" style="width:100%; border-collapse:collapse; border-top:0">
          ${theadHTML}
          <tbody>
            ${rowsHTML}
            <tr style="font-weight:bold; background:#f4f4f4; font-size:7pt">
              <td colspan="${totalColspan}" style="border:1px solid #000; text-align:left; padding:2px 4px">Total</td>
              <td class="c" style="border:1px solid #000; text-align:center; font-weight:bold">${grpQty}</td>
              <td class="n" style="border:1px solid #000; text-align:right; font-family:monospace; font-weight:bold">${nf(grpActualArea, 3)}</td>
              <td class="c" style="border:1px solid #000; text-align:center; font-weight:bold">${grpHoles > 0 ? grpHoles : ""}</td>
              <td class="c" style="border:1px solid #000; text-align:center; font-weight:bold">${grpCutouts > 0 ? grpCutouts : ""}</td>
              <td class="c" style="border:1px solid #000; text-align:center; font-weight:bold">${grpBigHoles > 0 ? grpBigHoles : ""}</td>
              <td class="c" style="border:1px solid #000; text-align:center; font-weight:bold">${grpBigCutouts > 0 ? grpBigCutouts : ""}</td>
              <td class="c" style="border:1px solid #000; text-align:center; font-weight:bold">${grpCsks > 0 ? grpCsks : ""}</td>
              <td style="border:1px solid #000"></td>
              <td style="border:1px solid #000"></td>
              <td class="c" style="border:1px solid #000; text-align:center; font-weight:bold">${grpQty}</td>
              <td class="n" style="border:1px solid #000; text-align:right; font-family:monospace; font-weight:bold">${nf(grpChargeArea, 3)}</td>
              <td class="n" style="border:1px solid #000; text-align:right; font-family:monospace; font-weight:bold">${nf(grpAmount)}</td>
              <td style="border:1px solid #000"></td>
            </tr>
          </tbody>
        </table>
      </div>
    `;
  });

  function fr(lbl: string, val: string, cls?: string) {
    return (
      "<tr" +
      (cls ? ' class="' + cls + '"' : "") +
      "><td>" +
      esc(lbl) +
      '</td><td class="n">' +
      val +
      "</td></tr>"
    );
  }
  const summary = [fr("Basic Amount", nf(t.basicAmount))];
  if (t.adminCharge) summary.push(fr("Admin Charge", nf(t.adminCharge)));
  if (t.discount) summary.push(fr("Discount", "-" + nf(t.discount)));
  summary.push(fr("Total", nf(t.subTotal)));
  if (t.insurance)
    summary.push(fr("Insurance " + nf(o.insurancePercent || 2) + " %", nf(t.insurance)));
  summary.push(fr("Ass. Value", nf(t.assessableValue)));
  if (t.cgst) summary.push(fr("C-GST " + nf(o.cgstPercent || 9) + " %", nf(t.cgst)));
  if (t.sgst) summary.push(fr("S-GST " + nf(o.sgstPercent || 9) + " %", nf(t.sgst)));
  if (t.igst) summary.push(fr("IGST " + nf(o.igstPercent || 18) + " %", nf(t.igst)));
  summary.push(fr("Grand Total", nf(t.grandTotal), "gt"));

  const isPre = INV.docType === "pre_proforma";
  const docTitle = options?.docTitle || (isPre ? "PROFORMA INVOICE" : S.title || "ORDER CONFIRM");
  const isWorkOrder = docTitle === "WORK ORDER";
  const noLabel =
    options?.noLabel ||
    (isWorkOrder ? "Order Confirm No." : isPre ? "Proforma Invoice No." : "Order Confirm No.");
  const displayNo = formatPiNo(INV.no);
  const rawOrderNo =
    INV.preProformaNo || (INV.orderNo && INV.orderNo !== INV.no ? INV.orderNo : "");
  const displayOrderNo = formatOrderId(rawOrderNo);
  const woNo =
    options?.woNo ||
    (INV.orderNo
      ? String(INV.orderNo).startsWith("WO-")
        ? INV.orderNo
        : `WO-${INV.orderNo}`
      : "");

  const grandTotalVal = Number(t.grandTotal || 0);
  const paidVal = Number(INV.paidAmount || 0);
  const dueVal = Math.max(0, grandTotalVal - paidVal);
  const isPaidFull = dueVal <= 0 && grandTotalVal > 0;
  const payStatusText = isPaidFull
    ? "PAID IN FULL"
    : paidVal > 0
      ? "PARTIALLY PAID"
      : "UNPAID / CREDIT";
  const payTypeLabel = INV.delivery?.paymentType || INV.delivery?.paymentTerm || "Credit";

  if (!isPre) {
    summary.push(
      `<tr class="pay-row pay-paid" style="border-top:1.5px solid #000; font-weight:bold; background:#f0fdf4; color:#15803d"><td style="padding:3px 6px">Amount Paid</td><td class="n" style="padding:3px 6px; font-weight:bold; text-align:right">₹ ${nf(paidVal)}</td></tr>`,
    );
    summary.push(
      `<tr class="pay-row pay-due" style="font-weight:bold; background:${dueVal > 0 ? "#fffbeb" : "#f0fdf4"}; color:${dueVal > 0 ? "#b45309" : "#15803d"}"><td style="padding:3px 6px">Balance Due</td><td class="n" style="padding:3px 6px; font-weight:bold; text-align:right">₹ ${nf(dueVal)}</td></tr>`,
    );
    summary.push(
      `<tr class="pay-row pay-status" style="background:#f8fafc; font-size:8pt"><td style="padding:3px 6px">Payment Status</td><td class="n" style="padding:3px 6px; font-weight:bold; text-align:right; color:${isPaidFull ? "#15803d" : paidVal > 0 ? "#2563eb" : "#b45309"}">${payStatusText}</td></tr>`,
    );
    if (payTypeLabel) {
      summary.push(
        `<tr style="font-size:7.5pt"><td style="padding:2px 6px">Payment Mode</td><td class="n" style="padding:2px 6px; text-align:right">${esc(payTypeLabel)}</td></tr>`,
      );
    }
    if (INV.dueDate && !isPaidFull) {
      summary.push(
        `<tr style="font-size:7.5pt"><td style="padding:2px 6px">Payment Due Date</td><td class="n" style="padding:2px 6px; text-align:right">${dmy(INV.dueDate)}</td></tr>`,
      );
    }
  }

  return `
    <div class="pdoc">
      <!-- PAGE 1 -->
      <div class="page page-1">
        <div class="ph" style="border:1px solid #000; padding:6px">
          ${S.logo ? `<img class="plogo" src="${esc(S.logo)}" alt="Logo" style="height:44px; width:auto">` : `<div class="plogo"></div>`}
          <div class="pco">
            <h1 style="font-size:14pt; margin:0">${esc(S.coName || "Hindustan Float Glass Pvt. Ltd.")}</h1>
            <div style="font-size:8pt">${esc(S.addr).replace(/\n/g, "<br>")}</div>
            <div style="font-size:8pt">${S.phone ? "Ph.: " + esc(S.phone) : ""}${S.email ? " &nbsp; E-mail : " + esc(S.email) : ""}${S.web ? " &nbsp; Website : " + esc(S.web) : ""}</div>
          </div>
          <div style="text-align:right; font-size:7.5pt; line-height:1.3; flex-shrink:0">
            <div>F No. /MKT/03 &nbsp; Rev No./Date : 01/24/06/2023</div>
            <div style="margin-top:4px"><b>CIN : ${esc(S.pan || "U26109RJ2010PTC031953")}</b></div>
            <div><b>GST No : ${esc(S.gstin || "08AACCH4208C1Z3")}</b></div>
          </div>
        </div>

        <div class="ptitle" style="border:1px solid #000; border-top:0">${docTitle}</div>

        <table class="meta" style="border:1px solid #000; border-top:0">
          <tr>
            <td style="width:50%; border:1px solid #000; padding:4px">
              <b>${noLabel} : ${esc(displayNo)}</b><br>
              ${isWorkOrder && woNo ? `<b>Work Order No. &nbsp;&nbsp;: ${esc(woNo)}</b><br>` : ""}
              Date &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: ${dmy(INV.date)}<br>
              Order No &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: ${esc(displayOrderNo)}
            </td>
            <td style="border:1px solid #000; padding:4px">
              Sales Person &nbsp;&nbsp;&nbsp;: ${esc(INV.salesPerson || "Office")}<br>
              Party PO No. &nbsp;&nbsp;&nbsp;: ${esc(INV.poNo || "—")}<br>
              ${INV.projectRemark || INV.project || INV.projectTitle ? `Project &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: ${esc(INV.projectRemark || INV.project || INV.projectTitle)}<br>` : ""}
            </td>
          </tr>
          <tr>
            <td style="border:1px solid #000; padding:4px">
              <b>M/s. : ${esc(INV.cust?.name || "")}</b><br>
              ${esc(INV.cust?.addr || "").replace(/\n/g, "<br>")}<br>
              ${INV.cust?.phone || INV.cust?.mobile ? "Phone : " + esc(INV.cust?.phone || INV.cust?.mobile) + "<br>" : ""}
              ${INV.cust?.email ? "Email : " + esc(INV.cust.email) + "<br>" : ""}
              <b>GST# : ${esc(INV.cust?.gstin || "")}</b>
            </td>
            <td style="border:1px solid #000; padding:4px">
              <b>Dispatch To : ${esc(INV.cust?.name || "")}</b><br>
              ${esc(INV.cust?.ship || INV.cust?.addr || "").replace(/\n/g, "<br>")}<br>
              ${INV.cust?.phone || INV.cust?.mobile ? "Phone : " + esc(INV.cust?.phone || INV.cust?.mobile) + "<br>" : ""}
              <b>GST# : ${esc(INV.cust?.gstin || "")}</b>
            </td>
          </tr>
        </table>

        <!-- Product Block Tables (Product Name Banner + Size Items + Subtotal per Product) -->
        ${productTablesHTML}

        <!-- Summary Bar Below Tables -->
        <div style="border:1px solid #000; border-top:0; padding:4px 6px; font-weight:bold; font-size:8pt; background:#f9f9f9">
          Qty : ${t.qty} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
          Sq.Ft : ${t.sqft} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
          Sq.Mtr. : ${t.sqm} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
          Weight : ${t.weightKg || "586.410"}
        </div>

        <div class="foot">
          <div class="lft" style="border-right:1px solid #000">
            <div><b>Validity of PI :</b> This offer & rates are Valid for 07 days</div>
            <div><b>Unloading by :</b> Should be arranged by you</div>
            <div><b>Packing Type :</b> Extra</div>
            <div><b>Delivery Period :</b> 4/5 working days of SGU & 6/7 working days For Lami/DGU</div>
            <div><b>Freight :</b> Freight to pay basis</div>
            <div style="font-size:7pt; color:#333; margin-top:3px; font-style:italic">
              Please make sure to double check the performa in terms of Specification size,qty,Rates&taxes.if there is any item not as per your requirement please get the same modified to reflected in PI.
            </div>

            <div style="margin-top:6px; font-family:monospace; font-size:7.5pt">
              <span style="color:#bd1e24; font-weight:bold">Bank Details :</span><br>
              <b style="color:#bd1e24">${esc(S.coName || "Ridhi Sidhi Glasses (India) Pvt. Ltd.")}</b><br>
              ${esc(S.bankName || "HDFC BANK")}<br>
              A/c. No. : ${esc(S.bankAcc || "18432790000120")}<br>
              IFSC : ${esc(S.bankIfsc || "HDFC0001843")}<br>
              Branch : ${esc(S.bankBranch || "New Sanganer Road Jaipur")}
            </div>
          </div>
          <div class="rgt">
            <table>
              ${summary.join("")}
            </table>
          </div>
        </div>

        <div class="words">
          <b>Amount in words :</b> ${esc(t.amountInWords)}
        </div>
      </div>

      <!-- PAGE 2 -->
      <div style="page-break-before: always; margin-top: 28px" class="page page-2">
        <div style="display:flex; justify-content:space-between; border-bottom:1px solid #000; padding-bottom:3px; margin-bottom:8px; font-size:8.5pt; font-weight:bold">
          <div>${isWorkOrder && woNo ? `Work Order No. : ${esc(woNo)} (${displayNo})` : `${noLabel} : ${esc(displayNo)}`}</div>
          <div>${esc(docTitle)}</div>
          <div>Page : 2</div>
        </div>

        <table style="margin-bottom:10px; width:100%; border-collapse:collapse">
          <thead>
            <tr style="background:#EDEDED; font-weight:bold; font-size:8pt">
              <th style="border:1px solid #000; padding:4px; text-align:left">Products</th>
              <th style="border:1px solid #000; padding:4px; text-align:left">Standard Followed by ${esc(S.coName || "RIDHI SIDHI GLASS (I) PVT LTD")}</th>
            </tr>
          </thead>
          <tbody style="font-size:7.8pt">
            <tr><td style="border:1px solid #000; padding:3px 5px">Tempered Flat Glass</td><td style="border:1px solid #000; padding:3px 5px">IS 2553 (Part 1) :2018</td></tr>
            <tr><td style="border:1px solid #000; padding:3px 5px">Heat Strengthened Glass</td><td style="border:1px solid #000; padding:3px 5px">IS 2553 (Part 1) :2018</td></tr>
            <tr><td style="border:1px solid #000; padding:3px 5px">Insulating Glass(Double & Step Glazing)</td><td style="border:1px solid #000; padding:3px 5px">IS 2553 (Part 1) :2018 /EN - 1279</td></tr>
            <tr><td style="border:1px solid #000; padding:3px 5px">Lamination Glass</td><td style="border:1px solid #000; padding:3px 5px">IS 2553 (Part 1) :2018 /EN - 12543</td></tr>
          </tbody>
        </table>

        ${
          terms.length
            ? '<div class="terms" style="border:1px solid #000; padding:6px; font-size:7.4pt; line-height:1.45">' +
              terms.map((x: string, i: number) => `<div>${i + 1}) ${esc(x)}</div>`).join("") +
              "</div>"
            : ""
        }

        <div style="border:1px solid #000; border-top:0; padding:10px 8px 4px; text-align:center; font-size:8pt">
          <div style="font-weight:bold; text-align:center; margin-bottom:20px; font-size:8.5pt">Customer's Acceptance</div>
          <div class="sign" style="display:flex; justify-content:space-between; padding-top:16px">
            <div style="text-align:center"><span style="border-top:1px solid #000; display:inline-block; padding-top:2px; margin-top:16px">Prepared By</span></div>
            <div style="text-align:center"><span style="border-top:1px solid #000; display:inline-block; padding-top:2px; margin-top:16px">Checked By</span></div>
            <div style="text-align:center"><span style="border-top:1px solid #000; display:inline-block; padding-top:2px; margin-top:16px">Sign &amp; Seal</span></div>
            <div style="text-align:center"><span style="border-top:1px solid #000; display:inline-block; padding-top:2px; margin-top:16px"><b>Authorised Signatory</b></span></div>
          </div>
          <div style="display:flex; justify-content:space-between; font-size:7.2pt; color:#555; margin-top:8px; border-top:1px solid #ddd; padding-top:3px">
            <div>Subject to ${esc(S.juris || "Jaipur Jurisdiction")}</div>
            <div>${dmy(INV.date)} 12:30 PM</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

export { G };
