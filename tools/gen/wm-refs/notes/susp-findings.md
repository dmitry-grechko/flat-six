# Suspension — 981 WM findings (Tier A)

## Sources (pages / Fig titles)

| Ref | Fig / topic |
| --- | --- |
| `981/susp/front-strut-3339.png` | Fig 1: Overview Of Front Spring Strut (exploded + assembled) |
| `981/susp/rear-strut-5542.png` | Fig 1: Overview Of Rear Spring Strut (exploded) |
| `981/susp/wheel-bearing-3295.png` … `3304.png` | Wheel bearing fastening / hub unit / press tooling |
| `notes/susp-pages.txt` | Captions + torque notes (M14 lock nut 70 Nm, etc.) |

## Tier A silhouette (before → after)

| Area | Before | After (WM-driven) |
| --- | --- | --- |
| Front strut | Single fat cylinder + separate thin shock | Stack: damper body, lower spring seat flange, upper spring plate, conical bump stop, **triangular 3-ear support mount** + lock nut, corrugated **dust bellows**, PASM wire stub at bottom (`frontStrut*`) |
| Front coil | 5 slim tori | **6 coils**, slightly wider, seated between lower seat and upper plate |
| Front LCA | Single rotated box | **Wishbone** (fwd/aft legs + ball-joint boss + inner bushings) |
| Wheel hub | Slim box knuckle | **4-bolt square flange** + bearing barrel + hub face + stud ring (WM 3301 unit look), still slim vs rotor |
| Rear shock | Plain cylinder | Same strut stack as front (seat, bellows, bump, triangular mount, PASM line) under `rearShockAbsorber*` |
| Rear coil | 5 tori at inboard offset | **5 coils** kept slightly inboard of hub |
| Rear links | Four boxes | Clearer multi-link set: box upper/lower + capsule toe/camber + outer carrier boss |

## Tier B coverage

- PRIMARY node names from `susp-parts.json` **unchanged** (`frontStrut*`, `frontCoilSpring*`, `frontShockAbsorber*`, `frontLowerControlArm*`, `frontWheelHub*`, `rearControlArmSet*`, `rearCoilSpring*`, `rearShockAbsorber*`, `rearWheelHub*`, steering nodes, ARBs, subframes).
- Geometry added as children under those named groups/meshes — no new PRIMARY invents.
- Parent should run `npm run gen:components` + `verify-coverage.mjs` (not run in this pass).

## Tier C / D

- Internals (bearing races, ball joints) not cutaway-modelled.
- **Car-space anchors preserved:** `FRONT_Z/REAR_Z = ±1.58`, `TRACK = 1.1`, `HUB_Y = -0.35` → worldScale 0.95 lands axles at z±1.5 / half-track ≈0.82. No `xray-assemblies` / flow edits.

## Left unchanged / risks

- © Porsche PNGs stay under `tools/gen/wm-refs/` (not committed).
- Strut is still procedural CSG — triangular mount is three lobes + plate, not a scanned casting.
- Hub unit intentionally stays inboard/slim so it does not duplicate `fbrakes`/`rbrakes` rotors at the corner.
