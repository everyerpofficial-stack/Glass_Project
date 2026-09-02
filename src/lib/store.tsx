/* Client-side state container. It owns storage + sync only — every number
   comes from GlassCalc via computeTotals(). No formulas here. */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
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
  fetchSheetSnapshot,
  nextSeqForPrefix,
  getNextProformaNo,
  setStorageFailureHandler,
  syncAllToSheet,
  uid,
} from "./gq";
import type { SheetTabResult } from "./gq";

/* ── Workflow status types ────────────────────────────────────────────── */
export type WorkflowStatus = "draft" | "pi_sent" | "order_confirmed" | "work_order_generated";

/* How often the background poll looks for edits made on another device, and the
   floor between any two syncs (focus/visibility/interval all share it). */
const SYNC_POLL_MS = 30000;
const SYNC_MIN_INTERVAL_MS = 10000;

/* Merge one sheet tab into local state.
   Rows the sheet returned win — it is the shared source of truth. Rows that
   exist only locally survive *only* while they are still unsynced (`local` or
   `pending`): those are drafts and failed writes that no other device has seen
   yet, so dropping them would lose real work. Anything previously marked
   `synced` and now absent from the sheet was deleted elsewhere, so it is
   purged. Sorting is newest-first because Apps Script returns rows in append
   order, which would otherwise make every "Recent" list show the oldest rows. */
function mergeSheetCollection(prev: any[], fromSheet: any[]) {
  const byId = new Map<string, any>();
  (fromSheet || []).forEach((row: any) => {
    if (!row || row.id == null || row.id === "") return;
    byId.set(String(row.id), { ...row, sync: "synced" });
  });
  (prev || []).forEach((row: any) => {
    if (!row || row.id == null || row.id === "") return;
    const key = String(row.id);
    if (!byId.has(key) && (row.sync === "local" || row.sync === "pending")) {
      byId.set(key, row);
    }
  });
  const stamp = (row: any) => Date.parse(row?.updatedAt || row?.createdAt || "") || 0;
  return Array.from(byId.values()).sort((a, b) => stamp(b) - stamp(a));
}

/* Flip one row’s sync flag after a write to the sheet resolves. Kept out of the
   component so every collection uses the same rule and the same storage key. */
function setRowSync(
  setter: (fn: (prev: any[]) => any[]) => void,
  lsKey: string,
  id: string,
  sync: "synced" | "pending",
) {
  setter((prev) => {
    const next = prev.map((x: any) => (x.id === id ? { ...x, sync } : x));
    LS.set(lsKey, next);
    return next;
  });
}

const markSynced = (
  setter: (fn: (prev: any[]) => any[]) => void,
  lsKey: string,
  id: string,
) => setRowSync(setter, lsKey, id, "synced");

