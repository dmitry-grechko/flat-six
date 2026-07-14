#!/usr/bin/env node
// FLAT·SIX knowledge-base linter.
//
// Validates the structural integrity of every generation's knowledge bundle
// (fault codes, specs, maintenance, known issues) against the contract in
// lib/knowledge/types.ts — so a broken DTC, a duplicate id, or an out-of-set
// system/severity can't silently ship to the RAG search + MCP tools.
//
//   node tools/knowledge/lint.mjs      # lints every generation
//   npm run kb:lint
//
// Generations are auto-discovered from lib/knowledge/fault-codes*.json, so a
// new generation is linted automatically once its JSON files land.

import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const KB_DIR = join(__dirname, '..', '..', 'lib', 'knowledge');

// ---- Contract (mirrors lib/knowledge/types.ts) --------------------------
const SYSTEMS = new Set([
  'Engine', 'Brakes', 'Cooling', 'Transmission', 'HVAC', 'Electrical',
  'Fuel', 'Steering', 'Exhaust', 'Wheels', 'Body', 'Suspension',
]);
const SEVERITIES = new Set(['LOW', 'MED', 'HIGH']);
const SPEC_CATEGORIES = new Set(['torque', 'fluid', 'capacity', 'tolerance', 'electrical', 'tyre']);
const DTC_RE = /^[PBCU][0-3][0-9A-F]{3}$/; // OBD-II DTC, incl. valid hex-tail codes like P000A / U0100
const MANUFACTURER_DTC_RE = /^[0-9A-F]{6}$/i; // Porsche/UDS raw codes (e.g. 000401, 89020E)

// ---- Discover generations -----------------------------------------------
// <base>.json -> '981' (default); <base>-<gen>.json -> '<gen>'. Scans every
// bundle base so a generation with only some bundles (e.g. audi-b9 = specs only)
// is still linted.
function discoverGenerations() {
  const gens = new Set();
  for (const f of readdirSync(KB_DIR)) {
    const m = f.match(/^(?:fault-codes|specs|maintenance|known-issues)(?:-([^.]+))?\.json$/);
    if (m) gens.add(m[1] ?? '981');
  }
  return [...gens].sort();
}

function load(gen, base) {
  const suffix = gen === '981' ? '' : `-${gen}`;
  const path = join(KB_DIR, `${base}${suffix}.json`);
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (e) {
    if (e.code === 'ENOENT') return null; // an optional bundle file simply isn't present yet
    throw new Error(`${base}${suffix}.json: ${e.message}`);
  }
}

// ---- Field helpers -------------------------------------------------------
const isNonEmptyStr = (v) => typeof v === 'string' && v.trim().length > 0;
const isNonEmptyArr = (v) => Array.isArray(v) && v.length > 0 && v.every(isNonEmptyStr);

