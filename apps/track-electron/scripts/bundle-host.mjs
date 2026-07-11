/**
 * Bundle lib/obd host for Electron main (Node ESM).
 * Run from apps/track-electron: node scripts/bundle-host.mjs
 */
import * as esbuild from 'esbuild';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../..');

await esbuild.build({
  entryPoints: [path.join(repoRoot, 'lib/obd/electron-entry.ts')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: path.join(__dirname, '../obd-host-runner.mjs'),
  external: [
    'serialport',
    '@serialport/bindings-cpp',
    '@serialport/bindings-interface',
    '@serialport/parser-byte',
    '@serialport/parser-cctalk',
    '@serialport/parser-delimiter',
    '@serialport/parser-inter-byte-timeout',
    '@serialport/parser-packet-length',
    '@serialport/parser-readline',
    '@serialport/parser-ready',
    '@serialport/parser-regex',
    '@serialport/parser-slip-encoder',
    '@serialport/parser-spacepacket',
    '@serialport/stream',
    'koffi',
  ],
  logLevel: 'info',
});

console.log('bundled obd-host-runner.mjs');
