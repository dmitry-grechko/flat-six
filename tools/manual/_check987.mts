// TEMP: verify every 987-applicable catalog doc exists in the restructured
// workshop-manual bucket. Reads DOCUMENTS straight from lib/documents.ts.
import { DOCUMENTS } from '../../lib/documents.ts';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const enc = (p: string) => p.split('/').map(encodeURIComponent).join('/');

// A 987 vehicle sees docs tagged '987' or 'shared'.
const docs = DOCUMENTS.filter(
  (d) => d.generations.includes('987') || d.generations.includes('shared'),
);

const missing: string[] = [];
for (const d of docs) {
  const res = await fetch(
    `${url}/storage/v1/object/sign/workshop-manual/${enc(d.storagePath)}`,
    {
      method: 'POST',
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ expiresIn: 60 }),
    },
  );
  const j = await res.json();
  if (!j.signedURL) missing.push(`${d.title}  →  ${d.storagePath}  (${j.error ?? res.status})`);
}

console.log(`987 + shared catalog docs: ${docs.length}`);
console.log(`present: ${docs.length - missing.length}  |  missing: ${missing.length}`);
missing.forEach((m) => console.log('  MISSING:', m));
// Also break down by category for a sanity view.
const byCat: Record<string, number> = {};
for (const d of docs) byCat[d.category] = (byCat[d.category] ?? 0) + 1;
console.log('by category:', JSON.stringify(byCat));
