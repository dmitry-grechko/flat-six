-- 981 factory workshop manual, chunked into ~3,800 searchable procedure
-- sections (parsed by tools/manual/parse-manual.mjs from the owner's PDF,
-- imported by npm run db:import-manual with the service role).
--
-- UNLIKE the parts table this is NOT world-readable: the text is © Porsche,
-- so SELECT is granted to authenticated users only (the owner's garage), and
-- the source JSON is gitignored — the repo ships only the pipeline.

create table if not exists public.manual_sections (
  id          text primary key,
  wm_code     text,
  group_code  text,
  group_label text,
  title       text not null,
  subsection  text,
  models      text,
  page        int  not null default 0,
  content     text not null default '',
  search      tsvector generated always as (
    to_tsvector('english',
      coalesce(wm_code, '') || ' ' || coalesce(title, '') || ' ' ||
      coalesce(subsection, '') || ' ' || content)
  ) stored
);

create index if not exists manual_search_idx on public.manual_sections using gin (search);
create index if not exists manual_wm_idx     on public.manual_sections (wm_code);

alter table public.manual_sections enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'manual_sections' and policyname = 'manual_read_authed') then
    create policy "manual_read_authed" on public.manual_sections
      for select to authenticated using (true);
  end if;
end $$;

grant select on public.manual_sections to authenticated;

-- Ranked full-text search returning a highlighted snippet (not full content —
-- callers fetch a section by id when they need the whole procedure).
create or replace function public.search_manual(q text, lim int default 8)
returns table (
  id text, wm_code text, group_label text, title text,
  subsection text, models text, page int, snippet text
)
language sql
stable
as $$
  select
    m.id, m.wm_code, m.group_label, m.title, m.subsection, m.models, m.page,
    ts_headline('english', left(m.content, 4000),
                websearch_to_tsquery('english', q),
                'MaxWords=45, MinWords=20, MaxFragments=1') as snippet
  from public.manual_sections m
  where coalesce(trim(q), '') <> ''
    and m.search @@ websearch_to_tsquery('english', q)
  order by ts_rank(m.search, websearch_to_tsquery('english', q)) desc, m.page
  limit greatest(1, least(coalesce(lim, 8), 30));
$$;

grant execute on function public.search_manual(text, int) to authenticated;
