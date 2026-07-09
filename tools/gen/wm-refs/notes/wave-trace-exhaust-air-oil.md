# WM-trace wiring pass — exhaust / air intake / oil system (981)

Wiring `footprint()` / `centerline()` from `tools/gen/wm-refs/981/traces/*.trace.json`
into the existing hand-built gen scripts, per the guidance to only use a trace where
it demonstrably improves the outer silhouette. All PRIMARY contract node names are
unchanged (self-checked against `*-parts.json` — 0 missing in all three assemblies
after these edits; see verification command below).

## `tools/gen/components/exhaust.mjs` — WIRED (indirectly) + rejected direct extrude

- **Trace:** `silencer-4584.trace.json` (WM 263319 Fig 1, "Exploded View Of Rear
  Silencer With Holder And Tailpipe Cover").
- **Finding:** the point order is not a clean convex can outline — there's a
  concave jump back toward the origin around point 9 of 11 — because the source
  figure is an *exploded* view (holder + both cans + tailpipe cover pulled apart).
  Extruding it directly (`extrude()`) would bake that gap/blob into the mesh
  instead of a can.
- **Decision:** kept the hand-built `roundBox` cans (`mufflerBody_R`/`_L`) rather
  than extruding, but **did** use the trace's overall bounding-box aspect ratio
  (`SILENCER_ASPECT ≈ 1.92`, can length:height) to re-derive the can height —
  `mufflerH = mufflerLen / SILENCER_ASPECT ≈ 0.573` (was a flat `0.52`). Ribs and
  end-cap heights now scale off `mufflerH` instead of separate hardcoded numbers.
- **Skipped:** `aircleaner`/`oil-*` traces are not relevant here (different
  assembly); not loaded in this file.
- PRIMARY nodes `muffler_R` / `muffler_L` (and all others) unchanged.

## `tools/gen/components/airIntake.mjs` — WIRED (footprint + centerline)

- **Traces:** `aircleaner-4432.trace.json` (footprint) and
  `aircleaner-4432-cl.trace.json` (centerline), both WM 242519 (air cleaner
  housing).
- **Finding:** both traces agree the housing is not flat top-to-bottom — the
  centerline's y-drop is concentrated in the back half of its run and steepens
  right at the end (mouth→neck), and the footprint's own lowest point sits at
  the neck side, not centred. The previous boxes (`airboxMouth_*` →
  `airboxNeck_*`) all sat at one constant `hy = 0.48`, i.e. a flat run.
- **Wired:** the centerline's own (x, y) samples are normalized into
  `(u, v)` — `u` = progress mouth(0)→neck(1), `v` = normalized droop (0..1) —
  via `ductDroopAt(u)`, then applied as `y = hy - ductDroopAt(u) * DUCT_DROOP`
  to every housing waypoint (`airboxMouth_`, `airboxTransition_`,
  `airboxHousing_`/`airboxLid_`, `airboxTaper_`, `airboxNeck_` + its clamp/
  sleeve/grommets/air guide). This gives each side's housing a real curved
  droop from mouth down to neck instead of a flat shelf.
- **Cascaded (for visual continuity, not renamed):** the per-side neck droop
  (`neckDroopBySide.R` / `.L`) is also applied to `massAirflowSensorsMaf`'s
  per-side y, `intakeAirTemperatureSensors`' per-side y, and the start
  waypoint of `airboxToThrottleBodyDuctBank1` / `airboxToThrottleBodyDuctBank2`
  — so the corrugated duct now visibly climbs from the lowered neck back up to
  the central throttle housing (`TB.y = 0.5`, untouched) instead of starting
  already level with it.
- **Capped, not applied literally:** the footprint's own drop:length ratio
  (~0.64) would put the neck ~0.6-0.8 units below the mouth at gen scale —
  enough to visually detach it from the fixed-position throttle/plenum
  components downstream. `DUCT_DROOP = 0.16` keeps the *shape* (tapered via
  `ductDroopAt`) from the trace while capping the *magnitude* to stay inside
  the housing's own envelope. Footprint is loaded primarily to corroborate the
  droop's existence/direction; the centerline drives the actual shaping.
- Ram-air snorkel / intake-duct-snorkel tubes (mouth end, `u = 0` ⇒ droop = 0)
  are unaffected and left as-is. Central `throttleBody` position untouched.
- PRIMARY nodes (`airFilterBoxAirbox`, `massAirflowSensorsMaf`, `throttleBody`,
  `airboxToThrottleBodyDuctBank1/2`, etc.) unchanged — only coordinates moved.

## `tools/gen/components/oilSystem.mjs` — WIRED (filter only) + rejected cooler

- **Trace wired:** `oil-filter-3984.trace.json` (WM ~3984 Fig 1, spin-on filter
  cover side silhouette: narrow base → wide mid-body → tapering dome).
  `filterCoverDome`'s hand-picked lathe profile (7 hardcoded `[r, y]` points)
  is replaced by `domeProfileFromFootprint()`, which sorts the traced outline
  by height, averages independent left/right samples at similar heights,
  keeps only the widest point and everything above it (the dome — the fluted
  grip ring below is already separately modelled as `filterHousingCap` +
  `filterFlute_*`), then rescales to the same overall height/radius envelope
  the hand model used (`height: 0.45, maxRadius: 0.2, yBase: -0.28`) so it
  still seats flush on `filterHousingShell`/`filterHousingCap` (radius 0.2/
  0.21). Result tapers narrower base→bulge→narrow top instead of the old
  blockier flat-sided profile. Node name `filterCoverDome` unchanged.
- **Trace skipped:** `oil-cooler-4059.trace.json` ("Overview Of Oil Cooler
  Bracket Component"). Per `oil-findings.md`, WM 4059 is itself an
  overview/exploded figure spanning the mist separator + bracket spine +
  cooler + filter boss together — the same "exploded view merges multiple
  parts" problem as the exhaust silencer trace, just less visually obvious
  (the traced polygon is simple/non-self-intersecting, but its bounding
  aspect, ~2.1:1, reflects that whole multi-part overview rather than one
  clean bracket-only envelope). The current hand-built `oilConductingHousing`
  / `oilHeatExchanger` silhouette is already anchored consistently to the
  separator/cooler-pad/filter-boss sub-parts it carries, so it was left as-is
  and the cooler trace was **not loaded** in this file at all (per guidance:
  "load filter footprint only").
- PRIMARY nodes (`oilFilterHousing`, `oilConductingHousing`, `oilHeatExchanger`,
  etc.) and sub-tier contract nodes (`oilFilterHousingORing`, `oilFilterInsert`,
  `oilPressureReliefValve`, `oilFilterSet`) unchanged.

## Verification done this pass

- `node -e "import(...).build()"` smoke-run for all three modules — no
  runtime errors.
- Re-derived `verify-coverage.mjs`'s PRIMARY-node check in-memory (traversing
  each `build()` scene graph instead of a GLB) against
  `exhaust-parts.json` / `airfilter-parts.json` / `oil-parts.json`: **0
  missing PRIMARY nodes** in all three.

## Not done (left for parent)

- Did **not** run `npm run gen:components` (no GLBs regenerated).
- Did **not** commit.
- No edits to `flow-systems.ts` / `xray-assemblies.ts` — waypoints referenced
  there (muffler/tip centres, airbox hotspot, throttle position) were left
  numerically close enough that existing flow paths should still track; worth
  a visual re-check after regen, especially the airbox neck→MAF→duct region
  in `airIntake.mjs` which now dips before climbing back to the throttle.
