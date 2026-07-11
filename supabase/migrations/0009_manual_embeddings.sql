-- Semantic search for manual_sections via pgvector + Voyage embeddings.
--
-- Adds a 1024-dim embedding column (voyage-4-lite), an HNSW cosine index, a
-- pure-vector KNN RPC, and a HYBRID RPC that fuses the existing tsvector search
-- with vector similarity via Reciprocal Rank Fusion (RRF). Embeddings are
-- produced out-of-band by tools/manual/embed-sections.mjs (npm run db:embed-manual)
-- and passed in already-computed by the caller (the Voyage key stays server-side).
--
-- Everything degrades gracefully: until the backfill runs, `embedding` is NULL,
-- the vector CTE is empty, and search_manual_hybrid returns the same ranking as
-- the plain FTS search_manual.

create extension if not exists vector;

alter table public.manual_sections
  add column if not exists embedding vector(1024);

-- HNSW cosine index. Safe to create before backfill (it just starts empty).
create index if not exists manual_embedding_idx
  on public.manual_sections using hnsw (embedding vector_cosine_ops);

-- Pure vector KNN. `query_embedding` is computed by the caller (server-side).
create or replace function public.match_manual(
  query_embedding vector(1024),
  match_count int default 8,
  gen text default null,
  src text default null
)
returns table (
  id text, wm_code text, group_label text, title text,
  subsection text, models text, page int, snippet text,
  source text, generation text, doc_id text, similarity real
)
language sql
stable
as $$
  select
    m.id, m.wm_code, m.group_label, m.title, m.subsection, m.models, m.page,
    left(m.content, 240) as snippet,
    m.source, m.generation, m.doc_id,
    (1 - (m.embedding <=> query_embedding))::real as similarity
  from public.manual_sections m
  where m.embedding is not null
    and (gen is null or m.generation = gen or m.generation = 'shared')
    and (src is null or m.source = src)
  order by m.embedding <=> query_embedding
  limit greatest(1, least(coalesce(match_count, 8), 30));
$$;

grant execute on function public.match_manual(vector, int, text, text) to authenticated;

-- Hybrid search: Reciprocal Rank Fusion of FTS rank + vector rank (k = 60).
-- Pools the top 100 of each signal, fuses, returns the top `lim`. When
-- `query_embedding` is null (Voyage unavailable) it reduces to pure FTS.
create or replace function public.search_manual_hybrid(
  q text,
  query_embedding vector(1024) default null,
  lim int default 8,
  gen text default null,
  src text default null
)
returns table (
  id text, wm_code text, group_label text, title text,
  subsection text, models text, page int, snippet text,
  source text, generation text, doc_id text, score real
)
language sql
stable
as $$
  with fts as (
    select m.id,
           row_number() over (
             order by ts_rank(m.search, websearch_to_tsquery('english', q)) desc, m.page
           ) as rnk
    from public.manual_sections m
    where coalesce(trim(q), '') <> ''
      and m.search @@ websearch_to_tsquery('english', q)
      and (gen is null or m.generation = gen or m.generation = 'shared')
      and (src is null or m.source = src)
    limit 100
  ),
  vec as (
    select m.id,
           row_number() over (order by m.embedding <=> query_embedding) as rnk
    from public.manual_sections m
    where query_embedding is not null
      and m.embedding is not null
      and (gen is null or m.generation = gen or m.generation = 'shared')
      and (src is null or m.source = src)
    limit 100
  ),
  fused as (
    select coalesce(f.id, v.id) as id,
           (coalesce(1.0 / (60 + f.rnk), 0) + coalesce(1.0 / (60 + v.rnk), 0))::real as score
    from fts f
    full outer join vec v on v.id = f.id
  )
  select
    m.id, m.wm_code, m.group_label, m.title, m.subsection, m.models, m.page,
    coalesce(
      nullif(
        ts_headline('english', left(m.content, 4000),
                    websearch_to_tsquery('english', q),
                    'MaxWords=45, MinWords=20, MaxFragments=1'),
        ''),
      left(m.content, 240)
    ) as snippet,
    m.source, m.generation, m.doc_id, fu.score
  from fused fu
  join public.manual_sections m on m.id = fu.id
  order by fu.score desc, m.page
  limit greatest(1, least(coalesce(lim, 8), 30));
$$;

grant execute on function public.search_manual_hybrid(text, vector, int, text, text) to authenticated;
