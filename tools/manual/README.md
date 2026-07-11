# Documents & knowledge pipeline

Turns reference PDFs into (a) an in-app **Documents** library and (b) searchable
Supabase chunks for Fault Finding + MCP.

**Rights**: source PDFs and extracted JSON are gitignored — they feed your own
Supabase project only. DB reads require an authenticated session.

## Sources

| Source | UI category | Knowledge `source` | Generations |
|---|---|---|---|
| 981 workshop manual PDF | Workshop Manual | `workshop` | 981 |
| 987.1 / 987.2 service manuals | Workshop Manual | `workshop` | 987 |
| MTL Diagnostic Information | Diagnostic Information | `mtl-diagnostic` | 981, 987 |
| MTL Service Information Technik | Service Information Technik | `mtl-sit` | 981 / 987 by year |
| MTL Training Books (curated) | Training Books | `mtl-training` | 981 / 987 / shared |
| 987 owner/maintenance PDFs | Owner & Maintenance | `mtl-service` | 987 |

The full MTL dump is ~2.5k PDFs / 3 GB. We only catalog and parse **981 + 987**
(plus shared sports-car training books) — see `lib/documents.ts`.

## 1. Documents tab (PDF viewer)

Nav item **Documents** (`/manual`) lists friendly titles. Opening a card loads
the PDF viewer (`?doc=<id>`).

Locally, PDFs are served from `public/` (gitignored). In production they live
in the private `workshop-manual` Storage bucket; `/api/manual/url?doc=` returns
a signed URL.

```bash
# Free tier (≤50 MB): compress+split first, then upload volumes
npm run manual:compress             # 981 Ghostscript → v1/v2/v3 (~32 MB each)
npm run manual:compress-987         # 987.1 (3 vols) + 987.2 (8 vols); needs qpdf + gs
npm run docs:upload                 # workshop volumes + MTL curated set
npm run docs:upload -- --mtl-only   # skip workshop volumes
```

`db:import-mtl` only loads text search; it does not upload PDFs.

## 2. Text → Supabase knowledge

```bash
# Workshop manuals (WM / Mitchell procedure chunks)
node tools/manual/parse-manual.mjs "public/manual/981-workshop-manual.pdf"
npm run manual:parse-987 -- 9871
npm run manual:parse-987 -- 9872
npm run db:import-manual                                    # 981
npm run db:import-manual -- data/manual-987-9871.json
npm run db:import-manual -- data/manual-987-9872.json

# Mobile Tech Library (981 + 987 diagnostics, SIT, training, maintenance)
npm run manual:parse-mtl            # → data/mtl-981-987.json
npm run db:push                     # applies 0008_manual_sources.sql
npm run db:import-mtl
```

`search_manual` accepts optional `gen` / `src` filters. Fault Finding and the
MCP `search_workshop_manual` tool pass the active vehicle generation.
