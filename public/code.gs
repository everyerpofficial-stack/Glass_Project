/* =====================================================================
   code.gs — Google Apps Script backend for Glass Quote Pro
   
   Deploy as Web App:
   1. Go to script.google.com → New Project
   2. Paste this entire file as Code.gs
   3. Click Deploy → New Deployment
   4. Select Type: Web App
   5. Execute as: Me
   6. Who has access: Anyone
   7. Copy the Web App URL and paste it into Settings → Sheet Sync
   
   The spreadsheet is auto-created on first use. You can also bind this
   script to an existing spreadsheet — just open the spreadsheet,
   go to Extensions → Apps Script, and paste this code.
   ===================================================================== */

/* ---------- Configuration ---------- */
var SPREADSHEET_ID = ''; // Leave empty to auto-create, or paste your Spreadsheet ID here

/* ---------- Sheet Names ---------- */
var SHEET_INVOICES   = 'Invoices';
var SHEET_CUSTOMERS  = 'Customers';
var SHEET_WORKORDERS = 'WorkOrders';
var SHEET_PAYMENTS   = 'Payments';

/* ---------- Column Definitions ---------- */
var INVOICE_HEADERS = [
  'id', 'no', 'date', 'docType', 'status', 'customerName', 'customerGSTIN',
  'customerPhone', 'customerEmail', 'customerAddr', 'customerShip',
  'glassDesc', 'thickness', 'batchNo', 'defaultRate',
  'salesPerson', 'orderNo', 'poNo', 'projectRemark', 'inputUnit',
  'jobType', 'workOrderNo', 'freightType', 'productName',
  'itemCount', 'totalQty', 'totalSqm', 'totalSqft', 'weightKg',
  'glassAmount', 'basicAmount', 'adminCharge', 'subTotal',
  'insurance', 'assessableValue', 'cgst', 'sgst', 'igst',
  'grossTotal', 'roundOff', 'grandTotal', 'amountInWords',
  'commission', 'sync', 'paidAmount', 'remainingBalance', 'paymentStatus',
  'createdAt', 'updatedAt',
  'fullJSON'
];

var CUSTOMER_HEADERS = [
  'id', 'name', 'phone', 'email', 'gstin', 'addr', 'ship',
  'city', 'status', 'clBalance', 'createdAt', 'updatedAt'
];

var WORKORDER_HEADERS = [
  'id', 'woNo', 'orderId', 'orderNo', 'piNo', 'piDate',
  'customer', 'dispatchTo', 'poNo', 'project',
  'glassDesc', 'thickness', 'productName', 'jobType',
  'totalPieces', 'totalQty', 'totalSqm', 'totalSqft', 'weightKg',
  'createdAt',
  'fullJSON'
];

var PAYMENT_HEADERS = [
  'id', 'custName', 'invoiceNo', 'date', 'amount',
  'mode', 'refNo', 'notes', 'createdAt'
];


/* =====================================================================
   Web App Entry Points
   ===================================================================== */

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || 'ping';
  var result;

  try {
    switch (action) {
      case 'ping':
        result = handlePing_();
        break;
      case 'getInvoices':
        result = handleGetInvoices_();
        break;
      case 'getCustomers':
        result = handleGetCustomers_();
        break;
      case 'getWorkOrders':
        result = handleGetWorkOrders_();
        break;
      case 'getPayments':
        result = handleGetPayments_();
        break;
      default:
        result = { success: false, message: 'Unknown GET action: ' + action };
    }
  } catch (err) {
    result = { success: false, message: err.message || String(err) };
  }

  return jsonResponse_(result);
}

function doPost(e) {
  var result;

  try {
    var body = {};
    if (e && e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
    }
    var action = body.action || 'saveInvoice';

    switch (action) {
      case 'saveInvoice':
        result = handleSaveInvoice_(body.invoice);
        break;
      case 'deleteInvoice':
        result = handleDeleteInvoice_(body.id);
        break;
      case 'deleteCustomer':
        result = handleDeleteCustomer_(body.id);
        break;
      case 'deleteWorkOrder':
        result = handleDeleteWorkOrder_(body.id);
        break;
      case 'deletePayment':
        result = handleDeletePayment_(body.id);
        break;
      case 'saveCustomer':
        result = handleSaveCustomer_(body.customer);
        break;
      case 'saveWorkOrder':
        result = handleSaveWorkOrder_(body.workOrder);
        break;
      case 'savePayment':
        result = handleSavePayment_(body.payment);
        break;
      case 'syncAll':
        result = handleSyncAll_(body);
        break;
      default:
        result = { success: false, message: 'Unknown POST action: ' + action };
    }
  } catch (err) {
    result = { success: false, message: err.message || String(err) };
  }

  return jsonResponse_(result);
}


