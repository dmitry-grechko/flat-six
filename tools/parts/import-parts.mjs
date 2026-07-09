// Bulk-load the parsed parts catalog into the Supabase `parts` table.
// Requires the SERVICE ROLE key (writes bypass RLS). Run once after db:push:
//
//   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
//     node tools/parts/import-parts.mjs [data/parts-981.json]
//
// The service role key is in Supabase → Project Settings → API ("service_role").
// It is a secret — never commit it or expose it to the browser.

import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const file = process.argv[2] || 'data/parts-981.json';

if (!url || !key) {
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment.');
  process.exit(1);
}

// Generation this catalog belongs to: explicit override, else inferred from the
// filename (parts-981.json → "981", parts-991.json → "991"), else "981".
const generation =
  process.env.PARTS_GENERATION ||
  (file.match(/parts-([a-z0-9]+)\.json/i)?.[1]) ||
  '981';

const parts = JSON.parse(fs.readFileSync(file, 'utf8'));
const rows = parts.map((p) => ({
  part_number: p.partNumber,
  description: p.description ?? '',
  system: p.system ?? null,
  groups: p.groups ?? [],
  models: p.models ?? [],
  // Prefer an explicit generations[] in the data; else tag with this catalog's generation.
  generations: p.generations ?? [generation],
}));

console.log(`Importing ${rows.length} parts for generation "${generation}" from ${file}`);
// NOTE: a part shared across generations lands in whichever catalog is imported
// last (upsert overwrites generations[]). When a 2nd generation's catalog shares
// part numbers, union the arrays instead so the row is tagged with both.

const supabase = createClient(url, key, { auth: { persistSession: false } });

const BATCH = 500;
let done = 0;
for (let i = 0; i < rows.length; i += BATCH) {
  const batch = rows.slice(i, i + BATCH);
  const { error } = await supabase.from('parts').upsert(batch, { onConflict: 'part_number' });
  if (error) {
    console.error(`batch @${i} failed:`, error.message);
    process.exit(1);
  }
  done += batch.length;
  process.stdout.write(`\r${done}/${rows.length} upserted`);
}
console.log(`\n✓ imported ${done} parts`);
