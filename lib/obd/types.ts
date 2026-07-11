/** Shared OBD read-model types for bridge, Track UI, Electron, and PWA. */

export type AdapterKind = 'elm327' | 'vas6154';

export type TransportKind =
  | 'usb'
  | 'bluetooth-classic'
  | 'serial'
  | 'web-serial'
  | 'j2534-passthru'
  | 'doip'
  | 'other';

export interface DebugLogEntry {
  ts: number;
  dir: 'tx' | 'rx' | 'err' | 'info';
  line: string;
}

export interface LivePidItem {
  pid: string;
  key: string;
  label: string;
  unit: string;
  value: string | number | object;
}

export interface MonitorStatus {
  mil: boolean;
  dtcCount: number;
  ignition: 'spark' | 'compression';
  monitors: { id: string; label: string; available: boolean; incomplete: boolean }[];
}

export interface LiveData {
  at: string;
  adapter: string;
  protocol: string;
  values: Record<string, string | number | object>;
  groups: Record<string, LivePidItem[]>;
  readiness: MonitorStatus | null;
  errors: { pid: string; message: string }[];
  priorityOnly: boolean;
}

export interface FreezeFrame {
  dtc: string | null;
  pids: Record<string, string | number | number[] | null>;
  errors: { pid: string; message: string }[];
}

export interface FaultModule {
  id: string;
  name: string;
  available: boolean;
  note?: string;
  confirmed: string[];
  pending: string[];
  permanent: string[];
  freezeFrame?: FreezeFrame | null;
  readiness?: MonitorStatus | null;
  errors?: { service: string; message: string }[];
}

export interface FaultsData {
  at: string;
  modules: FaultModule[];
}

export interface VehicleInfo {
  at: string;
  vin: string | null;
  calid: string | null;
  cvn: string | null;
  ecu_name: string | null;
  supportedMode09: string[];
  supportedPids: string[];
  adapter: string;
  protocol: string;
  errors: { type: string; message: string }[];
}

export interface LiveCatalogEntry {
  pid: string;
  key: string;
  group: string;
  label: string;
  unit: string;
  supported: boolean;
  priority: boolean;
}

export interface Capabilities {
  adapter: string;
  protocol: string;
  supportedPids: string[];
  supportedMode09: string[];
  liveCatalog: LiveCatalogEntry[];
  adapterKind: AdapterKind;
}

export interface PortInfo {
  path: string;
  manufacturer: string | null;
  serialNumber: string | null;
  vendorId: string | null;
  productId: string | null;
  transport: TransportKind;
  hint: string | null;
  score: number;
  ignore: boolean;
}

export interface ObdStatus {
  connected: boolean;
  path: string | null;
  baudRate: number | null;
  transport: TransportKind | null;
  adapter: string | null;
  protocol: string | null;
  adapterKind: AdapterKind;
  experimental: boolean;
  polling: boolean;
  pollSupported: boolean;
  lastLive: LiveData | null;
  lastFaults: FaultsData | null;
  lastVehicle: VehicleInfo | null;
  capabilities: Capabilities | null;
  platform: string;
}

export interface ConnectOptions {
  /** ELM327 serial port (COMx / /dev/cu.*). Optional for VAS when dllPath/host set. */
  port?: string;
  baudRate?: number;
  adapter?: AdapterKind;
  /** Required true when adapter is vas6154. */
  experimental?: boolean;
  /** VAS: passthru | doip | auto */
  mode?: 'passthru' | 'doip' | 'auto';
  dllPath?: string;
  host?: string;
  doipPort?: number;
  protocol?: string | number;
  sourceAddress?: number;
  targetAddress?: number;
  readDids?: boolean;
}

export type Vas6154Mode = NonNullable<ConnectOptions['mode']>;

export type Vas6154Options = Pick<
  ConnectOptions,
  | 'mode'
  | 'dllPath'
  | 'host'
  | 'doipPort'
  | 'protocol'
  | 'baudRate'
  | 'sourceAddress'
  | 'targetAddress'
  | 'readDids'
> & { path?: string };

export interface Snapshot {
  at: string;
  adapter: string;
  protocol: string;
  live: LiveData;
  faults: FaultsData;
  vehicle: VehicleInfo;
  pids: Record<string, string | number | object | undefined>;
  dtcs: string[];
  errors: { pid: string; message: string }[];
}

/** Low-level byte pipe used by Elm327 (Node serialport or Web Serial). */
export interface ByteTransport {
  readonly path: string;
  open(): Promise<void>;
  close(): Promise<void>;
  write(line: string): Promise<void>;
  onData(cb: (chunk: string) => void): void;
  offData(cb: (chunk: string) => void): void;
  onError(cb: (err: Error) => void): void;
  offError(cb: (err: Error) => void): void;
  isOpen(): boolean;
  setMaxListeners?(n: number): void;
}

/** High-level adapter contract shared by ELM and VAS stubs. */
export interface ObdAdapter {
  readonly kind: AdapterKind;
  readonly path: string;
  readonly baudRate: number;
  adapterInfo: string;
  protocol: string;
  lastLive: LiveData | null;
  lastFaults: FaultsData | null;
  lastVehicle: VehicleInfo | null;
  isOpen(): boolean;
  open(): Promise<void>;
  close(): Promise<void>;
  getDebugLog(): DebugLogEntry[];
  getCapabilities(): Capabilities;
  readLive(opts?: { priorityOnly?: boolean }): Promise<LiveData>;
  readFaults(): Promise<FaultsData>;
  readVehicleInfo(): Promise<VehicleInfo>;
  snapshot(): Promise<Snapshot>;
}

/** Client API used by Track UI transports (HTTP / IPC / Web Serial). */
export interface ObdClient {
  health(): Promise<{
    ok: boolean;
    connected: boolean;
    port: string | null;
    baud: number | null;
    platform: string;
    transports: string[];
    note?: string;
    shell?: string;
  }>;
  listPorts(): Promise<{ platform: string; ports: PortInfo[] }>;
  connect(opts: ConnectOptions): Promise<{ ok: boolean; status: ObdStatus }>;
  disconnect(): Promise<{ ok: boolean }>;
  status(): Promise<ObdStatus>;
  capabilities(): Promise<Capabilities>;
  getLive(): Promise<LiveData | null>;
  refreshLive(opts?: { priorityOnly?: boolean }): Promise<LiveData>;
  getFaults(): Promise<FaultsData | null>;
  refreshFaults(): Promise<FaultsData>;
  getVehicle(): Promise<VehicleInfo | null>;
  refreshVehicle(): Promise<VehicleInfo>;
  pollStart(intervalMs?: number): Promise<{ ok: boolean; intervalMs: number }>;
  pollStop(): Promise<{ ok: boolean }>;
  debug(): Promise<{
    platform: string;
    log: DebugLogEntry[];
    lastLive: LiveData | null;
    lastFaults: FaultsData | null;
    lastVehicle: VehicleInfo | null;
    capabilities: Capabilities | null;
  }>;
  /** Bridge-only: Windows J2534 registry. Optional on other transports. */
  listJ2534?(): Promise<{
    platform: string;
    supported: boolean;
    devices: { name: string; vendor?: string; dllPath: string }[];
    note?: string;
  }>;
  /** Bridge-only: UDP DoIP discovery. Optional on other transports. */
  discoverDoip?(opts?: { timeoutMs?: number; port?: number }): Promise<{
    found: { address: string; [k: string]: unknown }[];
  }>;
}
