/**
 * VAS 6154 experimental adapter — PassThru and/or DoIP raw transcript.
 *
 * Scope (lab only):
 *   connect → identify (best-effort) → raw RX in Debug
 *   optional safe DID reads (UDS 0x22 F190 VIN, F187 / F189 if trivial)
 *
 * NOT a multi-module UDS product. Gate behind experimental: true on /connect.
 */

import { discoverDoipVehicles, openDoipSession } from './doip.mjs';
import {
  listPassThruDevices,
  openPassThruSession,
  pickVasDevice,
  resolveProtocolId,
} from './passthru.mjs';

function emptyLive(adapter = '', protocol = '') {
  return {
    at: new Date().toISOString(),
    adapter,
    protocol,
    values: {},
    groups: {},
    readiness: null,
    errors: [],
    priorityOnly: false,
  };
}

function emptyFaults(note = 'Not available on this adapter yet') {
  return {
    at: new Date().toISOString(),
    modules: [
      {
        id: 'dme',
        name: 'DME / Engine',
        available: false,
        note,
        confirmed: [],
        pending: [],
        permanent: [],
        freezeFrame: null,
        readiness: null,
        errors: [],
      },
    ],
  };
}

function emptyVehicle(adapter = '', protocol = '', errors = []) {
  return {
    at: new Date().toISOString(),
    vin: null,
    calid: null,
    cvn: null,
    ecu_name: null,
    supportedMode09: [],
    supportedPids: [],
    adapter,
    protocol,
    errors,
  };
}

function emptyCapabilities(adapter = '', protocol = '') {
  return {
    adapter,
    protocol,
    supportedPids: [],
    supportedMode09: [],
    liveCatalog: [],
    experimental: true,
  };
}

/** Safe / common identification DIDs (UDS ReadDataByIdentifier 0x22) */
const SAFE_DIDS = [
  { id: 0xf190, key: 'vin', label: 'VIN' },
  { id: 0xf187, key: 'spare_part', label: 'Spare part number' },
  { id: 0xf189, key: 'sw_version', label: 'Software version' },
  { id: 0xf191, key: 'hw_number', label: 'Hardware number' },
];

/**
 * @param {{
 *   mode?: 'passthru' | 'doip' | 'auto',
 *   dllPath?: string,
 *   host?: string,
 *   doipPort?: number,
 *   port?: number,
 *   protocol?: string | number,
 *   baudRate?: number,
 *   sourceAddress?: number,
 *   targetAddress?: number,
 *   readDids?: boolean,
 * }} opts
 * @returns {import('../types.mjs').ObdAdapter}
 */
