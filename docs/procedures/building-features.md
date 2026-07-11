# Procedure: Building a feature

The rules every new feature must follow. See the [golden rule](./README.md#the-golden-rule):
keep Data / Backend / UI / MCP / Docs consistent.

## 1. Design system (non-negotiable)

The UI is inline-styled (no CSS framework). Match the existing look:

- **Type:** body `'Helvetica Neue', Arial, sans-serif`; mono labels/values
  `'JetBrains Mono', monospace` (uppercase, letter-spaced).
- **Colors:** brand red `var(--red)` / `#D5001C`; ink `#0B0B0C`; greys `#6E6E73`,
  `#9A9AA0`, `#B4B4B8`; border `#E3E3E5`; page bg `#ECECEE`.
- **Surfaces:** page background is grey; **content sits on white cards**
  (`#fff`, `1px solid #E3E3E5`, radius 4–6). Result/verdict boxes are white with a
  tone-colored border — never a filled tinted background. Reuse
  `components/tools/ui.tsx` (`InfoBox`, `Stat`, `NumberField`, `FieldGrid`,
  `ToolSection`) and `components/tools/diagrams.tsx` for visuals.
- **Responsive:** root views use `className="padView"` (padding drops on mobile);
  3-column grids use `stackSm`; input grids use
  `repeat(auto-fit, minmax(N, 1fr))`; chip/toggle rows use `flexWrap: 'wrap'`;
  tab/segment bars use `overflowX: 'auto'`. Test at 375 px.
- **Number inputs** hide native spinners globally — use unit suffixes instead.

## 2. Nav = route

A nav destination is a real route: add `app/<name>/page.tsx` wrapping the view in
`<AppShell>`, register it in `components/shell/Sidebar.tsx` (`NAV`) and
`components/shell/AppShell.tsx` (`PAGE_META`). Views are `'use client'`, read the
car via `useVehicle()` and derive generation with `generationForBody()`.

Public marketing pages (landing, `/features/*`, hubs, guides, codes) are SSR and
use `MarketingShell` — see [`public-seo-pages.md`](./public-seo-pages.md).

Factory PDF preview (`/manual`) is gated by `profiles.documents_access` (default
off for new accounts; toggle in Admin). Embeddings / manual search stay available.

**Live OBD** (`/obd`) is a first-class nav destination (marked **BETA**). Connection
tab is **ELM327-only**. On desktop Chrome/Edge, USB ELM prefers **Web Serial** (no
helper). Classic Bluetooth needs the local helper (`tools/obd-bridge`,
`npm run obd-bridge`) or FLAT·SIX Desktop. Client: `lib/obd/httpClient.ts`,
`webSerial.ts`, `useObdBridge`; UI: `components/views/ObdWorkspace.tsx`; immersive
**Focus** mode via `lib/obd/ObdFocusContext.tsx` (hides shell nav/header, Escape to
exit). Desktop uses `lib/obd/electronClient.ts`. No MCP tool yet (local hardware).
DTC chips deep-link to `/faults?q=CODE`.

**Downloads** (`/downloads`, **BETA**) lists FLAT·SIX Desktop + PWA (full garage)
and lab OBD Bridge. Catalog: `lib/downloads.ts` — set `href` / `hrefMac` when
GitHub Release assets are published. No npm commands in the UI.

## 3. If it touches the backend

- Per-user data → add a migration in `supabase/migrations/NNNN_*.sql` (additive;
  RLS is `auth.uid() = user_id`), update the mapping in `lib/db/*` **and** the
  domain type in `lib/types.ts`, then `npm run db:push`. Demo mode
  (`NEXT_PUBLIC_DEMO_MODE=true`) carries any `Vehicle` field in memory for free.
- Shared reference data → `lib/` (static, version-controlled).

## 4. If it adds a capability the AI should use → MCP

Expose it in `lib/mcp/tools.ts` with `server.registerTool`:

- Knowledge/computation tools are **no-auth**; garage (per-user) tools read the
  bearer token via `extra.authInfo?.token` and are RLS-scoped.
- Scope by generation (`GENERATION_ARG` / `VEHICLE_ID_ARG` + `resolveKnowledgeScope`)
  so answers never cross 981/987.
- **Validate** it (MCP Inspector or Claude Code against `/api/mcp`) before shipping.
  Rule of thumb: if a new Tools tab or data source ships, it gets an MCP tool.

## 5. Update the docs

If you changed a **process** (not just code), update the matching file in
`docs/procedures/`, and mirror any rule change into `CLAUDE.md` and
`.cursor/rules/`. Docs, `CLAUDE.md`, and cursor rules must not drift.

## 6. Verify before you commit

- `npx tsc --noEmit` clean (lint isn't configured — tsc is the gate).
- Unit-check pure logic (e.g. `lib/fitment/*` with `node --experimental-strip-types`).
- Run the app and drive the actual flow; confirm mobile at 375 px.
