# Worked examples

## Example A — Engine internals + coverage (981)

**Ask:** Improve engine detail (crank, chains, solenoids) from the service manual.

**Done:**

1. Indexed WM ch. 10/13/15; extracted crank/cams/solenoid pages → `tools/gen/wm-refs/engine/`
2. Coverage was 26/72 (36%); patched `engine.mjs` to add all PRIMARY nodes
3. Tier C: richer crank, DFI pistons, I-beam rods, IMS, split chains, VarioCam solenoids (top) + lift (side)
4. `verify-coverage` → engine 100%; findings in `tools/gen/wm-refs/notes/engine-findings.md`

**Lesson:** Parts JSON can outpace geometry — always run coverage before claiming “complete.”

## Example B — Intake routing correction (981)

**Ask:** Use WM CAD so intake matches factory.

**Done:**

1. WM 242519 + 244601 showed **dual** air cleaner housings → **singular** throttle
2. Fixed incorrect “left scoop only” flow copy and paths
3. Reshaped housings: rectangular scoop → filter box → circular neck + clamp
4. Updated `airfilter` hotspot toward center

**Lesson:** Flow-layer text can contradict gen geometry — fix both.

## Example C — Exhaust outer form (981)

**Ask:** Match rear silencer exploded view.

**Done:** Rounded-rect cans, holder bridge, center clamping sleeve, T-shaped twin tip cover (WM 263319 Fig 1).

**Lesson:** Exploded views are gold for Tier A packaging.

## Example D — New generation bootstrap (987, future)

**Ask:** We have `987-workshop-manual.pdf`; start 3D calibration.

**Plan:**

1. `pdftotext` → `/tmp/wm-987.txt`; run `find-figs.py --gen 987`
2. Fill catalog page ranges for wave 1 (cooling / intake / exhaust)
3. Extract under `tools/gen/wm-refs/987/…`
4. Diff packaging vs 981; fork or parameterize gen modules
5. Emit `987/` GLBs when shapes diverge; wire assemblies by garage generation
6. Run skill assembly-by-assembly to 100% coverage
