'use client';

import type { GarageSnapshot, PendingOp } from './types';
import { OFFLINE_DB, OFFLINE_DB_VERSION } from './types';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB not available'));
      return;
    }
    const req = indexedDB.open(OFFLINE_DB, OFFLINE_DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta', { keyPath: 'key' });
      if (!db.objectStoreNames.contains('pending')) db.createObjectStore('pending', { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IDB open failed'));
  });
}

async function metaGet<T>(key: string): Promise<T | undefined> {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const req = db.transaction('meta', 'readonly').objectStore('meta').get(key);
      req.onsuccess = () => resolve((req.result as { key: string; value: T } | undefined)?.value);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return undefined;
  }
}

async function metaSet(key: string, value: unknown): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const req = db.transaction('meta', 'readwrite').objectStore('meta').put({ key, value });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn('[offline] metaSet failed', e);
  }
}

export async function loadSnapshot(): Promise<GarageSnapshot | null> {
  return (await metaGet<GarageSnapshot>('snapshot')) ?? null;
}

export async function saveSnapshot(snap: GarageSnapshot): Promise<void> {
  await metaSet('snapshot', snap);
}

export async function clearSnapshot(): Promise<void> {
  await metaSet('snapshot', null);
}

export async function listPending(): Promise<PendingOp[]> {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const req = db.transaction('pending', 'readonly').objectStore('pending').getAll();
      req.onsuccess = () => {
        const rows = (req.result as PendingOp[]) ?? [];
        rows.sort((a, b) => a.at.localeCompare(b.at));
        resolve(rows);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export async function enqueuePending(op: PendingOp): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const req = db.transaction('pending', 'readwrite').objectStore('pending').put(op);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn('[offline] enqueue failed', e);
  }
}

export async function removePending(id: string): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const req = db.transaction('pending', 'readwrite').objectStore('pending').delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn('[offline] removePending failed', e);
  }
}

export async function clearPending(): Promise<void> {
  const ops = await listPending();
  await Promise.all(ops.map((o) => removePending(o.id)));
}

export function pendingId(): string {
  return `op-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function isProbablyOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}
