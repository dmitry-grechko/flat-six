# Procedural 3D component pipeline

Generates clean technical-illustration / CAD-style **GLB** models of the Porsche
981 Boxster S internal components, one `.glb` per component with **named nodes**
so the app can isolate / highlight individual parts. Also emits a manifest the
app reads.

Everything runs **headless** in Node — no WebGL, no browser, no GUI. Geometry
comes from `three`'s pure-math geometry classes (`BoxGeometry`,
`CylinderGeometry`, `TorusGeometry`, `TubeGeometry`, …); a small custom
serializer (`lib/glb-writer.mjs`) writes self-contained glTF 2.0 binaries with
embedded `pbrMetallicRoughness` materials (no external textures).

## Run

From the project root:

```bash
npm run gen:components
```

This writes:

- `public/models/components/*.glb` — one binary per component
- `public/models/components/manifest.json` — `ModelManifestEntry[]` (see `lib/types.ts`)

Every GLB is re-opened and validated after writing (glTF magic, JSON chunk,
`meshes > 0`, `nodes > 0`, named nodes present, POSITION accessor min/max). A
summary table (file → nodes / meshes / size) prints at the end; a validation
failure exits non-zero.

## Layout

```
tools/gen/
  build-components.mjs     entry point: registry, GLB write, manifest, verify
  wm-refs/                 WM CAD extracts + extract-pages.mjs (local PNGs gitignored)
  lib/
    materials.mjs          per-system color palette + glTF material conversion
    primitives.mjs         box/cyl/tube/torus/sphere helpers (tag mesh + material)
    glb-writer.mjs         THREE.Object3D hierarchy -> GLB serializer
  components/
    engine.mjs             flat-six (MA1, water-cooled)
    ...
```

## Calibrating from the workshop manual

Use the project skill **`wm-3d-calibrate`** (`.cursor/skills/wm-3d-calibrate/`) for the
full AI workflow: find figures → extract → Tier A silhouette → coverage → verify.
Also: `npm run wm:figs`, `npm run wm:extract`, `npm run gen:verify`.

## Joint-view placement

After geometry changes, run **`xray-unified-layout`**
(`.cursor/skills/xray-unified-layout/`) via `npm run gen:layout` so hotspots /
displayRadius still compose correctly in the unified scene.

## Adding a component

1. Create `tools/gen/components/<name>.mjs`. Export two things:

   ```js
   import { group, box, cyl, at } from '../lib/primitives.mjs';

   export const meta = {
     id: 'coolant',          // match the id in lib/data.ts when one maps
     label: 'Coolant Tank',
     system: 'Cooling',      // must be a SystemName from lib/types.ts
     node: 'coolantTank',    // root node name inside the GLB
     hotspot3d: '0 0.5 0',   // "x y z" near the part center (optional)
   };

   export function build() {
     const root = group('coolantTank');     // root name should match meta.node
     root.add(at(box('tankBody', 0.6, 0.8, 0.5, 'plastic'), 0, 0, 0));
     // ...more named meshes / sub-groups...
     return root;
   }
   ```

   Use named meshes / sub-groups freely — names are preserved in the GLB so the
   app can target them for isolate / highlight.

2. Pick colors from the palette in `lib/materials.mjs` (pass a key string like
   `'block'`, `'caliper'`, `'tank'`), or pass an inline spec
   `{ color: 0xrrggbb, metalness, roughness, opacity? }`. Add a new palette key
   there if a system needs one.

3. Register it in `build-components.mjs`: import the module and add it to the
   `COMPONENTS` array. (For a module exporting several components — like
   `smallParts.mjs` — export each as `{ meta, build }` and add them individually.)

4. Run `npm run gen:components`. The new `.glb` and a manifest entry appear
   automatically; the verifier confirms it.

### Reusing one builder for several components

`frontBrake.mjs` exports `makeBrake(opts)` and `rearBrake.mjs` calls it with
different dimensions. `smallParts.mjs` exports `makeCanister`, `makePanel` and
`makeCoilPlug`, each wrapped into a concrete `{ meta, build }` component. Follow
that pattern to keep variants DRY.

## Style / palette

Per-system, matching the POC's clean technical-illustration look:

- **Engine** — anodized silver block, black cam covers / plastic intake, red oil filter accent
- **Transmission** — brushed aluminium casing with darker cast ribs
- **Exhaust** — titanium headers, bright cats / tips, dark muffler boxes
- **Brakes** — steel disc + alloy hat, red caliper, dark pads
- **Cooling** — dark core, alloy tanks, dark plastic shroud/condenser

Keep poly counts low (cylinder/torus segments ~16–32) so files stay small.
