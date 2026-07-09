# Intake geometry findings (WM vs before/after)

Evidence: WM 242519 (air cleaner housing), WM 244601 (intake-air distributor leak test), WM 244619 (intake-air distributor R&I). CAD figures under `tools/gen/wm-refs/intake/`.

## Workshop-manual facts

| Claim | Source |
| --- | --- |
| **Plural air cleaner housings** (left and right) | WM 242519: separate R&I steps for right housing (DME / oil filler); fastening nuts in luggage compartment per housing |
| Each housing: **rectangular side-scoop mouth → elongated curved duct → circular neck** | Fig 1/2 CAD (`aircleaner-242519-4432.png`, `4433.png`): blue housing, yellow screw-type clamp, corrugated flow duct inboard |
| Rubber sleeve + screw-type clamp (3 Nm) between housing and next duct | WM 242519 technical values / install steps |
| **Singular throttle housing** fed by the housings | WM 244601: “rubber sleeve on air intake between the **air cleaner housings** and **throttle housing**” |
| Downstream: intake-air distributor(s) / plenum per bank | WM 244619: distributor 1–3 (and implied 4–6) with runners to the head |

**Correct factory path:** both side scoops → dual air cleaner housings → merge → single central throttle housing → intake-air distributors / plenums → runners.

## Before (incorrect)

| Area | What the code assumed |
| --- | --- |
| `flow-systems.ts` intake | “LEFT side scoop only (the right scoop just ventilates)” — single L-only path; cited WM 242519 incorrectly |
| `airIntake.mjs` airboxes | Huge ~0.95×0.5×1.5 boxes at x±1.25 — not the elongated scoop→filter→neck CAD shape |
| Throttle | Dual per-bank throttle bodies at x±0.5 |
| Snorkels | Long aft bay snorkels fighting the housing path |
| `xray-assemblies.ts` | Hotspot centre-LEFT (“fed by the left scoop only”) |

## After (this patch)

| File | Change |
| --- | --- |
| `tools/gen/components/airIntake.mjs` | Dual elongated housings: rectangular mouth (~x±1.95) → transition → filter box → taper → circular neck + clamp + rubber sleeve; short scoop-aligned snorkels; ducts merge at central `throttleBody` ~[0, 0.5, -0.9]; `throttleBodyBank2` kept as tiny contract stub; header comments match WM layout |
| `components/garage/flow-systems.ts` | Desc + comments fixed; **two** paths (L and R) merging at throttle/plenum; `labelAt` centered |
| `components/garage/xray-assemblies.ts` | Hotspot `0 0.55 -0.55`, comment dual/center; slightly larger `displayRadius` |
| PRIMARY node names | Unchanged (parts JSON contract preserved) |

## Not regenerated here

Parent should run `gen:components` to rebuild `airfilter.glb`. No commit from this pass.
