# Workshop manual PDF

The 981 factory workshop manual is **~213 MB / 6087 pages** — too large for Supabase Free Storage (50 MB global cap). For production we **compress + split** it into three volumes under 50 MB each.

## Local full PDF (dev / parsing)

```bash
cp "~/Downloads/Editable Version_ 2013 - 2016 Porsche Cayman Boxster  Base S GT4 981 workshop manual.pdf" public/manual/981-workshop-manual.pdf
```

Keep this full file for `parse-manual` / WM CAD extracts. The Documents viewer on Free-tier prod uses the volumes below.

## Free-tier: compress + upload

Requires Ghostscript (`brew install ghostscript`):

```bash
npm run manual:compress   # → v1/v2/v3 PDFs + volumes.json (~35 MB each @ 72 dpi)
npm run docs:upload       # uploads volumes (skips the 213 MB original when volumes exist)
```

Documents tab shows **Vol 1 / Vol 2 / Vol 3**. Fault Finding deep-links remap absolute page numbers onto the right volume.

## Pro plan (optional single file)

Raise [Storage → Settings → Global file size limit](https://supabase.com/dashboard/project/_/storage/settings) to ≥250 MB, then:

```bash
npm run manual:upload     # full 213 MB PDF
```

## Searchable text

```bash
node tools/manual/parse-manual.mjs "public/manual/981-workshop-manual.pdf"
npm run db:import-manual
```

`db:import-mtl` only loads MTL text — it does not upload PDFs.
