'use client';

import { createClient } from '@/lib/supabase/client';
import { DEMO_MODE, demoStore, demoId } from '@/lib/demo';
import type { Vehicle, BodyType, WheelSetup } from '@/lib/types';

/** A vehicle as stored in the DB — the domain Vehicle plus its row id + primary flag. */
export interface StoredVehicle extends Vehicle {
  id: string;
  isPrimary: boolean;
}

interface VehicleRow {
  id: string;
  user_id: string;
  body: string | null;
  vin: string | null;
  model: string | null;
  year: string | null;
  engine: string | null;
  trans: string | null;
  mileage: number | null;
  color_name: string | null;
  color_hex: string | null;
  interior_hex: string | null;
  plate: string | null;
  wheel_setup: WheelSetup | null;
  distance_unit: string | null;
  is_primary: boolean;
}

function toMileageInt(m: unknown): number | null {
  if (m === '' || m == null) return null;
  const n = parseInt(String(m).replace(/[^0-9]/g, ''), 10);
  return Number.isFinite(n) ? n : null;
}

function rowToVehicle(r: VehicleRow): StoredVehicle {
  return {
    id: r.id,
    body: (r.body as BodyType) ?? 'boxster',
    vin: r.vin ?? '',
    model: r.model ?? '',
    year: r.year ?? '',
    engine: r.engine ?? '',
    trans: r.trans ?? '',
    mileage: r.mileage != null ? String(r.mileage) : '',
    colorName: r.color_name ?? '',
    colorHex: r.color_hex ?? '',
    interiorHex: r.interior_hex ?? '',
    plate: r.plate ?? '',
    wheelSetup: r.wheel_setup ?? undefined,
    distanceUnit: r.distance_unit === 'km' ? 'km' : 'mi',
    isPrimary: r.is_primary,
  };
}

/** Map a (partial) domain Vehicle to DB column names, omitting undefined fields. */
function vehicleToRow(v: Partial<Vehicle>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (v.body !== undefined) row.body = v.body;
  if (v.vin !== undefined) row.vin = v.vin;
  if (v.model !== undefined) row.model = v.model;
  if (v.year !== undefined) row.year = v.year;
  if (v.engine !== undefined) row.engine = v.engine;
  if (v.trans !== undefined) row.trans = v.trans;
  if (v.mileage !== undefined) row.mileage = toMileageInt(v.mileage);
  if (v.colorName !== undefined) row.color_name = v.colorName;
  if (v.colorHex !== undefined) row.color_hex = v.colorHex;
  if (v.interiorHex !== undefined) row.interior_hex = v.interiorHex;
  if (v.plate !== undefined) row.plate = v.plate;
  if (v.wheelSetup !== undefined) row.wheel_setup = v.wheelSetup;
  if (v.distanceUnit !== undefined) row.distance_unit = v.distanceUnit;
  return row;
}

export async function listVehicles(): Promise<StoredVehicle[]> {
  if (DEMO_MODE) return demoStore().vehicles.map((v) => ({ ...v }));

  const { getCachedVehicles, isProbablyOffline, rememberVehiclesCache } = await import('@/lib/offline/sync');

  if (isProbablyOffline()) {
    const cached = await getCachedVehicles();
    if (cached) return cached;
    throw new Error('Offline — no cached garage yet. Connect once to sync.');
  }

  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) throw error;
    const list = (data as VehicleRow[]).map(rowToVehicle);
    void rememberVehiclesCache(list);
    return list;
  } catch (e) {
    const cached = await getCachedVehicles();
    if (cached) return cached;
    throw e;
  }
}

export async function createVehicle(
  v: Vehicle,
  opts: { primary?: boolean } = {},
): Promise<StoredVehicle> {
  if (DEMO_MODE) {
    const nv: StoredVehicle = { ...v, id: demoId('veh'), isPrimary: opts.primary ?? false };
    const s = demoStore();
    s.vehicles.push(nv);
    s.records[nv.id] = [];
    s.plans[nv.id] = [];
    return { ...nv };
  }

  const { isProbablyOffline, localId, queueVehicleCreate } = await import('@/lib/offline/sync');
  if (isProbablyOffline()) {
    const id = localId('veh');
    await queueVehicleCreate(v, opts.primary ?? false, id);
    return { ...v, id, isPrimary: opts.primary ?? false };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('vehicles')
    .insert({ ...vehicleToRow(v), user_id: user.id, is_primary: opts.primary ?? false })
    .select('*')
    .single();
  if (error) throw error;
  return rowToVehicle(data as VehicleRow);
}

export async function updateVehicle(id: string, patch: Partial<Vehicle>): Promise<void> {
  if (DEMO_MODE) {
    const s = demoStore();
    s.vehicles = s.vehicles.map((v) => (v.id === id ? { ...v, ...patch } : v));
    return;
  }

  const { isProbablyOffline, queueVehicleUpdate } = await import('@/lib/offline/sync');
  if (isProbablyOffline()) {
    await queueVehicleUpdate(id, patch);
    return;
  }

  try {
    const supabase = createClient();
    const { error } = await supabase
      .from('vehicles')
      .update({ ...vehicleToRow(patch), updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  } catch (e) {
    if (isProbablyOffline()) {
      await queueVehicleUpdate(id, patch);
      return;
    }
    throw e;
  }
}

export async function deleteVehicle(id: string): Promise<void> {
  if (DEMO_MODE) {
    const s = demoStore();
    s.vehicles = s.vehicles.filter((v) => v.id !== id);
    delete s.records[id];
    delete s.plans[id];
    return;
  }

  const { isProbablyOffline, queueVehicleDelete } = await import('@/lib/offline/sync');
  if (isProbablyOffline()) {
    await queueVehicleDelete(id);
    return;
  }

  try {
    const supabase = createClient();
    const { error } = await supabase.from('vehicles').delete().eq('id', id);
    if (error) throw error;
  } catch (e) {
    if (isProbablyOffline()) {
      await queueVehicleDelete(id);
      return;
    }
    throw e;
  }
}
