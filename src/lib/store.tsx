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
  postCustomer,
  postWorkOrder,
  postPayment,
  deleteInvoiceFromSheet,
  deleteCustomerFromSheet,
  deleteWorkOrderFromSheet,
  deletePaymentFromSheet,
  fetchInvoices,
  fetchCustomers,
  fetchWorkOrders,
  fetchPayments,
  syncAllToSheet,
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
  loadFromSheet: (opts?: { quiet?: boolean }) => Promise<void>;
  pushAllToSheet: () => Promise<void>;
  sheetSyncing: boolean;
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
  const [sheetSyncing, setSheetSyncing] = useState(false);

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
    if (!s.sheetUrl) {
      s.sheetUrl = "https://script.google.com/macros/s/AKfycbzfXV774Og0EuJXX-G7hyJTcnUVVTZtaEuRHliyJbCru9UDxMpnkXn6Vw79j6k8XjSm/exec";
    }
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
    const rawInvoices = savedInvoices !== null ? savedInvoices.filter((inv: any) => inv.id !== "inv-07321" && inv.id !== "inv-pi-07321") : [];
    const migratedInvoices = rawInvoices.map((inv: any) => ({
      ...inv,
      docType: inv.docType === "proforma" && (!inv.status || inv.status === "draft" || inv.status === "pi_sent") ? "pre_proforma" : (inv.docType || "pre_proforma"),
      status: inv.status || "draft",
    }));
    setInvoices(migratedInvoices);
    LS.set("invoices", migratedInvoices);

    const savedCustomers = LS.get<any[] | null>("customers", null);
    const initialCustomers = savedCustomers !== null ? savedCustomers.filter((c: any) => c.id !== "cus-hindustan") : [];
    
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
    const initialPayments = savedPayments !== null ? savedPayments.filter((p: any) => p.id !== "pay-1001") : [];
    setPayments(initialPayments);
    LS.set("payments", initialPayments);

    const draft = LS.get<any>("draft", null);
    const initialInv = draft && draft.items ? draft : samplePreProforma;
    setInvState(initialInv);
    if (!draft) LS.set("draft", samplePreProforma);

    setHydrated(true);
  }, []);

  /* ── Two-way Google Sheets sync ─────────────────────────────────── */
  const loadFromSheet = useCallback(async (opts?: { quiet?: boolean }) => {
    if (!settings.sheetUrl) {
      if (!opts?.quiet) toast.error("Add your Apps Script URL in Settings first");
      return;
    }
    setSheetSyncing(true);
    try {
      const [sheetInvoices, sheetCustomers, sheetWorkOrders, sheetPayments] = await Promise.all([
        fetchInvoices(settings.sheetUrl).catch(() => [] as any[]),
        fetchCustomers(settings.sheetUrl).catch(() => [] as any[]),
        fetchWorkOrders(settings.sheetUrl).catch(() => [] as any[]),
        fetchPayments(settings.sheetUrl).catch(() => [] as any[]),
      ]);

      /* Replacement & Merge strategy:
         Google Sheets is the single Source of Truth across all devices.
         1. Any item in Google Sheets is set as synced.
         2. Any previously synced local item (or sample item) NOT in Google Sheets was deleted -> purge it.
         3. Preserve unsaved local drafts (sync === 'local' or sync === 'pending').
      */

      // Invoices
      setInvoices((prev) => {
        const pendingLocal = prev.filter((x: any) => x.sync === "local" || x.sync === "pending");
        const syncedFromSheet = (sheetInvoices || []).map((si: any) => ({ ...si, sync: "synced" }));
        
        const finalMap = new Map<string, any>();
        syncedFromSheet.forEach((item: any) => finalMap.set(item.id, item));
        pendingLocal.forEach((item: any) => {
          if (!finalMap.has(item.id)) {
            finalMap.set(item.id, item);
          }
        });

        const nextInvoices = Array.from(finalMap.values());
        LS.set("invoices", nextInvoices);
        return nextInvoices;
      });

      // Customers
      setCustomers((_) => {
        const nextCustomers = sheetCustomers || [];
        LS.set("customers", nextCustomers);
        return nextCustomers;
      });

      // Work Orders
      setWorkOrders((_) => {
        const nextWorkOrders = sheetWorkOrders || [];
        LS.set("workOrders", nextWorkOrders);
        return nextWorkOrders;
      });

      // Payments
      setPayments((_) => {
        const nextPayments = sheetPayments || [];
        LS.set("payments", nextPayments);
        return nextPayments;
      });

      const total = sheetInvoices.length + sheetCustomers.length + sheetWorkOrders.length + sheetPayments.length;
      if (!opts?.quiet) {
        toast.success(`Loaded ${total} records from Google Sheets`);
      }
    } catch (err: any) {
      if (!opts?.quiet) {
        toast.error("Failed to load from sheet: " + err.message);
      }
    } finally {
      setSheetSyncing(false);
    }
  }, [settings.sheetUrl]);

  /* ── Auto-sync from Google Sheets across all devices (mount, tab focus, 30s interval) ── */
  useEffect(() => {
    if (!hydrated || !settings.sheetUrl) return;

    // Load from sheet immediately on mount (quiet mode)
    loadFromSheet({ quiet: true });

    // Auto-fetch when user switches back to this browser tab
    const handleFocus = () => {
      loadFromSheet({ quiet: true });
    };
    window.addEventListener("focus", handleFocus);

    // Auto-poll every 30 seconds for live updates from other devices
    const interval = setInterval(() => {
      loadFromSheet({ quiet: true });
    }, 30000);

    return () => {
      window.removeEventListener("focus", handleFocus);
      clearInterval(interval);
    };
  }, [hydrated, settings.sheetUrl, loadFromSheet]);

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
      const custWithId = cust.id ? cust : Object.assign({ id: uid("cus") }, cust);
      setCustomers((prev) => {
        const ex = prev.find(
          (x) => String(x.name).toLowerCase() === String(cust.name).toLowerCase(),
        );
        const next = ex
          ? prev.map((x) => (x === ex ? Object.assign({}, x, custWithId) : x))
          : prev.concat([custWithId]);
        LS.set("customers", next);
        return next;
      });
      toast.success("Customer saved successfully");
      /* Auto-sync customer to Google Sheet */
      if (settings.sheetUrl) {
        postCustomer(settings.sheetUrl, custWithId).catch(() => {});
      }
    },
    [inv, settings.sheetUrl],
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
    rec.docType = inv.docType || "pre_proforma";
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
    setWorkOrders((prev) => {
      const next = prev.filter((x) => x.orderId !== id && x.orderNo !== id && x.piNo !== id && x.id !== id);
      LS.set("workOrders", next);
      return next;
    });
    toast.success("Booking deleted");
    /* Also delete from Google Sheet if configured */
    if (settings.sheetUrl) {
      deleteInvoiceFromSheet(settings.sheetUrl, id).catch(() => {});
      deleteWorkOrderFromSheet(settings.sheetUrl, id).catch(() => {});
    }
  }, [settings.sheetUrl]);



  const deleteCustomer = useCallback((id: string) => {
    setCustomers((prev) => {
      const next = prev.filter((x) => x.id !== id);
      LS.set("customers", next);
      return next;
    });
    toast.success("Customer deleted");
    if (settings.sheetUrl) {
      deleteCustomerFromSheet(settings.sheetUrl, id).catch(() => {});
    }
  }, [settings.sheetUrl]);

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
    toast.success("SGU Booking confirmed & converted to Proforma Invoice!");
  }, []);

  const updateInvoiceStatus = useCallback((id: string, status: WorkflowStatus) => {
    setInvoices((prev) => {
      const next = prev.map((x) => (x.id === id ? { ...x, status } : x));
      LS.set("invoices", next);
      return next;
    });
  }, []);

  const savePayment = useCallback((pay: any) => {
    const rec = pay.id ? pay : { ...pay, id: uid("pay"), createdAt: new Date().toISOString() };
    setPayments((prev) => {
      const existing = prev.findIndex((x) => x.id === rec.id);
      const next = existing >= 0 ? prev.map((x, i) => (i === existing ? rec : x)) : [rec, ...prev];
      LS.set("payments", next);
      return next;
    });
    toast.success("Payment recorded successfully");
    /* Auto-sync payment to Google Sheet */
    if (settings.sheetUrl) {
      postPayment(settings.sheetUrl, rec).catch(() => {});
    }
  }, [settings.sheetUrl]);

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
    /* Auto-sync work order to Google Sheet */
    if (settings.sheetUrl) {
      postWorkOrder(settings.sheetUrl, wo).catch(() => {});
    }
  }, [settings.sheetUrl]);

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
    if (settings.sheetUrl) {
      deletePaymentFromSheet(settings.sheetUrl, id).catch(() => {});
    }
  }, [settings.sheetUrl]);



  const pushAllToSheet = useCallback(async () => {
    if (!settings.sheetUrl) {
      toast.error("Add your Apps Script URL in Settings first");
      return;
    }
    setSheetSyncing(true);
    try {
      const result = await syncAllToSheet(settings.sheetUrl, {
        invoices,
        customers,
        workOrders,
        payments,
      });
      /* Mark all invoices as synced */
      setInvoices((prev) => {
        const next = prev.map((x) => ({ ...x, sync: "synced" }));
        LS.set("invoices", next);
        return next;
      });
      const r = result.results || {};
      toast.success(`Pushed to sheet: ${r.invoices || 0} invoices, ${r.customers || 0} customers, ${r.workOrders || 0} work orders, ${r.payments || 0} payments`);
    } catch (err: any) {
      toast.error("Failed to push to sheet: " + err.message);
    } finally {
      setSheetSyncing(false);
    }
  }, [settings.sheetUrl, invoices, customers, workOrders, payments]);

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
    loadFromSheet,
    pushAllToSheet,
    sheetSyncing,
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
