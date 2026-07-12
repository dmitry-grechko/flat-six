-- FLAT·SIX — saved OBD scan snapshots (Live OBD → Supabase → MCP → AI).
--
-- The MCP server runs server-side and CANNOT read a user's local ELM327 (it
-- lives on their machine behind Web Serial / the local bridge). So Live OBD
-- reads the car locally, then SAVES a scan snapshot here (per-user, RLS), and
-- the get_obd_scan MCP tool reads the latest saved snapshot back for the AI.
--
-- Each snapshot stores the four read-model blobs Live OBD produces as jsonb —
-- shapes mirror lib/obd/types.ts (FaultsData / LiveData / Mode06Data /
-- ModuleScanData) and the ObdScan type in lib/types.ts. Nothing is decoded in
-- SQL; the tool cross-references DTCs against the knowledge base at read time.
--
-- RLS mirrors the existing per-user tables (service_records / service_plans):
-- a user can only ever touch their own rows (auth.uid() = user_id).

-- ---------------------------------------------------------------------------
-- obd_scans : one saved diagnostic snapshot for a vehicle.
-- user_id is denormalized so RLS is a simple auth.uid() = user_id check.
-- vehicle_id is nullable — a snapshot can be captured before the active car is
-- pinned — but is a FK so deleting a car cleans up its scans.
-- ---------------------------------------------------------------------------
create table if not exists public.obd_scans (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  vehicle_id   uuid references public.vehicles (id) on delete cascade,
  created_at   timestamptz not null default now(),
  -- Car generation the scan was read for (981/987/…) so DTC cross-referencing
  -- stays generation-safe — never mix 981 and 987 fault tables.
  generation   text,
  faults       jsonb,  -- FaultsData    : DME + module confirmed/pending/permanent DTCs
  live         jsonb,  -- LiveData      : live PID values + readiness monitors
  mode06       jsonb,  -- Mode06Data    : on-board monitor test results
  module_scan  jsonb   -- ModuleScanData: per-module UDS/KWP probe results
);
create index if not exists obd_scans_vehicle_id_idx on public.obd_scans (vehicle_id);
create index if not exists obd_scans_user_id_idx on public.obd_scans (user_id);
-- Latest-scan lookups (get_obd_scan / getLatestObdScan) order by created_at desc.
create index if not exists obd_scans_vehicle_created_idx
  on public.obd_scans (vehicle_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Row Level Security — full CRUD restricted to the owner.
-- ---------------------------------------------------------------------------
alter table public.obd_scans enable row level security;

create policy "obd_scans_all_own" on public.obd_scans
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
