# @flatsix/obd-core

Framework-agnostic OBD-II / KWP2000 / UDS engine for ELM327 adapters, written in
plain TypeScript. This is the extractable core of FLAT·SIX Live OBD — it has **no
React, Next.js, Supabase, or app dependencies** and is designed to be lifted into
its own open-source repository with minimal work.

## What's in here

- **Decoders** (`decode.ts`, `pids.ts`) — generic SAE J2012 DTCs, Mode 01 live
  PIDs, Mode 06 on-board monitors, Mode 03/07/0A fault memory, ISO-TP framing, and
  UDS/KWP 3-byte manufacturer codes.
- **Protocol engine** (`elm327.ts`) — the ELM327 session/adapter driver.
- **Insights** (`insights.ts`) — fuel-trim, readiness, and per-cylinder misfire
  analysis (pure functions).
- **Transports** — one `ObdClient` contract (`types.ts`) implemented four ways:
  `webSerial.ts` (browser Web Serial), `httpClient.ts` (browser → bridge),
  `electronClient.ts` (browser → Electron IPC), and `host.ts` + `node-serial.ts`
  (the Node side used by both the bridge and Electron main).
- **Marque layer** — `profiles.ts` (per-generation DME protocol + cylinder count)
  and `uds-modules.ts` (per-generation CAN module address registry). Both are
  self-contained data keyed by a `generation: string`, with a generic DME-only
  fallback for unknown generations. Generic OBD-II works for any car; the Porsche
  data is parameterized, not woven into the decode logic.

## Entry points

- `index.ts` — **browser-safe** barrel (decoders, insights, profiles, module
  registry, ELM session, adapter seam, HTTP client).
- `node.ts` — **Node** barrel (re-exports `index` + the serialport transport and
  `ObdHost`). Used by `tools/obd-bridge` and the desktop `obd-host-runner`.

## Boundary rule

Nothing in this directory may import from `@/` (the app). The React bindings that
consume it — the `useObdBridge` hook and `ObdFocusContext` — live in
`lib/obd-react/` on purpose, because they carry app concerns (demo mode, scan
persistence to `/api/obd/scans`). Keep them out of here.

Verify the boundary at any time:

```bash
grep -rn "@/" lib/obd            # should return nothing (imports)
npx tsc --noEmit                 # project type gate
npx tsx lib/obd/decode.test.ts   # + insights.test.ts, profiles.test.ts
```

## Lifting this out (Stage 2 — not yet done)

The app currently consumes this via the `@/lib/obd/*` path alias, so it is not yet
a real npm package. To lift it into its own repo / workspace package:

1. Move this directory to `packages/obd-core/`, add root `workspaces`, and add
   `main` / `types` / `exports` (pointing at `index.ts` and `node.ts`) to this
   manifest. Add `transpilePackages: ['@flatsix/obd-core']` to `next.config`.
2. Repoint the two bundlers that already treat this as a unit:
   `apps/desktop/scripts/bundle-host.mjs` and `tools/obd-bridge/scripts/pack.mjs`
   (+ `tools/obd-bridge/server.mjs`'s relative `../../lib/obd/node.ts` import).
3. Rename `@/lib/obd/*` imports across the app to `@flatsix/obd-core`.

**IP note before any public release:** ship the protocol/decode engine and the
module addresses discovered independently on-car. Do **not** ship anything derived
from licensed Porsche workshop manuals — the fault dictionary lives in
`lib/knowledge/*.json` (already outside this package) and must stay out.
