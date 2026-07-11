# FLAT·SIX 981 Knowledge Base

A structured, sourced knowledge base on the **981** (Boxster 981 / Cayman 981c, model years ~2012–2016: base 2.7L, S/GTS 3.4L, GT4/Spyder 3.8L). It powers two consumers:

1. The **RAG assistant** (via `searchKnowledge`).
2. **MCP tools** for fault-code / spec / parts / maintenance lookups (which code against the exact exports in `index.ts`).

## What's in here

| File | Type | Approx. count | Description |
|------|------|--------------|-------------|
| `fault-codes.json` | `FaultCode[]` | ~47 | Generic OBD-II P-codes relevant to the DFI flat-six + platform-specific (P1128/P1130) + PDK pointer (P0700). |
| `specs.json` | `Spec[]` | ~60 | Torque, fluid specs, capacities, tyre sizes/pressures, electrical, tolerances. |
| `maintenance.json` | `MaintenanceItem[]` | ~17 | Factory interval schedule (oil, brake fluid, plugs, filters, coolant, PDK/manual service, belt, etc.). |
| `known-issues.json` | `KnownIssue[]` | ~19 | 981-specific issues incl. the explicit **"no IMS bearing"** note and verified recalls. |
| `articles/*.md` | markdown | 12 | Human-readable reference articles (overview, engine, PDK vs manual, fluids cheat-sheet, common problems, brakes/PCCB, suspension/PASM, buyer's checklist, DIY oil, DIY brakes, cooling, convertible top). |
| `articles.ts` | `KnowledgeArticle[]` | 12 | Bundler-safe mirror of the markdown; **`getArticles()` reads from here.** |
| `types.ts` | TS interfaces | — | The shared contract. |
| `index.ts` | API | — | Loaders + `searchKnowledge` + `KNOWLEDGE_SOURCES`. |

## Schema

See `types.ts` for the authoritative definitions: `FaultCode`, `Spec`, `MaintenanceItem`, `KnownIssue`, `KnowledgeArticle`, `KnowledgeChunk`, plus `Severity` and `KnowledgeKind`. The `index.ts` API is:

```ts
getFaultCodes(): FaultCode[]
getSpecs(): Spec[]
getMaintenance(): MaintenanceItem[]
getKnownIssues(): KnownIssue[]
getArticles(): KnowledgeArticle[]
searchKnowledge(query, opts?: { limit?; kinds? }): KnowledgeChunk[]
KNOWLEDGE_SOURCES: { name; kind; count; statusLabel }[]
```

JSON is imported directly (tsconfig has `resolveJsonModule`). The markdown articles are mirrored into `articles.ts` as strings so retrieval works in any Next.js bundle without filesystem reads — keep the `.md` files and `articles.ts` in sync if you edit either.

## How `searchKnowledge` works

Dependency-free, in-memory TF retrieval:

1. **Chunk build (memoized):** one `KnowledgeChunk` per fault code, spec, maintenance item, and known issue; articles are split into ~200-word chunks. Each chunk flattens its source record into a single searchable `text` field plus a `title`.
2. **Scoring:** the query is tokenized (`[a-z0-9]+`, case-insensitive). For each term, score += term frequency in the body, plus a **3×** boost for matches in the title.
3. **Code match:** if the query contains an OBD-II-looking code (e.g. `P0301`), an exact match against a fault chunk's code gets a **+1000** boost so it ranks first.
4. **Filter & return:** filter by `opts.kinds` if given, sort by score descending, return the top `opts.limit ?? 8`.

This is intentionally simple and synchronous — no embeddings, no network, no DB.
Structured facts (faults, curated specs, maintenance) live here; **factory
procedure depth** is in `manual_sections` (hybrid FTS + Voyage embeddings via
MCP `search_workshop_manual`). Torque: curated `specs*.json` (~35 DIY entries)
+ Torque Finder manual FTS for the long tail — do not duplicate the whole WM in JSON.

## Data sources

Facts were researched and verified against reputable sources, with a `source` URL on each record. Primary references include owner clubs and forums, parts catalogs and blogs, oil approvals, OBD-Codes (generic DTC library), NHTSA (recalls), and Wikipedia (model/engine facts). Several values are flagged **LOW/MEDIUM-CONFIDENCE** in their `notes` where they came from aggregators or closely-related (non-981) models — these should be confirmed against an official workshop manual / spec sheet before being treated as authoritative. Notably flagged: some torque values (coolant drain, engine mount, control arm), coolant total capacities, the 3.8L oil capacity, alternator output, base-model brake-disc dimensions, and the normal-vs-full-load tyre-pressure split (always defer to the car's door/fuel-flap placard).

**Correctness highlights deliberately encoded:** the 981 uses the DFI **9A1/MA1** engine and has **NO IMS bearing** (that was the M96/M97 in the 986/987.1); the wheel-bolt torque is **160 Nm** (not the legacy 130 Nm); the 3.4 L is **MA1.23** (the 2.7 is MA1.22); and the Pentosin FFL-3 commonly sold as "PDK fluid" is the **clutch/control fluid** — the PDK gear set uses 75W-90.

## Scale path (to real vector RAG later)

The current `searchKnowledge` is a keyword/TF ranker — fine for hundreds of chunks and zero infra cost. To scale retrieval:

1. **Postgres full-text search (recommended first step, stays free).** Move the chunks into a Supabase Postgres table with a `tsvector` column and a GIN index; query with `to_tsquery` / `ts_rank`. This gives stemming, phrase search, and ranking with **no embedding API and no ongoing cost**, and keeps the same `KnowledgeChunk` return shape.
2. **pgvector embeddings (true semantic RAG).** Add a `vector` column (Supabase ships `pgvector`), embed each chunk once (e.g. with an embeddings model), and query by cosine distance for semantic matches that keyword search misses. This adds an embedding step (one-time per chunk + per query) but enables paraphrase/concept retrieval.
3. **Hybrid.** Combine FTS and vector scores (e.g. reciprocal-rank fusion) for the best of both. Keep the `searchKnowledge(query, opts)` signature stable so the MCP tools and assistant don't change — only the implementation behind it does.

Because the chunk builder already produces stable `id`/`source`/`kind`/`title`/`text` records, migrating to either backend is a matter of bulk-loading those chunks and swapping the ranking implementation.
