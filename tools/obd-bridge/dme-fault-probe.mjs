#!/usr/bin/env node
/**
 * FLAT·SIX — DME STORED-FAULT DISCOVERY PROBE (READ-ONLY)
 * ======================================================
 *
 * PURPOSE
 *   On a real 2013 Porsche 981 (Bosch DME) generic Mode 03 returns "4300" = ZERO
 *   stored emissions DTCs, yet the factory tester (PIWIS) shows a stored fault:
 *     P000C  "A" Camshaft Position Slow Response, Bank 2   (DME bytes 00 0C)
 *   Mode 03 only reports emissions DTCs that light the MIL, so P000C lives in a
 *   fault memory generic OBD does not surface. Earlier live tests also showed the
 *   DME REJECTS UDS at 7E0/7E8:  10 03 -> 7F 10 12 (subFunctionNotSupported),
 *   19 02 FF -> 7F 19 11 (serviceNotSupported).
 *
 *   This script fires a LABELLED battery of read-only requests — every plausible
 *   way to make the DME cough up that stored code — and reports, per attempt, the
 *   request, the raw ELM reply, a classification (positive / negative+NRC / silent)
 *   and any DTC it can decode, hunting specifically for P000C ("000C").
 *
 * READ-ONLY — GUARANTEE
 *   Every request only READS. No ClearDiagnosticInformation (OBD Mode 04 / UDS 14),
 *   no writes, no actuator tests, no security access. Session control (10 03 / 10 01)
 *   and TesterPresent (3E 00) only change/keep the diagnostic session and are
 *   automatically dropped by the DME's S3 timeout. Nothing is persisted.
 *
 * HOW TO RUN
 *   From tools/obd-bridge (so `serialport` resolves):
 *     node dme-fault-probe.mjs [port] [baud]
 *   Defaults: port /dev/cu.usbserial-1110   baud 38400
 *   Example:  node dme-fault-probe.mjs /dev/cu.usbserial-1110 38400
 *   Ignition ON (engine may be off). USB ELM327 strongly preferred on macOS.
 *
 * WHAT EACH SECTION TESTS (and why)
 *   0  Connectivity   — ATI/ATDP/0100/0902/03: prove we really are on the DME.
 *   A  Generic OBD    — 03 confirmed, 07 pending, 0A PERMANENT (persists across
 *                       clears), 02 02 freeze-frame DTC: the non-MIL OBD memories
 *                       Mode 03 skips — cheapest place P000C could surface.
 *   B  UDS service 19 — ReadDTCInformation across MULTIPLE sub-functions and
 *                       MULTIPLE sessions (default, 10 03 extended, 10 01): the
 *                       code may be gated behind a session or a different sub-fn.
 *   C  KWP2000 svc 18 — readDTCByStatus (+ readDataByLocalId 21): the 981/987 DME
 *                       may speak KWP-on-CAN, not UDS — different service entirely.
 *   D  Alt addresses  — headers ON + open receive filter: catch the DME (or a
 *                       sibling controller) answering on a CAN ID other than 7E8.
 *
 * Studied from: tools/obd-bridge/uds-probe.mjs (ELM I/O + classify/NRC) and
 *               lib/obd/decode.ts (decodeDtc + DTC parsers), ported inline so this
 *               runs under plain `node` with no TypeScript loader.
 */

import { SerialPort } from 'serialport';
import { existsSync } from 'node:fs';

// ---- CLI: positional [port] [baud] (plus optional --timeout) --------------
const positional = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const flag = (name, def = null) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : def;
};
const EXPLICIT_PORT = positional[0] || flag('port');
const PORT = EXPLICIT_PORT || '/dev/cu.usbserial-1110';
const BAUD = Number(positional[1] || flag('baud') || '38400');
const DEFAULT_TIMEOUT = Number(flag('timeout', '1500')); // ms per command

// ---- tiny ELM client (exact I/O pattern from uds-probe.mjs) ---------------
function delay(ms) { return new Promise((r) => setTimeout(r, ms)); }

