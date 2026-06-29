#!/usr/bin/env node
// Verifies that every PRIMARY part in each *-parts.json has a matching named
// node in the corresponding generated GLB (so the app can place a pin on it).
//
//   node tools/gen/verify-coverage.mjs

import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIR = join(__dirname, '..', '..', 'public', 'models', 'components');

function glbNodeNames(path) {
  const buf = readFileSync(path);
  const jsonLen = buf.readUInt32LE(12);
  const json = JSON.parse(buf.slice(20, 20 + jsonLen).toString('utf8').replace(/\0+$/, '').trimEnd());
  const names = new Set();
  (json.nodes || []).forEach((n) => n.name && names.add(n.name));
  (json.meshes || []).forEach((m) => m.name && names.add(m.name));
  return names;
}

const FILES = ['engine', 'trans', 'exhaust', 'cooling', 'oil', 'airfilter', 'plugs', 'fbrakes', 'rbrakes', 'susp', 'elec', 'driveline'];

let allGood = true;
const pad = (s, n) => String(s).padEnd(n);
console.log('\n' + pad('ASSEMBLY', 12) + pad('PRIMARY', 9) + pad('MATCHED', 9) + pad('%', 6) + 'MISSING PRIMARY NODES');
console.log('-'.repeat(90));

for (const f of FILES) {
  let names;
  try { names = glbNodeNames(join(DIR, f + '.glb')); }
  catch (e) { console.log(pad(f, 12) + 'GLB ERROR: ' + e.message); allGood = false; continue; }
  const parts = JSON.parse(readFileSync(join(DIR, f + '-parts.json'), 'utf8')).parts;
  const primary = parts.filter((p) => (p.tier || 'primary') !== 'sub');
  const missing = primary.filter((p) => !names.has(p.node));
  const matched = primary.length - missing.length;
  const pct = primary.length ? Math.round((100 * matched) / primary.length) : 100;
  if (pct < 100) allGood = false;
  console.log(
    pad(f, 12) + pad(primary.length, 9) + pad(matched, 9) + pad(pct + '%', 6) +
    (missing.length ? missing.map((p) => p.node).slice(0, 8).join(', ') + (missing.length > 8 ? ` …(+${missing.length - 8})` : '') : '✓')
  );
}
console.log('-'.repeat(90));
console.log(allGood ? 'ALL PRIMARY PARTS HAVE A PIN ANCHOR ✓\n' : 'Some primary parts have no matching node — pins will not render for them.\n');
process.exit(allGood ? 0 : 1);