/* =====================================================================
   Handler Functions
   ===================================================================== */

/* ---------- Ping ---------- */
function handlePing_() {
  formatAllSheets_();
  return {
    success: true,
    status: 'OK',
    version: '2.0',
    timestamp: new Date().toISOString(),
    sheets: {
      invoices: getOrCreateSheet_(SHEET_INVOICES, INVOICE_HEADERS).getLastRow() - 1,
      customers: getOrCreateSheet_(SHEET_CUSTOMERS, CUSTOMER_HEADERS).getLastRow() - 1,
      workOrders: getOrCreateSheet_(SHEET_WORKORDERS, WORKORDER_HEADERS).getLastRow() - 1,
      payments: getOrCreateSheet_(SHEET_PAYMENTS, PAYMENT_HEADERS).getLastRow() - 1
    }
  };
}

/* ---------- Save Invoice ---------- */
function handleSaveInvoice_(invoice) {
  if (!invoice || !invoice.id) {
    return { success: false, message: 'Invoice data with id is required' };
  }

  var sheet = getOrCreateSheet_(SHEET_INVOICES, INVOICE_HEADERS);
  var existingRow = findRowById_(sheet, invoice.id);

  var row = [
    invoice.id || '',
    invoice.no || '',
    invoice.date || '',
    invoice.docType || 'pre_proforma',
    invoice.status || 'draft',
    (invoice.cust && invoice.cust.name) || '',
    (invoice.cust && invoice.cust.gstin) || '',
    (invoice.cust && invoice.cust.phone) || '',
    (invoice.cust && invoice.cust.email) || '',
    (invoice.cust && invoice.cust.addr) || '',
    (invoice.cust && invoice.cust.ship) || '',
    (invoice.glass && invoice.glass.desc) || '',
    (invoice.glass && invoice.glass.thickness) || '',
    (invoice.glass && invoice.glass.batchNo) || '',
    (invoice.glass && invoice.glass.defaultRate) || 0,
    invoice.salesPerson || '',
    invoice.orderNo || '',
    invoice.poNo || '',
    invoice.projectRemark || '',
    invoice.inputUnit || 'inch',
    invoice.jobType || '',
    invoice.workOrderNo || '',
    invoice.freightType || '',
    invoice.productName || '',
    (invoice.items && invoice.items.length) || 0,
    (invoice.totals && invoice.totals.qty) || 0,
    (invoice.totals && invoice.totals.sqm) || 0,
    (invoice.totals && invoice.totals.sqft) || 0,
    (invoice.totals && invoice.totals.weightKg) || 0,
    (invoice.totals && invoice.totals.glassAmount) || 0,
    (invoice.totals && invoice.totals.basicAmount) || 0,
    (invoice.totals && invoice.totals.adminCharge) || 0,
    (invoice.totals && invoice.totals.subTotal) || 0,
    (invoice.totals && invoice.totals.insurance) || 0,
    (invoice.totals && invoice.totals.assessableValue) || 0,
    (invoice.totals && invoice.totals.cgst) || 0,
    (invoice.totals && invoice.totals.sgst) || 0,
    (invoice.totals && invoice.totals.igst) || 0,
    (invoice.totals && invoice.totals.grossTotal) || 0,
    (invoice.totals && invoice.totals.roundOff) || 0,
    (invoice.totals && invoice.totals.grandTotal) || 0,
    (invoice.totals && invoice.totals.amountInWords) || '',
    (invoice.totals && invoice.totals.commission) || 0,
    'synced',
    invoice.paidAmount || 0,
    invoice.remainingBalance || 0,
    invoice.paymentStatus || '',
    invoice.createdAt || new Date().toISOString(),
    invoice.updatedAt || new Date().toISOString(),
    JSON.stringify(invoice)
  ];

  if (existingRow > 0) {
    sheet.getRange(existingRow, 1, 1, row.length).setValues([row]);
  } else {
    sheet.appendRow(row);
  }

  return { success: true, id: invoice.id, action: 'saved' };
}

