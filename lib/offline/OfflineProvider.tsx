'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { DEMO_MODE } from '@/lib/demo';
import { isProbablyOffline, listPending, syncGarage } from './sync';

interface OfflineCtx {
  online: boolean;
  pendingCount: number;
  lastSyncAt: string | null;
  syncing: boolean;
  syncNow: () => Promise<void>;
}

const Ctx = createContext<OfflineCtx | null>(null);

export function OfflineProvider({ children }: { children: React.ReactNode }) {
  const [online, setOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  const refreshPending = useCallback(async () => {
    const ops = await listPending();
    setPendingCount(ops.length);
  }, []);

  const syncNow = useCallback(async () => {
    if (DEMO_MODE) return;
    setSyncing(true);
    try {
      const res = await syncGarage();
      if (res.ok) setLastSyncAt(new Date().toISOString());
      setPendingCount(res.pending);
    } finally {
      setSyncing(false);
    }
  }, []);

  useEffect(() => {
    if (DEMO_MODE) return;
    const update = () => setOnline(!isProbablyOffline());
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    void refreshPending();
    void syncNow();
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, [refreshPending, syncNow]);

  useEffect(() => {
    if (DEMO_MODE || !online) return;
    void syncNow();
  }, [online, syncNow]);

  return (
    <Ctx.Provider value={{ online, pendingCount, lastSyncAt, syncing, syncNow }}>
      {children}
    </Ctx.Provider>
  );
}

export function useOffline(): OfflineCtx {
  const v = useContext(Ctx);
  if (!v) {
    // Assume online when unmounted from provider — never read navigator during render.
    return {
      online: true,
      pendingCount: 0,
      lastSyncAt: null,
      syncing: false,
      syncNow: async () => {},
    };
  }
  return v;
}
