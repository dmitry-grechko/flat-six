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
import { createMacUpdater } from './mac-updater.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const host = createObdHost(process.platform);
const APP_PORT = Number(process.env.FLATSIX_DESKTOP_PORT || 3911);
const IS_PORTABLE = Boolean(process.env.PORTABLE_EXECUTABLE_DIR);

// Isolate Chromium profile per version so stale SW caches can't pin an old UI.
app.setPath('userData', path.join(app.getPath('appData'), '@flatsix', `desktop-${app.getVersion()}`));

/** @type {import('electron').BrowserWindow | null} */
let mainWindow = null;
/** @type {string | null} */
let pendingAuthUrl = null;
/** @type {import('electron').UtilityProcess | null} */
let nextProc = null;
// The Next server boots a few seconds after launch. We now show the window
// immediately (splash) so start-up doesn't feel frozen; this gate tells the
// deep-link handler to queue auth callbacks until the real app is loaded.
let serverReady = false;

function escapeHtml(s) {
  return String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
}

/** Instant-paint splash so launch feels responsive while Next boots. The bar is
 *  pure CSS in the renderer, so it keeps animating even if main briefly blocks. */
const SPLASH_URL =
  'data:text/html;charset=utf-8,' +
  encodeURIComponent(
    `<!doctype html><meta charset="utf-8"><title>FLAT·SIX</title>` +
      `<style>html,body{margin:0;height:100%}body{background:#0B0B0C;color:#fff;` +
      `font-family:'Helvetica Neue',Arial,sans-serif;display:flex;align-items:center;justify-content:center}` +
      `.w{display:flex;flex-direction:column;align-items:center;gap:20px}` +
      `.b{display:flex;align-items:center;gap:12px}.s{width:12px;height:12px;background:#D5001C}` +
      `.n{font-family:'JetBrains Mono',monospace;font-weight:700;letter-spacing:.28em;font-size:15px}` +
      `.t{width:190px;height:2px;background:#1B1B1E;border-radius:2px;overflow:hidden}` +
      `.t i{display:block;width:38%;height:100%;background:#D5001C;animation:m 1.1s ease-in-out infinite}` +
      `@keyframes m{0%{transform:translateX(-110%)}100%{transform:translateX(320%)}}` +
      `.m{font-size:12px;color:#9A9AA0}</style>` +
      `<div class="w"><div class="b"><div class="s"></div><div class="n">FLAT·SIX</div></div>` +
      `<div class="t"><i></i></div><div class="m">Starting your garage…</div></div>`,
  );

function errorUrl(err) {
  const msg = escapeHtml((err instanceof Error ? err.message : String(err)).slice(0, 400));
  return (
    'data:text/html;charset=utf-8,' +
    encodeURIComponent(
      `<!doctype html><meta charset="utf-8"><title>FLAT·SIX</title>` +
        `<style>html,body{margin:0;height:100%}body{background:#0B0B0C;color:#fff;` +
        `font-family:'Helvetica Neue',Arial,sans-serif;display:flex;align-items:center;justify-content:center;text-align:center;padding:24px}` +
        `.n{font-family:'JetBrains Mono',monospace;font-weight:700;letter-spacing:.28em;font-size:14px;color:#D5001C}` +
        `.m{max-width:520px;color:#9A9AA0;font-size:13px;line-height:1.5;margin-top:14px}</style>` +
        `<div><div class="n">FLAT·SIX</div><div class="m">Couldn’t start the local app server.<br>${msg}</div></div>`,
    )
  );
}

function flatsixAuthToLocal(url) {
  const u = new URL(url);
  return `http://127.0.0.1:${APP_PORT}/auth/callback${u.search}`;
}

function navigateAuthDeepLink(url) {
  const local = url.startsWith('flatsix://') ? flatsixAuthToLocal(url) : url;
  // Until the local server is up, loading /auth/callback would fail — queue it
  // and let bootWindow navigate there once the app is ready.
  if (mainWindow && !mainWindow.isDestroyed() && serverReady) {
    void mainWindow.loadURL(local);
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  } else {
    pendingAuthUrl = local;
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
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
        } catch { /* already gone */ }
      }
    } catch { /* nothing listening */ }
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
  // Prefer PNG for BrowserWindow / dock.setIcon — Electron NativeImage often
  // fails on .icns paths ("Failed to load image"), which used to abort startup
  // before createWindow ran.
  const candidates = [
    path.join(process.resourcesPath || '', 'icon.png'),
    path.join(__dirname, 'build', 'icon.png'),
    path.join(process.resourcesPath || '', 'icon.icns'),
    path.join(__dirname, 'build', 'icon.icns'),
    path.join(process.resourcesPath || '', 'icon.ico'),
    path.join(__dirname, 'build', 'icon.ico'),
  ];
  return candidates.find((p) => p && fs.existsSync(p));
}

