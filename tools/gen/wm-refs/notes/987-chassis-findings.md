# 987 chassis-side — WM findings (cooling, susp, brakes, elec, driveline, fuel)

Calibration pass for the 987 X-ray bootstrap (987.2 / 2009 Service Introduction
flavoured, with 987.1 differences noted in part text). Owned assemblies:
`cooling, susp, fbrakes, rbrakes, elec, driveline, fuel`.

## Sources (pages / figures)

All doc pages are from "Service Introduction for 2009 models"
(`tools/gen/wm-refs/987/service-intro.txt`, PNGs at PDF page = doc page + 6/7).

- **Chassis** `987/chassis/p-113..118.png` (doc p108–111):
  - p108 / fig 4_29_09 — front axle: "strut suspension with trailing link and
    wishbone"; PASM optional, −10 mm; adapted rear ARBs with mech. diff lock.
  - p109 — spring strut = double-tube gas-filled shock + coil, colour-coded
    springs; front ARB table (24.0×3.8 basis / 24.5×3.8 PASM); steering
    "adopted from the previous models", variable ratio (i.e. hydraulic; a
    modified gear with enhanced power assistance mid-MY).
  - p110 / fig 4_30_09 — **rear axle is "McPherson"**, essentially carried over;
    new rebound stop springs + foam spring pads; spring-rate tables (33–46 N/mm).
  - p111 — rear ARB tables (17.2×2.5 … 19.6×2.6 mm); PASM description.
- **Brakes** `987/chassis/p-125.png` (doc p119, figs 4_21_09/4_28_09/4_22_09):
  - 987.2 front = **318×28 mm on ALL models** (base moved up from 987.1's
    298×24); rear 299×20 base / 299×24 S; cross-drilled involute-vented discs;
    black calipers on 2.9 base, red on S, yellow PCCB; booster i=5.0 (steel) /
    i=4.5 (PCCB).
  - p-126/127 (doc p120–121) — PSM: 4-ch ABS, ABD, ASR, MSR, EBD + 987.2
    enhanced longitudinal control (brake pre-filling, brake assist, drive-off
    assistant).
- **Cooling** `987/engine/p-029..030.png` (doc p23–24, fig 1_44_09/1_45_09):
  9A1 coolant pump = external belt-driven module on cylinder bank 1–3, max
  flow +20%; revamped head cooling ducts.
- **Fuel** `987/fuel-intake-exhaust/p-045..047.png` (doc p39–41, fig 2_08_09):
  tank ≈ 64 l incl. ≈10 l reserve; returnless; in-tank pump + sucking-jet pump
  + **lifetime filter** + ≈5.0 bar regulator (987.1 MPI ≈4 bar); demand-controlled
  pump voltage (DFI); low-pressure line to the HP pump on bank 1.
- Packaging: `temp/987_material_1/2006-Cayman-S-cutaway_0.jpg` (+ Boxster S
  cutaway) — corner radiators, frunk battery area, mid-engine accessory face,
  rear struts. Verified service facts: `lib/data-987.ts` (CHF 11S hydraulic
  steering + front reservoir, drum-in-hat park brake, frunk battery, ~64 l tank).

## Tier A silhouette (before → after)

- **susp** (forked `tools/gen/components/987/suspension.mjs`):
  - `steeringRack` was a bare tube (EPAS-era) → now a group: rack tube +
    rotary-valve/pinion housing (driver side, x=0.38) + pressure/return
    fittings + power-cylinder sleeve. Node name `steeringRack` preserved.
  - **Added hydraulic steering hardware (new nodes)**: `psPump` (belt-driven
    vane pump + pulley on the engine accessory face), `psReservoir` (CHF 11S
    tank, front trunk driver side), `psLines` (pressure / return / suction
    runs along the right sill).
  - Front/rear geometry otherwise unchanged — the 981 builder's front
    strut+wishbone+trailing-link and rear strut+links already match figs
    4_29_09 / 4_30_09.
- **fbrakes/rbrakes** (forked `987/frontBrake.mjs` + `987/rearBrake.mjs`):
  - Removed the 981's **EPB motor-on-caliper** geometry. The 987 park brake is
    cable-operated drum-in-hat: `epbActuator*` nodes (names kept — app pin
    contract) now draw a mechanical expander + lever + Bowden cable exiting
    inboard, plus the existing drum shoes/springs.
  - Rear rotor proportions corrected: discR 0.85 → **0.94** of front
    (299 mm vs 318 mm), discT 0.13 → 0.14 (24 mm S rear vs 28 mm front).
  - Front disc kept at discR 1.0 / discT 0.16 (318×28 reads correctly).
- **cooling / elec / driveline / fuel**: still delegate to the 981 builders —
  verified the packaging matches (twin angled corner radiators + condenser +
  optional centre rad + engine-bay expansion tank; frunk battery + driver-side
  fuse panel; transaxle half-shafts; front ~64 l tank). Delegate comments now
  record what was verified.

## Tier B coverage (before → after)

`node tools/gen/verify-coverage.mjs --gen 987` — all 7 owned rows **100%**:

