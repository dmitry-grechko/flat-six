'use client';

/**
 * Offline sync — pull garage from Supabase into IndexedDB; flush pending mutations.
 * Documents / manual / AI stay online-only (v1).
 */

import { DEMO_MODE, demoId } from '@/lib/demo';
import { createClient } from '@/lib/supabase/client';
import type { Profile, ServicePlan, ServiceRecord, Vehicle, BodyType, WheelSetup } from '@/lib/types';
import type { StoredVehicle } from '@/lib/db/vehicles';
import type { NewServiceRecord } from '@/lib/db/service-records';
import type { NewServicePlan, PlanPatch } from '@/lib/db/service-plans';
import { toServiceItem } from '@/lib/db/service-records';
import { toPlanItem } from '@/lib/db/service-plans';
import {
  enqueuePending,
  isProbablyOffline,
  listPending,
  loadSnapshot,
  pendingId,
  removePending,
  saveSnapshot,
} from './idb';
import type { GarageSnapshot, PendingOp } from './types';

let syncing = false;

function normalizeRecordItems(raw: unknown) {
  if (!Array.isArray(raw)) return [];
  return raw.map(toServiceItem).filter((i): i is NonNullable<typeof i> => i !== null);
}

function normalizePlanItems(raw: unknown) {
  if (!Array.isArray(raw)) return [];
  return raw.map(toPlanItem).filter((i): i is NonNullable<typeof i> => i !== null);
}

async function fetchProfile(userId: string): Promise<Profile | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, units, documents_access, created_at')
    .eq('id', userId)
    .maybeSingle();
  if (error || !data) return null;
  return {
    id: data.id,
    displayName: data.display_name ?? '',
    units: data.units === 'metric' ? 'metric' : 'imperial',
    documentsAccess: !!data.documents_access,
    createdAt: data.created_at,
  };
}

async function fetchVehicles(): Promise<StoredVehicle[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from('vehicles').select('*').order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => ({
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
    wheelSetup: (r.wheel_setup as WheelSetup | null) ?? undefined,
    distanceUnit: r.distance_unit === 'km' ? 'km' : 'mi',
    isPrimary: r.is_primary,
  }));
}

async function fetchRecords(vehicleId: string): Promise<ServiceRecord[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('service_records')
    .select('*')
    .eq('vehicle_id', vehicleId)
    .order('date', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    date: r.date,
    mileage: r.mileage ?? 0,
    title: r.title,
    system: r.system ?? '',
    diy: r.diy,
    cost: r.cost ?? undefined,
    notes: r.notes ?? undefined,
    items: normalizeRecordItems(r.items),
  }));
}