class Elm {
  constructor(port) {
    this.port = port;
    this.buf = '';
    this.waiters = [];
    port.on('data', (chunk) => {
      this.buf += chunk.toString('utf8');
      if (this.buf.includes('>')) {
        const out = this.buf.replace(/>/g, '').trim();
        this.buf = '';
        const w = this.waiters.shift();
        if (w) { clearTimeout(w.timer); w.resolve(out); }
      }
    });
  }
  send(cmd, timeout = DEFAULT_TIMEOUT) {
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        const i = this.waiters.findIndex((w) => w.timer === timer);
        if (i >= 0) this.waiters.splice(i, 1);
        resolve('__TIMEOUT__');
      }, timeout);
      this.waiters.push({ resolve, timer });
      this.port.write(`${cmd}\r`);
    });
  }
}

let cleanEcho = ''; // echo is off (ATE0); kept for parity with uds-probe.mjs
function clean(s) {
  return (s || '')
    .split('\n').map((l) => l.trim()).filter(Boolean)
    .filter((l) => l.toUpperCase() !== cleanEcho)
    .join(' ')
    .trim();
}

// ---- classify + NRC names (ported from uds-probe.mjs) ---------------------
const NRC = {
  '10': 'generalReject', '11': 'serviceNotSupported', '12': 'subFunctionNotSupported',
  '13': 'incorrectMessageLength', '22': 'conditionsNotCorrect', '31': 'requestOutOfRange',
  '33': 'securityAccessDenied', '35': 'invalidKey', '7E': 'subFuncNotSupportedInSession',
  '7F': 'serviceNotSupportedInActiveSession', '78': 'responsePending',
};

/**
 * Classify an ELM response for one request service byte.
 *  positive: module answered with SID+0x40      -> real data
 *  negative: 7F <sid> <nrc>                      -> present but refused (still reachable)
 *  silent:   NO DATA / timeout / bus noise       -> nothing answered
 */
function classify(resp, reqSid) {
  if (!resp || resp === '__TIMEOUT__') return { kind: 'silent' };
  const r = resp.toUpperCase();
  if (/NO DATA|UNABLE TO CONNECT|CAN ERROR|BUS INIT|STOPPED|SEARCHING|^ERROR|\?/.test(r)) {
    return { kind: 'silent' };
  }
  const bytes = r.replace(/[^0-9A-F]/g, '').match(/.{2}/g) || [];
  const i7f = bytes.indexOf('7F');
  if (i7f >= 0 && bytes[i7f + 1] === reqSid.toUpperCase()) {
    const nrc = bytes[i7f + 2] || '';
    return { kind: 'negative', nrc, nrcName: NRC[nrc] || `NRC 0x${nrc}` };
  }
  const posSid = (parseInt(reqSid, 16) + 0x40).toString(16).toUpperCase().padStart(2, '0');
  if (bytes.includes(posSid)) return { kind: 'positive' };
  return /[0-9A-F]{2}/.test(r) ? { kind: 'positive' } : { kind: 'silent' };
}

// ---- DTC decode helpers (ported from lib/obd/decode.ts) -------------------

/** 2 DME bytes -> DTC string. P000C is bytes 00 0C: ch=P, digits 0,0,0,C. */
function decodeDtc(a, b) {
  const ch = ['P', 'C', 'B', 'U'][(a >> 6) & 3];
  const d1 = (a >> 4) & 3;
  const d2 = a & 0x0f;
  const d3 = (b >> 4) & 0x0f;
  const d4 = b & 0x0f;
  return `${ch}${d1}${d2.toString(16).toUpperCase()}${d3.toString(16).toUpperCase()}${d4.toString(16).toUpperCase()}`;
}

function allHexFrames(raw) {
  return String(raw).split('\n').map((l) => l.replace(/\s+/g, '').toUpperCase()).filter(Boolean);
}

/** Concatenate ISO-TP data bytes, stripping "N:" frame counters + length lines. */
function isoTpDataHex(raw) {
  const parts = [];
  for (const line of String(raw).split(/\n/)) {
    const t = line.trim();
    if (!t) continue;
    const m = t.match(/^([0-9A-Fa-f]+):(.*)$/);
    if (m) {
      const hex = m[2].replace(/[^0-9A-Fa-f]/g, '').toUpperCase();
      if (hex) parts.push(hex);
      continue;
    }
    const hex = t.replace(/[^0-9A-Fa-f]/g, '').toUpperCase();
    if (hex.length >= 4) parts.push(hex);
  }
  return parts.join('');
}

