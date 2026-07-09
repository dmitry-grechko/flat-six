# Ignition & Fuel (plugs) — 981 WM findings

## Sources (pages / Fig titles)

| Pages | Figs / topic |
| --- | --- |
| ~4614 | Fig 1 Identifying Ignition Coils (side 4–6): blocky L/stepped coils, yellow top plugs, single base screw |
| ~4443–4448 | Injector R&I / puller context (spring clamps, injectors in head) |
| ~4449–4450 | Component overview / Fig 1 Identifying Fuel Injector Components (clamp, O-ring, angled connector, bellows ×3 ridges, Teflon tip) |

Text index: `tools/gen/wm-refs/notes/plugs-pages.txt`  
PNGs: `tools/gen/wm-refs/981/plugs/` (© Porsche — do not commit)

## Tier A silhouette (before → after)

### Ignition coils (`ignitionCoils`)
- **Before:** Simple box coil bodies + small connector nubs — read as generic capsules/blocks, not OEM COP shape.
- **After (WM ~4614):** Per-cylinder **L / stepped housing**: thick upper `roundBox` + lower step + rubber stalk into plug well; **yellow** top cable plug + lock tab; **single base flange screw** via `ignitionCoilMountingHardware`. Linear row of 3 per bank unchanged.

### Direct injectors (`directInjectors`)
- **Before:** Short tilted cylinder only.
- **After (WM ~4450):** Longer **nozzle**; faceted mid body; **angled electrical connector**; **spring clamp** at inlet; **3 bellows ridges** (torus stack); seals keep upper O-ring + tip seal under `injectorSeals`.

### Spark plugs / rails / sensors
- Spark plugs, HP rails, cam/knock/CKP sensors, HP/LP pumps, relay, filler check valve — geometry left intact (PRIMARY/sub nodes preserved).

## Tier B coverage

- All PRIMARY nodes from `plugs-parts.json` present in builder tree (smoke-checked).
- Sub: `sparkPlugs`, `directInjectors`, `injectorSeals`, `ignitionCoilMountingHardware`, regulator, rail pressure sensor retained.
- Spec-only / kit nodes (`sparkPlugThreadRepairKit`, `sparkPlugGapSpec`, `fuelFilter`) were never mesh nodes — unchanged.

## Tier C internals (light)

- Injector bellows ridges + clamp + tip seal from exploded ~4450.
- No cutaway of coil windings or injector solenoid internals.

## Tier D flows/hotspots

- No flow/hotspot edits.

## Left unchanged / risks

- PRIMARY node names from `plugs-parts.json` unchanged.
- Materials: `cover`, `yellow`, `rubber`, `steel`, `bolt`, `aluDark`, plus existing inline SENSOR/RAIL specs.
- Did **not** run `gen:components`; did **not** commit.
