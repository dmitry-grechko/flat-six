# Drivetrain (PDK / oil / plugs / engine text) — 987 WM findings

Scope: `trans`, `oil`, `plugs` assemblies (+ engine parts-JSON text only —
the 9A1 GLB is a real mesh copy and is never rebuilt). 987 generation
(987.2 / 2009 Service Introduction flavoured).

## Sources (pages / figures)

All from "Service Introduction for 2009 models"
(`tools/gen/wm-refs/987/service-intro.txt`, PNGs under `987/pdk/` and
`987/engine/` / `987/fuel-intake-exhaust/`):

- **Oil** `987/engine/` (doc ~p19–22): 5 oil pumps (4 extraction + 1
  demand-controlled pressure), filter accessed from beneath on mid-engine
  cars, pressure sensor on top of the filter console, watertight sheet-metal
  panel between crankcase and oil pan, two-stage oil mist separator.
- **DFI / ignition** `987/fuel-intake-exhaust/` (doc ~p39–50): rod-type coils,
  surface-gap plugs, 3-piston HP pump on bank 1 exhaust cam, rails at
  40–120 bar, rail-pressure sensor on bank 2, in-tank regulator ~5.0 bar.
- **PDK** `987/pdk/` (doc ~p66–102): CG2.00 / CG2.20 7-speed dual clutch;
  dual-mass flywheel into the clutches; parking lock on the pinion shaft;
  TCU in the rear-right luggage compartment; plate-stack oil/water cooler for
  clutch/hydraulic oil; sensors and 16-valve hydraulic control in the pan.

## Tier A silhouette (before → after)

### oil (forked `987/oilSystem.mjs`)
- Demand-controlled pressure pump + shared shaft with four head-extraction
  stages; control valve on the pump face.
- Filter console: cartridge access from beneath; pressure sensor relocated
  to the top of the conducting housing (981 had it on the side).
- Thin watertight panel between sump halves; mist separator = pre + fine.

### plugs (forked `987/ignitionFuel.mjs`)
- Coils: blocky L-shaped 981 modules → slim rod-type modules with ribbed
  seal collar into the plug recess.
- Plugs: surface-gap with four ground electrodes around the insulator.
- HP pump: three-piston axial unit on bank 1 head with MS / PCV / TK /
  strainer detail; HP feed + cross-bank connecting line; DS on bank 2 rail.
- Low-pressure regulator moved to the tank area (returnless ~5.0 bar).

### trans (forked `987/transaxle.mjs`)
- Same ZF 7DT family packaging as the 981, with 987.2-specific tells:
  - TCU mirrored to the **right** rear luggage area (SI doc p102).
  - Dual-mass flywheel modelled at the engine face (`pdkTorsionalDamper`
    node name kept).
  - NEW primary `pdkParkingLock` catch on the pinion-shaft parking gear.
  - Plate-stack oil cooler near the bell housing (clutch/hydraulic oil only).
  - Inboard speed sensors + distance-sensor tower on the selector rods;
    second solenoid row on the valve body; reverse idler disc in the gear set.

### engine
- Real 9A1 GLB retained (shared family with 981). Parts-JSON text updated
  for 987.2 / 987.1 wording where the prior session seeded it; geometry
  untouched.

## Tier B coverage

`node tools/gen/verify-coverage.mjs --gen 987` — owned rows **100%**:

| assembly | primary | matched |
|---|---|---|
| engine | 72 | 72 |
| oil | 11 | 11 |
| plugs | 10 | 10 |
| trans | 34 | 34 |

## Tier C internals

- PDK: parking lock, dual-mass flywheel, reverse idler, valve-body solenoid
  row, sensor towers.
- Oil: five-pump stack + mist separator stages.
- Plugs: rod coil internals + HP pump valve cluster (as far as procedural
  CSG allows).

## Tier D flows / hotspots

- Oil circuit description corrected (filter from beneath, sensor on top).
- Placement seeded from 981; `npm run gen:layout -- --gen 987` reports
  0 errors after this wave.

## Left unchanged / risks

- 987.1 Tiptronic / manual gearboxes are text-only notes — geometry is the
  987.2 PDK installation.
- 2.9 MPI vs 3.4 DFI: plugs GLB shows the DFI rail/pump layout; MPI is
  called out in part text only.
- Engine mesh is the shared 9A1 download — not a procedural WM rebuild.