const markPending = (
  setter: (fn: (prev: any[]) => any[]) => void,
  lsKey: string,
  id: string,
) => setRowSync(setter, lsKey, id, "pending");

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
  newInvoice: (docType?: string) => void;
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
  /* Last background-sync failure, or null when the sheet is reachable. Routes
     surface this inline instead of the app crashing or hanging. */
  sheetError: string | null;
  lastSyncedAt: number | null;
  /* ── Workflow helpers ── */
  toggleWhatsAppSent: (id: string) => void;
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
  const [sheetError, setSheetError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const syncInFlight = useRef(false);
  const lastSyncAttempt = useRef(0);

  /* A refused localStorage write used to fail silently, so work could vanish on
     the next reload with nothing having warned the user. */
  useEffect(() => {
    setStorageFailureHandler(() =>
      toast.error(
        "This browser is refusing to save data locally (storage full or private mode). Push to Google Sheets to avoid losing work.",
        { duration: 12000 },
      ),
    );
    return () => setStorageFailureHandler(null);
  }, []);

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
      docType: inv.docType || "pre_proforma",
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

  /* ── Two-way Google Sheets sync ───────────────────────────────────
     Contract: the sheet is the source of truth for rows it *returns*.
     It is never treated as authoritative for a tab whose read failed —
     a timeout, a CORS error or a redeployed URL must leave the cached
     rows on screen, never blank them out. */
  const loadFromSheet = useCallback(
    async (opts?: { quiet?: boolean }) => {
      if (!settings.sheetUrl) {
        if (!opts?.quiet) toast.error("Add your Apps Script URL in Settings first");
        return;
      }
      /* Focus + interval + manual clicks can overlap; a second pass while one is
         in flight only doubles Apps Script load and can apply stale rows last. */
      if (syncInFlight.current) return;
      syncInFlight.current = true;
      setSheetSyncing(true);
      try {
        const snap = await fetchSheetSnapshot(settings.sheetUrl);

        const applied: string[] = [];
        const failed: Error[] = [];

        const apply = (
          tab: SheetTabResult<any>,
          setter: (fn: (prev: any[]) => any[]) => void,
          lsKey: string,
          label: string,
        ) => {
          if (!tab.ok) {
            failed.push(tab.error);
            return 0;
          }
          setter((prev) => {
            const next = mergeSheetCollection(prev, tab.data);
            LS.set(lsKey, next);
            return next;
          });
          applied.push(label);
          return tab.data.length;
        };

        const counts =
          apply(snap.invoices, setInvoices, "invoices", "invoices") +
          apply(snap.customers, setCustomers, "customers", "customers") +
          apply(snap.workOrders, setWorkOrders, "workOrders", "work orders") +
          apply(snap.payments, setPayments, "payments", "payments");

        if (failed.length === 4) {
          const msg = failed[0]?.message || "Google Sheets is unreachable";
          setSheetError(msg);
          if (!opts?.quiet) toast.error("Could not refresh from Google Sheets: " + msg);
          return;
        }

        setSheetError(failed.length ? failed[0]!.message : null);
        setLastSyncedAt(Date.now());
        if (!opts?.quiet) {
          if (failed.length) {
            toast.warning(
              `Refreshed ${applied.join(", ")} (${counts} records). ${failed.length} tab(s) failed — cached copies kept.`,
            );
          } else {
            toast.success(`Loaded ${counts} records from Google Sheets`);
          }
        }
      } catch (err: any) {
        /* fetchSheetSnapshot already swallows per-tab failures, so reaching here
           means something structural went wrong — still never clear state. */
        setSheetError(err?.message || String(err));
        if (!opts?.quiet) toast.error("Failed to load from sheet: " + (err?.message || err));
      } finally {
        syncInFlight.current = false;
        setSheetSyncing(false);
      }
    },
    [settings.sheetUrl],
  );

  /* ── Background re-sync: on mount, on tab focus, and on a poll ──────
     All three are quiet by design — cached data stays on screen and only the
     `sheetSyncing` badge moves, so a refresh never blanks the app. */
  useEffect(() => {
    if (!hydrated || !settings.sheetUrl) return;

    let cancelled = false;
    const refresh = () => {
      if (cancelled) return;
      /* Don't spend an Apps Script execution on a tab nobody is looking at. */
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      /* Focus fires on every alt-tab; throttle so a busy user cannot stampede
         the backend (Apps Script serialises executions per account). */
      if (Date.now() - lastSyncAttempt.current < SYNC_MIN_INTERVAL_MS) return;
      lastSyncAttempt.current = Date.now();
      void loadFromSheet({ quiet: true });
    };

    refresh();

    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    const interval = setInterval(refresh, SYNC_POLL_MS);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
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

  const newInvoice = useCallback((docType: string = "pre_proforma") => {
    /* blankInvoice stamps `<prefix><nextNo>`, so the sequence has to come from
       the numbers already issued for that prefix — see nextSeqForPrefix. */
    if (docType === "proforma") {
      const piNo = getNextProformaNo(invoices);
      const blank = blankInvoice(settings, docType);
      blank.no = piNo;
      blank.orderNo = piNo;
      setInvState(blank);
      toast(`Started new Proforma Invoice (${blank.no})`);
      return;
    }
    const prefix = "OB-";
    const nextNum = nextSeqForPrefix(invoices, prefix);
    const customSettings = { ...settings, nextNo: nextNum };
    const blank = blankInvoice(customSettings, docType);
    setInvState(blank);
    toast(`Started new Order Booking (${blank.no})`);
  }, [invoices, settings]);

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
      /* `sync: "local"` is what stops the next background merge from treating
         this row as "deleted on another device" and purging it. */
      const custWithId = Object.assign(
        { id: cust.id || uid("cus") },
        cust,
        { id: cust.id || uid("cus"), sync: "local", updatedAt: new Date().toISOString() },
      );
      setCustomers((prev) => {
        /* Match on id first. Matching on name alone meant renaming a customer
           found no existing row and appended a second one carrying the same id. */
        const ex =
          prev.find((x) => x.id && custWithId.id && x.id === custWithId.id) ||
          prev.find(
            (x) => String(x.name || "").toLowerCase() === String(cust.name || "").toLowerCase(),
          );
        const next = ex
          ? prev.map((x) => (x === ex ? Object.assign({}, x, custWithId) : x))
          : [custWithId].concat(prev);
        LS.set("customers", next);
        return next;
      });
      toast.success("Customer saved successfully");
      /* Auto-sync customer to Google Sheet */
      if (settings.sheetUrl) {
        postCustomer(settings.sheetUrl, custWithId)
          .then(() => markSynced(setCustomers, "customers", custWithId.id))
          .catch((err: Error) => {
            markPending(setCustomers, "customers", custWithId.id);
            toast.error("Customer saved on this device. Sheet sync failed: " + err.message);
          });
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

    if (rec.docType === "proforma") {
      const isYearFormat = /^\d{4}-\d{3,}$/.test(String(rec.no || "").trim());
      if (!isYearFormat) {
        const uniqueNo = getNextProformaNo(invoices);
        rec.no = uniqueNo;
        rec.orderNo = uniqueNo;
      }
    }

    /* Until syncOne confirms the write, this edit exists only here. Marking it
       `local` keeps a concurrent background merge from purging it. */
    rec.sync = "local";
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

    toast.success((rec.docType === "proforma" ? "Proforma Invoice " : "Booking ") + rec.no + " saved");
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

  const toggleWhatsAppSent = useCallback((id: string) => {
    let nextState = false;
    setInvoices((prev) => {
      const next = prev.map((x) => {
        if (x.id === id) {
          nextState = !x.whatsappSent;
          return { ...x, whatsappSent: nextState };
        }
        return x;
      });
      LS.set("invoices", next);
      return next;
    });
    if (nextState) {
      toast.success("Marked as sent on WhatsApp ✓");
    } else {
      toast.info("Marked as not sent on WhatsApp");
    }
  }, []);

  const confirmPreProforma = useCallback((id: string) => {
    let newProforma: any = null;
    let duplicateOf: string | null = null;
    setInvoices((prev) => {
      const sourceBooking = prev.find((x) => x.id === id);
      if (!sourceBooking) return prev;
      /* Confirming twice (a double-click, or a second visit to the list) used to
         mint a second Proforma Invoice from the same booking. */
      const bookingNo = String(sourceBooking.no || sourceBooking.orderNo || "");
      const already = prev.find(
        (x) => x.docType === "proforma" && bookingNo && String(x.preProformaNo || "") === bookingNo,
      );
      if (already) {
        duplicateOf = already.no || "";
        return prev;
      }
      const piNo = getNextProformaNo(prev);
      newProforma = {
        ...JSON.parse(JSON.stringify(sourceBooking)),
        id: uid("inv-pi"),
        docType: "proforma",
        no: piNo,
        orderNo: piNo,
        preProformaNo: sourceBooking.no || sourceBooking.orderNo || "",
        status: "draft",
        /* Copied from a synced booking, so it would inherit sync:"synced" and be
           purged by the next merge if the post below has not landed yet. */
        sync: "local",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const updatedPrev = prev.map((x) => {
        if (x.id === id) {
          return {
            ...x,
            docType: "proforma_converted",
            status: "order_confirmed",
            sync: "local",
            updatedAt: new Date().toISOString(),
          };
        }
        return x;
      });
      const next = [newProforma, ...updatedPrev];
      LS.set("invoices", next);
      return next;
    });
    if (duplicateOf) {
      toast.warning(`Proforma Invoice ${duplicateOf} already exists for this booking.`);
      return;
    }
    if (!newProforma) {
      toast.error("Order Booking not found");
      return;
    }
    toast.success(`Generated new Proforma Invoice ${newProforma.no} from ${newProforma.preProformaNo || "booking"}!`);
    if (settings.sheetUrl) {
      postInvoice(settings.sheetUrl, newProforma).catch(() => {});
      const sourceBooking = invoices.find((x) => x.id === id);
      if (sourceBooking) {
        postInvoice(settings.sheetUrl, {
          ...sourceBooking,
          docType: "proforma_converted",
          status: "order_confirmed",
        }).catch(() => {});
      }
    }
  }, [invoices, settings.sheetUrl]);

  const updateInvoiceStatus = useCallback((id: string, status: WorkflowStatus) => {
    let updatedRecord: any = null;
    setInvoices((prev) => {
      const next = prev.map((x) => {
        if (x.id === id) {
          updatedRecord = { ...x, status };
          return updatedRecord;
        }
        return x;
      });
      LS.set("invoices", next);
      return next;
    });
    if (settings.sheetUrl && updatedRecord) {
      postInvoice(settings.sheetUrl, updatedRecord).catch(() => {});
    }
  }, [settings.sheetUrl]);

  const savePayment = useCallback((pay: any) => {
    const rec = {
      ...pay,
      id: pay.id || uid("pay"),
      createdAt: pay.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sync: "local",
    };
    setPayments((prev) => {
      const existing = prev.findIndex((x) => x.id === rec.id);
      const next = existing >= 0 ? prev.map((x, i) => (i === existing ? rec : x)) : [rec, ...prev];
      LS.set("payments", next);
      return next;
    });
    toast.success("Payment recorded successfully");
    /* Auto-sync payment to Google Sheet */
    if (settings.sheetUrl) {
      postPayment(settings.sheetUrl, rec)
        .then(() => markSynced(setPayments, "payments", rec.id))
        .catch((err: Error) => {
          markPending(setPayments, "payments", rec.id);
          toast.error("Payment saved on this device. Sheet sync failed: " + err.message);
        });
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
              docType: "proforma",
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
      if (settings.sheetUrl && targetRecord) {
        postInvoice(settings.sheetUrl, targetRecord).catch(() => {});
      }
    },
    [savePayment, settings.sheetUrl]
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
    const rec = { ...wo, sync: "local", updatedAt: new Date().toISOString() };
    setWorkOrders((prev) => {
      const existing = prev.findIndex((x) => x.id === rec.id);
      const next = existing >= 0
        ? prev.map((x, i) => (i === existing ? rec : x))
        : [rec, ...prev];
      LS.set("workOrders", next);
      return next;
    });
    toast.success("Work Order " + rec.woNo + " saved");
    /* Auto-sync work order to Google Sheet */
    if (settings.sheetUrl) {
      postWorkOrder(settings.sheetUrl, rec)
        .then(() => markSynced(setWorkOrders, "workOrders", rec.id))
        .catch((err: Error) => {
          markPending(setWorkOrders, "workOrders", rec.id);
          toast.error("Work order saved on this device. Sheet sync failed: " + err.message);
        });
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
      /* Everything in the payload is now on the sheet — clear the local flags so
         the next merge does not re-upload them. */
      const markAll = (
        setter: (fn: (prev: any[]) => any[]) => void,
        lsKey: string,
      ) =>
        setter((prev) => {
          const next = prev.map((x) => ({ ...x, sync: "synced" }));
          LS.set(lsKey, next);
          return next;
        });
      markAll(setInvoices, "invoices");
      markAll(setCustomers, "customers");
      markAll(setWorkOrders, "workOrders");
      markAll(setPayments, "payments");
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
    sheetError,
    lastSyncedAt,
    /* workflow */
    toggleWhatsAppSent,
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