/* ---------- Get All Invoices ---------- */
function handleGetInvoices_() {
  var sheet = getOrCreateSheet_(SHEET_INVOICES, INVOICE_HEADERS);
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    return { success: true, invoices: [] };
  }

  var data = sheet.getRange(2, 1, lastRow - 1, INVOICE_HEADERS.length).getValues();
  var invoices = [];

  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    var fullJsonIdx = INVOICE_HEADERS.indexOf('fullJSON');
    var fullJson = row[fullJsonIdx];

    if (fullJson && String(fullJson).trim()) {
      try {
        var inv = JSON.parse(fullJson);
        inv.sync = 'synced';
        invoices.push(inv);
        continue;
      } catch (e) {
        // Fall through to manual reconstruction
      }
    }

    // Manual reconstruction from columns (fallback)
    invoices.push({
      id: row[0],
      no: row[1],
      date: row[2],
      docType: row[3] || 'pre_proforma',
      status: row[4] || 'draft',
      cust: {
        name: row[5],
        gstin: row[6],
        phone: row[7],
        email: row[8],
        addr: row[9],
        ship: row[10]
      },
      glass: {
        desc: row[11],
        thickness: row[12],
        batchNo: row[13],
        defaultRate: row[14]
      },
      salesPerson: row[15],
      orderNo: row[16],
      poNo: row[17],
      projectRemark: row[18],
      inputUnit: row[19],
      jobType: row[20],
      workOrderNo: row[21],
      freightType: row[22],
      productName: row[23],
      totals: {
        qty: row[25],
        sqm: row[26],
        sqft: row[27],
        weightKg: row[28],
        glassAmount: row[29],
        basicAmount: row[30],
        adminCharge: row[31],
        subTotal: row[32],
        insurance: row[33],
        assessableValue: row[34],
        cgst: row[35],
        sgst: row[36],
        igst: row[37],
        grossTotal: row[38],
        roundOff: row[39],
        grandTotal: row[40],
        amountInWords: row[41],
        commission: row[42]
      },
      sync: 'synced',
      paidAmount: row[44],
      remainingBalance: row[45],
      paymentStatus: row[46],
      createdAt: row[47],
      updatedAt: row[48]
    });
  }

  return { success: true, invoices: invoices };
}

/* ---------- Delete Invoice ---------- */
function handleDeleteInvoice_(id) {
  if (!id) return { success: false, message: 'Invoice id is required' };

  var sheet = getOrCreateSheet_(SHEET_INVOICES, INVOICE_HEADERS);
  var rowNum = findRowById_(sheet, id);

  if (rowNum > 0) {
    sheet.deleteRow(rowNum);
    return { success: true, id: id, action: 'deleted' };
  }

  return { success: false, message: 'Invoice not found: ' + id };
}

/* ---------- Delete Customer ---------- */
function handleDeleteCustomer_(id) {
  if (!id) return { success: false, message: 'Customer id is required' };
  var sheet = getOrCreateSheet_(SHEET_CUSTOMERS, CUSTOMER_HEADERS);
  var rowNum = findRowById_(sheet, id);
  if (rowNum > 0) {
    sheet.deleteRow(rowNum);
    return { success: true, id: id, action: 'deleted' };
  }
  return { success: false, message: 'Customer not found: ' + id };
}

/* ---------- Delete Work Order ---------- */
function handleDeleteWorkOrder_(id) {
  if (!id) return { success: false, message: 'Work order id is required' };
  var sheet = getOrCreateSheet_(SHEET_WORKORDERS, WORKORDER_HEADERS);
  var rowNum = findRowById_(sheet, id);
  if (rowNum > 0) {
    sheet.deleteRow(rowNum);
    return { success: true, id: id, action: 'deleted' };
  }
  return { success: false, message: 'Work order not found: ' + id };
}

