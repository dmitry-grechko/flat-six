/**
 * Pure ELM327 / OBD-II response parsers (no I/O).
 */

import type { Mode06Test, MonitorStatus } from './types';

const PROMPT = '>';

export function cleanElmResponse(buf: string): string {
  return buf
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && l !== PROMPT && !/^SEARCHING/i.test(l))
    .join('\n')
    .replace(/>$/g, '')
    .trim();
}

export function allHexFrames(raw: string): string[] {
  return raw
    .split('\n')
    .map((line) => line.replace(/\s+/g, '').toUpperCase())
    .filter(Boolean);
}

/**
 * Concatenate the DATA bytes of a (possibly multi-frame) response, stripping the
 * ELM's ISO-TP frame-number prefixes and any leading length line. Frame counters
 * are HEX (`0:`…`9:`, then `A:`…`F:` for responses over 10 frames), so both must
 * be recognised — otherwise the letter counters corrupt the byte stream. Use for
 * multi-frame services (06, 09, UDS 19) where allHexFrames would misalign records.
 */
export function isoTpDataHex(raw: string): string {
  const parts: string[] = [];
  for (const line of String(raw).split(/\n/)) {
    const t = line.trim();
    if (!t) continue;
    const m = t.match(/^([0-9A-Fa-f]+):(.*)$/); // "N:" frame line (N is one hex digit)
    if (m) {
      const hex = m[2].replace(/[^0-9A-Fa-f]/g, '').toUpperCase();
      if (hex) parts.push(hex);
      continue;
    }
    const hex = t.replace(/[^0-9A-Fa-f]/g, '').toUpperCase();
    // A bare line of >=4 hex is real data; shorter lines are ISO-TP length headers.
    if (hex.length >= 4) parts.push(hex);
  }
  return parts.join('');
}

/** Parse Mode 01 PID support bitmap (e.g. 0100 → 41 00 A5 …). */
export function parsePidBitmap(raw: string, queryPid: string): string[] | null {
  const base = parseInt(queryPid, 16);
  const marker = `41${queryPid.toUpperCase()}`;
  for (const hex of allHexFrames(raw)) {
    const idx = hex.indexOf(marker);
    if (idx < 0) continue;
    const data = hex.slice(idx + marker.length);
    const bytes = data.match(/.{1,2}/g)?.map((b) => parseInt(b, 16)) ?? [];
    if (bytes.length < 4) continue;
    const supported: string[] = [];
    for (let i = 0; i < 32; i++) {
      const byte = bytes[Math.floor(i / 8)];
      const bit = 7 - (i % 8);
      if (byte & (1 << bit)) {
        const pidNum = base + 1 + i;
        supported.push(pidNum.toString(16).toUpperCase().padStart(2, '0'));
      }
    }
    return supported;
  }
  if (/NO DATA|NODATA/i.test(raw)) return null;
  return null;
}

export function parseMode09Bitmap(raw: string): string[] {
  const marker = '4900';
  const supported = new Set<string>();
  for (const hex of allHexFrames(raw)) {
    const idx = hex.indexOf(marker);
    if (idx < 0) continue;
    const data = hex.slice(idx + marker.length);
    const bytes = data.match(/.{1,2}/g)?.map((b) => parseInt(b, 16)) ?? [];
    if (!bytes.length) continue;
    let start = 0;
    if (bytes.length >= 5 && bytes[0] <= 0x0f) start = 1;
    const bitmap = bytes.slice(start, start + 4);
    for (let i = 0; i < 32; i++) {
      const byte = bitmap[Math.floor(i / 8)];
      if (byte == null) break;
      const bit = 7 - (i % 8);
      if (byte & (1 << bit)) {
        const n = 1 + i;
        supported.add(n.toString(16).toUpperCase().padStart(2, '0'));
      }
    }
  }
  return [...supported];
}

export function parsePid01(raw: string, pid: string): string | number | MonitorStatus | number[] | null {
  const pidHex = pid.toUpperCase().replace(/^0X/, '');
  const marker = `41${pidHex}`;

  const frames = allHexFrames(raw);
  for (const hex of frames) {
    const idx = hex.indexOf(marker);
    if (idx < 0) continue;
    const data = hex.slice(idx + marker.length);
    const value = decodePidBytes(pidHex, data);
    if (value != null) return value;
  }

  if (/NO DATA|NODATA/i.test(raw)) return null;
  throw new Error(`Unexpected PID response for ${pid}: ${frames.join('\n') || raw}`);
}

