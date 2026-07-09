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

function collectLocalFiles() {
  const files = [];
  const workshop = path.join(PUBLIC, 'manual/981-workshop-manual.pdf');
  if (!mtlOnly && fs.existsSync(workshop)) {
    files.push({ storagePath: '981-workshop-manual.pdf', local: workshop });
  }

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
        files.push({ storagePath: rel, local: p });
      }
    }
  }

  walk(path.join(PUBLIC, 'mobile_tech_library/Diagnostic Information/981 Boxster-Cayman'));
  walk(path.join(PUBLIC, 'mobile_tech_library/Diagnostic Information/987 Boxster-Cayman'));
  walk(path.join(PUBLIC, 'mobile_tech_library/Service Information Technik/Boxster-Cayman'), (n) => sitAllow.has(n));
  walk(path.join(PUBLIC, 'mobile_tech_library/Training Books'), (n) => trainAllow.has(n));
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
console.log(`Uploading ${files.length} PDFs to ${BUCKET}/…`);

let ok = 0;
for (const f of files) {
  const mb = fs.statSync(f.local).size / 1024 / 1024;
  process.stdout.write(`  ${f.storagePath} (${mb.toFixed(1)} MB)…`);
  try {
    if (mb > 6) await uploadTus(f.local, f.storagePath);
    else await uploadSmall(f.local, f.storagePath);
    console.log(' ok');
    ok++;
  } catch (e) {
    console.log(` FAILED: ${e.message || e}`);
  }
}
console.log(`\n✓ ${ok}/${files.length} uploaded`);