/* ---------- Delete Payment ---------- */
function handleDeletePayment_(id) {
  if (!id) return { success: false, message: 'Payment id is required' };
  var sheet = getOrCreateSheet_(SHEET_PAYMENTS, PAYMENT_HEADERS);
  var rowNum = findRowById_(sheet, id);
  if (rowNum > 0) {
    sheet.deleteRow(rowNum);
    return { success: true, id: id, action: 'deleted' };
  }
  return { success: false, message: 'Payment not found: ' + id };
}

/* ---------- Save Customer ---------- */
function handleSaveCustomer_(customer) {
  if (!customer || (!customer.id && !customer.name)) {
    return { success: false, message: 'Customer data with id or name is required' };
  }

  var sheet = getOrCreateSheet_(SHEET_CUSTOMERS, CUSTOMER_HEADERS);
  var existingRow = customer.id ? findRowById_(sheet, customer.id) : findRowByName_(sheet, customer.name);

  var row = [
    customer.id || '',
    customer.name || '',
    customer.phone || '',
    customer.email || '',
    customer.gstin || '',
    customer.addr || '',
    customer.ship || '',
    customer.city || '',
    customer.status || 'active',
    customer.clBalance || 0,
    customer.createdAt || new Date().toISOString(),
    new Date().toISOString()
  ];

  if (existingRow > 0) {
    sheet.getRange(existingRow, 1, 1, row.length).setValues([row]);
  } else {
    sheet.appendRow(row);
  }

  return { success: true, action: 'saved' };
}

/* ---------- Get All Customers ---------- */
function handleGetCustomers_() {
  var sheet = getOrCreateSheet_(SHEET_CUSTOMERS, CUSTOMER_HEADERS);
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    return { success: true, customers: [] };
  }

  var data = sheet.getRange(2, 1, lastRow - 1, CUSTOMER_HEADERS.length).getValues();
  var customers = [];

  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    customers.push({
      id: row[0],
      name: row[1],
      phone: row[2],
      email: row[3],
      gstin: row[4],
      addr: row[5],
      ship: row[6],
      city: row[7],
      status: row[8] || 'active',
      clBalance: row[9] || 0,
      createdAt: row[10],
      updatedAt: row[11]
    });
  }

  return { success: true, customers: customers };
}

/* ---------- Save Work Order ---------- */
function handleSaveWorkOrder_(wo) {
  if (!wo || !wo.id) {
    return { success: false, message: 'Work order data with id is required' };
  }

  var sheet = getOrCreateSheet_(SHEET_WORKORDERS, WORKORDER_HEADERS);
  var existingRow = findRowById_(sheet, wo.id);

  var row = [
    wo.id || '',
    wo.woNo || '',
    wo.orderId || '',
    wo.orderNo || '',
    wo.piNo || '',
    wo.piDate || '',
    wo.customer || '',
    wo.dispatchTo || '',
    wo.poNo || '',
    wo.project || '',
    wo.glassDesc || '',
    wo.thickness || '',
    wo.productName || '',
    wo.jobType || '',
    wo.totalPieces || 0,
    wo.totalQty || 0,
    wo.totalSqm || 0,
    wo.totalSqft || 0,
    wo.weightKg || 0,
    wo.createdAt || new Date().toISOString(),
    JSON.stringify(wo)
  ];

  if (existingRow > 0) {
    sheet.getRange(existingRow, 1, 1, row.length).setValues([row]);
  } else {
    sheet.appendRow(row);
  }

  return { success: true, action: 'saved' };
}

/* ---------- Get All Work Orders ---------- */
function handleGetWorkOrders_() {
  var sheet = getOrCreateSheet_(SHEET_WORKORDERS, WORKORDER_HEADERS);
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    return { success: true, workOrders: [] };
  }

  var data = sheet.getRange(2, 1, lastRow - 1, WORKORDER_HEADERS.length).getValues();
  var workOrders = [];

  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    var fullJsonIdx = WORKORDER_HEADERS.indexOf('fullJSON');
    var fullJson = row[fullJsonIdx];

    if (fullJson && String(fullJson).trim()) {
      try {
        workOrders.push(JSON.parse(fullJson));
        continue;
      } catch (e) {
        // Fall through to manual reconstruction
      }
    }

    workOrders.push({
      id: row[0],
      woNo: row[1],
      orderId: row[2],
      orderNo: row[3],
      piNo: row[4],
      piDate: row[5],
      customer: row[6],
      dispatchTo: row[7],
      poNo: row[8],
      project: row[9],
      glassDesc: row[10],
      thickness: row[11],
      productName: row[12],
      jobType: row[13],
      totalPieces: row[14],
      totalQty: row[15],
      totalSqm: row[16],
      totalSqft: row[17],
      weightKg: row[18],
      createdAt: row[19]
    });
  }

  return { success: true, workOrders: workOrders };
}

