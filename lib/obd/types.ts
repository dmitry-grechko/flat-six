/** Shared OBD read-model types for bridge, Desktop Electron, and Live OBD. */

export type AdapterKind = 'elm327';

export type TransportKind = 'usb' | 'bluetooth-classic' | 'serial' | 'web-serial' | 'other';

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

/** One on-board monitor test result (Mode 06 / Service $06). */
export interface Mode06Test {
  mid: string; // OBDMID, e.g. "01"
  tid: string; // standardized test id, e.g. "85"
  uasid: string; // unit-and-scaling id
  monitor: string; // human label for the MID (best-effort; raw when unknown)
  value: number;
  min: number;
  max: number;
  signed: boolean; // whether a signed interpretation was used
  /** pass = value in [min,max]; fail = out of range; unknown = limits malformed. */
  result: 'pass' | 'fail' | 'unknown';
}

export interface Mode06Data {
  at: string;
  supportedMids: string[];
  tests: Mode06Test[];
  errors: { mid: string; message: string }[];
}

/** Result of probing one non-DME module over UDS/KWP (read-only). */
export interface ModuleScanResult {
  id: string;
  name: string;
  reqId: string; // diagnostic request CAN ID used
  protocol: 'uds' | 'kwp' | 'obd';
  /** Whether the module address was pre-verified vs a candidate to confirm. */
  addressConfirmed: boolean;
  /** positive = answered data, refused = 7F negative (present), silent = nothing. */
  reachable: 'positive' | 'refused' | 'silent';
  sessionOk: boolean; // extended diagnostic session (10 03) accepted
  confirmedDtcs: string[];
  pendingDtcs: string[];
  /** For a refusal: the negative-response reason (NRC name). */
  detail?: string;
  note?: string;
  error?: string;
}

export interface ModuleScanData {
  at: string;
  generation: string;
  results: ModuleScanResult[];
  note: string;
}

/** Result of a clear-DTCs request (Mode 04 + manufacturer service 14). */
export interface ClearResult {
  at: string;
  /** Human labels of the memories that acknowledged the clear. */
  cleared: string[];
  errors: { cmd: string; message: string }[];
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
  polling: boolean;
  pollSupported: boolean;
  lastLive: LiveData | null;
  lastFaults: FaultsData | null;
  lastVehicle: VehicleInfo | null;
  capabilities: Capabilities | null;
  platform: string;
}

export interface ConnectOptions {
  /** ELM327 serial port (COMx / /dev/cu.*) or `web-serial`. */
  port?: string;
  baudRate?: number;
  adapter?: AdapterKind;
}

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

/** High-level adapter contract (ELM327 today). */
export interface ObdAdapter {
  readonly kind: AdapterKind;
  readonly path: string;
  readonly baudRate: number;
  adapterInfo: string;
  protocol: string;
  lastLive: LiveData | null;
  lastFaults: FaultsData | null;
  lastVehicle: VehicleInfo | null;
  lastMode06: Mode06Data | null;
  lastModuleScan: ModuleScanData | null;
  isOpen(): boolean;
  open(): Promise<void>;
  close(): Promise<void>;
  getDebugLog(): DebugLogEntry[];
  getCapabilities(): Capabilities;
  readLive(opts?: { priorityOnly?: boolean }): Promise<LiveData>;
  readFaults(): Promise<FaultsData>;
  readVehicleInfo(): Promise<VehicleInfo>;
  readMode06(): Promise<Mode06Data>;
  scanModules(generation: string): Promise<ModuleScanData>;
  clearFaults(generation: string): Promise<ClearResult>;
  snapshot(): Promise<Snapshot>;
}

/** Client API used by Live OBD transports (HTTP / IPC / Web Serial). */
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
  getMode06(): Promise<Mode06Data | null>;
  refreshMode06(): Promise<Mode06Data>;
  getModuleScan(): Promise<ModuleScanData | null>;
  scanModules(generation: string): Promise<ModuleScanData>;
  clearFaults(generation: string): Promise<ClearResult>;
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
}