function lintGeneration(gen) {
  const errors = [];
  const counts = { faults: 0, specs: 0, maintenance: 0, issues: 0 };
  const push = (kind, i, id, msg) => errors.push(`[${gen}] ${kind}[${i}]${id ? ` (${id})` : ''}: ${msg}`);
  const dedupe = () => new Set();

  // Fault codes
  const faults = load(gen, 'fault-codes') ?? [];
  counts.faults = faults.length;
  const seenCodes = dedupe();
  faults.forEach((f, i) => {
    const id = f.code;
    if (!isNonEmptyStr(f.code)) push('fault', i, id, 'missing code');
    else {
      if (!DTC_RE.test(f.code) && !MANUFACTURER_DTC_RE.test(f.code)) push('fault', i, id, `code "${f.code}" is not a valid OBD-II DTC (expected e.g. P0301, P000A, U0100) or 6-digit manufacturer code`);
      if (seenCodes.has(f.code)) push('fault', i, id, `duplicate code "${f.code}"`);
      seenCodes.add(f.code);
    }
    if (!isNonEmptyStr(f.title)) push('fault', i, id, 'missing title');
    if (!isNonEmptyStr(f.description)) push('fault', i, id, 'missing description');
    if (!SYSTEMS.has(f.system)) push('fault', i, id, `invalid system "${f.system}"`);
    if (!SEVERITIES.has(f.severity)) push('fault', i, id, `invalid severity "${f.severity}"`);
    if (!isNonEmptyArr(f.symptoms)) push('fault', i, id, 'symptoms must be a non-empty string[]');
    if (!isNonEmptyArr(f.causes)) push('fault', i, id, 'causes must be a non-empty string[]');
    if (!isNonEmptyArr(f.diagnosis)) push('fault', i, id, 'diagnosis must be a non-empty string[]');
  });

  // Specs
  const specs = load(gen, 'specs') ?? [];
  counts.specs = specs.length;
  const seenSpecIds = dedupe();
  specs.forEach((s, i) => {
    const id = s.id;
    if (!isNonEmptyStr(s.id)) push('spec', i, id, 'missing id');
    else { if (seenSpecIds.has(s.id)) push('spec', i, id, `duplicate id "${s.id}"`); seenSpecIds.add(s.id); }
    if (!SPEC_CATEGORIES.has(s.category)) push('spec', i, id, `invalid category "${s.category}"`);
    if (!isNonEmptyStr(s.name)) push('spec', i, id, 'missing name');
    if (!isNonEmptyStr(s.value)) push('spec', i, id, 'missing value');
  });

  // Maintenance
  const maint = load(gen, 'maintenance') ?? [];
  counts.maintenance = maint.length;
  const seenMaintIds = dedupe();
  maint.forEach((m, i) => {
    const id = m.id;
    if (!isNonEmptyStr(m.id)) push('maintenance', i, id, 'missing id');
    else { if (seenMaintIds.has(m.id)) push('maintenance', i, id, `duplicate id "${m.id}"`); seenMaintIds.add(m.id); }
    if (!isNonEmptyStr(m.task)) push('maintenance', i, id, 'missing task');
    if (!SYSTEMS.has(m.system)) push('maintenance', i, id, `invalid system "${m.system}"`);
  });

  // Known issues
  const issues = load(gen, 'known-issues') ?? [];
  counts.issues = issues.length;
  const seenIssueIds = dedupe();
  issues.forEach((k, i) => {
    const id = k.id;
    if (!isNonEmptyStr(k.id)) push('issue', i, id, 'missing id');
    else { if (seenIssueIds.has(k.id)) push('issue', i, id, `duplicate id "${k.id}"`); seenIssueIds.add(k.id); }
    if (!isNonEmptyStr(k.title)) push('issue', i, id, 'missing title');
    if (!isNonEmptyStr(k.affected)) push('issue', i, id, 'missing affected');
    if (!isNonEmptyStr(k.description)) push('issue', i, id, 'missing description');
    if (!isNonEmptyStr(k.fix)) push('issue', i, id, 'missing fix');
    if (!SYSTEMS.has(k.system)) push('issue', i, id, `invalid system "${k.system}"`);
    if (!SEVERITIES.has(k.severity)) push('issue', i, id, `invalid severity "${k.severity}"`);
    if (!isNonEmptyArr(k.symptoms)) push('issue', i, id, 'symptoms must be a non-empty string[]');
  });

  return { counts, errors };
}

// ---- Run -----------------------------------------------------------------
const gens = discoverGenerations();
if (gens.length === 0) {
  console.error('kb:lint — no knowledge bundles found in lib/knowledge/');
  process.exit(1);
}

const pad = (s, n) => String(s).padEnd(n);
console.log(`\nFLAT·SIX knowledge-base lint — generations: ${gens.join(', ')}\n`);
console.log(pad('GEN', 6) + pad('FAULTS', 8) + pad('SPECS', 7) + pad('MAINT', 7) + pad('ISSUES', 8) + 'STATUS');
console.log('-'.repeat(54));

const allErrors = [];
for (const gen of gens) {
  const { counts, errors } = lintGeneration(gen);
  allErrors.push(...errors);
  console.log(
    pad(gen, 6) + pad(counts.faults, 8) + pad(counts.specs, 7) +
    pad(counts.maintenance, 7) + pad(counts.issues, 8) +
    (errors.length ? `✗ ${errors.length} error(s)` : '✓ ok')
  );
}

if (allErrors.length) {
  console.log('\n' + allErrors.join('\n'));
  console.log(`\nkb:lint FAILED — ${allErrors.length} error(s).\n`);
  process.exit(1);
}
console.log('\nkb:lint passed — all knowledge bundles valid.\n');
