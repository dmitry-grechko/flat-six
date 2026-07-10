# Procedure: Adding a document (manual / TSB / tech doc)

How to add a factory PDF (workshop manual, Service Information Technik, TSB,
diagnostic doc) so it shows in **Documents**, feeds the **knowledge base / Fault
Finding**, and is served from **Supabase**.

> PDFs are **gitignored** (`public/manual/*.pdf`, `public/mobile_tech_library/**`) —
> only the *registry* (code) is committed; the files live in Supabase Storage.

## 1. Stage the PDF locally (canonical path)

Drop the file under `public/` in the model-first layout the app expects:

- Workshop manual volumes → `public/manual/`
- Mobile Tech Library → `public/mobile_tech_library/<Category>/<Model>/<file>.pdf`
  (e.g. `Service Information Technik/Boxster-Cayman/`, `Diagnostic Information/981 Boxster-Cayman/`)

## 2. Register it in the Documents catalog — `lib/documents.ts`

Add a `DocumentMeta` entry (or use a helper like `sit()`, `diag981()`, `training()`).
Required fields: `id`, `title`, `category` (`workshop | diagnostic | service-info |
training | maintenance | parts`), `generations` (`['981'] | ['987'] | ['shared']`),
`storagePath` (model-first Storage key, e.g. `981/service-info/<file>.pdf` via
`storeKey()`), and `localUrl` (dev fallback). This alone makes it appear in
`/manual`, filtered by the active car's generation.

## 3. Feed the knowledge layer — `lib/knowledge/`

If the doc introduces facts the app/AI should answer with, add structured entries
to the per-generation JSON (`known-issues.json`, `fault-codes.json`, `specs.json`,
`maintenance.json`, or an article in `articles*.ts`) — use `known-issues-987.json`
etc. for 987. These flow into search + the MCP knowledge tools automatically.

- **Fault Finding** reads `fault-codes*.json` / `known-issues*.json` — add there for a fault/known issue.
- **Specs / torque** → `specs*.json`. **Alignment/fitment** → `lib/fitment/*`.

## 4. 3D / visual tips (only if relevant)

If the doc informs a cutaway or component figure, wire imagery via
`lib/credits.ts` (`cutawayImageFor`, `engineRefFor`, image credits) and drop the
image in `public/assets/`. Attribution for any third-party asset → `NOTICE.md`.

## 5. Upload to Supabase Storage

Needs `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`.

```bash
npm run docs:upload            # uploads catalog PDFs present under public/
npm run docs:upload -- --mtl-only   # skip the big workshop manual
```

The uploader (`tools/manual/upload-docs.mjs`) maps local paths → Storage keys.
**Gotcha:** the Service-Info walk derives generation from a **year-prefixed
filename**. For a non-year file (e.g. a `SB-…` bulletin) add an explicit entry to
`bulletinFiles` in that script so it maps to the right generation.

For searchable full text (workshop manual / MTL), also import the parsed text:
`npm run db:import-manual` / `npm run db:import-mtl`.

## 6. MCP

No MCP change is needed — imported docs are searchable via the existing
`search_workshop_manual` / `get_manual_procedure` tools, and knowledge JSON flows
through `search_knowledge` / `list_known_issues` etc.

## Checklist

- [ ] PDF under `public/` canonical path
- [ ] `DocumentMeta` added to `lib/documents.ts`
- [ ] Knowledge/faults JSON updated (if it carries facts)
- [ ] Uploaded to Supabase (`docs:upload`) and/or text imported
- [ ] `npx tsc --noEmit` clean
