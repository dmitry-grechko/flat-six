import type { AdapterKind, ByteTransport, ConnectOptions, ObdAdapter, Vas6154Options } from './types';
import { Elm327 } from './elm327';

export interface CreateAdapterOptions {
  kind?: AdapterKind;
  path?: string;
  baudRate?: number;
  transport?: ByteTransport;
  /** Factory for Node serialport when transport is omitted (ELM only). */
  createSerialTransport?: (path: string, baudRate: number) => Promise<ByteTransport>;
  /** VAS / shared connect fields */
  experimental?: boolean;
  mode?: Vas6154Options['mode'];
  dllPath?: string;
  host?: string;
  doipPort?: number;
  protocol?: string | number;
  sourceAddress?: number;
  targetAddress?: number;
  readDids?: boolean;
}

/**
 * Factory for OBD adapters.
 * elm327 = production serial path; vas6154 = experimental PassThru/DoIP lab (Node).
 */
export async function createAdapter(opts: CreateAdapterOptions): Promise<ObdAdapter> {
  const kind = opts.kind ?? 'elm327';
  if (kind === 'vas6154') {
    if (opts.experimental !== true) {
      throw new Error(
        'VAS 6154 is experimental. Pass experimental: true to opt in (lab PassThru/DoIP only).',
      );
    }
    // Prefer ObdHost on Node (resolves vas6154-node via absolute URL). Fallback for tests:
    const urlMod = await import('node:url');
    const pathMod = await import('node:path');
    const here = pathMod.dirname(urlMod.fileURLToPath(import.meta.url));
    const href = urlMod.pathToFileURL(pathMod.join(here, 'vas6154-node.ts')).href;
    const { Vas6154Adapter } = await import(/* webpackIgnore: true */ href);
    return new Vas6154Adapter({
      path: opts.path,
      mode: opts.mode || 'auto',
      dllPath: opts.dllPath,
      host: opts.host,
      doipPort: opts.doipPort,
      protocol: opts.protocol,
      baudRate: opts.baudRate,
      sourceAddress: opts.sourceAddress,
      targetAddress: opts.targetAddress,
      readDids: opts.readDids,
    });
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

/** Map HTTP / UI connect body → CreateAdapterOptions fields. */
export function connectOptionsToCreate(opts: ConnectOptions): CreateAdapterOptions {
  return {
    kind: opts.adapter ?? 'elm327',
    path: opts.port,
    baudRate: opts.baudRate,
    experimental: opts.experimental,
    mode: opts.mode,
    dllPath: opts.dllPath,
    host: opts.host,
    doipPort: opts.doipPort,
    protocol: opts.protocol,
    sourceAddress: opts.sourceAddress,
    targetAddress: opts.targetAddress,
    readDids: opts.readDids,
  };
}
