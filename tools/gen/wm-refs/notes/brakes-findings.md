# Brakes — 981 WM findings (Tier A)

## Sources (pages / Fig titles)

| Ref | Fig / topic |
| --- | --- |
| `981/brakes/caliper-pads-3111.png` | Fig 2: Locating Brake Calliper Fastening Screws — fixed multi-piston caliper, 2 bolts, ribbed body, pad windows, cross-drilled vented disc |
| `981/brakes/caliper-pads-3112.png` | Fig 3: Pressing Back Brake Pads — bridge window, pad edges, crossover tube |
| `981/brakes/disc-perforations-3159.png` | Fig 1: Identifying Brake Disc Friction Surface Bores — **curved** perforation columns |
| `981/brakes/parking-brake-3199.png` … `3203.png` | Parking-brake shoes, adjuster star wheel, springs, EPB actuator |
| `notes/brakes-pages.txt` | Pad R&I, 85 Nm caliper screws, EPB plug notes |

## Tier A silhouette (before → after)

### Shared `makeBrake` (`frontBrake.mjs` → also `rearBrake.mjs`)

| Area | Before | After (WM-driven) |
| --- | --- | --- |
| Disc | Single solid cyl + 16 holes on one ring | **Vented** twin faces + radial vanes; **curved drill pattern** (5 arc-biased rows × 8 holes, WM 3159) |
| Hat | Simple bell | Slightly deeper hat (room for drum-in-hat shoes on rear) |
| Caliper | Two boxes + flat bridge | Ribbed outer/inner housings, bridge with **two pad windows**, pad edges + retainer in window, crossover tube, **mount ears + 2 bolts** (WM 3111 arrows) |
| Pads | Flat boxes | Backing-plate tops visible at window; rear still pins `rearBrakePads` |
| EPB (rear) | Motor can on caliper back | Motor + housing + plug stub; plus **shoe crescents + adjuster + spring** under hat (`epbShoe*` / `epbSpring*` sub nodes) |

### Front vs rear sizing (unchanged contract)

- Front: `discR=1.0`, `discT=0.16`, 4 pistons, `FRONT_NODES`
- Rear: `discR=0.85`, `discT=0.13`, 4 pistons, `REAR_NODES` + parking-shoe sub names

## Tier B coverage

- PRIMARY nodes in `fbrakes-parts.json` / `rbrakes-parts.json` **preserved** (rotors, calipers, pads, EPB actuators, sensors, ABS, lines, reservoir, master/booster on front).
- Rotor remains at **origin** of the brake GLB for bilateral `lateralOffset` placement.
- Parent should run `npm run gen:components` + `verify-coverage.mjs` (not run in this pass).

## Tier C / D

- No hydraulic cutaways; no flow/hotspot edits (bilateral axle placement already correct).

## Left unchanged / risks

- © Porsche PNGs not committed.
- Curved drills are cosmetic cylinders (not true CSG holes) — read as perforations at garage scale.
- Caliper “windows” are recessed dark panels, not boolean cutouts.
- Parking shoes are a silhouette hint inside the hat; not a full serviceable drum assembly.
