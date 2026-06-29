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

const parts = JSON.parse(fs.readFileSync(file, 'utf8'));
const rows = parts.map((p) => ({
  part_number: p.partNumber,
  description: p.description ?? '',
  system: p.system ?? null,
  groups: p.groups ?? [],
  models: p.models ?? [],
}));

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