/** Generic OBD stored/pending/permanent DTCs (Mode 03/07/0A). */
function parseGenericDtcs(raw, mode) {
  const modeNum = mode.toUpperCase();
  const respPrefix = modeNum === '03' ? '43' : modeNum === '07' ? '47' : modeNum === '0A' ? '4A' : '43';
  const codes = new Set();
  for (const hex of allHexFrames(raw)) {
    const idx = hex.indexOf(respPrefix);
    if (idx < 0) continue;
    const body = hex.slice(idx + respPrefix.length);
    if (body.length >= 2) {
      const maybeCount = parseInt(body.slice(0, 2), 16);
      if (!Number.isNaN(maybeCount) && maybeCount === 0) continue;
      if (!Number.isNaN(maybeCount) && maybeCount > 0 && maybeCount <= 16 && body.length >= 2 + maybeCount * 4) {
        let pos = 2;
        for (let i = 0; i < maybeCount; i++) {
          const a = parseInt(body.slice(pos, pos + 2), 16);
          const b = parseInt(body.slice(pos + 2, pos + 4), 16);
          pos += 4;
          if (a === 0 && b === 0) continue;
          codes.add(decodeDtc(a, b));
        }
        continue;
      }
    }
    let pos = 0;
    while (pos + 4 <= body.length) {
      const a = parseInt(body.slice(pos, pos + 2), 16);
      const b = parseInt(body.slice(pos + 2, pos + 4), 16);
      pos += 4;
      if (a === 0 && b === 0) break;
      if (Number.isNaN(a) || Number.isNaN(b)) break;
      codes.add(decodeDtc(a, b));
    }
  }
  if (/NO DATA|NODATA/i.test(raw)) return [];
  return [...codes];
}

/** Freeze-frame DTC (Mode 02 PID 02): 42 02 [frame] <DTC hi> <DTC lo>. */
function parseFreezeFrameDtc(raw) {
  for (const hex of allHexFrames(raw)) {
    const idx = hex.indexOf('4202');
    if (idx < 0) continue;
    let data = hex.slice(idx + 4);
    if (data.length >= 6) {
      const frame = parseInt(data.slice(0, 2), 16);
      if (frame <= 0x0f) data = data.slice(2);
    }
    if (data.length < 4) continue;
    const a = parseInt(data.slice(0, 2), 16);
    const b = parseInt(data.slice(2, 4), 16);
    if (a === 0 && b === 0) return null;
    return decodeDtc(a, b);
  }
  return null;
}

/**
 * UDS ReadDTCInformation records. `59 <sub> [mask] [DTC(3) status(1)]...`.
 * Sub 02 (byStatusMask) & 0A (supportedDTC) carry a 1-byte availability mask
 * before the records; sub 03 (snapshotIdentification) uses DTC(3)+recNum(1);
 * sub 01 (numberOfDTC) returns a COUNT, not a DTC list (handled by caller).
 */
function parseUds19(raw, sub) {
  const s = String(sub).toUpperCase().padStart(2, '0');
  if (s === '01') return []; // count report, no code list
  const combined = isoTpDataHex(raw);
  const idx = combined.indexOf(`59${s}`);
  if (idx < 0) return [];
  let body = combined.slice(idx + 4);
  if (s === '02' || s === '0A') body = body.slice(2); // drop availability mask
  const out = [];
  for (let p = 0; p + 8 <= body.length; p += 8) {
    const b0 = parseInt(body.slice(p, p + 2), 16);
    const b1 = parseInt(body.slice(p + 2, p + 4), 16);
    const b2 = parseInt(body.slice(p + 4, p + 6), 16); // ftb (or record#)
    const st = parseInt(body.slice(p + 6, p + 8), 16);
    if ([b0, b1, b2, st].some(Number.isNaN)) break;
    if (b0 === 0 && b1 === 0 && b2 === 0) continue;
    const base = decodeDtc(b0, b1);
    out.push(b2 && (s === '02' || s === '0A') ? `${base}-${b2.toString(16).toUpperCase().padStart(2, '0')}` : base);
  }
  return out;
}

