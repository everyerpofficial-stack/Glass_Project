/* Client-side state container. It owns storage + sync only — every number
   comes from GlassCalc via computeTotals(). No formulas here. */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { toast } from "sonner";
import {
  LS,
  SAMPLE_INVOICE_07321,
  blankInvoice,
  buildRecord,
  computeTotals,
  loadSettings,
  postInvoice,
  uid,
} from "./gq";

/* ── Workflow status types ────────────────────────────────────────────── */
export type WorkflowStatus = "draft" | "pi_sent" | "order_confirmed" | "work_order_generated";

type Ctx = {
  hydrated: boolean;
  settings: any;
  setSettings: (s: any) => void;
  saveSettings: (s: any) => void;
  invoices: any[];
  customers: any[];
  workOrders: any[];
  inv: any;
  setInv: (updater: (prev: any) => any) => void;
  totals: any;
  draftState: string;
  newInvoice: () => void;
  loadInvoice: (id: string, asCopy?: boolean) => void;
  saveInvoice: () => boolean;
  deleteInvoice: (id: string) => void;
  saveCustomer: (c?: any) => void;
  deleteCustomer: (id: string) => void;
  syncOne: (rec: any) => Promise<boolean>;
  syncAll: () => void;
  /* ── Workflow helpers ── */
  confirmPreProforma: (id: string) => void;
  updateInvoiceStatus: (id: string, status: WorkflowStatus) => void;
  confirmOrder: (
    bookingId: string,
    paymentDetails?: {
      paidAmount?: number;
      paymentType?: string;
      refNo?: string;
      notes?: string;
    }
  ) => void;
  generateWorkOrder: (orderId: string) => any;
  getBookingsByStatus: (status: WorkflowStatus) => any[];
  saveWorkOrder: (wo: any) => void;
  payments: any[];
  savePayment: (p: any) => void;
  deletePayment: (id: string) => void;
};

const GQ = createContext<Ctx | null>(null);

