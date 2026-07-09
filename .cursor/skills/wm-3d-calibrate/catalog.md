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

## 987 (future)

| Assembly | Status |
| --- | --- |
| *(same ids)* | todo after PDF lands |
