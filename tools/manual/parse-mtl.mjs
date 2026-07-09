#!/usr/bin/env node
// Parse Mobile Tech Library PDFs (981 + 987) into searchable chunks for
// Supabase `manual_sections`.
//
//   node tools/manual/parse-mtl.mjs
//   → data/mtl-981-987.json
//
// Needs poppler (`brew install poppler`). Only processes curated 981/987
// diagnostic, SIT yearbooks, and selected training books — not the full
// 2.5k-PDF MTL dump.
//
// COPYRIGHT: © Porsche. Output JSON is gitignored.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const PUBLIC = path.join(ROOT, 'public');
const outFile = process.argv[2] || path.join(ROOT, 'data/mtl-981-987.json');

const TARGETS = [
  {
    generation: '981',
    source: 'mtl-diagnostic',
    dir: path.join(PUBLIC, 'mobile_tech_library/Diagnostic Information/981 Boxster-Cayman'),
  },
  {
    generation: '987',
    source: 'mtl-diagnostic',
    dir: path.join(PUBLIC, 'mobile_tech_library/Diagnostic Information/987 Boxster-Cayman'),
  },
  {
    generation: null,
    source: 'mtl-sit',
    dir: path.join(PUBLIC, 'mobile_tech_library/Service Information Technik/Boxster-Cayman'),
    sitYears: {
      2005: '987', 2006: '987', 2007: '987', 2009: '987', 2011: '987',
      2013: '981', 2014: '981', 2016: '981',
    },
  },
  {
    generation: 'shared',
    source: 'mtl-training',
    dir: path.join(PUBLIC, 'mobile_tech_library/Training Books'),
    allow: [
      'P10W 911 Carrera-Boxster-Cayman Engine Repair.pdf',
      'P10W 997-987 Gen II Engine Repair.pdf',
      'P52 991-981 Body and Structural Repair.pdf',
      'P001 General Repair and Servicing-Sports Cars.pdf',
      'P30 Drivetrain Repair-Sports Cars.pdf',
      'P40 Chassis, Steering, Brakes, and Alignment.pdf',
      'P60 Soft Roof and Body Systems.pdf',
      'P80 Climate Control Systems, Diagnosis and Repair.pdf',
      'P90 Electrical Systems.pdf',
      'P95 Advanced Electrical Systems.pdf',
      'P21 Fuel and Ignition Diagnosis.pdf',
      'PIWIS Tester III.pdf',
    ],
    generationOverride: {
      'P10W 997-987 Gen II Engine Repair.pdf': '987',
      'P52 991-981 Body and Structural Repair.pdf': '981',
      'P10W 911 Carrera-Boxster-Cayman Engine Repair.pdf': '987',
    },
  },
];

const MAX_CHARS = 6000;
const CODE_HEADING = /^([PBCU][0-9A-Z]{3,5})\s*[.\u2026\-–—:]/;
const ALL_CAPS_HEADING = /^([A-Z][A-Z0-9 /,&()\-]{8,120})$/;

function slug(s, max = 120) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, max);
}

function shortHash(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36).slice(0, 6);
}

function walkPdfs(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walkPdfs(p));
    else if (ent.name.toLowerCase().endsWith('.pdf')) out.push(p);
  }
  return out;
}

function extractText(pdfPath) {
  const tmp = path.join(os.tmpdir(), `mtl-${Date.now()}-${Math.random().toString(36).slice(2)}.txt`);
  try {
    execFileSync('pdftotext', ['-layout', pdfPath, tmp], { stdio: 'pipe' });
    return fs.readFileSync(tmp, 'utf8');
  } finally {
    try { fs.unlinkSync(tmp); } catch { /* ignore */ }
  }
}

function docIdFor(pdfPath, generation) {
  const rel = path.relative(path.join(PUBLIC, 'mobile_tech_library'), pdfPath);
  const base = slug(rel.replace(/\.pdf$/i, ''), 70);
  return `mtl-${generation}-${base}-${shortHash(rel)}`;
}

function friendlyTitle(pdfPath) {
  return path.basename(pdfPath, '.pdf').replace(/^\d{4}\s+/, '').replace(/\s+/g, ' ').trim();
}