async function fetchPlans(vehicleId: string): Promise<ServicePlan[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('service_plans')
    .select('*')
    .eq('vehicle_id', vehicleId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  const STATUSES = ['planning', 'ordered', 'scheduled', 'done'] as const;
  return (data ?? []).map((r) => ({
    id: r.id,
    title: r.title,
    notes: r.notes ?? undefined,
    status: STATUSES.includes(r.status as (typeof STATUSES)[number])
      ? (r.status as ServicePlan['status'])
      : 'planning',
    targetDate: r.target_date ?? undefined,
    targetMileage: r.target_mileage ?? undefined,
    items: normalizePlanItems(r.items),
    createdAt: r.created_at,
  }));
}

export async function pullGarageSnapshot(userId: string): Promise<GarageSnapshot> {
  const profile = await fetchProfile(userId);
  const vehicles = await fetchVehicles();
  const records: GarageSnapshot['records'] = {};
  const plans: GarageSnapshot['plans'] = {};
  await Promise.all(
    vehicles.map(async (v) => {
      records[v.id] = await fetchRecords(v.id);
      plans[v.id] = await fetchPlans(v.id);
    }),
  );
  const snap: GarageSnapshot = {
    userId,
    syncedAt: new Date().toISOString(),
    profile,
    vehicles,
    records,
    plans,
  };
  await saveSnapshot(snap);
  return snap;
}

function toMileageInt(m: unknown): number | null {
  if (m === '' || m == null) return null;
  const n = parseInt(String(m).replace(/[^0-9]/g, ''), 10);
  return Number.isFinite(n) ? n : null;
}

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

async function applyPending(op: PendingOp): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  switch (op.kind) {
    case 'vehicle.create': {
      await supabase.from('vehicles').insert({
        ...vehicleToRow(op.payload.vehicle),
        user_id: user.id,
        is_primary: op.payload.primary ?? false,
      });
      break;
    }
    case 'vehicle.update': {
      await supabase
        .from('vehicles')
        .update({ ...vehicleToRow(op.payload.patch), updated_at: new Date().toISOString() })
        .eq('id', op.payload.id);
      break;
    }
    case 'vehicle.delete': {
      await supabase.from('vehicles').delete().eq('id', op.payload.id);
      break;
    }
    case 'record.add': {
      const rec = op.payload.rec;
      await supabase.from('service_records').insert({
        vehicle_id: op.payload.vehicleId,
        user_id: user.id,
        date: rec.date,
        mileage: rec.mileage || null,
        title: rec.title,
        system: rec.system || null,
        diy: rec.diy,
        cost: rec.cost || null,
        notes: rec.notes || null,
        items: rec.items ?? [],
      });
      break;
    }
    case 'record.update': {
      const rec = op.payload.rec;
      await supabase
        .from('service_records')
        .update({
          date: rec.date,
          mileage: rec.mileage || null,
          title: rec.title,
          system: rec.system || null,
          diy: rec.diy,
          cost: rec.cost || null,
          notes: rec.notes || null,
          items: rec.items ?? [],
        })
        .eq('id', op.payload.id);
      break;
    }
    case 'record.delete': {
      await supabase.from('service_records').delete().eq('id', op.payload.id);
      break;
    }
    case 'plan.add': {
      const plan = op.payload.plan;
      await supabase.from('service_plans').insert({
        vehicle_id: op.payload.vehicleId,
        user_id: user.id,
        title: plan.title,
        notes: plan.notes || null,
        status: plan.status ?? 'planning',
        target_date: plan.targetDate || null,
        target_mileage: plan.targetMileage || null,
        items: plan.items ?? [],
      });
      break;
    }
    case 'plan.update': {
      const patch = op.payload.patch;
      const row: Record<string, unknown> = {};
      if (patch.title !== undefined) row.title = patch.title;
      if (patch.notes !== undefined) row.notes = patch.notes || null;
      if (patch.status !== undefined) row.status = patch.status;
      if (patch.targetDate !== undefined) row.target_date = patch.targetDate || null;
      if (patch.targetMileage !== undefined) row.target_mileage = patch.targetMileage || null;
      if (patch.items !== undefined) row.items = patch.items;
      await supabase.from('service_plans').update(row).eq('id', op.payload.id);
      break;
    }
    case 'plan.delete': {
      await supabase.from('service_plans').delete().eq('id', op.payload.id);
      break;
    }
  }
}

/** Flush queued writes then pull fresh snapshot. */
export async function syncGarage(): Promise<{ ok: boolean; pending: number; error?: string }> {
  if (DEMO_MODE) return { ok: true, pending: 0 };
  if (syncing) return { ok: true, pending: (await listPending()).length };
  if (isProbablyOffline()) return { ok: false, pending: (await listPending()).length, error: 'offline' };

  syncing = true;
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, pending: 0, error: 'no-session' };

    const pending = await listPending();
    for (const op of pending) {
      try {
        await applyPending(op);
        await removePending(op.id);
      } catch (e) {
        console.error('[offline] flush failed', op.kind, e);
        return {
          ok: false,
          pending: (await listPending()).length,
          error: e instanceof Error ? e.message : String(e),
        };
      }
    }

    await pullGarageSnapshot(user.id);
    return { ok: true, pending: 0 };
  } catch (e) {
    return {
      ok: false,
      pending: (await listPending()).length,
      error: e instanceof Error ? e.message : String(e),
    };
  } finally {
    syncing = false;
  }
}

export async function getCachedVehicles(): Promise<StoredVehicle[] | null> {
  const snap = await loadSnapshot();
  return snap?.vehicles ?? null;
}

export async function getCachedRecords(vehicleId: string) {
  const snap = await loadSnapshot();
  return snap?.records[vehicleId] ?? null;
}

export async function getCachedPlans(vehicleId: string) {
  const snap = await loadSnapshot();
  return snap?.plans[vehicleId] ?? null;
}

export async function getCachedProfile() {
  const snap = await loadSnapshot();
  return snap?.profile ?? null;
}

async function mutateSnapshot(mutator: (snap: GarageSnapshot) => void): Promise<void> {
  const snap = await loadSnapshot();
  if (!snap) return;
  mutator(snap);
  snap.syncedAt = new Date().toISOString();
  await saveSnapshot(snap);
}

export async function rememberVehiclesCache(vehicles: StoredVehicle[]): Promise<void> {
  const snap = await loadSnapshot();
  if (!snap) {
    // Minimal snap so subsequent offline reads work after first online list
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await saveSnapshot({
      userId: user.id,
      syncedAt: new Date().toISOString(),
      profile: null,
      vehicles,
      records: {},
      plans: {},
    });
    return;
  }
  snap.vehicles = vehicles;
  snap.syncedAt = new Date().toISOString();
  await saveSnapshot(snap);
}