export function parsePid02(raw: string, pid: string): string | number | MonitorStatus | number[] | null {
  const pidHex = pid.toUpperCase();
  const marker = `42${pidHex}`;
  for (const hex of allHexFrames(raw)) {
    const idx = hex.indexOf(marker);
    if (idx < 0) continue;
    let data = hex.slice(idx + marker.length);
    if (data.length >= 4) {
      const maybeFrame = parseInt(data.slice(0, 2), 16);
      if (maybeFrame <= 0x0f) data = data.slice(2);
    }
    return decodePidBytes(pidHex, data);
  }
  if (/NO DATA|NODATA/i.test(raw)) return null;
  return null;
}

export function decodePidBytes(
  pid: string,
  dataHex: string,
): string | number | MonitorStatus | number[] | null {
  const bytes = dataHex.match(/.{1,2}/g)?.map((b) => parseInt(b, 16)) ?? [];
  if (!bytes.length) return null;

  switch (pid.toUpperCase()) {
    case '01':
      return decodeMonitorStatus(bytes);
    case '03':
      return decodeFuelStatus(bytes[0], bytes[1]);
    case '04':
      return Math.round((bytes[0] * 100) / 255);
    case '05':
    case '0F':
    case '46':
    case '5C':
      return bytes[0] - 40;
    case '0B':
      return bytes[0];
    case '0C':
      return Math.round((bytes[0] * 256 + (bytes[1] ?? 0)) / 4);
    case '0D':
      return bytes[0];
    case '0E':
      return Math.round((bytes[0] / 2 - 64) * 10) / 10;
    case '10':
      return Math.round(((bytes[0] * 256 + (bytes[1] ?? 0)) / 100) * 100) / 100;
    case '11':
    case '45':
    case '47':
    case '48':
    case '49':
    case '4A':
    case '4C':
    case '2F':
    case '5A':
      return Math.round((bytes[0] * 100) / 255);
    // Fuel trims (short/long term, bank 1/2): signed percent, centered on 128.
    case '06':
    case '07':
    case '08':
    case '09':
      return Math.round(((bytes[0] - 128) * 100) / 128 * 10) / 10;
    // Fuel pressure (gauge, kPa) and barometric pressure (kPa).
    case '0A':
      return bytes[0] * 3;
    case '33':
      return bytes[0];
    // Narrowband O2 sensors: byte A = voltage (A/200 V), byte B = short-term
    // fuel trim used with that sensor (0xFF = sensor not used for trim).
    case '14':
    case '15':
    case '16':
    case '17':
    case '18':
    case '19':
    case '1A':
    case '1B': {
      const volts = bytes[0] / 200;
      const b = bytes[1];
      if (b == null || b === 0xff) return `${volts.toFixed(3)} V`;
      const trim = Math.round(((b - 128) * 100) / 128 * 10) / 10;
      return `${volts.toFixed(3)} V / ${trim > 0 ? '+' : ''}${trim}%`;
    }
    case '1F':
      return bytes[0] * 256 + (bytes[1] ?? 0);
    case '21':
    case '31':
      return bytes[0] * 256 + (bytes[1] ?? 0);
    case '3C':
    case '3D':
      return Math.round((bytes[0] * 256 + (bytes[1] ?? 0)) / 10 - 40);
    case '42':
      return Math.round(((bytes[0] * 256 + (bytes[1] ?? 0)) / 1000) * 100) / 100;
    case '43':
      return Math.round(((bytes[0] * 256 + (bytes[1] ?? 0)) * 100) / 255);
    case '44':
      return Math.round(((bytes[0] * 256 + (bytes[1] ?? 0)) / 32768) * 1000) / 1000;
    case '5E':
      return Math.round(((bytes[0] * 256 + (bytes[1] ?? 0)) / 20) * 100) / 100;
    default:
      return bytes;
  }
}

