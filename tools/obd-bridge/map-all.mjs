#!/usr/bin/env node
/**
 * Map the whole car: open-filter sweep 0x700–0x7FF, then a clean full fault read
 * of every responder over UDS (19 02) and KWP (18 00 FF 00). READ-ONLY. Prints a
 * per-module DTC list (raw Porsche hex) to match against a PIWIS module list.
 * Run: node map-all.mjs [port] [baud]
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
const answered19 = (r) => /5902|7F19/.test(hx(r));
function respIds(resp) {
  const ids = new Set();
  for (const line of (resp || '').split('\n')) { const h = hx(line); if (h.length >= 5) ids.add(h.slice(0, 3)); }
  return [...ids];
}
function parseUds(resp) {
  const h = hx(resp); const i = h.indexOf('5902'); if (i < 0) return [];
  const body = h.slice(i + 4).slice(2); const out = [];
  for (let p = 0; p + 8 <= body.length; p += 8) {
    const code = body.slice(p, p + 6); const st = body.slice(p + 6, p + 8);
    if (/^0{6}$/.test(code) || code.length < 6) continue;
    out.push(`${code}(${st})`);
  }
  return out;
}
function parseKwp(resp) {
  const h = hx(resp); const i = h.indexOf('58'); if (i < 0) return [];
  const body = h.slice(i + 2).slice(2); const out = [];
  for (let p = 0; p + 6 <= body.length; p += 6) {
    const code = body.slice(p, p + 4); const st = body.slice(p + 4, p + 6);
    if (/^0{4}$/.test(code)) continue;
    out.push(`${code}(${st})`);
  }
  return out;
}

async function main() {
  const port = new SerialPort({ path: PORT, baudRate: BAUD, autoOpen: false });
  await new Promise((res, rej) => port.open((e) => (e ? rej(e) : res())));
  const elm = new Elm(port);
  await delay(400);
  for (const c of ['ATZ', 'ATE0', 'ATL0', 'ATS0', 'ATSP6', 'ATCAF1', 'ATH1']) await elm.send(c, c === 'ATZ' ? 3000 : 1200);
  await elm.send('ATCRA'); await elm.send('ATCM000');

  console.log('\nSweeping 0x700–0x7FF…');
  const found = new Map();
  for (let id = 0x700; id <= 0x7ff; id++) {
    const req = id.toString(16).toUpperCase().padStart(3, '0');
    await elm.send(`ATSH${req}`);
    const r = await elm.send('1902FF', 450);
    if (answered19(r)) {
      const ids = respIds(r).filter((x) => x !== req);
      if (ids.length) found.set(req, ids[0]);
    }
  }

  console.log(`\n${found.size} responders — full fault read:\n`);
  await elm.send('ATH0');
  const rows = [];
  for (const [req, resp] of found) {
    await elm.send(`ATSH${req}`);
    await elm.send(`ATCRA${resp}`);
    const uds = await elm.send('1902FF', 4000);
    const kwp = await elm.send('1800FF00', 4000);
    const udsDtc = parseUds(uds), kwpDtc = parseKwp(kwp);
    const proto = /5902/.test(hx(uds)) ? 'UDS' : /^58/.test(hx(kwp)) || /5800|58[0-9A-F]/.test(hx(kwp)) ? 'KWP' : '?';
    const dtcs = proto === 'KWP' ? kwpDtc : udsDtc;
    rows.push({ req, resp, proto, dtcs });
  }
  rows.sort((a, b) => parseInt(a.req, 16) - parseInt(b.req, 16));
  for (const r of rows) {
    console.log(`  ${r.req}→${r.resp} [${r.proto}] ${r.dtcs.length ? r.dtcs.join(' ') : '(clean)'}`);
  }
  await new Promise((res) => port.close(res));
  console.log('\nDone.');
}
main().catch((e) => { console.error('Failed:', e.message); process.exit(1); });
