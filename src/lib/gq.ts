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

export function blankInvoice(S: any) {
  return {
    id: uid("inv"),
    no: S.prefix + S.nextNo,
    date: today(),
    poNo: "",
    salesPerson: "Office",
    orderNo: "",
    projectRemark: "",
    inputUnit: S.inputUnit || "inch",  // 'inch' | 'mm'
    productName: "TOUGHENED GLASS",
    jobType: "WITH MATERIAL",
    workOrderNo: "",
    freightType: "To be Billed",
    cust: { name: "", gstin: "", phone: "", email: "", addr: "", ship: "", clBalance: 0 },
    glass: {
      desc: "",
      thickness: 5,
      batchNo: "",
      defaultRate: S.rateUnit === "sqft" ? 69 : 807,
    },
    // Layer system
    layers: [
      { id: uid("layer"), layerNo: "Item 1", productName: "TOUGHENED GLASS", thickness: 5, glassName: "", rate: "", process: "", status: "" },
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
      farmaCuttingPercent: S.farmaCuttingPercent || 10,
      shapeCuttingPercent: S.shapeCuttingPercent || 10,
      katraPolishRate: S.katraPolishRate || 150,
      designRate: S.designRate || 0,
      screenPrintRate: S.screenPrintRate || 800,
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
      extraAreaFormula: S.extraAreaFormula || "none",
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

/* effective engine settings = global settings + this invoice's charges */
export function engineOpts(S: any, INV: any) {
  const o: any = Object.assign({}, S, INV.ch);
  o.thicknessMM = INV.glass.thickness;
  o.roundOff = String(INV.ch.roundOff) === "1";
  o.inputUnit = INV.inputUnit || S.inputUnit || "inch";
  return G.settings(o);
}

/* single source of truth for every number shown in the UI */
export function computeTotals(S: any, INV: any) {
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
            ? it.rate
            : l.rate !== "" && l.rate != null
            ? l.rate
            : INV.glass?.defaultRate;
        const itemDesc =
          it.desc ||
          l.glassName ||
          (l.thickness
            ? `${l.thickness} mm ${l.productName || "TOUGHENED GLASS"}`
            : l.productName || INV.glass?.desc);
        return Object.assign({}, it, {
          rate: itemRate,
          desc: itemDesc,
          layerNo: l.layerNo || `Layer - ${idx + 1}`,
          productName: l.productName || "TOUGHENED GLASS",
          thickness: l.thickness,
          glassName: l.glassName,
        });
      });
    });
  }
  if (!allItems.length) {
    allItems = (INV.items || []).map((it: any) =>
      Object.assign({}, it, {
        rate: it.rate === "" || it.rate == null ? INV.glass?.defaultRate : it.rate,
        desc: it.desc || INV.glass?.desc,
      }),
    );
  }
  return G.calcInvoice(allItems, engineOpts(S, INV));
}

