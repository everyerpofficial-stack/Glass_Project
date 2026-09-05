/* Client-side state container. It owns storage + sync only — every number
   comes from GlassCalc via computeTotals(). No formulas here. */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import { toast } from "sonner";
import {
  BASE_SETTINGS,
  LS,
  SAMPLE_INVOICE_07321,
  blankInvoice,
  buildRecord,
  computeTotals,
  dedupeCustomers,
  loadSettings,
  postInvoice,
  clearAllSheetData,
  postCustomer,
  postWorkOrder,
  postPayment,
  deleteInvoiceFromSheet,
  deleteCustomerFromSheet,
  deleteWorkOrderFromSheet,
  deletePaymentFromSheet,
  fetchSheetSnapshot,
  getNextProformaNo,
  getNextOrderNo,
  hasEnteredRateForInvoice,
  setStorageFailureHandler,
  stripNonInvoiceCharges,
  pushAllInChunks,
  uid,
  workOrderBelongsTo,
  formatPiNo,
  matchesInvoicePayment,
} from "./gq";
import type { SheetTabResult } from "./gq";

/* ── Workflow status types ────────────────────────────────────────────── */
/* `cancelled` was being passed through `as any` at every call site because it
   was missing here, which is also why nothing downstream — revenue, dues,
   reports — ever learned to exclude it. */
export type WorkflowStatus =
  "draft" | "pi_sent" | "order_confirmed" | "work_order_generated" | "cancelled";

/* How often the background poll looks for edits made on another device, and the
   floor between any two syncs (focus/visibility/interval all share it). */
const SYNC_POLL_MS = 30000;
const SYNC_MIN_INTERVAL_MS = 10000;

/* ── Reporting the backend as down ─────────────────────────────────────
   One failed poll is not an outage. Apps Script cold starts are slow and
   erratic — a measured run of this deployment answered in 19.9s, 9.6s, then
   3-7s — so a single slow response is the normal case, not a fault. Flipping
   the header to "Offline" on the first failure told the user their database
   had dropped when nothing was wrong, and, because a poll only runs every 30s,
   the badge then stayed wrong until the next one happened to succeed.

   A failure now has to repeat before it is reported, and repeated failures back
   off. Backing off matters for more than politeness: an aborted request does
   not stop the Apps Script execution behind it, and Apps Script serialises
   executions per user, so polling straight back into a slow backend queues the
   retry behind the request that just timed out and guarantees it times out
   too. */
const SYNC_FAILURES_BEFORE_OFFLINE = 2;
const SYNC_BACKOFF_MS = [0, 15000, 45000, 120000];

/* ── Pending deletions ─────────────────────────────────────────────
   Deleting a record removes it locally and fires a delete at the sheet. When
   that delete does not land — offline, a timeout, a redeployed URL — the row is
   still in the sheet, and the background poll 30 seconds later merges it
   straight back onto the device. From the user's side a deleted invoice simply
   reappears, so they delete it again, and it comes back again.

   A tombstone records the intent: the id is held back from every merge, and the
   delete is retried on each sync until the sheet confirms it. Tombstones are
   persisted so a reload cannot resurrect the row either, and they carry a
   timestamp so they can be aged out once the deletion has clearly taken. */
const TOMBSTONE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

type Tombstones = Record<string, Record<string, number>>;

/* Which remote delete belongs to which collection, keyed by the same storage
   key the tombstones use. */
const DELETERS: Record<string, (url: string, id: string) => Promise<boolean>> = {
  invoices: deleteInvoiceFromSheet,
  customers: deleteCustomerFromSheet,
  workOrders: deleteWorkOrderFromSheet,
  payments: deletePaymentFromSheet,
};

function loadTombstones(): Tombstones {
  const raw = LS.get<Tombstones>("deleted", {});
  const now = Date.now();
  const out: Tombstones = {};
  Object.entries(raw || {}).forEach(([collection, ids]) => {
    const kept: Record<string, number> = {};
    Object.entries(ids || {}).forEach(([id, at]) => {
      if (now - (Number(at) || 0) < TOMBSTONE_TTL_MS) kept[id] = Number(at) || now;
    });
    if (Object.keys(kept).length) out[collection] = kept;
  });
  return out;
}

/* Merge one sheet tab into local state.
   Rows the sheet returned win — it is the shared source of truth. Rows that
   exist only locally survive *only* while they are still unsynced (`local` or
   `pending`): those are drafts and failed writes that no other device has seen
   yet, so dropping them would lose real work. Anything previously marked
   `synced` and now absent from the sheet was deleted elsewhere, so it is
   purged. Sorting is newest-first because Apps Script returns rows in append
   order, which would otherwise make every "Recent" list show the oldest rows. */
