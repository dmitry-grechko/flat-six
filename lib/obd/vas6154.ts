/**
 * Browser-safe VAS 6154 stub. Real PassThru/DoIP is Node-only (`vas6154-node.ts`).
 */

import type {
  AdapterKind,
  Capabilities,
  DebugLogEntry,
  FaultsData,
  LiveData,
  ObdAdapter,
  Snapshot,
  VehicleInfo,
} from './types';

export class Vas6154Stub implements ObdAdapter {
  readonly kind: AdapterKind = 'vas6154';
  adapterInfo = '';
  protocol = '';
  lastLive: LiveData | null = null;
  lastFaults: FaultsData | null = null;
  lastVehicle: VehicleInfo | null = null;

  constructor(
    readonly path: string = 'vas6154',
    readonly baudRate: number = 0,
  ) {}

  isOpen(): boolean {
    return false;
  }

  async open(): Promise<void> {
    throw new Error(
      'VAS6154 requires the Node lab adapter (PassThru/DoIP). Use the OBD bridge on Windows, not the browser bundle.',
    );
  }

  async close(): Promise<void> {
    /* no-op */
  }

  getDebugLog(): DebugLogEntry[] {
    return [
      {
        ts: Date.now(),
        dir: 'err',
        line: 'VAS6154 stub — use tools/obd-bridge experimental adapter on Windows.',
      },
    ];
  }

  getCapabilities(): Capabilities {
    return {
      adapter: '',
      protocol: '',
      supportedPids: [],
      supportedMode09: [],
      liveCatalog: [],
      adapterKind: 'vas6154',
    };
  }

  async readLive(): Promise<LiveData> {
    throw new Error('VAS6154 not available in browser');
  }

  async readFaults(): Promise<FaultsData> {
    throw new Error('VAS6154 not available in browser');
  }

  async readVehicleInfo(): Promise<VehicleInfo> {
    throw new Error('VAS6154 not available in browser');
  }

  async snapshot(): Promise<Snapshot> {
    throw new Error('VAS6154 not available in browser');
  }
}
