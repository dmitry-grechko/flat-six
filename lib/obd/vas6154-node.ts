/**
 * Node-only VAS 6154 adapter — wraps tools/obd-bridge PassThru/DoIP lab session.
 * Not imported by the browser-safe index; loaded via createAdapter on Node.
 */

import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  AdapterKind,
  Capabilities,
  DebugLogEntry,
  FaultsData,
  LiveData,
  ObdAdapter,
  Snapshot,
  Vas6154Options,
  VehicleInfo,
} from './types';

export type { Vas6154Mode, Vas6154Options } from './types';

type Inner = {
  path: string;
  baudRate: number | null;
  adapterInfo: string;
  protocol: string;
  lastLive: LiveData | null;
  lastFaults: FaultsData | null;
  lastVehicle: VehicleInfo | null;
  isOpen(): boolean;
  open(): Promise<void>;
  close(): Promise<void>;
  getDebugLog(): DebugLogEntry[];
  getCapabilities(): Partial<Capabilities>;
  readLive(opts?: { priorityOnly?: boolean }): Promise<LiveData>;
  readFaults(): Promise<FaultsData>;
  readVehicleInfo(): Promise<VehicleInfo>;
  snapshot(): Promise<Snapshot>;
};

export class Vas6154Adapter implements ObdAdapter {
  readonly kind: AdapterKind = 'vas6154';
  #inner: Inner | null = null;
  #opts: Vas6154Options;
  #path: string;
  #baudRate: number;

  adapterInfo = 'VAS 6154 (experimental)';
  protocol = '';
  lastLive: LiveData | null = null;
  lastFaults: FaultsData | null = null;
  lastVehicle: VehicleInfo | null = null;

  constructor(opts: Vas6154Options = {}) {
    this.#opts = opts;
    this.#path = String(opts.dllPath || opts.host || opts.path || 'vas6154');
    this.#baudRate = Number(opts.baudRate || 0);
  }

  get path(): string {
    return this.#inner?.path ?? this.#path;
  }

  get baudRate(): number {
    return this.#inner?.baudRate ?? this.#baudRate ?? 0;
  }

  isOpen(): boolean {
    return this.#inner?.isOpen() === true;
  }

  async open(): Promise<void> {
    const here = path.dirname(fileURLToPath(import.meta.url));
    const adapterUrl = pathToFileURL(
      path.join(here, '../../tools/obd-bridge/adapters/vas6154/adapter.mjs'),
    ).href;
    const mod = await import(adapterUrl);
    this.#inner = mod.createVas6154Adapter({
      mode: this.#opts.mode || 'auto',
      dllPath: this.#opts.dllPath,
      host: this.#opts.host,
      doipPort: this.#opts.doipPort,
      protocol: this.#opts.protocol,
      baudRate: this.#opts.baudRate,
      sourceAddress: this.#opts.sourceAddress,
      targetAddress: this.#opts.targetAddress,
      readDids: this.#opts.readDids,
    }) as Inner;
    await this.#inner.open();
    this.adapterInfo = this.#inner.adapterInfo;
    this.protocol = this.#inner.protocol;
    this.#path = this.#inner.path;
    this.#baudRate = this.#inner.baudRate ?? 0;
    this.lastLive = this.#inner.lastLive;
    this.lastFaults = this.#inner.lastFaults;
    this.lastVehicle = this.#inner.lastVehicle;
  }

  async close(): Promise<void> {
    if (this.#inner) {
      try {
        await this.#inner.close();
      } catch {
        /* ignore */
      }
    }
    this.#inner = null;
    this.lastLive = null;
    this.lastFaults = null;
    this.lastVehicle = null;
  }

  getDebugLog(): DebugLogEntry[] {
    return this.#inner?.getDebugLog() ?? [];
  }

  getCapabilities(): Capabilities {
    const c = this.#inner?.getCapabilities() ?? {};
    return {
      adapter: this.adapterInfo,
      protocol: this.protocol,
      supportedPids: c.supportedPids ?? [],
      supportedMode09: c.supportedMode09 ?? [],
      liveCatalog: c.liveCatalog ?? [],
      adapterKind: 'vas6154',
    };
  }

  async readLive(opts?: { priorityOnly?: boolean }): Promise<LiveData> {
    if (!this.#inner) throw new Error('VAS6154 not connected');
    this.lastLive = await this.#inner.readLive(opts);
    return this.lastLive;
  }

  async readFaults(): Promise<FaultsData> {
    if (!this.#inner) throw new Error('VAS6154 not connected');
    this.lastFaults = await this.#inner.readFaults();
    return this.lastFaults;
  }

  async readVehicleInfo(): Promise<VehicleInfo> {
    if (!this.#inner) throw new Error('VAS6154 not connected');
    this.lastVehicle = await this.#inner.readVehicleInfo();
    return this.lastVehicle;
  }

  async snapshot(): Promise<Snapshot> {
    if (!this.#inner) throw new Error('VAS6154 not connected');
    const snap = await this.#inner.snapshot();
    this.lastLive = this.#inner.lastLive;
    this.lastFaults = this.#inner.lastFaults;
    this.lastVehicle = this.#inner.lastVehicle;
    return snap;
  }
}
