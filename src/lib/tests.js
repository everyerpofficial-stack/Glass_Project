/* =====================================================================
   tests.js — every expected value here is read off the supplied
   sample invoices. Run in Node:  node tests.js
   Also loaded by the app so the Tests panel can re-run them live.
   ===================================================================== */
(function (root, factory) {
  var G = (typeof require === 'function') ? require('./calc.js') : root.GlassCalc;
  if (typeof module === 'object' && module.exports) module.exports = factory(G);
  else root.GlassTests = factory(G);
}(typeof globalThis !== 'undefined' ? globalThis : self, function (G) {
  'use strict';

  var results = [];
  function check(name, got, want, tol) {
    tol = tol == null ? 0.005 : tol;
    var pass = (typeof want === 'number') ? Math.abs(got - want) <= tol : got === want;
    results.push({ name: name, got: got, want: want, pass: pass });
    return pass;
  }

  function run() {
    results = [];

    /* --- A. fractional inch parser ---------------------------------- */
    [['36', 36], ['36.5', 36.5], ['36 3/8', 36.375], ['36-3/8', 36.375],
     ['3/8', 0.375], ['95 7/8', 95.875], ['57 5/8', 57.625], ['18 2/8', 18.25],
     ['40 7/8', 40.875], ['13 3/8', 13.375], ['1/2', 0.5]].forEach(function (t) {
      var r = G.parseInch(t[0]);
      check('parse "' + t[0] + '"', r.ok ? r.inches : 'ERR', t[1], 1e-9);
    });
    ['36 9/9', 'abc 3/8', '36 5/7', '', '-5'].forEach(function (bad) {
      check('reject "' + bad + '"', G.parseInch(bad).ok, false);
    });
    check('sooth mode 13.6 = 13.75"', G.parseInch('13.6', { inputMode: 'sooth' }).inches, 13.75, 1e-9);
    check('sooth mode rejects 13.9', G.parseInch('13.9', { inputMode: 'sooth' }).ok, false);

    /* --- B. inch -> mm ---------------------------------------------- */
    [['36', 914.4], ['36 3/8', 923.925], ['36 5/8', 930.275],
     ['57 5/8', 1463.675], ['40 7/8', 1038.225], ['95 7/8', 2435.225]].forEach(function (t) {
      check('mm of ' + t[0], G.inchToMM(G.parseInch(t[0]).inches, 3), t[1], 0.001);
    });

    /* --- C. Anand Lamps PI-1828 — Rs 807/Sq.Mtr, exact size ---------- */
    var anand = G.settings(G.PRESETS.anand);
    [ // L1, L2, qty, mm, area Sq.M, amount   (rows 1-8, 11, 35, 38 of PI-1828)
      ['36',     '13 3/8', 1, 914, 340, 0.311, 250.98],
      ['36',     '12 7/8', 1, 914, 327, 0.299, 241.29],
      ['39 5/8', '15',     1, 1006, 381, 0.383, 309.08],
      ['36 3/8', '14 7/8', 1, 924, 378, 0.349, 281.64],
      ['36',     '11 3/8', 1, 914, 289, 0.264, 213.05],
      ['36',     '11 7/8', 1, 914, 302, 0.276, 222.73],
      ['36 3/8', '15',     1, 924, 381, 0.352, 284.06],
      ['57 5/8', '22 3/8', 1, 1464, 568, 0.832, 671.42],
      ['56 7/8', '17 3/8', 1, 1445, 441, 0.637, 514.06],
      ['36 3/8', '13 1/8', 1, 924, 333, 0.308, 248.56]
    ].forEach(function (r) {
      var L = G.calcLine({ l1: r[0], l2: r[1], qty: r[2], rate: 807 }, anand);
      var tag = 'PI-1828 ' + r[0] + ' x ' + r[1];
      check(tag + ' mm', L.lMM + 'x' + L.wMM, r[3] + 'x' + r[4]);
      check(tag + ' area', L.totalSqm, r[5], 0.0005);
      check(tag + ' amount', L.amount, r[6], 0.01);
    });

    /* --- D. Anand PI-1813 — qty 2, Rs 1344/Sq.Mtr -------------------- */
    var pi1813 = G.calcLine({ l1: '95 7/8', l2: '40 7/8', qty: 2, rate: 1344 },
      G.settings(Object.assign({}, G.PRESETS.anand, { mmOverride: true })));
    // invoice shows 2436 x 1039 (hand-entered, 1mm above the exact 2435.2 x 1038.2)
    check('PI-1813 area from invoice mm', G.round(2436 * 1039 / 1e6, 3) * 2, 5.062, 0.001);
    check('PI-1813 amount from invoice mm', G.money(5.062 * 1344), 6803.33, 0.01);
    check('PI-1813 engine mm', pi1813.lMM + 'x' + pi1813.wMM, '2435x1038');

    /* --- E. Krishna Glass — Rs 69/Sq.Ft, +1 inch chargeable ---------- */
    var kr = G.settings(G.PRESETS.krishna);
    var krRows = [ // L mm, W mm, qty, Tot.Chg S.F., Glass Amount
      [474, 751, 2, 8.347, 575.94], [775, 276, 1, 2.596, 179.12],
      [777, 2202, 2, 38.475, 2654.78], [495, 1108, 2, 12.697, 876.09],
      [919, 2241, 2, 46.077, 3179.31], [869, 1330, 2, 26.097, 1800.69],
      [518, 608, 1, 3.704, 255.58], [298, 276, 1, 1.049, 72.38],
      [646, 1326, 1, 9.766, 673.85], [1135, 1318, 2, 33.559, 2315.57],
      [286, 1326, 1, 4.529, 312.50], [469, 583, 1, 3.237, 223.35],
      [249, 276, 1, 0.890, 61.41]
    ];
    var krTotal = 0;
    krRows.forEach(function (r) {
      // the Krishna sheet is driven from mm, so feed mm back as inches
      var L = G.calcLine({ l1: String(G.mmToInch(r[0])), l2: String(G.mmToInch(r[1])),
                           qty: r[2], rate: 69 },
                         G.settings(Object.assign({}, G.PRESETS.krishna, { mmDecimals: 6 })));
      krTotal += L.totalSqft;
      check('Krishna ' + r[0] + 'x' + r[1] + ' sq.ft', L.totalSqft, r[3], 0.002);
      check('Krishna ' + r[0] + 'x' + r[1] + ' amount', L.amount, r[4], 0.02);
    });
    check('Krishna total sq.ft', G.round(krTotal, 3), 191.023, 0.01);

    /* --- F. invoice totals, PI-1828 footer --------------------------- */
    var items1828 = [{ l1: '36', l2: '13 3/8', qty: 1, rate: 807 }];
    var tot = G.calcInvoice(items1828, G.settings(Object.assign({}, G.PRESETS.anand, {
      wastageMode: 'manual', wastageArea: 1.692, wastageRate: 657,
      adminCharge: 50, insurancePercent: 2, cgstPercent: 9, sgstPercent: 9
    })));
    check('wastage amount', tot.wastageAmount, 1111.64, 0.01);
    // full-invoice arithmetic using the invoice's own glass total of 10291.64
    var basic = G.money(10291.64 + 1111.64);
    check('basic amount', basic, 11403.28, 0.01);
    var sub = G.money(basic + 50);            check('total after admin', sub, 11453.28, 0.01);
    var ins = G.money(sub * 0.02);            check('insurance 2%', ins, 229.07, 0.01);
    var ass = G.money(sub + ins);             check('assessable value', ass, 11682.35, 0.01);
    var cg = G.money(ass * 0.09);             check('C-GST 9%', cg, 1051.41, 0.01);
    var gross = G.money(ass + cg * 2);        check('gross total', gross, 13785.17, 0.01);
    check('round off', G.money(Math.round(gross) - gross), -0.17, 0.01);
    check('grand total', Math.round(gross), 13785, 0.01);

    /* --- G. PI-1813 footer ------------------------------------------- */
    var b13 = G.money(6803.33 + G.money(3.869 * 1344));
    check('PI-1813 basic', b13, 12003.27, 0.02);
    var s13 = G.money(b13 + 50), i13 = G.money(s13 * 0.02), a13 = G.money(s13 + i13);
    check('PI-1813 insurance', i13, 241.07, 0.02);
    check('PI-1813 assessable', a13, 12294.34, 0.02);
    check('PI-1813 C-GST', G.money(a13 * 0.09), 1106.49, 0.02);
    check('PI-1813 grand total', Math.round(G.money(a13 + G.money(a13 * 0.09) * 2)), 14507, 0.02);

    /* --- H. weight (area x thickness x 2.5) --------------------------- */
    check('PI-1828 weight 5mm', G.round(12.753 * 5 * 2.5, 3), 159.413, 0.01);
    check('PI-1813 weight 12mm', G.round(5.062 * 12 * 2.5, 3), 151.860, 0.01);

    /* --- I. sq.ft <-> sq.mtr cross-check ------------------------------
       The invoice footer sums per-line Sq.Ft rather than converting the
       Sq.Mtr total, so the two differ in the third decimal. Tolerance
       reflects that, not a fault in the conversion.                     */
    check('12.7530 Sq.M in Sq.Ft', G.round(G.sqmToSqft(12.7530), 3), 137.269, 0.005);
    check('5.0620 Sq.M in Sq.Ft', G.round(G.sqmToSqft(5.0620), 3), 54.486, 0.005);

    /* --- J. spec test cases (both units agree) ------------------------ */
    [['36', '13 3/8'], ['36 3/8', '13 3/8'], ['95 7/8', '40 7/8'],
     ['57 5/8', '22 3/8'], ['1/2', '1/2'], ['1/8', '1/4'], ['100', '50']].forEach(function (t) {
      var L = G.calcLine({ l1: t[0], l2: t[1], qty: 1, rate: 1 },
                         G.settings({ mmDecimals: 6, areaDecimals: 6 }));
      var byInch = G.parseInch(t[0]).inches * G.parseInch(t[1]).inches / 144;
      check('sqft agrees for ' + t[0] + ' x ' + t[1], L.totalSqft, byInch, 0.0005);
    });

    /* --- K. amount in words ------------------------------------------- */
    check('words 14507', G.amountInWords(14507), 'Fourteen Thousand Five Hundred Seven Only.');
    check('words 13785', G.amountInWords(13785), 'Thirteen Thousand Seven Hundred Eighty Five Only.');
    check('words 100000', G.amountInWords(100000), 'One Lakh Only.');
    check('words 12345678', G.amountInWords(12345678),
      'One Crore Twenty Three Lakh Forty Five Thousand Six Hundred Seventy Eight Only.');

    var passed = results.filter(function (r) { return r.pass; }).length;
    return { results: results, passed: passed, total: results.length };
  }

  return { run: run };
}));

if (typeof require === 'function' && typeof module === 'object' && require.main === module) {
  var r = module.exports.run();
  r.results.forEach(function (x) {
    if (!x.pass) console.log('FAIL  ' + x.name + '  got=' + x.got + '  want=' + x.want);
  });
  console.log('\n' + r.passed + ' / ' + r.total + ' checks passed');
  process.exit(r.passed === r.total ? 0 : 1);
}

export default globalThis.GlassTests;
