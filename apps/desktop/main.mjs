/**
 * FLAT·SIX Desktop — Next.js garage (standalone) + ObdHost in main.
 */
import { app, BrowserWindow, ipcMain, session, utilityProcess } from 'electron';
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import http from 'node:http';
import { createObdHost } from './obd-host-runner.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const host = createObdHost(process.platform);
const APP_PORT = Number(process.env.FLATSIX_DESKTOP_PORT || 3911);

// Isolate Chromium profile per app version so a leftover service-worker cache
// from an older Desktop build can never keep serving a stale login UI.
app.setPath('userData', path.join(app.getPath('appData'), '@flatsix', `desktop-${app.getVersion()}`));

/** @type {import('electron').BrowserWindow | null} */
let mainWindow = null;
/** @type {string | null} */
let pendingAuthUrl = null;
/** @type {import('electron').UtilityProcess | null} */
let nextProc = null;

function flatsixAuthToLocal(url) {
  const u = new URL(url);
  return `http://127.0.0.1:${APP_PORT}/auth/callback${u.search}`;
}

function navigateAuthDeepLink(url) {
  const local = url.startsWith('flatsix://') ? flatsixAuthToLocal(url) : url;
  if (mainWindow && !mainWindow.isDestroyed()) {
    void mainWindow.loadURL(local);
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  } else {
    pendingAuthUrl = local;
  }
}

function registerAuthProtocol() {
  if (process.defaultApp) {
    if (process.argv.length >= 2) {
      app.setAsDefaultProtocolClient('flatsix', process.execPath, [path.resolve(process.argv[1])]);
    }
  } else {
    app.setAsDefaultProtocolClient('flatsix');
  }
}

const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
}

app.on('second-instance', (_event, argv) => {
  const deep = argv.find((arg) => typeof arg === 'string' && arg.startsWith('flatsix://'));
  if (deep) navigateAuthDeepLink(deep);
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

app.on('open-url', (event, url) => {
  event.preventDefault();
  if (url.startsWith('flatsix://')) navigateAuthDeepLink(url);
});

const startupDeepLink = process.argv.find((arg) => typeof arg === 'string' && arg.startsWith('flatsix://'));
if (startupDeepLink) pendingAuthUrl = flatsixAuthToLocal(startupDeepLink);

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

/** Kill any leftover next-server still holding the Desktop port (PPID=1 orphans). */
function freeDesktopPort(port) {
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
    // Standalone ships as an extraResource (see build.extraResources) so its
    // bundled node_modules survives packaging — electron-builder strips nested
    // node_modules from files/asar entries, which breaks `require('next')`.
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

  // A previous Desktop / local pack can leave next-server orphaned on this port.
  // waitForServer would then happily talk to the OLD build (stale login UI).
  freeDesktopPort(APP_PORT);
  await new Promise((r) => setTimeout(r, 300));

  // utilityProcess runs Node without a second Dock icon (spawn(process.execPath)
  // with ELECTRON_RUN_AS_NODE briefly flashes a generic "exec" tile on macOS).
  nextProc = utilityProcess.fork(serverJs, [], {
    cwd: path.dirname(serverJs),
    env: {
      ...process.env,
      PORT: String(APP_PORT),
      HOSTNAME: '127.0.0.1',
    },
    stdio: 'pipe',
    serviceName: 'flatsix-web',
  });
  nextProc.on('exit', (code) => {
    if (code && code !== 0) console.error('Next server exited', code);
  });

  await waitForServer(`http://127.0.0.1:${APP_PORT}`);
  return `http://127.0.0.1:${APP_PORT}/garage`;
}

function resolveAppIcon() {
  // Packaged builds put icon.icns / icon.ico in Resources/ (electron-builder).
  // Dev looks under apps/desktop/build/.
  const candidates =
    process.platform === 'win32'
      ? [
          path.join(process.resourcesPath || '', 'icon.ico'),
          path.join(__dirname, 'build', 'icon.ico'),
          path.join(__dirname, 'build', 'icon.png'),
        ]
      : process.platform === 'darwin'
        ? [
            path.join(process.resourcesPath || '', 'icon.icns'),
            path.join(__dirname, 'build', 'icon.icns'),
            path.join(__dirname, 'build', 'icon.png'),
          ]
        : [path.join(__dirname, 'build', 'icon.png')];
  return candidates.find((p) => p && fs.existsSync(p));
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
  mainWindow = win;
  win.on('closed', () => {
    if (mainWindow === win) mainWindow = null;
  });
  win.webContents.on('will-navigate', (event, target) => {
    if (target.startsWith('flatsix://')) {
      event.preventDefault();
      navigateAuthDeepLink(target);
    }
  });
  win.webContents.on('will-redirect', (event, target) => {
    if (target.startsWith('flatsix://')) {
      event.preventDefault();
      navigateAuthDeepLink(target);
    }
  });
  const startUrl = pendingAuthUrl || url;
  pendingAuthUrl = null;
  void win.loadURL(startUrl);
  return win;
}

/** @param {Record<string, unknown>} status */
function broadcastUpdateStatus(status) {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) win.webContents.send('update:status', status);
  }
}

function setupAutoUpdater() {
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
    autoUpdater.checkForUpdates().catch(() => {});
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
  ipcMain.handle('obd:getMode06', wrap(() => host.getMode06()));
  ipcMain.handle('obd:refreshMode06', wrap(() => host.refreshMode06()));
  ipcMain.handle('obd:getModuleScan', wrap(() => host.getModuleScan()));
  ipcMain.handle('obd:scanModules', wrap((generation) => host.scanModules(generation)));
  ipcMain.handle('obd:clearFaults', wrap((generation) => host.clearFaults(generation)));
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
  registerAuthProtocol();
  // Drop leftover service workers / HTTP caches from older Desktop builds so
  // login UI updates are never stuck behind a precached shell.
  try {
    await session.defaultSession.clearCache();
    await session.defaultSession.clearCodeCaches?.({});
    await session.defaultSession.clearStorageData({
      storages: ['serviceworkers', 'cachestorage', 'caches', 'shadercache'],
    });
  } catch (e) {
    console.warn('Failed to clear session cache:', e);
  }
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
    try {
      nextProc.kill();
    } catch {
      /* ignore */
    }
    nextProc = null;
  }
  freeDesktopPort(APP_PORT);
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  if (nextProc) {
    try {
      nextProc.kill();
    } catch {
      /* ignore */
    }
    nextProc = null;
  }
  freeDesktopPort(APP_PORT);
});
