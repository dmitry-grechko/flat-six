/**
 * Dev: ensure Track Vite is up, bundle OBD host, launch Electron.
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const electronDir = path.resolve(__dirname, '..');
const trackDir = path.resolve(electronDir, '../track');

async function bundle() {
  await new Promise((resolve, reject) => {
    const p = spawn(process.execPath, [path.join(__dirname, 'bundle-host.mjs')], {
      cwd: electronDir,
      stdio: 'inherit',
      shell: false,
    });
    p.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`bundle exit ${code}`))));
  });
}

await bundle();

const env = {
  ...process.env,
  TRACK_DEV_URL: process.env.TRACK_DEV_URL || 'http://127.0.0.1:5173',
  PATH: process.env.PATH,
};

const vite = spawn(
  process.platform === 'win32' ? 'npm.cmd' : 'npm',
  ['run', 'dev', '--', '--host', '127.0.0.1'],
  { cwd: trackDir, stdio: 'inherit', env, shell: true },
);

// Give Vite a moment
await new Promise((r) => setTimeout(r, 2500));

const electronBin = path.join(
  electronDir,
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'electron.cmd' : 'electron',
);

const elec = spawn(electronBin, ['.'], {
  cwd: electronDir,
  stdio: 'inherit',
  env,
  shell: true,
});

function shutdown() {
  vite.kill();
  elec.kill();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

elec.on('exit', () => {
  vite.kill();
  process.exit(0);
});
