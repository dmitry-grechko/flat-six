#!/usr/bin/env node
// Parse the 981 factory workshop manual PDF into searchable procedure chunks.
//
//   node tools/manual/parse-manual.mjs "<manual.pdf|manual.txt>" [out.json]
//
// Accepts either the PDF (runs `pdftotext -layout`, needs poppler) or an
// already-extracted text file. Splits the text into one chunk per WM procedure
// subsection (headings like "WM 197019 REMOVING AND INSTALLING RADIATOR (ALL
// MODELS) > REMOVING RADIATOR" repeat as page headers on continuation pages and
// are merged), strips boilerplate, records the source PDF page per chunk, and
// writes data/manual-981.json.
//
// COPYRIGHT: the manual text is © Porsche. The output JSON is gitignored — it
// feeds your own Supabase instance (npm run db:import-manual), never the repo.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const input = process.argv[2];
const outFile = process.argv[3] || 'data/manual-981.json';
if (!input || !fs.existsSync(input)) {
  console.error('Usage: node tools/manual/parse-manual.mjs "<manual.pdf|manual.txt>" [out.json]');
  process.exit(1);
}

// ---- 1. Get the raw text (pdftotext keeps \f page breaks) ----
let raw;
if (input.toLowerCase().endsWith('.pdf')) {
  const tmp = path.join(os.tmpdir(), `manual-${Date.now()}.txt`);
  execFileSync('pdftotext', ['-layout', input, tmp], { stdio: 'inherit' });
  raw = fs.readFileSync(tmp, 'utf8');
  fs.unlinkSync(tmp);
} else {
  raw = fs.readFileSync(input, 'utf8');
}

// ---- 2. Chunking ----
// Porsche workshop groups by leading digit of the WM code.
const GROUP_LABELS = {
  0: 'General & Maintenance',
  1: 'Engine',
  2: 'Fuel, Air & Exhaust',
  3: 'Transmission',
  4: 'Chassis, Brakes & Steering',
  5: 'Body',
  6: 'Body Exterior & Glazing',
  7: 'Interior & Safety',
  8: 'Heating & Air Conditioning',
  9: 'Electrical & Instruments',
};

const WM_RE = /^WM\s+([0-9A-Z]{4,6})\s+(.+)$/;
const NOISE_RE = [
  /^Courtesy of PORSCHE/i,
  /^Service Manual:.*(Porsche|BOXSTER|CAYMAN)/,
  /^\s*(Porsche Cayman|BOXSTER\/CAYMAN)\s*$/,
];
// Heading continuation lines are printed in caps (allow digits/punctuation).
const capsish = (s) => {
  const letters = s.replace(/[^A-Za-z]/g, '');
  if (!letters) return false;
  const upper = letters.replace(/[^A-Z]/g, '');
  return upper.length / letters.length > 0.85;
};

const lines = raw.split('\n');
const chunks = new Map(); // key → { …chunk fields, lines: [] }
let current = null;
let page = 1;
const MAX_CHARS = 8000;

const slug = (s) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 90);

function openChunk(code, headingText, pg) {
  // Heading shape: "TITLE (MODEL SCOPE) > SUBSECTION" (subsection optional).
  const [titlePart, ...subParts] = headingText.split('>');
  const subsection = subParts.join('>').trim() || null;
  const modelsMatch = titlePart.match(/\(([^)]*)\)\s*$/);
  const models = modelsMatch ? modelsMatch[1].trim() : null;
  const title = titlePart.replace(/\([^)]*\)\s*$/, '').trim();
  // Models kept in the key so CAYMAN-only vs BOXSTER-only variants of the same
  // procedure stay separate chunks (their content differs).
  const key = `${code ?? 'sec'}::${title}::${subsection ?? ''}::${models ?? ''}`;
  if (!chunks.has(key)) {
    chunks.set(key, {
      id: slug(`${code ?? 'sec'}-${title}-${subsection ?? ''}`),
      wm: code,
      group: code ? code[0] : null,
      groupLabel: code ? (GROUP_LABELS[code[0]] ?? null) : null,
      title, subsection, models,
      page: pg,
      lines: [],
    });
  }
  current = chunks.get(key);
}

for (let i = 0; i < lines.length; i++) {
  let line = lines[i];
  const pageBreaks = (line.match(/\f/g) || []).length;
  if (pageBreaks) { page += pageBreaks; line = line.replace(/\f/g, ''); }
  const trimmed = line.trim();

  if (NOISE_RE.some((re) => re.test(trimmed))) continue;

  // "Service Manual: SYSTEM WIRING DIAGRAMS"-style chapter splits without WM codes
  const svc = trimmed.match(/^Service Manual:\s+(.+?)\s*$/);
  if (svc) { openChunk(null, svc[1], page); continue; }

  const wm = trimmed.match(WM_RE);
  if (wm) {
    // Headings wrap: absorb following caps-ish lines into the heading.
    let heading = wm[2].trim();
    while (i + 1 < lines.length) {
      const next = lines[i + 1].trim();
      if (!next || WM_RE.test(next) || !capsish(next)) break;
      heading += ' ' + next;
      i++;
    }
    openChunk(wm[1], heading, page);
    continue;
  }

  if (current && trimmed) current.lines.push(trimmed);
}

// ---- 3. Emit rows (splitting oversized chunks, ids globally unique) ----
const rows = [];
const usedIds = new Set();
const uniqueId = (base) => {
  let id = base, n = 1;
  while (usedIds.has(id)) id = `${base}-${++n}`;
  usedIds.add(id);
  return id;
};
for (const c of chunks.values()) {
  const content = c.lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  if (!content) continue;
  if (content.length <= MAX_CHARS) {
    rows.push({ ...c, lines: undefined, id: uniqueId(c.id), content });
  } else {
    const parts = Math.ceil(content.length / MAX_CHARS);
    const baseId = uniqueId(c.id);
    for (let p = 0; p < parts; p++) {
      rows.push({
        ...c,
        lines: undefined,
        id: p === 0 ? baseId : uniqueId(`${baseId}-p${p + 1}`),
        title: parts > 1 ? `${c.title} (${p + 1}/${parts})` : c.title,
        content: content.slice(p * MAX_CHARS, (p + 1) * MAX_CHARS),
      });
    }
  }
}

fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, JSON.stringify(rows, null, 1) + '\n');

const withWm = rows.filter((r) => r.wm).length;
console.log(`✓ ${rows.length} chunks (${withWm} WM procedures, ${rows.length - withWm} other sections) → ${outFile}`);
console.log(`  total text: ${(rows.reduce((n, r) => n + r.content.length, 0) / 1e6).toFixed(1)} MB`);
