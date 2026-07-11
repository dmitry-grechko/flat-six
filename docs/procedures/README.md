# FLAT·SIX — Procedures

Step-by-step runbooks for the repeatable work in this repo. **Keep them current:**
if you change one of these processes, update the relevant file here _and_ the AI
rules ([`CLAUDE.md`](../../CLAUDE.md) and [`.cursor/rules/`](../../.cursor/rules)).

| Procedure | When to use |
| --- | --- |
| [adding-documents.md](./adding-documents.md) | Add a workshop manual, TSB, or tech doc (Documents + knowledge + faults + Supabase upload) |
| [adding-model-variant.md](./adding-model-variant.md) | Add a body variant within an existing generation (e.g. a Spyder) |
| [adding-new-generation.md](./adding-new-generation.md) | Add a whole new generation (e.g. 991, 718/982) |
| [building-features.md](./building-features.md) | Build any feature — design system, backend/MCP rules, doc upkeep |
| [track-offline.md](./track-offline.md) | Track companion: PWA + Electron packaging, OBD transports, offline KB |
| [public-seo-pages.md](./public-seo-pages.md) | Public marketing / SEO pages (landing, hubs, guides) |

## The golden rule

A change is not "done" until the **five layers** that can be affected are all
consistent:

1. **Data** — `lib/` (static reference: `data.ts`, `models.ts`, `knowledge/`, `fitment/`, `documents.ts`, `credits.ts`)
2. **Backend** — `supabase/migrations/` + `lib/db/*` mappings (only if per-user data changes)
3. **UI** — `app/` routes + `components/` (follow the design system)
4. **MCP** — `lib/mcp/tools.ts` (expose any new capability the AI should use)
5. **Docs** — this folder + `CLAUDE.md` + `.cursor/rules/` (when a process changes)
