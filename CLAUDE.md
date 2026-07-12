# FLAT·SIX — AI working rules

DIY maintenance app for the **Porsche Boxster/Cayman (981 & 987)** — a single
Next.js 14 (App Router) + TypeScript app on Vercel + Supabase, with an MCP server
for Claude. This file is the rulebook for AI pair-programming; the human-readable
runbooks live in [`docs/procedures/`](./docs/procedures) — read the relevant one
before non-trivial work.

## The golden rule

A change isn't done until the **five layers** it can touch are consistent:
**Data** (`lib/`) · **Backend** (`supabase/migrations/` + `lib/db/*`) · **UI**
(`app/` + `components/`) · **MCP** (`lib/mcp/tools.ts`) · **Docs**
(`docs/procedures/` + this file + `.cursor/rules/`).

## Where things live

- Static reference data → `lib/` (`data.ts`, `models.ts`, `knowledge/`,
  `fitment/`, `documents.ts`, `credits.ts`, `catalog.ts`). Version-controlled, same for everyone.
- Per-user data → Postgres via `lib/db/*`; every row has `user_id`, RLS = `auth.uid() = user_id`.
- Variant registry: `lib/models.ts` (`CAR_VARIANTS`) is the single source of truth for models.
- Knowledge is **per generation** — never let 981 and 987 data cross.

## Design system (match it exactly)

Inline styles, no CSS framework. Body font `'Helvetica Neue',Arial`; mono
`'JetBrains Mono'` for labels. Red `var(--red)`/`#D5001C`, ink `#0B0B0C`, greys
`#6E6E73/#9A9AA0/#B4B4B8`, border `#E3E3E5`, page bg `#ECECEE`. **Content goes on
white cards**; result boxes are white with a tone-colored border (never filled
tints). Reuse `components/tools/ui.tsx` + `diagrams.tsx`. Responsive: `padView`,
`stackSm`, `repeat(auto-fit,minmax())` grids, `flexWrap` chips, `overflowX:auto`
tab bars — test at 375 px. Nav item = route (`app/*/page.tsx` + `AppShell` +
`Sidebar` NAV + `PAGE_META`). **Live OBD** (`/obd`, beta) talks to the local helper
`tools/obd-bridge` (`npm run obd-bridge`, default `http://127.0.0.1:8765`) via
`lib/obd/httpClient.ts` — or **Web Serial** for USB ELM in desktop Chrome/Edge
(no helper). Classic Bluetooth still needs the bridge or Electron Desktop.
Read model + parsers are the shared `Elm327` (`lib/obd/elm327.ts` + `decode.ts`):
generic Mode 01 live PIDs, Mode 03/07/0A DTCs (with knowledge-base descriptions),
**Mode 06** on-board monitor results (`readMode06`), and a read-only **UDS/KWP
module scan** (`scanModules(generation)`) for non-DME modules. Module addresses
live in `lib/obd/uds-modules.ts` — only the DME is confirmed; the rest are
candidates (`addressConfirmed: false`) to verify on a real car with
`tools/obd-bridge/uds-probe.mjs`. Any new adapter capability must thread through
all four transports (`webSerial.ts`, `host.ts` + bridge `server.mjs`,
`electronClient.ts` + `apps/desktop/main.mjs`) via the `ObdClient` contract in
`types.ts`, then `useObdBridge.ts`. Pure decoders get a case in `decode.test.ts`
(`npx tsx lib/obd/decode.test.ts`).
**Downloads** (`/downloads`, beta) lists **FLAT·SIX Desktop** + **PWA** (full garage)
and lab Bridge — links resolve from the latest GitHub Release at request time
(`lib/github-release.ts`, ~5 min cache). No hardcoded version tag; no npm install
commands on that page.

## Full-app offline (Desktop + PWA)

Procedure: [`docs/procedures/full-app-offline.md`](./docs/procedures/full-app-offline.md).

- Offline garage sync: `lib/offline/` + `lib/db/*` (IndexedDB; queue when offline)
- Next PWA: `@ducanh2912/next-pwa` + `/offline` fallback; Documents/AI stay online-only
- Desktop: `apps/desktop` (Next standalone + OBD IPC); scripts `desktop:dev` / `desktop:pack`

## Backend & MCP

- Backend change → additive Supabase migration + update `lib/db/*` mapping +
  `lib/types.ts`, then `db:push`. Demo mode (`NEXT_PUBLIC_DEMO_MODE=true`) runs
  the front-end with no backend.
- **If a feature adds a capability the AI should use, expose it via MCP**
  (`lib/mcp/tools.ts`): knowledge/computation tools no-auth; garage tools
  token-scoped (RLS); always scope by generation. Validate before shipping.
- **Manual search** (`manual_sections`) is hybrid: tsvector FTS + Voyage
  embeddings in pgvector. After importing doc text, run `npm run db:embed-manual`
  (needs `VOYAGE_API_KEY`, server-only) so semantic search (MCP + Fault Finding)
  sees it. The torque finder deliberately uses FTS only — no embeddings.

## Procedures (read before doing)

- Add a document → [`docs/procedures/adding-documents.md`](./docs/procedures/adding-documents.md)
- Add a model variant → [`docs/procedures/adding-model-variant.md`](./docs/procedures/adding-model-variant.md)
- Add a generation → [`docs/procedures/adding-new-generation.md`](./docs/procedures/adding-new-generation.md)
- Build a feature → [`docs/procedures/building-features.md`](./docs/procedures/building-features.md)
- Discover OBD modules + manufacturer faults (per generation) → [`docs/procedures/obd-module-discovery.md`](./docs/procedures/obd-module-discovery.md)
- Full-app offline (Desktop + PWA) → [`docs/procedures/full-app-offline.md`](./docs/procedures/full-app-offline.md)
- Public SEO / marketing pages → [`docs/procedures/public-seo-pages.md`](./docs/procedures/public-seo-pages.md)

**When you change a process, update its procedure doc + this file + `.cursor/rules/`.**

## Verify

Lint isn't configured — **`npx tsc --noEmit` is the gate**. Unit-check pure logic
(`npx tsx lib/obd/decode.test.ts`), run the app, drive the real flow. Data claims
(specs/torque/alignment) must be verified against a real source or clearly flagged
`unconfirmed`.
