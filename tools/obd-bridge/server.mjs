#!/usr/bin/env node
/**
 * FLAT·SIX local OBD bridge — thin HTTP wrapper around lib/obd ObdHost.
 *
 * Adapters:
 *   - elm327 (default) — USB / Bluetooth Classic serial
 *   - vas6154 (experimental) — J2534 PassThru / DoIP via tools/obd-bridge/adapters
 *
 * Run: node --import tsx server.mjs
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.OBD_BRIDGE_PORT || 8765);
const PUBLIC = path.join(__dirname, 'public');
const PLATFORM = process.platform;

const hostMod = await import(pathToFileURL(path.join(__dirname, '../../lib/obd/node.ts')).href);
/** @type {import('../../lib/obd/host').ObdHost} */
const host = new hostMod.ObdHost(PLATFORM);

const vasLab = await import(pathToFileURL(path.join(__dirname, 'adapters/vas6154/adapter.mjs')).href);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
};

const ADAPTERS = [
  {
    id: 'elm327',
    label: 'ELM327 (USB / BT Classic)',
    experimental: false,
    available: true,
    description: 'Production path — serial ELM327, Mode 01/03/07/09.',
  },
  {
    id: 'vas6154',
    label: 'VAS 6154 (Experimental)',
    experimental: true,
    available: PLATFORM === 'win32' || true,
    description: 'Lab only — J2534 PassThru and/or DoIP raw transcript.',
  },
];

