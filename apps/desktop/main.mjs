/**
 * FLAT·SIX Desktop — Next.js garage (standalone) + ObdHost in main.
 */
import { app, BrowserWindow, ipcMain } from 'electron';
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawn } from 'node:child_process';
import http from 'node:http';
import { createObdHost } from './obd-host-runner.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const host = createObdHost(process.platform);
const APP_PORT = Number(process.env.FLATSIX_DESKTOP_PORT || 3911);
const IS_PORTABLE = Boolean(process.env.PORTABLE_EXECUTABLE_DIR);

// Isolate Chromium profile per version so stale SW caches can't pin an old UI.
app.setPath('userData', path.join(app.getPath('appData'), '@flatsix', `desktop-${app.getVersion()}`));

/** @type {import('node:child_process').ChildProcess | null} */
let nextProc = null;

function waitForServer(url, attempts = 80) {
  return new Promise((resolve, reject) => {
    let n = 0;
    const tick = () => {
      n += 1;
      const req = http.get(url, (res) => {
        res.resume();
        resolve(true);
      });
      req.on('error', () => {
        if (n >= attempts) reject(new Error(`Server did not start: ${url}`));
        else setTimeout(tick, 250);
      });
    };
    tick();
  });
}

/** Free the Desktop Next port — previous launches (esp. portable) often leave orphans. */
function freeDesktopPort(port) {
  if (process.platform === 'win32') {
    try {
      const out = execFileSync('cmd.exe', ['/c', `netstat -ano | findstr :${port}`], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      });
      const pids = new Set();
      for (const line of out.split(/\r?\n/)) {
        if (!/LISTENING/i.test(line)) continue;
        const m = line.trim().match(/(\d+)\s*$/);
        if (m) pids.add(Number(m[1]));
      }
      for (const pid of pids) {
        if (!Number.isFinite(pid) || pid === process.pid) continue;
        try {
          execFileSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore' });
        } catch {
          /* already gone */
        }
      }
    } catch {
      /* nothing listening */
    }
    return;
  }
  try {
    const out = execFileSync('lsof', ['-tiTCP:' + port, '-sTCP:LISTEN'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    for (const pid of out.split(/\n/).filter(Boolean)) {
      const n = Number(pid);
      if (!Number.isFinite(n) || n === process.pid) continue;
      try {
        process.kill(n, 'SIGTERM');
      } catch {
        /* already gone */
      }
    }
  } catch {
    /* nothing listening */
  }
}

function resolveServerJs() {
  if (!app.isPackaged) {
    return path.join(__dirname, 'standalone', 'server.js');
  }
  const candidates = [
    // Prefer extraResources (electron-builder strips nested node_modules from asar)
    path.join(process.resourcesPath, 'standalone', 'server.js'),
    path.join(process.resourcesPath, 'app.asar.unpacked', 'standalone', 'server.js'),
    path.join(__dirname, 'standalone', 'server.js'),
  ];
  return candidates.find((p) => fs.existsSync(p)) || candidates[0];
}

async function startNextServerAsync() {
  if (!app.isPackaged && process.env.FLATSIX_DEV_URL) {
    return process.env.FLATSIX_DEV_URL;
  }

  const serverJs = resolveServerJs();
  if (!fs.existsSync(serverJs)) {
    throw new Error(
      'Next standalone server.js missing. Run `npm run build` then `npm --prefix apps/desktop run prepare:standalone`.',
    );
  }

  freeDesktopPort(APP_PORT);
  await new Promise((r) => setTimeout(r, 300));

  nextProc = spawn(process.execPath, [serverJs], {
    cwd: path.dirname(serverJs),
    env: {
      ...process.env,
      PORT: String(APP_PORT),
      HOSTNAME: '127.0.0.1',
      ELECTRON_RUN_AS_NODE: '1',
    },
    stdio: 'inherit',
  });

  await waitForServer(`http://127.0.0.1:${APP_PORT}`);
  return `http://127.0.0.1:${APP_PORT}/garage`;
}

function resolveAppIcon() {
  const buildDir = path.join(__dirname, 'build');
  if (process.platform === 'win32') {
    const ico = path.join(buildDir, 'icon.ico');
    if (fs.existsSync(ico)) return ico;
  }
  if (process.platform === 'darwin') {
    const icns = path.join(buildDir, 'icon.icns');
    if (fs.existsSync(icns)) return icns;
  }
  const png = path.join(buildDir, 'icon.png');
  return fs.existsSync(png) ? png : undefined;
}

function createWindow(url) {
  const icon = resolveAppIcon();
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    backgroundColor: '#ECECEE',
    ...(icon ? { icon } : {}),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });
  void win.loadURL(url);
}