export function decodeMonitorStatus(bytes: number[]): MonitorStatus {
  const a = bytes[0] ?? 0;
  const b = bytes[1] ?? 0;
  const c = bytes[2] ?? 0;
  const d = bytes[3] ?? 0;
  const mil = !!(a & 0x80);
  const dtcCount = a & 0x7f;
  const spark = !(b & 0x08);

  const monitors: MonitorStatus['monitors'] = [
    { id: 'misfire', label: 'Misfire', available: !!(b & 0x01), incomplete: !!(b & 0x10) },
    { id: 'fuel_system', label: 'Fuel system', available: !!(b & 0x02), incomplete: !!(b & 0x20) },
    { id: 'components', label: 'Components', available: !!(b & 0x04), incomplete: !!(b & 0x40) },
  ];

  if (spark) {
    monitors.push(
      { id: 'catalyst', label: 'Catalyst', available: !!(c & 0x01), incomplete: !!(d & 0x01) },
      { id: 'heated_catalyst', label: 'Heated catalyst', available: !!(c & 0x02), incomplete: !!(d & 0x02) },
      { id: 'evap', label: 'EVAP', available: !!(c & 0x04), incomplete: !!(d & 0x04) },
      { id: 'secondary_air', label: 'Secondary air', available: !!(c & 0x08), incomplete: !!(d & 0x08) },
      { id: 'o2_sensor', label: 'O2 sensor', available: !!(c & 0x20), incomplete: !!(d & 0x20) },
      { id: 'o2_heater', label: 'O2 heater', available: !!(c & 0x40), incomplete: !!(d & 0x40) },
      { id: 'egr_vvt', label: 'EGR / VVT', available: !!(c & 0x80), incomplete: !!(d & 0x80) },
    );
  } else {
    monitors.push(
      { id: 'nmhc_catalyst', label: 'NMHC catalyst', available: !!(c & 0x01), incomplete: !!(d & 0x01) },
      { id: 'nox_scrubber', label: 'NOx scrubber', available: !!(c & 0x02), incomplete: !!(d & 0x02) },
      { id: 'boost', label: 'Boost pressure', available: !!(c & 0x08), incomplete: !!(d & 0x08) },
      { id: 'exhaust_gas', label: 'Exhaust gas sensor', available: !!(c & 0x20), incomplete: !!(d & 0x20) },
      { id: 'pm_filter', label: 'PM filter', available: !!(c & 0x40), incomplete: !!(d & 0x40) },
      { id: 'egr_vvt', label: 'EGR / VVT', available: !!(c & 0x80), incomplete: !!(d & 0x80) },
    );
  }

  return {
    mil,
    dtcCount,
    ignition: spark ? 'spark' : 'compression',
    monitors: monitors.filter((m) => m.available),
  };
}

function decodeFuelStatus(a: number, b?: number): string {
  const map: Record<number, string> = {
    1: 'Open loop',
    2: 'Closed loop',
    4: 'Open loop (driving)',
    8: 'Open loop (fault)',
    16: 'Closed loop (fault)',
  };
  const s1 = map[a] || `0x${(a ?? 0).toString(16)}`;
  const s2 = b ? map[b] || `0x${b.toString(16)}` : null;
  return s2 ? `${s1} / ${s2}` : s1;
}

