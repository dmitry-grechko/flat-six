#!/usr/bin/env node
/**
 * FLAT·SIX local OBD bridge — thin HTTP wrapper around lib/obd ObdHost.
 *
 * ELM327 over USB serial + Bluetooth Classic SPP.
 * Serves test UI at http://127.0.0.1:8765
 *
 * Run: npm start  (uses tsx so lib/obd/*.ts resolves)
 */

import Module from 'node:module';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// lib/obd resolves packages from the repo root; use this bridge's node_modules.
const bridgeModules = path.join(__dirname, 'node_modules');
process.env.NODE_PATH = [bridgeModules, process.env.NODE_PATH].filter(Boolean).join(path.delimiter);
Module._initPaths();

const PORT = Number(process.env.OBD_BRIDGE_PORT || 8765);
const PUBLIC = path.join(__dirname, 'public');
const PLATFORM = process.platform;

const hostMod = await import(pathToFileURL(path.join(__dirname, '../../lib/obd/node.ts')).href);
/** @type {import('../../lib/obd/host').ObdHost} */
const host = new hostMod.ObdHost(PLATFORM);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
};

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
        transports: ['usb-serial', 'bluetooth-classic-spp'],
        adapterKind: st.adapterKind,
        note: 'BLE-only dongles (e.g. Ancel BD200) are not supported — need USB or Classic BT serial.',
      });
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
      if (!host.status().connected) return json(res, { error: 'Not connected' }, 400);
      return json(res, host.getLive());
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
      try {
        const status = await host.connect({
          port: String(body.port || '').trim(),
          baudRate: Number(body.baudRate || 38400),
          adapter: 'elm327',
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
  console.log(`  Adapter: elm327 (USB serial + Bluetooth Classic SPP)`);
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
