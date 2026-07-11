'use client';

import { createClient } from '@/lib/supabase/client';
import { DEMO_MODE, demoStore, demoId } from '@/lib/demo';
import type {
  ServicePlan,
  ServicePlanItem,
  ServicePlanLink,
  ServicePlanStatus,
} from '@/lib/types';

/** Fields needed to create a plan; id/createdAt are assigned by the DB. */
export type NewServicePlan = Omit<ServicePlan, 'id' | 'createdAt'>;
/** Editable subset of a plan (everything but id/createdAt). */
export type PlanPatch = Partial<NewServicePlan>;

interface PlanRow {
  id: string;
  vehicle_id: string;
  user_id: string;
  title: string;
  notes: string | null;
  status: string;
  target_date: string | null;
  target_mileage: number | null;
  items: unknown;
  created_at: string;
}

const STATUSES: ServicePlanStatus[] = ['planning', 'ordered', 'scheduled', 'done'];

function toStatus(raw: string | null): ServicePlanStatus {
  return STATUSES.includes(raw as ServicePlanStatus) ? (raw as ServicePlanStatus) : 'planning';
}

function toLinks(raw: unknown): ServicePlanLink[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const links = raw
    .map((l) => {
      if (!l || typeof l !== 'object') return null;
      const o = l as Record<string, unknown>;
      const url = typeof o.url === 'string' ? o.url.trim() : '';
      if (!url) return null;
      const label = typeof o.label === 'string' && o.label.trim() ? o.label.trim() : url;
      return { label, url };
    })
    .filter((l): l is ServicePlanLink => l !== null);
  return links.length ? links : undefined;
}

/** Normalise a stored plan item, tolerating partial/legacy shapes. */
export function toPlanItem(raw: unknown, index: number): ServicePlanItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const name = typeof o.name === 'string' ? o.name.trim() : '';
  if (!name) return null;
  return {
    id: typeof o.id === 'string' && o.id ? o.id : `item-${index}`,
    name,
    description: typeof o.description === 'string' && o.description.trim() ? o.description.trim() : undefined,
    partNumber: typeof o.partNumber === 'string' && o.partNumber.trim() ? o.partNumber.trim() : undefined,
    links: toLinks(o.links),
    done: o.done === true,
  };
}

function normalizeItems(raw: unknown): ServicePlanItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(toPlanItem).filter((i): i is ServicePlanItem => i !== null);
}

function rowToPlan(r: PlanRow): ServicePlan {
  return {
    id: r.id,
    title: r.title,
    notes: r.notes ?? undefined,
    status: toStatus(r.status),
    targetDate: r.target_date ?? undefined,
    targetMileage: r.target_mileage ?? undefined,
    items: normalizeItems(r.items),
    createdAt: r.created_at,
  };
}

/** Strip transient/undefined fields so jsonb stays clean. */
function itemsForDb(items: ServicePlanItem[] | undefined) {
  return (items ?? []).map((it) => ({
    id: it.id,
    name: it.name,
    description: it.description || undefined,
    partNumber: it.partNumber || undefined,
    links: it.links && it.links.length ? it.links : undefined,
    done: it.done ?? false,
  }));
}

export async function listPlans(vehicleId: string): Promise<ServicePlan[]> {
  if (DEMO_MODE) return (demoStore().plans[vehicleId] ?? []).map((p) => ({ ...p }));

  const { getCachedPlans, isProbablyOffline, rememberPlansCache } = await import('@/lib/offline/sync');
  if (isProbablyOffline()) {
    const cached = await getCachedPlans(vehicleId);
    if (cached) return cached;
    return [];
  }

  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('service_plans')
      .select('*')
      .eq('vehicle_id', vehicleId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    const list = (data as PlanRow[]).map(rowToPlan);
    void rememberPlansCache(vehicleId, list);
    return list;
  } catch (e) {
    const cached = await getCachedPlans(vehicleId);
    if (cached) return cached;
    throw e;
  }
}

