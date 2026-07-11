/**
 * Dev: Next on :3000 + Electron with OBD IPC.
 * Expects `npm run dev` already running, or set FLATSIX_DEV_URL.
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const desktopDir = path.resolve(__dirname, '..');

await new Promise((resolve, reject) => {
  const p = spawn(process.execPath, [path.join(__dirname, 'bundle-host.mjs')], {
    cwd: desktopDir,
    stdio: 'inherit',
  });
  p.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`bundle exit ${code}`))));
});

await new Promise((resolve, reject) => {
  const p = spawn(process.execPath, [path.join(__dirname, 'build-icons.mjs')], {
    cwd: desktopDir,
    stdio: 'inherit',
  });
  p.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`icons exit ${code}`))));
});

const env = {
  ...process.env,
  FLATSIX_DEV_URL: process.env.FLATSIX_DEV_URL || 'http://127.0.0.1:3000/garage',
};

const electronBin = path.join(
  desktopDir,
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'electron.cmd' : 'electron',
);

const elec = spawn(electronBin, ['.'], {
  cwd: desktopDir,
  stdio: 'inherit',
  env,
  shell: true,
});

elec.on('exit', (code) => process.exit(code ?? 0));
