-- FLAT·SIX — store a vehicle's current wheel/tyre setup.
-- Saved from Tools → fitment so owners can compare their setup vs OEM.
-- Additive JSONB column (same pattern as service_records.items); existing
-- vehicles_all_own RLS policy already covers it, so no policy change is needed.

alter table public.vehicles
  add column if not exists wheel_setup jsonb;

comment on column public.vehicles.wheel_setup is
  'Owner''s current wheel/tyre setup { front, rear, notes? } — mirrors WheelSetup in lib/types.ts.';
