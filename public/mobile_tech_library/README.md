# Mobile Tech Library (local only)

Place the unzipped Porsche Mobile Technical Library here. The folder is
**gitignored** (~3 GB, © Porsche).

Expected layout (from the MTL zip):

```
Diagnostic Information/
Service Information Technik/
Training Books/
Other Documents/
Porsche Classic/
```

The app catalogs **981 + 987** docs in `lib/documents.ts` and serves them from
the Documents tab. For production, upload with `npm run docs:upload -- --mtl-only`.
See `tools/manual/README.md`.
