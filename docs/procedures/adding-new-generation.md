# Procedure: Adding a new generation

Add a whole new generation (e.g. **991**, **718/982**). This is the biggest change —
it touches every layer. Do it in this order and keep each layer consistent.

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

## 3. Options — `lib/data.ts`

Add `ENGINES_<gen>` / `TRANS_<gen>` and the generation branches in
`enginesFor()` / `transmissionsFor()` / default engine + transmission. Extend
`COLORS` with that generation's paint palette (see the colors note in
[building-features.md](./building-features.md)).

## 4. Documents — `lib/documents.ts` (+ upload)

Register the workshop manual volumes, SIT, diagnostics etc. (see
[adding-documents.md](./adding-documents.md)); split large manuals to ≤50 MB
volumes (`npm run manual:compress`), upload with `docs:upload`, import text with
`db:import-manual` / `db:import-mtl`.

## 5. 3D + visuals

- Exterior GLB(s) in `public/models/` + credits (`lib/credits.ts`, `NOTICE.md`).
- 2D cutaway/engine imagery wired via `cutawayImageFor()` / `engineRefFor()` in
  `lib/credits.ts`, images in `public/assets/`.
- If `hasXray3D`, add component GLBs under `public/models/components/<gen>/`
  (`npm run gen:components`).

## 6. Fitment — `lib/fitment/`

Add OEM `FitmentPreset`s (`oem.ts`), `WHEEL_BOLT_TORQUE[gen]`, and alignment
values (`alignment.ts`, with `verified` set honestly and a source).

## 7. MCP + verify

MCP tools scope by generation, so no new tools are needed — but **verify**
`get_wheel_fitment`, `get_alignment_specs`, `search_knowledge` etc. return the new
generation. Then: `npx tsc --noEmit`, run the app, switch to the new car, and
walk Garage / Documents / Tools / Faults.

## Checklist

- [ ] Registry + `BodyType` + generation union
- [ ] Knowledge JSON + `index.ts` wiring
- [ ] Engines/trans/colors in `lib/data.ts`
- [ ] Documents registered + uploaded
- [ ] 3D models/cutaways/components + credits
- [ ] Fitment presets + alignment
- [ ] MCP verified for the new generation; `tsc` clean; app walked
