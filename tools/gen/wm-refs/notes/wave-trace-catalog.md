# Catalog-wide trace wave — when to use / skip

Date: 2026-07-09

## Rule of thumb

| Technique | Use when | Skip when |
| --- | --- | --- |
| **Blue CAD footprint → extrude** | Single part filled blue, top/side view | Exploded multi-part overview, grayscale-only figs |
| **Blue CAD centerline → tube** | One elongated hose/duct blob | Dual parallel hoses merged, or no blue |
| **Hand Tier A (lathe/roundBox)** | Already good enough; or trace is a blob | — |
| **Electrical / plugs / fuel** | Low visual ROI for full re-trace | Boxes/cans are schematic by nature |

## This wave

| Assembly | Trace result | Action |
| --- | --- | --- |
| Exhaust | Exploded silencer fig → merged blob | Aspect ratio only → taller oval cans |
| Air intake | Clean housing + duct CL | Centerline droop on dual housings |
| Oil | Filter cover silhouette good; cooler overview blob | Lathe dome from filter trace; cooler hand kept |
| Brakes | Grayscale fig → dark mask grabbed disc+caliper | **Skipped** — keep existing WM caliper/disc Tier A |
| Electrical | — | **Skipped** (todo / low ROI) |
| Susp / driveline / fuel / plugs | — | Already silhouette; no new blue overview this pass |

## Verify

`gen:components` + `gen:verify` 100% + `gen:layout` 0 errors.