| assembly | primary | matched |
|---|---|---|
| cooling | 15 | 15 |
| fbrakes | 9 | 9 |
| rbrakes | 12 | 12 |
| susp | 34 → **36** (added psPump, psReservoir; psLines is sub) | 36 |
| elec | 10 | 10 |
| driveline | 10 | 10 |
| fuel | 9 | 9 |

Hide-list contract nodes confirmed present: `brakeMasterCylinder`,
`brakeBooster`, `absHydraulicControlUnit` (fbrakes); `absPsmHydraulicUnit`,
`brakeFluidReservoir` (rbrakes).

## Tier C internals

- Drum-in-hat shoes + adjuster star kept (now actuated by cable expander).
- No other internals changed.

## Parts-JSON text pass (987-correct wording)

- **susp**: steering relabelled hydraulic (CHF 11S, variable ratio, belt pump,
  front reservoir; explicitly "unlike the 981's EPAS"); rear relabelled from
  "five-link / multi-link" to **McPherson rear axle links** (lateral/toe/upper
  + trailing arm); ARB sizes + spring-rate ranges from the SI tables; 3 new
  entries SUSP-STEER-005/006/007 (psPump / psReservoir / psLines).
- **fbrakes**: 318×28 all-987.2 (987.1 base 298×24 noted); monobloc 4-piston;
  caliper colours by model; booster i=5.0/i=4.5; PSM enhanced functions.
- **rbrakes**: 299×20 base / 299×24 S; `epbActuator*` relabelled "Parking
  Brake Expander & Cable" (cable-operated, **no EPB motor** — 981 feature);
  shoes/springs relabelled accordingly.
- **cooling**: external belt-driven 9A1 pump (+20% flow), plain wax thermostat
  (map-controlled arrived with the 981), engine-compartment expansion tank
  (vs 996 trunk tank), centre radiator = optional third rad (hot climate /
  automatic), PDK cooler = 987.2 PDK only (987.1 Tiptronic has its own ATF
  circuit), debris-trap corrosion note.
- **elec**: Group-48/H6 battery under frunk floor, driver-footwell fuse panel,
  Sport button on console (not the 991-era wheel dial), 987.2 PSM extras.
- **driveline**: PDK (987.2) / Tiptronic S + manual (987.1) wording; optional
  mech. diff lock; CV boot inspection note.
- **fuel**: 64 l / 10 l reserve; returnless ≈5.0 bar (DFI) vs ≈4 bar (MPI);
  lifetime in-tank filter + sucking-jet pump; low-pressure feed to the bank-1
  HP pump (engine-side scope referenced only).
- **Part numbers**: all 981.*/991.* (and other non-verifiable gen-specific)
  numbers nulled. Kept only cross-model hardware/consumables carried from the
  981 files that are era-plausible standard parts (000.043.210.82 DOT4,
  999.067.053.09, 900.269.047.01, 997.352.919.00, 930.351.927.00,
  996.351.915.00, 996.106.447.04, 999.926.030.01). 9A1 engine-side numbers
  were dropped too (couldn't verify exact 987.2 variants from the SI).

## Tier D flows/hotspots — NOT edited (parent-owned), report only

- `psPump` sits at car-space ≈ **(0.58, 0.02, −1.00)** (pulley plane z≈−0.90,
  rear face z≈−1.10) — on the engine accessory face next to the alternator.
- `psReservoir` at ≈ **(0.55, 0.30, 1.32)** (frunk, driver side, forward of the
  master cylinder at ~(0.35, 0.33, 1.15), above/forward of the fuse box).
- `psLines` run along the RIGHT sill at x≈0.6, y≈−0.3: pressure pump→rack ends
  at ≈(0.45, −0.19, 1.36); return rack→reservoir; suction reservoir→pump.
  If a power-steering flow system is added, these are the endpoints to tube.
- Suspension hotspot/displayRadius unchanged; the new PS bits extend the susp
  envelope rearwards to z≈−1.1 (previously rear axle only, z≈−1.58, so still
  inside) and add small volume in the frunk — no radius concern expected.
- rbrakes: the park-brake cable extends inboard to x≈−0.75 in component space —
  slightly wider than the old EPB motor; check the rbrakes displayRadius if
  pins look tight.

## Left unchanged / risks

- Rear suspension **geometry** still uses the 981 link arrangement; fig
  4_30_09 shows a very similar strut+links silhouette so only labels changed.
  If a future pass wants exact 987 arms, use fig 4_30_09.
- The SI has no dedicated front-radiator layout figure; twin-corner-radiator
  placement was confirmed from the cutaways + lib/data-987.ts, not a WM CAD fig.
- `waterPumpElectric` (auxiliary pump) kept as a primary node; its existence on
  the 987 is asserted generically (after-run/heater support) — low confidence,
  text kept vague.
- Caliper GLB material stays red (S flavour); base cars are black anodized —
  noted in text only, since the palette is per-mesh baked.
- 987.1-specific geometry (M96/M97 integrated pump, 298 mm front discs) is
  text-only; the models are 987.2-flavoured per scope.
