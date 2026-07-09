-- Make the OEM parts catalog generation-aware so search can scope to the
-- active car's generation (981 / 987 / 991 …). Parts can be shared across
-- generations (part_number is the PK, so one row may apply to several), hence
-- an ARRAY column rather than a single value.

-- 1) generations[] on each part. Existing rows came from the 981 PET catalog.
alter table public.parts add column if not exists generations text[] not null default '{}';
update public.parts set generations = '{981}' where generations = '{}';
create index if not exists parts_generations_idx on public.parts using gin (generations);

-- 2) Replace search_parts with a generation-filtered version.
--    `gen` null  → search ALL generations (back-compatible with 2-arg callers).
--    `gen` set   → only parts tagged with that generation (or untagged/universal).
drop function if exists public.search_parts(text, int);

create or replace function public.search_parts(q text, lim int default 20, gen text default null)
returns setof public.parts
language sql
stable
as $$
  with input as (
    select
      coalesce(trim(q), '')                                       as raw,
      regexp_replace(lower(coalesce(q, '')), '[^a-z0-9]', '', 'g') as pn
  )
  select p.*
  from public.parts p, input i
  where
    -- generation scope: all, or this generation, or an untagged/universal part
    (gen is null or p.generations = '{}' or gen = any(p.generations))
    and (
      (length(i.pn) >= 3 and p.pn_normalized like '%' || i.pn || '%')
      or (i.raw <> '' and p.search @@ websearch_to_tsquery('english', i.raw))
    )
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

grant execute on function public.search_parts(text, int, text) to anon, authenticated;
