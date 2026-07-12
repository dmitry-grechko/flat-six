'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';

/**
 * Distance-unit preference (odometer, service mileage, plan targets).
 *
 * Mileage is ALWAYS stored canonically in **miles** (integers). This preference
 * only controls how distances are displayed and entered — values are converted
 * at the UI boundary via `milesToDisplay` / `displayToMiles`. That keeps stored
 * data consistent regardless of which unit a user picks or switches to.
 *
 * Stored client-side in localStorage (a display preference, works in demo mode
 * and needs no DB migration). Defaults to 'mi'.
 */
export type DistanceUnit = 'mi' | 'km';

const STORAGE_KEY = 'flatsix.distanceUnit';
const KM_PER_MI = 1.60934;

interface UnitsCtx {
  units: DistanceUnit;
  setUnits: (u: DistanceUnit) => void;
}

const Ctx = createContext<UnitsCtx | null>(null);

export function UnitsProvider({ children }: { children: React.ReactNode }) {
  // Start 'mi' for SSR + first client paint, then hydrate from localStorage.
  const [units, setUnitsState] = useState<DistanceUnit>('mi');

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'km' || stored === 'mi') setUnitsState(stored);
    } catch {
      /* localStorage unavailable — keep default */
    }
  }, []);

  const setUnits = useCallback((u: DistanceUnit) => {
    setUnitsState(u);
    try {
      localStorage.setItem(STORAGE_KEY, u);
    } catch {
      /* ignore */
    }
  }, []);

  return <Ctx.Provider value={{ units, setUnits }}>{children}</Ctx.Provider>;
}

/** Read the active distance unit. Falls back to 'mi' outside the provider. */
export function useUnits(): UnitsCtx {
  return useContext(Ctx) ?? { units: 'mi', setUnits: () => {} };
}

function toInt(v: number | string): number {
  return typeof v === 'number' ? Math.round(v) : parseInt(String(v).replace(/[^0-9]/g, ''), 10) || 0;
}

/** Canonical miles → value shown in the chosen unit. */
export function milesToDisplay(miles: number | string, units: DistanceUnit): number {
  const n = toInt(miles);
  return units === 'km' ? Math.round(n * KM_PER_MI) : n;
}

/** Value entered in the chosen unit → canonical miles for storage. */
export function displayToMiles(value: number | string, units: DistanceUnit): number {
  const n = toInt(value);
  return units === 'km' ? Math.round(n / KM_PER_MI) : n;
}

export function unitLabel(units: DistanceUnit): string {
  return units;
}
