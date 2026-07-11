/** Node-only OBD host (serialport). Used by bridge + Electron — not by the browser bundle. */

export { ObdHost } from './host';
export { NodeSerialTransport, createNodeSerialTransport, listSerialPorts } from './node-serial';
export * from './index';