export function createVas6154Adapter(opts = {}) {
  const mode = String(opts.mode || 'auto').toLowerCase();
  const readDids = opts.readDids !== false;

  /** @type {{ ts: number, dir: string, line: string }[]} */
  const log = [];
  const maxLog = 400;

  /** @type {Awaited<ReturnType<typeof openPassThruSession>> | null} */
  let pt = null;
  /** @type {Awaited<ReturnType<typeof openDoipSession>> | null} */
  let doip = null;
  /** @type {ReturnType<typeof setInterval> | null} */
  let rxTimer = null;

  let open = false;
  let pathLabel = '';
  let baudRate = opts.baudRate != null ? Number(opts.baudRate) : null;
  let adapterInfo = 'VAS 6154 (experimental)';
  let protocol = '';
  /** @type {object | null} */
  let lastLive = null;
  /** @type {object | null} */
  let lastFaults = null;
  /** @type {object | null} */
  let lastVehicle = null;
  /** @type {Record<string, string | null>} */
  let didValues = {};

  function push(dir, line) {
    log.push({ ts: Date.now(), dir, line: String(line) });
    if (log.length > maxLog) log.shift();
  }

  function stopRxPump() {
    if (rxTimer) {
      clearInterval(rxTimer);
      rxTimer = null;
    }
  }

  async function connectPassThru() {
    let dllPath = String(opts.dllPath || '').trim();
    const devices = listPassThruDevices();
    if (!dllPath) {
      const pick = pickVasDevice(devices);
      if (!pick) {
        throw new Error(
          'No J2534 PassThru DLL found. Install I+ME Actia VAS6154 PassThru drivers, or pass dllPath.',
        );
      }
      dllPath = pick.dllPath;
      push('info', `Auto-selected PassThru: ${pick.name} (${pick.vendor}) → ${dllPath}`);
    } else {
      push('info', `Using dllPath=${dllPath}`);
    }

    const protocolId = resolveProtocolId(opts.protocol || 'ISO15765');
    baudRate = Number(opts.baudRate || 500000);
    pt = await openPassThruSession({
      dllPath,
      protocolId,
      baudRate,
      log: push,
    });
    pathLabel = dllPath;
    protocol = `PassThru 0x${protocolId.toString(16)} @ ${baudRate}`;
    adapterInfo = `VAS6154 PassThru · ${dllPath}`;

    // Pump raw RX into debug log
    rxTimer = setInterval(() => {
      if (!pt) return;
      try {
        pt.read(50, 16);
      } catch (e) {
        push('err', `RX pump: ${e.message}`);
      }
    }, 200);

    if (readDids) {
      await tryPassThruDids();
    }
  }

  async function tryPassThruDids() {
    if (!pt) return;
    // ISO15765 often wants CAN ID in first 4 bytes + UDS — layout is stack/vendor specific.
    // Send a minimal functional / physical probe and log whatever comes back.
    // Common ISO-TP single frame: PCI 0x03 + 0x22 + DID_hi + DID_lo (on some stacks Data is pure UDS).
    for (const did of SAFE_DIDS) {
      const uds = [0x03, 0x22, (did.id >> 8) & 0xff, did.id & 0xff];
      try {
        push('info', `PassThru probe DID 0x${did.id.toString(16)} (${did.label})`);
        // TxFlags 0 — vendor may need ISO15765_FRAME_PAD etc.; raw transcript is the goal
        pt.write(uds, 0);
        await sleep(300);
        const msgs = pt.read(500, 16);
        for (const m of msgs) {
          const ascii = extractAscii(m.data);
          if (ascii && did.key === 'vin' && ascii.length >= 11) {
            didValues.vin = ascii.slice(0, 17);
          } else if (ascii && !didValues[did.key]) {
            didValues[did.key] = ascii;
          }
        }
      } catch (e) {
        push('err', `DID 0x${did.id.toString(16)}: ${e.message}`);
      }
    }
  }

  async function connectDoip() {
    let host = String(opts.host || '').trim();
    const doipPort = Number(opts.doipPort || opts.port || 13400);

    if (!host) {
      push('info', 'No DoIP host — UDP vehicle discovery…');
      const found = await discoverDoipVehicles({ timeoutMs: 2500, log: push });
      if (found.length) {
        host = found[0].address;
        if (found[0].vin) didValues.vin = found[0].vin;
        push('info', `DoIP discovery hit ${host} vin=${found[0].vin || '—'}`);
      }
    }
    if (!host) {
      throw new Error(
        'DoIP requires host (VAS Wi‑Fi / USB-RNDIS IP). Set host or ensure UDP discovery works.',
      );
    }

    doip = await openDoipSession({
      host,
      port: doipPort,
      sourceAddress: opts.sourceAddress,
      targetAddress: opts.targetAddress,
      log: push,
    });
    pathLabel = `${host}:${doipPort}`;
    baudRate = null;
    protocol = `DoIP TCP ${host}:${doipPort}`;
    adapterInfo = `VAS6154 DoIP · ${host}:${doipPort}`;

    await doip.listen(400);

    if (readDids) {
      await tryDoipDids();
    }
  }

  async function tryDoipDids() {
    if (!doip) return;
    const ta = Number(opts.targetAddress || 0x0001);
    for (const did of SAFE_DIDS) {
      try {
        push('info', `DoIP UDS 22 ${did.label} → TA 0x${ta.toString(16)}`);
        const frames = await doip.diagnostic(
          [0x22, (did.id >> 8) & 0xff, did.id & 0xff],
          ta,
        );
        for (const f of frames) {
          if (f.payloadType !== 0x8001) continue; // DIAGNOSTIC_MESSAGE
          // payload: SA(2) TA(2) + UDS
          if (f.payload.length < 7) continue;
          const uds = [...f.payload.subarray(4)];
          if (uds[0] === 0x62 && uds[1] === ((did.id >> 8) & 0xff) && uds[2] === (did.id & 0xff)) {
            const data = uds.slice(3);
            const ascii = Buffer.from(data).toString('ascii').replace(/[^\x20-\x7E]/g, '').trim();
            didValues[did.key] = ascii || data.map((b) => b.toString(16).padStart(2, '0')).join('');
            push('info', `DID 0x${did.id.toString(16)} = ${didValues[did.key]}`);
          } else if (uds[0] === 0x7f) {
            push('err', `NRC for 0x${did.id.toString(16)}: ${uds.map((b) => b.toString(16)).join(' ')}`);
          }
        }
      } catch (e) {
        push('err', `DoIP DID 0x${did.id.toString(16)}: ${e.message}`);
      }
    }
  }

  function buildVehicle() {
    const errors = [];
    if (!didValues.vin) {
      errors.push({
        type: 'identify',
        message: 'VIN not decoded — see Debug raw transcript (experimental stub)',
      });
    }
    lastVehicle = {
      ...emptyVehicle(adapterInfo, protocol, errors),
      vin: didValues.vin || null,
      calid: didValues.sw_version || didValues.spare_part || null,
      ecu_name: didValues.hw_number || 'VAS6154 experimental',
      dids: { ...didValues },
      experimental: true,
    };
    return lastVehicle;
  }

  function buildLive() {
    lastLive = {
      ...emptyLive(adapterInfo, protocol),
      experimental: true,
      note: 'Live Mode 01 PIDs are ELM-only. VAS path logs raw traffic in Debug.',
      groups: {
        Status: [
          {
            pid: '—',
            key: 'session',
            label: 'Session',
            unit: '',
            value: open ? protocol : 'closed',
          },
        ],
      },
      values: { session: open ? protocol : 'closed' },
    };
    return lastLive;
  }

  function buildFaults() {
    lastFaults = emptyFaults(
      'Fault scan via UDS 19xx not implemented — experimental raw transcript only',
    );
    lastFaults.experimental = true;
    return lastFaults;
  }

  return {
    id: 'vas6154',
    experimental: true,
    get path() {
      return pathLabel;
    },
    get baudRate() {
      return baudRate;
    },
    get adapterInfo() {
      return adapterInfo;
    },
    get protocol() {
      return protocol;
    },
    get lastLive() {
      return lastLive;
    },
    get lastFaults() {
      return lastFaults;
    },
    get lastVehicle() {
      return lastVehicle;
    },

    isOpen() {
      return open;
    },

    async open() {
      if (process.platform !== 'win32' && mode !== 'doip') {
        push(
          'err',
          'PassThru is Windows-only. On Mac/Linux use mode=doip with a reachable DoIP host.',
        );
      }

      push('info', `VAS6154 experimental open mode=${mode}`);

      const wantPt = mode === 'passthru' || mode === 'auto';
      const wantDoip = mode === 'doip' || mode === 'auto';

      let lastErr = null;

      if (wantPt && process.platform === 'win32') {
        try {
          await connectPassThru();
          open = true;
        } catch (e) {
          lastErr = e;
          push('err', `PassThru: ${e.message}`);
          if (mode === 'passthru') throw e;
        }
      }

      if (!open && wantDoip) {
        try {
          await connectDoip();
          open = true;
        } catch (e) {
          lastErr = e;
          push('err', `DoIP: ${e.message}`);
          if (mode === 'doip') throw e;
        }
      }

      if (!open) {
        throw lastErr || new Error('VAS6154: neither PassThru nor DoIP connected');
      }

      buildVehicle();
      buildFaults();
      buildLive();
      push('info', 'VAS6154 session ready — check Debug for raw TX/RX');
    },

    async close() {
      stopRxPump();
      if (pt) {
        try {
          pt.close();
        } catch {
          /* ignore */
        }
        pt = null;
      }
      if (doip) {
        try {
          doip.close();
        } catch {
          /* ignore */
        }
        doip = null;
      }
      open = false;
      push('info', 'VAS6154 closed');
    },

    getDebugLog() {
      return [...log];
    },

    getCapabilities() {
      return {
        ...emptyCapabilities(adapterInfo, protocol),
        adapterId: 'vas6154',
        experimental: true,
        mode: pt ? 'passthru' : doip ? 'doip' : mode,
        dids: SAFE_DIDS.map((d) => ({
          id: `0x${d.id.toString(16)}`,
          key: d.key,
          label: d.label,
        })),
        note: 'Experimental — raw PassThru/DoIP transcript; no full UDS module map',
      };
    },

    async readLive() {
      return buildLive();
    },

    async readFaults() {
      return buildFaults();
    },

    async readVehicleInfo() {
      if (readDids && doip && open) await tryDoipDids();
      if (readDids && pt && open) await tryPassThruDids();
      return buildVehicle();
    },

    async snapshot() {
      const live = await this.readLive();
      const faults = await this.readFaults();
      const vehicle = await this.readVehicleInfo();
      return {
        at: new Date().toISOString(),
        adapter: adapterInfo,
        protocol,
        experimental: true,
        live,
        faults,
        vehicle,
        pids: {},
        dtcs: [],
        errors: vehicle.errors || [],
      };
    },
  };
}

/** Re-export discovery helpers for /j2534 and /doip/discover routes. */
export { listPassThruDevices, pickVasDevice, discoverDoipVehicles };

function extractAscii(bytes) {
  if (!bytes?.length) return '';
  // Skip ISO-TP PCI / UDS header-ish prefix if present
  let start = 0;
  if (bytes[0] === 0x62) start = 3;
  else if ((bytes[0] & 0xf0) === 0x00 && bytes[1] === 0x62) start = 4;
  const slice = bytes.slice(start);
  return Buffer.from(slice)
    .toString('ascii')
    .replace(/[^\x20-\x7E]/g, '')
    .trim();
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
