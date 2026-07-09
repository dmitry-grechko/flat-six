// Upload the 981 workshop manual PDF to Supabase Storage (private bucket).
// Uses TUS resumable uploads — recommended for files over 6 MB.
//
//   npm run manual:upload
//
// BEFORE FIRST UPLOAD: in Supabase Dashboard → Storage → Settings, set
// "Global file size limit" to at least 250 MB (Pro allows up to 500 GB).
// The default 50 MB cap will reject this ~213 MB PDF even if the bucket
// limit is higher.
//
// Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.

import '../load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';
import * as tus from 'tus-js-client';

const BUCKET = 'workshop-manual';
const OBJECT = '981-workshop-manual.pdf';
const defaultFile = path.join('public', 'manual', OBJECT);
const CHUNK = 6 * 1024 * 1024; // 6 MB — Supabase TUS recommendation

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const filePath = process.argv[2] || defaultFile;

if (!url || !key) {
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment.');
  process.exit(1);
}
if (!fs.existsSync(filePath)) {
  console.error(`${filePath} not found. Copy the PDF to public/manual/${OBJECT} first.`);
  process.exit(1);
}

const stat = fs.statSync(filePath);
const sizeMb = stat.size / 1024 / 1024;
console.log(`Uploading ${filePath} (${sizeMb.toFixed(1)} MB) → ${BUCKET}/${OBJECT}`);

if (sizeMb > 50) {
  console.log(
    'Note: the project Global file size limit defaults to 50 MB (separate from the bucket 500 MB limit).\n' +
      '      Raise it to ≥250 MB: https://supabase.com/dashboard/project/' +
      new URL(url).hostname.split('.')[0] +
      '/storage/settings\n' +
      '      Free plans cannot exceed 50 MB — Pro is required for this PDF.',
  );
}

const projectRef = new URL(url).hostname.split('.')[0];
const endpoint = `https://${projectRef}.storage.supabase.co/storage/v1/upload/resumable`;

const started = Date.now();
const fileBuffer = fs.readFileSync(filePath);

await new Promise((resolve, reject) => {
  const upload = new tus.Upload(fileBuffer, {
    endpoint,
    retryDelays: [0, 3000, 5000, 10000, 20000],
    headers: {
      authorization: `Bearer ${key}`,
      'x-upsert': 'true',
    },
    uploadDataDuringCreation: true,
    removeFingerprintOnSuccess: true,
    metadata: {
      bucketName: BUCKET,
      objectName: OBJECT,
      contentType: 'application/pdf',
      cacheControl: '3600',
    },
    chunkSize: CHUNK,
    onError(err) {
      const msg = err.message || String(err);
      if (/maximum allowed size/i.test(msg)) {
        reject(new Error(
          `${msg}\n\n→ Open Supabase Dashboard → Storage → Settings and set "Global file size limit" to at least ${Math.ceil(sizeMb + 10)} MB, then retry.`,
        ));
      } else {
        reject(err);
      }
    },
    onProgress(bytesUploaded, bytesTotal) {
      const pct = ((bytesUploaded / bytesTotal) * 100).toFixed(1);
      process.stdout.write(`\r  ${pct}% (${(bytesUploaded / 1024 / 1024).toFixed(1)} / ${sizeMb.toFixed(1)} MB)`);
    },
    onSuccess() {
      process.stdout.write('\n');
      resolve(undefined);
    },
  });

  upload.findPreviousUploads().then((prev) => {
    if (prev.length) {
      console.log('Resuming previous interrupted upload…');
      upload.resumeFromPreviousUpload(prev[0]);
    }
    upload.start();
  });
}).catch((err) => {
  console.error('Upload failed:', err.message || err);
  process.exit(1);
});

// Verify the object exists.
const supabase = createClient(url, key, { auth: { persistSession: false } });
const { data, error } = await supabase.storage.from(BUCKET).list('', { search: OBJECT });
if (error) {
  console.warn('Upload finished but verification list failed:', error.message);
} else if (!data?.some((o) => o.name === OBJECT)) {
  console.warn('Upload reported success but object not found in bucket listing.');
}

const elapsed = ((Date.now() - started) / 1000).toFixed(1);
console.log(`✓ uploaded in ${elapsed}s — signed URLs served via /api/manual/url`);