export function GlassQuoteProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [settings, setSettings] = useState<any>(() => Object.assign({}, loadSettings()));
  const [invoices, setInvoices] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [inv, setInvState] = useState<any>(() => SAMPLE_INVOICE_07321);
  const [draftState, setDraftState] = useState("Draft saved automatically");

  /* hydrate from localStorage after mount (SSR-safe) */
  useEffect(() => {
    const s = Object.assign({}, loadSettings(), {
      coName: "Hindustan Float Glass Pvt. Ltd.",
      addr: "S-5, Shree Govind Complex,\nPareek College Mode, Jhotwara Road,\nJaipur, Rajasthan, 302013",
      email: "hindustan@live.in",
      gstin: "08AACCH4208C1Z3",
      pan: "U26109RJ2010PTC031953",
      logo: "/logo.png",
    });
    setSettings(s);
    LS.set("settings", s);

    const samplePreProforma = buildRecord(
      { ...SAMPLE_INVOICE_07321, docType: "pre_proforma" },
      computeTotals(s, SAMPLE_INVOICE_07321)
    );
    const sampleProforma = buildRecord(
      {
        ...SAMPLE_INVOICE_07321,
        id: "inv-pi-07321",
        no: "PI-07321",
        orderNo: "PI-07321",
        docType: "proforma",
        delivery: { paymentType: "Paid" },
      },
      computeTotals(s, SAMPLE_INVOICE_07321)
    );
    const savedInvoices = LS.get<any[] | null>("invoices", null);
    /* Auto-migrate: ensure every invoice has status and docType fields */
    const rawInvoices = savedInvoices !== null ? savedInvoices : [samplePreProforma, sampleProforma];
    const migratedInvoices = rawInvoices.map((inv: any) => ({
      ...inv,
      docType: inv.docType || (inv.no?.startsWith("PI-") ? "proforma" : "pre_proforma"),
      status: inv.status || "draft",
    }));
    setInvoices(migratedInvoices);
    if (savedInvoices === null) {
      LS.set("invoices", migratedInvoices);
    }

    const savedCustomers = LS.get<any[] | null>("customers", null);
    const initialCustomers = savedCustomers !== null ? [...savedCustomers] : [Object.assign({ id: "cus-hindustan" }, SAMPLE_INVOICE_07321.cust)];
    
    /* Auto-harvest customers from invoices */
    migratedInvoices.forEach((invoice: any) => {
      if (invoice.cust && invoice.cust.name && String(invoice.cust.name).trim()) {
        const nameLower = String(invoice.cust.name).trim().toLowerCase();
        const exists = initialCustomers.some((c: any) => String(c.name || "").trim().toLowerCase() === nameLower);
        if (!exists) {
          initialCustomers.push({
            id: uid("cus"),
            name: invoice.cust.name,
            phone: invoice.cust.phone || "",
            email: invoice.cust.email || "",
            gstin: invoice.cust.gstin || "",
            city: invoice.cust.city || invoice.cust.ship || "",
            addr: invoice.cust.addr || "",
            ship: invoice.cust.ship || "",
            status: "active",
          });
        }
      }
    });

    setCustomers(initialCustomers);
    LS.set("customers", initialCustomers);

    /* Load work orders */
    const savedWorkOrders = LS.get<any[] | null>("workOrders", null);
    setWorkOrders(savedWorkOrders || []);

    /* Load payments */
    const savedPayments = LS.get<any[] | null>("payments", null);
    const initialPayments = savedPayments !== null ? savedPayments : [
      {
        id: "pay-1001",
        custName: "HINDUSTAN FLOAT GLASS PVT. LTD",
        invoiceNo: "PI-07321",
        date: "2026-03-16",
        amount: 14500,
        mode: "Bank Transfer",
        refNo: "HDFC-TXN-984210",
        notes: "Advance payment 50%",
        createdAt: new Date().toISOString(),
      }
    ];
    setPayments(initialPayments);
    if (savedPayments === null) {
      LS.set("payments", initialPayments);
    }

    const draft = LS.get<any>("draft", null);
    const initialInv = draft && draft.items ? draft : samplePreProforma;
    setInvState(initialInv);
    if (!draft) LS.set("draft", samplePreProforma);

    setHydrated(true);
  }, []);

  const setInv = useCallback((updater: any) => {
    setInvState((prev: any) => (typeof updater === "function" ? updater(prev) : updater));
  }, []);

  /* debounced draft autosave — same 'gq.draft' key */
  useEffect(() => {
    if (!hydrated) return;
    const t = setTimeout(() => {
      const ok = LS.set("draft", inv);
      setDraftState(
        ok
          ? "Draft saved " +
              new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
          : "Could not save draft on this device",
      );
    }, 600);
    return () => clearTimeout(t);
  }, [inv, hydrated]);

  const totals = useMemo(() => computeTotals(settings, inv), [settings, inv]);

  const saveSettings = useCallback((s: any) => {
    setSettings(s);
    if (!LS.set("settings", s)) toast.error("This browser blocked local storage");
    else toast.success("Settings saved");
  }, []);

  const newInvoice = useCallback(() => {
    setInvState(blankInvoice(settings));
    toast("Started a new blank booking");
  }, [settings]);

  const syncOne = useCallback(
    (rec: any) => {
      if (!settings.sheetUrl) {
        toast.error("Add your Apps Script URL in Settings to sync");
        return Promise.resolve(false);
      }
      return postInvoice(settings.sheetUrl, rec)
        .then(() => {
          setInvoices((prev) => {
            const next = prev.map((x) => (x.id === rec.id ? { ...x, sync: "synced" } : x));
            LS.set("invoices", next);
            return next;
          });
          toast.success("Synced to your sheet");
          return true;
        })
        .catch((err: Error) => {
          setInvoices((prev) => {
            const next = prev.map((x) => (x.id === rec.id ? { ...x, sync: "pending" } : x));
            LS.set("invoices", next);
            return next;
          });
          toast.error("Saved on this device. Sheet sync failed: " + err.message);
          return false;
        });
    },
    [settings.sheetUrl],
  );

  const saveCustomer = useCallback(
    (c?: any) => {
      const cust = c || inv.cust;
      if (!String(cust.name || "").trim()) {
        toast.error("Enter a customer name first");
        return;
      }
      setCustomers((prev) => {
        const ex = prev.find(
          (x) => String(x.name).toLowerCase() === String(cust.name).toLowerCase(),
        );
        const next = ex
          ? prev.map((x) => (x === ex ? Object.assign({}, x, cust) : x))
          : prev.concat([Object.assign({ id: uid("cus") }, cust)]);
        LS.set("customers", next);
        return next;
      });
      toast.success("Customer saved successfully");
    },
    [inv],
  );

  const saveInvoice = useCallback(() => {
    if (!String(inv.cust.name || "").trim()) {
      toast.error("Enter a customer name before saving");
      return false;
    }
    if (!totals.lines.some((l: any) => l.ok)) {
      toast.error("Add at least one valid item");
      return false;
    }
    const rec = buildRecord(inv, totals);
    rec.status = inv.status || "draft";
    rec.docType = inv.docType || (inv.no?.startsWith("PI-") ? "proforma" : "pre_proforma");
    const existing = invoices.find((x) => x.id === inv.id);

    let next: any[];
    if (existing) {
      next = invoices.map((x) => (x.id === rec.id ? Object.assign({}, x, rec) : x));
    } else {
      next = [rec, ...invoices];
      if (inv.no === settings.prefix + settings.nextNo) {
        const s = { ...settings, nextNo: settings.nextNo + 1 };
        setSettings(s);
        LS.set("settings", s);
      }
    }
    setInvoices(next);
    LS.set("invoices", next);
    setInvState(rec);

    /* Auto-save customer profile */
    if (rec.cust && rec.cust.name && String(rec.cust.name).trim()) {
      saveCustomer(rec.cust);
    }

    toast.success("Booking " + rec.no + " saved");
    if (settings.sheetUrl) syncOne(rec);
    return true;
  }, [inv, totals, invoices, settings, syncOne, saveCustomer]);

  const loadInvoice = useCallback(
    (id: string, asCopy?: boolean) => {
      const r = invoices.find((x) => x.id === id);
      if (!r) return;
      const copy = JSON.parse(JSON.stringify(r));
      if (asCopy) {
        copy.id = uid("inv");
        copy.no = settings.prefix + settings.nextNo;
        copy.date = new Date().toISOString().slice(0, 10);
        copy._saved = false;
        copy.sync = "local";
        copy.status = "draft";
      }
      setInvState(copy);
      toast(asCopy ? "Duplicated — save when ready" : "Loaded " + copy.no);
    },
    [invoices, settings],
  );

  const deleteInvoice = useCallback((id: string) => {
    setInvoices((prev) => {
      const next = prev.filter((x) => x.id !== id);
      LS.set("invoices", next);
      return next;
    });
    toast.success("Booking deleted");
  }, []);



  const deleteCustomer = useCallback((id: string) => {
    setCustomers((prev) => {
      const next = prev.filter((x) => x.id !== id);
      LS.set("customers", next);
      return next;
    });
    toast.success("Customer deleted");
  }, []);

  const syncAll = useCallback(() => {
    const pending = invoices.filter((r) => r.sync !== "synced");
    if (!pending.length) {
      toast("Everything is already synced");
      return;
    }
    pending.reduce(
      (p: Promise<unknown>, r: any) => p.then(() => syncOne(r)),
      Promise.resolve() as Promise<unknown>,
    );
  }, [invoices, syncOne]);

  /* ── Workflow helpers ────────────────────────────────────────────── */

  const confirmPreProforma = useCallback((id: string) => {
    setInvoices((prev) => {
      const next = prev.map((x) => {
        if (x.id === id) {
          const piNo = x.no?.startsWith("PI-") ? x.no : `PI-${x.no?.replace(/^PRE-|^PI-/, "") || Date.now()}`;
          return {
            ...x,
            docType: "proforma",
            no: piNo,
            orderNo: piNo,
            status: "draft",
          };
        }
        return x;
      });
      LS.set("invoices", next);
      return next;
    });
    toast.success("Pre Proforma confirmed & converted to Proforma Invoice!");
  }, []);

  const updateInvoiceStatus = useCallback((id: string, status: WorkflowStatus) => {
    setInvoices((prev) => {
      const next = prev.map((x) => (x.id === id ? { ...x, status } : x));
      LS.set("invoices", next);
      return next;
    });
  }, []);

  const savePayment = useCallback((pay: any) => {
    setPayments((prev) => {
      const rec = pay.id ? pay : { ...pay, id: uid("pay"), createdAt: new Date().toISOString() };
      const existing = prev.findIndex((x) => x.id === rec.id);
      const next = existing >= 0 ? prev.map((x, i) => (i === existing ? rec : x)) : [rec, ...prev];
      LS.set("payments", next);
      return next;
    });
    toast.success("Payment recorded successfully");
  }, []);

  const confirmOrder = useCallback(
    (
      bookingId: string,
      paymentDetails?: {
        paidAmount?: number;
        paymentType?: string;
        refNo?: string;
        notes?: string;
      }
    ) => {
      let targetRecord: any = null;

      setInvoices((prev) => {
        const next = prev.map((x) => {
          if (x.id === bookingId) {
            const grandTotal = Number(x.totals?.grandTotal) || 0;
            const paidAmount = Number(paymentDetails?.paidAmount ?? x.paidAmount ?? 0);
            const remainingBalance = Math.max(0, grandTotal - paidAmount);
            let paymentStatus = "Credit";
            if (paidAmount >= grandTotal && grandTotal > 0) {
              paymentStatus = "Paid";
            } else if (paidAmount > 0) {
              paymentStatus = "Partially Paid";
            }
            const paymentType = paymentDetails?.paymentType || x.delivery?.paymentType || "Credit";

            const updatedDelivery = {
              ...(x.delivery || {}),
              paymentType,
              paymentTerm: paymentType,
            };

            const updated = {
              ...x,
              status: "order_confirmed" as WorkflowStatus,
              delivery: updatedDelivery,
              paidAmount,
              remainingBalance,
              paymentStatus,
            };
            targetRecord = updated;
            return updated;
          }
          return x;
        });
        LS.set("invoices", next);
        return next;
      });

      if (paymentDetails && Number(paymentDetails.paidAmount) > 0) {
        savePayment({
          id: uid("pay"),
          custName: targetRecord?.cust?.name || "Customer",
          invoiceNo: targetRecord?.no || bookingId,
          date: new Date().toISOString().slice(0, 10),
          amount: Number(paymentDetails.paidAmount),
          mode: paymentDetails.paymentType || "Credit",
          refNo: paymentDetails.refNo || "",
          notes: paymentDetails.notes || "Order Confirmation Payment",
          createdAt: new Date().toISOString(),
        });
      }

      toast.success("Order confirmed & payment details saved!");
    },
    [savePayment]
  );

  const generateWorkOrder = useCallback(
    (orderId: string) => {
      const order = invoices.find((x) => x.id === orderId);
      if (!order) {
        toast.error("Order not found");
        return null;
      }
      const orderTotals = computeTotals(settings, order);
      const woNo = "WO-" + (order.orderNo || order.no || Date.now());
      const pieces: any[] = [];
      let globalSr = 0;
      (order.items || []).forEach((item: any, idx: number) => {
        const line = orderTotals.lines?.[idx];
        if (!line?.ok) return;
        const layerIdx = item.layerIdx !== undefined ? item.layerIdx : idx;
        const layerObj = order.layers?.[layerIdx] || null;
        const prodName = layerObj?.productName || layerObj?.glassName || item.productName || order.productName || "Glass Product";
        const layerNo = layerObj?.layerNo || `Item ${layerIdx + 1}`;
        const qty = Number(item.qty) || 1;
        for (let p = 0; p < qty; p++) {
          globalSr++;
          const barcodeNum = String(
            (order.orderNo || order.no || "0000").replace(/\D/g, ""),
          ).padStart(4, "0") +
            String(globalSr).padStart(4, "0") +
            String(p + 1).padStart(2, "0");
          pieces.push({
            sr: globalSr,
            layerIdx,
            layerNo,
            productName: prodName,
            l1: item.l1 || "",
            l2: item.l2 || "",
            l1mm: item.l1mm || line.lMM || "",
            l2mm: item.l2mm || line.wMM || "",
            heightMM: line.lMM,
            widthMM: line.wMM,
            qty: 1,
            area: line.totalSqm,
            areaFt: line.totalSqft,
            hole: item.holes || 0,
            bigHole: item.bigHoles || 0,
            cutOut: item.cutouts || 0,
            bigCutout: item.bigCutouts || 0,
            shape: item.shape || "BLOCK",
            barcode: barcodeNum,
            remark: item.remark || "F" + String(globalSr).padStart(3, "0"),
            pieceOf: `${p + 1} of ${qty}`,
          });
        }
      });

      const wo = {
        id: uid("wo"),
        woNo,
        orderId,
        orderNo: order.orderNo || order.no,
        piNo: order.no,
        piDate: order.date,
        customer: order.cust?.name || "",
        dispatchTo: order.cust?.city || order.delivery?.city || "",
        poNo: order.poNo || "",
        project: order.projectRemark || "",
        glassDesc: order.glass?.desc || "",
        thickness: order.glass?.thickness || "",
        productName: order.productName || "",
        jobType: order.jobType || "WITH MATERIAL",
        layerInfo: order.layers || [],
        pieces,
        totalPieces: pieces.length,
        totalQty: orderTotals.qty,
        totalSqm: orderTotals.sqm,
        totalSqft: orderTotals.sqft,
        weightKg: orderTotals.weightKg,
        createdAt: new Date().toISOString(),
      };

      return wo;
    },
    [invoices, settings],
  );

  const saveWorkOrder = useCallback((wo: any) => {
    setWorkOrders((prev) => {
      const existing = prev.findIndex((x) => x.id === wo.id);
      const next = existing >= 0
        ? prev.map((x, i) => (i === existing ? wo : x))
        : [wo, ...prev];
      LS.set("workOrders", next);
      return next;
    });
    toast.success("Work Order " + wo.woNo + " saved");
  }, []);

  const getBookingsByStatus = useCallback(
    (status: WorkflowStatus) => {
      return invoices.filter((x) => (x.status || "draft") === status);
    },
    [invoices],
  );



  const deletePayment = useCallback((id: string) => {
    setPayments((prev) => {
      const next = prev.filter((x) => x.id !== id);
      LS.set("payments", next);
      return next;
    });
    toast.success("Payment deleted");
  }, []);

  const value: Ctx = {
    hydrated,
    settings,
    setSettings,
    saveSettings,
    invoices,
    customers,
    workOrders,
    payments,
    inv,
    setInv,
    totals,
    draftState,
    newInvoice,
    loadInvoice,
    saveInvoice,
    deleteInvoice,
    saveCustomer,
    deleteCustomer,
    savePayment,
    deletePayment,
    syncOne,
    syncAll,
    /* workflow */
    confirmPreProforma,
    updateInvoiceStatus,
    confirmOrder,
    generateWorkOrder,
    getBookingsByStatus,
    saveWorkOrder,
  };

  return <GQ.Provider value={value}>{children}</GQ.Provider>;
}

export function useGQ() {
  const ctx = useContext(GQ);
  if (!ctx) throw new Error("useGQ must be used inside GlassQuoteProvider");
  return ctx;
}
