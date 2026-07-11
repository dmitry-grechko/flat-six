/**
 * Node.js serialport ByteTransport for ELM327 (USB + Bluetooth Classic SPP).
 */

import type { ByteTransport } from './types';

type SerialPortLike = {
  isOpen: boolean;
  setMaxListeners: (n: number) => void;
  open: (cb: (err: Error | null) => void) => void;
  close: (cb: (err?: Error | null) => void) => void;
  write: (data: string, cb: (err: Error | null | undefined) => void) => void;
  on: (event: string, cb: (...args: unknown[]) => void) => void;
  off: (event: string, cb: (...args: unknown[]) => void) => void;
};

export class NodeSerialTransport implements ByteTransport {
  readonly path: string;
  readonly baudRate: number;
  #port: SerialPortLike | null = null;
  #dataCbs = new Set<(chunk: string) => void>();
  #errCbs = new Set<(err: Error) => void>();
  #onDataBound = (chunk: unknown) => {
    const text =
      typeof chunk === 'string'
        ? chunk
        : Buffer.isBuffer(chunk)
          ? chunk.toString('utf8')
          : String(chunk);
    for (const cb of this.#dataCbs) cb(text);
  };
  #onErrBound = (err: unknown) => {
    const e = err instanceof Error ? err : new Error(String(err));
    for (const cb of this.#errCbs) cb(e);
  };

  constructor(path: string, baudRate = 38400) {
    this.path = path;
    this.baudRate = baudRate;
  }

  setMaxListeners(n: number): void {
    this.#port?.setMaxListeners(n);
  }

  isOpen(): boolean {
    return this.#port?.isOpen === true;
  }

  async open(): Promise<void> {
    const { SerialPort } = await import('serialport');
    if (this.#port?.isOpen) await this.close();

    this.#port = new SerialPort({
      path: this.path,
      baudRate: this.baudRate,
      autoOpen: false,
    }) as unknown as SerialPortLike;

    await new Promise<void>((resolve, reject) => {
      this.#port!.open((err) => (err ? reject(err) : resolve()));
    });

    this.#port.on('data', this.#onDataBound);
    this.#port.on('error', this.#onErrBound);
  }

  async close(): Promise<void> {
    const p = this.#port;
    this.#port = null;
    if (!p) return;
    p.off('data', this.#onDataBound);
    p.off('error', this.#onErrBound);
    await new Promise<void>((resolve) => {
      if (!p.isOpen) return resolve();
      p.close(() => resolve());
    });
  }

  write(line: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.#port?.isOpen) return reject(new Error('Serial port not open'));
      this.#port.write(line, (err) => (err ? reject(err) : resolve()));
    });
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

export async function createNodeSerialTransport(path: string, baudRate: number): Promise<ByteTransport> {
  return new NodeSerialTransport(path, baudRate);
}

export async function listSerialPorts(): Promise<
  {
    path: string;
    manufacturer?: string | null;
    vendorId?: string | null;
    productId?: string | null;
    serialNumber?: string | null;
  }[]
> {
  const { SerialPort } = await import('serialport');
  return SerialPort.list();
}
