# Workshop-manual CAD refs (local)

PNG extracts used to calibrate procedural component geometry.
**Do not commit PNGs** (third-party rights reserved) — gitignored via `tools/gen/wm-refs/**/*.png`.

## AI workflow (source of truth)

Use the project skill **`wm-3d-calibrate`**:

`.cursor/skills/wm-3d-calibrate/SKILL.md`

That skill covers Tier A outer silhouette, coverage, internals, multi-gen (987+),
parallel agents, and the assembly catalog.

## Quick extract

```bash
# Find figures
python3 .cursor/skills/wm-3d-calibrate/scripts/find-figs.py --gen 981 --keywords radiator,fan

# Rasterize pages
node tools/gen/wm-refs/extract-pages.mjs --gen 981 --section cooling --from 4174 --to 4182 --label rad-module

# After gen script edits
npm run gen:components && node tools/gen/verify-coverage.mjs
```

Layout: `tools/gen/wm-refs/<gen>/<section>/` (legacy flat folders `cooling/`, `engine/`, … still fine).

## Findings (981)

| Section | Notes |
| --- | --- |
| Cooling | [`notes/cooling-findings.md`](notes/cooling-findings.md) |
| Intake | [`notes/intake-findings.md`](notes/intake-findings.md) |
| Exhaust | [`notes/exhaust-findings.md`](notes/exhaust-findings.md) |
| Engine | [`notes/engine-findings.md`](notes/engine-findings.md) |