export function parseDtcs(raw: string, mode = '03'): string[] {
  const modeNum = mode.toUpperCase();
  const respPrefix =
    modeNum === '03' ? '43' : modeNum === '07' ? '47' : modeNum === '0A' ? '4A' : '43';

  const codes = new Set<string>();
  for (const hex of allHexFrames(raw)) {
    const idx = hex.indexOf(respPrefix);
    if (idx < 0) continue;
    const body = hex.slice(idx + respPrefix.length);

    if (body.length >= 2) {
      const maybeCount = parseInt(body.slice(0, 2), 16);
      if (!Number.isNaN(maybeCount) && maybeCount === 0) {
        continue;
      }
      if (
        !Number.isNaN(maybeCount) &&
        maybeCount > 0 &&
        maybeCount <= 16 &&
        body.length >= 2 + maybeCount * 4
      ) {
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

export function parseFreezeFrameDtc(raw: string): string | null {
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

export function decodeDtc(a: number, b: number): string {
  const ch = ['P', 'C', 'B', 'U'][(a >> 6) & 3];
  const d1 = (a >> 4) & 3;
  const d2 = a & 0x0f;
  const d3 = (b >> 4) & 0x0f;
  const d4 = b & 0x0f;
  return `${ch}${d1}${d2.toString(16).toUpperCase()}${d3.toString(16).toUpperCase()}${d4.toString(16).toUpperCase()}`;
}

// ---- Mode 06: on-board monitoring test results ---------------------------

/**
 * Human labels for the SAE J1979-standardised OBDMID ranges only — the O2-sensor
 * monitors (0x01–0x08) and the misfire monitors (0xA0–0xAB). MIDs outside these
 * ranges are manufacturer-assigned and NOT guessed here (shown as "Monitor 0xNN")
 * to avoid mislabelling.
 */
const MODE06_MID_LABELS: Record<string, string> = {
  '01': 'O2 Sensor · Bank 1 Sensor 1',
  '02': 'O2 Sensor · Bank 1 Sensor 2',
  '03': 'O2 Sensor · Bank 1 Sensor 3',
  '04': 'O2 Sensor · Bank 1 Sensor 4',
  '05': 'O2 Sensor · Bank 2 Sensor 1',
  '06': 'O2 Sensor · Bank 2 Sensor 2',
  '07': 'O2 Sensor · Bank 2 Sensor 3',
  '08': 'O2 Sensor · Bank 2 Sensor 4',
  // Supported models are flat-six, so only $A1–$A6 are real cylinders. $A0 and
  // any higher misfire MID ($A7+ — the DME reports one with no $A0) are the
  // ECU's aggregate/auxiliary misfire monitor, NOT a 7th cylinder.
  A0: 'Misfire · general',
  A1: 'Misfire · Cylinder 1',
  A2: 'Misfire · Cylinder 2',
  A3: 'Misfire · Cylinder 3',
  A4: 'Misfire · Cylinder 4',
  A5: 'Misfire · Cylinder 5',
  A6: 'Misfire · Cylinder 6',
  A7: 'Misfire · aggregate',
};

export function mode06Label(mid: string): string {
  const key = mid.toUpperCase().padStart(2, '0');
  return MODE06_MID_LABELS[key] ?? `Monitor 0x${key}`;
}

/** Parse a Mode 06 supported-MID bitmap for one base range (00/20/40/…). */
export function parseMode06Bitmap(raw: string, base: string): string[] {
  const baseHex = base.toUpperCase().padStart(2, '0');
  const marker = `46${baseHex}`;
  const baseNum = parseInt(baseHex, 16);
  for (const hex of allHexFrames(raw)) {
    const idx = hex.indexOf(marker);
    if (idx < 0) continue;
    const data = hex.slice(idx + marker.length);
    const bytes = data.match(/.{1,2}/g)?.map((b) => parseInt(b, 16)) ?? [];
    if (bytes.length < 4) continue;
    const supported: string[] = [];
    for (let i = 0; i < 32; i++) {
      const byte = bytes[Math.floor(i / 8)];
      if (byte == null) break;
      const bit = 7 - (i % 8);
      if (byte & (1 << bit)) {
        supported.push((baseNum + 1 + i).toString(16).toUpperCase().padStart(2, '0'));
      }
    }
    return supported;
  }
  return [];
}

/**
 * Parse Mode 06 test results for a single MID. CAN record layout (SAE J1979):
 * OBDMID(1) SDTID/TID(1) UASID(1) TestValue(2) MinLimit(2) MaxLimit(2) — 9 bytes
 * each, repeated per test (AA padding ends the list).
 *
 * Some UASIDs are signed and some unsigned, and the standard table is not
 * reproduced here. Rather than invent units, we pick whichever interpretation
 * yields well-formed limits (min <= max): unsigned first, else signed 16-bit;
 * if neither is well-formed the result is 'unknown' (never a false FAIL).
 */
export function parseMode06(raw: string, mid: string): Mode06Test[] {
  const midHex = mid.toUpperCase().padStart(2, '0');
  const combined = isoTpDataHex(raw);
  const idx = combined.indexOf(`46${midHex}`);
  if (idx < 0) return [];
  const body = combined.slice(idx + 2); // keep MID as first byte of each record
  const s16 = (n: number): number => (n >= 0x8000 ? n - 0x10000 : n);
  const tests: Mode06Test[] = [];
  for (let p = 0; p + 18 <= body.length; p += 18) {
    const recMid = body.slice(p, p + 2).toUpperCase();
    if (recMid !== midHex) break; // left this MID's records (e.g. AA padding)
    const tid = body.slice(p + 2, p + 4).toUpperCase();
    const uasid = body.slice(p + 4, p + 6).toUpperCase();
    const vRaw = parseInt(body.slice(p + 6, p + 10), 16);
    const nRaw = parseInt(body.slice(p + 10, p + 14), 16);
    const xRaw = parseInt(body.slice(p + 14, p + 18), 16);
    if ([vRaw, nRaw, xRaw].some(Number.isNaN)) break;

    let value = vRaw;
    let min = nRaw;
    let max = xRaw;
    let signed = false;
    let result: Mode06Test['result'];
    if (nRaw <= xRaw) {
      result = vRaw >= nRaw && vRaw <= xRaw ? 'pass' : 'fail';
    } else if (s16(nRaw) <= s16(xRaw)) {
      value = s16(vRaw);
      min = s16(nRaw);
      max = s16(xRaw);
      signed = true;
      result = value >= min && value <= max ? 'pass' : 'fail';
    } else {
      result = 'unknown';
    }

    tests.push({ mid: midHex, tid, uasid, monitor: mode06Label(midHex), value, min, max, signed, result });
  }
  return tests;
}

// ---- UDS / KWP2000 DTC parsing (per-module fault scan) --------------------

/**
 * Parse DTCs from a module fault-read response.
 *  UDS (service 19 02): `59 02 <mask> [DTC(3) status(1)]…`, 3-byte DTC → code + FTB.
 *  KWP (service 18):    `58 <count> [DTC(2) status(1)]…`, 2-byte DTC.
 * Assumes clean payload bytes (headers off / receive-address filtered).
 */
export function parseUdsDtcs(
  raw: string,
  protocol: 'uds' | 'kwp',
): { code: string; status: number }[] {
  const combined = isoTpDataHex(raw);
  const out: { code: string; status: number }[] = [];

  if (protocol === 'uds') {
    const idx = combined.indexOf('5902');
    if (idx < 0) return out;
    const body = combined.slice(idx + 4).slice(2); // skip 59 02 + availability mask
    for (let p = 0; p + 8 <= body.length; p += 8) {
      // UDS DTCs are a 3-byte code. Porsche modules use manufacturer-specific
      // numbers (e.g. 89 02 0E) that PIWIS shows as raw hex, so surface the raw
      // 3-byte hex (89020E) rather than a lossy SAE reinterpretation.
      const code = body.slice(p, p + 6).toUpperCase();
      const status = parseInt(body.slice(p + 6, p + 8), 16);
      if (code.length < 6 || Number.isNaN(status)) break;
      if (/^0{6}$/.test(code)) continue;
      out.push({ code, status });
    }
    return out;
  }

  const idx = combined.indexOf('58');
  if (idx < 0) return out;
  const body = combined.slice(idx + 2).slice(2); // skip 58 + count
  for (let p = 0; p + 6 <= body.length; p += 6) {
    const b0 = parseInt(body.slice(p, p + 2), 16);
    const b1 = parseInt(body.slice(p + 2, p + 4), 16);
    const status = parseInt(body.slice(p + 4, p + 6), 16);
    if ([b0, b1, status].some(Number.isNaN)) break;
    if (b0 === 0 && b1 === 0) continue;
    out.push({ code: decodeDtc(b0, b1), status });
  }
  return out;
}

/** Common UDS/KWP negative-response codes → human labels. */
const NRC_NAMES: Record<string, string> = {
  '10': 'general reject',
  '11': 'service not supported',
  '12': 'sub-function not supported',
  '13': 'incorrect message length',
  '22': 'conditions not correct',
  '31': 'request out of range',
  '33': 'security access denied',
  '35': 'invalid key',
  '78': 'response pending',
  '7E': 'sub-function not supported in session',
  '7F': 'service not supported in session',
};

/** Extract the negative-response reason from a `7F <sid> <nrc>` reply, if any. */
export function negativeResponseInfo(
  raw: string,
): { sid: string; nrc: string; nrcName: string } | null {
  const bytes: string[] = isoTpDataHex(raw).match(/.{2}/g) ?? [];
  const i = bytes.indexOf('7F');
  if (i < 0 || !bytes[i + 1]) return null;
  const sid = bytes[i + 1];
  const nrc = bytes[i + 2] ?? '';
  return { sid, nrc, nrcName: NRC_NAMES[nrc] ?? `NRC 0x${nrc}` };
}

/**
 * Classify a raw diagnostic response for a request service id.
 *  positive = answered with SID+0x40; refused = 7F <sid> <nrc> (module present);
 *  silent = NO DATA / error / nothing. Assumes clean payload (headers off).
 */
export function classifyObdResponse(
  raw: string,
  reqSid: string,
): 'positive' | 'refused' | 'silent' | 'pending' {
  if (!raw) return 'silent';
  const r = raw.toUpperCase();
  if (/NO DATA|UNABLE TO CONNECT|CAN ERROR|BUS INIT|STOPPED|SEARCHING|^ERROR|\?/m.test(r)) {
    return 'silent';
  }
  const bytes: string[] = r.replace(/[^0-9A-F]/g, '').match(/.{2}/g) ?? [];
  const sid = reqSid.toUpperCase();
  // A positive reply wins even if a `7F <sid> 78` (response-pending) frame preceded
  // it — many UDS modules send one or more 0x78 "please wait" frames before the real
  // answer, and the ELM concatenates them into one buffer.
  const pos = (parseInt(sid, 16) + 0x40).toString(16).toUpperCase().padStart(2, '0');
  if (bytes.includes(pos)) return 'positive';
  const i7f = bytes.indexOf('7F');
  if (i7f >= 0 && bytes[i7f + 1] === sid) {
    // 0x78 = responsePending: the module is present and working, not refusing. Report
    // 'pending' so the caller can wait/retry rather than mark the module refused.
    return bytes[i7f + 2] === '78' ? 'pending' : 'refused';
  }
  return 'silent';
}

export function parseMode09Text(raw: string, type: string): string | null {
  const typeHex = type.toUpperCase().padStart(2, '0');
  const marker = `49${typeHex}`;
  const frames = normalizeMode09Frames(raw);
  const messages: string[] = [];
  let current = '';
  const stems: string[] = [];
  let lastIndex = -1;

  for (const { index, hex } of frames) {
    const idx = hex.indexOf(marker);
    if (idx >= 0 && (index === 0 || index == null)) {
      if (current) messages.push(current);
      let rest = hex.slice(idx + marker.length);
      if (rest.length >= 2) {
        const cnt = parseInt(rest.slice(0, 2), 16);
        if (!Number.isNaN(cnt) && cnt <= 0x20) rest = rest.slice(2);
      }
      stems.push(rest);
      current = rest;
      lastIndex = index ?? 0;
      continue;
    }
    if (current && index != null && index > 0 && /^[0-9A-F]+$/.test(hex) && idx < 0) {
      if (lastIndex >= 2 && index === 1 && stems.length >= 2) {
        messages.push(current);
        current = stems[stems.length - 2] + hex;
      } else {
        current += hex;
      }
      lastIndex = index;
    }
  }
  if (current) messages.push(current);

  const decoded = messages
    .map((hexAll) => {
      const bytes = hexAll.match(/.{1,2}/g) ?? [];
      let s = '';
      for (const b of bytes) {
        const n = parseInt(b, 16);
        if (Number.isNaN(n) || n === 0 || n === 0xaa) continue;
        if (n >= 32 && n < 127) s += String.fromCharCode(n);
      }
      return s.trim();
    })
    .filter((s) => s.length > 0);

  if (!decoded.length) return null;

  if (typeHex === '02') {
    for (const s of decoded) {
      const m = s.match(/[A-HJ-NPR-Z0-9]{17}/i);
      if (m) return m[0].toUpperCase();
    }
    return decoded[0];
  }

  const meaningful = decoded.filter((s) => s.length >= 8 || typeHex === '0A');
  const list = meaningful.length ? meaningful : decoded;
  return [...new Set(list)].join(' / ');
}

export function parseMode09Hex(raw: string, type: string): string | null {
  const typeHex = type.toUpperCase().padStart(2, '0');
  const marker = `49${typeHex}`;
  const frames = normalizeMode09Frames(raw);
  const values: string[] = [];
  for (const { hex } of frames) {
    const idx = hex.indexOf(marker);
    if (idx < 0) continue;
    let rest = hex.slice(idx + marker.length);
    if (rest.length >= 2) {
      const cnt = parseInt(rest.slice(0, 2), 16);
      if (!Number.isNaN(cnt) && cnt <= 0x20) rest = rest.slice(2);
    }
    const cvn = rest.replace(/[^0-9A-F]/gi, '').slice(0, 8);
    if (cvn.length >= 8) values.push(cvn);
  }
  if (!values.length) return null;
  return [...new Set(values)].join(' / ');
}

export function normalizeMode09Frames(raw: string): { index: number | null; hex: string }[] {
  const out: { index: number | null; hex: string }[] = [];
  for (const line of String(raw).split(/\n/)) {
    const t = line.trim();
    if (!t) continue;
    const m = t.match(/^(\d+):(.*)$/);
    if (m) {
      const hex = m[2].replace(/[^0-9A-Fa-f]/g, '').toUpperCase();
      if (hex.length >= 2) out.push({ index: parseInt(m[1], 10), hex });
      continue;
    }
    const hex = t.replace(/[^0-9A-Fa-f]/g, '').toUpperCase();
    if (hex.length >= 4) out.push({ index: null, hex });
  }
  return out;
}

export { PROMPT };
