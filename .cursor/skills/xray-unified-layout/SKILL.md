---
name: xray-unified-layout
description: >-
  Validates and fixes joint X-RAY / unified-scene placement: hotspot3d,
  displayRadius, carSpace scale, bilateral offsets, and flow waypoints so all
  assemblies sit correctly together. Use when checking the combined garage view,
  components overlapping or wrongly sized, axle alignment, or after WM→3D
  geometry changes that shift native bounds.
---

# X-RAY unified layout

Job to confirm **location + sizing of all components together** in the joint
view (`UnifiedSceneClient`), not just each GLB in isolation.

Companion to `wm-3d-calibrate` (per-part CAD fidelity). Run this **after**
geometry changes that alter native bounding spheres.

## When to use

- User asks if assemblies “render nicely together” / joint view / unified layout
- After `gen:components` when native size changed (engine detail pass, exhaust cans, …)
- Brakes not on hubs, radiators not at bumper, exhaust floating, etc.
- Adding a new generation’s assemblies into the unified scene

## Hard rules

1. **Single source of placement** — edit `components/garage/xray-assemblies.ts` (and `flow-systems.ts` for tubes). Don’t fork magic numbers into the viewer.
2. **Match client math** — validator must mirror `AssemblyMesh` in `UnifiedSceneClient.tsx`:
   - **Normalized:** `scale = displayRadius / bboxSphereRadius`, then recenter so bbox center → hotspot
   - **Bilateral:** ±`lateralOffset` with X mirror; hide `hideInUnified` nodes visually (bbox still includes them)
   - **Car-space:** `position = hotspot`, `scale = worldScale`, **no** recenter
3. **Axle landmarks** — `AXLE` in `xray-assemblies.ts`: `frontZ=1.5`, `rearZ=-1.5`, `halfTrack=0.82`, `hubY=-0.35`
4. Prefer fixing **displayRadius / hotspot** before rewriting whole gen scripts; if native model is absurdly huge/tiny, fix gen proportions instead.
5. Do not commit WM PNGs.

## Workflow checklist

```
Unified layout Progress:
- [ ] 1. npm run gen:components   (if geometry dirty)
- [ ] 2. npm run gen:layout       (verify-unified-layout.mjs)
- [ ] 3. Triage ERROR then WARN
- [ ] 4. Patch xray-assemblies.ts and/or gen scripts
- [ ] 5. Re-run gen:layout until 0 errors
- [ ] 6. Spot-check garage unified view (ALL layer)
- [ ] 7. If flows look wrong, align flow-systems.ts waypoints to new AABBs
```

### Commands

```bash
npm run gen:layout              # table + issues + markdown report
npm run gen:layout -- --json    # machine-readable
npm run gen:layout -- --suggest # displayRadius hints for ~0.30 scale
```

Report: `tools/gen/wm-refs/notes/unified-layout-report.md`

### Fix playbook

| Symptom | Likely knob |
| --- | --- |
| Whole assembly too big/small | `displayRadius` (normalized) or `worldScale` (carSpace) |
| Assembly shifted in X/Y/Z | `hotspot3d` (remember recenter subtracts native center×scale) |
| Brakes not at wheels | `lateralOffset`, hotspot Y, `displayRadius`; confirm vs `AXLE` |
| Susp/driveline miss axles | Gen authored in car-space — fix native coords or `worldScale` |
| Cooling not at front | hotspot Z / displayRadius; native rads at z≈2.2 |
| Exhaust tips wrong | hotspot + displayRadius (comments in xray-assemblies cite target scale ≈0.28) |
| Flow tubes miss parts | `flow-systems.ts` points (same car-space frame) |

### Recenter gotcha

For normalized assemblies, the group position is **not** equal to hotspot:

`groupPos = hotspot - nativeCenter * scale`

So moving a hotspot by +0.1 in Y moves the visual +0.1 only if native center is accounted for. Prefer reading validator `CENTER` column after each tweak.

## Multi-generation

When 987 (etc.) gets its own GLBs:

1. Add gen-specific entries or a parallel `XRAY_ASSEMBLIES_987` selected by garage vehicle.
2. Point validator at that list (extend script `--gen 987` when wired).
3. Re-baseline `ZONES` in `verify-unified-layout.mjs` if wheelbase/track differ.

## Parallel with WM calibrate

1. `wm-3d-calibrate` improves shape/coverage for an assembly.
2. Immediately run **this** skill — native radius often changes → unified scale drifts.
3. Fix placement before starting the next assembly.

## Success criteria

- `npm run gen:layout` exits **0** (no `error` severity)
- Warnings reviewed (packaging zone drift OK if intentional)
- Unified ALL layer: engine ahead of trans, exhaust rearward, brakes at four corners, cooling toward front, chassis spans axles
