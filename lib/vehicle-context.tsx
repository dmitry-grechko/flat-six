'use client';

import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { VEHICLE } from './data';
import { DEMO_MODE } from './demo';
import { createClient } from './supabase/client';
import {
  listVehicles,
  createVehicle,
  updateVehicle,
  type StoredVehicle,
} from './db/vehicles';
import type { Vehicle, BodyType } from './types';
import { CAR_VARIANTS, variantGlb } from './models';

// Derived from the car-variant registry (lib/models.ts) — add generations there.
export const MODEL_OPTIONS: { id: BodyType; label: string; glb: string; modelName: string }[] =
  CAR_VARIANTS.map((v) => ({ id: v.id, label: v.label, glb: v.glb, modelName: v.modelName }));

export function modelGlb(body: BodyType): string {
  return variantGlb(body);
}

interface VehicleCtx {
  /** The active vehicle. Falls back to the template until the garage loads. */
  vehicle: Vehicle;
  /** Row id of the active vehicle (empty until loaded). */
  activeId: string;
  /** All vehicles in the user's garage. */
  vehicles: StoredVehicle[];
  loading: boolean;
  /** Patch + persist the active vehicle. */
  update: (patch: Partial<Vehicle>) => void;
  /** Switch the active vehicle. */
  select: (id: string) => void;
  /** Add a new vehicle (seeded from the 981 template) and make it active. */
  addVehicle: (v?: Partial<Vehicle>) => Promise<void>;
  /** Reload the garage from the database, discarding any unsaved local edits. */
  reset: () => void;
}

const Ctx = createContext<VehicleCtx | null>(null);

export function VehicleProvider({ children }: { children: React.ReactNode }) {
  const [vehicles, setVehicles] = useState<StoredVehicle[]>([]);
  const [activeId, setActiveId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const bootstrapped = useRef(false);

  const load = useCallback(async (preferId?: string) => {
    // In demo mode there's no session — skip the auth check and load the
    // in-memory placeholder garage directly.
    if (!DEMO_MODE) {
      // No session (e.g. on the login page) — don't try to seed a garage.
      const {
        data: { user },
      } = await createClient().auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
    }
    let list = await listVehicles();
    // First-time user: seed a default 981 so the app looks populated (matches the
    // pre-Supabase UX). The DB-level RLS scopes it to this user.
    if (list.length === 0) {
      const created = await createVehicle(VEHICLE, { primary: true });
      list = [created];
    }
    setVehicles(list);
    setActiveId((curr) => {
      const target = preferId ?? curr;
      if (target && list.some((v) => v.id === target)) return target;
      return (list.find((v) => v.isPrimary) ?? list[0]).id;
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    if (bootstrapped.current) return; // guard React 18 StrictMode double-invoke
    bootstrapped.current = true;
    load().catch((e) => {
      console.error('Failed to load garage', e);
      setLoading(false);
    });
  }, [load]);

  const active = vehicles.find((v) => v.id === activeId);
  const vehicle: Vehicle = active ?? VEHICLE;

  const update = useCallback(
    (patch: Partial<Vehicle>) => {
      if (!activeId) return;
      // optimistic local update
      setVehicles((vs) => vs.map((v) => (v.id === activeId ? { ...v, ...patch } : v)));
      updateVehicle(activeId, patch).catch((e) => console.error('Failed to save vehicle', e));
    },
    [activeId],
  );

  const select = useCallback((id: string) => setActiveId(id), []);

  const addVehicle = useCallback(async (v: Partial<Vehicle> = {}) => {
    const created = await createVehicle({ ...VEHICLE, ...v });
    setVehicles((vs) => [...vs, created]);
    setActiveId(created.id);
  }, []);

  const reset = useCallback(() => {
    setLoading(true);
    load(activeId).catch((e) => {
      console.error('Failed to reload garage', e);
      setLoading(false);
    });
  }, [load, activeId]);

  return (
    <Ctx.Provider value={{ vehicle, activeId, vehicles, loading, update, select, addVehicle, reset }}>
      {children}
    </Ctx.Provider>
  );
}

export function useVehicle(): VehicleCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useVehicle must be used within VehicleProvider');
  return v;
}
