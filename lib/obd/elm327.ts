/**
 * ELM327 client — Mode 01 live PIDs, Mode 02/03/07/0A faults, Mode 09 vehicle info.
 * Generic OBD-II only. Uses an injectable ByteTransport (Node serialport or Web Serial).
 */

import {
  classifyObdResponse,
  cleanElmResponse,
  negativeResponseInfo,
  parseDtcs,
  parseFreezeFrameDtc,
  parseMode06,
  parseMode06Bitmap,
  parseUdsDtcs,
  parseMode09Bitmap,
  parseMode09Hex,
  parseMode09Text,
  parsePid01,
  parsePid02,
  parsePidBitmap,
  PROMPT,
} from './decode';
import { ALL_LIVE_PIDS, PID_BITMAP_QUERY, PRIORITY_PIDS } from './pids';
import { obdProfile } from './profiles';
import type {
  AdapterKind,
  ByteTransport,
  Capabilities,
  ClearResult,
  DebugLogEntry,
  FaultsData,
  LiveData,
  Mode06Data,
  ModuleScanData,
  ModuleScanResult,
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
  lastMode06: Mode06Data | null = null;
  lastModuleScan: ModuleScanData | null = null;

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
    this.lastMode06 = null;
    this.lastModuleScan = null;
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

    // Trust the support bitmap only if discovery looks complete; a partial
    // discovery (a handful of PIDs) would otherwise starve the read. Priority
    // PIDs (rpm, speed, coolant, …) are near-universal — always attempt them.
    const trustSupported = this.supportedPids.size >= 8;

    for (const [pid, key, group, label, unit] of list) {
      const isPriority = PRIORITY_PIDS.some((p) => p[0] === pid);
      if (trustSupported && !this.supportedPids.has(pid) && pid !== '01' && !isPriority) {
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
    // Just the DME here (generic OBD Mode 03/07/0A). The other modules are read
    // for real by scanModules() and shown in the Module scan section — no more
    // static "requires UDS" placeholders.
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

  /**
   * Mode 06 — on-board monitoring test results. Discovers supported OBDMIDs via
   * the 06 00/20/… bitmaps, then reads each monitor's test value + limits.
   */
  async readMode06(): Promise<Mode06Data> {
    const out: Mode06Data = { at: new Date().toISOString(), supportedMids: [], tests: [], errors: [] };
    const nextOf: Record<string, string> = { '00': '20', '20': '40', '40': '60', '60': '80', '80': 'A0' };
    const mids = new Set<string>();
    for (const base of ['00', '20', '40', '60', '80', 'A0']) {
      try {
        const raw = await this.command(`06${base}`, 3000);
        for (const m of parseMode06Bitmap(raw, base)) mids.add(m);
        const next = nextOf[base];
        if (next && !mids.has(next)) break;
      } catch {
        break;
      }
    }
    // Range markers (00/20/…) advertise the next block, not a real test.
    const markers = new Set(['00', '20', '40', '60', '80', 'A0']);
    out.supportedMids = [...mids].filter((m) => !markers.has(m)).sort();
    for (const mid of out.supportedMids) {
      try {
        const raw = await this.command(`06${mid}`, 3000);
        out.tests.push(...parseMode06(raw, mid));
      } catch (e) {
        out.errors.push({ mid, message: e instanceof Error ? e.message : String(e) });
      }
    }
    this.lastMode06 = out;
    return out;
  }

  /**
   * Read-only UDS/KWP fault scan of non-DME modules. Reconfigures the ELM for
   * raw module addressing (per-module request id + receive filter), reads DTCs,
   * then restores generic-OBD addressing so live/faults reads keep working.
   * Non-DME addresses are candidates (see uds-modules.ts) — a `refused` result
   * still proves the address is right; `silent` means the id/routing is wrong.
   */
  async scanModules(generation: string): Promise<ModuleScanData> {
    const profile = obdProfile(generation);
    const modules = profile.modules;
    const results: ModuleScanResult[] = [];

    await this.command('ATSP6'); // ISO 15765-4 CAN, 500k
    await this.command('ATCAF1'); // ISO-TP auto-framing (assemble multi-frame)
    await this.command('ATH0'); // headers off — filter with receive address instead
    // Force ISO-TP flow control: many clone ELM327s don't auto-send the flow-control
    // frame, so a module's multi-frame reply (long DTC list, identity) truncates to
    // its first frame. ATFCSM1 makes the ELM send our FC (CTS, block size 0, STmin 0)
    // whenever it sees a First Frame; the per-module tx header is set in the loop below.
    await this.command('ATFCSD300000');
    await this.command('ATFCSM1');

    try {
      for (const m of modules) {
        const res: ModuleScanResult = {
          id: m.id,
          name: m.name,
          reqId: m.reqId,
          protocol: m.protocol,
          addressConfirmed: m.addressConfirmed,
          reachable: 'silent',
          sessionOk: false,
          confirmedDtcs: [],
          pendingDtcs: [],
          note: m.note,
        };
        try {
          await this.command(`ATSH${m.reqId}`);
          await this.command(`ATFCSH${m.reqId}`); // flow-control tx header = this module's request id
          await this.command(`ATCRA${m.respId}`);

          if (m.protocol === 'obd') {
            // DME / generic OBD ECU: DTCs via Mode 03 (confirmed) + 07 (pending).
            const raw3 = await this.command('03', 4000).catch(() => '');
            const c3 = classifyObdResponse(raw3, '03');
            res.reachable = c3 === 'pending' ? 'refused' : c3; // DME Mode 03 doesn't pend in practice
            if (res.reachable === 'positive') {
              res.confirmedDtcs = parseDtcs(raw3, '03');
              const raw7 = await this.command('07', 4000).catch(() => '');
              res.pendingDtcs = parseDtcs(raw7, '07');
            }
            // Manufacturer fault memory — where non-MIL faults (e.g. P000C) live,
            // which generic Mode 03 never reports. The read command is per-model
            // (profiles.ts): 981 = KWP `18 00 FF 00` (verified); newer = UDS
            // `19 02 FF`. Try the profile's protocol, then the other as a fallback.
            let extra = 0;
            const tryRead = async (cmd: string, sid: string, proto: 'uds' | 'kwp') => {
              const raw = await this.command(cmd, 4000).catch(() => '');
              if (classifyObdResponse(raw, sid) !== 'positive') return false;
              res.reachable = 'positive';
              for (const d of parseUdsDtcs(raw, proto)) {
                if (!res.confirmedDtcs.includes(d.code)) {
                  res.confirmedDtcs.push(d.code);
                  extra += 1;
                }
              }
              return true;
            };
            const dme = profile.dme;
            let ok = await tryRead(dme.readCmd, dme.readSid, dme.protocol);
            if (!ok && dme.protocol === 'kwp') {
              await this.command('1003', 2500).catch(() => ''); // some DMEs gate 19 behind a session
              ok = await tryRead('1902FF', '19', 'uds');
            } else if (!ok) {
              ok = await tryRead('1800FF00', '18', 'kwp');
            }
            if (extra) res.detail = `+${extra} from manufacturer fault memory`;
          } else {
            const proto = m.protocol === 'uds' ? 'uds' : 'kwp';
            const sess = await this.command('1003', 2500).catch(() => '');
            res.sessionOk = classifyObdResponse(sess, '10') === 'positive';

            // KWP2000 read-all-by-status (18 00 FF 00) — the sub-function the 981
            // ECUs accept (18 02 / 18 01 are rejected). UDS uses 19 02 FF.
            const dtcSid = proto === 'uds' ? '19' : '18';
            const readDtc = async (cmd: string) => {
              const raw = await this.command(cmd, 5000).catch(() => '');
              return { raw, cls: classifyObdResponse(raw, dtcSid) };
            };
            let { raw, cls } = await readDtc(proto === 'uds' ? '1902FF' : '1800FF00');
            // UDS "response pending" (0x78): the module is present but still computing.
            // Wait and re-read ONCE; only take the retry if it's not worse (a re-sent
            // request while the first is pending can desync a slow module into silence,
            // so we never let a retry downgrade a known-present 'pending' to 'silent').
            if (cls === 'pending') {
              await new Promise((r) => setTimeout(r, 500));
              const retry = await readDtc(proto === 'uds' ? '1902FF' : '1800FF00');
              if (retry.cls !== 'silent') ({ raw, cls } = retry);
            }
            // Some modules reject the "any status" mask as responseTooLong (0x14) —
            // fall back to confirmed-only (mask 0x08).
            if (proto === 'uds' && cls === 'refused' && negativeResponseInfo(raw)?.nrc === '14') {
              ({ raw, cls } = await readDtc('190208'));
            }
            if (cls === 'positive') {
              res.reachable = 'positive';
              for (const d of parseUdsDtcs(raw, proto)) {
                // UDS status bit 3 (0x08) = confirmedDTC; otherwise treat as pending.
                if (d.status & 0x08) res.confirmedDtcs.push(d.code);
                else res.pendingDtcs.push(d.code);
              }
            } else if (cls === 'pending') {
              res.reachable = 'refused'; // present, but never returned a final answer
              res.detail = 'response pending';
            } else if (cls === 'refused') {
              res.reachable = 'refused';
              const nr = negativeResponseInfo(raw);
              if (nr) res.detail = nr.nrcName;
            } else {
              res.reachable = 'silent';
            }
          }
        } catch (e) {
          res.error = e instanceof Error ? e.message : String(e);
        }
        results.push(res);
      }
    } finally {
      // Restore generic-OBD state (functional header, auto receive, headers off).
      await this.command('ATAR').catch(() => {});
      await this.command('ATSH7DF').catch(() => {});
      await this.command('ATH0').catch(() => {});
    }

    const scan: ModuleScanData = {
      at: new Date().toISOString(),
      generation,
      results,
      note: 'Read-only UDS/KWP scan. Non-DME addresses are candidates until confirmed on a real vehicle.',
    };
    this.lastModuleScan = scan;
    return scan;
  }

  /**
   * Clear stored fault codes (a WRITE — resets DTCs, freeze frames and emissions
   * readiness). Sends generic Mode 04 AND the per-model manufacturer clear
   * (service 14; 981 = KWP `14 FF 00`). Restores generic-OBD addressing after.
   * Callers should confirm with the user first — this is not reversible and an
   * active fault will simply return on the next drive cycle.
   */
  async clearFaults(generation: string): Promise<ClearResult> {
    const dme = obdProfile(generation).dme;
    const out: ClearResult = { at: new Date().toISOString(), cleared: [], errors: [] };

    await this.command('ATSP6');
    await this.command('ATCAF1');
    await this.command('ATH0');
    await this.command('ATSH7E0');
    await this.command('ATCRA7E8');
    try {
      const r04 = await this.command('04', 4000).catch((e) => String(e));
      if (classifyObdResponse(r04, '04') === 'positive') out.cleared.push('Emissions memory (Mode 04)');
      else out.errors.push({ cmd: '04', message: (r04 || 'no response').replace(/\n/g, ' ').trim() });

      const rMf = await this.command(dme.clearCmd, 4000).catch((e) => String(e));
      if (classifyObdResponse(rMf, dme.clearSid) === 'positive') out.cleared.push('Manufacturer fault memory');
      else out.errors.push({ cmd: dme.clearCmd, message: (rMf || 'no response').replace(/\n/g, ' ').trim() });
    } finally {
      await this.command('ATAR').catch(() => {});
      await this.command('ATSH7DF').catch(() => {});
      await this.command('ATH0').catch(() => {});
    }
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
