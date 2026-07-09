# Workshop manual PDF

The 981 factory workshop manual (~213 MB) lives in **Supabase Storage** in production. Authenticated users receive a signed URL via `/api/manual/url`.

## Local dev

Copy the PDF here (gitignored):

```bash
cp "~/Downloads/Editable Version_ 2013 - 2016 Porsche Cayman Boxster  Base S GT4 981 workshop manual.pdf" public/manual/981-workshop-manual.pdf
```

The viewer falls back to this local file when Storage is empty.

## Production setup

1. Apply migrations (creates the private `workshop-manual` bucket):

   ```bash
   npm run db:push
   ```

2. **Raise the global file size limit** in [Supabase Dashboard → Storage → Settings](https://supabase.com/dashboard/project/_/storage/settings). Set **Global file size limit** to at least **250 MB** (default is 50 MB). Pro plans allow up to 500 GB.

3. Upload the PDF once (uses the service role + TUS resumable upload):

   ```bash
   npm run manual:upload
   ```

   Or pass a custom path: `node tools/manual/upload-pdf.mjs /path/to/manual.pdf`

   Uploads can be resumed if interrupted. After upload, the Workshop Manual tab serves the PDF from Supabase with 24-hour signed URLs — no Vercel deploy size limit.

## Searchable text (optional)

For procedure-level search (faster than scanning every PDF page), parse and import text chunks:

```bash
node tools/manual/parse-manual.mjs "public/manual/981-workshop-manual.pdf"
npm run db:import-manual
```

This populates `manual_sections` (migration `0006_manual.sql`). The PDF viewer still does page-level search; the DB index powers MCP / future UI search.