/** @param {Record<string, unknown>} status */
function broadcastUpdateStatus(status) {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) win.webContents.send('update:status', status);
  }
}

function setupAutoUpdater() {
  // Portable builds share no install dir — electron-updater checksums break when
  // NSIS + portable collide on the same artifact name (fixed in package.json).
  if (IS_PORTABLE) {
    broadcastUpdateStatus({
      phase: 'error',
      message: 'Portable builds do not auto-update. Install the NSIS Setup build from Downloads.',
    });
    return;
  }

  const { autoUpdater } = createRequire(import.meta.url)('electron-updater');
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = false;

  autoUpdater.on('checking-for-update', () => broadcastUpdateStatus({ phase: 'checking' }));
  autoUpdater.on('update-available', (info) => {
    broadcastUpdateStatus({
      phase: 'available',
      version: info.version,
      releaseNotes: typeof info.releaseNotes === 'string' ? info.releaseNotes : undefined,
    });
  });
  autoUpdater.on('update-not-available', () => broadcastUpdateStatus({ phase: 'uptodate' }));
  autoUpdater.on('error', (err) => {
    broadcastUpdateStatus({ phase: 'error', message: err?.message || String(err) });
  });
  autoUpdater.on('download-progress', (p) => {
    broadcastUpdateStatus({ phase: 'downloading', percent: Math.round(p.percent) });
  });
  autoUpdater.on('update-downloaded', (info) => {
    broadcastUpdateStatus({ phase: 'ready', version: info.version });
  });

  ipcMain.handle('update:check', async () => {
    await autoUpdater.checkForUpdates();
    return { ok: true };
  });
  ipcMain.handle('update:install', () => {
    autoUpdater.quitAndInstall();
    return { ok: true };
  });

  setTimeout(() => {
    autoUpdater.checkForUpdates().catch((err) => {
      broadcastUpdateStatus({ phase: 'error', message: err?.message || String(err) });
    });
  }, 3000);
}

function wireIpc() {
  const wrap = (fn) => async (_evt, ...args) => {
    try {
      return await fn(...args);
    } catch (e) {
      throw new Error(e instanceof Error ? e.message : String(e));
    }
  };

  ipcMain.handle(
    'obd:health',
    wrap(async () => {
      const st = host.status();
      return {
        ok: true,
        connected: st.connected,
        port: st.path,
        baud: st.baudRate,
        platform: process.platform,
        transports: ['usb-serial', 'bluetooth-classic-spp'],
        shell: 'electron',
        note: 'FLAT·SIX Desktop · serialport in main',
      };
    }),
  );
  ipcMain.handle('obd:listPorts', wrap(() => host.listPorts()));
  ipcMain.handle(
    'obd:connect',
    wrap(async (opts) => {
      const status = await host.connect(opts || {});
      return { ok: true, status };
    }),
  );
  ipcMain.handle(
    'obd:disconnect',
    wrap(async () => {
      await host.disconnect();
      return { ok: true };
    }),
  );
  ipcMain.handle('obd:status', wrap(() => host.status()));
  ipcMain.handle('obd:capabilities', wrap(() => host.capabilities()));
  ipcMain.handle('obd:getLive', wrap(() => host.getLive()));
  ipcMain.handle('obd:refreshLive', wrap((opts) => host.refreshLive(opts)));
  ipcMain.handle('obd:getFaults', wrap(() => host.getFaults()));
  ipcMain.handle('obd:refreshFaults', wrap(() => host.refreshFaults()));
  ipcMain.handle('obd:getVehicle', wrap(() => host.getVehicle()));
  ipcMain.handle('obd:refreshVehicle', wrap(() => host.refreshVehicle()));
  ipcMain.handle('obd:pollStart', wrap((intervalMs) => host.pollStart(intervalMs)));
  ipcMain.handle(
    'obd:pollStop',
    wrap(async () => {
      host.stopPoll();
      return { ok: true };
    }),
  );
  ipcMain.handle('obd:debug', wrap(() => host.debug()));
}

app.whenReady().then(async () => {
  wireIpc();
  if (app.isPackaged) setupAutoUpdater();
  const icon = resolveAppIcon();
  if (process.platform === 'darwin' && icon) {
    app.dock?.setIcon(icon);
  }
  try {
    const url = await startNextServerAsync();
    createWindow(url);
  } catch (e) {
    console.error(e);
    app.quit();
  }
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      void startNextServerAsync().then(createWindow).catch(console.error);
    }
  });
});

app.on('window-all-closed', async () => {
  try {
    await host.disconnect();
  } catch {
    /* ignore */
  }
  if (nextProc) {
    nextProc.kill();
    nextProc = null;
  }
  if (process.platform !== 'darwin') app.quit();
});
