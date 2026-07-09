#!/usr/bin/env node
/**
 * Extract workshop-manual pages to tools/gen/wm-refs/<gen>/<section>/
 *
 *   node tools/gen/wm-refs/extract-pages.mjs --gen 981 --section engine --from 3640 --to 3654 --label crank-chains
 */

import { mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..', '..');

function arg(name, def) {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return def;
  return process.argv[i + 1] ?? def;
}

const gen = arg('gen', '981');
const section = arg('section', 'misc');
const from = Number(arg('from'));
const to = Number(arg('to', String(from)));
const label = arg('label', `pages-${from}`);
const dpi = arg('dpi', '150');

if (!from || Number.isNaN(from)) {
  console.error('Usage: --gen 981 --section engine --from N --to M --label name');
  process.exit(1);
}

const pdf = join(ROOT, 'public', 'manual', `${gen}-workshop-manual.pdf`);
if (!existsSync(pdf)) {
  console.error(`PDF missing: ${pdf}`);
  process.exit(1);
}

const outDir = join(ROOT, 'tools', 'gen', 'wm-refs', gen, section);
mkdirSync(outDir, { recursive: true });
const prefix = join(outDir, label);

const r = spawnSync('pdftoppm', ['-f', String(from), '-l', String(to), '-png', '-r', dpi, pdf, prefix], {
  stdio: 'inherit',
});
if (r.status !== 0) process.exit(r.status ?? 1);
console.log(`OK → ${outDir}/${label}-*.png`);
