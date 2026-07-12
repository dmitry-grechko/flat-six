#!/usr/bin/env node
/**
 * Bundle lib/obd + tools/obd-bridge for GitHub Releases.
 * Preserves repo layout so server.mjs can resolve ../../lib/obd.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const bridgeRoot = path.join(__dirname, '..');
const repoRoot = path.join(bridgeRoot, '../..');
const pkg = JSON.parse(fs.readFileSync(path.join(bridgeRoot, 'package.json'), 'utf8'));
const version = pkg.version;
const outDir = path.join(bridgeRoot, 'release');
const stageName = `FLAT-SIX-OBD-Bridge-${version}`;
const stageDir = path.join(outDir, stageName);
const zipName = `${stageName}.zip`;
const zipPath = path.join(outDir, zipName);

function rmrf(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

function copyDir(src, dest, { skip = [] } = {}) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (skip.includes(entry.name)) continue;
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(from, to, { skip });
    else fs.copyFileSync(from, to);
  }
}

rmrf(outDir);
fs.mkdirSync(stageDir, { recursive: true });

copyDir(path.join(repoRoot, 'lib/obd'), path.join(stageDir, 'lib/obd'));
copyDir(path.join(bridgeRoot), path.join(stageDir, 'tools/obd-bridge'), {
  skip: ['release', 'node_modules', 'dist'],
});

fs.writeFileSync(
  path.join(stageDir, 'package.json'),
  JSON.stringify(
    {
      name: 'flatsix-obd-bridge-bundle',
      private: true,
      scripts: {
        start: 'npm --prefix tools/obd-bridge install --no-fund --no-audit && npm --prefix tools/obd-bridge start',
      },
    },
    null,
    2,
  ),
);

fs.writeFileSync(
  path.join(stageDir, 'README.txt'),
  [
    'FLAT·SIX OBD Bridge',
    '',
    'Requires Node 22+ (24.x recommended).',
    '',
    '1. Unzip anywhere',
    '2. Open a terminal in this folder',
    '3. Run: npm start',
    '4. Open http://127.0.0.1:8765',
    '',
    'On Windows, VS 2022 Build Tools (C++ workload) may be required for serialport.',
  ].join('\n'),
);

console.log('Installing bridge dependencies in stage…');
execSync('npm ci --no-fund --no-audit', {
  cwd: path.join(stageDir, 'tools/obd-bridge'),
  stdio: 'inherit',
});

fs.mkdirSync(outDir, { recursive: true });
if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);

const cwd = stageDir;
const parent = path.basename(stageDir);
if (process.platform === 'win32') {
  execSync(
    `powershell -NoProfile -Command "Compress-Archive -Path '${parent}' -DestinationPath '${zipPath}' -Force"`,
    { cwd: outDir, stdio: 'inherit' },
  );
} else {
  execSync(`zip -r -q "${zipPath}" "${parent}"`, { cwd: outDir, stdio: 'inherit' });
}

rmrf(stageDir);
console.log(`Wrote ${zipPath}`);
