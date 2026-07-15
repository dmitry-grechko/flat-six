-- Address Supabase database-linter warnings (security + performance).
-- Additive, idempotent, non-destructive: no table/column/data changes.
--
--  • PERFORMANCE (0003 auth_rls_initplan): wrap auth.uid() in a scalar subquery
--    so the planner evaluates it once per query instead of once per row.
--  • SECURITY (0011 function_search_path_mutable): pin a fixed search_path on
--    functions so it can't be overridden per role.
--  • SECURITY (0028/0029 *_security_definer_function_executable): revoke EXECUTE
--    on the SECURITY DEFINER trigger/utility functions from the API roles.
--
-- Function targets are resolved by name from pg_proc (every overload), so this
-- is robust to signature drift (e.g. search_parts gained a `gen` arg in 0005).
--
-- Not covered here (handled outside migrations — see the PR/notes):
--  • 0014 extension_in_public (pg_trgm, vector): moving an in-use extension +
--    type/opclass is riskier; do it deliberately with a test.
--  • auth_leaked_password_protection: an Auth setting (dashboard / management API),
--    not SQL.

-- ---------------------------------------------------------------------------
-- PERFORMANCE — RLS init-plan: (select auth.uid()) evaluates once per statement.
-- ---------------------------------------------------------------------------
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using ((select auth.uid()) = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check ((select auth.uid()) = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

drop policy if exists "vehicles_all_own" on public.vehicles;
create policy "vehicles_all_own" on public.vehicles
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "service_records_all_own" on public.service_records;
create policy "service_records_all_own" on public.service_records
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "service_plans_all_own" on public.service_plans;
create policy "service_plans_all_own" on public.service_plans
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "obd_scans_all_own" on public.obd_scans;
create policy "obd_scans_all_own" on public.obd_scans
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- SECURITY — pin search_path on the flagged functions (every overload). Use
-- `public` so the pg_trgm / pgvector operators used by the search functions
-- still resolve (those extensions live in public).
-- ---------------------------------------------------------------------------
do $$
declare r record;
begin
  for r in
    select p.proname, pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'touch_updated_at', 'search_parts', 'search_manual',
        'match_manual', 'search_manual_hybrid'
      )
  loop
    execute format('alter function public.%I(%s) set search_path = public', r.proname, r.args);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- SECURITY — SECURITY DEFINER functions should not be callable via the REST API.
-- handle_new_user() is an auth.users trigger; rls_auto_enable() is a maintenance
-- helper. Triggers still fire after this (trigger execution ignores EXECUTE
-- grants); this only removes the /rest/v1/rpc/* surface.
-- ---------------------------------------------------------------------------
do $$
declare r record;
begin
  for r in
    select p.proname, pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('handle_new_user', 'rls_auto_enable')
  loop
    execute format('revoke execute on function public.%I(%s) from anon, authenticated, public', r.proname, r.args);
  end loop;
end $$;
