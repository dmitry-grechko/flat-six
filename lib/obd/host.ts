/**
 * Shared OBD session host — used by the HTTP bridge and Electron main.
 */

import { connectOptionsToCreate, createAdapter } from './adapter';
import { createNodeSerialTransport, listSerialPorts } from './node-serial';
import { classifyPath, classifyPort } from './ports';
import type {
  AdapterKind,
  Capabilities,
  ClearResult,
  ConnectOptions,
  FaultsData,
  LiveData,
  Mode06Data,
  ModuleScanData,
  ObdAdapter,
  ObdStatus,
  PortInfo,
  Snapshot,
  VehicleInfo,
} from './types';

export class ObdHost {
  #session: ObdAdapter | null = null;
  #pollTimer: ReturnType<typeof setTimeout> | null = null;
  #pollCancel = false;
  #pollingActive = false;
  #lastLive: LiveData | null = null;
  #lastFaults: FaultsData | null = null;
  #lastVehicle: VehicleInfo | null = null;
  #lastSnapshot: Snapshot | null = null;
  #adapterKind: AdapterKind = 'elm327';
  readonly platform: NodeJS.Platform;

  constructor(platform: NodeJS.Platform = process.platform) {
    this.platform = platform;
  }

  async listPorts(): Promise<{ platform: string; ports: PortInfo[] }> {
    const list = await listSerialPorts();
    const ports = list
      .map((p) => classifyPort(p, this.platform))
      .filter((p) => !p.ignore)
      .sort((a, b) => b.score - a.score || a.path.localeCompare(b.path));
    return { platform: this.platform, ports };
  }