function chunkPdf(pdfPath, { generation, source, uniqueId }) {
  const raw = extractText(pdfPath);
  const lines = raw.split('\n');
  const docTitle = friendlyTitle(pdfPath);
  const docId = docIdFor(pdfPath, generation);
  const chunks = [];
  let page = 1;
  let current = {
    title: docTitle,
    subsection: null,
    wm: null,
    page: 1,
    lines: [],
  };

  const flush = () => {
    const content = current.lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
    if (!content || content.length < 40) {
      current.lines = [];
      return;
    }
    chunks.push({
      title: current.title,
      subsection: current.subsection,
      wm: current.wm,
      page: current.page,
      content,
    });
    current.lines = [];
  };

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    const breaks = (line.match(/\f/g) || []).length;
    if (breaks) { page += breaks; line = line.replace(/\f/g, ''); }
    const trimmed = line.trim();
    if (!trimmed) continue;

    const code = trimmed.match(CODE_HEADING);
    if (code && trimmed.length < 80) {
      flush();
      current = {
        title: docTitle,
        subsection: code[1],
        wm: code[1],
        page,
        lines: [trimmed],
      };
      continue;
    }

    if (ALL_CAPS_HEADING.test(trimmed) && !/\.{3,}/.test(trimmed) && trimmed.length < 100) {
      flush();
      current = {
        title: docTitle,
        subsection: trimmed,
        wm: null,
        page,
        lines: [],
      };
      continue;
    }

    current.lines.push(trimmed);
  }
  flush();

  if (chunks.length === 0) {
    const content = raw.replace(/\f/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
    if (content.length >= 40) {
      chunks.push({ title: docTitle, subsection: null, wm: null, page: 1, content });
    }
  }

  const rows = [];
  const groupLabel =
    source === 'mtl-diagnostic' ? 'Diagnostic' :
    source === 'mtl-sit' ? 'Service Information' :
    source === 'mtl-training' ? 'Training' : null;

  for (let ci = 0; ci < chunks.length; ci++) {
    const c = chunks[ci];
    const parts = Math.max(1, Math.ceil(c.content.length / MAX_CHARS));
    for (let p = 0; p < parts; p++) {
      const slice = c.content.slice(p * MAX_CHARS, (p + 1) * MAX_CHARS);
      const base = `${docId}-${slug(c.wm || c.subsection || `sec${ci}`, 40)}${parts > 1 ? `-p${p + 1}` : ''}`;
      rows.push({
        id: uniqueId(base),
        wm: c.wm,
        group: null,
        groupLabel,
        title: parts > 1 ? `${c.title} (${p + 1}/${parts})` : c.title,
        subsection: c.subsection,
        models: null,
        page: c.page,
        content: slice,
        source,
        generation,
        doc_id: docId,
      });
    }
  }
  return rows;
}

const allRows = [];
const usedIds = new Set();
let pdfCount = 0;

const uniqueId = (base) => {
  let id = base;
  let n = 1;
  while (usedIds.has(id)) id = `${base}-${++n}`;
  usedIds.add(id);
  return id;
};

for (const target of TARGETS) {
  let files = walkPdfs(target.dir);
  if (target.allow) {
    const allow = new Set(target.allow);
    files = files.filter((f) => allow.has(path.basename(f)));
  }
  if (target.sitYears) {
    files = files.filter((f) => {
      const year = parseInt(path.basename(f).slice(0, 4), 10);
      return target.sitYears[year];
    });
  }

  for (const pdf of files.sort()) {
    let generation = target.generation;
    if (target.sitYears) {
      const year = parseInt(path.basename(pdf).slice(0, 4), 10);
      generation = target.sitYears[year];
    }
    if (target.generationOverride?.[path.basename(pdf)]) {
      generation = target.generationOverride[path.basename(pdf)];
    }
    if (!generation) continue;

    process.stdout.write(`  parsing ${path.relative(PUBLIC, pdf)}…`);
    try {
      const rows = chunkPdf(pdf, { generation, source: target.source, uniqueId });
      allRows.push(...rows);
      pdfCount++;
      console.log(` ${rows.length} chunks`);
    } catch (e) {
      console.log(` FAILED: ${e.message}`);
    }
  }
}

fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, JSON.stringify(allRows, null, 1) + '\n');
console.log(`\n✓ ${allRows.length} chunks from ${pdfCount} PDFs → ${outFile}`);
console.log(`  text: ${(allRows.reduce((n, r) => n + r.content.length, 0) / 1e6).toFixed(1)} MB`);
