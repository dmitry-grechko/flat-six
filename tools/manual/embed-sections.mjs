// Backfill Voyage embeddings into manual_sections.embedding (pgvector).
// Requires the SERVICE ROLE key (writes bypass RLS) and VOYAGE_API_KEY.
// Run AFTER db:push (migration 0009):
//
//   npm run db:embed-manual
//
// Idempotent + resumable: only rows with embedding IS NULL are processed, so a
// killed run just continues. voyage-4-lite, input_type 'document', 1024-dim.
// The 200M free-token allowance covers the whole corpus many times over; with a
// payment method on the Voyage account (Tier 1, 8M TPM) this finishes in minutes.

import '../load-env.mjs';
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const voyageKey = process.env.VOYAGE_API_KEY;
const MODEL = process.env.VOYAGE_MODEL || 'voyage-4-lite';
const DIM = 1024;
const BATCH = Number(process.env.EMBED_BATCH) || 96; // texts per Voyage request
const SLEEP_MS = Number(process.env.EMBED_SLEEP_MS) || 0; // set >0 to throttle on the free tier

if (!url || !key) {
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}
if (!voyageKey) {
  console.error('Set VOYAGE_API_KEY (get one at https://dashboard.voyageai.com — add a payment method for Tier-1 throughput; still $0 under the 200M free tokens).');
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function embedBatch(texts, attempt = 0) {
  const res = await fetch('https://api.voyageai.com/v1/embeddings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${voyageKey}` },
    body: JSON.stringify({ model: MODEL, input: texts, input_type: 'document', output_dimension: DIM }),
  });
  if (res.status === 429 && attempt < 6) {
    const wait = 2000 * 2 ** attempt;
    console.log(`\n  rate-limited (429) — waiting ${wait / 1000}s (free tier is 10K TPM; add a payment method for 8M TPM)`);
    await sleep(wait);
    return embedBatch(texts, attempt + 1);
  }
  if (!res.ok) throw new Error(`Voyage ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const json = await res.json();
  const sorted = [...json.data].sort((a, b) => a.index - b.index);
  return { vectors: sorted.map((d) => d.embedding), tokens: json.usage?.total_tokens ?? 0 };
}

// Run promise-producing tasks with bounded concurrency.
async function pool(items, limit, fn) {
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      await fn(items[idx]);
    }
  });
  await Promise.all(workers);
}

const { count: total } = await sb
  .from('manual_sections')
  .select('*', { count: 'exact', head: true })
  .is('embedding', null);

console.log(`Embedding ${total ?? '?'} sections with ${MODEL} (${DIM}-dim)…`);

let done = 0;
let tokens = 0;
for (;;) {
  const { data: rows, error } = await sb
    .from('manual_sections')
    .select('id, title, group_label, content')
    .is('embedding', null)
    .order('id', { ascending: true })
    .limit(BATCH);
  if (error) {
    console.error('\nfetch failed:', error.message);
    process.exit(1);
  }
  if (!rows || rows.length === 0) break;

  const texts = rows.map((r) =>
    [r.title, r.group_label, r.content].filter(Boolean).join('\n').slice(0, 8000),
  );
  const { vectors, tokens: t } = await embedBatch(texts);
  tokens += t;

  await pool(
    rows.map((r, k) => ({ id: r.id, vec: vectors[k] })),
    24,
    async ({ id, vec }) => {
      const { error: uErr } = await sb
        .from('manual_sections')
        .update({ embedding: `[${vec.join(',')}]` })
        .eq('id', id);
      if (uErr) throw new Error(`update ${id}: ${uErr.message}`);
    },
  );

  done += rows.length;
  process.stdout.write(`\r${done}/${total ?? '?'} embedded · ${tokens.toLocaleString()} tokens`);
  if (SLEEP_MS) await sleep(SLEEP_MS);
}

const cost = (tokens / 1e6) * 0.02; // voyage-4-lite list price; $0 under free tokens
console.log(`\n✓ embedded ${done} sections · ${tokens.toLocaleString()} tokens (list ≈ $${cost.toFixed(4)}, $0 under the free tier)`);
