# Air side (intake + exhaust) — 987 WM findings

Scope: `airfilter` + `exhaust` assemblies, 987 generation (987.2 / 2009 Service
Introduction flavoured). Forked the 981 delegates into real 987 builders.

## Sources (pages / figures)

All from "Service Introduction for 2009 models"
(`tools/gen/wm-refs/987/fuel-intake-exhaust/p-0NN.png`, doc page ≈ PDF page − 7;
full text `tools/gen/wm-refs/987/service-intro.txt`):

- **p-057 (doc 51)** — "Intake air side, air routing": air cleaner carried over
  from previous models (= 987.1), SINGLE housing in the engine compartment
  (fig 2_46_09); Helmholtz resonator (H) opening at the air-cleaner output
  modified on Boxster models only. Fig 2_47_09: resonance intake system —
  centre part between the manifolds; formerly separate resonance tube +
  distribution pipe combined into ONE oval housing for 2009.
- **p-058 (doc 52)** — fig 2_48_09 legend: 1 electronic accelerator (single
  central throttle), 2 distribution-pipe flap, 2A/3A switching valves,
  2B/3B diaphragm cells, 3 tuning flap. 3.4 DFI: distribution flap opens
  > 3,800 rpm, tuning flap > 5,300 rpm. Intake manifolds redesigned with
  integrated resonance chamber + lateral acoustic chambers.
- **p-059 (doc 53)** — "Exhaust system, emission control", fig 2_50_09 (full
  3.4 system): manifolds → integrated cats → connecting pipes → two large rear
  silencers; "the two connecting pipes between the main silencers … mix the
  exhaust gases from cylinder banks 1 and 2 before they escape from the
  tailpipes".
- **p-060 (doc 54)** — fig 2_51_09 legend: 1 manifold, 2 LSU 4.9, 3 first cat,
  4 LSF, 5 second cat. 987.2 concept: ONE larger main cat with TWO monoliths
  integrated into the manifold per bank — replacing the 987.1 layout (pre-cats
  in manifolds + main cats inside the rear silencers). Rear mufflers: cats
  removed, internals redesigned.
- **p-061 (doc 55)** — S tailpipes: brushed stainless twin tailpipe, now a true
  twin-pipe system with two separate pipe connections (previous models fed the
  twin-branch tip from one central pipe).
- **p-063 (doc 57)** — fig 2_55_09: 2.9 MPI engine + full exhaust; best view of
  the DIAGONAL rear silencer attitude (front-outboard inlet → rear-inboard
  outlet) and the corrugated decoupling sections ahead of the silencer inlets.
- **p-064 (doc 58)** — ME 7.8.2: hot-film MAF-7 (single), LSU 4.9 worldwide,
  LSF 4.2 behind the cat.
- **p-066 (doc 60)** — 2.9 exhaust identical to S except tailpipe: single
  enlarged oval tip (fig 2_59/2_60/2_61_09).
- Packaging: `temp/987_material_1/2009-987-S-engine.jpg` (single left-side air
  cleaner with elbow snorkel, corrugated intake tube to central throttle,
  diagonal silencers, centre tips), `2006-Cayman-S-cutaway_0.jpg`.

## Tier A silhouette (before → after)

### airfilter (car-space module, `carSpace: true`)
- **Before (981 layout):** dual quarter scoops, dual elongated air-cleaner
  housings (±1.05 → ±0.42), cylindrical cartridges, 2× MAF, two
  airbox→throttle ducts.
- **After (987):** ONE air cleaner housing on the driver (left) side
  (−0.66, 0.44, −0.72) with inlet elbow from the driver-side quarter scoop
  (−1.05, 0.32, −0.5); flat panel filter element; Helmholtz resonator on the
  housing output; single MAF-7 at the outlet; one corrugated intake tube (with
  rib rings) to a single central throttle (0, 0.45, −0.62); NEW oval
  `distributionPipe` housing (twin-flow partition + distribution flap +
  resonance tube + tuning flap, scale-y 0.72 oval) between the manifolds;
  manifolds gain a resonance-chamber cap (987.2 redesign). Flap actuation
  modelled as 2× diaphragm cell + switching valve under the distribution pipe.
- **Removed geometry:** right-side scoop/housing/duct chain, second MAF,
  `throttleBodyBank2` stub, second airbox duct.

### exhaust (native gen space, headers ±1.85)
- **Before (981 layout):** close-coupled cats at ±0.85/−1.7, underfloor
  secondary cats at −2.25, X-pipe + centre resonator at −2.55, TRANSVERSE
  corner silencers (±1.7, −1.25, −3.65, yaw ∓0.32), centre clamping sleeve,
  T-shaped shared tailpipe cover.
