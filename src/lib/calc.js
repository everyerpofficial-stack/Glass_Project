/* =====================================================================
   GlassCalc — calculation engine for glass proforma invoices
   Pure functions only. No DOM, no storage. Safe to unit-test in Node.
   ===================================================================== */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.GlassCalc = factory();
}(typeof globalThis !== 'undefined' ? globalThis : self, function () {
  'use strict';

  var MM_PER_INCH   = 25.4;                  // exact, by definition
  var SQFT_PER_SQM  = 10.763910416709722;    // exact: 1 / 0.3048^2
  var SOOTH_MM      = MM_PER_INCH / 8;       // 1 sooth = 1/8 inch = 3.175 mm
  var GLASS_DENSITY = 2.5;                   // g/cm3 -> kg per m2 per mm

  /* ---------- rounding helpers ------------------------------------- */
  function round(v, d) { var f = Math.pow(10, d || 0); return Math.round((v + Number.EPSILON) * f) / f; }
  function trunc(v, d) { var f = Math.pow(10, d || 0); return Math.trunc(v * f + 1e-9) / f; }
  function fix(v, d, mode) { return mode === 'truncate' ? trunc(v, d) : round(v, d); }
  function money(v) { return round(v, 2); }

  /* ---------- default settings ------------------------------------- */
  var DEFAULTS = {
    inputUnit: 'inch',       // 'inch' | 'mm' — determines how l1/l2 are interpreted
    inputMode: 'fraction',   // 'fraction' -> 13.5 means 13.5 in
                             // 'sooth'    -> 13.5 means 13 in 5 sooth = 13.625 in
    mmDecimals: 0,           // invoices show whole mm
    cuttingAllowanceMM: 0,   // added for the cutting/production size
    chargeAllowanceMM: 0,    // added to EACH dimension for the billed size
    extraAreaFormula: '+25.4mm', // 'none' | '+25.4mm' | '+25mm' | '+50mm' | 'custom'
    extraAreaCustomMM: 0,    // custom extra area mm when extraAreaFormula='custom'
    snapChargeableToSooth: false,
    areaDecimals: 3,
    areaRoundMode: 'round',  // 'round' | 'truncate'
    rateUnit: 'sqm',         // 'sqm' | 'sqft' | 'piece'
    deductOpeningArea: false,

    holeRate: 35, cutoutRate: 85, bigCutoutRate: 500,
    countersinkRate: 30, cskRate: 85, bigHoleRate: 150,
    templateCharge: 0,

    // Extended charges (per-unit rates from Party Invoice)
    jamboChargePercent: 0,    // Jambo Charges %
    nonEconomicPercent: 0,    // Non Economic %
    farmaCuttingPercent: 10,  // Farma Cutting %
    shapeCuttingPercent: 10,  // Shape Cutting %
    katraPolishRate: 150,     // Katra Polish — per SqM
    designRate: 0,            // Design — per SqM
    screenPrintRate: 800,     // Screen Print — per SqM
    bewalingChargeRate: 0,    // Bewaling Charge — per RMT
    taperChargeRate: 0,       // Taper Charge — per RMT
    roundCornerRate: 0,       // Round Corner — per NOS
    tapperRate: 0,            // Tapper — per SqM

    wastageMode: 'none',     // 'none' | 'percent' | 'manual'
    wastagePercent: 0, wastageArea: 0, wastageRate: 0,
    wastage2Mode: 'none', wastage2Percent: 0, wastage2Area: 0, wastage2Rate: 0,

    adminCharge: 50, insurancePercent: 2, discountPercent: 0, otherCharges: 0,
    freight: 0,              // Freight charge
    unloadingHandling: 0,    // Unloading/Handling charge
    greenTax: 0,             // Green Tax
    tcsPercent: 0,           // TCS Charge %
    gstType: 'cgst_sgst',    // 'cgst_sgst' | 'igst' | 'none'
    cgstPercent: 9, sgstPercent: 9, igstPercent: 18,
    commissionMode: 'none',  // 'none' | 'percent' | 'fixed'
    commissionValue: 0, commissionBase: 'basic', // 'basic' | 'glass' | 'grand'
    roundOff: true,
    glassDensity: GLASS_DENSITY
  };

  /* Vendor presets reverse-engineered from the sample invoices.
     Both are verified against real invoice rows in the test suite. */
  var PRESETS = {
    anand: {   // Anand Lamps Pvt Ltd / Hindustan Float Glass
      label: 'Anand Lamps style — Rs/Sq.Mtr, exact size',
      rateUnit: 'sqm', chargeAllowanceMM: 0, areaDecimals: 3,
      areaRoundMode: 'round', adminCharge: 50, insurancePercent: 2,
      cgstPercent: 9, sgstPercent: 9, wastageMode: 'manual'
    },
    krishna: { // Krishna Glass Arts
      label: 'Krishna Glass style — Rs/Sq.Ft, +1 inch chargeable',
      rateUnit: 'sqft', chargeAllowanceMM: MM_PER_INCH, areaDecimals: 3,
      areaRoundMode: 'truncate', adminCharge: 0, insurancePercent: 0,
      cgstPercent: 0, sgstPercent: 0, wastageMode: 'none',
      holeRate: 30, cutoutRate: 80, bigCutoutRate: 250
    }
  };

  function settings(over) {
    var s = {}, k;
    for (k in DEFAULTS) s[k] = DEFAULTS[k];
    for (k in (over || {})) if (over[k] !== undefined && over[k] !== null && over[k] !== '') s[k] = over[k];
    return s;
  }

  /* ---------- 1a. MM parser ----------------------------------------- */
  /* Accepts:  60 | 60.3 | 1200 — direct MM entry                      */
  function parseMM(raw) {
    var t = String(raw == null ? '' : raw).trim();
    if (!t) return { ok: false, mm: 0, input: t, error: 'Enter a size in MM' };
    if (!/^\d+(\.\d+)?$/.test(t)) return { ok: false, mm: 0, input: t, error: 'Only numbers and "." are allowed for MM input' };
    var v = parseFloat(t);
    if (v <= 0) return { ok: false, mm: 0, input: t, error: 'Size must be greater than 0' };
    if (v > 10000) return { ok: false, mm: 0, input: t, error: 'Size looks too large (over 10000 mm)' };
    return { ok: true, mm: v, input: t, error: null };
  }

  /* ---------- 1b. fractional inch parser ----------------------------- */
  /* Accepts:  36 | 36.5 | 36 3/8 | 36-3/8 | 3/8 | 36 3/8" | 18 2/8
     In sooth mode: 13.6 = 13 inch 6 sooth = 13.75 inch                */
  function parseInch(raw, opts) {
    var s = settings(opts);
    var t = String(raw == null ? '' : raw).trim()
      .replace(/[""″']/g, '').replace(/\s+/g, ' ');

    if (!t) return err('Enter a size');
    if (!/^[0-9 ./-]+$/.test(t)) return err('Only numbers, spaces, "." and "/" are allowed');

    var m;
    // whole + fraction:  "36 3/8"  or  "36-3/8"
    if ((m = t.match(/^(\d+)[\s-](\d+)\/(\d+)$/))) return frac(+m[1], +m[2], +m[3], t);
    // fraction only: "3/8"
    if ((m = t.match(/^(\d+)\/(\d+)$/)))            return frac(0, +m[1], +m[2], t);
    // whole number
    if ((m = t.match(/^(\d+)$/)))                   return ok(+m[1], t);

    // Frequency mode shorthand (e.g. "36 2" -> 36 + 2/freq)
    var freq = (opts && opts.freq) || s.freq;
    if (freq && (m = t.match(/^(\d+)[\s-](\d+)$/))) {
      return frac(+m[1], +m[2], +freq, t);
    }

    // decimal
    if ((m = t.match(/^(\d*)\.(\d+)$/))) {
      var whole = m[1] === '' ? 0 : +m[1], dec = m[2];
      if (s.inputMode === 'sooth') {
        if (dec.length !== 1) return err('In sooth mode use one digit after the dot, e.g. 13.6');
        if (+dec > 7)         return err('Sooth must be 0-7 (8 sooth = 1 inch)');
        return ok(whole + (+dec) / 8, t, whole + ' in ' + dec + ' sooth');
      }
      return ok(parseFloat(t), t);
    }
    return err('Cannot read "' + t + '". Try 36, 36.5 or 36 3/8');

    function frac(w, n, d, txt) {
      if (d === 0) return err('Denominator cannot be 0');
      if (n >= d)  return err(n + '/' + d + ' is not a valid fraction');
      if ([2,4,8,16,32,64].indexOf(d) === -1) return err('Use halves, quarters, eighths, 1/16, 1/32 or 1/64');
      return ok(w + n / d, txt);
    }
    function ok(v, txt, note) {
      if (v <= 0) return err('Size must be greater than 0');
      if (v > 400) return err('Size looks too large (over 400 inch)');
      return { ok: true, inches: v, input: txt, note: note || null, error: null };
    }
    function err(msg) { return { ok: false, inches: 0, input: t, note: null, error: msg }; }
  }

  /* nearest 1/8 inch, written the way the trade writes it: 36 3/8 */
  function toFractionText(inches, den) {
    den = den || 8;
    var whole = Math.floor(inches + 1e-9);
    var n = Math.round((inches - whole) * den);
    if (n === den) { whole++; n = 0; }
    if (n === 0) return String(whole);
    return whole ? whole + ' ' + n + '/' + den : n + '/' + den;
  }

  function inchToMM(inches, dec) { return round(inches * MM_PER_INCH, dec == null ? 2 : dec); }
  function mmToInch(mm) { return mm / MM_PER_INCH; }
  function sqmToSqft(a) { return a * SQFT_PER_SQM; }
  function sqftToSqm(a) { return a / SQFT_PER_SQM; }

  /* ---------- 2. one line item -------------------------------------- */
  /* item = { desc, l1, l2, l1mm, l2mm, qty, holes, cutouts, bigCutouts,
              countersinks, csks, bigHoles, rate, rateUnit?, shape,
              remark, openings:[{w,h,qty}] }                             */
  function calcLine(item, opts) {
    var s = settings(opts);
    var inputUnit = item.inputUnit || s.inputUnit || 'inch';
    var qty = Math.max(0, parseFloat(item.qty) || 0);
    var rate = parseFloat(item.rate) || 0;
    var unit = item.rateUnit || s.rateUnit;
    var trace = [];
    var L, W;

    var out = {
      ok: false,
      errors: [],
      l1: null, l2: null, qty: qty, rate: rate, rateUnit: unit,
      inputUnit: inputUnit,
      lMM: 0, wMM: 0, lCutMM: 0, wCutMM: 0, lChgMM: 0, wChgMM: 0,
      areaSqmPer: 0, areaSqftPer: 0, totalSqm: 0, totalSqft: 0,
      chargeAreaSqm: 0, chargeAreaSqft: 0,
      billedArea: 0, amount: 0, trace: trace
    };

    if (inputUnit === 'mm') {
      // Direct MM input
      var Lm = parseMM(item.l1mm != null ? item.l1mm : item.l1);
      var Wm = parseMM(item.l2mm != null ? item.l2mm : item.l2);
      out.l1 = Lm; out.l2 = Wm;
      out.ok = Lm.ok && Wm.ok && qty > 0;
      if (!Lm.ok) out.errors.push('L1 (MM): ' + Lm.error);
      if (!Wm.ok) out.errors.push('L2 (MM): ' + Wm.error);
      if (qty <= 0) out.errors.push('Quantity must be at least 1');
      if (!out.ok) return out;

      out.lMM = round(Lm.mm, s.mmDecimals || 1);
      out.wMM = round(Wm.mm, s.mmDecimals || 1);
      trace.push({ label: 'L1 (MM)', expr: Lm.input + ' mm', value: out.lMM + ' mm' });
      trace.push({ label: 'L2 (MM)', expr: Wm.input + ' mm', value: out.wMM + ' mm' });
    } else {
      // Inch input
      var itemFreq = s.frequencyEnabled ? (parseInt(item.freq, 10) || 8) : null;
      var inchOpts = itemFreq ? Object.assign({}, s, { freq: itemFreq }) : s;
      L = parseInch(item.l1, inchOpts); W = parseInch(item.l2, inchOpts);
      out.l1 = L; out.l2 = W;
      out.ok = L.ok && W.ok && qty > 0;
      if (!L.ok) out.errors.push('Length: ' + L.error);
      if (!W.ok) out.errors.push('Width: ' + W.error);
      if (qty <= 0) out.errors.push('Quantity must be at least 1');
      if (!out.ok) return out;

      out.lMM = round(L.inches * MM_PER_INCH, s.mmDecimals);
      out.wMM = round(W.inches * MM_PER_INCH, s.mmDecimals);
      trace.push({ label: 'Length in mm', expr: L.input + '" = ' + L.inches + '" x 25.4', value: out.lMM + ' mm' });
      trace.push({ label: 'Width in mm',  expr: W.input + '" = ' + W.inches + '" x 25.4', value: out.wMM + ' mm' });
    }

    // cutting size
    out.lCutMM = out.lMM + s.cuttingAllowanceMM;
    out.wCutMM = out.wMM + s.cuttingAllowanceMM;
    if (s.cuttingAllowanceMM) {
      trace.push({ label: 'Cutting size', expr: 'each side + ' + s.cuttingAllowanceMM + ' mm',
                   value: out.lCutMM + ' x ' + out.wCutMM + ' mm' });
    }

    // extra area formula
    var extraMM = 0;
    if (s.extraAreaFormula === '+25.4mm' || s.extraAreaFormula === '+25mm') extraMM = 25.4;
    else if (s.extraAreaFormula === '+50mm') extraMM = 50;
    else if (s.extraAreaFormula === 'custom') extraMM = parseFloat(s.extraAreaCustomMM) || 0;
    var effectiveChargeAllowance = (parseFloat(s.chargeAllowanceMM) || 0) + extraMM;

    // chargeable size
    out.lChgMM = out.lMM + effectiveChargeAllowance;
    out.wChgMM = out.wMM + effectiveChargeAllowance;
    if (s.snapChargeableToSooth) {
      out.lChgMM = Math.ceil(out.lChgMM / SOOTH_MM - 1e-9) * SOOTH_MM;
      out.wChgMM = Math.ceil(out.wChgMM / SOOTH_MM - 1e-9) * SOOTH_MM;
    }
    if (effectiveChargeAllowance || s.snapChargeableToSooth) {
      trace.push({ label: 'Chargeable size',
                   expr: 'each side + ' + round(effectiveChargeAllowance, 2) + ' mm'
                         + (s.snapChargeableToSooth ? ', rounded up to next sooth' : ''),
                   value: round(out.lChgMM, 2) + ' x ' + round(out.wChgMM, 2) + ' mm' });
    }

    // area (rounded once, after quantity — matches both sample invoices)
    var rawSqm = out.lChgMM * out.wChgMM / 1e6;
    var actualRawSqm = out.lMM * out.wMM / 1e6;
    var openArea = 0;
    (item.openings || []).forEach(function (o) {
      var a = (parseFloat(o.w) || 0) * (parseFloat(o.h) || 0) * (parseFloat(o.qty) || 1) / 1e6;
      openArea += a;
    });
    if (s.deductOpeningArea && openArea > 0) {
      rawSqm = Math.max(0, rawSqm - openArea);
      actualRawSqm = Math.max(0, actualRawSqm - openArea);
      trace.push({ label: 'Opening deduction', expr: 'less holes / cut-outs',
                   value: '-' + round(openArea, 4) + ' Sq.M per piece' });
    }

    out.areaSqmPer  = actualRawSqm;
    out.areaSqftPer = actualRawSqm * SQFT_PER_SQM;
    out.totalSqm    = fix(actualRawSqm * qty, s.areaDecimals, s.areaRoundMode);
    out.totalSqft   = fix(actualRawSqm * SQFT_PER_SQM * qty, s.areaDecimals, s.areaRoundMode);
    out.chargeAreaSqm  = fix(rawSqm * qty, s.areaDecimals, s.areaRoundMode);
    out.chargeAreaSqft = fix(rawSqm * SQFT_PER_SQM * qty, s.areaDecimals, s.areaRoundMode);

    trace.push({ label: 'Actual Area',
                 expr: round(out.lMM, 2) + ' x ' + round(out.wMM, 2) + ' / 1,000,000 x ' + qty + ' pc',
                 value: out.totalSqm + ' Sq.M  (' + out.totalSqft + ' Sq.Ft)' });
    if (effectiveChargeAllowance) {
      trace.push({ label: 'Charge Area',
                   expr: round(out.lChgMM, 2) + ' x ' + round(out.wChgMM, 2) + ' / 1,000,000 x ' + qty + ' pc',
                   value: out.chargeAreaSqm + ' Sq.M  (' + out.chargeAreaSqft + ' Sq.Ft)' });
    }

    // amount — use charge area (not actual area) for billing
    var billingArea = effectiveChargeAllowance ? (unit === 'sqft' ? out.chargeAreaSqft : out.chargeAreaSqm) : (unit === 'sqft' ? out.totalSqft : out.totalSqm);
    if (unit === 'piece') { out.billedArea = qty; out.amount = money(qty * rate); }
    else {
      out.billedArea = billingArea;
      out.amount = money(out.billedArea * rate);
    }
    trace.push({ label: 'Amount',
                 expr: out.billedArea + ' ' + unitLabel(unit) + ' x Rs ' + rate,
                 value: 'Rs ' + out.amount.toFixed(2) });

    out.holes        = parseFloat(item.holes) || 0;
    out.cutouts      = parseFloat(item.cutouts) || 0;
    out.bigCutouts   = parseFloat(item.bigCutouts) || 0;
    out.countersinks = parseFloat(item.countersinks) || 0;
    out.csks         = parseFloat(item.csks) || 0;
    out.bigHoles     = parseFloat(item.bigHoles) || 0;
    return out;
  }

  function unitLabel(u) { return u === 'sqft' ? 'Sq.Ft' : u === 'piece' ? 'pc' : 'Sq.Mtr'; }

  /* ---------- 3. invoice totals ------------------------------------- */
  function calcInvoice(items, opts) {
    var s = settings(opts);
    var lines = items.map(function (it) { return calcLine(it, s); });
    var valid = lines.filter(function (l) { return l.ok; });

    var t = {
      lines: lines, settings: s,
      qty: 0, sqm: 0, sqft: 0, chargeSqm: 0, chargeSqft: 0, glassAmount: 0,
      holes: 0, cutouts: 0, bigCutouts: 0, countersinks: 0, csks: 0, bigHoles: 0
    };
    valid.forEach(function (l) {
      t.qty += l.qty; t.sqm += l.totalSqm; t.sqft += l.totalSqft;
      t.chargeSqm += l.chargeAreaSqm; t.chargeSqft += l.chargeAreaSqft;
      t.glassAmount += l.amount;
      t.holes += l.holes; t.cutouts += l.cutouts;
      t.bigCutouts += l.bigCutouts; t.countersinks += l.countersinks;
      t.csks += l.csks; t.bigHoles += l.bigHoles;
    });
    t.sqm = round(t.sqm, s.areaDecimals);
    t.sqft = round(t.sqft, s.areaDecimals);
    t.chargeSqm = round(t.chargeSqm, s.areaDecimals);
    t.chargeSqft = round(t.chargeSqft, s.areaDecimals);
    var totalWeightKg = 0;
    valid.forEach(function (l) {
      var thk = parseFloat(l.thickness) || parseFloat(s.thicknessMM) || 5;
      totalWeightKg += l.totalSqm * thk * s.glassDensity;
    });
    t.weightKg = round(totalWeightKg, 3);

    // wastage
    t.wastageArea = 0;
    if (s.wastageMode === 'percent') t.wastageArea = round(t.sqm * (parseFloat(s.wastagePercent) || 0) / 100, 3);
    else if (s.wastageMode === 'manual') t.wastageArea = round(parseFloat(s.wastageArea) || 0, 3);
    t.wastageAmount = money(t.wastageArea * (parseFloat(s.wastageRate) || 0));

    // wastage 2
    t.wastage2Area = 0;
    if (s.wastage2Mode === 'percent') t.wastage2Area = round(t.sqm * (parseFloat(s.wastage2Percent) || 0) / 100, 3);
    else if (s.wastage2Mode === 'manual') t.wastage2Area = round(parseFloat(s.wastage2Area) || 0, 3);
    t.wastage2Amount = money(t.wastage2Area * (parseFloat(s.wastage2Rate) || 0));

    t.chargeableArea = round(t.sqm + t.wastageArea + t.wastage2Area, s.areaDecimals);

    // extras — standard
    t.holeCharge        = money(t.holes * (parseFloat(s.holeRate) || 0));
    t.cutoutCharge      = money(t.cutouts * (parseFloat(s.cutoutRate) || 0));
    t.bigCutoutCharge   = money(t.bigCutouts * (parseFloat(s.bigCutoutRate) || 0));
    t.countersinkCharge = money(t.countersinks * (parseFloat(s.countersinkRate) || 0));
    t.cskCharge         = money(t.csks * (parseFloat(s.cskRate) || 0));
    t.bigHoleCharge     = money(t.bigHoles * (parseFloat(s.bigHoleRate) || 0));
    t.templateCharge    = money(parseFloat(s.templateCharge) || 0);
    t.otherCharges      = money(parseFloat(s.otherCharges) || 0);

    // extended charges (Party Invoice Particulars)
    t.jamboCharge       = money(t.glassAmount * (parseFloat(s.jamboChargePercent) || 0) / 100);
    t.nonEconomicCharge = money(t.glassAmount * (parseFloat(s.nonEconomicPercent) || 0) / 100);
    t.farmaCuttingCharge = money(t.glassAmount * (parseFloat(s.farmaCuttingPercent) || 0) / 100);
    t.shapeCuttingCharge = money(t.glassAmount * (parseFloat(s.shapeCuttingPercent) || 0) / 100);
    t.katraPolishCharge = money(t.sqm * (parseFloat(s.katraPolishRate) || 0));
    t.designCharge      = money(t.sqm * (parseFloat(s.designRate) || 0));
    t.screenPrintCharge = money(t.sqm * (parseFloat(s.screenPrintRate) || 0));
    t.bewalingCharge    = money(0); // requires perimeter/RMT — placeholder
    t.taperCharge       = money(0); // requires perimeter/RMT — placeholder
    t.roundCornerCharge = money(0); // requires NOS input — placeholder
    t.tapperCharge      = money(t.sqm * (parseFloat(s.tapperRate) || 0));

    t.basicAmount = money(t.glassAmount + t.wastageAmount + t.wastage2Amount +
                          t.holeCharge + t.cutoutCharge + t.bigCutoutCharge +
                          t.countersinkCharge + t.cskCharge + t.bigHoleCharge +
                          t.templateCharge + t.otherCharges +
                          t.jamboCharge + t.nonEconomicCharge +
                          t.farmaCuttingCharge + t.shapeCuttingCharge +
                          t.katraPolishCharge + t.designCharge + t.screenPrintCharge +
                          t.bewalingCharge + t.taperCharge + t.roundCornerCharge + t.tapperCharge);
    t.adminCharge = money(parseFloat(s.adminCharge) || 0);
    t.freight     = money(parseFloat(s.freight) || 0);
    t.unloadingHandling = money(parseFloat(s.unloadingHandling) || 0);
    t.greenTax    = money(parseFloat(s.greenTax) || 0);
    t.discount    = money(t.basicAmount * (parseFloat(s.discountPercent) || 0) / 100);
    t.subTotal    = money(t.basicAmount + t.adminCharge + t.freight + t.unloadingHandling + t.greenTax - t.discount);

    t.insurance   = money(t.subTotal * (parseFloat(s.insurancePercent) || 0) / 100);
    t.assessableValue = money(t.subTotal + t.insurance);

    t.cgst = t.sgst = t.igst = 0;
    if (s.gstType === 'cgst_sgst') {
      t.cgst = money(t.assessableValue * (parseFloat(s.cgstPercent) || 0) / 100);
      t.sgst = money(t.assessableValue * (parseFloat(s.sgstPercent) || 0) / 100);
    } else if (s.gstType === 'igst') {
      t.igst = money(t.assessableValue * (parseFloat(s.igstPercent) || 0) / 100);
    }
    t.taxTotal  = money(t.cgst + t.sgst + t.igst);
    t.grossTotal = money(t.assessableValue + t.taxTotal);

    // TCS
    t.tcsCharge = money(t.grossTotal * (parseFloat(s.tcsPercent) || 0) / 100);
    var preTcsGross = money(t.grossTotal + t.tcsCharge);

    // commission — reported separately, never added to the customer total
    var base = s.commissionBase === 'glass' ? t.glassAmount
             : s.commissionBase === 'grand' ? preTcsGross : t.basicAmount;
    t.commission = s.commissionMode === 'percent' ? money(base * (parseFloat(s.commissionValue) || 0) / 100)
                 : s.commissionMode === 'fixed'   ? money(parseFloat(s.commissionValue) || 0) : 0;

    t.grandTotal = s.roundOff ? Math.round(preTcsGross) : preTcsGross;
    t.roundOff   = money(t.grandTotal - preTcsGross);
    t.amountInWords = amountInWords(t.grandTotal);
    return t;
  }

  /* ---------- 4. amount in words (Indian system) --------------------- */
  var ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  var TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function two(n) { return n < 20 ? ONES[n] : TENS[Math.floor(n / 10)] + (n % 10 ? ' ' + ONES[n % 10] : ''); }
  function three(n) {
    var h = Math.floor(n / 100), r = n % 100;
    return (h ? ONES[h] + ' Hundred' + (r ? ' ' : '') : '') + (r ? two(r) : '');
  }
  function words(n) {
    if (n === 0) return 'Zero';
    var p = [], units = [[10000000, 'Crore'], [100000, 'Lakh'], [1000, 'Thousand']];
    units.forEach(function (u) {
      var q = Math.floor(n / u[0]);
      if (q) { p.push(words(q) + ' ' + u[1]); n %= u[0]; }
    });
    if (n) p.push(three(n));
    return p.join(' ');
  }
  function amountInWords(amount) {
    var neg = amount < 0; amount = Math.abs(amount);
    var r = Math.floor(amount), p = Math.round((amount - r) * 100);
    var s = words(r) + (p ? ' and ' + two(p) + ' Paise' : '') + ' Only.';
    return (neg ? 'Minus ' : '') + s;
  }

  return {
    MM_PER_INCH: MM_PER_INCH, SQFT_PER_SQM: SQFT_PER_SQM, SOOTH_MM: SOOTH_MM,
    DEFAULTS: DEFAULTS, PRESETS: PRESETS, settings: settings,
    parseInch: parseInch, parseMM: parseMM, toFractionText: toFractionText,
    inchToMM: inchToMM, mmToInch: mmToInch, sqmToSqft: sqmToSqft, sqftToSqm: sqftToSqm,
    calcLine: calcLine, calcInvoice: calcInvoice,
    amountInWords: amountInWords, unitLabel: unitLabel,
    round: round, trunc: trunc, money: money
  };
}));

export default globalThis.GlassCalc;
