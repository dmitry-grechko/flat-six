# Oil & Lubrication — 981 WM findings

## Sources (pages / Fig titles)

| Pages | Figs / topic |
| --- | --- |
| ~3984–3986 | Fig 1 Identifying Oil Filter (underside, ~45°); Fig 2 cover + element; Fig 3 housing |
| ~4010–4015 | Oil pump sprocket / timing chain / Torx screw; pump screws; pressure-valve face |
| ~4035–4045 | Lower/upper oil pan; molded seal + O-rings; suction tube; air/oil separator on pan; upper pan frame |
| ~4059 | **KEY** Overview Of Oil Cooler Bracket Component (bracket spine, mist separator, rectangular cooler + 2 stubs, filter on bracket end) |

Text index: `tools/gen/wm-refs/notes/oil-pages.txt`  
PNGs: `tools/gen/wm-refs/981/oil/` (© Porsche — do not commit)

## Tier A silhouette (before → after)

### Oil filter (`oilFilterHousing`)
- **Before:** Vertical spin-on-style cylinder under conducting housing; no angle; smooth shell; insert via `makeCanister`.
- **After (WM ~3984–3985):** Cover group pitched ~45°; **domed lathe cover**; **12-facet fluted grip** near base; pleated cartridge element visible inside; O-ring at open end. PRIMARY node name unchanged.

### Oil cooler + conducting housing (`oilHeatExchanger` / `oilConductingHousing`)
- **Before:** Tall finned cooler block beside a short box housing; separator elsewhere on block top.
- **After (WM ~4059):** Conducting housing reads as **bracket spine** (long cast pad + cooler mount + filter boss). Cooler is a **compact rectangular** oil/water HX with **two upward pipe stubs**. Mist separator canister sits on the bracket filter-end (`oilSeparator` body relocated to bracket). PRIMARY names preserved.

### Oil pan (`oilSump`)
- **Before:** Two stacked boxes + thin gasket plane.
- **After (WM ~4036 / ~4045):** Clearer **upper frame vs lower bowl** (`roundBox` + void inset); **molded seal lip / bead** at flange; pickup strainer at suction-tube mouth.

### Oil pump (`oilPump` / `oilPumpDriveChain`)
- **Before:** Plain sprocket + single torus chain run.
- **After (WM ~4010):** Sprocket with **6 lightening holes** + hub; dual chain runs + stub toward crank; pressure-valve boss on pump face.

## Tier B coverage

- PRIMARY nodes from `oil-parts.json` all present in builder tree (smoke-checked).
- Sub nodes used for silhouette (`oilFilterInsert`, `oilSumpGasket`, `oilSuctionTube`, `oilPumpDriveChain`, etc.) retained.
- Parent will run `npm run gen:components` + `verify-coverage.mjs` for GLB confirmation.

## Tier C internals (light)

- Pleated filter element inside cover (~3985).
- Pickup strainer at suction tube (~4042).
- Sprocket holes + chain stub (~4010).
- Not modelled: full gallery network, IMS circuit, piston jets (still absent as before — no PRIMARY requirement).

## Tier D flows/hotspots

- No `flow-systems.ts` / `xray-assemblies.ts` edits this pass.

## Left unchanged / risks

- All PRIMARY contract node names unchanged.
- Materials: existing keys only (`cast`, `castDark`, `steel`, `rubber`, `paper`, `cover`, `hose2`, `oilcap`, `yellow`, `bolt`, plus inline OIL tint).
- Did **not** run `gen:components`; did **not** commit.
- Filter angle is a packaging approximation in native space — re-check joint X-RAY after parent regen + layout.