export async function rememberRecordsCache(vehicleId: string, records: ServiceRecord[]): Promise<void> {
  const snap = await loadSnapshot();
  if (!snap) return;
  snap.records[vehicleId] = records;
  await saveSnapshot(snap);
}

export async function rememberPlansCache(vehicleId: string, plans: ServicePlan[]): Promise<void> {
  const snap = await loadSnapshot();
  if (!snap) return;
  snap.plans[vehicleId] = plans;
  await saveSnapshot(snap);
}

export async function queueVehicleCreate(vehicle: Vehicle, primary: boolean, localId: string) {
  await enqueuePending({
    id: pendingId(),
    kind: 'vehicle.create',
    at: new Date().toISOString(),
    payload: { vehicle, primary, localId },
  });
  await mutateSnapshot((snap) => {
    snap.vehicles.push({ ...vehicle, id: localId, isPrimary: primary });
    snap.records[localId] = [];
    snap.plans[localId] = [];
  });
}

export async function queueVehicleUpdate(id: string, patch: Partial<Vehicle>) {
  await enqueuePending({
    id: pendingId(),
    kind: 'vehicle.update',
    at: new Date().toISOString(),
    payload: { id, patch },
  });
  await mutateSnapshot((snap) => {
    snap.vehicles = snap.vehicles.map((v) => (v.id === id ? { ...v, ...patch } : v));
  });
}

export async function queueVehicleDelete(id: string) {
  await enqueuePending({
    id: pendingId(),
    kind: 'vehicle.delete',
    at: new Date().toISOString(),
    payload: { id },
  });
  await mutateSnapshot((snap) => {
    snap.vehicles = snap.vehicles.filter((v) => v.id !== id);
    delete snap.records[id];
    delete snap.plans[id];
  });
}

export async function queueRecordAdd(vehicleId: string, rec: NewServiceRecord, localId: string) {
  await enqueuePending({
    id: pendingId(),
    kind: 'record.add',
    at: new Date().toISOString(),
    payload: { vehicleId, rec, localId },
  });
  await mutateSnapshot((snap) => {
    const created = { ...rec, id: localId, items: rec.items ?? [] };
    snap.records[vehicleId] = [created, ...(snap.records[vehicleId] ?? [])];
  });
}

export async function queueRecordUpdate(id: string, rec: NewServiceRecord) {
  await enqueuePending({
    id: pendingId(),
    kind: 'record.update',
    at: new Date().toISOString(),
    payload: { id, rec },
  });
  await mutateSnapshot((snap) => {
    for (const vid of Object.keys(snap.records)) {
      snap.records[vid] = snap.records[vid].map((r) =>
        r.id === id ? { ...rec, id, items: rec.items ?? [] } : r,
      );
    }
  });
}

export async function queueRecordDelete(id: string) {
  await enqueuePending({
    id: pendingId(),
    kind: 'record.delete',
    at: new Date().toISOString(),
    payload: { id },
  });
  await mutateSnapshot((snap) => {
    for (const vid of Object.keys(snap.records)) {
      snap.records[vid] = snap.records[vid].filter((r) => r.id !== id);
    }
  });
}

export async function queuePlanAdd(vehicleId: string, plan: NewServicePlan, localId: string) {
  await enqueuePending({
    id: pendingId(),
    kind: 'plan.add',
    at: new Date().toISOString(),
    payload: { vehicleId, plan, localId },
  });
  await mutateSnapshot((snap) => {
    const created = {
      ...plan,
      id: localId,
      status: plan.status ?? ('planning' as const),
      items: plan.items ?? [],
      createdAt: new Date().toISOString(),
    };
    snap.plans[vehicleId] = [created, ...(snap.plans[vehicleId] ?? [])];
  });
}

export async function queuePlanUpdate(id: string, patch: PlanPatch) {
  await enqueuePending({
    id: pendingId(),
    kind: 'plan.update',
    at: new Date().toISOString(),
    payload: { id, patch },
  });
  await mutateSnapshot((snap) => {
    for (const vid of Object.keys(snap.plans)) {
      snap.plans[vid] = snap.plans[vid].map((p) => (p.id === id ? { ...p, ...patch } : p));
    }
  });
}

export async function queuePlanDelete(id: string) {
  await enqueuePending({
    id: pendingId(),
    kind: 'plan.delete',
    at: new Date().toISOString(),
    payload: { id },
  });
  await mutateSnapshot((snap) => {
    for (const vid of Object.keys(snap.plans)) {
      snap.plans[vid] = snap.plans[vid].filter((p) => p.id !== id);
    }
  });
}

export function localId(prefix: string): string {
  return DEMO_MODE ? demoId(prefix) : `local-${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export { isProbablyOffline, listPending, loadSnapshot };
