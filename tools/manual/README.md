# Documents & knowledge pipeline

Turns factory PDFs into (a) an in-app **Documents** library and (b) searchable
Supabase chunks for Fault Finding + MCP.

**Copyright**: all of this is © Porsche. PDFs and extracted JSON are gitignored —
they feed your own Supabase project only. DB reads require an authenticated session.

## Sources

| Source | UI category | Knowledge `source` | Generations |
|---|---|---|---|
| 981 workshop manual PDF | Workshop Manual | `workshop` | 981 |
| MTL Diagnostic Information | Diagnostic Information | `mtl-diagnostic` | 981, 987 |
| MTL Service Information Technik | Service Information Technik | `mtl-sit` | 981 / 987 by year |
| MTL Training Books (curated) | Training Books | `mtl-training` | 981 / 987 / shared |

The full MTL dump is ~2.5k PDFs / 3 GB. We only catalog and parse **981 + 987**
(plus shared sports-car training books) — see `lib/documents.ts`.

## 1. Documents tab (PDF viewer)

Nav item **Documents** (`/manual`) lists friendly titles. Opening a card loads
the PDF viewer (`?doc=<id>`).

Locally, PDFs are served from `public/` (gitignored). In production they live
in the private `workshop-manual` Storage bucket; `/api/manual/url?doc=` returns
a signed URL.

```bash
# Raise global Storage limit to ≥250 MB (Dashboard → Storage → Settings), then:
npm run docs:upload                 # workshop + MTL curated set
npm run docs:upload -- --mtl-only   # skip the 213 MB workshop PDF
```

## 2. Text → Supabase knowledge

```bash
# Workshop manual (WM procedure chunks) — may already be running elsewhere
node tools/manual/parse-manual.mjs "public/manual/981-workshop-manual.pdf"
npm run db:import-manual

# Mobile Tech Library (981 + 987 diagnostics, SIT, training)
npm run manual:parse-mtl            # → data/mtl-981-987.json
npm run db:push                     # applies 0008_manual_sources.sql
npm run db:import-mtl
```

`search_manual` accepts optional `gen` / `src` filters. Fault Finding and the
MCP `search_workshop_manual` tool pass the active vehicle generation.
