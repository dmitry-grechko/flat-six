#!/usr/bin/env node
/**
 * FLAT·SIX — ELM327 UDS/KWP discovery probe (READ-ONLY, exploratory).
 *
 * Purpose: answer the one open question — can we reach modules BEYOND the DME
 * through the car's gateway with a plain ELM327, and do they speak UDS or KWP2000?
 * This is the cheap validation that de-risks the whole "custom hardware" decision.
 *
 * It does NOT write to any module. Every request is read-only:
 *   - 3E 00  TesterPresent            (UDS/KWP "are you there?" — does nothing)
 *   - 22 F1 90 / 09 02  read VIN      (UDS ReadDataByIdentifier / OBD mode 09)
 *   - 19 02 0C  ReadDTCInformation    (UDS)
 *   - 18 02 FF FF  readDtcByStatus    (KWP2000-on-CAN)
 *
 * Requirements: ignition ON (engine may be off), USB ELM327 preferred on macOS.
 * Run from tools/obd-bridge (so `serialport` resolves):
 *   node uds-probe.mjs                      # auto-pick port, baseline + sweep
 *   node uds-probe.mjs --port /dev/cu.usbserial-XXXX --baud 38400
 *   node uds-probe.mjs --mode baseline      # DME only, no sweep
 *   node uds-probe.mjs --ids 7E0,7E1,713,760 # probe an explicit ID list
 *
 * NOTE: the sweep IDs below are CANDIDATES, not verified 987/981 addresses — that
 * table is exactly what this probe exists to discover. Edit CANDIDATE_IDS freely.
 */

import { SerialPort } from 'serialport';

// ---- CLI args -------------------------------------------------------------
const args = process.argv.slice(2);
function arg(name, def = null) {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : def;
}
const OPT = {
  port: arg('port'),
  baud: Number(arg('baud', '38400')),
  mode: arg('mode', 'both'), // baseline | sweep | both
  ids: arg('ids'),           // comma list overrides CANDIDATE_IDS
  timeout: Number(arg('timeout', '1200')),
};

// 11-bit physical request IDs to probe. The ELM auto-derives the response ID for
// the 7E0–7E7 range (→7E8–7EF); for others we turn headers on and read whatever
// answers. Trim/extend this list as you learn the real map.
const CANDIDATE_IDS = OPT.ids
  ? OPT.ids.split(',').map((s) => s.trim().toUpperCase())
  : [
      '7E0', '7E1', '7E2', '7E3', '7E4', '7E5', '7E6', '7E7', // standard OBD physical range
      '710', '711', '713', '715', '718', '71A', '71D',        // common non-OBD diag IDs (candidates)
      '720', '731', '732', '740', '750', '760', '765', '773', // more candidates
    ];

