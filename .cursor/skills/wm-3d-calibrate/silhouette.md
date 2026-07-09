# Tier A — Outer silhouette checklist

Use this when the user wants components to look more “real life **from the outside**.”

## Read the CAD like a product designer

From each overview / R&I figure, extract:

1. **Bounding proportions** — width : height : depth (eyeball ratios; note vs current gen sizes)
2. **Primary volumes** — how many major blobs (housing, neck, flange, cover)
3. **Transitions** — sharp step vs smooth taper vs corrugated sleeve
4. **Asymmetry** — ports, connectors, brackets only on one side
5. **Mount attitude** — yaw/pitch vs car axes (e.g. corner radiators ~35° outboard)
6. **Negative space** — cutouts, scoop mouths, twin tip gap

## Primitive preferences

| Shape in CAD | Prefer | Avoid |
| --- | --- | --- |
| Cast housing | `roundBox`, `lathe`, stacked `cyl` | Single huge `box` |
| Duct / hose | `tube` with 4–8 waypoints | Straight `box` bridges |
| Pulley / damper | `lathe` profile | Flat `cyl` only |
| Canister / muffler | `roundBox` / `capsule` | Perfect sphere/`cyl` if CAD is oval |
| Ribs / fins | Repeated thin `box`/`cyl` | Texture faking |
| Flange / clamp | `torus` | Ignoring clamp rings |

## Pass order on one assembly

1. **Rescale** major groups to WM proportions (biggest visual win).
2. **Replace** boxy shells with lathe/tube envelopes.
3. **Add** 2–4 signature exterior features (ribs, necks, angled faces).
4. **Align** to neighbors / car-space hotspot.
5. Only then add bolts, sensors, internals.

## Trace from WM CAD (when hand profiles aren't enough)

For irregular pans / molded hoses, extract the blue CAD highlight:

```bash
/tmp/wm-trace-venv/bin/python tools/gen/wm-refs/trace-silhouette.py \
  --image tools/gen/wm-refs/981/<section>/<fig>.png \
  --mode footprint|centerline --name NAME --width 2.4 \
  --out tools/gen/wm-refs/981/traces/<fig>.trace.json
```

Load in gen via `tools/gen/lib/wm-traces.mjs` → `extrude()` / `tube()`. See `notes/wm-trace-findings.md`.

## “Real life” ceiling

Procedural meshes ≈ technical illustration fidelity. If Tier A is exhausted and the user still wants photoreal outer form:

- Discuss importing a **simplified reference mesh** with named empties for pins
- Do **not** commit OEM CAD or copyrighted scans

## Visual QA (manual)

In garage X-RAY, for the assembly:

- [ ] Recognizable at a glance from ¾ view
- [ ] Matches WM overview silhouette (side-by-side with extracted PNG)
- [ ] No floating orphan boxes far from the envelope
- [ ] L/R symmetry correct (or correctly asymmetric)
- [ ] Hotspot / displayRadius still frames the part
