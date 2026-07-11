# Procedure: Adding a model variant

Add a new **body variant within an existing generation** — e.g. a Spyder or a
Boxster body reusing a Cayman GLB. The variant registry (`lib/models.ts`) is the
single source of truth; selector chips, the 3D viewer, Settings and onboarding all
derive from it, so most of the UI needs no change.

## 1. Add the `BodyType` — `lib/types.ts`

Append the new id to the `BodyType` union (e.g. `'spyder-987'`). Legacy 981 ids
stay `'boxster'`/`'cayman'`; newer ones are suffixed with the generation.

## 2. Register the variant — `lib/models.ts`

Add a `CarVariant` to `CAR_VARIANTS`:

```ts
{ id: 'spyder-987', generation: '987', bodyStyle: 'boxster',
  label: 'Spyder (987)', modelName: 'Boxster Spyder (987)',
  glb: '/models/spyder-987.glb', hasCutaway2D: true, hasXray3D: false }
```

`generationForBody`, `GENERATIONS`, `MODEL_OPTIONS`, the picker chips and the
viewer all read from here automatically.

## 3. 3D model + attribution

- Drop the exterior GLB in `public/models/` (naming: `<body>-<gen>.glb`). If the
  variant reuses another model's GLB, just point `glb` at it.
- Add the credit to `lib/credits.ts` (`MODEL_CREDITS[id]`) **and** `NOTICE.md`.
  Watch the licence — e.g. a CC BY-NC-SA asset is fine for this non-commercial
  project but can't ship commercially.

## 4. Options that differ (engines / trans / colors)

Engines, transmissions and paint colors come from `lib/data.ts` and are keyed by
**generation**, not variant. If the variant needs distinct options, extend those
lists (and any per-generation filtering). Colors are `COLORS` in `lib/data.ts`.

For a variant that shipped with a single factory powertrain (e.g. the GT4 is a
manual-only 3.8), set `defaultEngine` / `defaultTransmission` on its `CarVariant`
in `lib/models.ts` — new vehicles seed to it and the picker snaps to it, instead
of the generic per-generation default. The values must be members of the
generation's `enginesFor()` / `transmissionsFor()` lists.

## 5. Fitment (if wheels differ)

If the variant runs unique OEM wheels, add a `FitmentPreset` in
`lib/fitment/oem.ts` so Tools → Will It Fit can pre-fill it.

## 6. Verify

- Settings → model picker shows the new chip (and **wraps** — it's a flex-wrap row).
- Selecting it renders the GLB and the in-viewer credit.
- `npx tsc --noEmit` clean.

## Checklist

- [ ] `BodyType` extended (`lib/types.ts`)
- [ ] `CarVariant` added (`lib/models.ts`)
- [ ] GLB in `public/models/` + credit in `lib/credits.ts` + `NOTICE.md`
- [ ] Options/colors/fitment extended if the variant differs
- [ ] Picker + viewer verified; `tsc` clean
