'use client';

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
