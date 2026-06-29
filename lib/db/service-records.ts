'use client';

import { createClient } from '@/lib/supabase/client';
import { DEMO_MODE, demoStore, demoId } from '@/lib/demo';
import type { ServiceItem, ServiceRecord } from '@/lib/types';

/** Fields needed to create a record; id is assigned by the DB. */
export type NewServiceRecord = Omit<ServiceRecord, 'id'>;

interface RecordRow {
  id: string;
  vehicle_id: string;
  user_id: string;
  date: string;
  mileage: number | null;
  title: string;
  system: string | null;
  diy: boolean;
  cost: string | null;
  notes: string | null;
  items: unknown;
}

/**
 * Normalise a stored item into a ServiceItem. Older records stored items as a
 * flat string[]; newer ones store {name, description?, partNumber?, cost?}.
 * Accepts both so existing history keeps rendering.
 */
export function toServiceItem(raw: unknown): ServiceItem | null {
  if (typeof raw === 'string') {
    const name = raw.trim();
    return name ? { name } : null;
  }
  if (raw && typeof raw === 'object') {
    const o = raw as Record<string, unknown>;
    const name = typeof o.name === 'string' ? o.name.trim() : '';
    if (!name) return null;
    return {
      name,
      description: typeof o.description === 'string' && o.description.trim() ? o.description.trim() : undefined,
      partNumber: typeof o.partNumber === 'string' && o.partNumber.trim() ? o.partNumber.trim() : undefined,
      cost: typeof o.cost === 'string' && o.cost.trim() ? o.cost.trim() : undefined,
    };
  }
  return null;
}

function normalizeItems(raw: unknown): ServiceItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(toServiceItem).filter((i): i is ServiceItem => i !== null);
}

function rowToRecord(r: RecordRow): ServiceRecord {
  return {
    id: r.id,
    date: r.date,
    mileage: r.mileage ?? 0,
    title: r.title,
    system: r.system ?? '',
    diy: r.diy,
    cost: r.cost ?? undefined,
    notes: r.notes ?? undefined,
    items: normalizeItems(r.items),
  };
}

export async function listRecords(vehicleId: string): Promise<ServiceRecord[]> {
  if (DEMO_MODE) return (demoStore().records[vehicleId] ?? []).map((r) => ({ ...r }));
  const supabase = createClient();
  const { data, error } = await supabase
    .from('service_records')
    .select('*')
    .eq('vehicle_id', vehicleId)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as RecordRow[]).map(rowToRecord);
}

export async function addRecord(
  vehicleId: string,
  rec: NewServiceRecord,
): Promise<ServiceRecord> {
  if (DEMO_MODE) {
    const created: ServiceRecord = { ...rec, id: demoId('rec'), items: rec.items ?? [] };
    const s = demoStore();
    s.records[vehicleId] = [created, ...(s.records[vehicleId] ?? [])];
    return { ...created };
  }
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('service_records')
    .insert({
      vehicle_id: vehicleId,
      user_id: user.id,
      date: rec.date,
      mileage: rec.mileage || null,
      title: rec.title,
      system: rec.system || null,
      diy: rec.diy,
      cost: rec.cost || null,
      notes: rec.notes || null,
      items: rec.items ?? [],
    })
    .select('*')
    .single();
  if (error) throw error;
  return rowToRecord(data as RecordRow);
}

export async function updateRecord(
  id: string,
  rec: NewServiceRecord,
): Promise<ServiceRecord> {
  if (DEMO_MODE) {
    const s = demoStore();
    for (const k of Object.keys(s.records)) {
      const idx = s.records[k].findIndex((r) => r.id === id);
      if (idx >= 0) {
        const updated: ServiceRecord = { ...rec, id, items: rec.items ?? [] };
        s.records[k][idx] = updated;
        return { ...updated };
      }
    }
    throw new Error('Record not found');
  }
  const supabase = createClient();
  // RLS limits the update to the owner; vehicle_id / user_id stay immutable.
  const { data, error } = await supabase
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
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return rowToRecord(data as RecordRow);
}

export async function deleteRecord(id: string): Promise<void> {
  if (DEMO_MODE) {
    const s = demoStore();
    for (const k of Object.keys(s.records)) s.records[k] = s.records[k].filter((r) => r.id !== id);
    return;
  }
  const supabase = createClient();
  const { error } = await supabase.from('service_records').delete().eq('id', id);
  if (error) throw error;
}