/** KWP2000 service 18 readDTCByStatus: `58 <count> [DTC(2) status(1)]...`. */
function parseKwp18(raw) {
  const combined = isoTpDataHex(raw);
  const idx = combined.indexOf('58');
  if (idx < 0) return [];
  const body = combined.slice(idx + 2).slice(2); // skip 58 + count
  const out = [];
  for (let p = 0; p + 6 <= body.length; p += 6) {
    const b0 = parseInt(body.slice(p, p + 2), 16);
    const b1 = parseInt(body.slice(p + 2, p + 4), 16);
    const st = parseInt(body.slice(p + 4, p + 6), 16);
    if ([b0, b1, st].some(Number.isNaN)) break;
    if (b0 === 0 && b1 === 0) continue;
    out.push(decodeDtc(b0, b1));
  }
  return out;
}

/** With headers ON, list the leading 3-hex-digit responder CAN IDs. */
function respondersFromRaw(raw) {
  const ids = new Set();
  for (const line of String(raw).split('\n')) {
    const m = line.trim().match(/^([0-9A-Fa-f]{3})[\s:]/);
    if (m) ids.add(m[1].toUpperCase());
  }
  return [...ids];
}

// ---- decoders per attempt kind -------------------------------------------
const decNone = () => ({ codes: [] });                              // classify only
const decGeneric = (mode) => (raw) => ({ codes: parseGenericDtcs(raw, mode) });
const decFreeze = (raw) => { const c = parseFreezeFrameDtc(raw); return { codes: c ? [c] : [] }; };
const decUds19 = (sub) => (raw) => ({ codes: parseUds19(raw, sub) });
const decKwp18 = (raw) => ({ codes: parseKwp18(raw) });
const decRaw = () => ({ codes: [] });                              // unknown layout: rely on raw 000C flag

// ---- misc helpers ---------------------------------------------------------
function pretty(cmd) { return cmd.replace(/(.{2})/g, '$1 ').trim(); }
function oneLine(raw) { return String(raw).split('\n').map((l) => l.trim()).filter(Boolean).join(' | ') || '(empty)'; }
function hasP000CBytes(raw) { return String(raw).replace(/[^0-9A-Fa-f]/g, '').toUpperCase().includes('000C'); }

// ---- port pick ------------------------------------------------------------
async function pickPort() {
  if (EXPLICIT_PORT) return EXPLICIT_PORT;          // respect an explicit choice
  if (existsSync(PORT)) return PORT;                // default present
  const ports = await SerialPort.list();            // else help the user find it
  const scored = ports
    .map((p) => {
      const blob = `${p.path} ${p.manufacturer || ''}`.toLowerCase();
      let score = 0;
      if (/usbserial|ch340|ch341|ftdi|cp210|slab|wch|prolific|pl2303/.test(blob)) score += 100;
      if (/^\/dev\/cu\./.test(p.path)) score += 20;
      if (/^\/dev\/tty\./.test(p.path)) score -= 100;
      if (/bluetooth-incoming|debug-console/.test(blob)) score -= 100;
      return { path: p.path, mfg: p.manufacturer || '', score };
    })
    .sort((a, b) => b.score - a.score);
  console.log('Default port not found. Ports available:');
  for (const p of scored) console.log(`  ${p.score >= 0 ? '•' : '·'} ${p.path}  ${p.mfg}`);
  if (!scored.length || scored[0].score < 0) {
    throw new Error(`No obvious ELM327 port (default ${PORT} absent). Pass one: node dme-fault-probe.mjs /dev/cu.usbserial-XXXX 38400`);
  }
  return scored[0].path;
}

