import type { AdapterKind, ByteTransport, ConnectOptions, ObdAdapter } from './types';
import { Elm327 } from './elm327';

export interface CreateAdapterOptions {
  kind?: AdapterKind;
  path?: string;
  baudRate?: number;
  transport?: ByteTransport;
  /** Factory for Node serialport when transport is omitted. */
  createSerialTransport?: (path: string, baudRate: number) => Promise<ByteTransport>;
}

/** Factory for OBD adapters — ELM327 only (USB / BT Classic serial). */
export async function createAdapter(opts: CreateAdapterOptions): Promise<ObdAdapter> {
  const kind = opts.kind ?? 'elm327';
  if (kind !== 'elm327') {
    throw new Error(`Unknown adapter "${kind}". Only elm327 is supported.`);
  }

  const port = String(opts.path || '').trim();
  if (!port) throw new Error('ELM327 requires path/port');

  let transport = opts.transport;
  if (!transport) {
    if (!opts.createSerialTransport) {
      throw new Error('ELM327 requires a ByteTransport or createSerialTransport');
    }
    transport = await opts.createSerialTransport(port, opts.baudRate ?? 38400);
  }
  return new Elm327(transport, opts.baudRate ?? 38400);
}

export function connectOptionsToCreate(opts: ConnectOptions): CreateAdapterOptions {
  return {
    kind: opts.adapter ?? 'elm327',
    path: opts.port,
    baudRate: opts.baudRate,
  };
}
