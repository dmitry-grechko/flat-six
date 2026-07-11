/**
 * Web Serial ELM327 transport for desktop Chrome (USB only).
 * Used by main-app Live OBD (desktop Chrome/Edge USB ELM).
 */

import { Elm327 } from './elm327';
import type {
  ByteTransport,
  ConnectOptions,
  ObdClient,
  ObdStatus,
  PortInfo,
} from './types';

class WebSerialTransport implements ByteTransport {
  readonly path: string;
  #baudRate: number;
  #port: SerialPort | null = null;
  #reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  #writer: WritableStreamDefaultWriter<Uint8Array> | null = null;
  #dataCbs = new Set<(chunk: string) => void>();
  #errCbs = new Set<(err: Error) => void>();
  #open = false;
  #decoder = new TextDecoder();

  constructor(path = 'web-serial', baudRate = 38400) {
    this.path = path;
    this.#baudRate = baudRate;
  }

  isOpen(): boolean {
    return this.#open;
  }

  async open(): Promise<void> {
    if (!webSerialAvailable()) {
      throw new Error('Web Serial not supported — use desktop Chrome (or Edge)');
    }
    // Prefer a previously granted port; otherwise prompt (must be from a user gesture).
    const existing = await navigator.serial.getPorts();
    const port = existing[0] ?? (await navigator.serial.requestPort());
    await port.open({ baudRate: this.#baudRate });
    this.#port = port;
    this.#writer = port.writable!.getWriter();
    this.#reader = port.readable!.getReader();
    this.#open = true;
    void this.#pump();
  }

  async #pump(): Promise<void> {
    try {
      while (this.#open && this.#reader) {
        const { value, done } = await this.#reader.read();
        if (done) break;
        if (value) {
          const text = this.#decoder.decode(value, { stream: true });
          for (const cb of this.#dataCbs) cb(text);
        }
      }
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      for (const cb of this.#errCbs) cb(err);
    }
  }

  async close(): Promise<void> {
    this.#open = false;
    try {
      await this.#reader?.cancel();
    } catch {
      /* ignore */
    }
    try {
      this.#writer?.releaseLock();
    } catch {
      /* ignore */
    }
    try {
      await this.#port?.close();
    } catch {
      /* ignore */
    }
    this.#reader = null;
    this.#writer = null;
    this.#port = null;
  }

  async write(line: string): Promise<void> {
    if (!this.#writer) throw new Error('Web Serial not open');
    await this.#writer.write(new TextEncoder().encode(line));
  }

  onData(cb: (chunk: string) => void): void {
    this.#dataCbs.add(cb);
  }
  offData(cb: (chunk: string) => void): void {
    this.#dataCbs.delete(cb);
  }
  onError(cb: (err: Error) => void): void {
    this.#errCbs.add(cb);
  }
  offError(cb: (err: Error) => void): void {
    this.#errCbs.delete(cb);
  }
}

/** Minimal Web Serial typings (browsers that support it). */
interface SerialPort {
  open(options: { baudRate: number }): Promise<void>;
  close(): Promise<void>;
  readable: ReadableStream<Uint8Array> | null;
  writable: WritableStream<Uint8Array> | null;
}

interface Serial {
  requestPort(options?: { filters?: { usbVendorId?: number; usbProductId?: number }[] }): Promise<SerialPort>;
  getPorts(): Promise<SerialPort[]>;
}

declare global {
  interface Navigator {
    serial: Serial;
  }
}

export function webSerialAvailable(): boolean {
  return typeof navigator !== 'undefined' && 'serial' in navigator;
}

/** In-process ObdClient over Web Serial (no local bridge). USB ELM327 only. */
export function createWebSerialClient(): ObdClient {
  let session: Elm327 | null = null;
  let polling = false;
  let pollTimer: ReturnType<typeof setTimeout> | null = null;
  let pollCancel = false;

  const status = (): ObdStatus => ({
    connected: session?.isOpen() === true,
    path: session?.path ?? null,
    baudRate: session?.baudRate ?? null,
    transport: 'web-serial',
    adapter: session?.adapterInfo ?? null,
    protocol: session?.protocol ?? null,
    adapterKind: 'elm327',
    pollSupported: true,
    polling,
    lastLive: session?.lastLive ?? null,
    lastFaults: session?.lastFaults ?? null,
    lastVehicle: session?.lastVehicle ?? null,
    capabilities: session?.isOpen() ? session.getCapabilities() : null,
    platform: typeof navigator !== 'undefined' ? navigator.platform : 'browser',
  });

  const stopPoll = () => {
    pollCancel = true;
    polling = false;
    if (pollTimer) {
      clearTimeout(pollTimer);
      pollTimer = null;
    }
  };

  return {
    async health() {
      return {
        ok: true,
        connected: session?.isOpen() === true,
        port: session?.path ?? null,
        baud: session?.baudRate ?? null,
        platform: typeof navigator !== 'undefined' ? navigator.platform : 'browser',
        transports: ['web-serial'],
        shell: 'web-serial',
        note: 'Web Serial is USB-only on desktop Chrome/Edge. Classic BT needs Electron or the local bridge.',
      };
    },

    async listPorts(): Promise<{ platform: string; ports: PortInfo[] }> {
      return {
        platform: typeof navigator !== 'undefined' ? navigator.platform : 'browser',
        ports: [
          {
            path: 'web-serial',
            manufacturer: 'Web Serial',
            serialNumber: null,
            vendorId: null,
            productId: null,
            transport: 'web-serial',
            hint: 'Click Connect — browser will prompt for USB ELM327',
            score: 100,
            ignore: false,
          },
        ],
      };
    },

    async connect(opts: ConnectOptions) {
      stopPoll();
      if (session?.isOpen()) await session.close();
      const baud = opts.baudRate ?? 38400;
      const transport = new WebSerialTransport('web-serial', baud);
      session = new Elm327(transport, baud);
      await session.open();
      return { ok: true, status: status() };
    },

    async disconnect() {
      stopPoll();
      if (session) await session.close();
      session = null;
      return { ok: true };
    },

    async status() {
      return status();
    },

    async capabilities() {
      if (!session?.isOpen()) throw new Error('Not connected');
      return session.getCapabilities();
    },

    async getLive() {
      return session?.lastLive ?? null;
    },

    async refreshLive(opts) {
      if (!session?.isOpen()) throw new Error('Not connected');
      return session.readLive(opts);
    },

    async getFaults() {
      return session?.lastFaults ?? null;
    },

    async refreshFaults() {
      if (!session?.isOpen()) throw new Error('Not connected');
      return session.readFaults();
    },

    async getVehicle() {
      return session?.lastVehicle ?? null;
    },

    async refreshVehicle() {
      if (!session?.isOpen()) throw new Error('Not connected');
      return session.readVehicleInfo();
    },

    async pollStart(intervalMs = 2000) {
      if (!session?.isOpen()) throw new Error('Not connected');
      const ms = Math.max(1500, intervalMs);
      stopPoll();
      pollCancel = false;
      polling = true;
      let tick = 0;
      const run = async () => {
        if (pollCancel || !session?.isOpen()) {
          polling = false;
          return;
        }
        try {
          tick += 1;
          await session.readLive({ priorityOnly: tick % 4 !== 0 });
        } catch (e) {
          console.error('[webserial poll]', e);
        }
        if (!pollCancel && session?.isOpen()) pollTimer = setTimeout(run, ms);
        else polling = false;
      };
      pollTimer = setTimeout(run, 0);
      return { ok: true, intervalMs: ms };
    },

    async pollStop() {
      stopPoll();
      return { ok: true };
    },

    async debug() {
      return {
        platform: typeof navigator !== 'undefined' ? navigator.platform : 'browser',
        log: session?.getDebugLog() ?? [],
        lastLive: session?.lastLive ?? null,
        lastFaults: session?.lastFaults ?? null,
        lastVehicle: session?.lastVehicle ?? null,
        capabilities: session?.isOpen() ? session.getCapabilities() : null,
      };
    },
  };
}