/* ---------- the saved record shape (unchanged columns) ---------- */
export function buildRecord(INV: any, TOT: any) {
  const rec = JSON.parse(JSON.stringify(INV));
  if (rec.layers && rec.layers.length > 0) {
    rec.items = rec.layers.flatMap((l: any, idx: number) => {
      const lItems = l.items && l.items.length > 0 ? l.items : (idx === 0 && INV.items ? INV.items : []);
      return lItems;
    });
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

/* ---------- print / PDF (markup matching exact PDF proforma format) ---------- */
export function buildPrintHTML(S: any, INV: any, TOT: any) {
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
        layerNo: l.layerNo || `Layer - ${idx + 1}`,
        productName: l.productName || "TOUGHENED GLASS",
        thickness: l.thickness,
        glassName: l.glassName,
      }));
    });
  }
  if (!allItems.length) {
    allItems = INV.items || [];
  }

  const lines = TOT.lines.map((l: any, i: number) => ({ l, it: allItems[i] || {} })).filter(
    (x: any) => x.l.ok,
  );
  if (!lines.length) return "";

  const terms = (S.terms || "").split("\n").filter((x: string) => x.trim());
  const unitCol = S.rateUnit === "sqft" ? "Sq.Ft" : "SqMtr";

  const itemRows = lines
    .map((x: any, i: number) => {
      const l = x.l,
        it = x.it;
      const layerTag = it.layerNo ? ` (${it.layerNo})` : "";
      return (
        '<tr><td class="c">' +
        (i + 1) +
        '</td><td class="c">' +
        esc(it.l1 || "") +
        '</td><td class="c">' +
        esc(it.l2 || "") +
        '</td><td class="n">' +
        l.lMM +
        '</td><td class="n">' +
        l.wMM +
        '</td><td class="c">' +
        l.qty +
        '</td><td class="c">' +
        (it.holes ? it.holes : "") +
        '</td><td class="c">' +
        (it.cutouts ? it.cutouts : "") +
        '</td><td class="n">' +
        (S.rateUnit === "sqft" ? l.totalSqft : l.totalSqm) +
        '</td><td class="n">' +
        nf(l.rate) +
        '</td><td class="n">' +
        nf(l.amount) +
        '</td><td class="c">' +
        esc(it.shape || "DRAWING") +
        '</td><td class="c">' +
        esc((it.remark || (i + 1)) + layerTag) +
        "</td></tr>"
      );
    })
    .join("");

  let opsRows = "";
  if (t.holes > 0) {
    opsRows += `<tr><td colspan="9"></td><td style="text-align:right"><b>Holes</b></td><td class="c"><b>${t.holes}</b></td><td class="c">@ ${nf(o.holeRate || 35)}</td><td class="n"><b>${nf(t.holeCharge)}</b></td></tr>`;
  }
  if (t.cutouts > 0) {
    opsRows += `<tr><td colspan="9"></td><td style="text-align:right"><b>Cutout</b></td><td class="c"><b>${t.cutouts}</b></td><td class="c">@ ${nf(o.cutoutRate || 85)}</td><td class="n"><b>${nf(t.cutoutCharge)}</b></td></tr>`;
  }
  if (t.bigCutouts > 0) {
    opsRows += `<tr><td colspan="9"></td><td style="text-align:right"><b>Big Cutout</b></td><td class="c"><b>${t.bigCutouts}</b></td><td class="c">@ ${nf(o.bigCutoutRate || 500)}</td><td class="n"><b>${nf(t.bigCutoutCharge)}</b></td></tr>`;
  }

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
  if (t.insurance) summary.push(fr("Insurance " + nf(o.insurancePercent || 2) + " %", nf(t.insurance)));
  summary.push(fr("Ass. Value", nf(t.assessableValue)));
  if (t.cgst) summary.push(fr("C-GST " + nf(o.cgstPercent || 9) + " %", nf(t.cgst)));
  if (t.sgst) summary.push(fr("S-GST " + nf(o.sgstPercent || 9) + " %", nf(t.sgst)));
  if (t.igst) summary.push(fr("IGST " + nf(o.igstPercent || 18) + " %", nf(t.igst)));
  summary.push(fr("Gross Total", nf(t.grossTotal)));
  if (t.roundOff) summary.push(fr("Round Off", (t.roundOff > 0 ? "+" : "") + nf(t.roundOff)));
  summary.push(fr("Grand Total", nf(t.grandTotal), "gt"));

  const isPre = INV.docType === "pre_proforma";
  const docTitle = isPre ? "PRE PROFORMA INVOICE" : (S.title || "PROFORMA INVOICE");
  const noLabel = isPre ? "Pre Proforma No" : "Proforma No";

  let glassDescText = "";
  if (INV.layers && INV.layers.length > 0) {
    glassDescText = INV.layers
      .map((l: any) => {
        const info = l.glassName || (l.thickness ? `${l.thickness} mm ${l.productName || "TOUGHENED GLASS"}` : (l.productName || "TOUGHENED GLASS"));
        return `${l.layerNo || "Layer"}: ${info}`;
      })
      .join("  |  ");
  } else {
    glassDescText = INV.glass?.desc || (INV.glass?.thickness ? `${INV.glass.thickness} mm ${INV.productName || "TOUGHENED GLASS"}` : (INV.productName || "TOUGHENED GLASS"));
  }

  return `
    <div class="pdoc">
      <!-- PAGE 1 -->
      <div class="page page-1">
        <div class="ph" style="border:1px solid #000; padding:6px">
          ${S.logo ? `<img class="plogo" src="${S.logo}" alt="Logo" style="height:44px; width:auto">` : `<div class="plogo"></div>`}
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
              <b>${noLabel} : ${esc(INV.no)}</b><br>
              Date &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: ${dmy(INV.date)}<br>
              Order No &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: ${esc(INV.orderNo || "—")}
            </td>
            <td style="border:1px solid #000; padding:4px">
              Project Remark : ${esc(INV.projectRemark || "—")}<br>
              Sales Person &nbsp;&nbsp;&nbsp;: ${esc(INV.salesPerson || "Office")}<br>
              Party PO No. &nbsp;&nbsp;&nbsp;: ${esc(INV.poNo || "—")}
            </td>
          </tr>
          <tr>
            <td style="border:1px solid #000; padding:4px">
              <b>M/s. : ${esc(INV.cust?.name || "")}</b><br>
              ${esc(INV.cust?.addr || "").replace(/\n/g, "<br>")}<br>
              ${INV.cust?.email ? "Email : " + esc(INV.cust.email) + "<br>" : ""}
              <b>GST# : ${esc(INV.cust?.gstin || "")}</b>
            </td>
            <td style="border:1px solid #000; padding:4px">
              <b>Dispatch To : ${esc(INV.cust?.name || "")}</b><br>
              ${esc(INV.cust?.ship || INV.cust?.addr || "").replace(/\n/g, "<br>")}<br>
              <b>GST# : ${esc(INV.cust?.gstin || "")}</b>
            </td>
          </tr>
          <tr>
            <td colspan="2" style="border:1px solid #000; background:#fafafa; font-weight:600; padding:4px">
              <span style="display:inline-block; min-width:60px; font-family:monospace; font-size:10pt">${esc(INV.glass?.batchNo || "12227")}</span>
              &nbsp;&nbsp;&nbsp;&nbsp;
              ${esc(glassDescText)}
            </td>
          </tr>
        </table>

        <table class="items2" style="border:1px solid #000; border-top:0">
          <thead>
            <tr>
              <th style="border:1px solid #000; background:#EDEDED; padding:3px">SR No</th>
              <th style="border:1px solid #000; background:#EDEDED; padding:3px">L1-Inch</th>
              <th style="border:1px solid #000; background:#EDEDED; padding:3px">L2-Inch</th>
              <th style="border:1px solid #000; background:#EDEDED; padding:3px">Height</th>
              <th style="border:1px solid #000; background:#EDEDED; padding:3px">Width</th>
              <th style="border:1px solid #000; background:#EDEDED; padding:3px">Qty</th>
              <th style="border:1px solid #000; background:#EDEDED; padding:3px">Hole</th>
              <th style="border:1px solid #000; background:#EDEDED; padding:3px">CutOu</th>
              <th style="border:1px solid #000; background:#EDEDED; padding:3px">Tot Area</th>
              <th style="border:1px solid #000; background:#EDEDED; padding:3px">Chargable Rate/${unitCol}</th>
              <th style="border:1px solid #000; background:#EDEDED; padding:3px">Amount</th>
              <th style="border:1px solid #000; background:#EDEDED; padding:3px">Shape</th>
              <th style="border:1px solid #000; background:#EDEDED; padding:3px">Remark</th>
            </tr>
          </thead>
          <tbody>
            ${itemRows}
            <tr style="font-weight:bold; background:#EDEDED">
              <td colspan="5" style="border:1px solid #000">Total</td>
              <td class="c" style="border:1px solid #000">${t.qty}</td>
              <td class="c" style="border:1px solid #000">${t.holes || ""}</td>
              <td class="c" style="border:1px solid #000">${t.cutouts || ""}</td>
              <td class="n" style="border:1px solid #000">${S.rateUnit === "sqft" ? t.sqft : t.sqm}</td>
              <td style="border:1px solid #000"></td>
              <td class="n" style="border:1px solid #000">${nf(t.glassAmount)}</td>
              <td style="border:1px solid #000"></td>
              <td style="border:1px solid #000"></td>
            </tr>
            ${opsRows}
          </tbody>
        </table>

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
          <div>PI No : ${esc(INV.no)}</div>
          <div>PROFORMA INVOICE</div>
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

        ${terms.length
          ? '<div class="terms" style="border:1px solid #000; padding:6px; font-size:7.4pt; line-height:1.45">' +
            terms.map((x: string, i: number) => `<div>${i + 1}) ${esc(x)}</div>`).join("") +
            "</div>"
          : ""}

        <div style="border:1px solid #000; border-top:0; padding:10px 8px 4px; text-align:center; font-size:8pt">
          <div style="font-weight:bold; text-align:center; margin-bottom:20px; font-size:8.5pt">Customer's Acceptance</div>
          <div class="sign" style="display:flex; justify-content:space-between; padding-top:16px">
            <div style="text-align:center"><b>RAHUL</b><br><span style="border-top:1px solid #000; display:inline-block; padding-top:2px; margin-top:2px">Prepared By</span></div>
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