/* ---------- Save Payment ---------- */
function handleSavePayment_(payment) {
  if (!payment || !payment.id) {
    return { success: false, message: 'Payment data with id is required' };
  }

  var sheet = getOrCreateSheet_(SHEET_PAYMENTS, PAYMENT_HEADERS);
  var existingRow = findRowById_(sheet, payment.id);

  var row = [
    payment.id || '',
    payment.custName || '',
    payment.invoiceNo || '',
    payment.date || '',
    payment.amount || 0,
    payment.mode || '',
    payment.refNo || '',
    payment.notes || '',
    payment.createdAt || new Date().toISOString()
  ];

  if (existingRow > 0) {
    sheet.getRange(existingRow, 1, 1, row.length).setValues([row]);
  } else {
    sheet.appendRow(row);
  }

  return { success: true, action: 'saved' };
}

/* ---------- Get All Payments ---------- */
function handleGetPayments_() {
  var sheet = getOrCreateSheet_(SHEET_PAYMENTS, PAYMENT_HEADERS);
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    return { success: true, payments: [] };
  }

  var data = sheet.getRange(2, 1, lastRow - 1, PAYMENT_HEADERS.length).getValues();
  var payments = [];

  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    payments.push({
      id: row[0],
      custName: row[1],
      invoiceNo: row[2],
      date: row[3],
      amount: row[4],
      mode: row[5],
      refNo: row[6],
      notes: row[7],
      createdAt: row[8]
    });
  }

  return { success: true, payments: payments };
}

/* ---------- Sync All (bulk upload) ---------- */
function handleSyncAll_(body) {
  var results = { invoices: 0, customers: 0, workOrders: 0, payments: 0 };

  if (body.invoices && body.invoices.length) {
    for (var i = 0; i < body.invoices.length; i++) {
      handleSaveInvoice_(body.invoices[i]);
      results.invoices++;
    }
  }

  if (body.customers && body.customers.length) {
    for (var j = 0; j < body.customers.length; j++) {
      handleSaveCustomer_(body.customers[j]);
      results.customers++;
    }
  }

  if (body.workOrders && body.workOrders.length) {
    for (var k = 0; k < body.workOrders.length; k++) {
      handleSaveWorkOrder_(body.workOrders[k]);
      results.workOrders++;
    }
  }

  if (body.payments && body.payments.length) {
    for (var l = 0; l < body.payments.length; l++) {
      handleSavePayment_(body.payments[l]);
      results.payments++;
    }
  }

  return { success: true, action: 'syncAll', results: results };
}


/* =====================================================================
   Utility Functions
   ===================================================================== */

/* Get or create a spreadsheet */
function getSpreadsheet_() {
  if (SPREADSHEET_ID) {
    return SpreadsheetApp.openById(SPREADSHEET_ID);
  }

  // If bound to a spreadsheet, use it
  try {
    return SpreadsheetApp.getActiveSpreadsheet();
  } catch (e) {
    // Not bound — create a new one
    var ss = SpreadsheetApp.create('Glass Quote Pro — Database');
    Logger.log('Created new spreadsheet: ' + ss.getUrl());
    return ss;
  }
}

