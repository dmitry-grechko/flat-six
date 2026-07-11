# Tech library (local only)

Place the unzipped Mobile Technical Library (or equivalent reference set) here.
The folder is **gitignored** (large; third-party rights reserved).

Expected layout:

```
Diagnostic Information/
Service Information Technik/
Training Books/
Other Documents/
```

The app catalogs **981 + 987** docs in `lib/documents.ts` and serves them from
the Documents tab. For production, upload with `npm run docs:upload -- --mtl-only`.
See `tools/manual/README.md`.
