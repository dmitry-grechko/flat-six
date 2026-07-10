#!/usr/bin/env node
/**
 * FLAT·SIX local OBD bridge — ELM327 over serial (USB or Bluetooth SPP on Mac).
 * Serves a test UI at http://127.0.0.1:8765
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Elm327 } from './elm327.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.OBD_BRIDGE_PORT || 8765);
const PUBLIC = path.join(__dirname, 'public');

/** @type {Elm327 | null} */
let session = null;
let pollTimer = null;
/** @type {object | null} */
let lastSnapshot = null;

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
      return json(res, {
        ok: true,
        connected: session?.isOpen() === true,
        port: session?.path ?? null,
        baud: session?.baudRate ?? null,
      });
    }

    if (req.method === 'GET' && url.pathname === '/ports') {
      const { SerialPort } = await import('serialport');
      const list = await SerialPort.list();
      const ports = list
        .map((p) => ({
          path: p.path,
          manufacturer: p.manufacturer || null,
          serialNumber: p.serialNumber || null,
          vendorId: p.vendorId || null,
          productId: p.productId || null,
          // macOS BT dongles often only show path
          hint: guessPortHint(p.path),
        }))
        .sort((a, b) => a.path.localeCompare(b.path));
      return json(res, { ports });
    }

    if (req.method === 'GET' && url.pathname === '/status') {
      return json(res, {
        connected: session?.isOpen() === true,
        path: session?.path ?? null,
        baudRate: session?.baudRate ?? null,
        adapter: session?.adapterInfo ?? null,
        protocol: session?.protocol ?? null,
        polling: pollTimer != null,
        lastSnapshot,
      });
    }

    if (req.method === 'POST' && url.pathname === '/connect') {
      const body = await readJson(req);
      const port = String(body.port || '').trim();
      const baudRate = Number(body.baudRate || 38400);
      if (!port) return json(res, { error: 'Missing port' }, 400);

      await disconnect();

      session = new Elm327(port, baudRate);
      await session.open();
      lastSnapshot = await session.snapshot();
      return json(res, { ok: true, status: await statusPayload() });
    }

    if (req.method === 'POST' && url.pathname === '/disconnect') {
      await disconnect();
      return json(res, { ok: true });
    }

    if (req.method === 'POST' && url.pathname === '/snapshot') {
      if (!session?.isOpen()) return json(res, { error: 'Not connected' }, 400);
      lastSnapshot = await session.snapshot();
      return json(res, lastSnapshot);
    }

    if (req.method === 'POST' && url.pathname === '/poll/start') {
      const body = await readJson(req).catch(() => ({}));
      const intervalMs = Math.max(500, Number(body.intervalMs || 1000));
      if (!session?.isOpen()) return json(res, { error: 'Not connected' }, 400);
      stopPoll();
      pollTimer = setInterval(async () => {
        try {
          if (session?.isOpen()) lastSnapshot = await session.snapshot();
        } catch (e) {
          console.error('[poll]', e.message);
        }
      }, intervalMs);
      return json(res, { ok: true, intervalMs });
    }

    if (req.method === 'POST' && url.pathname === '/poll/stop') {
      stopPoll();
      return json(res, { ok: true });
    }

    if (req.method === 'GET' && url.pathname === '/debug') {
      return json(res, {
        log: session?.getDebugLog() ?? [],
        lastSnapshot,
      });
    }

    // Static UI
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
  console.log(`\n  FLAT·SIX OBD bridge running`);
  console.log(`  Test UI:  http://127.0.0.1:${PORT}`);
  console.log(`  Health:   http://127.0.0.1:${PORT}/health\n`);
});

async function disconnect() {
  stopPoll();
  if (session) {
    try {
      await session.close();
    } catch {
      /* ignore */
    }
  }
  session = null;
  lastSnapshot = null;
}

function stopPoll() {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = null;
}

async function statusPayload() {
  return {
    connected: session?.isOpen() === true,
    path: session?.path ?? null,
    baudRate: session?.baudRate ?? null,
    adapter: session?.adapterInfo ?? null,
    protocol: session?.protocol ?? null,
    polling: pollTimer != null,
    lastSnapshot,
  };
}

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

function guessPortHint(portPath) {
  const p = portPath.toLowerCase();
  if (p.includes('bluetooth-incoming')) return 'Not your OBD dongle';
  if (p.includes('debug-console')) return 'Not your OBD dongle';
  if (p.includes('obd') || p.includes('elm') || p.includes('chx') || p.includes('spp')) {
    return 'Likely Bluetooth OBD dongle';
  }
  if (p.includes('usb') || p.includes('usbserial') || p.includes('wch') || p.includes('slab')) {
    return 'Likely USB serial adapter';
  }
  if (p.startsWith('/dev/cu.')) return 'macOS serial — may be paired BT dongle';
  return null;
}

process.on('SIGINT', async () => {
  await disconnect();
  process.exit(0);
});
