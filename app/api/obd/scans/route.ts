import { NextResponse } from 'next/server';
import { saveObdScan } from '@/lib/db/obd-scans';
import type { FaultsData, LiveData, Mode06Data, ModuleScanData } from '@/lib/obd/types';

// Save a Live OBD scan snapshot for the signed-in user. The MCP server can't
// read the user's local ELM327, so Live OBD reads the car in the browser, then
// POSTs the snapshot here to persist it (per-user, RLS). The get_obd_scan MCP
// tool reads the latest saved snapshot back for the AI.
//
// saveObdScan uses the cookie-session server client, so RLS scopes the insert
// to the caller; a missing session throws 'Not authenticated' → mapped to 401.

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));

  const vehicleId = typeof body?.vehicleId === 'string' ? body.vehicleId : null;
  const generation = typeof body?.generation === 'string' ? body.generation : '';
  const faults = (body?.faults ?? null) as FaultsData | null;
  const live = (body?.live ?? null) as LiveData | null;
  const mode06 = (body?.mode06 ?? null) as Mode06Data | null;
  const moduleScan = (body?.moduleScan ?? null) as ModuleScanData | null;

  if (!faults && !live && !mode06 && !moduleScan) {
    return NextResponse.json(
      { error: 'Nothing to save — read faults or live data first.' },
      { status: 400 },
    );
  }

  try {
    const scan = await saveObdScan({ vehicleId, generation, faults, live, mode06, moduleScan });
    return NextResponse.json({ ok: true, scan });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const status = message === 'Not authenticated' ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