function applyDockIcon() {
  if (process.platform !== 'darwin') return;
  const icon = resolveAppIcon();
  if (!icon) return;
  try {
    app.dock?.setIcon(icon);
  } catch (e) {
    console.warn('dock.setIcon failed:', e);
  }
}

function createWindow(startUrl) {
  let icon;
  try {
    icon = resolveAppIcon();
  } catch {
    icon = undefined;
  }
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    backgroundColor: '#0B0B0C',
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
  void win.loadURL(startUrl || SPLASH_URL);
  return win;
}

/** Show the window immediately (splash), boot Next, then load the real app. */
async function bootWindow() {
  serverReady = false;
  const win = createWindow();
  try {
    const url = await startNextServerAsync();
    const target = pendingAuthUrl || url;
    pendingAuthUrl = null;
    await win.loadURL(target);
    serverReady = true;
  } catch (e) {
    console.error(e);
    try {
      await win.loadURL(errorUrl(e));
    } catch {
      /* ignore */
    }
  }
  return win;
}

/** @param {Record<string, unknown>} status */
function broadcastUpdateStatus(status) {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) win.webContents.send('update:status', status);
  }
}

function setupAutoUpdater() {
  /** @type {Record<string, unknown> | null} */
  let lastStatus = null;
  const push = (status) => {
    lastStatus = status;
    broadcastUpdateStatus(status);
  };
  // Late subscribers (e.g. login page) miss events that fired before mount.
  ipcMain.handle('update:lastStatus', () => lastStatus);

  // Portable builds share no install dir — electron-updater checksums break when
  // NSIS + portable collide on the same artifact name (fixed in package.json).
  if (IS_PORTABLE) {
    push({
      phase: 'error',
      message: 'Portable builds do not auto-update. Install the NSIS Setup build from Downloads.',
    });
    return;
  }

  // macOS: the ad-hoc-signed build can't apply updates via Squirrel.Mac (needs
  // Developer ID + notarization). Use our own download → verify → swap → relaunch
  // updater instead. Windows keeps electron-updater (it applies without signing).
  if (process.platform === 'darwin') {
    const mac = createMacUpdater({ push });
    ipcMain.handle('update:check', async () => {
      await mac.check();
      return { ok: true };
    });
    ipcMain.handle('update:install', () => {
      mac.install();
      return { ok: true };
    });
    setTimeout(() => {
      mac.check().catch((err) => push({ phase: 'error', message: err?.message || String(err) }));
    }, 3000);
    return;
  }

  const { autoUpdater } = createRequire(import.meta.url)('electron-updater');
  autoUpdater.autoDownload = true;
  // Login lives outside AppShell (no update banner). Quitting must still apply a
  // downloaded update so owners are not stuck on an old build at the sign-in screen.
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => push({ phase: 'checking' }));
  autoUpdater.on('update-available', (info) => {
    push({
      phase: 'available',
      version: info.version,
      releaseNotes: typeof info.releaseNotes === 'string' ? info.releaseNotes : undefined,
    });
  });
  autoUpdater.on('update-not-available', () => push({ phase: 'uptodate' }));
  autoUpdater.on('error', (err) => {
    push({ phase: 'error', message: err?.message || String(err) });
  });
  autoUpdater.on('download-progress', (p) => {
    push({ phase: 'downloading', percent: Math.round(p.percent) });
  });
  autoUpdater.on('update-downloaded', (info) => {
    push({ phase: 'ready', version: info.version });
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
      push({ phase: 'error', message: err?.message || String(err) });
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

/**
 * The per-version userData dir (see app.setPath above) already isolates caches
 * between builds, so wiping them on EVERY launch just forces the service worker +
 * HTTP/code caches to rebuild each start — slow, and pointless. Clear only when
 * the version changes (the one moment a precached shell from an older build in a
 * reused profile could linger).
 */
async function clearStaleCachesOncePerVersion() {
  const marker = path.join(app.getPath('userData'), '.cache-version');
  try {
    if (fs.readFileSync(marker, 'utf8').trim() === app.getVersion()) return;
  } catch {
    /* first run for this profile */
  }
  try {
    await session.defaultSession.clearCache();
    await session.defaultSession.clearCodeCaches?.({});
    await session.defaultSession.clearStorageData({
      storages: ['serviceworkers', 'cachestorage', 'caches', 'shadercache'],
    });
  } catch (e) {
    console.warn('Failed to clear session cache:', e);
  }
  try {
    fs.mkdirSync(path.dirname(marker), { recursive: true });
    fs.writeFileSync(marker, app.getVersion());
  } catch {
    /* best effort */
  }
}

app.whenReady().then(async () => {
  registerAuthProtocol();
  await clearStaleCachesOncePerVersion();
  wireIpc();
  if (app.isPackaged) setupAutoUpdater();
  applyDockIcon();
  await bootWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      void bootWindow();
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
