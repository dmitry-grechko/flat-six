# Exhaust geometry findings — WM 263319

Source: `tools/gen/wm-refs/exhaust/muffler-263319-4584.png` (Fig 1 Exploded View Of Rear Silencer With Holder And Tailpipe Cover), plus holder `4588.png`, clamp `4592.png`, and `notes/exhaust.txt`.

## WM Fig 1 callouts (mapped to gen)

| # | Part | Gen treatment |
|---|------|---------------|
| 1 | Rear silencer holder | Bridge/frame under existing `silencerBracketPSE` (transverse rail, centre X-brace, drop arms) |
| 2 | Clamp (inlet) | `exhaustClamp` moved to right silencer inlet joint |
| 4 / 5 | Silencer R / L | `muffler_R` / `muffler_L` — `roundBox` cans at ≈ ±1.7, z ≈ -3.3 |
| 6 | Clamping sleeve | `exhaustClampingSleeve` at centre-rear L/R outlet junction (ahead of tips) |
| 7 | Screw-type clamps | Visual bands on each tip neck (`tipClamp_*`) |
| 8 | Twin tailpipe cover | Shared base/neck + `tip_R_0` / `tip_L_0` outlets (T-shaped) |
| 9 | Single wide tip | Not modelled (alternate cover) |

## Geometry changes (`tools/gen/components/exhaust.mjs`)

1. **Silencer shape** — Replaced cylindrical cans with flatter rounded-rectangular `roundBox` bodies + light ribs/end caps (matches oval/rounded-rect CAD, not perfect cylinders).
2. **Holder bridge** — Expanded `silencerBracketPSE` from a small box into a left–right bridge above both mufflers (no new PRIMARY JSON nodes).
3. **Clamping sleeve** — Relocated from mid-pipe offset to centre rear (`x=0`, `z≈-3.72`) where L/R outlets meet before the tip cover; axis along X.
4. **Twin tip cover** — Added shared `tailpipeCoverBase` / `tailpipeCoverNeck`; kept PRIMARY `tip_R_0` / `tip_L_0` as the two outlets of one T assembly.
5. **Inlet pipes** — `connectingPipe_*` final waypoints rise/curve into the can; muffler inlet is a short up/forward tube (WM exploded inlet path).
6. **Header comments** — Cite WM 263319 Fig 1 items 1/4–6/8 accurately.

## flow-systems.ts

No waypoint edits. Corner muffler centres and centre tips moved only slightly; existing exhaust-flow paths (corner silencers → centre tips) still track the layout.

## Contract / process

- PRIMARY node names from `exhaust-parts.json` unchanged.
- Did **not** run `gen:components`.
- Did **not** commit.
