/**
 * Browser HTTP client for the local OBD bridge (tools/obd-bridge on :8765).
 */

import type {
  Capabilities,
  ConnectOptions,
  FaultsData,
  LiveData,
  Mode06Data,
  ModuleScanData,
  ObdClient,
  ObdStatus,
  PortInfo,
  VehicleInfo,
  DebugLogEntry,
  AdapterKind,
  TransportKind,
} from './types';

const DEFAULT_BASE = 'http://127.0.0.1:8765';

export function bridgeBaseUrl(): string {
  if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_OBD_BRIDGE_URL) {
    return process.env.NEXT_PUBLIC_OBD_BRIDGE_URL.replace(/\/$/, '');
  }
  return DEFAULT_BASE;
}

async function request<T>(base: string, path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(`${base}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
  });
  const text = await res.text();
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const err = data as { error?: string };
    throw new Error(err.error || res.statusText || `HTTP ${res.status}`);
  }
  return data as T;
}

function normalizeStatus(raw: Record<string, unknown>): ObdStatus {
  const caps = raw.capabilities as Capabilities | null | undefined;
  return {
    connected: Boolean(raw.connected),
    path: (raw.path as string) ?? null,
    baudRate: (raw.baudRate as number) ?? null,
    transport: (raw.transport as TransportKind) ?? null,
    adapter: (raw.adapter as string) ?? null,
    protocol: (raw.protocol as string) ?? null,
    adapterKind: (raw.adapterKind as AdapterKind) ?? caps?.adapterKind ?? 'elm327',
    polling: Boolean(raw.polling),
    pollSupported: raw.pollSupported !== undefined ? Boolean(raw.pollSupported) : true,
    lastLive: (raw.lastLive as LiveData) ?? null,
    lastFaults: (raw.lastFaults as FaultsData) ?? null,
    lastVehicle: (raw.lastVehicle as VehicleInfo) ?? null,
    capabilities: caps ?? null,
    platform: String(raw.platform ?? ''),
  };
}

/** Create an ObdClient pointed at the local bridge. */
export function createHttpObdClient(baseUrl: string = bridgeBaseUrl()): ObdClient {
  const base = baseUrl.replace(/\/$/, '');

  return {
    async health() {
      return request(base, '/health');
    },

    async listPorts() {
      const data = await request<{ platform: string; ports: PortInfo[] }>(base, '/ports');
      return data;
    },

    async connect(opts: ConnectOptions) {
      const data = await request<{ ok: boolean; status: Record<string, unknown> }>(base, '/connect', {
        method: 'POST',
        body: JSON.stringify({
          port: opts.port,
          baudRate: opts.baudRate ?? 38400,
          adapter: opts.adapter ?? 'elm327',
        }),
      });
      return { ok: data.ok, status: normalizeStatus(data.status || {}) };
    },

    async disconnect() {
      return request(base, '/disconnect', { method: 'POST', body: '{}' });
    },

    async status() {
      const raw = await request<Record<string, unknown>>(base, '/status');
      return normalizeStatus(raw);
    },

    async capabilities() {
      return request(base, '/capabilities');
    },

    async getLive() {
      try {
        return await request<LiveData>(base, '/live');
      } catch {
        return null;
      }
    },

    async refreshLive(opts) {
      return request(base, '/live', {
        method: 'POST',
        body: JSON.stringify({ priorityOnly: opts?.priorityOnly === true }),
      });
    },

    async getFaults() {
      try {
        return await request<FaultsData>(base, '/faults');
      } catch {
        return null;
      }
    },

    async refreshFaults() {
      return request(base, '/faults', { method: 'POST', body: '{}' });
    },

    async getVehicle() {
      try {
        return await request<VehicleInfo>(base, '/vehicle');
      } catch {
        return null;
      }
    },

    async refreshVehicle() {
      return request(base, '/vehicle', { method: 'POST', body: '{}' });
    },

    async getMode06() {
      try {
        return await request<Mode06Data>(base, '/mode06');
      } catch {
        return null;
      }
    },

    async refreshMode06() {
      return request(base, '/mode06', { method: 'POST', body: '{}' });
    },

    async getModuleScan() {
      try {
        return await request<ModuleScanData>(base, '/modules');
      } catch {
        return null;
      }
    },

    async scanModules(generation: string) {
      return request(base, '/modules', {
        method: 'POST',
        body: JSON.stringify({ generation }),
      });
    },

    async clearFaults(generation: string) {
      return request(base, '/clear', {
        method: 'POST',
        body: JSON.stringify({ generation }),
      });
    },

    async pollStart(intervalMs = 2000) {
      return request(base, '/poll/start', {
        method: 'POST',
        body: JSON.stringify({ intervalMs }),
      });
    },

    async pollStop() {
      return request(base, '/poll/stop', { method: 'POST', body: '{}' });
    },

    async debug() {
      return request<{
        platform: string;
        log: DebugLogEntry[];
        lastLive: LiveData | null;
        lastFaults: FaultsData | null;
        lastVehicle: VehicleInfo | null;
        capabilities: Capabilities | null;
      }>(base, '/debug');
    },
  };
}