const server = http.createServer(async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url || '/', `http://127.0.0.1:${PORT}`);

  try {
    if (req.method === 'GET' && url.pathname === '/health') {
      const st = host.status();
      return json(res, {
        ok: true,
        connected: st.connected,
        port: st.path,
        baud: st.baudRate,
        platform: PLATFORM,
        transports: ['usb-serial', 'bluetooth-classic-spp', 'j2534-passthru', 'doip'],
        adapterKind: st.adapterKind,
        experimental: st.experimental,
        adapters: ADAPTERS,
        note: 'BLE-only dongles (e.g. Ancel BD200) are not supported. VAS6154 is experimental.',
      });
    }

    if (req.method === 'GET' && url.pathname === '/adapters') {
      return json(res, { platform: PLATFORM, adapters: ADAPTERS });
    }

    if (req.method === 'GET' && url.pathname === '/j2534') {
      const devices = PLATFORM === 'win32' ? vasLab.listPassThruDevices() : [];
      return json(res, {
        platform: PLATFORM,
        supported: PLATFORM === 'win32',
        devices,
        note:
          PLATFORM === 'win32'
            ? 'Install I+ME Actia VAS6154 PassThru so FunctionLibrary appears in the registry.'
            : 'J2534 registry discovery is Windows-only.',
      });
    }

    if (req.method === 'POST' && url.pathname === '/doip/discover') {
      const body = await readJson(req).catch(() => ({}));
      const found = await vasLab.discoverDoipVehicles({
        timeoutMs: Number(body.timeoutMs || 2500),
        port: Number(body.port || 13400),
      });
      return json(res, { found });
    }

    if (req.method === 'GET' && url.pathname === '/ports') {
      return json(res, await host.listPorts());
    }

    if (req.method === 'GET' && url.pathname === '/status') {
      return json(res, host.status());
    }

    if (req.method === 'GET' && url.pathname === '/capabilities') {
      try {
        return json(res, host.capabilities());
      } catch (e) {
        return json(res, { error: e.message }, 400);
      }
    }

    if (req.method === 'GET' && url.pathname === '/live') {
      const live = host.getLive();
      if (!host.status().connected) return json(res, { error: 'Not connected' }, 400);
      return json(res, live);
    }

    if (req.method === 'POST' && url.pathname === '/live') {
      const body = await readJson(req).catch(() => ({}));
      try {
        return json(res, await host.refreshLive({ priorityOnly: body.priorityOnly === true }));
      } catch (e) {
        return json(res, { error: e.message }, 400);
      }
    }

    if (req.method === 'GET' && url.pathname === '/faults') {
      if (!host.status().connected) return json(res, { error: 'Not connected' }, 400);
      return json(res, host.getFaults());
    }

    if (req.method === 'POST' && url.pathname === '/faults') {
      try {
        return json(res, await host.refreshFaults());
      } catch (e) {
        return json(res, { error: e.message }, 400);
      }
    }

    if (req.method === 'GET' && url.pathname === '/vehicle') {
      if (!host.status().connected) return json(res, { error: 'Not connected' }, 400);
      return json(res, host.getVehicle());
    }

    if (req.method === 'POST' && url.pathname === '/vehicle') {
      try {
        return json(res, await host.refreshVehicle());
      } catch (e) {
        return json(res, { error: e.message }, 400);
      }
    }

    if (req.method === 'POST' && url.pathname === '/connect') {
      const body = await readJson(req);
      const adapter = body.adapter === 'vas6154' ? 'vas6154' : 'elm327';
      try {
        const status = await host.connect({
          port: String(body.port || '').trim() || undefined,
          baudRate: body.baudRate != null ? Number(body.baudRate) : undefined,
          adapter,
          experimental: body.experimental === true,
          mode: body.mode,
          dllPath: body.dllPath,
          host: body.host,
          doipPort: body.doipPort != null ? Number(body.doipPort) : body.port && adapter === 'vas6154' && body.host ? Number(body.port) : undefined,
          protocol: body.protocol,
          sourceAddress: body.sourceAddress,
          targetAddress: body.targetAddress,
          readDids: body.readDids,
        });
        return json(res, { ok: true, status });
      } catch (e) {
        return json(res, { error: e.message || String(e) }, 500);
      }
    }

    if (req.method === 'POST' && url.pathname === '/disconnect') {
      await host.disconnect();
      return json(res, { ok: true });
    }

    if (req.method === 'POST' && url.pathname === '/snapshot') {
      try {
        return json(res, await host.snapshot());
      } catch (e) {
        return json(res, { error: e.message }, 400);
      }
    }

    if (req.method === 'POST' && url.pathname === '/poll/start') {
      const body = await readJson(req).catch(() => ({}));
      try {
        return json(res, await host.pollStart(body.intervalMs));
      } catch (e) {
        return json(res, { error: e.message }, 400);
      }
    }

    if (req.method === 'POST' && url.pathname === '/poll/stop') {
      host.stopPoll();
      return json(res, { ok: true });
    }

    if (req.method === 'GET' && url.pathname === '/debug') {
      return json(res, {
        ...host.debug(),
        hostname: os.hostname(),
        adapterKind: host.status().adapterKind,
        experimental: host.status().experimental,
      });
    }

    if (req.method === 'GET') {
      let filePath = url.pathname === '/' ? '/index.html' : url.pathname;
      filePath = path.normalize(filePath).replace(/^(\.\.[/\\])+/, '');
      const full = path.join(PUBLIC, filePath);
      if (!full.startsWith(PUBLIC)) return text(res, 'Forbidden', 403);
      if (!fs.existsSync(full) || fs.statSync(full).isDirectory()) {
        return text(res, 'Not found', 404);
      }
      const ext = path.extname(full);
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
      fs.createReadStream(full).pipe(res);
      return;
    }

    return text(res, 'Not found', 404);
  } catch (e) {
    console.error(e);
    return json(res, { error: e.message || String(e) }, 500);
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`\n  FLAT·SIX OBD bridge running (${PLATFORM})`);
  console.log(`  Core: lib/obd · adapters: elm327 | vas6154 (experimental)`);
  console.log(`  Lab:  tools/obd-bridge/adapters/vas6154 (PassThru / DoIP)`);
  console.log(`  Test UI:  http://127.0.0.1:${PORT}`);
  console.log(`  Health:   http://127.0.0.1:${PORT}/health\n`);
});

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function json(res, body, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body, null, 2));
}

function text(res, body, status = 200) {
  res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(body);
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => {
      data += c;
      if (data.length > 1e6) reject(new Error('Body too large'));
    });
    req.on('end', () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

process.on('SIGINT', async () => {
  await host.disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await host.disconnect();
  process.exit(0);
});
