/**
 * ELM327 client — Mode 01 live PIDs, Mode 02/03/07/0A faults, Mode 09 vehicle info.
 * Generic OBD-II only. Uses an injectable ByteTransport (Node serialport or Web Serial).
 */

import {
  cleanElmResponse,
  parseDtcs,
  parseFreezeFrameDtc,
  parseMode09Bitmap,
  parseMode09Hex,
  parseMode09Text,
  parsePid01,
  parsePid02,
  parsePidBitmap,
  PROMPT,
} from './decode';
import { ALL_LIVE_PIDS, PID_BITMAP_QUERY, PRIORITY_PIDS, UDS_PLACEHOLDER_MODULES } from './pids';
import type {
  AdapterKind,
  ByteTransport,
  Capabilities,
  DebugLogEntry,
  FaultsData,
  LiveData,
  MonitorStatus,
  ObdAdapter,
  Snapshot,
  VehicleInfo,
} from './types';

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export class Elm327 implements ObdAdapter {
  readonly kind: AdapterKind = 'elm327';
  readonly path: string;
  readonly baudRate: number;

  #transport: ByteTransport;
  #log: DebugLogEntry[] = [];
  #maxLog = 300;
  #chain: Promise<unknown> = Promise.resolve();

  supportedPids = new Set<string>();
  supportedMode09 = new Set<string>();

  lastLive: LiveData | null = null;
  lastFaults: FaultsData | null = null;
  lastVehicle: VehicleInfo | null = null;

  adapterInfo = '';
  protocol = '';

  constructor(transport: ByteTransport, baudRate = 38400) {
    this.#transport = transport;
    this.path = transport.path;
    this.baudRate = baudRate;
  }

  #push(dir: DebugLogEntry['dir'], line: string) {
    this.#log.push({ ts: Date.now(), dir, line });
    if (this.#log.length > this.#maxLog) this.#log.shift();
  }

  getDebugLog(): DebugLogEntry[] {
    return [...this.#log];
  }

  isOpen(): boolean {
    return this.#transport.isOpen();
  }

  async open(): Promise<void> {
    if (this.#transport.isOpen()) await this.close();

    this.#chain = Promise.resolve();
    this.#transport.setMaxListeners?.(50);
    await this.#transport.open();

    await sleep(400);
    await this.init();
    await this.discoverCapabilities();
    this.lastVehicle = await this.readVehicleInfo();
    this.lastFaults = await this.readFaults();
    this.lastLive = await this.readLive({ priorityOnly: false });
  }

  async close(): Promise<void> {
    this.supportedPids = new Set();
    this.supportedMode09 = new Set();
    this.lastLive = null;
    this.lastFaults = null;
    this.lastVehicle = null;
    this.#chain = Promise.resolve();
    await this.#transport.close();
  }

  async init(): Promise<void> {
    await this.command('ATZ', 3000);
    await sleep(300);
    await this.command('ATE0');
    await this.command('ATL0');
    await this.command('ATS0');
    await this.command('ATH0');
    await this.command('ATSP0');
    this.adapterInfo = (await this.command('ATI')).trim();
    try {
      this.protocol = (await this.command('ATDPN')).trim();
    } catch {
      this.protocol = (await this.command('ATDP')).trim();
    }
  }

  command(cmd: string, timeoutMs = 2500): Promise<string> {
    const run = () => this.#commandNow(cmd, timeoutMs);
    const next = this.#chain.then(run, run);
    this.#chain = next.catch(() => {});
    return next as Promise<string>;
  }

  async #commandNow(cmd: string, timeoutMs = 2500): Promise<string> {
    if (!this.#transport.isOpen()) throw new Error('Serial port not open');
    const line = cmd.trim();
    this.#push('tx', line);

    let out = await this.#exchange(line, timeoutMs);

    if (/STOPPED/i.test(out)) {
      this.#push('err', 'STOPPED — recovering');
      await sleep(100);
      try {
        await this.#exchange('', 800);
      } catch {
        /* ignore */
      }
      await sleep(150);
      out = await this.#exchange(line, timeoutMs);
      if (/STOPPED/i.test(out)) {
        throw new Error('ELM327 STOPPED — bus busy; slow poll or reconnect');
      }
    }

    if (/UNABLE TO CONNECT/i.test(out)) {
      throw new Error('ELM327: UNABLE TO CONNECT — ignition on? Dongle seated?');
    }
    if (/^ERROR/i.test(out)) {
      throw new Error(`ELM327 error: ${out}`);
    }
    return out;
  }

  #exchange(line: string, timeoutMs: number): Promise<string> {
    const transport = this.#transport;
    if (!transport.isOpen()) return Promise.reject(new Error('Serial port not open'));

    return new Promise((resolve, reject) => {
      let buf = '';
      let settled = false;

      const timer = setTimeout(() => {
        finish(() => {
          this.#push('err', `TIMEOUT ${line || '(empty)'}`);
          reject(new Error(`Timeout waiting for response to: ${line || '(empty)'}`));
        });
      }, timeoutMs);

      const onData = (chunk: string) => {
        buf += chunk.replace(/\r/g, '\n');
        if (
          buf.includes(PROMPT) ||
          /STOPPED/i.test(buf) ||
          /UNABLE TO CONNECT/i.test(buf) ||
          /(^|\n)ERROR/i.test(buf)
        ) {
          finish(() => {
            const out = cleanElmResponse(buf);
            this.#push('rx', out || buf.trim());
            resolve(out);
          });
        }
      };

      const onErr = (err: Error) => {
        finish(() => {
          this.#push('err', err.message);
          reject(err);
        });
      };

      const finish = (fn: () => void) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        transport.offData(onData);
        transport.offError(onErr);
        fn();
      };

      transport.onData(onData);
      transport.onError(onErr);
      transport.write(`${line}\r`).catch((err) => {
        finish(() => reject(err));
      });
    });
  }

  async discoverCapabilities(): Promise<void> {
    this.supportedPids = new Set();
    for (const pid of PID_BITMAP_QUERY) {
      try {
        const raw = await this.command(`01${pid}`, 3000);
        const bits = parsePidBitmap(raw, pid);
        if (!bits) break;
        for (const p of bits) this.supportedPids.add(p);
        const nextMarker =
          pid === '00'
            ? '20'
            : pid === '20'
              ? '40'
              : pid === '40'
                ? '60'
                : pid === '60'
                  ? '80'
                  : pid === '80'
                    ? 'A0'
                    : null;
        if (nextMarker && !this.supportedPids.has(nextMarker)) break;
      } catch {
        break;
      }
    }

    this.supportedMode09 = new Set();
    try {
      const raw = await this.command('0900', 3000);
      const bits = parseMode09Bitmap(raw);
      for (const t of bits) this.supportedMode09.add(t);
    } catch {
      this.supportedMode09 = new Set(['02', '04', '06', '0A']);
    }
  }

  getCapabilities(): Capabilities {
    return {
      adapter: this.adapterInfo,
      protocol: this.protocol,
      supportedPids: [...this.supportedPids].sort(),
      supportedMode09: [...this.supportedMode09].sort(),
      liveCatalog: ALL_LIVE_PIDS.map(([pid, key, group, label, unit]) => ({
        pid,
        key,
        group,
        label,
        unit,
        supported: this.supportedPids.has(pid) || pid === '01',
        priority: PRIORITY_PIDS.some((p) => p[0] === pid),
      })),
      adapterKind: 'elm327',
    };
  }

  async readPid(hexPid: string): Promise<string | number | MonitorStatus | number[] | null> {
    const pid = hexPid.toUpperCase().replace(/^0x/, '');
    const raw = await this.command(`01${pid}`);
    return parsePid01(raw, pid);
  }

  async readLive(opts: { priorityOnly?: boolean } = {}): Promise<LiveData> {
    const priorityOnly = opts.priorityOnly === true;
    const list = priorityOnly ? PRIORITY_PIDS : ALL_LIVE_PIDS;
    const prev = this.lastLive;
    const out: LiveData = {
      at: new Date().toISOString(),
      adapter: this.adapterInfo,
      protocol: this.protocol,
      values: priorityOnly && prev?.values ? { ...prev.values } : {},
      groups: {},
      readiness: priorityOnly ? (prev?.readiness ?? null) : null,
      errors: [],
      priorityOnly,
    };

    const freshGroups: Record<string, LiveData['groups'][string]> = {};

    for (const [pid, key, group, label, unit] of list) {
      if (this.supportedPids.size > 0 && !this.supportedPids.has(pid) && pid !== '01') {
        continue;
      }
      try {
        const v = await this.readPid(pid);
        if (v == null) continue;
        if (pid === '01' && typeof v === 'object' && !Array.isArray(v)) {
          out.readiness = v as MonitorStatus;
          out.values[key] = (v as MonitorStatus).mil ? 'MIL ON' : 'MIL OFF';
        } else {
          out.values[key] = v as string | number;
        }
        if (!freshGroups[group]) freshGroups[group] = [];
        freshGroups[group].push({
          pid,
          key,
          label,
          unit,
          value:
            pid === '01' && typeof v === 'object' && !Array.isArray(v)
              ? (v as MonitorStatus).mil
                ? 'MIL ON'
                : 'MIL OFF'
              : (v as string | number),
        });
      } catch (e) {
        out.errors.push({ pid, message: e instanceof Error ? e.message : String(e) });
      }
    }

    if (priorityOnly && prev?.groups) {
      out.groups = { ...prev.groups };
      for (const [g, items] of Object.entries(freshGroups)) {
        out.groups[g] = items;
      }
    } else {
      out.groups = freshGroups;
    }

    this.lastLive = out;
    return out;
  }

  async readDtcs(mode = '03'): Promise<string[]> {
    const cmd = mode.toUpperCase();
    const raw = await this.command(cmd, 4000);
    return parseDtcs(raw, cmd);
  }

  async readFreezeFrame() {
    try {
      const dtcRaw = await this.command('0202', 3000);
      const frameDtc = parseFreezeFrameDtc(dtcRaw);
      const frame = { dtc: frameDtc, pids: {} as Record<string, string | number | number[] | null>, errors: [] as { pid: string; message: string }[] };
      if (!frameDtc) return frame;

      const framePids: [string, string][] = [
        ['0C', 'rpm'],
        ['05', 'coolant_c'],
        ['0D', 'speed_kmh'],
        ['04', 'engine_load_pct'],
        ['0B', 'map_kpa'],
        ['11', 'tps_pct'],
      ];
      for (const [pid, key] of framePids) {
        try {
          const raw = await this.command(`02${pid}`, 2500);
          const v = parsePid02(raw, pid);
          if (v != null) frame.pids[key] = v as string | number | number[];
        } catch (e) {
          frame.errors.push({ pid, message: e instanceof Error ? e.message : String(e) });
        }
      }
      return frame;
    } catch (e) {
      return {
        dtc: null,
        pids: {},
        errors: [{ pid: '02', message: e instanceof Error ? e.message : String(e) }],
      };
    }
  }

  async readFaults(): Promise<FaultsData> {
    const out: FaultsData = {
      at: new Date().toISOString(),
      modules: [
        {
          id: 'dme',
          name: 'DME / Engine (OBD-II)',
          available: true,
          confirmed: [],
          pending: [],
          permanent: [],
          freezeFrame: null,
          readiness: null,
          errors: [],
        },
        ...UDS_PLACEHOLDER_MODULES.map((m) => ({
          id: m.id,
          name: m.name,
          available: false,
          note: m.note,
          confirmed: [] as string[],
          pending: [] as string[],
          permanent: [] as string[],
        })),
      ],
    };

    const dme = out.modules[0];

    try {
      dme.confirmed = await this.readDtcs('03');
    } catch (e) {
      dme.errors!.push({ service: '03', message: e instanceof Error ? e.message : String(e) });
    }
    try {
      dme.pending = await this.readDtcs('07');
    } catch (e) {
      dme.errors!.push({ service: '07', message: e instanceof Error ? e.message : String(e) });
    }
    try {
      dme.permanent = await this.readDtcs('0A');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!/NO DATA|NODATA|TIMEOUT/i.test(msg)) {
        dme.errors!.push({ service: '0A', message: msg });
      }
    }

    try {
      if (this.supportedPids.size === 0 || this.supportedPids.has('01')) {
        const r = await this.readPid('01');
        if (r && typeof r === 'object' && !Array.isArray(r)) dme.readiness = r as MonitorStatus;
      }
    } catch (e) {
      dme.errors!.push({ service: '01', message: e instanceof Error ? e.message : String(e) });
    }

    dme.freezeFrame = await this.readFreezeFrame();

    this.lastFaults = out;
    return out;
  }

  async readVehicleInfo(): Promise<VehicleInfo> {
    const out: VehicleInfo = {
      at: new Date().toISOString(),
      vin: null,
      calid: null,
      cvn: null,
      ecu_name: null,
      supportedMode09: [...this.supportedMode09].sort(),
      supportedPids: [...this.supportedPids].sort(),
      adapter: this.adapterInfo,
      protocol: this.protocol,
      errors: [],
    };

    const tryType = async (
      type: string,
      key: 'vin' | 'calid' | 'cvn' | 'ecu_name',
      parser: (raw: string, type: string) => string | null,
    ) => {
      if (this.supportedMode09.size > 0 && !this.supportedMode09.has(type)) return;
      try {
        const raw = await this.command(`09${type}`, 5000);
        const v = parser(raw, type);
        if (v) out[key] = v;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (!/NO DATA|NODATA/i.test(msg)) {
          out.errors.push({ type: `09${type}`, message: msg });
        }
      }
    };

    await tryType('02', 'vin', parseMode09Text);
    await tryType('04', 'calid', parseMode09Text);
    await tryType('06', 'cvn', parseMode09Hex);
    await tryType('0A', 'ecu_name', parseMode09Text);

    if (!out.vin) {
      try {
        const raw = await this.command('0902', 5000);
        out.vin = parseMode09Text(raw, '02');
      } catch {
        /* ignore */
      }
    }

    this.lastVehicle = out;
    return out;
  }

  async snapshot(): Promise<Snapshot> {
    const live = await this.readLive({ priorityOnly: false });
    const faults = await this.readFaults();
    const vehicle = this.lastVehicle || (await this.readVehicleInfo());
    return {
      at: new Date().toISOString(),
      adapter: this.adapterInfo,
      protocol: this.protocol,
      live,
      faults,
      vehicle,
      pids: {
        rpm: live.values.rpm,
        coolant_c: live.values.coolant_c,
        speed_kmh: live.values.speed_kmh,
        voltage_v: live.values.voltage_v,
        engine_load_pct: live.values.engine_load_pct,
      },
      dtcs: faults.modules[0]?.confirmed ?? [],
      errors: live.errors,
    };
  }
}
