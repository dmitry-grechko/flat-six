# Assembly catalog (WM → 3D)

Status: `todo` | `silhouette` | `coverage` | `done`  
Update after each calibration pass.

## 981 Boxster / Cayman

PDF: `public/manual/981-workshop-manual.pdf`  
Refs: `tools/gen/wm-refs/981/<section>/`

| Assembly | Gen script | Parts JSON | WM hints | Status |
| --- | --- | --- | --- | --- |
| `engine` | `engine.mjs` | `engine-parts.json` | 10 / 13 / 15 | done |
| `cooling` | `coolingRadiator.mjs` | `cooling-parts.json` | 19 | silhouette |
| `airfilter` | `airIntake.mjs` | `airfilter-parts.json` | 24 | silhouette |
| `exhaust` | `exhaust.mjs` | `exhaust-parts.json` | 26 | silhouette |
| `oil` | `oilSystem.mjs` | `oil-parts.json` | 17 | silhouette |
| `plugs` | `ignitionFuel.mjs` | `plugs-parts.json` | 24 / 28 | silhouette |
| `trans` | `transaxle.mjs` | `trans-parts.json` | 37–39 PDK | silhouette |
| `susp` | `suspension.mjs` | `susp-parts.json` | 40 / 42 + trailing arms | silhouette |
| `fbrakes` | `frontBrake.mjs` | `fbrakes-parts.json` | 46 | silhouette |
| `rbrakes` | `rearBrake.mjs` | `rbrakes-parts.json` | 46 | silhouette |
| `driveline` | `driveline.mjs` | `driveline-parts.json` | 422119 shafts / 39 diff | silhouette |
| `fuel` | `fuelSystem.mjs` | `fuel-parts.json` | 20 tank overview ~4310 | silhouette |
| `elec` | `electrical.mjs` | `elec-parts.json` | 9X | todo |

Gap-fill notes: [`tools/gen/wm-refs/notes/missing-parts-findings.md`](../../tools/gen/wm-refs/notes/missing-parts-findings.md)

## 987 (future)

| Assembly | Status |
| --- | --- |
| *(same ids)* | todo after PDF lands |