// ---- run + report one attempt (self-contained try/catch: never throws) ----
const results = [];
async function runAttempt(elm, section, label, cmd, sid, decode, opts = {}) {
  const headersOn = !!opts.headersOn;
  const timeout = opts.timeout || DEFAULT_TIMEOUT;
  const rec = { section, label, req: pretty(cmd), classText: 'ERROR', codes: [], p000cDecoded: false, p000cRaw: false, responders: [], raw: '' };
  try {
    const raw = await elm.send(cmd, timeout);
    rec.raw = raw;
    const c = classify(raw, sid);
    rec.classText = c.kind === 'negative' ? `negative (${c.nrcName})` : c.kind;
    rec.codes = decode(raw).codes || [];
    rec.p000cDecoded = rec.codes.some((x) => /^P000C/i.test(String(x)));
    rec.p000cRaw = hasP000CBytes(raw);
    if (headersOn) rec.responders = respondersFromRaw(raw);

    console.log(`  [${section}] ${label}`);
    console.log(`      req   ${pretty(cmd)}`);
    console.log(`      raw   ${oneLine(raw)}`);
    console.log(`      class ${rec.classText}`);
    if (headersOn) console.log(`      from  ${rec.responders.length ? rec.responders.join(', ') : '(no responder id)'}`);
    console.log(`      DTCs  ${rec.codes.length ? rec.codes.join(', ') : '(none decoded)'}`);
    console.log(`      P000C ${rec.p000cDecoded ? 'DECODED ✓✓' : rec.p000cRaw ? 'raw 000C bytes present (weak — verify)' : 'not seen'}`);
  } catch (e) {
    rec.error = e.message;
    console.log(`  [${section}] ${label}`);
    console.log(`      req   ${pretty(cmd)}  -> ERROR: ${e.message}`);
  }
  results.push(rec);
  return rec;
}

