'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useVehicle } from './vehicle-context';
import {
  listPlans,
  addPlan as dbAdd,
  updatePlan as dbUpdate,
  deletePlan as dbDelete,
  type NewServicePlan,
  type PlanPatch,
} from './db/service-plans';
import type { ServicePlan } from './types';

interface PlansCtx {
  plans: ServicePlan[];
  loading: boolean;
  add: (plan: NewServicePlan) => Promise<ServicePlan>;
  update: (id: string, patch: PlanPatch) => Promise<ServicePlan>;
  remove: (id: string) => Promise<void>;
}

const Ctx = createContext<PlansCtx | null>(null);

/** Loads + mutates the service plans for the active vehicle (from VehicleProvider). */
export function PlansProvider({ children }: { children: React.ReactNode }) {
  const { activeId } = useVehicle();
  const [plans, setPlans] = useState<ServicePlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeId) {
      setPlans([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    // Clear immediately so a previous car's plans never flash while the next loads.
    setPlans([]);
    setLoading(true);
    listPlans(activeId)
      .then((ps) => {
        if (!cancelled) {
          setPlans(ps);
          setLoading(false);
        }
      })
      .catch((e) => {
        console.error('Failed to load service plans', e);
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeId]);

  const add = useCallback(
    async (plan: NewServicePlan) => {
      if (!activeId) throw new Error('No active vehicle');
      const created = await dbAdd(activeId, plan);
      setPlans((ps) => [created, ...ps]);
      return created;
    },
    [activeId],
  );

  const update = useCallback(async (id: string, patch: PlanPatch) => {
    const updated = await dbUpdate(id, patch);
    setPlans((ps) => ps.map((p) => (p.id === id ? updated : p)));
    return updated;
  }, []);

  const remove = useCallback(async (id: string) => {
    await dbDelete(id);
    setPlans((ps) => ps.filter((p) => p.id !== id));
  }, []);

  return <Ctx.Provider value={{ plans, loading, add, update, remove }}>{children}</Ctx.Provider>;
}

export function useServicePlans(): PlansCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useServicePlans must be used within PlansProvider');
  return v;
}
