#!/usr/bin/env node
// Upload curated Documents-catalog PDFs to Supabase Storage (workshop-manual bucket).
//
//   npm run docs:upload                 # all catalog docs that exist locally
//   npm run docs:upload -- --mtl-only   # skip the 213 MB workshop manual
//
// Requires NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and a raised
// global file size limit for the workshop PDF. Uses TUS for files > 6 MB.

import '../load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as tus from 'tus-js-client';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const PUBLIC = path.join(ROOT, 'public');
const BUCKET = 'workshop-manual';
const CHUNK = 6 * 1024 * 1024;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const mtlOnly = process.argv.includes('--mtl-only');

if (!url || !key) {
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

// Map a local path (relative to public/, POSIX) → model-first Storage key.
// MUST match lib/documents.ts `storeKey(...)` so signed URLs resolve.
function storageKeyFor(rel) {
  const r = rel.split(path.sep).join('/');
  let m;
  if ((m = r.match(/^manual\/(981-workshop-manual-v[123]\.pdf)$/))) return `981/workshop/${m[1]}`;
  const MTL = 'mobile_tech_library/';
  if (r.startsWith(MTL)) {
    const sub = r.slice(MTL.length);
    if ((m = sub.match(/^Diagnostic Information\/981 Boxster-Cayman\/(.+)$/))) return `981/diagnostic/${m[1]}`;
    if ((m = sub.match(/^Diagnostic Information\/987 Boxster-Cayman\/(.+)$/))) return `987/diagnostic/${m[1]}`;
    if ((m = sub.match(/^Service Information Technik\/Boxster-Cayman\/(.+)$/))) {
      const file = m[1];
      const year = parseInt(file.slice(0, 4), 10);
      const gen = Number.isFinite(year) && year >= 2012 ? '981' : '987';
      return `${gen}/service-info/${file}`;
    }
    if ((m = sub.match(/^Training Books\/(.+)$/))) return `shared/training/${m[1]}`;
    if ((m = sub.match(/^987 Maintenance\/(.+)$/))) return `987/maintenance/${m[1]}`;
    if ((m = sub.match(/^981 Parts\/(.+)$/))) return `981/parts/${m[1]}`;
    if ((m = sub.match(/^Audi A4 B9\/(.+)$/))) return `audi-b9/${m[1]}`;
  }
  return r; // fallback: unchanged
}

function collectLocalFiles() {
  const files = [];

  // Prefer compressed Free-tier volumes (<50 MB each). Fall back to the full
  // 213 MB PDF only when volumes are missing (will 413 on Free plans).
  const volumeFiles = [1, 2, 3].map((n) => ({
    storagePath: `981/workshop/981-workshop-manual-v${n}.pdf`,
    local: path.join(PUBLIC, `manual/981-workshop-manual-v${n}.pdf`),
  }));
  // 987.1 / 987.2 compressed workshop volumes (from compress-987-workshop.mjs)
  for (const series of ['9871', '9872']) {
    const manifestPath = path.join(PUBLIC, `manual/volumes-${series}.json`);
    if (!fs.existsSync(manifestPath)) continue;
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    for (const v of manifest.volumes ?? []) {
      volumeFiles.push({
        storagePath: `987/workshop/${v.file}`,
        local: path.join(PUBLIC, 'manual', v.file),
      });
    }
  }
  const volumesPresent = volumeFiles.filter((f) => fs.existsSync(f.local));
  if (!mtlOnly) {
    if (volumesPresent.length) {
      files.push(...volumesPresent);
    } else {
      const workshop = path.join(PUBLIC, 'manual/981-workshop-manual.pdf');
      if (fs.existsSync(workshop)) {
        files.push({ storagePath: '981/workshop/981-workshop-manual.pdf', local: workshop });
      }
    }
  }

  // Technical Information bulletins — filenames aren't year-prefixed, so the SIT
  // year→gen heuristic in storageKeyFor doesn't apply; map them explicitly.
  // Keep in sync with the bulletin entries in lib/documents.ts.
  const bulletinFiles = [
    {
      storagePath: '981/service-info/SB-10052000-1049.pdf',
      local: path.join(PUBLIC, 'mobile_tech_library/Service Information Technik/Boxster-Cayman/SB-10052000-1049.pdf'),
    },
  ];
  files.push(...bulletinFiles.filter((f) => fs.existsSync(f.local)));

  const sitAllow = new Set([
    '2005 Boxster.pdf', '2006 Cayman.pdf', '2007 987 Boxster-Cayman.pdf',
    '2009 Boxster, Cayman.pdf', '2011 Boxster Spyder.pdf',
    '2013 Boxster.pdf', '2014 Cayman.pdf', '2016 Cayman GT4.pdf',
  ]);
  const trainAllow = new Set([
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
  ]);

  function walk(dir, filter) {
    if (!fs.existsSync(dir)) return;
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, ent.name);
      if (ent.isDirectory()) walk(p, filter);
      else if (ent.name.toLowerCase().endsWith('.pdf') && (!filter || filter(ent.name))) {
        const rel = path.relative(PUBLIC, p).split(path.sep).join('/');
        files.push({ storagePath: storageKeyFor(rel), local: p });
      }
    }
  }

  walk(path.join(PUBLIC, 'mobile_tech_library/Diagnostic Information/981 Boxster-Cayman'));
  walk(path.join(PUBLIC, 'mobile_tech_library/Diagnostic Information/987 Boxster-Cayman'));
  walk(path.join(PUBLIC, 'mobile_tech_library/987 Maintenance'));
  walk(path.join(PUBLIC, 'mobile_tech_library/981 Parts'));
  walk(path.join(PUBLIC, 'mobile_tech_library/Service Information Technik/Boxster-Cayman'), (n) => sitAllow.has(n));
  walk(path.join(PUBLIC, 'mobile_tech_library/Training Books'), (n) => trainAllow.has(n));
  walk(path.join(PUBLIC, 'mobile_tech_library/Audi A4 B9'));
  return files;
}

