# Contributing to FLAT·SIX

Thanks for helping build the DIY Porsche garage! This is a hobby/community
project, **not affiliated with Dr. Ing. h.c. F. Porsche AG**. All maintenance
data is reference-only — it must be verifiable against an official source.

## Dev setup

See the [README](./README.md) for the full walkthrough. In short:

```bash
npm install
cp .env.local.example .env.local          # or set NEXT_PUBLIC_DEMO_MODE=true
npm run dev                                # http://localhost:3000
```

Node **24** is required (pinned via `.nvmrc` / `.node-version`; `fnm use` or
`nvm use`). Set `NEXT_PUBLIC_DEMO_MODE=true` to run the whole front-end on
in-memory data with no Supabase account.

## Before you open a PR

Run the same gates CI runs (see `.github/workflows/ci.yml`):

| Check | Command | When |
| --- | --- | --- |
| Types | `npx tsc --noEmit` | always |
| Knowledge base | `npm run kb:lint` | always |
| 3D pin coverage | `npm run gen:verify` (+ `--gen <gen>`) | if you touched `public/models/components/**` or a `*-parts.json` |
| Production build | `npm run build` | for non-trivial changes |

## Data & correctness

The app's whole value is accuracy. When you add or change a spec, torque, fault
code, or procedure:

- **Cite a source.** The knowledge types carry a `source` field — use it.
  Prefer the factory workshop manual, PET parts catalogue, or an official PCNA
  document.
- **Don't fabricate codes.** Only add OBD-II fault codes you can verify. We do
  not invent Porsche-specific `P1xxx` codes.
- **Never commit factory documentation.** Workshop manuals and parts catalogues
  are © Porsche AG. They are gitignored, stored in Supabase, and served only to
  authenticated users. Do not add them to the repo.

## Adding a 3D model or image (provenance checklist)

Every bundled asset must be one we have the right to ship. For any GLB or image
you add:

- [ ] **Licence is compatible** — your own work, public domain, or a Creative
      Commons licence (CC BY / CC BY-SA / CC BY-NC-SA). No "all rights reserved"
      assets.
- [ ] **Recorded in [`lib/credits.ts`](./lib/credits.ts)** — `MODEL_CREDITS` for
      exterior GLBs, a `*_CREDIT` constant for imagery — with title, author,
      source URL, and licence.
- [ ] **Listed in [`NOTICE.md`](./NOTICE.md)** with the same attribution.
- [ ] **NC / SA flagged** — a NonCommercial or ShareAlike asset (e.g.
      CC BY-NC-SA) constrains redistribution of the *entire app*, so call it out
      in the credit comment and NOTICE.

`lib/credits.ts` and `NOTICE.md` must not drift apart — if an asset is in one,
it belongs in the other.

## Adding a model or a whole generation

Read the runbooks in **[`docs/procedures/`](./docs/procedures)** —
[adding a model variant](./docs/procedures/adding-model-variant.md) or
[adding a new generation](./docs/procedures/adding-new-generation.md) — which list
every registry and asset to touch, the "honest absence" rules that let a
generation ship incrementally, and the caveats for the rear-engine 911.

## Roadmap & issues

Feature requests and known gaps live in
[GitHub issues](https://github.com/dmitry-grechko/flat-six/issues). Good places
to start are labelled `help wanted` and `good first issue`.
