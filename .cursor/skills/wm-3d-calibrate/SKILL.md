---
name: wm-3d-calibrate
description: >-
  Calibrates procedural garage 3D components (GLBs) against Porsche workshop-manual
  CAD figures: extract pages, compare silhouette + internals, patch gen scripts,
  hit 100% parts coverage. Use when improving X-RAY / component accuracy from a
  service manual, adding a new generation (987, 718, …), or running a
  component-by-component WM→3D pass.
---

# Workshop-manual → 3D calibration

Reusable workflow to make procedural components look closer to factory CAD —
**outer silhouette first**, then internals — for 981 today and 987 / future gens later.

## When to use

- User asks to improve 3D accuracy from the service manual
- Component-by-component or full-catalog calibration
- Onboarding a new generation’s workshop PDF
- Outer shape / form looks “blocky” or wrong vs real packaging

## Hard rules

1. **© Porsche** — never commit WM PDFs or extracted PNGs. Keep under `tools/gen/wm-refs/` (gitignored `**/*.png`) and `public/manual/*.pdf`.
2. **Do not invent PRIMARY node names** — match `public/models/components/<id>-parts.json` (or gen-specific parts file). Add geometry; don’t casually rewrite the parts catalog.
3. **Preserve existing working node names** — prefer alias groups for new contract nodes.
4. **Verify before declaring done** — `npm run gen:components` + `node tools/gen/verify-coverage.mjs` must show **100%** for touched assemblies.
5. **One assembly (or one parallel wave) per focused pass** — don’t boil the ocean in one agent without a catalog checklist.
6. **After geometry changes, run unified layout** — `npm run gen:layout` (skill `xray-unified-layout`) so joint-view scale/hotspots stay coherent.

## Coordinate frames (do not mix)

| Frame | Origin | Axes | Used by |
| --- | --- | --- | --- |
| **Gen / native** | Component centroid | +X right, +Y up, **+Z front** (accessory face) | `tools/gen/components/*.mjs` |
| **Car-space** | Car centroid | Same axes; wheels ≈ z ±1.5 | `xray-assemblies.ts` hotspots, `flow-systems.ts` |

Radiators/exhaust often live large in native space then scale in the viewer — don’t “fix” flow endpoints without confirming car-space mapping.

## Fidelity tiers (apply in order)

### Tier A — Silhouette / outer form (most visible “real life”)

Goal: from outside, the part should read as the real casting/housing, not a stack of boxes.

1. Prefer WM **overview / exploded / R&I** figures that show the **external envelope**.
2. Match **proportions** (aspect ratio, taper, offset of necks/ports) before adding bolts.
3. Prefer `lathe`, `tube`, `capsule`, `roundBox`, `cyl` over raw `box` for housings.
4. Capture signature features: scoops, ribs, flanges, angled faces, twin tips, corner rads.
5. Place correctly vs neighbors (engine bay, wheel arch, rear apron).

See [silhouette.md](silhouette.md).

### Tier B — Selectable coverage

Every PRIMARY `node` in `*-parts.json` must exist in the GLB (`verify-coverage.mjs`).

### Tier C — Internals / cutaway

Cranks, chains, valves, solenoids, bearings — use cutaways / open case figures. Don’t hide Tier A under internal detail.

### Tier D — Flows & hotspots

Update `flow-systems.ts` / `xray-assemblies.ts` only when routing or placement is factually wrong (cite WM).

---

## Workflow (copy checklist)

```
WM→3D Progress:
- [ ] 0. Scope: generation + assembly id(s)
- [ ] 1. Locate WM chapters / Fig pages
- [ ] 2. Extract PNGs + text notes
- [ ] 3. Read CAD images; write findings draft
- [ ] 4. Tier A silhouette patches
- [ ] 5. Tier B missing PRIMARY nodes
- [ ] 6. Tier C internals (if figures support)
- [ ] 7. Tier D flows/hotspots (if needed)
- [ ] 8. gen:components + verify-coverage 100%
- [ ] 9. Write notes/<assembly>-findings.md
- [ ] 10. Update catalog status
```

### 0. Scope

Confirm:

| Field | Example |
| --- | --- |
| Generation | `981` / `987` / `718` |
| Assembly id | `engine`, `cooling`, `susp`, … (see [catalog.md](catalog.md)) |
| Mode | `improve` existing gen script vs `bootstrap` new generation |
| Parallel? | Up to 3 assemblies if independent |

### 1. Locate figures

```bash
# Full-text index once per PDF (cached)
PDF=public/manual/<gen>-workshop-manual.pdf   # e.g. 981-workshop-manual.pdf
pdftotext -layout "$PDF" /tmp/wm-<gen>.txt

# Find chapter + Fig titles (python or grep)
python3 - <<'PY'
from pathlib import Path
pages = Path("/tmp/wm-981.txt").read_text(errors="replace").split("\f")
# print pages where "Fig " and keywords appear — see scripts/find-figs.py
PY
```

