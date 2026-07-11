/** IndexedDB helpers for offline knowledge pack + session recordings. */

const DB_NAME = 'flatsix-track';
const DB_VERSION = 1;

export interface TrackSession {
  id: string;
  startedAt: string;
  endedAt?: string;
  label: string;
  samples: { t: number; values: Record<string, string | number | object> }[];
  faultsSnapshot?: unknown;
  vehicleSnapshot?: unknown;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('sessions')) {
        db.createObjectStore('sessions', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta', { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function withStore<T>(
  storeName: string,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T> | void,
): Promise<T | void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    const req = fn(store);
    tx.oncomplete = () => resolve(req ? req.result : undefined);
    tx.onerror = () => reject(tx.error);
    if (req) {
      req.onerror = () => reject(req.error);
    }
  });
}

export async function saveSession(session: TrackSession): Promise<void> {
  await withStore('sessions', 'readwrite', (store) => store.put(session));
}

export async function listSessions(): Promise<TrackSession[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('sessions', 'readonly');
    const req = tx.objectStore('sessions').getAll();
    req.onsuccess = () => {
      const rows = (req.result as TrackSession[]).sort((a, b) =>
        b.startedAt.localeCompare(a.startedAt),
      );
      resolve(rows);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function getSession(id: string): Promise<TrackSession | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = db.transaction('sessions', 'readonly').objectStore('sessions').get(id);
    req.onsuccess = () => resolve(req.result as TrackSession | undefined);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteSession(id: string): Promise<void> {
  await withStore('sessions', 'readwrite', (store) => store.delete(id));
}

export async function setMeta(key: string, value: unknown): Promise<void> {
  await withStore('meta', 'readwrite', (store) => store.put({ key, value }));
}

export async function getMeta<T>(key: string): Promise<T | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = db.transaction('meta', 'readonly').objectStore('meta').get(key);
    req.onsuccess = () => resolve((req.result as { value: T } | undefined)?.value);
    req.onerror = () => reject(req.error);
  });
}
