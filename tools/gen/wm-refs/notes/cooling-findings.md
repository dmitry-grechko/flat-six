# Cooling geometry findings (WM CAD vs generator)

Sources: `tools/gen/wm-refs/cooling/rad-dist-4174.png`, `fan-190819-4083.png`, `fan-190819-4084.png`, `mid-rad-4198.png`, plus `notes/cooling.txt`.

## What the WM showed

- **Corner radiator module (~4174 / WM 197019 Fig 1):** Ahead of the front wheel, angled outboard (~35°). Stack is condenser (front) → radiator core → fan on rear face. Module reads taller-than-wide with vertical side structure; mounts top and bottom.
- **Radiator + condenser + side air guide (WM 190819 ~4083):** Horizontal finned core; A/C condenser body stacked on the face; **vertical side air guide** flush to the outboard edge (blue highlight), not a distant plate.
- **Electric fan (WM 190819 ~4084 / Fig 7):** **5 blades**, deep roughly square shroud with a circular opening; hub on three arms (simplified in mesh).
- **Middle radiator (~4198 / WM 198019 Fig 1):** Low, centre, **wider-than-tall** core with vertical end tanks and a front air-guide duct (optional packaging); hoses leave the top of the side tanks outward.

## What we changed (`coolingRadiator.mjs`)

- **Fan blades:** 6 → **5**; slightly broader blades; hub/ring sit deeper in the shroud.
- **Fan shroud:** Thicker/deeper square frame (`1.15×1.15×0.24`) plus a circular `shroudRing` to imply the CAD opening.
- **Radiator core:** Corner units taller-than-wide (`1.0×1.35`) with **vertical L/R side tanks** plus thin top/bottom headers (hose/mount faces). Secondary/middle uses `sub=true` → wider/shorter (`1.55×0.72`).
- **Side air guides:** Repositioned flush to the outboard side-tank face (local-X offset under yaw), taller/thinner panel matching core height — no longer a thin plate far outboard.
- **Condenser:** Kept ahead of the right rad along face normal; thinner stacked panel (`0.06` depth) sized to the taller core.
- **Middle radiator:** Kept node `radiatorFanSecondary`; moved lower/forward (`y=-0.38`, `z=RZ+0.12`) and given the wide/short `sub` proportions.
- **Header comments:** Cite WM pages ~4174 (module), 190819 (~4083–4084 fan/condenser/guide), ~4198 (middle rad); dropped the misleading sole “197019” geometry cite.
- **Hose attach Y:** Upper/lower/breather endpoints updated to new header faces (`CORE_TOP_Y` / `CORE_BOT_Y`).

## Left unchanged

- **All PRIMARY / contract node names** from `cooling-parts.json` (including `radiatorsLeftRight`, `radiatorFanModules`, `radiatorFanLeft`, `radiatorFanSecondary`, `radiatorAirGuideLeft/Right`, etc.).
- **`flow-systems.ts` coolant paths:** Endpoints at ±0.41, −0.07, 1.86 are viewer/car-space after GLB scale; native rads remain at LX/RX ±1.6, RZ 2.2. Not adjusted without a confirmed mapping.
- **No GLB regen** in this pass (parent runs `npm run gen:components`).
