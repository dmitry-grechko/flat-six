import { createClient } from '@/lib/supabase/server';
import type { ObdScan } from '@/lib/types';
import type { FaultsData, LiveData, Mode06Data, ModuleScanData } from '@/lib/obd/types';

/**
 * Saved OBD scan snapshots (Live OBD → Supabase → MCP → AI).
 *
 * Unlike the other lib/db/* modules (service-records / vehicles), these run
 * SERVER-side: the browser POSTs a scan to /api/obd/scans, which calls
 * saveObdScan here. So we use the server Supabase client (cookie session, RLS
 * still scopes to the signed-in user) rather than the browser client — there is
 * no offline queue or demo-store path for a snapshot capture.
 *
 * Column ↔ type mapping mirrors service-records.ts: a Row interface plus a
 * rowToObdScan() mapper, keeping snake_case DB names out of the rest of the app.
 */

/** Fields needed to save a scan; id / created_at are assigned by the DB. */
export interface SaveObdScanInput {
  /** Garage vehicle the scan belongs to, or null if it isn't pinned to a car. */
  vehicleId: string | null;
  /** Car generation the scan was read for (981/987/…). */
  generation: string;
  faults: FaultsData | null;
  live: LiveData | null;
  mode06: Mode06Data | null;
  moduleScan: ModuleScanData | null;
}

interface ObdScanRow {
  id: string;
  user_id: string;
  vehicle_id: string | null;
  created_at: string;
  generation: string | null;
  faults: FaultsData | null;
  live: LiveData | null;
  mode06: Mode06Data | null;
  module_scan: ModuleScanData | null;
}

function rowToObdScan(r: ObdScanRow): ObdScan {
  return {
    id: r.id,
    vehicleId: r.vehicle_id ?? null,
    generation: r.generation ?? '',
    createdAt: r.created_at,
    faults: r.faults ?? null,
    live: r.live ?? null,
    mode06: r.mode06 ?? null,
    moduleScan: r.module_scan ?? null,
  };
}

/**
 * Persist a scan snapshot for the signed-in user. Throws 'Not authenticated'
 * when there is no session (the route maps that to a 401). RLS + the denormalized
 * user_id guarantee the row is owned by, and only visible to, this user.
 */
export async function saveObdScan(input: SaveObdScanInput): Promise<ObdScan> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Columns mirror the obd_scans schema in supabase/migrations/0012_obd_scans.sql.
  const { data, error } = await supabase
    .from('obd_scans')
    .insert({
      user_id: user.id,
      vehicle_id: input.vehicleId || null,
      generation: input.generation || null,
      faults: input.faults ?? null,
      live: input.live ?? null,
      mode06: input.mode06 ?? null,
      module_scan: input.moduleScan ?? null,
    })
    .select('*')
    .single();
  if (error) throw error;
  return rowToObdScan(data as ObdScanRow);
}

/**
 * Latest saved scan for one vehicle, or null when none exist yet. RLS scopes to
 * the signed-in user, so this only ever returns the caller's own snapshots.
 */
export async function getLatestObdScan(vehicleId: string): Promise<ObdScan | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('obd_scans')
    .select('*')
    .eq('vehicle_id', vehicleId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToObdScan(data as ObdScanRow) : null;
}