Or: `python3 .cursor/skills/wm-3d-calibrate/scripts/find-figs.py --gen 981 --keywords crankshaft,camshaft`

Use [catalog.md](catalog.md) for known 981 page ranges; re-discover for new PDFs.

### 2. Extract

```bash
GEN=981
SECTION=engine          # cooling | intake | exhaust | engine | susp | ...
PDF=public/manual/${GEN}-workshop-manual.pdf
OUT=tools/gen/wm-refs/${GEN}/${SECTION}
mkdir -p "$OUT" tools/gen/wm-refs/notes

pdftoppm -f <start> -l <end> -png -r 150 "$PDF" "$OUT/<label>"
# Save captions: tools/gen/wm-refs/notes/${SECTION}-pages.txt
```

Helper: `node tools/gen/wm-refs/extract-pages.mjs --gen 981 --section engine --from 3640 --to 3654 --label crank-chains`

### 3. Read & compare

**Must** `Read` the key PNGs (vision). For each figure note:

- Outer envelope shape (Tier A)
- Part callouts / legend numbers
- L/R symmetry vs single-sided
- Mounting orientation vs car axes

Compare to:

- `tools/gen/components/<file>.mjs`
- `public/models/components/<id>-parts.json`
- Optional: `flow-systems.ts`, `xray-assemblies.ts`

### 4–7. Patch

- Edit gen script(s) only for the scoped assembly (+ flows if Tier D).
- Materials: existing keys in `tools/gen/lib/materials.mjs` only (or add a palette key if truly needed).
- Parallel agents: one assembly each; no overlapping file writes.

### 8. Verify

```bash
npm run gen:components
node tools/gen/verify-coverage.mjs
# Optional deeper check for engine/trans/exhaust:
node tools/gen/verify-engine-parts.mjs
```

Iterate until scoped assemblies are **100%**.

### 9. Findings

Write `tools/gen/wm-refs/notes/<section>-findings.md`:

```markdown
# <Section> — <gen> WM findings
## Sources (pages / Fig titles)
## Tier A silhouette (before → after)
## Tier B coverage (before % → after %)
## Tier C internals
## Tier D flows/hotspots
## Left unchanged / risks
```

### 10. Catalog

Update status row in [catalog.md](catalog.md).

---

## Multi-generation (987 and beyond)

When adding a new generation:

1. Place PDF at `public/manual/<gen>-workshop-manual.pdf` (gitignored).
2. Extract to `tools/gen/wm-refs/<gen>/…` (never commit PNGs).
3. Prefer **shared primitives**; fork gen modules only where packaging differs:
   - Same: `tools/gen/components/engine.mjs` with `meta.generation` / build options, **or**
   - Split: `engine-981.mjs` / `engine-987.mjs` registered in `build-components.mjs`.
4. Ship gen-specific GLBs if shapes diverge: e.g. `public/models/components/987/engine.glb` + parts JSON; wire `xray-assemblies` by garage vehicle generation.
5. Re-run this skill assembly-by-assembly — do not assume 981 page numbers apply.

Bootstrap order for a new gen: **engine → cooling → intake → exhaust → susp → brakes → oil → trans → elec**.

---

## Parallel agents

For a wave of N assemblies:

1. Parent extracts all PNGs + writes page notes.
2. Launch ≤3 `generalPurpose` agents with **non-overlapping** file lists.
3. Each agent owns: gen script(s), optional flow/hotspot edits, findings md.
4. Parent runs `gen:components` + `verify-coverage` once at the end (or per agent if isolated).

Prompt each agent with: generation, assembly id, PNG paths, parts JSON path, success = 100% coverage + Tier A notes.

---

## Outer form: honest limits

Procedural CSG will never match a scanned OEM mesh. For “more real life from the outside”:

1. Run **Tier A** aggressively (this skill).
2. If still insufficient: consider a future path of **reference mesh** (simplified OEM/aftermarket GLB) with named empties for pins — out of scope unless user asks.
3. Never paste copyrighted CAD meshes into the repo.

---

## Quick commands

| Action | Command |
| --- | --- |
| Build GLBs | `npm run gen:components` |
| Coverage | `node tools/gen/verify-coverage.mjs` |
| Find figs | `python3 .cursor/skills/wm-3d-calibrate/scripts/find-figs.py --gen 981 --keywords …` |
| Extract pages | `node tools/gen/wm-refs/extract-pages.mjs --gen 981 --section … --from N --to M --label …` |

## Extra detail

- Assembly catalog + status: [catalog.md](catalog.md)
- Silhouette checklist: [silhouette.md](silhouette.md)
- Worked examples: [examples.md](examples.md)
