'use client';

import { useSyncExternalStore } from 'react';
import { useVehicle } from '@/lib/vehicle-context';

/**
 * Distance-unit preference (odometer, service mileage, plan targets, maintenance
 * intervals). Stored **per car** in `vehicles.distance_unit` and persisted through
 * the normal vehicle update flow — switching cars switches units.
 *
 * Mileage is ALWAYS stored canonically in **miles** (integers). This preference
 * only controls how distances are displayed and entered; values convert at the
 * UI boundary via `milesToDisplay` / `displayToMiles`, so switching a car's unit
 * never migrates stored data.
 */
export type DistanceUnit = 'mi' | 'km';

const KM_PER_MI = 1.60934;

/** Read/set the active car's distance unit. */
export function useUnits(): { units: DistanceUnit; setUnits: (u: DistanceUnit) => void } {
  const { vehicle, update } = useVehicle();
  const units: DistanceUnit = vehicle.distanceUnit === 'km' ? 'km' : 'mi';
  const setUnits = (u: DistanceUnit) => update({ distanceUnit: u });
  return { units, setUnits };
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

// ---------------------------------------------------------------------------
// Account-wide measurement units — torque + pressure (issue #16).
//
// Unlike distance (which is per-car, above), these are an ACCOUNT preference:
// a mechanic's Nm-vs-ft·lb / bar-vs-psi choice doesn't change car to car. Stored
// in localStorage (per device) and shared reactively across the app via
// useSyncExternalStore — no provider needed. Canonical data stays metric
// (curated torques in Nm, factory pressures in bar); these only affect display.
// ---------------------------------------------------------------------------

export type TorqueUnit = 'Nm' | 'ft-lb';
export type PressureUnit = 'bar' | 'psi';

interface AccountUnits {
  torque: TorqueUnit;
  pressure: PressureUnit;
}

const ACCOUNT_UNITS_KEY = 'flatsix.units';
// Default to the factory/metric units the curated data is authored in; imperial
// users opt in. (Distance defaults to 'mi' separately, above.)
const DEFAULT_ACCOUNT_UNITS: AccountUnits = { torque: 'Nm', pressure: 'bar' };

const NM_PER_FT_LB = 1.3558179;
const PSI_PER_BAR = 14.5037738;

const unitListeners = new Set<() => void>();
let cachedUnits: AccountUnits = DEFAULT_ACCOUNT_UNITS;
let cacheRaw = '';

function readAccountUnits(): AccountUnits {
  if (typeof window === 'undefined') return DEFAULT_ACCOUNT_UNITS;
  const raw = window.localStorage.getItem(ACCOUNT_UNITS_KEY) ?? '';
  // Return a STABLE reference while the stored value is unchanged — required so
  // useSyncExternalStore doesn't loop (it compares snapshots by identity).
  if (raw === cacheRaw) return cachedUnits;
  cacheRaw = raw;
  try {
    cachedUnits = { ...DEFAULT_ACCOUNT_UNITS, ...(raw ? JSON.parse(raw) : {}) };
  } catch {
    cachedUnits = DEFAULT_ACCOUNT_UNITS;
  }
  return cachedUnits;
}

function writeAccountUnits(patch: Partial<AccountUnits>): void {
  if (typeof window === 'undefined') return;
  const next = { ...readAccountUnits(), ...patch };
  window.localStorage.setItem(ACCOUNT_UNITS_KEY, JSON.stringify(next));
  readAccountUnits(); // refresh the cache before notifying
  unitListeners.forEach((l) => l());
}

function subscribeAccountUnits(listener: () => void): () => void {
  unitListeners.add(listener);
  return () => unitListeners.delete(listener);
}

/** Account-wide torque + pressure units (localStorage-backed, reactive). */
export function useAccountUnits(): {
  torque: TorqueUnit;
  pressure: PressureUnit;
  setTorque: (u: TorqueUnit) => void;
  setPressure: (u: PressureUnit) => void;
} {
  const units = useSyncExternalStore(subscribeAccountUnits, readAccountUnits, () => DEFAULT_ACCOUNT_UNITS);
  return {
    torque: units.torque,
    pressure: units.pressure,
    setTorque: (u) => writeAccountUnits({ torque: u }),
    setPressure: (u) => writeAccountUnits({ pressure: u }),
  };
}

/**
 * Render a curated torque spec string in the chosen unit. Curated values are
 * authored in Nm (e.g. "50 Nm", "9 Nm + 90°", "26 Nm (19 ft-lb)"). For ft·lb we
 * convert each Nm figure in place and drop any now-redundant "(x ft-lb)" paren;
 * for Nm we show it as authored. Non-Nm text (angle-only) passes through.
 */
export function formatTorque(value: string, unit: TorqueUnit): string {
  if (unit === 'Nm') return value;
  return value
    .replace(/(\d[\d.,]*)\s*N·?m/gi, (_m, n: string) =>
      `${Math.round(parseFloat(n.replace(',', '.')) / NM_PER_FT_LB)} ft·lb`)
    .replace(/\s*\(\s*(?:approx\.?\s*)?\d[\d.,]*\s*(?:ft-?lb|lb-?ft)\s*\)/gi, '');
}

/**
 * Render a curated pressure spec string in the chosen unit. Values are authored
 * as "X bar (Y psi)" (optionally per-axle, e.g. "F 2.0 bar (29 psi) / R 2.1 bar
 * (30 psi)"). For psi we collapse to the psi figure; for bar we drop the psi
 * paren. Strings that don't match the pattern pass through unchanged.
 */
export function formatPressure(value: string, unit: PressureUnit): string {
  if (unit === 'psi') {
    return value.replace(/(\d[\d.,]*)\s*bar\s*\(\s*(\d[\d.,]*)\s*psi\s*\)/gi, (_m, _bar, psi: string) => `${psi} psi`);
  }
  return value.replace(/\s*\(\s*\d[\d.,]*\s*psi\s*\)/gi, '');
}

/** Convert a numeric torque (Nm) to the chosen unit's display string. */
export function torqueValue(nm: number, unit: TorqueUnit): string {
  return unit === 'ft-lb' ? `${Math.round(nm / NM_PER_FT_LB)} ft·lb` : `${nm} Nm`;
}

/** Convert a numeric pressure (bar) to the chosen unit's display string. */
export function pressureValue(bar: number, unit: PressureUnit): string {
  return unit === 'psi' ? `${Math.round(bar * PSI_PER_BAR)} psi` : `${bar.toFixed(1)} bar`;
}
