#!/usr/bin/env node
/**
 * Parse compressed 987 workshop volumes into searchable procedure chunks.
 *
 *   node tools/manual/parse-987-workshop.mjs 9871
 *   node tools/manual/parse-987-workshop.mjs 9872
 *
 * Reads public/manual/volumes-{id}.json + the volume PDFs, runs the same WM
 * chunking as parse-manual.mjs, tags generation=987 / source=workshop, prefixes
 * ids so they never collide with 981, and sets doc_id to the volume that owns
 * each absolute page.
 *
 * Output: data/manual-987-{id}.json (gitignored) → npm run db:import-manual -- …
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const series = process.argv[2]; // 9871 | 9872
if (!series || !['9871', '9872'].includes(series)) {
  console.error('Usage: node tools/manual/parse-987-workshop.mjs <9871|9872>');
  process.exit(1);
}

const manifestPath = path.join(ROOT, `public/manual/volumes-${series}.json`);
if (!fs.existsSync(manifestPath)) {
  console.error(`Missing ${manifestPath} — run compress-987-workshop.mjs first.`);
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const outFile = path.join(ROOT, `data/manual-987-${series}.json`);
const ID_PREFIX = `${series}-`;

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
// Mitchell FSM procedure codes, e.g. "03 24 00 MINOR MAINTENANCE - AS OF MY 2005…"
const MITCHELL_PROC_RE = /^(\d{2}\s+\d{2}\s+\d{2})\s+(.+)$/;
// Mitchell section intros, e.g. "03 TEST DRIVE - AS OF MY 2005…" / "03 IN RUNNING GEAR…"
const MITCHELL_SEC_RE = /^(\d{2})\s+((?:IN\s+)?[A-Z][A-Z0-9][A-Z0-9\s,\-\/:().']{8,})$/;
const NOISE_RE = [
  /^Courtesy of PORSCHE/i,
  /^Service Manual:.*(Porsche|BOXSTER|CAYMAN)/,
  /^\s*(Porsche Cayman|BOXSTER\/CAYMAN|Back To Article)\s*$/i,
  /^Microsoft\s*$/i,
  /^Page \d+\s*$/i,
  /^© \d{4} (Mitchell|Dr\. Ing)/i,
  /^Automotive-Manual\.net/i,
  /^\d{4} Porsche (Cayman|Boxster)/i,
  /^GENERAL INFORMATION\s*$/i,
  /^Fig\.\s+\d+/i,
];

const capsish = (s) => {
  const letters = s.replace(/[^A-Za-z]/g, '');
  if (!letters) return false;
  const upper = letters.replace(/[^A-Z]/g, '');
  return upper.length / letters.length > 0.85;
};

const slug = (s) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 90);

const MAX_CHARS = 8000;

function parseText(raw, pageOffset, volumeId) {
  const chunks = new Map();
  let current = null;
  let page = pageOffset; // absolute page within the full manual

  function openChunk(code, headingText, pg) {
    const [titlePart, ...subParts] = headingText.split('>');
    const subsection = subParts.join('>').trim() || null;
    const modelsMatch = titlePart.match(/\(([^)]*)\)\s*$/);
    const models = modelsMatch ? modelsMatch[1].trim() : null;
    const title = titlePart.replace(/\([^)]*\)\s*$/, '').trim();
    const key = `${code ?? 'sec'}::${title}::${subsection ?? ''}::${models ?? ''}`;
    if (!chunks.has(key)) {
      chunks.set(key, {
        id: slug(`${code ?? 'sec'}-${title}-${subsection ?? ''}`),
        wm: code,
        group: code ? code[0] : null,
        groupLabel: code ? (GROUP_LABELS[code[0]] ?? null) : null,
        title,
        subsection,
        models,
        page: pg,
        doc_id: volumeId,
        source: 'workshop',
        generation: '987',
        lines: [],
      });
    }
    current = chunks.get(key);
  }

  const lines = raw.split('\n');
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    const pageBreaks = (line.match(/\f/g) || []).length;
    if (pageBreaks) {
      page += pageBreaks;
      line = line.replace(/\f/g, '');
    }
    const trimmed = line.trim();
    if (NOISE_RE.some((re) => re.test(trimmed))) continue;

    const svc = trimmed.match(/^Service Manual:\s+(.+?)\s*$/);
    if (svc) {
      openChunk(null, svc[1], page);
      continue;
    }

    const wm = trimmed.match(WM_RE);
    if (wm) {
      let heading = wm[2].trim();
      while (i + 1 < lines.length) {
        const next = lines[i + 1].trim();
        if (!next || WM_RE.test(next) || MITCHELL_PROC_RE.test(next) || !capsish(next)) break;
        heading += ' ' + next;
        i++;
      }
      openChunk(wm[1], heading, page);
      continue;
    }

    const mitProc = trimmed.match(MITCHELL_PROC_RE);
    if (mitProc) {
      let heading = mitProc[2].trim();
      while (i + 1 < lines.length) {
        const next = lines[i + 1].trim();
        if (
          !next ||
          WM_RE.test(next) ||
          MITCHELL_PROC_RE.test(next) ||
          MITCHELL_SEC_RE.test(next) ||
          !capsish(next)
        )
          break;
        heading += ' ' + next;
        i++;
      }
      // Normalize "03 24 00" → "032400" for wm_code grouping
      openChunk(mitProc[1].replace(/\s+/g, ''), heading, page);
      continue;
    }

    const mitSec = trimmed.match(MITCHELL_SEC_RE);
    if (mitSec) {
      let heading = mitSec[2].trim();
      while (i + 1 < lines.length) {
        const next = lines[i + 1].trim();
        if (
          !next ||
          WM_RE.test(next) ||
          MITCHELL_PROC_RE.test(next) ||
          MITCHELL_SEC_RE.test(next) ||
          !capsish(next)
        )
          break;
        heading += ' ' + next;
        i++;
      }
      openChunk(mitSec[1] + '00', heading, page);
      continue;
    }

    if (current && trimmed) current.lines.push(trimmed);
  }
  return chunks;
}

function emitRows(chunks) {
  const rows = [];
  const usedIds = new Set();
  const uniqueId = (base) => {
    let id = ID_PREFIX + base;
    let n = 1;
    while (usedIds.has(id)) id = `${ID_PREFIX}${base}-${++n}`;
    usedIds.add(id);
    return id;
  };

  for (const c of chunks.values()) {
    const content = c.lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
    if (!content) continue;
    const { lines: _l, ...meta } = c;
    if (content.length <= MAX_CHARS) {
      rows.push({ ...meta, id: uniqueId(c.id), content });
    } else {
      const parts = Math.ceil(content.length / MAX_CHARS);
      const baseId = uniqueId(c.id);
      for (let p = 0; p < parts; p++) {
        rows.push({
          ...meta,
          id: p === 0 ? baseId : uniqueId(`${c.id}-p${p + 1}`),
          title: parts > 1 ? `${c.title} (${p + 1}/${parts})` : c.title,
          content: content.slice(p * MAX_CHARS, (p + 1) * MAX_CHARS),
        });
      }
    }
  }
  return rows;
}

const allRows = [];
for (const vol of manifest.volumes) {
  const pdf = path.join(ROOT, 'public/manual', vol.file);
  if (!fs.existsSync(pdf)) {
    console.error(`Missing volume PDF ${pdf}`);
    process.exit(1);
  }
  process.stdout.write(`  Parsing ${vol.file} (abs pages ${vol.startPage}–${vol.endPage})…`);
  const tmp = path.join(os.tmpdir(), `manual-987-${series}-${vol.index ?? vol.id}-${Date.now()}.txt`);
  execFileSync('pdftotext', ['-layout', pdf, tmp], { stdio: 'ignore' });
  const raw = fs.readFileSync(tmp, 'utf8');
  fs.unlinkSync(tmp);
  // pageOffset: first page of this volume is vol.startPage; pdftotext starts at page 1
  // of the slice, so absolute = startPage + (localPage - 1). We seed page=startPage
  // and bump on each \f (which marks the START of the next page after content).
  const chunks = parseText(raw, vol.startPage, vol.id);
  const rows = emitRows(chunks);
  console.log(` ${rows.length} chunks`);
  allRows.push(...rows);
}

// Deduplicate ids across volumes (emitRows is per-volume)
const seen = new Set();
const deduped = [];
for (const r of allRows) {
  let id = r.id;
  let n = 1;
  while (seen.has(id)) id = `${r.id}-x${++n}`;
  seen.add(id);
  deduped.push({ ...r, id });
}

fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, JSON.stringify(deduped, null, 1) + '\n');
const withWm = deduped.filter((r) => r.wm).length;
console.log(
  `✓ ${deduped.length} chunks (${withWm} WM procedures) → ${path.relative(ROOT, outFile)}`,
);
console.log(
  `  total text: ${(deduped.reduce((n, r) => n + r.content.length, 0) / 1e6).toFixed(1)} MB`,
);
