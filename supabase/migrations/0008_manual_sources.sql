-- Extend manual_sections for Mobile Tech Library + multi-source docs.
-- Existing 981 workshop rows stay source='workshop', generation='981'.

alter table public.manual_sections
  add column if not exists source     text not null default 'workshop',
  add column if not exists generation text not null default '981',
  add column if not exists doc_id     text;

create index if not exists manual_source_idx on public.manual_sections (source);
create index if not exists manual_generation_idx on public.manual_sections (generation);
create index if not exists manual_doc_id_idx on public.manual_sections (doc_id);

-- Drop the original 2-arg RPC so we can replace it with filtered search.
drop function if exists public.search_manual(text, int);

create or replace function public.search_manual(
  q text,
  lim int default 8,
  gen text default null,
  src text default null
)
returns table (
  id text, wm_code text, group_label text, title text,
  subsection text, models text, page int, snippet text,
  source text, generation text, doc_id text
)
language sql
stable
as $$
  select
    m.id, m.wm_code, m.group_label, m.title, m.subsection, m.models, m.page,
    ts_headline('english', left(m.content, 4000),
                websearch_to_tsquery('english', q),
                'MaxWords=45, MinWords=20, MaxFragments=1') as snippet,
    m.source, m.generation, m.doc_id
  from public.manual_sections m
  where coalesce(trim(q), '') <> ''
    and m.search @@ websearch_to_tsquery('english', q)
    and (gen is null or m.generation = gen or m.generation = 'shared')
    and (src is null or m.source = src)
  order by ts_rank(m.search, websearch_to_tsquery('english', q)) desc, m.page
  limit greatest(1, least(coalesce(lim, 8), 30));
$$;

grant execute on function public.search_manual(text, int, text, text) to authenticated;
