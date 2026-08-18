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

type Ctx = {
  hydrated: boolean;
  settings: any;
  setSettings: (s: any) => void;
  saveSettings: (s: any) => void;
  invoices: any[];
  customers: any[];
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
};

const GQ = createContext<Ctx | null>(null);

export function GlassQuoteProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [settings, setSettings] = useState<any>(() => Object.assign({}, loadSettings()));
  const [invoices, setInvoices] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
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
    const initialInvoices = savedInvoices.length > 0 ? savedInvoices : [sampleRecord];
    setInvoices(initialInvoices);
    if (savedInvoices.length === 0) LS.set("invoices", initialInvoices);

    const savedCustomers = LS.get<any[]>("customers", []);
    const initialCustomers = savedCustomers.length > 0 ? savedCustomers : [Object.assign({ id: "cus-hindustan" }, SAMPLE_INVOICE_07321.cust)];
    setCustomers(initialCustomers);
    if (savedCustomers.length === 0) LS.set("customers", initialCustomers);

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
    toast("Started a new blank quote");
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
    toast.success("Quote " + rec.no + " saved");
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
    toast.success("Quote deleted");
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

  const value: Ctx = {
    hydrated,
    settings,
    setSettings,
    saveSettings,
    invoices,
    customers,
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
  };

  return <GQ.Provider value={value}>{children}</GQ.Provider>;
}

export function useGQ() {
  const ctx = useContext(GQ);
  if (!ctx) throw new Error("useGQ must be used inside GlassQuoteProvider");
  return ctx;
}
