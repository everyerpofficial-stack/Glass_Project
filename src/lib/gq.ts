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
  sheetUrl: "",
};

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
    { id: "it-1", desc: "12 mm Clear T.G.----+ With Polish Grinding", l1: "119 5/16", l2: "48 1/16", qty: 1, holes: 4, cutouts: 2, bigCutouts: 0, rate: 1500, shape: "DRAWING", remark: "1" },
    { id: "it-2", desc: "12 mm Clear T.G.----+ With Polish Grinding", l1: "34 13/16", l2: "60 1/16", qty: 1, holes: 2, cutouts: 1, bigCutouts: 0, rate: 1500, shape: "DRAWING", remark: "2" },
    { id: "it-3", desc: "12 mm Clear T.G.----+ With Polish Grinding", l1: "83 14/16", l2: "29 15/16", qty: 1, holes: 4, cutouts: 1, bigCutouts: 0, rate: 1500, shape: "DRAWING", remark: "3" },
    { id: "it-4", desc: "12 mm Clear T.G.----+ With Polish Grinding", l1: "83 14/16", l2: "29 15/16", qty: 1, holes: 4, cutouts: 1, bigCutouts: 0, rate: 1500, shape: "DRAWING", remark: "4" },
    { id: "it-5", desc: "12 mm Clear T.G.----+ With Polish Grinding", l1: "119 5/16", l2: "48 12/16", qty: 1, holes: 4, cutouts: 1, bigCutouts: 1, rate: 1500, shape: "DRAWING", remark: "5" },
    { id: "it-6", desc: "12 mm Clear T.G.----+ With Polish Grinding", l1: "119 5/16", l2: "48 12/16", qty: 1, holes: 4, cutouts: 1, bigCutouts: 0, rate: 1500, shape: "DRAWING", remark: "6" },
    { id: "it-7", desc: "12 mm Clear T.G.----+ With Polish Grinding", l1: "119 5/16", l2: "48 12/16", qty: 1, holes: 4, cutouts: 1, bigCutouts: 0, rate: 1500, shape: "DRAWING", remark: "7" },
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

/* ---------- localStorage (same 'gq.' keys as the original app) ---------- */
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
      return false;
    }
  },
};

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

/* ---------- invoice model (verbatim from app.js) ---------- */
export function blankItem() {
  return {
    id: uid("it"),
    desc: "",
    l1: "",
    l2: "",
    qty: 1,
    holes: 0,
    cutouts: 0,
    bigCutouts: 0,
    countersinks: 0,
    rate: "",
    shape: "BLOCK",
    remark: "",
  } as any;
}

export function blankInvoice(S: any) {
  return {
    id: uid("inv"),
    no: S.prefix + S.nextNo,
    date: today(),
    poNo: "",
    salesPerson: "Office",
    orderNo: "",
    projectRemark: "",
    cust: { name: "", gstin: "", phone: "", email: "", addr: "", ship: "" },
    glass: {
      desc: "",
      thickness: 5,
      batchNo: "",
      defaultRate: S.rateUnit === "sqft" ? 69 : 807,
    },
    items: [blankItem()],
    ch: {
      wastageMode: S.wastageMode,
      wastagePercent: S.wastagePercent,
      wastageArea: 0,
      wastageRate: S.wastageRate,
      templateCharge: S.templateCharge,
      otherCharges: 0,
      adminCharge: S.adminCharge,
      discountPercent: 0,
      insurancePercent: S.insurancePercent,
      gstType: S.gstType,
      cgstPercent: S.cgstPercent,
      sgstPercent: S.sgstPercent,
      igstPercent: S.igstPercent,
      commissionMode: S.commissionMode,
      commissionValue: S.commissionValue,
      commissionBase: S.commissionBase,
      roundOff: S.roundOff ? 1 : 0,
    },
    sync: "local",
    createdAt: new Date().toISOString(),
  } as any;
}

/* effective engine settings = global settings + this invoice's charges */
export function engineOpts(S: any, INV: any) {
  const o: any = Object.assign({}, S, INV.ch);
  o.thicknessMM = INV.glass.thickness;
  o.roundOff = String(INV.ch.roundOff) === "1";
  return G.settings(o);
}

/* single source of truth for every number shown in the UI */
export function computeTotals(S: any, INV: any) {
  const items = INV.items.map((it: any) =>
    Object.assign({}, it, {
      rate: it.rate === "" || it.rate == null ? INV.glass.defaultRate : it.rate,
      desc: it.desc || INV.glass.desc,
    }),
  );
  return G.calcInvoice(items, engineOpts(S, INV));
}

