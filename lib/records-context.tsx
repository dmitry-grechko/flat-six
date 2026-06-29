'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useVehicle } from './vehicle-context';
import {
  listRecords,
  addRecord as dbAdd,
  updateRecord as dbUpdate,
  deleteRecord as dbDelete,
  type NewServiceRecord,
} from './db/service-records';
import type { ServiceRecord } from './types';

interface RecordsCtx {
  records: ServiceRecord[];
  loading: boolean;
  add: (rec: NewServiceRecord) => Promise<ServiceRecord>;
  update: (id: string, rec: NewServiceRecord) => Promise<ServiceRecord>;
  remove: (id: string) => Promise<void>;
}

const Ctx = createContext<RecordsCtx | null>(null);

/** Loads + mutates the service records for the active vehicle (from VehicleProvider). */
export function RecordsProvider({ children }: { children: React.ReactNode }) {
  const { activeId } = useVehicle();
  const [records, setRecords] = useState<ServiceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeId) return;
    let cancelled = false;
    setLoading(true);
    listRecords(activeId)
      .then((rs) => {
        if (!cancelled) {
          setRecords(rs);
          setLoading(false);
        }
      })
      .catch((e) => {
        console.error('Failed to load service records', e);
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeId]);

  const add = useCallback(
    async (rec: NewServiceRecord) => {
      if (!activeId) throw new Error('No active vehicle');
      const created = await dbAdd(activeId, rec);
      setRecords((rs) => [created, ...rs]);
      return created;
    },
    [activeId],
  );

  const update = useCallback(async (id: string, rec: NewServiceRecord) => {
    const updated = await dbUpdate(id, rec);
    setRecords((rs) => rs.map((r) => (r.id === id ? updated : r)));
    return updated;
  }, []);

  const remove = useCallback(async (id: string) => {
    await dbDelete(id);
    setRecords((rs) => rs.filter((r) => r.id !== id));
  }, []);

  return <Ctx.Provider value={{ records, loading, add, update, remove }}>{children}</Ctx.Provider>;
}

export function useServiceRecords(): RecordsCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useServiceRecords must be used within RecordsProvider');
  return v;
}
