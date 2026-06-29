-- Porsche 981 OEM parts catalog (≈4,100 parts parsed from the PET catalog).
-- Shared reference data: world-readable, written only by the import script
-- (service role bypasses RLS). Searchable by part number (trigram) and by
-- description/system (full-text).

create extension if not exists pg_trgm;

create table if not exists public.parts (
  part_number   text primary key,
  description   text not null default '',
  system        text,
  groups        text[] not null default '{}',
  models        text[] not null default '{}',
  -- digits+letters only, for fragment matching ("9A1105", "981.351" → "981351")
  pn_normalized text generated always as (regexp_replace(lower(part_number), '[^a-z0-9]', '', 'g')) stored,
  search        tsvector generated always as (
    to_tsvector('english', coalesce(part_number, '') || ' ' || coalesce(description, '') || ' ' || coalesce(system, ''))
  ) stored
);

create index if not exists parts_search_idx     on public.parts using gin (search);
create index if not exists parts_pn_trgm_idx     on public.parts using gin (pn_normalized gin_trgm_ops);
create index if not exists parts_desc_trgm_idx   on public.parts using gin (description gin_trgm_ops);

-- Public reference data: anyone (incl. anonymous) may read; no write policy, so
-- only the service role (import script) can modify rows.
alter table public.parts enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'parts' and policyname = 'parts_read_all') then
    create policy "parts_read_all" on public.parts for select using (true);
  end if;
end $$;

grant select on public.parts to anon, authenticated;

-- Combined search: exact/prefix/substring part-number match ranks above
-- full-text description matches. Used by the MCP find_part tool and the UI.
create or replace function public.search_parts(q text, lim int default 20)
returns setof public.parts
language sql
stable
as $$
  with input as (
    select
      coalesce(trim(q), '')                                      as raw,
      regexp_replace(lower(coalesce(q, '')), '[^a-z0-9]', '', 'g') as pn
  )
  select p.*
  from public.parts p, input i
  where
    (length(i.pn) >= 3 and p.pn_normalized like '%' || i.pn || '%')
    or (i.raw <> '' and p.search @@ websearch_to_tsquery('english', i.raw))
  order by
    case
      when length(i.pn) >= 3 and p.pn_normalized = i.pn               then 0
      when length(i.pn) >= 3 and p.pn_normalized like i.pn || '%'     then 1
      when length(i.pn) >= 3 and p.pn_normalized like '%' || i.pn || '%' then 2
      else 3
    end,
    ts_rank(p.search, websearch_to_tsquery('english', case when i.raw = '' then 'zzzzzz' else i.raw end)) desc,
    p.part_number
  limit greatest(1, least(coalesce(lim, 20), 100));
$$;

grant execute on function public.search_parts(text, int) to anon, authenticated;
