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
  saveInvoice: () => void;
  deleteInvoice: (id: string) => void;
  saveCustomer: (c?: any) => void;
  deleteCustomer: (id: string) => void;
  syncOne: (rec: any) => Promise<boolean>;
  syncAll: () => void;
  /* ── Workflow helpers ── */
  updateInvoiceStatus: (id: string, status: WorkflowStatus) => void;
  confirmOrder: (bookingId: string) => void;
  generateWorkOrder: (orderId: string) => any;
  getBookingsByStatus: (status: WorkflowStatus) => any[];
  saveWorkOrder: (wo: any) => void;
};

const GQ = createContext<Ctx | null>(null);

export function GlassQuoteProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [settings, setSettings] = useState<any>(() => Object.assign({}, loadSettings()));
  const [invoices, setInvoices] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [workOrders, setWorkOrders] = useState<any[]>([]);
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

    const sampleRecord = buildRecord(SAMPLE_INVOICE_07321, computeTotals(s, SAMPLE_INVOICE_07321));
    const savedInvoices = LS.get<any[]>("invoices", []);
    /* Auto-migrate: ensure every invoice has a status field */
    const migratedInvoices = (savedInvoices.length > 0 ? savedInvoices : [sampleRecord]).map(
      (inv: any) => ({ ...inv, status: inv.status || "draft" }),
    );
    setInvoices(migratedInvoices);
    LS.set("invoices", migratedInvoices);

    const savedCustomers = LS.get<any[]>("customers", []);
    const initialCustomers = savedCustomers.length > 0 ? savedCustomers : [Object.assign({ id: "cus-hindustan" }, SAMPLE_INVOICE_07321.cust)];
    setCustomers(initialCustomers);
    if (savedCustomers.length === 0) LS.set("customers", initialCustomers);

    /* Load work orders */
    const savedWorkOrders = LS.get<any[]>("workOrders", []);
    setWorkOrders(savedWorkOrders);

    const draft = LS.get<any>("draft", null);
    const initialInv = draft && draft.items ? draft : sampleRecord;
    setInvState(initialInv);
    if (!draft) LS.set("draft", sampleRecord);

    setHydrated(true);
  }, []);

  const setInv = useCallback((updater: (prev: any) => any) => {
    setInvState((prev: any) => updater(prev));
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

  const saveInvoice = useCallback(() => {
    if (!String(inv.cust.name || "").trim()) {
      toast.error("Enter a customer name before saving");
      return;
    }
    if (!totals.lines.some((l: any) => l.ok)) {
      toast.error("Add at least one valid item");
      return;
    }
    const rec = buildRecord(inv, totals);
    rec.status = inv.status || "draft";
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
    setInvState((prev: any) => ({ ...prev, _saved: true }));
    toast.success("Booking " + rec.no + " saved");
    if (settings.sheetUrl) syncOne(rec);
  }, [inv, totals, invoices, settings, syncOne]);

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

  const updateInvoiceStatus = useCallback((id: string, status: WorkflowStatus) => {
    setInvoices((prev) => {
      const next = prev.map((x) => (x.id === id ? { ...x, status } : x));
      LS.set("invoices", next);
      return next;
    });
  }, []);

  const confirmOrder = useCallback((bookingId: string) => {
    setInvoices((prev) => {
      const next = prev.map((x) =>
        x.id === bookingId ? { ...x, status: "order_confirmed" as WorkflowStatus } : x,
      );
      LS.set("invoices", next);
      return next;
    });
    toast.success("Order confirmed successfully");
  }, []);

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
        productName: order.productName || "TOUGHENED GLASS",
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

  const value: Ctx = {
    hydrated,
    settings,
    setSettings,
    saveSettings,
    invoices,
    customers,
    workOrders,
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
    syncOne,
    syncAll,
    /* workflow */
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
