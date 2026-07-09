// Bulk-load parsed manual / MTL chunks into Supabase `manual_sections`.
// Requires the SERVICE ROLE key (writes bypass RLS). Run after db:push:
//
//   npm run db:import-manual              (data/manual-981.json — workshop)
//   npm run db:import-mtl                 (data/mtl-981-987.json — tech library)
//
// Source JSON is gitignored (© Porsche — feed your own instance only).

import '../load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const file = process.argv[2] || 'data/manual-981.json';

if (!url || !key) {
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment.');
  process.exit(1);
}
if (!fs.existsSync(file)) {
  console.error(`${file} not found — run the matching parse script first.`);
  process.exit(1);
}

const chunks = JSON.parse(fs.readFileSync(file, 'utf8'));
const rows = chunks.map((c) => ({
  id: c.id,
  wm_code: c.wm ?? c.wm_code ?? null,
  group_code: c.group ?? c.group_code ?? null,
  group_label: c.groupLabel ?? c.group_label ?? null,
  title: c.title,
  subsection: c.subsection ?? null,
  models: c.models ?? null,
  page: c.page ?? 0,
  content: c.content ?? '',
  source: c.source ?? 'workshop',
  generation: c.generation ?? '981',
  doc_id: c.doc_id ?? c.docId ?? null,
}));

console.log(`Importing ${rows.length} sections from ${file}`);
const supabase = createClient(url, key, { auth: { persistSession: false } });

const BATCH = 100;
let done = 0;
for (let i = 0; i < rows.length; i += BATCH) {
  const batch = rows.slice(i, i + BATCH);
  // Guard against duplicate ids inside one batch (Postgres rejects that).
  const seen = new Set();
  const deduped = [];
  for (const r of batch) {
    if (seen.has(r.id)) continue;
    seen.add(r.id);
    deduped.push(r);
  }
  const { error } = await supabase.from('manual_sections').upsert(deduped, { onConflict: 'id' });
  if (error) {
    console.error(`batch @${i} failed:`, error.message);
    process.exit(1);
  }
  done += deduped.length;
  process.stdout.write(`\r${done}/${rows.length} upserted`);
}
console.log(`\n✓ imported ${done} sections`);