/* ---------- the saved record shape (unchanged columns) ---------- */
export function buildRecord(INV: any, TOT: any) {
  const rec = JSON.parse(JSON.stringify(INV));
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

/* ---------- Apps Script sync (identical request payload) ---------- */
export function postInvoice(sheetUrl: string, rec: any) {
  return fetch(sheetUrl, {
    method: "POST",
    redirect: "follow",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action: "saveInvoice", invoice: rec }),
  })
    .then((r) => r.json())
    .then((j) => {
      if (j && j.success) return true;
      throw new Error((j && j.message) || "Sheet refused the record");
    });
}

export function pingSheet(sheetUrl: string) {
  return fetch(sheetUrl + (sheetUrl.indexOf("?") > -1 ? "&" : "?") + "action=ping").then((r) =>
    r.json(),
  );
}

/* ---------- print / PDF (markup unchanged from app.js) ---------- */
export function buildPrintHTML(S: any, INV: any, TOT: any) {
  const t = TOT,
    o = t.settings;
  const lines = TOT.lines.map((l: any, i: number) => ({ l, it: INV.items[i] })).filter(
    (x: any) => x.l.ok,
  );
  if (!lines.length) return null;

  const terms = (S.terms || "").split("\n").filter((x: string) => x.trim());
  const unitCol = S.rateUnit === "sqft" ? "Sq.Ft" : "Sq.Mtr";

  const itemRows = lines
    .map((x: any, i: number) => {
      const l = x.l,
        it = x.it;
      return (
        '<tr><td class="c">' +
        (i + 1) +
        "</td><td>" +
        esc(it.desc || INV.glass.desc) +
        "</td>" +
        '<td class="c">' +
        esc(it.l1) +
        '</td><td class="c">' +
        esc(it.l2) +
        "</td>" +
        '<td class="n">' +
        l.lMM +
        '</td><td class="n">' +
        l.wMM +
        "</td>" +
        '<td class="c">' +
        l.qty +
        '</td><td class="c">' +
        (l.holes || "") +
        "</td>" +
        '<td class="c">' +
        (l.cutouts || "") +
        "</td>" +
        '<td class="n">' +
        (S.rateUnit === "sqft" ? l.totalSqft : l.totalSqm) +
        "</td>" +
        '<td class="n">' +
        nf(l.rate) +
        '</td><td class="n">' +
        nf(l.amount) +
        "</td>" +
        '<td class="c">' +
        esc(it.shape || "") +
        "</td><td>" +
        esc(it.remark || "") +
        "</td></tr>"
      );
    })
    .join("");

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
  const summary = [fr("Basic amount", nf(t.basicAmount))];
  if (t.adminCharge) summary.push(fr("Admin charge", nf(t.adminCharge)));
  if (t.discount) summary.push(fr("Discount", "-" + nf(t.discount)));
  summary.push(fr("Total", nf(t.subTotal)));
  if (t.insurance) summary.push(fr("Insurance " + o.insurancePercent + "%", nf(t.insurance)));
  summary.push(fr("Assessable value", nf(t.assessableValue)));
  if (t.cgst) summary.push(fr("C-GST " + o.cgstPercent + "%", nf(t.cgst)));
  if (t.sgst) summary.push(fr("S-GST " + o.sgstPercent + "%", nf(t.sgst)));
  if (t.igst) summary.push(fr("IGST " + o.igstPercent + "%", nf(t.igst)));
  summary.push(fr("Gross total", nf(t.grossTotal)));
  if (t.roundOff) summary.push(fr("Round off", nf(t.roundOff)));
  summary.push(fr("Grand total", nf(t.grandTotal), "gt"));

  return (
    '<div class="pdoc">' +
    '<div class="ph">' +
    (S.logo ? '<img class="plogo" src="' + S.logo + '" alt="">' : '<div class="plogo"></div>') +
    '<div class="pco"><h1>' +
    esc(S.coName || "Your company name") +
    "</h1>" +
    "<div>" +
    esc(S.addr).replace(/\n/g, "<br>") +
    "</div>" +
    "<div>" +
    (S.phone ? "Ph: " + esc(S.phone) : "") +
    (S.email ? " &nbsp;|&nbsp; " + esc(S.email) : "") +
    "</div>" +
    "<div><b>" +
    (S.gstin ? "GST No.: " + esc(S.gstin) : "") +
    "</b></div></div>" +
    '<div style="width:58px"></div>' +
    "</div>" +
    '<div class="ptitle">' +
    esc(S.title) +
    "</div>" +
    '<table class="meta"><tr>' +
    '<td style="width:50%"><b>Proforma No : ' +
    esc(INV.no) +
    "</b><br>PI Date : " +
    dmy(INV.date) +
    "<br>Order No : " +
    esc(INV.orderNo) +
    "</td>" +
    "<td>Project remark : " +
    esc(INV.projectRemark) +
    "<br>Sales person : " +
    esc(INV.salesPerson) +
    "<br>Party PO No. : " +
    esc(INV.poNo) +
    "</td></tr>" +
    "<tr><td><b>M/s. : " +
    esc(INV.cust.name) +
    "</b><br>" +
    esc(INV.cust.addr).replace(/\n/g, "<br>") +
    "<br>Ph: " +
    esc(INV.cust.phone) +
    (INV.cust.email ? " &nbsp; " + esc(INV.cust.email) : "") +
    "<br><b>GSTIN: " +
    esc(INV.cust.gstin) +
    "</b></td>" +
    "<td><b>Dispatch to : " +
    esc(INV.cust.name) +
    "</b><br>" +
    esc(INV.cust.ship || INV.cust.addr).replace(/\n/g, "<br>") +
    "</td></tr>" +
    '<tr><td colspan="2"><b>' +
    esc(INV.glass.desc) +
    "</b>" +
    (INV.glass.batchNo ? " &nbsp; | &nbsp; Batch: " + esc(INV.glass.batchNo) : "") +
    " &nbsp; | &nbsp; Thickness: " +
    esc(INV.glass.thickness) +
    " mm</td></tr></table>" +
    '<table class="items2"><thead><tr>' +
    "<th>SR</th><th>Description</th><th>L1-Inch</th><th>L2-Inch</th><th>Height</th><th>Width</th>" +
    "<th>Qty</th><th>Hole</th><th>CutOu</th><th>Tot Area</th><th>Rate/" +
    unitCol +
    "</th>" +
    "<th>Amount</th><th>Shape</th><th>Remark</th></tr></thead><tbody>" +
    itemRows +
    '<tr><td colspan="6"><b>Total</b></td><td class="c"><b>' +
    t.qty +
    "</b></td><td></td><td></td>" +
    '<td class="n"><b>' +
    (S.rateUnit === "sqft" ? t.sqft : t.sqm) +
    "</b></td><td></td>" +
    '<td class="n"><b>' +
    nf(t.glassAmount) +
    "</b></td><td></td><td></td></tr>" +
    (t.wastageArea
      ? '<tr><td colspan="9" style="text-align:right">Wastage</td><td class="n">' +
        t.wastageArea +
        '</td><td class="n">' +
        nf(o.wastageRate) +
        '</td><td class="n">' +
        nf(t.wastageAmount) +
        "</td><td></td><td></td></tr>"
      : "") +
    "</tbody></table>" +
    '<div class="foot"><div class="lft">' +
    "<b>Qty : " +
    t.qty +
    " &nbsp; Sq.Ft : " +
    t.sqft +
    " &nbsp; Sq.Mtr : " +
    t.sqm +
    (t.weightKg ? " &nbsp; Weight : " + t.weightKg + " kg" : "") +
    "</b><br><br>" +
    (S.bankName
      ? "<b>Bank details</b><br>" +
        esc(S.bankName) +
        "<br>A/c No. : " +
        esc(S.bankAcc) +
        "<br>IFSC : " +
        esc(S.bankIfsc) +
        "<br>Branch : " +
        esc(S.bankBranch)
      : "") +
    '</div><div class="rgt"><table>' +
    summary.join("") +
    "</table></div></div>" +
    '<div class="words"><b>Amount in words :</b> ' +
    esc(t.amountInWords) +
    "</div>" +
    (terms.length
      ? '<div class="terms">' +
        terms.map((x: string, i: number) => i + 1 + ") " + esc(x)).join(" ") +
        "</div>"
      : "") +
    '<div class="sign"><span>Prepared by</span><span>Checked by</span><span>Sign &amp; seal</span><span><b>Authorised signatory</b></span></div>' +
    (S.juris
      ? '<div class="pgno">Subject to ' +
        esc(S.juris) +
        " jurisdiction &nbsp;·&nbsp; " +
        new Date().toLocaleString("en-IN") +
        "</div>"
      : "") +
    "</div>"
  );
}

export { G };
