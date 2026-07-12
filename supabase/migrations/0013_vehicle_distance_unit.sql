-- FLAT·SIX — per-car distance-unit preference (mi | km).
-- Odometer/service mileage stays stored in miles; this only controls how
-- distances are shown and entered for the car. Additive column with a default,
-- so existing rows keep 'mi'. The vehicles_all_own RLS policy already covers it.

alter table public.vehicles
  add column if not exists distance_unit text not null default 'mi'
  check (distance_unit in ('mi', 'km'));

comment on column public.vehicles.distance_unit is
  'Owner''s preferred distance unit for this car (mi | km). Mileage is still stored in miles.';