async function uploadTus(localPath, objectPath) {
  const projectRef = new URL(url).hostname.split('.')[0];
  const endpoint = `https://${projectRef}.storage.supabase.co/storage/v1/upload/resumable`;
  const buf = fs.readFileSync(localPath);
  const sizeMb = buf.length / 1024 / 1024;

  await new Promise((resolve, reject) => {
    const upload = new tus.Upload(buf, {
      endpoint,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      headers: { authorization: `Bearer ${key}`, 'x-upsert': 'true' },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      metadata: {
        bucketName: BUCKET,
        objectName: objectPath,
        contentType: 'application/pdf',
        cacheControl: '3600',
      },
      chunkSize: CHUNK,
      onError: reject,
      onProgress(up, total) {
        if (sizeMb > 5) process.stdout.write(`\r    ${(up / total * 100).toFixed(0)}%`);
      },
      onSuccess() {
        if (sizeMb > 5) process.stdout.write('\n');
        resolve(undefined);
      },
    });
    upload.start();
  });
}

async function uploadSmall(localPath, objectPath) {
  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const { error } = await supabase.storage.from(BUCKET).upload(objectPath, fs.readFileSync(localPath), {
    contentType: 'application/pdf',
    upsert: true,
    cacheControl: '3600',
  });
  if (error) throw error;
}

const files = collectLocalFiles();
if (
  !mtlOnly &&
  !files.some((f) => f.storagePath.startsWith('981-workshop-manual'))
) {
  console.warn(
    '⚠ no workshop PDF volumes at public/manual/981-workshop-manual-v*.pdf\n' +
      '  Run: npm run manual:compress   then retry docs:upload',
  );
}
console.log(`Uploading ${files.length} PDFs to ${BUCKET}/…`);

let ok = 0;
const failed = [];
for (const f of files) {
  const mb = fs.statSync(f.local).size / 1024 / 1024;
  process.stdout.write(`  ${f.storagePath} (${mb.toFixed(1)} MB)…`);
  try {
    if (mb > 6) await uploadTus(f.local, f.storagePath);
    else await uploadSmall(f.local, f.storagePath);
    console.log(' ok');
    ok++;
  } catch (e) {
    const msg = e.message || String(e);
    console.log(` FAILED: ${msg}`);
    failed.push({ path: f.storagePath, msg });
  }
}
console.log(`\n✓ ${ok}/${files.length} uploaded`);
if (failed.length) {
  console.error(`\n✗ ${failed.length} failed:`);
  for (const f of failed) console.error(`  - ${f.path}: ${f.msg}`);
  if (failed.some((f) => f.path.startsWith('981-workshop-manual'))) {
    console.error(
      '\nWorkshop upload failed. For Free-tier (50 MB cap):\n' +
        '  npm run manual:compress && npm run docs:upload\n' +
        'Or raise Global file size limit on Pro and upload the full PDF.',
    );
  }
  process.exit(1);
}
