# Missing major parts — gap fill (981)

Audit of WM chapters vs X-RAY assemblies (2026-07-09).

## Already present (not missing)

| User example | Where |
| --- | --- |
| Control arms / wishbones | `susp` — `frontLowerControlArm*`, `rearControlArmSet*` |
| Steering rack / tie rods | `susp` — `steeringRack`, `tieRod*`, `steeringColumn` |
| Half-shaft tubes (visual only) | Were unnamed meshes under `driveline` |

## Gaps filled this pass

| Part | WM source | Implementation |
| --- | --- | --- |
| Rear drive shafts (selectable) | 422119 / Fig 5465 flange+bolts+bellows | `rearDriveShaftLeft/Right` in driveline |
| Inner/outer CV joints + bellows | Fig 5473 CV joint | `innerCVJoints`, `outerCVJoints`, `cvBellows` |
| Differential / halfshaft flanges | 39 / Fig 5925 | `differential` group |
| Fuel tank + pan/straps/sender/pump/canister/filler/lines | Overview ~4310 | **New** `fuel` assembly |
| Front trailing arms + wheel carriers | 401719 / Fig 3266–3267 | `frontTrailingArm*`, `frontWheelCarrier*` |
| Rear trailing arms + wheel carriers | 42 / drive-shaft R&I | `rearTrailingArm*`, `rearWheelCarrier*` |

## Still optional / lower priority

| Part | Notes |
| --- | --- |
| HVAC heater box / A/C lines | Ch. 80–87 — cabin packaging, less critical for under-car X-RAY |
| Manual clutch pedal hardware | PDK cars dominate; ch. 30 |
| Full wiring loom detail | `elec` has modules; harness is schematic in flows |
| Wheels/tires | Intentionally omitted (rotors/hubs only) |

## Verify

`npm run gen:components && npm run gen:verify && npm run gen:layout`
