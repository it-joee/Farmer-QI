import type {
  FarmerIdMapping,
  PendingEventRecord,
  PendingFarmerRecord,
  PendingServerAttendeeAdd,
} from "./types";

const DB_NAME = "farmeriq-offline";
const DB_VERSION = 4;

/** All object stores and their key paths — every upgrade must ensure these exist. */
const STORE_DEFS = {
  pending_farmers: "localId",
  pending_events: "localId",
  pending_server_attendees: "id",
  farmer_id_map: "localId",
} as const;

export const STORES = {
  farmers: "pending_farmers",
  events: "pending_events",
  serverAttendees: "pending_server_attendees",
  farmerMap: "farmer_id_map",
} as const;

function normalizePendingEvent(
  raw: PendingEventRecord & { presentFarmerIds?: string[] }
): PendingEventRecord {
  if (Array.isArray(raw.attendees)) return raw;
  return { ...raw, attendees: [] };
}

function ensureStores(db: IDBDatabase): void {
  for (const [name, keyPath] of Object.entries(STORE_DEFS)) {
    if (!db.objectStoreNames.contains(name)) {
      db.createObjectStore(name, { keyPath });
    }
  }
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB open failed"));
    request.onsuccess = () => {
      const db = request.result;
      const missing = Object.keys(STORE_DEFS).filter((name) => !db.objectStoreNames.contains(name));
      if (missing.length > 0) {
        db.close();
        reject(new Error(`IndexedDB missing stores: ${missing.join(", ")}`));
        return;
      }
      resolve(db);
    };
    request.onupgradeneeded = (event) => {
      ensureStores((event.target as IDBOpenDBRequest).result);
    };
  });
}

function withStore<T>(
  storeName: string,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        if (!db.objectStoreNames.contains(storeName)) {
          db.close();
          reject(new Error(`IndexedDB store not found: ${storeName}`));
          return;
        }

        const tx = db.transaction(storeName, mode);
        const store = tx.objectStore(storeName);
        const request = fn(store);
        request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
        request.onsuccess = () => resolve(request.result as T);
        tx.oncomplete = () => db.close();
        tx.onerror = () => reject(tx.error ?? new Error("IndexedDB transaction failed"));
      })
  );
}

async function safeCount(fn: () => Promise<number>): Promise<number> {
  try {
    return await fn();
  } catch {
    return 0;
  }
}

// --- Farmers ---

export async function addPendingFarmer(record: PendingFarmerRecord): Promise<void> {
  await withStore(STORES.farmers, "readwrite", (store) => store.put(record));
}

export async function updatePendingFarmer(record: PendingFarmerRecord): Promise<void> {
  await withStore(STORES.farmers, "readwrite", (store) => store.put(record));
}

export async function removePendingFarmer(localId: string): Promise<void> {
  await withStore(STORES.farmers, "readwrite", (store) => store.delete(localId));
}

export async function getPendingFarmer(localId: string): Promise<PendingFarmerRecord | null> {
  const record = await withStore<PendingFarmerRecord | undefined>(STORES.farmers, "readonly", (store) =>
    store.get(localId)
  );
  return record ?? null;
}

export async function listPendingFarmers(createdBy: string): Promise<PendingFarmerRecord[]> {
  const all = await withStore<PendingFarmerRecord[]>(STORES.farmers, "readonly", (store) => store.getAll());
  return all
    .filter((record) => record.createdBy === createdBy)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function countPendingFarmers(createdBy: string): Promise<number> {
  const list = await listPendingFarmers(createdBy);
  return list.filter((record) => record.status === "pending" || record.status === "failed").length;
}

// --- Events ---

export async function addPendingEvent(record: PendingEventRecord): Promise<void> {
  await withStore(STORES.events, "readwrite", (store) => store.put(record));
}

export async function updatePendingEvent(record: PendingEventRecord): Promise<void> {
  await withStore(STORES.events, "readwrite", (store) => store.put(record));
}

export async function removePendingEvent(localId: string): Promise<void> {
  await withStore(STORES.events, "readwrite", (store) => store.delete(localId));
}

export async function getPendingEvent(localId: string): Promise<PendingEventRecord | null> {
  const record = await withStore<PendingEventRecord | undefined>(STORES.events, "readonly", (store) =>
    store.get(localId)
  );
  return record ? normalizePendingEvent(record) : null;
}

export async function listPendingEvents(createdBy: string): Promise<PendingEventRecord[]> {
  const all = await withStore<PendingEventRecord[]>(STORES.events, "readonly", (store) => store.getAll());
  return all
    .filter((record) => record.createdBy === createdBy)
    .map(normalizePendingEvent)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function countPendingEvents(createdBy: string): Promise<number> {
  const list = await listPendingEvents(createdBy);
  return list.filter((record) => record.status === "pending" || record.status === "failed").length;
}

// --- Server event attendee queue (adds while offline) ---

export async function upsertPendingServerAttendee(record: PendingServerAttendeeAdd): Promise<void> {
  await withStore(STORES.serverAttendees, "readwrite", (store) => store.put(record));
}

export async function removePendingServerAttendee(id: string): Promise<void> {
  await withStore(STORES.serverAttendees, "readwrite", (store) => store.delete(id));
}

export async function listPendingServerAttendees(createdBy: string): Promise<PendingServerAttendeeAdd[]> {
  const all = await withStore<PendingServerAttendeeAdd[]>(STORES.serverAttendees, "readonly", (store) =>
    store.getAll()
  );
  return all
    .filter((record) => record.markedBy === createdBy)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function countPendingServerAttendees(createdBy: string): Promise<number> {
  const list = await listPendingServerAttendees(createdBy);
  return list.filter((record) => record.status === "pending" || record.status === "failed").length;
}

// --- Farmer ID mapping (pending localId → server id after sync) ---

export async function saveFarmerIdMapping(localId: string, serverId: string): Promise<void> {
  await withStore(STORES.farmerMap, "readwrite", (store) =>
    store.put({ localId, serverId } satisfies FarmerIdMapping)
  );
}

export async function getFarmerServerId(localId: string): Promise<string | null> {
  const mapping = await withStore<FarmerIdMapping | undefined>(STORES.farmerMap, "readonly", (store) =>
    store.get(localId)
  );
  return mapping?.serverId ?? null;
}

export async function resolveFarmerId(farmerRef: string): Promise<string> {
  const mapping = await withStore<FarmerIdMapping | undefined>(STORES.farmerMap, "readonly", (store) =>
    store.get(farmerRef)
  );
  return mapping?.serverId ?? farmerRef;
}

export async function countAllPending(createdBy: string): Promise<number> {
  const [farmers, events, serverAttendees] = await Promise.all([
    safeCount(() => countPendingFarmers(createdBy)),
    safeCount(() => countPendingEvents(createdBy)),
    safeCount(() => countPendingServerAttendees(createdBy)),
  ]);
  return farmers + events + serverAttendees;
}
