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

const publicDest = path.join(outDir, 'public');
if (fs.existsSync(publicSrc)) fs.cpSync(publicSrc, publicDest, { recursive: true });

console.log('Prepared apps/desktop/standalone from Next standalone build');
