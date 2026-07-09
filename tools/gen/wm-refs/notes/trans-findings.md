# Trans (PDK) — 981 WM findings

## Sources (pages / Fig titles)

| Pages | Figs / procedure | What we used |
| --- | --- | --- |
| p5794–p5798 | WM 373019 — Transmission Control Unit (PDK) install | Fig 1 installation position (rear LH luggage); Fig 2–3 TCU box + dual connectors in slide-in bracket |
| p5814–p5818 | WM 373419 — Removing/installing PDK | Fig 8 / Fig 2 bellhousing bolt pattern (ears at ~12/3/5/7/9); flange face toward engine; ATF pan front edge with cooling ribs |
| p5832–p5840 | WM 374019 — Transmission mount | Fig 1–3 hydraulic/dynamic mount + transmission bracket (Y/L arm, lightening holes, plug boss) |
| p5841–p5845 | WM 375519 — ATF pan | Fig 1 drain plug on pan; Fig 1 screw sequence (shield footprint + lip); Fig 1 electrohydraulic intake duct with pan removed |

Text notes: `tools/gen/wm-refs/notes/trans-pages.txt`. PNGs under `tools/gen/wm-refs/981/trans/` (© Porsche — not committed).

## Tier A silhouette (before → after)

| Feature | Before | After (WM-driven) |
| --- | --- | --- |
| Main case | Single `box` gearCase | Stepped `roundBox` group: clutch step → mid case → rear step + top shoulder |
| Bellhousing | Plain cyl + torus flange | Flange ears at WM bolt clock positions; circumferential ribs on `pdkBellhousing` band |
| Side casting | Vertical ribs only | Vertical + horizontal cross-grid ribs (WM 5833 square-grid look) |
| ATF pan | Flat rectangular sump | Shield/home-plate footprint, perimeter lip, underside cooling ribs, sump-bolt ring |
| Electrohydraulic | Valve body + solenoids on **top** of case | Valve body + 7-solenoid bank + intake duct in **underside** pan cavity (WM 5844) |
| Mechatronic | Small cover box on top | Plate/block in same underside packaging zone as HCU |
| Rear mount | Generic dark box | Ribbed hydro-mount cylinder + `pdkTransaxleMountConsole` bracket with flange/arm/holes |
| PDK TCU | Small cover on case top | Distinct ribbed module + bracket + dual connectors, offset **rear-left** (body-side install, WM 5794) |
| Drain plug | Centre under pan | Offset on pan face (WM 5842) |

Bellhousing remains +Z (engine / front-of-car in gen frame). Tail / end cover / rear mount remain −Z.

## Tier B coverage

- All PRIMARY `node` names from `public/models/components/trans-parts.json` preserved (including `gearCase`, `pdkOilPan`, `pdkValveBody`, `mechatronic`, `pdkTcu`, `rearMount`, drain/fill plugs).
- Sub nodes emitted where useful: `pdkTransaxleMountConsole`, `pdkSeal1`, `drainPlugSeal`, `pdkSumpBolt_*` (visual).
- **Did not** run `gen:components` / `verify-coverage` (parent owns regen).

## Tier C internals

Left largely as-is (shafts, gears, synchros, clutch pack). No cutaway pass this wave.

## Tier D flows/hotspots

Unchanged. `meta.hotspot3d` still `0 0 -1.4`. No `flow-systems.ts` / `xray-assemblies.ts` edits.

## Left unchanged / risks

- Cabin selector + shift paddles remain schematic “pin” props near the case (not true cabin geometry).
- TCU is offset beside the GLB for readability; real install is in the LH rear luggage compartment on the body, not bolted to the casting.
- Procedural mesh ≠ OEM CAD; stepped cases + ribs approximate WM silhouette only.
- Parent must run `npm run gen:components` then `verify-coverage` for `trans`.
