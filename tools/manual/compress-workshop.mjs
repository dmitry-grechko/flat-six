#!/usr/bin/env node
/**
 * Compress + split the 981 workshop manual so each part fits Supabase Free
 * Storage (global file size limit = 50 MB).
 *
 *   npm run manual:compress
 *
 * Reads:  public/manual/981-workshop-manual.pdf (~213 MB, 6087 pages)
 * Writes: public/manual/981-workshop-manual-v{1,2,3}.pdf  (each < 50 MB)
 *         public/manual/volumes.json  (page ranges for deep-links)
 *
 * Requires Ghostscript (`brew install ghostscript`).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SRC = path.join(ROOT, 'public/manual/981-workshop-manual.pdf');
const OUT_DIR = path.join(ROOT, 'public/manual');
const MANIFEST = path.join(OUT_DIR, 'volumes.json');
const MAX_MB = 48; // leave headroom under the 50 MB Free cap
const DPI = 72;
const VOLUMES = 3;

function which(bin) {
  try {
    return fs.existsSync(bin) ? bin : null;
  } catch {
    return null;
  }
}

const GS =
  which('/opt/homebrew/bin/gs') ||
  which('/usr/local/bin/gs') ||
  which('/usr/bin/gs');

if (!GS) {
  console.error('Ghostscript not found. Install with: brew install ghostscript');
  process.exit(1);
}
if (!fs.existsSync(SRC)) {
  console.error(`Missing ${SRC}`);
  process.exit(1);
}

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let err = '';
    child.stderr.on('data', (d) => { err += d; });
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(err.trim() || `${cmd} exited ${code}`));
    });
  });
}

async function pageCount() {
  // Prefer pdfinfo when available
  try {
    const out = await new Promise((resolve, reject) => {
      const child = spawn('pdfinfo', [SRC], { stdio: ['ignore', 'pipe', 'pipe'] });
      let buf = '';
      child.stdout.on('data', (d) => { buf += d; });
      child.on('close', (code) => (code === 0 ? resolve(buf) : reject(new Error('pdfinfo failed'))));
    });
    const m = out.match(/^Pages:\s+(\d+)/m);
    if (m) return Number(m[1]);
  } catch { /* fall through */ }

  // Ghostscript page count
  const out = await new Promise((resolve, reject) => {
    const child = spawn(GS, [
      '-q', '-dNODISPLAY', '-dNOSAFER',
      '-c', `(${SRC.replace(/\\/g, '/')}) (r) file runpdfbegin pdfpagecount = quit`,
    ], { stdio: ['ignore', 'pipe', 'pipe'] });
    let buf = '';
    child.stdout.on('data', (d) => { buf += d; });
    child.stderr.on('data', (d) => { buf += d; });
    child.on('close', (code) => (code === 0 ? resolve(buf) : reject(new Error(buf || 'gs count failed'))));
  });
  const n = Number(String(out).trim().split(/\s+/).pop());
  if (!Number.isFinite(n) || n < 1) throw new Error(`Could not read page count: ${out}`);
  return n;
}

function compressRange(outFile, first, last) {
  const args = [
    '-sDEVICE=pdfwrite',
    '-dCompatibilityLevel=1.4',
    '-dNOPAUSE', '-dQUIET', '-dBATCH', '-dSAFER',
    `-dFirstPage=${first}`,
    `-dLastPage=${last}`,
    '-dDetectDuplicateImages=true',
    '-dCompressFonts=true',
    '-dSubsetFonts=true',
    '-dDownsampleColorImages=true',
    '-dDownsampleGrayImages=true',
    '-dDownsampleMonoImages=true',
    '-dColorImageDownsampleType=/Bicubic',
    '-dGrayImageDownsampleType=/Bicubic',
    '-dMonoImageDownsampleType=/Bicubic',
    `-dColorImageResolution=${DPI}`,
    `-dGrayImageResolution=${DPI}`,
    '-dMonoImageResolution=150',
    '-dColorImageDownsampleThreshold=1.0',
    '-dGrayImageDownsampleThreshold=1.0',
    '-dMonoImageDownsampleThreshold=1.0',
    '-dEncodeColorImages=true',
    '-dEncodeGrayImages=true',
    '-dEncodeMonoImages=true',
    '-dAutoFilterColorImages=false',
    '-dAutoFilterGrayImages=false',
    '-dColorImageFilter=/DCTEncode',
    '-dGrayImageFilter=/DCTEncode',
    `-sOutputFile=${outFile}`,
    SRC,
  ];
  return run(GS, args);
}

const pages = await pageCount();
const srcMb = fs.statSync(SRC).size / (1024 * 1024);
console.log(`Source: ${SRC}`);
console.log(`  ${pages} pages, ${srcMb.toFixed(1)} MB`);
console.log(`Target: ${VOLUMES} volumes @ ${DPI} dpi, each < ${MAX_MB} MB\n`);

const chunk = Math.ceil(pages / VOLUMES);
const ranges = [];
for (let i = 0; i < VOLUMES; i++) {
  const start = i * chunk + 1;
  const end = Math.min(pages, (i + 1) * chunk);
  if (start > pages) break;
  ranges.push({ index: i + 1, start, end });
}

const volumes = [];
for (const r of ranges) {
  const name = `981-workshop-manual-v${r.index}.pdf`;
  const out = path.join(OUT_DIR, name);
  process.stdout.write(`  Vol ${r.index}: pages ${r.start}–${r.end} → ${name}…`);
  const t0 = Date.now();
  await compressRange(out, r.start, r.end);
  const mb = fs.statSync(out).size / (1024 * 1024);
  const sec = ((Date.now() - t0) / 1000).toFixed(0);
  console.log(` ${mb.toFixed(1)} MB (${sec}s)`);
  if (mb >= MAX_MB) {
    console.error(
      `\n✗ ${name} is ${mb.toFixed(1)} MB (≥ ${MAX_MB}). Re-run with more volumes or lower DPI.`,
    );
    process.exit(1);
  }
  volumes.push({
    id: `981-workshop-manual-v${r.index}`,
    file: name,
    startPage: r.start,
    endPage: r.end,
    sizeMb: Math.round(mb * 10) / 10,
  });
}

const manifest = {
  source: '981-workshop-manual.pdf',
  sourcePages: pages,
  dpi: DPI,
  maxMb: MAX_MB,
  createdAt: new Date().toISOString(),
  volumes,
};
fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');
console.log(`\n✓ wrote ${volumes.length} volumes + ${path.relative(ROOT, MANIFEST)}`);
console.log('Next: npm run docs:upload   # uploads volumes (skips 213 MB original)');
