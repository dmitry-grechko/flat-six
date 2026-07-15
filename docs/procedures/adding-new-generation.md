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

## Multi-marque, staging (dev/prod), and the golden scoping rule

Generations are no longer Porsche-only. Two mechanisms and one rule make adding
any car — including a non-Porsche marque, or a car you want live for admins only
while you build it — safe:

- **`make` + staging** (`lib/models.ts`): set `make: 'Audi'` (defaults to
  `'Porsche'`) and `status: 'development'` on the `CarVariant`. A `development`
  variant is hidden from the model picker for non-admins (`useIsAdmin()` +
  `visibleModelOptions()` in `lib/vehicle-context.tsx`) but is fully functional
  once in a garage — this is how a WIP car ships to production for admin testing.
  Flip to `status: 'stable'` (or drop the field) to launch it. `bodyStyle` accepts
  `'sedan'` for non-mid-engine bodies; extend the union for more.

- **THE GOLDEN SCOPING RULE — never collapse the generation.** Every surface must
  read the vehicle's *actual* generation and let the registries return an **honest
  empty** for one they don't cover. Do **NOT** write
  `const gen = g === '987' ? '987' : '981'` (or any `?? '981'` on a display path):
  it maps every unknown/non-Porsche car to 981 and shows Porsche parts, docs,
  torque and fitment on it. Pass the real generation — `documentsForGeneration`,
  `presetsForGeneration`, `getSpecs`, `alignmentForGeneration`, `exteriorPartsFor`
  and `colorsFor` already return empty/`[]` for unknown generations. When empty,
  render a "no data for this vehicle yet" state, not Porsche data. (This
  anti-pattern caused every leak in the Audi B9 rollout.)

### Registries a new marque / generation touches

| Concern | Registry / file | Unknown-gen behaviour |
| --- | --- | --- |
| Variant + staging | `CAR_VARIANTS` (`lib/models.ts`) — `make`, `status`, `bodyStyle`, `glb`, `hasCutaway2D/hasXray3D` | n/a (you add it) |
| Powertrain | `GENERATION_POWERTRAIN` (`lib/data.ts`) | falls back to 981 — **add an entry** |
| Paint | `GENERATION_COLORS` / `colorsFor` (`lib/data.ts`) | falls back to Porsche `COLORS` — **add a `COLORS_<x>` palette** |
| Knowledge (faults/specs/maint/issues) | `GENERATION_KB` (`lib/knowledge`) | empty bundle ✓ |
| Documents | `documentsForGeneration` (`lib/documents.ts`) | `[]` for non-981/987 ✓ |
| Fitment / alignment | `presetsForGeneration` / `alignmentForGeneration` (`lib/fitment`) | `[]` / `null` ✓ |
| Exterior pins | `exteriorPartsFor` (`lib/exterior-parts.ts`) | `[]` ✓ |
| OBD | `registerVehiclePack` (`lib/obd/packs.ts` + a `pack-<x>.ts` imported by `profiles.ts`) | generic-UDS fallback ✓ |
| 3D paint tint | `BODY_MAT` regex (`components/garage/GLBSceneClient.tsx`) | **add the GLB's body material name** |
| Model credit | `MODEL_CREDITS` (`lib/credits.ts`, `Record<BodyType>`) + `NOTICE.md` | **required** (tsc fails otherwise) |

A non-Porsche marque should show honest-empty knowledge / docs / tools / pins
until you collect its data — that is expected, not a bug. The **Audi A4 (B9)** is
the reference example: grep `audi-b9` / `audi-a4-b9` to see every touch point.

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

### ✅ 991 reference implementation (shipped — grep `991`)

The **991** is now a full, public generation and is the reference for a wide-trim
generation. What it added on top of the mid-engine checklist:

- **Full trim matrix (~48 variants)** in `CAR_VARIANTS` with two new optional
  `CarVariant` fields: `phase` (`'991.1'|'991.2'` — a picker "Series" step; data
  still scopes by `generation:'991'`) and `modelAvailable` (see stand-ins below).
  `bodyStyle` gained `'coupe' | 'targa' | 'cabriolet'`.
- **Cascading picker with derived sub-steps** — `ModelPicker.tsx` is data-driven:
  it inserts a **Series** step (from `phase`) and a **Body** step (from `bodyStyle`)
  only when they discriminate, and auto-advances single-option levels. So 981/987/A4
  are unchanged while the 911 reads Brand → 911 → 991.1/991.2 → Coupe/Cab/Targa → Trim.
- **Stand-in GLBs + contribute notice** — 12 GLBs cover the range; trims without a
  dedicated model set `modelAvailable:false` and reuse a same-family GLB. The garage
  (`ComponentExplorer.tsx`) then shows a "no exact 3D model yet — contribute on GitHub"
  pill + a "STAND-IN MODEL" badge, and `modelCreditFor()` (now `Partial<Record<…>>`
  keyed by the GLB-owning variant) resolves the stand-in's credit via its `glb` path.
- **Wide-palette colours** — `COLORS_991` (incl. the GT/PTS colours) via `GENERATION_COLORS`.
- **Powertrain** — one `GENERATION_POWERTRAIN['991']` superset (NA + turbo + GT engines,
  7-/6-speed manual + PDK); each trim snaps to its signature via `defaultEngine`/`defaultTransmission`.
- **Docs pipeline for a single huge manual** — `manual:compress-991` splits the 8,256-pp
  factory manual into ≤48 MB volumes (`compress-991-workshop.mjs` → `volumes-991.json`);
  `manual:parse-991` (`parse-991-workshop.mjs`, same Mitchell/WM format as the 987) →
  `data/manual-991.json`; `db:import-991` → `manual_sections`; `db:embed-manual` embeds;
  `docs:upload -- --only 991` pushes just the volumes to Storage. `documents.ts` gained
  `WORKSHOP_VOLUMES_991` + the `'991'` series across the volume/deep-link helpers.
- **Knowledge (two-layer, unchanged design)** — curated `specs/known-issues/maintenance-991.json`
  (specs verified + cited from the factory manual) wired into `GENERATION_KB`, **plus** the
  embedded manual. Fault codes stay `[]` (honest absence; Fault Finding leans on the manual).
- **Honest absence** — no 2D cutaway / 3D X-ray internals (rear-engine layout not authored):
  `hasCutaway2D:false`, `hasXray3D:false`; exterior pins / fitment return empty. OBD modules
  are 981-platform **candidates** (`uds-modules.ts` `REGISTRY['991']`, all `addressConfirmed:false`).
