/**
 * Electron main — ObdHost via bundled runner + Track UI.
 */
import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createObdHost } from './obd-host-runner.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const host = createObdHost(process.platform);

function createWindow() {
  const win = new BrowserWindow({
    width: 1100,
    height: 780,
    backgroundColor: '#ECECEE',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  const isDev = !app.isPackaged && process.env.TRACK_DEV_URL;
  if (isDev) {
    void win.loadURL(process.env.TRACK_DEV_URL);
  } else {
    void win.loadFile(path.join(__dirname, 'ui', 'index.html'));
  }
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
        note: 'Electron main · serialport',
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

app.whenReady().then(() => {
  wireIpc();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', async () => {
  try {
    await host.disconnect();
  } catch {
    /* ignore */
  }
  if (process.platform !== 'darwin') app.quit();
});
