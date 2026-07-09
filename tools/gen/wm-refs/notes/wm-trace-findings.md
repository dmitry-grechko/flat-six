# WM CAD silhouette tracing

Date: 2026-07-09

## Pipeline

```bash
# venv once: python3 -m venv /tmp/wm-trace-venv && /tmp/wm-trace-venv/bin/pip install pillow numpy opencv-python-headless

/tmp/wm-trace-venv/bin/python tools/gen/wm-refs/trace-silhouette.py \
  --image tools/gen/wm-refs/981/engine/oil-pan-4035.png \
  --mode footprint --name OIL_PAN_FOOTPRINT --width 2.4 \
  --out tools/gen/wm-refs/981/traces/oil-pan-4035.trace.json

/tmp/wm-trace-venv/bin/python tools/gen/wm-refs/trace-silhouette.py \
  --image tools/gen/wm-refs/981/cooling/coolant-hoses-3537.png \
  --mode centerline --name COOLANT_HOSE_S_BEND --length 1.5 --plane xy --samples 10 \
  --out tools/gen/wm-refs/981/traces/coolant-hoses-3537.trace.json
```

- Blue CAD highlight → mask → contour / medial centerline
- JSON under `tools/gen/wm-refs/<gen>/traces/` (commit JSON; PNGs stay gitignored)
- Gen loads via `tools/gen/lib/wm-traces.mjs` → `extrude()` / `tube()`

## Wired this pass

| Trace | Used in |
| --- | --- |
| `oil-pan-4035.trace.json` | `engine.mjs` oil pan extrude |
| `atf-pan-5842.trace.json` | `transaxle.mjs` PDK ATF pan extrude |
| `coolant-hoses-3537.trace.json` | `coolingRadiator.mjs` + `engine.mjs` S-bend hoses |

## QA

- Debug overlays (`*-debug.png`) show green outline + red vertices on blue CAD — pans look correct.
- Hose centerline follows the elongated single-hose blob (not the dual-hose zigzag).
- Coverage 100%; layout 0 errors after regen.

## Next candidates

- Exhaust silencer / tip footprints
- Radiator core + side-tank outline from ~4174
- Belt-side unit-carrier lathe profile from 3597