export async function addPlan(vehicleId: string, plan: NewServicePlan): Promise<ServicePlan> {
  if (DEMO_MODE) {
    const created: ServicePlan = {
      ...plan, id: demoId('plan'), status: plan.status ?? 'planning',
      items: plan.items ?? [], createdAt: new Date().toISOString(),
    };
    const s = demoStore();
    s.plans[vehicleId] = [created, ...(s.plans[vehicleId] ?? [])];
    return { ...created };
  }

  const { isProbablyOffline, localId, queuePlanAdd } = await import('@/lib/offline/sync');
  if (isProbablyOffline()) {
    const id = localId('plan');
    await queuePlanAdd(vehicleId, plan, id);
    return {
      ...plan,
      id,
      status: plan.status ?? 'planning',
      items: plan.items ?? [],
      createdAt: new Date().toISOString(),
    };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('service_plans')
    .insert({
      vehicle_id: vehicleId,
      user_id: user.id,
      title: plan.title,
      notes: plan.notes || null,
      status: plan.status ?? 'planning',
      target_date: plan.targetDate || null,
      target_mileage: plan.targetMileage || null,
      items: itemsForDb(plan.items),
    })
    .select('*')
    .single();
  if (error) throw error;
  return rowToPlan(data as PlanRow);
}

export async function updatePlan(id: string, patch: PlanPatch): Promise<ServicePlan> {
  if (DEMO_MODE) {
    const s = demoStore();
    let updated: ServicePlan | null = null;
    for (const k of Object.keys(s.plans)) {
      s.plans[k] = s.plans[k].map((p) => {
        if (p.id !== id) return p;
        updated = { ...p, ...patch };
        return updated;
      });
    }
    if (!updated) throw new Error('Plan not found');
    return updated;
  }

  const { isProbablyOffline, queuePlanUpdate, getCachedPlans, loadSnapshot } = await import(
    '@/lib/offline/sync'
  );
  if (isProbablyOffline()) {
    await queuePlanUpdate(id, patch);
    const snap = await loadSnapshot();
    for (const vid of Object.keys(snap?.plans ?? {})) {
      const found = (await getCachedPlans(vid))?.find((p) => p.id === id);
      if (found) return found;
    }
    throw new Error('Plan not found in offline cache');
  }

  try {
    const supabase = createClient();
    const row: Record<string, unknown> = {};
    if (patch.title !== undefined) row.title = patch.title;
    if (patch.notes !== undefined) row.notes = patch.notes || null;
    if (patch.status !== undefined) row.status = patch.status;
    if (patch.targetDate !== undefined) row.target_date = patch.targetDate || null;
    if (patch.targetMileage !== undefined) row.target_mileage = patch.targetMileage || null;
    if (patch.items !== undefined) row.items = itemsForDb(patch.items);

    const { data, error } = await supabase
      .from('service_plans')
      .update(row)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return rowToPlan(data as PlanRow);
  } catch (e) {
    if (isProbablyOffline()) {
      await queuePlanUpdate(id, patch);
      const snap = await loadSnapshot();
      for (const vid of Object.keys(snap?.plans ?? {})) {
        const found = (await getCachedPlans(vid))?.find((p) => p.id === id);
        if (found) return found;
      }
    }
    throw e;
  }
}

export async function deletePlan(id: string): Promise<void> {
  if (DEMO_MODE) {
    const s = demoStore();
    for (const k of Object.keys(s.plans)) s.plans[k] = s.plans[k].filter((p) => p.id !== id);
    return;
  }

  const { isProbablyOffline, queuePlanDelete } = await import('@/lib/offline/sync');
  if (isProbablyOffline()) {
    await queuePlanDelete(id);
    return;
  }

  try {
    const supabase = createClient();
    const { error } = await supabase.from('service_plans').delete().eq('id', id);
    if (error) throw error;
  } catch (e) {
    if (isProbablyOffline()) {
      await queuePlanDelete(id);
      return;
    }
    throw e;
  }
}