// ---- main -----------------------------------------------------------------
async function main() {
  const path = await pickPort();
  console.log(`\nFLAT·SIX DME stored-fault probe (READ-ONLY)`);
  console.log(`Opening ${path} @ ${BAUD} ...  (hunting stored P000C the factory tester shows but Mode 03 hides)`);
  const port = new SerialPort({ path, baudRate: BAUD, autoOpen: false });
  await new Promise((res, rej) => port.open((e) => (e ? rej(e) : res())));
  const elm = new Elm(port);
  await delay(400);

  // ---- ELM init: reset, echo/linefeed/space off, CAN 11/500, ISO-TP auto,
  //      headers OFF (clean payloads), physical-address the DME, filter to it.
  await elm.send('ATZ', 3000);
  await delay(300);
  await elm.send('ATE0');   // echo off
  await elm.send('ATL0');   // linefeeds off
  await elm.send('ATS0');   // spaces off
  await elm.send('ATSP6');  // ISO 15765-4 CAN, 11-bit, 500 kbps
  await elm.send('ATCAF1'); // let ELM assemble/split ISO-TP frames
  await elm.send('ATH0');   // headers OFF -> clean payload for the DTC parsers
  await elm.send('ATSH7E0'); // physical request header to the DME
  await elm.send('ATCRA7E8'); // accept only the DME's response id

  // ---- SECTION 0 — connectivity: prove we are actually on the DME ----------
  console.log('\n=== SECTION 0 — connectivity (confirm real DME) ===');
  const adapter = clean(await elm.send('ATI'));
  const proto = clean(await elm.send('ATDP'));
  const pids = clean(await elm.send('0100', 2500));
  const vin = clean(await elm.send('0902', 3000));
  console.log(`  adapter    ATI  -> ${adapter || '(none)'}`);
  console.log(`  protocol   ATDP -> ${proto || '(none)'}`);
  console.log(`  0100 PIDs       -> ${pids || '(none)'}`);
  console.log(`  0902 VIN        -> ${vin || '(none)'}`);
  await runAttempt(elm, '0', 'Mode 03 baseline (expect 4300 = no stored emissions DTC)', '03', '03', decGeneric('03'), { timeout: 3000 });

  // ---- SECTION A — generic OBD stored/pending/permanent/freeze-frame --------
  // The non-MIL OBD fault memories Mode 03 skips. Cheapest place P000C could show.
  console.log('\n=== SECTION A — generic OBD DTC memories beyond Mode 03 ===');
  await runAttempt(elm, 'A', '03  confirmed emissions DTCs (MIL)', '03', '03', decGeneric('03'), { timeout: 3000 });
  await runAttempt(elm, 'A', '07  pending DTCs (this drive cycle)', '07', '07', decGeneric('07'), { timeout: 3000 });
  await runAttempt(elm, 'A', '0A  PERMANENT DTCs (persist across clears)', '0A', '0A', decGeneric('0A'), { timeout: 3000 });
  await runAttempt(elm, 'A', '02 02  freeze-frame DTC (Mode 02 PID 02)', '0202', '02', decFreeze, { timeout: 2500 });
  await runAttempt(elm, 'A', '02 02 00  freeze-frame DTC, explicit frame 00', '020200', '02', decFreeze, { timeout: 2500 });

  // ---- SECTION B — UDS ReadDTCInformation (svc 19), sub-fns x sessions ------
  // May be gated behind a diagnostic session and/or a specific sub-function.
  console.log('\n=== SECTION B — UDS service 19 across sub-functions & sessions ===');
  await runAttempt(elm, 'B', 'TesterPresent 3E 00 (UDS transport liveness)', '3E00', '3E', decNone, { timeout: 1500 });
  const SESSIONS = [
    { name: 'default session (no change)', pre: null },
    { name: 'extended diagnostic session (10 03)', pre: '1003' },
    { name: 'default session (10 01)', pre: '1001' },
  ];
  for (const s of SESSIONS) {
    console.log(`\n  -- service 19 under ${s.name} --`);
    if (s.pre) {
      await runAttempt(elm, 'B', `DiagnosticSessionControl ${pretty(s.pre)}`, s.pre, '10', decNone, { timeout: 2500 });
    }
    await runAttempt(elm, 'B', `19 02 FF  reportDTCByStatusMask (${s.name})`, '1902FF', '19', decUds19('02'), { timeout: 2500 });
    await runAttempt(elm, 'B', `19 0A  reportSupportedDTC (${s.name})`, '190A', '19', decUds19('0A'), { timeout: 2500 });
    await runAttempt(elm, 'B', `19 04 00 00 00 FF  reportDTCSnapshotRecordByDTCNumber, zeroed DTC (${s.name})`, '1904000000FF', '19', decUds19('04'), { timeout: 2500 });
    await runAttempt(elm, 'B', `19 06 00 00 00 FF  reportDTCExtendedDataRecordByDTCNumber, zeroed DTC (${s.name})`, '1906000000FF', '19', decUds19('06'), { timeout: 2500 });
    await runAttempt(elm, 'B', `19 01 FF  reportNumberOfDTCByStatusMask (${s.name})`, '1901FF', '19', decUds19('01'), { timeout: 2500 });
    await runAttempt(elm, 'B', `19 03  reportDTCSnapshotIdentification (${s.name})`, '1903', '19', decUds19('03'), { timeout: 2500 });
  }
  // leave the DME back in default session for the KWP leg
  await elm.send('1001', 2000);

  // ---- SECTION C — KWP2000-on-CAN service 18 (+ readDataByLocalId 21) -------
  // The 981/987 DME may speak KWP, not UDS: entirely different DTC service.
  console.log('\n=== SECTION C — KWP2000-on-CAN service 18 / 21 ===');
  await runAttempt(elm, 'C', '18 02 FF FF  readDTCByStatus (status 02, all groups)', '1802FFFF', '18', decKwp18, { timeout: 2500 });
  await runAttempt(elm, 'C', '18 00 FF 00  readDTCByStatus (status 00, group FF00)', '1800FF00', '18', decKwp18, { timeout: 2500 });
  await runAttempt(elm, 'C', '18 01 FF FF  readDTCByStatus (status 01, all groups)', '1801FFFF', '18', decKwp18, { timeout: 2500 });
  await runAttempt(elm, 'C', '21 01  readDataByLocalId 0x01 (layout unknown; raw 000C hunt)', '2101', '21', decRaw, { timeout: 2500 });
  await runAttempt(elm, 'C', '21 02  readDataByLocalId 0x02 (layout unknown; raw 000C hunt)', '2102', '21', decRaw, { timeout: 2500 });

  // ---- SECTION D — alternate response-address discovery (headers ON) --------
  // Catch the DME (or a sibling ECU) answering on a CAN id other than 7E8.
  console.log('\n=== SECTION D — alternate DME response-address discovery ===');
  try {
    await elm.send('ATH1');     // headers ON -> reveal the responder CAN id
    await elm.send('ATCRA');    // clear the 7E8-only receive filter (ATCRA off)
    await elm.send('ATCM 000'); // mask 000 = don't-care all bits -> accept ANY id

    console.log('\n  -- D1: physical request to DME (ATSH7E0), any responder --');
    await elm.send('ATSH7E0');
    for (const [lbl, cmd, sid] of [
      ['03  confirmed', '03', '03'],
      ['07  pending', '07', '07'],
      ['0A  permanent', '0A', '0A'],
      ['18 02 FF FF  KWP all DTCs', '1802FFFF', '18'],
      ['19 02 FF  UDS all DTCs', '1902FF', '19'],
    ]) {
      await runAttempt(elm, 'D1(7E0)', lbl, cmd, sid, decRaw, { headersOn: true, timeout: 2500 });
    }

    console.log('\n  -- D2: functional broadcast (ATSH7DF), enumerate every responder --');
    await elm.send('ATSH7DF');
    for (const [lbl, cmd, sid] of [
      ['03  confirmed (broadcast)', '03', '03'],
      ['07  pending (broadcast)', '07', '07'],
      ['0A  permanent (broadcast)', '0A', '0A'],
    ]) {
      await runAttempt(elm, 'D2(7DF)', lbl, cmd, sid, decRaw, { headersOn: true, timeout: 3000 });
    }
  } catch (e) {
    console.log('  Section D error:', e.message);
  } finally {
    // restore the clean single-DME state
    try { await elm.send('ATH0'); await elm.send('ATSH7E0'); await elm.send('ATCRA7E8'); } catch { /* ignore */ }
  }

  // ---- SUMMARY --------------------------------------------------------------
  console.log('\n\n=================== SUMMARY ===================');
  console.log(`Attempts run: ${results.length}`);

  const withCodes = results.filter((r) => r.codes.length > 0);
  console.log('\nMethods that returned ANY decoded stored DTC:');
  if (withCodes.length) {
    for (const r of withCodes) console.log(`  ✓ [${r.section}] ${r.label}\n        -> ${r.codes.join(', ')}`);
  } else {
    console.log('  (none — no method surfaced a decodable stored DTC)');
  }

  const decodedP000C = results.filter((r) => r.p000cDecoded);
  const rawOnlyP000C = results.filter((r) => r.p000cRaw && !r.p000cDecoded);
  console.log('\nTarget P000C ("A" Camshaft Position Slow Response, Bank 2):');
  if (decodedP000C.length) {
    console.log('  DECODED by:');
    for (const r of decodedP000C) console.log(`    ✓✓ [${r.section}] ${r.label}  (req ${r.req})`);
  } else {
    console.log('  not decoded by any method.');
  }
  if (rawOnlyP000C.length) {
    console.log('  raw "000C" bytes also seen in (weak — needs decode confirmation):');
    for (const r of rawOnlyP000C) console.log(`    · [${r.section}] ${r.label}  (req ${r.req})`);
  }

  const responderIds = [...new Set(results.flatMap((r) => r.responders))];
  console.log('\nResponder CAN IDs observed (Section D, headers on):');
  console.log(`  ${responderIds.length ? responderIds.join(', ') : '(none captured)'}`);

  console.log('\nVerdict:');
  if (decodedP000C.length) {
    console.log(`  => P000C IS reachable. Use the winning method above in lib/obd for a proper fault read.`);
  } else if (withCodes.length) {
    console.log(`  => Other stored DTCs surfaced but NOT P000C. Inspect those methods' raw output.`);
  } else {
    console.log(`  => No stored DTC surfaced over generic OBD / UDS-19 / KWP-18 on 7E0/7E8.`);
    console.log(`     P000C likely lives in a manufacturer fault memory that needs the PIWIS`);
    console.log(`     addressing/session (or a sub-bus module) this ELM path cannot reach.`);
    console.log(`     Next: widen Section D ids, or try a KWP fast-init / non-7E0 diag address.`);
  }
  console.log('==============================================\n');

  await new Promise((res) => port.close(res));
  console.log('Done. Port closed. (No data was written to the car.)');
}

main().catch((e) => {
  console.error('\nProbe failed:', e.message);
  process.exit(1);
});
