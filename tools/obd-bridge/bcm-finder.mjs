#!/usr/bin/env node
/**
 * Hunt a non-DME module (front BCM) + Porsche fault 89 02 0E. READ-ONLY.
 *
 * Open-filter sweep: headers ON, receive mask cleared (ATCM 000) so a module's
 * reply is seen on ANY response id (not just req+8). Probes each request id
 * 0x700–0x7FF with UDS `19 02 FF`; a reply containing 59 02 (positive) or 7F 19
 * (refusal) means a module lives there. Then deep-reads each responder on its
 * actual reply id over UDS + KWP and hunts 89 02 0E. Run: node bcm-finder.mjs
 */
import { SerialPort } from 'serialport';

const PORT = process.argv[2] || '/dev/cu.usbserial-1110';
const BAUD = Number(process.argv[3] || 38400);
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

class Elm {
  constructor(port) {
    this.port = port; this.buf = ''; this.waiters = [];
    port.on('data', (c) => {
      this.buf += c.toString('utf8');
      if (this.buf.includes('>')) {
        const out = this.buf.replace(/>/g, '').trim(); this.buf = '';
        const w = this.waiters.shift(); if (w) { clearTimeout(w.t); w.res(out); }
      }
    });
  }
  send(cmd, timeout = 1500) {
    return new Promise((res) => {
      const t = setTimeout(() => {
        const i = this.waiters.findIndex((w) => w.t === t);
        if (i >= 0) this.waiters.splice(i, 1);
        res('__TIMEOUT__');
      }, timeout);
      this.waiters.push({ res, t });
      this.port.write(`${cmd}\r`);
    });
  }
}

const hx = (s) => (s || '').replace(/[^0-9A-Fa-f]/g, '').toUpperCase();
function decodeDtc2(a, b) {
  const ch = ['P', 'C', 'B', 'U'][(a >> 6) & 3];
  const h = (n) => n.toString(16).toUpperCase();
  return `${ch}${(a >> 4) & 3}${h(a & 0xf)}${h((b >> 4) & 0xf)}${h(b & 0xf)}`;
}
/** Responder ids from a headers-on reply (first 3 hex of each line). */
function respIds(resp) {
  const ids = new Set();
  for (const line of (resp || '').split('\n')) {
    const h = hx(line);
    if (h.length >= 5) ids.add(h.slice(0, 3));
  }
  return [...ids];
}
const answered19 = (r) => /5902|7F19/.test(hx(r));
const has89020E = (r) => hx(r).includes('89020E');

function parseUds(resp) {
  const h = hx(resp); const i = h.indexOf('5902');
  if (i < 0) return [];
  const body = h.slice(i + 4).slice(2); const out = [];
  for (let p = 0; p + 8 <= body.length; p += 8) {
    const b = [body.slice(p, p + 2), body.slice(p + 2, p + 4), body.slice(p + 4, p + 6)].map((x) => parseInt(x, 16));
    if (b.every((x) => x === 0)) continue;
    out.push({ hex: body.slice(p, p + 6), sae: `${decodeDtc2(b[0], b[1])}-${body.slice(p + 4, p + 6)}`, status: body.slice(p + 6, p + 8) });
  }
  return out;
}
function parseKwp(resp) {
  const h = hx(resp); const i = h.indexOf('58');
  if (i < 0) return [];
  const body = h.slice(i + 2).slice(2); const out = [];
  for (let p = 0; p + 6 <= body.length; p += 6) {
    const a = parseInt(body.slice(p, p + 2), 16), b = parseInt(body.slice(p + 2, p + 4), 16);
    if (a === 0 && b === 0) continue;
    out.push({ hex: body.slice(p, p + 4), sae: decodeDtc2(a, b), status: body.slice(p + 4, p + 6) });
  }
  return out;
}

async function main() {
  const port = new SerialPort({ path: PORT, baudRate: BAUD, autoOpen: false });
  await new Promise((res, rej) => port.open((e) => (e ? rej(e) : res())));
  const elm = new Elm(port);
  await delay(400);
  for (const c of ['ATZ', 'ATE0', 'ATL0', 'ATS0', 'ATSP6', 'ATCAF1', 'ATH1']) {
    await elm.send(c, c === 'ATZ' ? 3000 : 1200);
  }
  await elm.send('ATCRA'); // reset any specific filter
  await elm.send('ATCM000'); // mask 000 → accept replies from any id

  console.log(`\nOpen-filter sweep 0x700–0x7FF (headers on)…\n`);
  const found = new Map(); // req -> Set(respId)
  for (let id = 0x700; id <= 0x7ff; id++) {
    const req = id.toString(16).toUpperCase().padStart(3, '0');
    await elm.send(`ATSH${req}`);
    const r = await elm.send('1902FF', 500);
    if (answered19(r)) {
      const ids = respIds(r).filter((x) => x !== req);
      found.set(req, new Set(ids));
      console.log(`  req ${req} answered from [${ids.join(', ') || '?'}] -> ${r.replace(/\n/g, ' ').trim()}${has89020E(r) ? '  *** 89 02 0E ***' : ''}`);
    }
  }

  console.log(`\nDeep-read of ${found.size} responder(s):\n`);
  await elm.send('ATH0');
  for (const [req, ids] of found) {
    for (const respId of ids.size ? [...ids] : [((parseInt(req, 16) + 8) & 0x7ff).toString(16).toUpperCase().padStart(3, '0')]) {
      await elm.send(`ATSH${req}`);
      await elm.send(`ATCRA${respId}`);
      const uds = await elm.send('1902FF', 4000);
      const kwp = await elm.send('1800FF00', 4000);
      console.log(`  ${req}→${respId}: UDS -> ${uds.replace(/\n/g, ' ').trim()}`);
      for (const d of parseUds(uds)) console.log(`       ${d.hex} (SAE ${d.sae}) st ${d.status}${d.hex === '89020E' ? '  <-- MATCH' : ''}`);
      console.log(`  ${req}→${respId}: KWP -> ${kwp.replace(/\n/g, ' ').trim()}`);
      for (const d of parseKwp(kwp)) console.log(`       ${d.hex} (SAE ${d.sae}) st ${d.status}`);
      if (has89020E(uds) || has89020E(kwp)) console.log(`   *** 89 02 0E at ${req}→${respId} ***`);
    }
  }

  await new Promise((res) => port.close(res));
  console.log('\nDone.');
}
main().catch((e) => { console.error('Probe failed:', e.message); process.exit(1); });