// ---- tiny ELM client ------------------------------------------------------
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
  send(cmd, timeout = OPT.timeout) {
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

function clean(s) {
  return (s || '')
    .split('\n').map((l) => l.trim()).filter(Boolean)
    .filter((l) => l.toUpperCase() !== cleanEcho)
    .join(' ')
    .trim();
}
let cleanEcho = '';

const NRC = {
  '10': 'generalReject', '11': 'serviceNotSupported', '12': 'subFunctionNotSupported',
  '13': 'incorrectMessageLength', '22': 'conditionsNotCorrect', '31': 'requestOutOfRange',
  '33': 'securityAccessDenied', '35': 'invalidKey', '7E': 'subFuncNotSupportedInSession',
  '7F': 'serviceNotSupportedInActiveSession', '78': 'responsePending',
};

/**
 * Classify an ELM response (headers ON) for one request service byte.
 *  positive: module answered with SID+0x40  -> real data
 *  negative: 7F <sid> <nrc>                  -> module PRESENT but refused (still reachable!)
 *  silent:   NO DATA / timeout / bus noise   -> nothing there
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
function reachable(c) { return c.kind === 'positive' || c.kind === 'negative'; }

// ---- port pick ------------------------------------------------------------
async function pickPort() {
  if (OPT.port) return OPT.port;
  const ports = await SerialPort.list();
  const scored = ports
    .map((p) => {
      const blob = `${p.path} ${p.manufacturer || ''}`.toLowerCase();
      let score = 0;
      if (/usbserial|ch340|ch341|ftdi|cp210|slab|wch|prolific|pl2303/.test(blob)) score += 100;
      if (/^\/dev\/cu\./.test(p.path)) score += 20;
      if (/^\/dev\/tty\./.test(p.path)) score -= 100; // macOS: use cu.*
      if (/bluetooth-incoming|debug-console/.test(blob)) score -= 100;
      return { path: p.path, mfg: p.manufacturer || '', score };
    })
    .sort((a, b) => b.score - a.score);
  console.log('Ports found:');
  for (const p of scored) console.log(`  ${p.score >= 0 ? '•' : '·'} ${p.path}  ${p.mfg}`);
  if (!scored.length || scored[0].score < 0) {
    throw new Error('No obvious ELM327 port. Pass --port /dev/cu.usbserial-XXXX');
  }
  return scored[0].path;
}

// ---- main -----------------------------------------------------------------
async function main() {
  const path = await pickPort();
  console.log(`\nOpening ${path} @ ${OPT.baud} ...`);
  const port = new SerialPort({ path, baudRate: OPT.baud, autoOpen: false });
  await new Promise((res, rej) => port.open((e) => (e ? rej(e) : res())));
  const elm = new Elm(port);
  await delay(400);

  // init: reset, echo off, CAN 500k, headers ON (so we see the responder ID)
  await elm.send('ATZ', 3000);
  await delay(300);
  await elm.send('ATE0');
  await elm.send('ATL0');
  await elm.send('ATS0');
  const id = clean(await elm.send('ATI'));
  console.log(`Adapter: ${id || '(no id)'}`);
  await elm.send('ATSP6');   // ISO 15765-4 CAN, 11-bit, 500 kbps
  await elm.send('ATCAF1');  // let the ELM assemble ISO-TP frames
  await elm.send('ATH1');    // headers ON — reveal which CAN ID responds

  // ---- baseline: DME must answer, proves comms + tells sim from real car ----
  if (OPT.mode !== 'sweep') {
    console.log('\n=== BASELINE — DME (7E0) ===');
    await elm.send('ATSH7E0');
    const vinObd = clean(await elm.send('0902', 3000));
    const dtcObd = clean(await elm.send('03', 3000));
    console.log(`  09 02  (OBD VIN)   -> ${vinObd}`);
    console.log(`  03     (OBD DTC)   -> ${dtcObd}`);

    // Live PIDs: a real idling engine moves; a sim returns static/canned values.
    const rpm = clean(await elm.send('010C', 2000));
    const clt = clean(await elm.send('0105', 2000));
    console.log(`  01 0C  (RPM)       -> ${rpm}`);
    console.log(`  01 05  (coolant)   -> ${clt}`);

    // Session gate: does raw UDS work directly, or only after an extended
    // session? On a real Porsche, manufacturer data often needs 10 03 first
    // and/or a non-7E0 module ID. On a generic sim, 10 03 itself is refused.
    console.log('  -- UDS gate test --');
    const uds1 = classify(await elm.send('22F190', 2500), '22');
    console.log(`  22 F1 90 default   -> ${uds1.kind}${uds1.nrcName ? ' (' + uds1.nrcName + ')' : ''}`);
    const sess = classify(await elm.send('1003', 2500), '10');
    console.log(`  10 03 ext.session  -> ${sess.kind}${sess.nrcName ? ' (' + sess.nrcName + ')' : ''}`);
    if (sess.kind === 'positive') {
      const uds2 = classify(await elm.send('22F190', 2500), '22');
      console.log(`  22 F1 90 in-session-> ${uds2.kind}${uds2.nrcName ? ' (' + uds2.nrcName + ')' : ''}`);
    }

    const verdict =
      sess.kind === 'silent'
        ? 'DME silent to 10 03 — generic-OBD-only device (likely a SIMULATOR).'
        : sess.kind === 'negative'
          ? 'DME refuses extended session — generic-OBD-only (likely a SIMULATOR).'
          : 'DME accepts extended session — this behaves like a REAL manufacturer ECU.';
    console.log(`  => ${verdict}`);
  }

  // ---- sweep: who else is reachable, and what do they speak? ----
  if (OPT.mode !== 'baseline') {
    console.log('\n=== SWEEP — candidate module addresses ===');
    console.log('(TesterPresent -> UDS DTC -> KWP DTC; logging any responder)\n');
    const hits = [];
    for (const reqId of CANDIDATE_IDS) {
      await elm.send(`ATSH${reqId}`);
      const present = classify(await elm.send('3E00', OPT.timeout), '3E');
      const udsDtc = classify(await elm.send('1902FF', OPT.timeout), '19');
      const kwpDtc = classify(await elm.send('1802FFFF', OPT.timeout), '18');

      if (reachable(present) || reachable(udsDtc) || reachable(kwpDtc)) {
        // A module is "reachable" if it answers at all (positive OR refusal).
        // Protocol = which DTC service it accepts positively.
        const proto =
          udsDtc.kind === 'positive' ? 'UDS'
          : kwpDtc.kind === 'positive' ? 'KWP2000'
          : 'present, no DTC svc accepted';
        hits.push({ reqId, proto });
        console.log(`  ✔ ${reqId}  [${proto}]`);
        console.log(`       3E 00      -> ${present.kind}${present.nrcName ? ' (' + present.nrcName + ')' : ''}`);
        console.log(`       19 02 FF   -> ${udsDtc.kind}${udsDtc.nrcName ? ' (' + udsDtc.nrcName + ')' : ''}`);
        console.log(`       18 02 FFFF -> ${kwpDtc.kind}${kwpDtc.nrcName ? ' (' + kwpDtc.nrcName + ')' : ''}`);
      } else {
        process.stdout.write(`  · ${reqId} `);
      }
    }
    console.log('\n');
    if (hits.length) {
      console.log('Reachable modules (request IDs):');
      for (const h of hits) console.log(`  ${h.reqId}  ${h.proto}`);
      console.log('\nThis is the start of your per-generation addressing table.');
    } else {
      console.log('No non-DME responders on these candidate IDs.');
      console.log('Next: widen --ids, or the gateway may not route physical requests');
      console.log('to sub-bus modules on this car — that is the finding either way.');
    }
  }

  await new Promise((res) => port.close(res));
  console.log('\nDone. Port closed.');
}

main().catch((e) => {
  console.error('\nProbe failed:', e.message);
  process.exit(1);
});
