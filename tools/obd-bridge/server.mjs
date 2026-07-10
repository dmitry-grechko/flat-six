#!/usr/bin/env node
/**
 * FLAT·SIX local OBD bridge — ELM327 over serial.
 *
 * Transports (same API):
 *   - USB ELM327  → /dev/cu.usbserial* (Mac) or COMx (Windows)
 *   - Bluetooth Classic SPP → paired dongle as serial port (NOT BLE-only like Ancel BD200)
 *
 * Serves test UI at http://127.0.0.1:8765
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { Elm327 } from './elm327.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.OBD_BRIDGE_PORT || 8765);
const PUBLIC = path.join(__dirname, 'public');
const PLATFORM = process.platform; // darwin | win32 | linux

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
        platform: PLATFORM,
        transports: ['usb-serial', 'bluetooth-classic-spp'],
        note: 'BLE-only dongles (e.g. Ancel BD200) are not supported — need USB or Classic BT serial.',
      });
    }

    if (req.method === 'GET' && url.pathname === '/ports') {
      const { SerialPort } = await import('serialport');
      const list = await SerialPort.list();
      const ports = list
        .map((p) => classifyPort(p))
        .filter((p) => !p.ignore)
        .sort((a, b) => b.score - a.score || a.path.localeCompare(b.path));
      return json(res, { platform: PLATFORM, ports });
    }

    if (req.method === 'GET' && url.pathname === '/status') {
      return json(res, {
        connected: session?.isOpen() === true,
        path: session?.path ?? null,
        baudRate: session?.baudRate ?? null,
        transport: session ? classifyPath(session.path).transport : null,
        adapter: session?.adapterInfo ?? null,
        protocol: session?.protocol ?? null,
        polling: pollTimer != null,
        lastSnapshot,
        platform: PLATFORM,
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
        platform: PLATFORM,
        hostname: os.hostname(),
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
  console.log(`\n  FLAT·SIX OBD bridge running (${PLATFORM})`);
  console.log(`  Transports: USB serial + Bluetooth Classic SPP`);
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
    transport: session ? classifyPath(session.path).transport : null,
    adapter: session?.adapterInfo ?? null,
    protocol: session?.protocol ?? null,
    polling: pollTimer != null,
    lastSnapshot,
    platform: PLATFORM,
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

/**
 * Classify a serialport list entry for UI hints + ranking.
 * @param {{ path: string, manufacturer?: string|null, vendorId?: string|null, productId?: string|null, serialNumber?: string|null }} p
 */
function classifyPort(p) {
  const base = classifyPath(p.path, p.manufacturer);
  return {
    path: p.path,
    manufacturer: p.manufacturer || null,
    serialNumber: p.serialNumber || null,
    vendorId: p.vendorId || null,
    productId: p.productId || null,
    ...base,
  };
}

function classifyPath(portPath, manufacturer = null) {
  const p = String(portPath || '').toLowerCase();
  const mfg = String(manufacturer || '').toLowerCase();
  const blob = `${p} ${mfg}`;

  // Noise — hide from UI
  if (
    p.includes('bluetooth-incoming') ||
    p.includes('debug-console') ||
    p.includes('bluetooth-modem') ||
    /^\/dev\/tty\./.test(p) // prefer /dev/cu.* on macOS (caller may still list tty)
  ) {
    // On macOS SerialPort often lists both tty.* and cu.* — keep cu only
    if (PLATFORM === 'darwin' && p.startsWith('/dev/tty.')) {
      return { transport: 'other', hint: 'Duplicate tty (use cu.*)', score: -100, ignore: true };
    }
    if (p.includes('bluetooth-incoming') || p.includes('debug-console')) {
      return { transport: 'other', hint: 'Not your OBD dongle', score: -50, ignore: true };
    }
  }

  // USB serial (CH340 / FTDI / CP210x / etc.)
  if (
    /usb|usbserial|wch|ch340|ch341|ftdi|cp210|silabs|slab|prolific|pl2303|arduino/.test(blob) ||
    (PLATFORM === 'win32' && /usb/.test(blob))
  ) {
    return {
      transport: 'usb',
      hint: 'USB ELM327 / USB-serial',
      score: 100,
      ignore: false,
    };
  }

  // Bluetooth Classic SPP (pairs as serial — NOT BLE-only Ancel BD200)
  if (/bluetooth|bt-|rfcomm|spp|obd|elm|chx|bafang/.test(blob)) {
    return {
      transport: 'bluetooth-classic',
      hint: 'Bluetooth Classic serial (SPP)',
      score: 80,
      ignore: false,
    };
  }

  // Windows COM ports without metadata — still show them
  if (PLATFORM === 'win32' && /^com\d+$/i.test(portPath)) {
    return {
      transport: 'serial',
      hint: 'Windows COM port (USB or paired BT)',
      score: 60,
      ignore: false,
    };
  }

  // macOS cu.* unknown
  if (p.startsWith('/dev/cu.')) {
    return {
      transport: 'serial',
      hint: 'macOS serial — may be USB or paired BT',
      score: 40,
      ignore: false,
    };
  }

  return {
    transport: 'other',
    hint: null,
    score: 10,
    ignore: false,
  };
}

process.on('SIGINT', async () => {
  await disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await disconnect();
  process.exit(0);
});
