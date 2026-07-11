# Procedure: Adding a new generation

Add a whole new generation (e.g. **991**, **718/982**). This is the biggest change —
it touches every layer. Do it in this order and keep each layer consistent.

> **Ship incrementally — "honest absence".** A generation doesn't have to be
> complete to go live. Every registry falls back safely: an unregistered
> knowledge bundle resolves to an **empty** bundle ("no data" beats *wrong* data),
> and the powertrain / cutaway / components registries fall back to the 981 —
> while the `hasCutaway2D` / `hasXray3D` flags gate the 2D and 3D experiences per
> variant. So you can land the selectable exterior + knowledge first and flip the
> visual flags on later.

## 1. Variant registry — `lib/models.ts` + `lib/types.ts`

- Add the generation to the `CarVariant.generation` union.
- Add `CarVariant` entries for each body (Boxster/Cayman/…) with `glb`,
  `hasCutaway2D`, `hasXray3D`. Add the new `BodyType` ids to `lib/types.ts`.
- `GENERATIONS` and `generationForBody()` derive automatically.

## 2. Knowledge base — `lib/knowledge/`

- Create per-generation JSON: `fault-codes-<gen>.json`, `specs-<gen>.json`,
  `known-issues-<gen>.json`, `maintenance-<gen>.json`, and articles
  (`articles-<gen>.ts` + markdown under `articles/`).
- Wire them into `lib/knowledge/index.ts` (`GENERATION_KB` + getters). Search and
  every MCP knowledge tool then scope to the new generation with no further work.
- Run **`npm run kb:lint`** — it validates codes/ids/systems/severities for every
  generation and fails CI on a broken or duplicated bundle.

## 3. Options — `lib/data.ts`

Add `ENGINES_<gen>` / `TRANS_<gen>`, then register **one `GENERATION_POWERTRAIN`
entry** (engines, transmissions, default engine + transmission). `enginesFor()`,
`transmissionsFor()`, `defaultEngine()`, `defaultTransmission()` and
`componentsForGeneration()` all derive from the registries — there are no
per-generation `if` branches to edit. Extend `COLORS` with that generation's paint
palette (see the colors note in [building-features.md](./building-features.md)).

## 4. Documents — `lib/documents.ts` (+ upload)

Register the workshop manual volumes, SIT, diagnostics etc. (see
[adding-documents.md](./adding-documents.md)); split large manuals to ≤50 MB
volumes (`npm run manual:compress`), upload with `docs:upload`, import text with
`db:import-manual` / `db:import-mtl`.

## 5. 3D + visuals

- Exterior GLB(s) in `public/models/` + credits (`lib/credits.ts`, `NOTICE.md`).
- 2D cutaway: add a `GENERATION_CUTAWAYS` + `GENERATION_ENGINE_REF` entry in
  `lib/credits.ts` (images in `public/assets/`) and a `COMPONENTS_<gen>` set wired
  into `GENERATION_COMPONENTS` in `lib/data.ts`. `cutawayImageFor()`,
  `engineRefFor()` and `componentsForGeneration()` derive from them — flip
  `hasCutaway2D` on once the hotspots line up.
- If `hasXray3D`, add component GLBs under `public/models/components/<gen>/`
  (`npm run gen:components`) and validate with `npm run gen:verify --gen <gen>`.

## 6. Fitment — `lib/fitment/`

Add OEM `FitmentPreset`s (`oem.ts`), `WHEEL_BOLT_TORQUE[gen]`, and alignment
values (`alignment.ts`, with `verified` set honestly and a source).

## 7. MCP + verify

MCP tools scope by generation, so no new tools are needed — but **verify**
`get_wheel_fitment`, `get_alignment_specs`, `search_knowledge` etc. return the new
generation. Then: `npx tsc --noEmit`, `npm run kb:lint`, run the app, switch to
the new car, and walk Garage / Documents / Tools / Faults.

## Checklist

- [ ] Registry + `BodyType` + generation union
- [ ] Knowledge JSON + `index.ts` wiring; `npm run kb:lint` clean
- [ ] Engines/trans (`GENERATION_POWERTRAIN`) + colors in `lib/data.ts`
- [ ] Documents registered + uploaded
- [ ] 3D models/cutaways/components + credits; `gen:verify --gen <gen>` clean
- [ ] Fitment presets + alignment
- [ ] MCP verified for the new generation; `tsc` clean; app walked

## ⚠ The 911 (991 / 992) is not a Boxster/Cayman

The steps above assume a mid-engine two-seater. A 911 is **rear-engine**, so
budget for real work, not a 987-style copy:

- **Body family** — `CarVariant.bodyStyle` is `'boxster' | 'cayman'`; the 911
  needs new body styles (Carrera / Targa / Turbo / GT3 …). Consider a body-family
  / trim layer above `generation`.
- **3D internals aren't reusable** — `xray-assemblies-*` / `flow-systems-*` place
  the engine mid-chassis with corner radiators and a centre-exit exhaust, in
  car-space coordinates. A rear-engine 911 layout must be re-authored, not copied.
- **Forced induction** — 991.2 Carreras and all Turbo/GT2 add turbos, intercoolers,
  charge pipes, boost sensors and their DTCs — systems the NA cars don't have.
- **Trim breadth** — the 911 range is far wider than a Boxster/Cayman generation,
  which makes trim-aware rendering (issue #2) and more GLBs (issue #1) load-bearing.