- **After (987.2):** integrated manifold cats — first monolith at
  (±0.9, −0.82, −1.3) directly on the collector, second monolith
  (`secondaryCat`) in series at (±0.84, −1.0, −1.72); LSU 4.9 ahead of the
  first, LSF between monoliths; connecting pipe sweeps outboard-rear with a
  corrugated decoupling section (`flexPipe_*`) ahead of the silencer inlet;
  DIAGONAL rear silencers (centre ±1.02, −1.22, −3.45, yaw ∓0.76 rad, len
  1.35, rounded bands + domed ends) running front-outboard → rear-inboard;
  `midPipe` re-purposed as the TWO crossover pipes between the silencers;
  `resonator` re-purposed as the centre mixing chamber / tailpipe connection;
  twin centre tips (±0.15) with separate pipe connections (S-style; base 2.9 =
  single oval tip, noted in labels); PSE valve + actuator kept (option on 987)
  moved to the silencer outlet region; silencer holder bridge + hangers +
  heat shields repositioned to the new can layout.
- **Removed geometry:** underfloor secondary cat canisters, X-pipe legs +
  centre resonator canister at z −2.55, shared T tailpipe cover base/neck.

## Tier B coverage

`node tools/gen/build-components.mjs --gen 987 --only airfilter,exhaust` then
`node tools/gen/verify-coverage.mjs --gen 987`:

- **airfilter: 14/14 primary = 100 %** (was 15 primaries as a 981 copy; see
  parts changes below)
- **exhaust: 21/21 primary = 100 %**

## Parts manifest changes

`public/models/components/987/airfilter-parts.json`:
- Deleted `eng-intake-012` (`airboxToThrottleBodyDuctBank2`) and
  `eng-intake-014` (`throttleBodyBank2`) — the 987 has ONE intake tube and ONE
  central throttle; these parts genuinely don't exist.
- Added `air-987-new-001` `distributionPipe` (primary) — twin-flow distribution
  pipe & resonance tube (combined single housing for 2009), plus subs
  `air-987-new-003` `distributionPipeFlap` and `air-987-new-004` `tuningFlap`,
  and `air-987-new-002` `helmholtzResonator` (sub of the airbox).
- All labels/functions rewritten to 987 wording (single housing, MAF-7, flap
  rpm thresholds, 987.1 vs 987.2 notes). All part numbers set to **null** —
  none were verifiable from `lib/data-987.ts` or the SI (the seeded 981.*/9A1.*
  numbers were 981-catalog values).

`public/models/components/987/exhaust-parts.json`:
- Node set unchanged; meanings recalibrated: `cat_*` = manifold-integrated main
  cat (first monolith), `secondaryCat` = second monolith in series (NOT an
  underfloor cat), `midPipe` = silencer crossover pipes, `resonator` = centre
  mixing chamber / tailpipe connection, `flexPipe_*` = decoupling element in
  the connecting pipe, `postCatO2Sensor_*` = LSF between the monoliths.
- Labels/functions rewritten (987.2 concept + 987.1 contrast, LSU 4.9 / LSF,
  S twin-pipe vs base single oval tip, PSE as option, 23 Nm clamp/hanger
  torques from `lib/data-987.ts`). Part numbers nulled except
  `987.111.220.00` (exhaust clamping sleeve — 987-prefixed factory number).

## Tier D flows (`components/garage/flow-systems-987.ts`)

- `intake`: replaced the dual-scoop mirror paths with (1) driver-side scoop →
  air cleaner → MAF → intake tube → central throttle → distribution pipe →
  Bank 2 manifold, and (2) a distribution-pipe branch → Bank 1 manifold.
  Desc/labelAt updated (single air cleaner, twin-flow distribution pipe).
- `exhaust-flow`: same 2-run topology but recalibrated — starts higher/further
  forward (cats integrated at the manifolds, z −1.45 vs −1.62), wider outboard
  sweep (±0.42) into the diagonal silencers, longer inboard diagonal to the
  centre mix point before the tips. Desc rewritten (987.2 integrated cats,
  crossover mixing, S twin / base single tips).

## Left unchanged / risks

- **Header runner geometry** kept from the 981 (SI says "nearly equal pipe
  lengths largely correspond to the new 911 Carrera" — same character).
- **Flex/decoupling elements**: SI text never names them explicitly; the
  corrugated sections are read from figs 2_50_09/2_55_09. Labelled
  conservatively ("decoupling element").
- **S vs base**: modelled as the S twin-tip system; base 2.9 single oval tip is
  covered in label text only (one GLB per generation).
- **987.1 differences** are text-only (manifest functions); geometry is 987.2.
- **Layout pass concerns (parent owns `xray-assemblies-987.ts`):**
  - Exhaust native envelope is slightly SHORTER in z than the 981 build
    (silencer centres moved −3.65 → −3.45, tips −4.23 → −4.3, cats pulled
    forward to −1.3): current `hotspot3d: '0 -0.55 -1.85'` /
    `displayRadius 0.93` should still frame it, but the visual mass moved
    forward/up (integrated cats) — a hotspot nearer `0 -0.6 -1.7` may frame
    better.
  - Airfilter is `carSpace: true, worldScale 1` and now ASYMMETRIC (left-side
    housing, x −1.05…+0.36): a centred hotspot `0 0 0` still works, but if the
    camera auto-frames on the hotspot the housing sits left of centre —
    consider hotspot near `-0.2 0.35 -0.68` if framing looks off.
- Coverage tool run shows other agents' rows (e.g. `susp` 94 %) mid-flight;
  only airfilter/exhaust were owned + verified here.