  async connect(opts: ConnectOptions): Promise<ObdStatus> {
    const adapter = opts.adapter ?? 'elm327';
    const port = String(opts.port || '').trim();
    if (!port) throw new Error('Missing port');

    await this.disconnect();

    this.#adapterKind = adapter;
    const createOpts = connectOptionsToCreate({
      ...opts,
      adapter,
      port,
      baudRate: opts.baudRate ?? 38400,
    });
    this.#session = await createAdapter({
      ...createOpts,
      createSerialTransport: createNodeSerialTransport,
    });
    await this.#session.open();
    this.#lastLive = this.#session.lastLive;
    this.#lastFaults = this.#session.lastFaults;
    this.#lastVehicle = this.#session.lastVehicle;
    this.#lastSnapshot = {
      at: new Date().toISOString(),
      adapter: this.#session.adapterInfo,
      protocol: this.#session.protocol,
      live: this.#lastLive!,
      faults: this.#lastFaults!,
      vehicle: this.#lastVehicle!,
      pids: {
        rpm: this.#lastLive?.values?.rpm,
        coolant_c: this.#lastLive?.values?.coolant_c,
        speed_kmh: this.#lastLive?.values?.speed_kmh,
        voltage_v: this.#lastLive?.values?.voltage_v,
        engine_load_pct: this.#lastLive?.values?.engine_load_pct,
      },
      dtcs: this.#lastFaults?.modules?.[0]?.confirmed ?? [],
      errors: this.#lastLive?.errors ?? [],
    };
    return this.status();
  }

  async disconnect(): Promise<void> {
    this.stopPoll();
    if (this.#session) {
      try {
        await this.#session.close();
      } catch {
        /* ignore */
      }
    }
    this.#session = null;
    this.#lastSnapshot = null;
    this.#lastLive = null;
    this.#lastFaults = null;
    this.#lastVehicle = null;
  }

  status(): ObdStatus {
    const s = this.#session;
    return {
      connected: s?.isOpen() === true,
      path: s?.path ?? null,
      baudRate: s?.baudRate ?? null,
      transport: s ? classifyPath(s.path, null, this.platform).transport : null,
      adapter: s?.adapterInfo ?? null,
      protocol: s?.protocol ?? null,
      adapterKind: this.#adapterKind,
      polling: this.#pollingActive,
      pollSupported: true,
      lastLive: this.#lastLive,
      lastFaults: this.#lastFaults,
      lastVehicle: this.#lastVehicle,
      capabilities: s?.isOpen() ? s.getCapabilities() : null,
      platform: this.platform,
    };
  }

  capabilities(): Capabilities {
    if (!this.#session?.isOpen()) throw new Error('Not connected');
    return this.#session.getCapabilities();
  }

  getLive(): LiveData | null {
    return this.#lastLive || this.#session?.lastLive || null;
  }

  async refreshLive(opts?: { priorityOnly?: boolean }): Promise<LiveData> {
    if (!this.#session?.isOpen()) throw new Error('Not connected');
    this.#lastLive = await this.#session.readLive(opts);
    return this.#lastLive;
  }

  getFaults(): FaultsData | null {
    return this.#lastFaults || this.#session?.lastFaults || null;
  }

  async refreshFaults(): Promise<FaultsData> {
    if (!this.#session?.isOpen()) throw new Error('Not connected');
    this.#lastFaults = await this.#session.readFaults();
    return this.#lastFaults;
  }

  getVehicle(): VehicleInfo | null {
    return this.#lastVehicle || this.#session?.lastVehicle || null;
  }

  async refreshVehicle(): Promise<VehicleInfo> {
    if (!this.#session?.isOpen()) throw new Error('Not connected');
    this.#lastVehicle = await this.#session.readVehicleInfo();
    return this.#lastVehicle;
  }

  getMode06(): Mode06Data | null {
    return this.#session?.lastMode06 ?? null;
  }

  async refreshMode06(): Promise<Mode06Data> {
    if (!this.#session?.isOpen()) throw new Error('Not connected');
    return this.#session.readMode06();
  }

  getModuleScan(): ModuleScanData | null {
    return this.#session?.lastModuleScan ?? null;
  }

  async scanModules(generation: string): Promise<ModuleScanData> {
    if (!this.#session?.isOpen()) throw new Error('Not connected');
    return this.#session.scanModules(generation);
  }

  async clearFaults(generation: string): Promise<ClearResult> {
    if (!this.#session?.isOpen()) throw new Error('Not connected');
    return this.#session.clearFaults(generation);
  }

  async snapshot(): Promise<Snapshot> {
    if (!this.#session?.isOpen()) throw new Error('Not connected');
    this.#lastSnapshot = await this.#session.snapshot();
    this.#lastLive = this.#session.lastLive;
    this.#lastFaults = this.#session.lastFaults;
    this.#lastVehicle = this.#session.lastVehicle;
    return this.#lastSnapshot;
  }

  async pollStart(intervalMsInput?: number): Promise<{ ok: true; intervalMs: number }> {
    const intervalMs = Math.max(1500, Number(intervalMsInput || 2000));
    if (!this.#session?.isOpen()) throw new Error('Not connected');
    this.stopPoll();
    this.#pollCancel = false;
    this.#pollingActive = true;

    let tick = 0;
    const runPoll = async () => {
      if (this.#pollCancel || !this.#session?.isOpen()) {
        this.#pollingActive = false;
        return;
      }
      try {
        tick += 1;
        const priorityOnly = tick % 4 !== 0;
        this.#lastLive = await this.#session.readLive({ priorityOnly });
      } catch (e) {
        console.error('[poll]', e instanceof Error ? e.message : e);
      }
      if (!this.#pollCancel && this.#session?.isOpen()) {
        this.#pollTimer = setTimeout(runPoll, intervalMs);
      } else {
        this.#pollingActive = false;
      }
    };
    this.#pollTimer = setTimeout(runPoll, 0);
    return { ok: true, intervalMs };
  }

  stopPoll(): void {
    this.#pollCancel = true;
    this.#pollingActive = false;
    if (this.#pollTimer) {
      clearTimeout(this.#pollTimer);
      this.#pollTimer = null;
    }
  }

  debug() {
    return {
      platform: this.platform,
      log: this.#session?.getDebugLog() ?? [],
      lastSnapshot: this.#lastSnapshot,
      lastLive: this.#lastLive,
      lastFaults: this.#lastFaults,
      lastVehicle: this.#lastVehicle,
      capabilities: this.#session?.isOpen() ? this.#session.getCapabilities() : null,
    };
  }
}
