# Engine geometry findings — MA1 / WM refs

Sources under `tools/gen/wm-refs/engine/`:

| Ref | Figure | Used for |
|-----|--------|----------|
| `crank-chains-3640.png` | Fig 18 crank + timing chains | Flat-plane crank webs, main/rod journals, front sprocket nose |
| `crank-chains-3653.png` | Fig 10 oil pump gear / chains | Primary (lower) vs secondary (up to cams) chain split |
| `piston-rod-3740.png` | Fig 1 con-rod/piston | 97 mm DFI dish crown, 3 rings, I-beam rod, shells, cap, bolts |
| `cams-valvetrain-3871.png` | Fig 1 head/cams | Dual cams, individual + front bridge bearing saddles |
| `cams-valvetrain-3872.png` | Fig 2 cam components | Intake **camshaft controller** (phaser) vs thinner exhaust sprocket |
| `solenoids-tappets-3911.png` | Fig 1 hydraulic valves | Cam-control solenoids on **TOP** of head; lift actuators on **SIDE** |
| `solenoids-tappets-3931.png` | Fig 2 bucket/switching | Larger switching tappets (intake) + smaller buckets (exhaust) |
| `belt-side-3597.png` | Fig 2 belt side | Accessory layout context (existing pulley set retained) |

## Bank mapping

- **Bank 1** = driver / right = **+X** = `cylHead_R` / `cylinderHeadBank1` / `*B1*`
- **Bank 2** = passenger / left = **-X** = `cylHead_L` / `cylinderHeadBank2` / `*B2*`

## Geometry changes (`tools/gen/components/engine.mjs`)

### Rotating / structure
1. **Crankshaft** — Enriched under `crankshaftForged` (nested in `crankshaft`): 7 main journals, flat-sided counterweight webs, paired rod journals, front sprocket nose, rear flange.
2. **Main bearing caps** — `mainBearingCaps` along crank axis.
3. **Pistons** — Dish crown + 3 ring grooves; `pistonsDfi` alias group; `pistonRings` sub.
4. **Con rods** — I-beam flanges, big-end cap, shells, bolts; `connectingRods` + `conRodBearings`.
5. **IMS** — `intermediateShaft` parallel to crank with sprocket + `imsBearing`.
6. **Flex plate** — Thin `flexPlate` disc aft of flywheel.
7. **Aliases** — `engineBlock`, `oilPanSump`, `cylinderHeadBank1/2`, `headGaskets`.

### Valvetrain / timing
1. Per-bank cams: `intakeCamBank1/2`, `exhaustCamBank1/2` (legacy `camshaft_intake` / `camshaft_exhaust` kept).
2. **Cam phasers** on intake fronts; simpler exhaust sprockets (`camPhasers`).
3. **Cam bearing caps** + front bridge saddles.
4. **Valves / springs / tappets** — representative 2× intake + 2× exhaust per cylinder; switching vs bucket sizes.
5. **Solenoids** — `vanosSolenoidB*Intake/Exhaust` on head tops; `variocamLiftActuators` on head sides.
6. Timing split: `primaryTimingChain`, `secondaryTimingChains`, `chainTensioners`, `chainGuides`, `timingChainCovers` (parent `timingChain` retained).

### Sensors / fuel / misc
CKP, HPFP (+ fuel line/sensor/regulator subs), port injectors, DME, TPS, ECT, APP stub, harness looms, oil heat exchanger, knock ×2, lambda ×4, MAP on plenum, EGT ×2, plus remaining sub nodes (air filter, sump baffle/gasket, seals, head bolts, cover gaskets, etc.).

## Coverage

- Before: engine **26/72 primary (36%)**
- After: engine **72/72 primary (100%)**
- `npm run gen:components` succeeds; `verify-coverage.mjs` all assemblies 100%.

## Contract / process

- PRIMARY node names from `engine-parts.json` unchanged (geometry nodes added to match).
- Did **not** commit.
