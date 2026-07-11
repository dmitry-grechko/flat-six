/**
 * Pure ELM327 / OBD-II response parsers (no I/O).
 */

import type { MonitorStatus } from './types';

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
      return Math.round((bytes[0] * 100) / 255);
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
