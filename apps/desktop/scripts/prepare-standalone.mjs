/**
 * Copy Next.js standalone output into apps/desktop/standalone for Electron packaging.
 * Run after `npm run build` at the repo root (output: 'standalone').
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../..');
const desktopDir = path.resolve(__dirname, '..');
const outDir = path.join(desktopDir, 'standalone');

const standaloneSrc = path.join(repoRoot, '.next', 'standalone');
const staticSrc = path.join(repoRoot, '.next', 'static');
const publicSrc = path.join(repoRoot, 'public');

if (!fs.existsSync(standaloneSrc)) {
  console.error('Missing .next/standalone — run `npm run build` at the repo root first.');
  process.exit(1);
}

fs.rmSync(outDir, { recursive: true, force: true });
fs.cpSync(standaloneSrc, outDir, { recursive: true });

const staticDest = path.join(outDir, '.next', 'static');
fs.mkdirSync(path.dirname(staticDest), { recursive: true });
if (fs.existsSync(staticSrc)) fs.cpSync(staticSrc, staticDest, { recursive: true });

// Online-only / dev-only public assets that must NOT be bundled into the
// desktop app: the workshop PDFs (`manual`) and the Mobile Tech Library
// (`mobile_tech_library`) are multi-GB, gitignored, and served from Supabase
// Storage in production (see lib/documents.ts + /api/manual/url). Bundling them
// bloats the installer past GitHub's 2 GB release-asset limit. Per
// docs/procedures/full-app-offline.md these stay online-only in v1.
const EXCLUDE_PUBLIC = new Set(['mobile_tech_library', 'manual']);

const publicDest = path.join(outDir, 'public');
if (fs.existsSync(publicSrc)) {
  fs.cpSync(publicSrc, publicDest, {
    recursive: true,
    filter: (src) => {
      const rel = path.relative(publicSrc, src);
      if (!rel) return true;
      const top = rel.split(path.sep)[0];
      return !EXCLUDE_PUBLIC.has(top);
    },
  });
}

console.log(`Prepared apps/desktop/standalone from Next standalone build (excluded: ${[...EXCLUDE_PUBLIC].join(', ')})`);

// Desktop never ships a service worker — stale SW precache served old login UI after updates.
if (fs.existsSync(publicDest)) {
  for (const name of fs.readdirSync(publicDest)) {
    if (name === 'sw.js' || name.startsWith('workbox-') || name.startsWith('swe-worker-')) {
      fs.rmSync(path.join(publicDest, name), { recursive: true, force: true });
    }
  }
}
