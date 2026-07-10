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
`Sidebar` NAV + `PAGE_META`).

## Backend & MCP

- Backend change → additive Supabase migration + update `lib/db/*` mapping +
  `lib/types.ts`, then `db:push`. Demo mode (`NEXT_PUBLIC_DEMO_MODE=true`) runs
  the front-end with no backend.
- **If a feature adds a capability the AI should use, expose it via MCP**
  (`lib/mcp/tools.ts`): knowledge/computation tools no-auth; garage tools
  token-scoped (RLS); always scope by generation. Validate before shipping.

## Procedures (read before doing)

- Add a document → [`docs/procedures/adding-documents.md`](./docs/procedures/adding-documents.md)
- Add a model variant → [`docs/procedures/adding-model-variant.md`](./docs/procedures/adding-model-variant.md)
- Add a generation → [`docs/procedures/adding-new-generation.md`](./docs/procedures/adding-new-generation.md)
- Build a feature → [`docs/procedures/building-features.md`](./docs/procedures/building-features.md)

**When you change a process, update its procedure doc + this file + `.cursor/rules/`.**

## Verify

Lint isn't configured — **`npx tsc --noEmit` is the gate**. Unit-check pure logic
(`node --experimental-strip-types`), run the app, drive the real flow. Data claims
(specs/torque/alignment) must be verified against a real source or clearly flagged
`unconfirmed`.
