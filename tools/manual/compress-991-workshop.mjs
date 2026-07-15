#!/usr/bin/env node
/**
 * Compress + split the 991 (911, 2011–2019) factory service manual so each part
 * fits Supabase Free Storage (global file size limit = 50 MB). Mirrors
 * compress-987-workshop.mjs — qpdf split (robust to broken outlines) then
 * Ghostscript downsample-compress, retrying with more volumes if any part ≥ 48 MB.
 *
 *   node tools/manual/compress-991-workshop.mjs
 *
 * Requires Ghostscript + qpdf (`brew install ghostscript qpdf`).
 * Input : temp/911/Porsche 911 991 Factory Service Manual.pdf
 * Output: public/manual/991-workshop-manual-v{N}.pdf + public/manual/volumes-991.json
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT_DIR = path.join(ROOT, 'public/manual');
const MAX_MB = 48;
const DPI = 72;

const JOB = {
  id: '991',
  label: '911 (991) Factory Service Manual 2011–2019',
  src: path.join(ROOT, 'temp/911/Porsche 911 991 Factory Service Manual.pdf'),
  prefix: '991-workshop-manual',
  // 358 MB / ~8.3k pp — start with 6 volumes; retry bumps if any ≥ MAX_MB.
  volumes: 6,
};

function which(bin) {
  try {
    return fs.existsSync(bin) ? bin : null;
  } catch {
    return null;
  }
}

const GS =
  which('/opt/homebrew/bin/gs') || which('/usr/local/bin/gs') || which('/usr/bin/gs');
if (!GS) {
  console.error('Ghostscript not found. Install with: brew install ghostscript');
  process.exit(1);
}

const QPDF =
  which('/opt/homebrew/bin/qpdf') || which('/usr/local/bin/qpdf') || which('/usr/bin/qpdf');
if (!QPDF) {
  console.error('qpdf not found. Install with: brew install qpdf');
  process.exit(1);
}

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let err = '';
    child.stderr.on('data', (d) => {
      err += d;
    });
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(err.trim() || `${cmd} exited ${code}`));
    });
  });
}

async function pageCount(src) {
  try {
    const out = await new Promise((resolve, reject) => {
      const child = spawn('pdfinfo', [src], { stdio: ['ignore', 'pipe', 'pipe'] });
      let buf = '';
      child.stdout.on('data', (d) => {
        buf += d;
      });
      child.on('close', (code) => (code === 0 ? resolve(buf) : reject(new Error('pdfinfo failed'))));
    });
    const m = out.match(/^Pages:\s+(\d+)/m);
    if (m) return Number(m[1]);
  } catch {
    /* fall through */
  }
  const out = await new Promise((resolve, reject) => {
    const child = spawn(
      GS,
      [
        '-q',
        '-dNODISPLAY',
        '-dNOSAFER',
        '-c',
        `(${src.replace(/\\/g, '/')}) (r) file runpdfbegin pdfpagecount = quit`,
      ],
      { stdio: ['ignore', 'pipe', 'pipe'] },
    );
    let buf = '';
    child.stdout.on('data', (d) => {
      buf += d;
    });
    child.stderr.on('data', (d) => {
      buf += d;
    });
    child.on('close', (code) => (code === 0 ? resolve(buf) : reject(new Error(buf || 'gs count failed'))));
  });
  const n = Number(String(out).trim().split(/\s+/).pop());
  if (!Number.isFinite(n) || n < 1) throw new Error(`Could not read page count: ${out}`);
  return n;
}

/** Split with qpdf (robust to broken outlines), then compress the slice with Ghostscript. */
async function compressRange(src, outFile, first, last) {
  const tmp = `${outFile}.slice.pdf`;
  try {
    await run(QPDF, ['--warning-exit-0', src, '--pages', '.', `${first}-${last}`, '--', tmp]);
    const args = [
      '-sDEVICE=pdfwrite',
      '-dCompatibilityLevel=1.4',
      '-dNOPAUSE',
      '-dQUIET',
      '-dBATCH',
      '-dSAFER',
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
      tmp,
    ];
    await run(GS, args);
  } finally {
    try {
      fs.unlinkSync(tmp);
    } catch {
      /* ignore */
    }
  }
}

async function compressJob(job) {
  if (!fs.existsSync(job.src)) {
    console.error(`Missing ${job.src}`);
    process.exit(1);
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const pages = await pageCount(job.src);
  const srcMb = fs.statSync(job.src).size / (1024 * 1024);
  let volumeCount = job.volumes;

  console.log(`\n══ ${job.label} (${job.id}) ══`);
  console.log(`Source: ${path.relative(ROOT, job.src)}`);
  console.log(`  ${pages} pages, ${srcMb.toFixed(1)} MB`);

  for (let attempt = 0; attempt < 4; attempt++) {
    console.log(`Target: ${volumeCount} volumes @ ${DPI} dpi, each < ${MAX_MB} MB\n`);
    const chunk = Math.ceil(pages / volumeCount);
    const ranges = [];
    for (let i = 0; i < volumeCount; i++) {
      const start = i * chunk + 1;
      const end = Math.min(pages, (i + 1) * chunk);
      if (start > pages) break;
      ranges.push({ index: i + 1, start, end });
    }

    const volumes = [];
    let oversized = false;
    for (const r of ranges) {
      const name = `${job.prefix}-v${r.index}.pdf`;
      const out = path.join(OUT_DIR, name);
      process.stdout.write(`  Vol ${r.index}: pages ${r.start}–${r.end} → ${name}…`);
      const t0 = Date.now();
      await compressRange(job.src, out, r.start, r.end);
      const mb = fs.statSync(out).size / (1024 * 1024);
      const sec = ((Date.now() - t0) / 1000).toFixed(0);
      console.log(` ${mb.toFixed(1)} MB (${sec}s)`);
      volumes.push({
        id: `${job.prefix}-v${r.index}`,
        file: name,
        startPage: r.start,
        endPage: r.end,
        sizeMb: Math.round(mb * 10) / 10,
      });
      if (mb >= MAX_MB) oversized = true;
    }

    if (!oversized) {
      const manifest = {
        id: job.id,
        label: job.label,
        source: path.basename(job.src),
        sourcePages: pages,
        dpi: DPI,
        maxMb: MAX_MB,
        createdAt: new Date().toISOString(),
        volumes,
      };
      const manifestPath = path.join(OUT_DIR, `volumes-${job.id}.json`);
      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
      console.log(`\n✓ wrote ${volumes.length} volumes + ${path.relative(ROOT, manifestPath)}`);
      return manifest;
    }

    console.warn(`\n⚠ some volumes ≥ ${MAX_MB} MB — retrying with more splits…`);
    for (const v of volumes) {
      try {
        fs.unlinkSync(path.join(OUT_DIR, v.file));
      } catch {
        /* ignore */
      }
    }
    volumeCount = Math.ceil(volumeCount * 1.5);
  }

  console.error(`✗ Could not fit ${job.id} under ${MAX_MB} MB after retries`);
  process.exit(1);
}

const manifest = await compressJob(JOB);
console.log('\n══ Done ══');
console.log(`  ${manifest.id}: ${manifest.volumes.length} vols, ${manifest.volumes.map((v) => v.sizeMb + 'MB').join(', ')}`);