function mergeSheetCollection(prev: any[], fromSheet: any[], deletedIds?: Record<string, number>) {
  const isDeleted = (id: string) => Boolean(deletedIds && deletedIds[id] !== undefined);
  const byId = new Map<string, any>();
  const stamp = (row: any) => Date.parse(row?.updatedAt || row?.createdAt || "") || 0;

  (fromSheet || []).forEach((row: any) => {
    if (!row || row.id == null || row.id === "") return;
    const key = String(row.id);
    if (isDeleted(key)) return;
    byId.set(key, { ...row, sync: "synced" });
  });

  (prev || []).forEach((row: any) => {
    if (!row || row.id == null || row.id === "") return;
    const key = String(row.id);
    if (isDeleted(key)) return;

    const sheetRow = byId.get(key);
    if (sheetRow) {
      const prevPaid = Number(row.paidAmount || 0);
      const sheetPaid = Number(sheetRow.paidAmount || 0);

      if (row.sync === "local" || row.sync === "pending" || stamp(row) > stamp(sheetRow)) {
        const localPaid = prevPaid;
        const grandTotal = Number(row.totals?.grandTotal || sheetRow.totals?.grandTotal || 0);
        const rem = Math.max(0, grandTotal - localPaid);
        const pStatus =
          rem <= 0 && localPaid > 0
            ? "Paid"
            : localPaid > 0
              ? "Partially Paid"
              : row.paymentStatus || (grandTotal > 0 ? "Unpaid" : "Paid");

        byId.set(key, {
          ...sheetRow,
          ...row,
          paidAmount: localPaid,
          remainingBalance: rem,
          paymentStatus: pStatus,
          sync: row.sync === "local" || row.sync === "pending" ? row.sync : "synced",
        });
      } else {
        const remotePaid = sheetPaid;
        const grandTotal = Number(sheetRow.totals?.grandTotal || row.totals?.grandTotal || 0);
        const rem = Math.max(0, grandTotal - remotePaid);
        const pStatus =
          rem <= 0 && remotePaid > 0
            ? "Paid"
            : remotePaid > 0
              ? "Partially Paid"
              : sheetRow.paymentStatus || (grandTotal > 0 ? "Unpaid" : "Paid");
        byId.set(key, {
          ...row,
          ...sheetRow,
          paidAmount: remotePaid,
          remainingBalance: rem,
          paymentStatus: pStatus,
        });
      }
    } else if (row.sync === "local" || row.sync === "pending") {
      byId.set(key, row);
    }
  });

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

const markSynced = (setter: (fn: (prev: any[]) => any[]) => void, lsKey: string, id: string) =>
  setRowSync(setter, lsKey, id, "synced");

const markPending = (setter: (fn: (prev: any[]) => any[]) => void, lsKey: string, id: string) =>
  setRowSync(setter, lsKey, id, "pending");

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
  confirmPreProforma: (id: string) => any;
  updateInvoiceStatus: (id: string, status: WorkflowStatus) => void;
  markAsDelivered: (id: string) => void;
  confirmOrder: (
    bookingId: string,
    paymentDetails?: {
      paidAmount?: number;
      paymentType?: string;
      refNo?: string;
      notes?: string;
      dueDate?: string;
    },
  ) => void;
  generateWorkOrder: (orderId: string) => any;
  getBookingsByStatus: (status: WorkflowStatus) => any[];
  saveWorkOrder: (wo: any) => void;
  payments: any[];
  savePayment: (p: any) => void;
  deletePayment: (id: string) => void;
  patchInvoice: (id: string, patch: Record<string, any>, base?: any) => any;
  clearAllData: (options?: { clearLocal?: boolean; clearSheet?: boolean }) => Promise<void>;
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
  /* Consecutive failed polls, and the earliest time the next one may run. */
  const syncFailures = useRef(0);
  const nextSyncAllowedAt = useRef(0);
  /* See patchInvoice: a cursor over `invoices` that also moves within a single
     handler, so two workflow mutations in the same tick cannot undo each other. */
  const invoicesRef = useRef<any[]>([]);
  const lastSyncAttempt = useRef(0);
  /* Deletions the sheet has not confirmed yet. Held in a ref because the merge
     runs inside setState updaters, which must see the latest value rather than
     the one captured when the callback was created. */
  const tombstones = useRef<Tombstones>({});
  /* Bumped by every wipe. A sheet read that was already in flight when the wipe
     started describes the database as it was *before* it, so applying its rows
     afterwards puts every cleared record straight back onto the device — the
     clear looks like it worked and then silently undoes itself. */
  const clearGeneration = useRef(0);

  const rememberDeletion = useCallback((collection: string, id: string) => {
    const next = { ...tombstones.current };
    next[collection] = { ...(next[collection] || {}), [String(id)]: Date.now() };
    tombstones.current = next;
    LS.set("deleted", next);
  }, []);

  const forgetDeletion = useCallback((collection: string, id: string) => {
    const bucket = tombstones.current[collection];
    if (!bucket || bucket[String(id)] === undefined) return;
    const nextBucket = { ...bucket };
    delete nextBucket[String(id)];
    const next = { ...tombstones.current, [collection]: nextBucket };
    tombstones.current = next;
    LS.set("deleted", next);
  }, []);

  /* Run a delete against the sheet, remembering it until the sheet agrees.
     Confirmed deletes (including "already gone") clear the tombstone. */
  const syncDeletion = useCallback(
    (collection: string, id: string, remote: (url: string, id: string) => Promise<boolean>) => {
      const url = settings.sheetUrl;
      if (!url) return;
      remote(url, id)
        .then(() => forgetDeletion(collection, id))
        .catch(() => {
          /* Left in place: the next sync retries, and until then the merge will
             not bring the row back. */
        });
    },
    [settings.sheetUrl, forgetDeletion],
  );

  /* Re-issue every delete the sheet has not acknowledged. Runs on the same
     schedule as the read poll, so a deletion made offline reaches the sheet as
     soon as the connection is back. */
  const retryPendingDeletions = useCallback(() => {
    if (!settings.sheetUrl) return;
    Object.entries(tombstones.current).forEach(([collection, ids]) => {
      const remote = DELETERS[collection];
      if (!remote) return;
      Object.keys(ids || {}).forEach((id) => syncDeletion(collection, id, remote));
    });
  }, [settings.sheetUrl, syncDeletion]);

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
    tombstones.current = loadTombstones();

    /* Settings hydration used to re-assert the company name, address, email,
       GSTIN, PAN and logo over whatever was stored, on every single mount.
       Editing any of them in Settings appeared to work — the toast fired,
       localStorage was written — and the next page load put the hard-coded
       values back, so the company block printed on every invoice could not
       actually be changed. Those same values are already the defaults in
       BASE_SETTINGS, which loadSettings() layers *under* the stored settings,
       so defaults still apply on a fresh install and an edit now survives. */
    const s = Object.assign({}, loadSettings());
    if (!s.sheetUrl) {
      s.sheetUrl = BASE_SETTINGS.sheetUrl;
    }
    setSettings(s);
    LS.set("settings", s);

    const samplePreProforma = buildRecord(
      { ...SAMPLE_INVOICE_07321, docType: "pre_proforma" },
      computeTotals(s, SAMPLE_INVOICE_07321),
    );
    /* Load payments first so invoice paidAmount reconciles with payment records */
    const savedPayments = LS.get<any[] | null>("payments", null);
    const initialPayments =
      savedPayments !== null ? savedPayments.filter((p: any) => p.id !== "pay-1001") : [];
    setPayments(initialPayments);
    LS.set("payments", initialPayments);

    const savedInvoices = LS.get<any[] | null>("invoices", null);
    /* Auto-migrate: ensure every invoice has status and docType fields */
    const rawInvoices =
      savedInvoices !== null
        ? savedInvoices.filter((inv: any) => inv.id !== "inv-07321" && inv.id !== "inv-pi-07321")
        : [];
    const migratedInvoices = rawInvoices.map((inv: any) => {
      const ch = inv.ch ? stripNonInvoiceCharges({ ...inv.ch }) : undefined;
      const updatedInv = {
        ...inv,
        ch,
        docType: inv.docType || "pre_proforma",
        status: inv.status || "draft",
      };
      const recalculatedTotals = computeTotals(s, updatedInv);
      const newTotal = Number(recalculatedTotals?.grandTotal ?? inv.totals?.grandTotal ?? 0);

      // Reconcile paidAmount with matching payments if payments exist
      const matchingPays = (initialPayments || []).filter((p: any) =>
        matchesInvoicePayment(updatedInv, p),
      );
      const paid =
        matchingPays.length > 0
          ? matchingPays.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0)
          : Number(inv.paidAmount || 0);

      const remainingBalance = Math.max(0, newTotal - paid);
      const paymentStatus =
        remainingBalance <= 0 && (paid > 0 || (newTotal > 0 && inv.paymentStatus === "Paid"))
          ? "Paid"
          : paid > 0
            ? "Partially Paid"
            : inv.paymentStatus || "Unpaid";

      return {
        ...updatedInv,
        paidAmount: paid,
        totals: recalculatedTotals || inv.totals,
        remainingBalance,
        paymentStatus,
      };
    });
    setInvoices(migratedInvoices);
    LS.set("invoices", migratedInvoices);

    const savedCustomers = LS.get<any[] | null>("customers", null);
    const initialCustomers =
      savedCustomers !== null ? savedCustomers.filter((c: any) => c.id !== "cus-hindustan") : [];

    /* Auto-harvest customers from invoices */
    migratedInvoices.forEach((invoice: any) => {
      if (invoice.cust && invoice.cust.name && String(invoice.cust.name).trim()) {
        const nameLower = String(invoice.cust.name).trim().toLowerCase();
        const exists = initialCustomers.some(
          (c: any) =>
            String(c.name || "")
              .trim()
              .toLowerCase() === nameLower,
        );
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

    const dedupedInitial = dedupeCustomers(initialCustomers);
    setCustomers(dedupedInitial);
    LS.set("customers", dedupedInitial);

    /* Load work orders */
    const savedWorkOrders = LS.get<any[] | null>("workOrders", null);
    setWorkOrders(savedWorkOrders || []);

    const draft = LS.get<any>("draft", null);
    const initialInv = draft && draft.items ? draft : samplePreProforma;
    if (initialInv && initialInv.ch) stripNonInvoiceCharges(initialInv.ch);
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
      const generation = clearGeneration.current;
      try {
        const snap = await fetchSheetSnapshot(settings.sheetUrl);

        /* A wipe ran while this read was in the air. Its rows are the ones that
           were just deleted, so applying them would re-import the lot. */
        if (generation !== clearGeneration.current) return;

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
            const next = mergeSheetCollection(prev, tab.data, tombstones.current[lsKey]);
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
          syncFailures.current += 1;
          const step =
            SYNC_BACKOFF_MS[Math.min(syncFailures.current, SYNC_BACKOFF_MS.length - 1)] || 0;
          nextSyncAllowedAt.current = Date.now() + step;
          /* A manual click asked for an answer, so it always gets one. A
             background poll stays quiet until the failure repeats — the cached
             rows are still on screen and still correct. */
          if (!opts?.quiet || syncFailures.current >= SYNC_FAILURES_BEFORE_OFFLINE) {
            setSheetError(msg);
          }
          if (!opts?.quiet) toast.error("Could not refresh from Google Sheets: " + msg);
          return;
        }

        /* The read landed, so the backend is up whatever the last poll did. */
        syncFailures.current = 0;
        nextSyncAllowedAt.current = 0;
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
        syncFailures.current += 1;
        const step =
          SYNC_BACKOFF_MS[Math.min(syncFailures.current, SYNC_BACKOFF_MS.length - 1)] || 0;
        nextSyncAllowedAt.current = Date.now() + step;
        if (!opts?.quiet || syncFailures.current >= SYNC_FAILURES_BEFORE_OFFLINE) {
          setSheetError(err?.message || String(err));
        }
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
      /* Hold off while a failing backend is backing off, so the retry does not
         queue behind the execution that just timed out. */
      if (Date.now() < nextSyncAllowedAt.current) return;
      lastSyncAttempt.current = Date.now();
      /* Retry any delete the sheet has not confirmed. Without this a deletion
         made while offline would be honoured on this device forever but never
         reach the sheet, so every *other* device would keep the record. */
      retryPendingDeletions();
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
  }, [hydrated, settings.sheetUrl, loadFromSheet, retryPendingDeletions]);

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

  const newInvoice = useCallback(
    (docType: string = "pre_proforma") => {
      const piNo = getNextProformaNo(invoices);
      const blank = blankInvoice(settings, docType);
      blank.no = piNo;
      blank.orderNo = "";
      blank.preProformaNo = "";
      setInvState(blank);
      const typeLabel = docType === "proforma" ? "Order Confirm" : "Proforma Invoice";
      toast(`Started new ${typeLabel} (${blank.no})`);
    },
    [invoices, settings],
  );

  const syncOne = useCallback(
    (rec: any) => {
      if (!settings.sheetUrl) {
        toast.error("Add your Apps Script URL in Settings to sync");
        return Promise.resolve(false);
      }
      return postInvoice(settings.sheetUrl, rec)
        .then((res: any) => {
          setInvoices((prev) => {
            const next = prev.map((x) => (x.id === rec.id ? { ...x, sync: "synced" } : x));
            LS.set("invoices", next);
            return next;
          });
          /* Document numbers are picked on the device from the records it has
             synced, so two people creating one inside the same 30s window can
             land on the same number. The sheet now reports that instead of
             quietly holding two live documents under one number. */
          if (res?.numberConflict) {
            toast.warning(
              `Saved, but ${res.numberConflict.no} is already used by another record on the sheet. Renumber one of them before sending it out.`,
              { duration: 15000 },
            );
          } else if (res?.oversized) {
            toast.warning(
              "Saved, but this document is too large to store in full on the sheet. The totals and header are safe; re-open it from this device to keep every line item.",
              { duration: 15000 },
            );
          } else {
            toast.success("Synced to your sheet");
          }
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
      const custWithId = Object.assign({ id: cust.id || uid("cus") }, cust, {
        id: cust.id || uid("cus"),
        sync: "local",
        updatedAt: new Date().toISOString(),
      });
      setCustomers((prev) => {
        const next = dedupeCustomers([custWithId, ...prev]);
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
    if (inv.status === "cancelled") {
      toast.error("Cancelled records cannot be modified or saved.");
      return false;
    }
    if (!String(inv.cust.name || "").trim()) {
      toast.error("Enter a customer name before saving");
      return false;
    }
    if (!totals.lines.some((l: any) => l.ok)) {
      toast.error("Add at least one valid item");
      return false;
    }
    if (!hasEnteredRateForInvoice(inv)) {
      toast.error("Enter rate for all items before saving");
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

    toast.success(
      (rec.docType === "proforma" ? "Order Confirm " : "Proforma Invoice ") + rec.no + " saved",
    );
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

  const deleteInvoice = useCallback(
    (id: string) => {
      /* Work out what is going before touching state. A state updater runs at
       render time, not on this line, so anything collected inside one is still
       empty by the time the sheet calls below would read it — and calling
       rememberDeletion from inside an updater would be a side effect during
       render, which StrictMode runs twice. */
      const target = invoices.find((x) => x.id === id);
      /* Deleting a Proforma Invoice has to take its work order — and therefore
       its barcode stickers, which are rendered from the work order's pieces —
       with it. workOrderBelongsTo carries the matching rule; the old inline
       check compared the work order's document numbers against the invoice's
       record id and matched nothing. */
      const doomedWorkOrderIds = target
        ? workOrders.filter((wo) => workOrderBelongsTo(wo, target)).map((wo) => String(wo.id))
        : [];

      /* Tombstone first, then remove: the other order leaves a window where a
       background merge lands in between and puts the row straight back. */
      rememberDeletion("invoices", id);
      doomedWorkOrderIds.forEach((woId) => rememberDeletion("workOrders", woId));

      setInvoices((prev) => {
        const next = prev.filter((x) => x.id !== id);
        LS.set("invoices", next);
        return next;
      });
      if (doomedWorkOrderIds.length) {
        const doomed = new Set(doomedWorkOrderIds);
        setWorkOrders((prev) => {
          const next = prev.filter((x) => !doomed.has(String(x.id)));
          LS.set("workOrders", next);
          return next;
        });
      }
      toast.success(
        doomedWorkOrderIds.length
          ? `Deleted, along with ${doomedWorkOrderIds.length} work order${doomedWorkOrderIds.length === 1 ? "" : "s"} and its stickers`
          : "Deleted",
      );
      /* Also delete from Google Sheet if configured */
      if (settings.sheetUrl) {
        syncDeletion("invoices", id, deleteInvoiceFromSheet);
        /* Work-order rows are keyed by their own id. This used to pass the
         *invoice* id to deleteWorkOrder, which never matched a row, so the work
         orders belonging to a deleted invoice stayed on the sheet forever and
         came back on the next sync. */
        doomedWorkOrderIds.forEach((woId) =>
          syncDeletion("workOrders", woId, deleteWorkOrderFromSheet),
        );
      }
    },
    [settings.sheetUrl, invoices, workOrders, rememberDeletion, syncDeletion],
  );

  const deleteCustomer = useCallback(
    (id: string) => {
      rememberDeletion("customers", id);
      setCustomers((prev) => {
        const next = prev.filter((x) => x.id !== id);
        LS.set("customers", next);
        return next;
      });
      toast.success("Customer deleted");
      if (settings.sheetUrl) {
        syncDeletion("customers", id, deleteCustomerFromSheet);
      }
    },
    [settings.sheetUrl, rememberDeletion, syncDeletion],
  );

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

  /* ── Workflow helpers ──────────────────────────────────────────────

     Every helper below follows the same shape, and it is not incidental.

     They each used to assign the record they had just changed to a variable
     declared *inside* a `setInvoices` updater, then read that variable on the
     next line to decide what to send to the sheet. A state updater does not run
     on the line that schedules it — React defers it to render — so the variable
     was still `null` and the `if (… && record)` guard silently skipped the
     write. React does compute an updater eagerly when the component has no
     other update pending, which is why this worked *most* of the time and
     failed exactly when a second state change had already been queued in the
     same handler: the confirm-order flow, where the work-order status flip
     follows the payment write.

     The damage was invisible and permanent. The change landed in state and in
     localStorage but never reached Google Sheets, and because
     mergeSheetCollection treats a row the sheet returns as authoritative, the
     next 30-second background poll pulled the old row back and reverted it. The
     live sheet still shows the fingerprints: 10 invoices carry a work order but
     not one is marked `work_order_generated`, no invoice has a non-zero
     `paidAmount` despite a recorded payment, and that payment row was written
     with `custName: "Customer"` and the record *id* in place of the invoice
     number — the exact fallbacks taken when the variable was null.

     So: read the record first, apply a patch through the updater (so it lands
     on the freshest row even if state moved underneath), and push the record we
     actually built. `sync: "local"` on the patch is what stops a concurrent
     merge from reverting the change before the write lands. */

  /* Persist one invoice row and settle its sync flag. Routing every workflow
     mutation through here is what keeps a change from being left marked
     `local` forever after a failed write. */
  const pushInvoice = useCallback(
    (rec: any) => {
      if (!settings.sheetUrl || !rec?.id) return;
      postInvoice(settings.sheetUrl, rec)
        .then(() => markSynced(setInvoices, "invoices", rec.id))
        .catch(() => markPending(setInvoices, "invoices", rec.id));
    },
    [settings.sheetUrl],
  );

  /* The list the workflow helpers read from. It tracks `invoices` on every
     render and is also moved forward by each patch, so a second mutation in the
     same handler sees the first. Re-assigning on render is safe under
     StrictMode's double invocation: it writes the same value twice. */
  invoicesRef.current = invoices;

  const findInvoice = useCallback(
    (id: string) => invoicesRef.current.find((x) => String(x.id) === String(id)) || null,
    [],
  );

  /* Apply a patch to one invoice, persist it, and push it to the sheet.

     Reads through `invoicesRef` rather than the `invoices` render snapshot
     because two workflow mutations can run in the same handler. Confirming an
     order does exactly that: confirmOrder writes the payment, then
     updateInvoiceStatus flips the record to `work_order_generated`. Off the
     render snapshot the second call cannot see the first, so it would push a
     record still carrying the old zero `paidAmount` — and being the later
     write, it would land last and undo the payment on the sheet. That is the
     very failure this pass exists to remove, so the cursor has to move with
     each patch, not once per render. */
  const patchInvoice = useCallback(
    (id: string, patch: Record<string, any>, base?: any) => {
      const target = base || findInvoice(id);
      if (!target) return null;
      const full = { ...patch, sync: "local", updatedAt: new Date().toISOString() };
      const apply = (rows: any[]) => rows.map((x) => (x.id === id ? { ...x, ...full } : x));
      invoicesRef.current = apply(invoicesRef.current);
      setInvoices((prev) => {
        const next = apply(prev);
        LS.set("invoices", next);
        return next;
      });
      const updated = { ...target, ...full };
      pushInvoice(updated);
      return updated;
    },
    [findInvoice, pushInvoice],
  );

  const toggleWhatsAppSent = useCallback(
    (id: string) => {
      const target = findInvoice(id);
      if (!target) return;
      const nextState = !target.whatsappSent;
      patchInvoice(id, { whatsappSent: nextState }, target);
      if (nextState) {
        toast.success("Follow Up status set to Yes ✓");
      } else {
        toast.info("Follow Up status set to No");
      }
    },
    [findInvoice, patchInvoice],
  );

  const confirmPreProforma = useCallback(
    (id: string) => {
      /* Decided before the updater runs, so the caller gets a real record back.
         Previously the whole decision lived inside the updater and every branch
         below read a variable that was still null, so the button reported
         "not found" and returned null even on the conversions that succeeded —
         which is why /booking never navigated to the new document. */
      const sourceBooking = findInvoice(id);
      if (!sourceBooking) {
        toast.error("Proforma Invoice not found");
        return null;
      }

      const bookingNo = String(sourceBooking.no || "");
      const duplicateOf = invoicesRef.current.find(
        (x) =>
          x.docType === "proforma" &&
          bookingNo &&
          (String(x.no || "") === bookingNo || String(x.preProformaNo || "") === bookingNo),
      );
      if (duplicateOf) {
        toast.info(`Opening existing Order Confirm ${duplicateOf.no} for this Proforma Invoice.`);
        return duplicateOf;
      }

      const newOrderNo = getNextOrderNo(invoicesRef.current);
      const piNo = sourceBooking.no || getNextProformaNo(invoicesRef.current);
      const stamp = new Date().toISOString();

      const newProforma = {
        ...JSON.parse(JSON.stringify(sourceBooking)),
        id: uid("inv-pi"),
        docType: "proforma",
        no: piNo,
        orderNo: newOrderNo,
        preProformaNo: newOrderNo,
        status: "order_confirmed",
        sync: "local",
        createdAt: stamp,
        updatedAt: stamp,
      };
      const sourcePatch = {
        docType: "proforma_converted",
        status: "order_confirmed" as WorkflowStatus,
        orderNo: newOrderNo,
        preProformaNo: newOrderNo,
        sync: "local",
        updatedAt: stamp,
      };

      const apply = (rows: any[]) => [
        newProforma,
        ...rows.map((x) => (x.id === id ? { ...x, ...sourcePatch } : x)),
      ];
      invoicesRef.current = apply(invoicesRef.current);
      setInvoices((prev) => {
        const next = apply(prev);
        LS.set("invoices", next);
        return next;
      });

      toast.success(
        `Confirmed! Assigned Order No. ${newProforma.orderNo} for PI ${newProforma.no}`,
      );
      pushInvoice(newProforma);
      /* The booking's own row has to go up too — it now says "converted", and a
         sheet that still calls it a live booking double-counts the order. */
      pushInvoice({ ...sourceBooking, ...sourcePatch });
      return newProforma;
    },
    [findInvoice, pushInvoice],
  );

  const updateInvoiceStatus = useCallback(
    (id: string, status: WorkflowStatus) => {
      patchInvoice(id, { status });
    },
    [patchInvoice],
  );

  const markAsDelivered = useCallback(
    (id: string) => {
      const target = findInvoice(id);
      if (!target || target.delivered) return;
      patchInvoice(id, { delivered: true, deliveredAt: new Date().toISOString() }, target);
    },
    [findInvoice, patchInvoice],
  );

  const savePayment = useCallback(
    (pay: any) => {
      const rec = {
        ...pay,
        id: pay.id || uid("pay"),
        createdAt: pay.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        sync: "local",
      };
      setPayments((prev) => {
        const existing = prev.findIndex((x) => x.id === rec.id);
        const next =
          existing >= 0 ? prev.map((x, i) => (i === existing ? rec : x)) : [rec, ...prev];
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
    },
    [settings.sheetUrl],
  );

  const confirmOrder = useCallback(
    (
      bookingId: string,
      paymentDetails?: {
        paidAmount?: number;
        paymentType?: string;
        refNo?: string;
        notes?: string;
        dueDate?: string;
      },
    ) => {
      /* This is the flow the live sheet caught red-handed. The record was built
         inside the updater, so the payment row below was written with the
         "Customer" / record-id fallbacks and the sheet write at the end was
         skipped outright — the confirmed amount never left the device, and the
         next background merge pulled the unpaid row back over it. */
      const target = findInvoice(bookingId);
      if (!target) {
        toast.error("Order Confirm record not found");
        return;
      }

      const grandTotal = Number(target.totals?.grandTotal) || 0;
      const rawPaid = Number(paymentDetails?.paidAmount ?? target.paidAmount ?? 0);
      const paidAmount =
        grandTotal > 0 ? Math.min(grandTotal, Math.max(0, rawPaid)) : Math.max(0, rawPaid);
      const remainingBalance = Math.max(0, grandTotal - paidAmount);
      let paymentStatus = "Credit";
      if (paidAmount >= grandTotal && grandTotal > 0) {
        paymentStatus = "Paid";
      } else if (paidAmount > 0) {
        paymentStatus = "Partially Paid";
      }
      const paymentType = paymentDetails?.paymentType || target.delivery?.paymentType || "Credit";

      const updated = patchInvoice(
        bookingId,
        {
          docType: "proforma",
          status: "order_confirmed" as WorkflowStatus,
          delivery: { ...(target.delivery || {}), paymentType, paymentTerm: paymentType },
          paidAmount,
          remainingBalance,
          paymentStatus,
          paymentRef:
            paymentDetails?.refNo !== undefined ? paymentDetails.refNo : target.paymentRef,
          paymentNotes:
            paymentDetails?.notes !== undefined ? paymentDetails.notes : target.paymentNotes,
          dueDate: paymentDetails?.dueDate !== undefined ? paymentDetails.dueDate : target.dueDate,
        },
        target,
      );

      if (paymentDetails && paidAmount > 0) {
        savePayment({
          id: uid("pay"),
          invoiceId: target.id,
          custName: updated?.cust?.name || target.cust?.name || "Customer",
          /* The document number, not the record id. The one payment on the live
             sheet carries an id here because this read the null variable. */
          invoiceNo: updated?.no || target.no || bookingId,
          date: new Date().toISOString().slice(0, 10),
          amount: paidAmount,
          mode: paymentDetails.paymentType || "Credit",
          refNo: paymentDetails.refNo || "",
          notes: paymentDetails.notes || "Order Confirmation Payment",
          createdAt: new Date().toISOString(),
        });
      }

      toast.success("Order confirmed & payment details saved!");
    },
    [findInvoice, patchInvoice, savePayment],
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

      const allItems: any[] = [];
      if (order.layers && order.layers.length > 0) {
        order.layers.forEach((l: any, lIdx: number) => {
          let lItems = l.items && l.items.length > 0 ? l.items : [];
          if (lIdx === 0 && lItems.length === 0 && order.items && order.items.length > 0) {
            lItems = order.items;
          }
          lItems.forEach((it: any) => {
            allItems.push({
              ...it,
              layerIdx: lIdx,
              layerNo: l.layerNo || `Item ${lIdx + 1}`,
              productName: l.productName || l.glassName || it.productName || order.productName,
              thickness: l.thickness || it.thickness || order.glass?.thickness,
            });
          });
        });
      }
      if (!allItems.length) {
        (order.items || []).forEach((it: any) => {
          allItems.push({ ...it, layerIdx: 0 });
        });
      }

      allItems.forEach((item: any, idx: number) => {
        const line = orderTotals.lines?.[idx];
        if (!line?.ok) return;
        const layerIdx = item.layerIdx !== undefined ? item.layerIdx : idx;
        const layerObj = order.layers?.[layerIdx] || null;
        const prodName =
          layerObj?.productName ||
          layerObj?.glassName ||
          item.productName ||
          order.productName ||
          "Glass Product";
        const layerNo = layerObj?.layerNo || item.layerNo || `Item ${layerIdx + 1}`;
        const qty = Number(item.qty) || 1;
        for (let p = 0; p < qty; p++) {
          globalSr++;
          const barcodeNum =
            String((order.orderNo || order.no || "0000").replace(/\D/g, "")).padStart(4, "0") +
            String(globalSr).padStart(4, "0") +
            String(p + 1).padStart(2, "0");
          pieces.push({
            sr: globalSr,
            layerIdx,
            layerNo,
            productName: prodName,
            freq: item.freq || 8,
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
            cutOut: item.cutouts || 0,
            bigHole: item.bigHoles || 0,
            bigCutout: item.bigCutouts || 0,
            csk: item.csks || item.countersinks || 0,
            chgHeightMM: line.lChgMM || line.lMM,
            chgWidthMM: line.wChgMM || line.wMM,
            chgArea: line.chargeAreaSqm ?? line.totalSqm,
            chgAreaFt: line.chargeAreaSqft ?? line.totalSqft,
            amount: line.amount ? Number(line.amount) / qty : 0,
            shape: item.shape || "BLOCK",
            barcode: barcodeNum,
            remark: item.remark || "",
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
        inputUnit: order.inputUnit || "inch",
        frequencyEnabled: Boolean(order.frequencyEnabled),
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

  const saveWorkOrder = useCallback(
    (wo: any) => {
      const rec = { ...wo, sync: "local", updatedAt: new Date().toISOString() };
      setWorkOrders((prev) => {
        const existing = prev.findIndex((x) => x.id === rec.id);
        const next =
          existing >= 0 ? prev.map((x, i) => (i === existing ? rec : x)) : [rec, ...prev];
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
    },
    [settings.sheetUrl],
  );

  const getBookingsByStatus = useCallback(
    (status: WorkflowStatus) => {
      return invoices.filter((x) => (x.status || "draft") === status);
    },
    [invoices],
  );

  const deletePayment = useCallback(
    (id: string) => {
      rememberDeletion("payments", id);
      const targetPay = payments.find((x) => x.id === id);

      const nextPayments = payments.filter((x) => x.id !== id);
      setPayments(nextPayments);
      LS.set("payments", nextPayments);

      if (targetPay) {
        const targetInv = invoicesRef.current.find((x: any) => matchesInvoicePayment(x, targetPay));

        if (targetInv) {
          const remainingForInv = nextPayments.filter((x) => matchesInvoicePayment(targetInv, x));
          const newPaid = remainingForInv.reduce((sum, x) => sum + (Number(x.amount) || 0), 0);
          const gTotal = Number(
            targetInv.totals?.grandTotal || computeTotals(settings, targetInv).grandTotal || 0,
          );
          const newRemaining = Math.max(0, gTotal - newPaid);
          const newStatus =
            newRemaining <= 0 && gTotal > 0 ? "Paid" : newPaid > 0 ? "Partially Paid" : "Unpaid";

          patchInvoice(targetInv.id, {
            paidAmount: newPaid,
            remainingBalance: newRemaining,
            paymentStatus: newStatus,
          });
        }
      }

      toast.success("Payment deleted");
      if (settings.sheetUrl) {
        syncDeletion("payments", id, deletePaymentFromSheet);
      }
    },
    [payments, patchInvoice, settings, rememberDeletion, syncDeletion],
  );

  const pushAllToSheet = useCallback(async () => {
    if (!settings.sheetUrl) {
      toast.error("Add your Apps Script URL in Settings first");
      return;
    }
    setSheetSyncing(true);
    const toastId = toast.loading("Pushing to Google Sheets…");
    try {
      /* Sent in batches rather than as one giant POST — see pushAllInChunks.
         The result names exactly which ids the sheet acknowledged. */
      const result = await pushAllInChunks(
        settings.sheetUrl,
        { invoices, customers, workOrders, payments },
        (done, total) =>
          toast.loading(`Pushing to Google Sheets… ${done}/${total}`, { id: toastId }),
      );

      /* Mark only the ids the sheet confirmed. Blanket-marking everything
         "synced" was how a failed push lost data: the rows were flagged as
         living on the sheet, so the next merge saw them missing there and
         purged them from the device. */
      const markSaved = (
        setter: (fn: (prev: any[]) => any[]) => void,
        lsKey: string,
        savedIds: string[],
      ) => {
        const saved = new Set(savedIds);
        setter((prev) => {
          const next = prev.map((x) => (saved.has(String(x.id)) ? { ...x, sync: "synced" } : x));
          LS.set(lsKey, next);
          return next;
        });
      };
      markSaved(setInvoices, "invoices", result.savedIds["invoices"] || []);
      markSaved(setCustomers, "customers", result.savedIds["customers"] || []);
      markSaved(setWorkOrders, "workOrders", result.savedIds["workOrders"] || []);
      markSaved(setPayments, "payments", result.savedIds["payments"] || []);

      const r = result.results;
      const summary = `Pushed to sheet: ${r.invoices} invoices, ${r.customers} customers, ${r.workOrders} work orders, ${r.payments} payments`;
      const failed = result.failures.length + result.batchErrors.length;
      if (failed) {
        toast.error(
          `${summary}. ${failed} record(s) did not save — they are still marked unsynced, so pushing again will retry just those.`,
          { id: toastId, duration: 12000 },
        );
      } else {
        toast.success(summary, { id: toastId });
      }
    } catch (err: any) {
      toast.error("Failed to push to sheet: " + (err?.message || err), { id: toastId });
    } finally {
      setSheetSyncing(false);
    }
  }, [settings.sheetUrl, invoices, customers, workOrders, payments]);

  const clearAllData = useCallback(
    async (
      options: { clearLocal?: boolean; clearSheet?: boolean } = {
        clearLocal: true,
        clearSheet: true,
      },
    ) => {
      const doLocal = options.clearLocal !== false;
      const doSheet = options.clearSheet !== false;

      /* Fence off every read already in flight — its snapshot predates the wipe
         — and start the poll throttle here so the interval cannot fire the
         instant the sheet call returns. */
      clearGeneration.current += 1;
      lastSyncAttempt.current = Date.now();

      setSheetSyncing(true);
      let sheetSuccess = false;
      let sheetErr = "";
      const toastId = "clear-all-data";

      if (doSheet && settings.sheetUrl) {
        try {
          await clearAllSheetData(settings.sheetUrl, (done, total) =>
            toast.loading(
              `This Apps Script deployment cannot wipe the sheet in one pass — removing rows one by one… ${done}/${total}`,
              { id: toastId },
            ),
          );
          sheetSuccess = true;
        } catch (err: any) {
          sheetErr = err?.message || String(err);
        }
      }

      if (doLocal) {
        setInvoices([]);
        setCustomers([]);
        setWorkOrders([]);
        setPayments([]);
        invoicesRef.current = [];

        LS.set("invoices", []);
        LS.set("customers", []);
        LS.set("workOrders", []);
        LS.set("payments", []);
        /* The draft lives under `gq.draft` (see the hydrate and the autosave).
           The `gq_draft_v1` key this used to remove has not existed since the
           storage keys were unified, so the draft survived every "clear". */
        LS.remove("draft");

        /* Tombstones may only be dropped once the sheet is actually empty:
           there is then nothing left for them to hold back. Clearing them after
           a *failed* wipe would hand every previously deleted row the sheet
           still carries back to the next merge. */
        if (sheetSuccess || !settings.sheetUrl) {
          tombstones.current = {};
          LS.set("deleted", {});
        }

        const freshInv = blankInvoice(settings);
        setInvState(freshInv);
      }

      setSheetSyncing(false);

      /* The sheet is the source of truth for every row it returns, so clearing
         the device while the sheet still holds the records only hides them
         until the next poll. Say so, rather than reporting a clean wipe the
         user watches undo itself thirty seconds later. */
      if (doLocal && doSheet) {
        if (sheetSuccess) {
          toast.success(
            "Total Clear Complete! Both local website data and Google Sheet database have been wiped clean.",
            { id: toastId },
          );
        } else if (settings.sheetUrl) {
          toast.error(
            `Local website data cleared, but the Google Sheet clear failed: ${sheetErr} — the sheet still holds those records, so the next sync will pull them straight back.`,
            { id: toastId, duration: 16000 },
          );
        } else {
          toast.success("Local website data cleared clean!", { id: toastId });
        }
      } else if (doLocal) {
        if (settings.sheetUrl) {
          toast.success(
            "Local website data cleared. The connected Google Sheet was left untouched, so its records re-appear on the next sync — use Total Clear to wipe the database as well.",
            { id: toastId, duration: 14000 },
          );
        } else {
          toast.success("Local website data cleared clean!", { id: toastId });
        }
      } else if (doSheet) {
        if (sheetSuccess) {
          toast.success("Google Sheet database wiped clean!", { id: toastId });
        } else {
          toast.error(`Failed to clear Google Sheet: ${sheetErr}`, {
            id: toastId,
            duration: 14000,
          });
        }
      }
    },
    [settings],
  );

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
    markAsDelivered,
    confirmOrder,
    generateWorkOrder,
    getBookingsByStatus,
    saveWorkOrder,
    patchInvoice,
    clearAllData,
  };

  return <GQ.Provider value={value}>{children}</GQ.Provider>;
}

export function useGQ() {
  const ctx = useContext(GQ);
  if (!ctx) throw new Error("useGQ must be used inside GlassQuoteProvider");
  return ctx;
}