/* Format sheet columns with optimal width and styling */
function formatSheetColumns_(sheet, headers) {
  if (!sheet || !headers || headers.length === 0) return;

  var lastCol = headers.length;

  try {
    sheet.setRowHeight(1, 32);
    var headerRange = sheet.getRange(1, 1, 1, lastCol);
    headerRange
      .setFontWeight('bold')
      .setBackground('#1a1f2e')
      .setFontColor('#ffffff')
      .setFontSize(10)
      .setVerticalAlignment('middle')
      .setHorizontalAlignment('center');

    sheet.setFrozenRows(1);
  } catch (e) {}

  for (var i = 0; i < headers.length; i++) {
    var h = String(headers[i]).trim();
    var col = i + 1;
    var w = 140;

    var hLower = h.toLowerCase();
    if (hLower === 'id') w = 170;
    else if (hLower === 'no' || hLower.indexOf('wono') > -1 || hLower.indexOf('pino') > -1 || hLower.indexOf('orderno') > -1 || hLower.indexOf('pono') > -1) w = 130;
    else if (hLower.indexOf('date') > -1 || hLower.indexOf('createdat') > -1 || hLower.indexOf('updatedat') > -1) w = 150;
    else if (hLower.indexOf('doctype') > -1 || hLower.indexOf('status') > -1 || hLower.indexOf('unit') > -1 || hLower.indexOf('jobtype') > -1 || hLower.indexOf('freight') > -1) w = 140;
    else if (hLower.indexOf('name') > -1 || hLower.indexOf('customer') > -1 || hLower.indexOf('person') > -1) w = 200;
    else if (hLower.indexOf('email') > -1) w = 220;
    else if (hLower.indexOf('phone') > -1 || hLower.indexOf('gstin') > -1 || hLower.indexOf('refno') > -1) w = 160;
    else if (hLower.indexOf('addr') > -1 || hLower.indexOf('ship') > -1 || hLower.indexOf('dispatch') > -1 || hLower.indexOf('project') > -1 || hLower.indexOf('notes') > -1) w = 260;
    else if (hLower.indexOf('desc') > -1 || hLower.indexOf('product') > -1) w = 230;
    else if (hLower.indexOf('words') > -1) w = 320;
    else if (hLower.indexOf('fulljson') > -1) w = 160;
    else if (hLower.indexOf('qty') > -1 || hLower.indexOf('pieces') > -1 || hLower.indexOf('count') > -1 || hLower.indexOf('thickness') > -1) w = 110;
    else if (hLower.indexOf('amount') > -1 || hLower.indexOf('total') > -1 || hLower.indexOf('charge') > -1 || hLower.indexOf('value') > -1 || hLower.indexOf('rate') > -1 || hLower.indexOf('gst') > -1 || hLower.indexOf('balance') > -1 || hLower.indexOf('kg') > -1 || hLower.indexOf('sqm') > -1 || hLower.indexOf('sqft') > -1) w = 135;

    try {
      sheet.setColumnWidth(col, w);
    } catch (e) {}
  }
}

function formatAllSheets_() {
  var ss = getSpreadsheet_();
  var sheetsToFormat = [
    { name: SHEET_INVOICES, headers: INVOICE_HEADERS },
    { name: SHEET_CUSTOMERS, headers: CUSTOMER_HEADERS },
    { name: SHEET_WORKORDERS, headers: WORKORDER_HEADERS },
    { name: SHEET_PAYMENTS, headers: PAYMENT_HEADERS }
  ];

  for (var i = 0; i < sheetsToFormat.length; i++) {
    var item = sheetsToFormat[i];
    var sheet = ss.getSheetByName(item.name);
    if (sheet) {
      formatSheetColumns_(sheet, item.headers);
    }
  }
}

/* Get or create a sheet with headers */
function getOrCreateSheet_(name, headers) {
  var ss = getSpreadsheet_();
  var sheet = ss.getSheetByName(name);

  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }

  formatSheetColumns_(sheet, headers);

  return sheet;
}

/* Find a row by ID (column A = id) */
function findRowById_(sheet, id) {
  if (!id) return -1;
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return -1;

  var ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(id)) {
      return i + 2;
    }
  }
  return -1;
}

/* Find a row by name (column B = name) — for customers */
function findRowByName_(sheet, name) {
  if (!name) return -1;
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return -1;

  var names = sheet.getRange(2, 2, lastRow - 1, 1).getValues();
  var lowerName = String(name).trim().toLowerCase();
  for (var i = 0; i < names.length; i++) {
    if (String(names[i][0]).trim().toLowerCase() === lowerName) {
      return i + 2;
    }
  }
  return -1;
}

/* Create a JSON response */
function jsonResponse_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
