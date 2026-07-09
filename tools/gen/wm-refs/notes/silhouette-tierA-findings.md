# Tier A silhouette pass — engine case, PDK pan, coolant lines

Date: 2026-07-09  
Goal: make outer envelopes read closer to WM CAD (not box stacks).

## Sources (extracted, © Porsche — local only)

| Assembly | Pages / figs | Files |
| --- | --- | --- |
| Engine oil pan | WM 175019 p4035–4045 | `981/engine/oil-pan-*.png` |
| Engine belt / coolant face | Fig 2 belt-side p3597; coolant pipes p3614 | `981/engine/belt-side-*.png`, `coolant-pipes-*.png` |
| PDK ATF pan | WM 375519 p5842–5845 | `981/trans/atf-pan-*.png` |
| Coolant hoses / pump | p3537 S-bend hoses; p3669 pump + pipes | `981/cooling/coolant-hoses-*.png`, `coolant-pump-*.png` |

## Primitive upgrade

- Added `extrude()` in `tools/gen/lib/primitives.mjs` for irregular WM footprints (pans / flanges).

## Changes

### Engine (`engine.mjs`)
- **Crankcase:** wide flat-six massing — central tunnel + bank shoulders + horizontal casting ribs + unit-carrier lump (WM -10-), instead of one brick.
- **Oil pan:** extruded irregular footprint (WM 4035), dense longitudinal fins, support domes, upper frame + side protrusion (WM 4045).
- **Coolant on engine:** vertical connection piece, distributor housing, twin parallel hard pipes (WM 3614), S-bend molded hoses (WM 3537).

### Trans (`transaxle.mjs`)
- **PDK ATF pan:** extruded shield footprint, mid-width step ridge, denser rib grid, intake snorkel boss (WM 5842/5844). Drain plug offset unchanged.

### Cooling (`coolingRadiator.mjs`)
- Thermostat → multi-port regulator casting; pump → bracket + ribbed pulley (WM 3669).
- Chassis hoses: more waypoints, sill-hugging twin circuits, spring-band clamp rings.
- Twin parallel hard lines L/R instead of one mid-car crossover tube.

## Verify

- `npm run gen:components` OK (engine ~2.8 MB, cooling ~410 KB, trans ~620 KB).
- Coverage + layout: run by parent (`gen:verify`, `gen:layout`).

## Ceiling

Still procedural illustration fidelity — not OEM CAD. Next wins if needed: lofted hose centerlines traced pixel-accurate from more overview figs; optional simplified reference mesh for hero housings only.
