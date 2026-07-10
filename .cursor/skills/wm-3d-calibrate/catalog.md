# Assembly catalog (WM → 3D)

Status: `todo` | `silhouette` | `coverage` | `done`  
Update after each calibration pass.

## 981 Boxster / Cayman

PDF: `public/manual/981-workshop-manual.pdf`  
Refs: `tools/gen/wm-refs/981/<section>/`

| Assembly | Gen script | Parts JSON | WM hints | Status |
| --- | --- | --- | --- | --- |
| `engine` | `engine.mjs` | `engine-parts.json` | oil-pan + hose traces | silhouette |
| `cooling` | `coolingRadiator.mjs` | `cooling-parts.json` | hose S-bend trace | silhouette |
| `airfilter` | `airIntake.mjs` | `airfilter-parts.json` | aircleaner CL droop | silhouette |
| `exhaust` | `exhaust.mjs` | `exhaust-parts.json` | silencer aspect from trace | silhouette |
| `oil` | `oilSystem.mjs` | `oil-parts.json` | filter dome from trace | silhouette |
| `plugs` | `ignitionFuel.mjs` | `plugs-parts.json` | 24 / 28 | silhouette |
| `trans` | `transaxle.mjs` | `trans-parts.json` | ATF pan extrude trace | silhouette |
| `susp` | `suspension.mjs` | `susp-parts.json` | 40 / 42 | silhouette |
| `fbrakes` | `frontBrake.mjs` | `fbrakes-parts.json` | 46 (no usable blue CAD) | silhouette |
| `rbrakes` | `rearBrake.mjs` | `rbrakes-parts.json` | 46 | silhouette |
| `driveline` | `driveline.mjs` | `driveline-parts.json` | shafts / diff | silhouette |
| `fuel` | `fuelSystem.mjs` | `fuel-parts.json` | tank overview | silhouette |
| `elec` | `electrical.mjs` | `elec-parts.json` | 9X | todo |

Trace notes: [`tools/gen/wm-refs/notes/wm-trace-findings.md`](../../tools/gen/wm-refs/notes/wm-trace-findings.md), [`wave-trace-catalog.md`](../../tools/gen/wm-refs/notes/wave-trace-catalog.md)

## 987 Boxster / Cayman (987.2-flavored)

Source: `temp/987_material_1/Service Introduction for 2009 models.pdf` (194pp, 987.2 / 9A1 / PDK; doc page ≈ PDF page − 7)
Refs: `tools/gen/wm-refs/987/{engine,fuel-intake-exhaust,pdk,chassis}/`
Gen scripts: `tools/gen/components/987/` (delegate to 981 builders unless forked) — build via `npm run gen:components -- --gen 987` (`--only id1,id2` for subsets)
Parts JSON: `public/models/components/987/<id>-parts.json` · placement: `components/garage/xray-assemblies-987.ts` · flows: `flow-systems-987.ts`

| Assembly | Gen script | WM hints (PDF page) | Status |
| --- | --- | --- | --- |
| `engine` | *(none — real 9A1 GLB copy, never rebuild)* | 10–33 | silhouette |
| `cooling` | `987/coolingRadiator.mjs` (delegates 981) | 30–33 | silhouette |
| `airfilter` | `987/airIntake.mjs` | ~58 (air routing) | done |
| `exhaust` | `987/exhaust.mjs` | 60–69 | done |
| `oil` | `987/oilSystem.mjs` | ~27 (oil supply) | done |
| `plugs` | `987/ignitionFuel.mjs` | 46–56 (DFI) | done |
| `trans` | `987/transaxle.mjs` | 70–112 (PDK) | done |
| `susp` | `987/suspension.mjs` | 115–118 (+ hydraulic PS) | done |
| `fbrakes` | `987/frontBrake.mjs` | ~126 | done |
| `rbrakes` | `987/rearBrake.mjs` | ~126 | done |
| `driveline` | `987/driveline.mjs` (delegates 981) | — | silhouette |
| `fuel` | `987/fuelSystem.mjs` (delegates 981) | 45–48 | silhouette |
| `elec` | `987/electrical.mjs` (delegates 981) | 163+ | silhouette |

Findings: `tools/gen/wm-refs/notes/987-{air,drivetrain,chassis}-findings.md`  
Layout: `npm run gen:layout -- --gen 987` → 0 errors (2026-07-10)
