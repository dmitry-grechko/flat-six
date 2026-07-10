#!/usr/bin/env node
/**
 * Compress + split 987 service manuals so each part fits Supabase Free
 * Storage (global file size limit = 50 MB). Mirrors compress-workshop.mjs
 * (981) but handles both 987.1 and 987.2 sources.
 *
 *   node tools/manual/compress-987-workshop.mjs
 *   node tools/manual/compress-987-workshop.mjs --only 9871
 *   node tools/manual/compress-987-workshop.mjs --only 9872
 *
 * Requires Ghostscript (`brew install ghostscript`).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT_DIR = path.join(ROOT, 'public/manual');
const MAX_MB = 48;
const DPI = 72;

const JOBS = [
  {
    id: '9871',
    label: '987.1 Cayman 2005–2008',
    src: path.join(ROOT, 'temp/public/Porsche Cayman 2005-2008 Service Manual.pdf'),
    prefix: '987-workshop-9871',
    // 100 MB / ~5.3k pp — start with 3 volumes (same as 981)
    volumes: 3,
  },
  {
    id: '9872',
    label: '987.2 Boxster/Cayman 2009–2011',
    src: path.join(
      ROOT,
      'temp/public/Porsche Boxster Cayman 2009-2011 (987.2) Service manual.pdf',
    ),
    prefix: '987-workshop-9872',
    // 625 MB / ~6.3k pp — denser; start with 8 volumes
    volumes: 8,
  },
];

const only = (() => {
  const i = process.argv.indexOf('--only');
  return i >= 0 ? process.argv[i + 1] : null;
})();

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

const QPDF =
  which('/opt/homebrew/bin/qpdf') ||
  which('/usr/local/bin/qpdf') ||
  which('/usr/bin/qpdf');

if (!QPDF) {
  console.error('qpdf not found. Install with: brew install qpdf');
  process.exit(1);
}

/**
 * Split with qpdf (handles broken outline/destinations that make gs
 * -dFirstPage/-dLastPage abort), then compress the slice with Ghostscript.
 */
async function compressRange(src, outFile, first, last) {
  const tmp = `${outFile}.slice.pdf`;
  try {
    await run(QPDF, [
      '--warning-exit-0',
      src,
      '--pages',
      '.',
      `${first}-${last}`,
      '--',
      tmp,
    ]);
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

  // Retry with more volumes if any exceed MAX_MB
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

    // Clean oversized attempt and bump volume count
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

const jobs = only ? JOBS.filter((j) => j.id === only) : JOBS;
if (!jobs.length) {
  console.error(`Unknown --only ${only}. Use 9871 or 9872.`);
  process.exit(1);
}

const results = [];
for (const job of jobs) {
  results.push(await compressJob(job));
}
console.log('\n══ All done ══');
for (const m of results) {
  console.log(
    `  ${m.id}: ${m.volumes.length} vols, ${m.volumes.map((v) => v.sizeMb + 'MB').join(', ')}`,
  );
}
