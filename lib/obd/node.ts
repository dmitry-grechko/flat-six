/** Node-only OBD host (serialport). Used by bridge + Electron — not by the browser bundle. */

export { ObdHost } from './host';
export { NodeSerialTransport, createNodeSerialTransport, listSerialPorts } from './node-serial';
export { Vas6154Adapter } from './vas6154-node';
export type { Vas6154Mode, Vas6154Options } from './vas6154-node';
export * from './index';
