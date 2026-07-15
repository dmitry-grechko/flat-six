#!/usr/bin/env node
/**
 * Stage the Audi A4 (B9) PDFs into the canonical Documents layout + emit a
 * registry manifest. Curates an A4-relevant, de-duplicated set:
 *  - keeps the clean US `Repair Manual/` + `Maintenance/` trees
 *  - SKIPS the near-duplicate `2016-2024_AUDI_A4_B9_8W_SM/` tree (dedupe) and its
 *    off-engine manuals (1.4 TFSI, TDI diesels, S4 3.0)
 *  - from TSBs, keeps only A4-relevant SSPs + general-Audi tech (drops Q7/R8/A6/V8/…)
 *  - dedupes by content hash; gs-compresses any file >50 MB (Supabase limit)
 *
 * Usage: node tools/manual/stage-audi-docs.mjs [srcDir]
 * Out:  public/mobile_tech_library/Audi A4 B9/<category>/<file>.pdf
 *       lib/documents-audi-b9.json  (manifest for lib/documents.ts)
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';

const SRC = process.argv[2] || 'temp/audi_b9_docs';
const DEST = 'public/mobile_tech_library/Audi A4 B9';
const MANIFEST = 'lib/documents-audi-b9.json';
const MAX_BYTES = 48 * 1024 * 1024; // keep under Supabase 50 MB limit

// Repair-Manual subfolder → DocCategory
const RM_CATEGORY = {
  'Engine': 'workshop', 'Chassis': 'workshop', 'Drivetrain': 'workshop',
  'Body': 'workshop', 'Electrical System': 'workshop',
  'Heating, Ventilation and Air Conditioning': 'workshop',
  'Wiring Diagrams': 'workshop', 'Diagnostic Information': 'diagnostic',
};

// TSB / Self-Study keep-list — A4-relevant + general Audi tech only.
const TSB_KEEP = [
  /audi a4/i, /\bA4\b/, /990263/, /970563/, /970663/,           // A4-specific SSPs
  /CAN Data Bus/i, /Modular Infotainment/i, /Airbag and Safety/i,
  /Climate Control/i, /Batteries and Energy/i, /Body Construction/i,
  /Distributed Functions/i, /Handling Control/i,                // general SSPs
  /CTT /i, /VIN Decoder/i, /Brake Noise/i, /ODIS Study/i, /quattro ultra/i,
];
const TSB_DROP = [/Q7/i, /\bR8\b/i, /\bA6\b/i, /\bS6\b/i, /\bA7\b/i, /V8 TFSI/i, /BiTurbo/i, /EA389/i];

const titleOf = (file) =>
  file.replace(/\.pdf$/i, '').replace(/[_]+/g, ' ').replace(/\s+/g, ' ').trim();

// Supabase Storage rejects some characters in object keys (notably the unicode
// en/em dash). Keep spaces/commas/parens (valid), normalise dashes → '-', and
// drop any remaining non-ASCII so the storage key is always valid.
const keySafe = (file) =>
  file
    .normalize('NFKD')
    .replace(/[‐-―−]/g, '-')
    .replace(/[^\x20-\x7E]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

function categoryFor(relParts) {
  const [top, sub] = relParts;
  if (top === 'Maintenance') return 'maintenance';
  if (top === 'Repair Manual') return RM_CATEGORY[sub] || 'workshop';
  if (top.startsWith('TSBs')) return sub === 'Self-Study Programs' ? 'training' : 'diagnostic';
  return null; // skip everything else (incl. the _SM tree)
}

function keepTsb(file) {
  if (TSB_DROP.some((re) => re.test(file))) return false;
  return TSB_KEEP.some((re) => re.test(file));
}

// ---- walk + curate --------------------------------------------------------
const picked = []; // { srcPath, category, file }
function walk(dir, rel = []) {
  for (const name of fs.readdirSync(dir)) {
    if (name.startsWith('.')) continue;
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) { walk(full, [...rel, name]); continue; }
    if (!name.toLowerCase().endsWith('.pdf')) continue;
    const top = rel[0];
    if (top === '2016-2024_AUDI_A4_B9_8W_SM') continue; // dedupe: skip the duplicate SM tree
    const category = categoryFor(rel);
    if (!category) continue;
    if (top && top.startsWith('TSBs') && !keepTsb(name)) continue;
    picked.push({ srcPath: full, category, file: name });
  }
}
walk(SRC);

// ---- dedupe by content hash ----------------------------------------------
const seen = new Map();
const canonical = [];
for (const p of picked) {
  const hash = crypto.createHash('md5').update(fs.readFileSync(p.srcPath)).digest('hex');
  if (seen.has(hash)) continue;
  seen.set(hash, true);
  canonical.push(p);
}

// ---- copy (+ compress large) + build manifest -----------------------------
fs.rmSync(DEST, { recursive: true, force: true });
const manifest = [];
let compressed = 0;
for (const p of canonical) {
  const outDir = path.join(DEST, p.category);
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = keySafe(p.file);
  const outPath = path.join(outDir, outFile);
  const size = fs.statSync(p.srcPath).size;
  if (size > MAX_BYTES) {
    // Ghostscript downsample to fit Supabase's 50 MB object limit.
    execSync(
      `gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 -dNOPAUSE -dQUIET -dBATCH -dSAFER ` +
      `-dDownsampleColorImages=true -dColorImageResolution=110 ` +
      `-dDownsampleGrayImages=true -dGrayImageResolution=110 ` +
      `-dDownsampleMonoImages=true -dMonoImageResolution=200 ` +
      `-sOutputFile=${JSON.stringify(outPath)} ${JSON.stringify(p.srcPath)}`,
      { stdio: 'ignore' },
    );
    compressed++;
  } else {
    fs.copyFileSync(p.srcPath, outPath);
  }
  const finalMb = fs.statSync(outPath).size / 1048576;
  manifest.push({ file: `${p.category}/${outFile}`, title: titleOf(p.file), category: p.category, sizeMb: +finalMb.toFixed(1) });
}

manifest.sort((a, b) => a.category.localeCompare(b.category) || a.title.localeCompare(b.title));
fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');

const byCat = manifest.reduce((m, d) => ((m[d.category] = (m[d.category] || 0) + 1), m), {});
const over = manifest.filter((d) => d.sizeMb > 48);
console.log(`staged ${manifest.length} docs (${compressed} compressed) → ${DEST}`);
console.log('by category:', byCat);
console.log('still >48MB:', over.length ? over.map((d) => `${d.file} ${d.sizeMb}MB`) : 'none');
console.log(`manifest → ${MANIFEST}`);
