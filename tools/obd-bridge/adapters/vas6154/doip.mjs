/**
 * Minimal DoIP (ISO 13400) client — TCP routing activation + raw UDS dump.
 *
 * Assumptions for lab:
 * - VAS 6154 (or vehicle gateway) reachable at host:13400 (TCP)
 * - UDP vehicle discovery optional (port 13400)
 * - Payload after DoIP header is raw ISO-TP / UDS bytes we log hex-encoded
 *
 * Not a full DoIP stack (no TLS, no entity status machine productization).
 */

import dgram from 'node:dgram';
import net from 'node:net';

const DOIP_TCP_DEFAULT = 13400;
const DOIP_UDP_DEFAULT = 13400;

/** DoIP payload types (ISO 13400-2) */
export const DOIP_TYPE = {
  GENERIC_NACK: 0x0000,
  VEHICLE_ID_REQ: 0x0001,
  VEHICLE_ID_REQ_EID: 0x0002,
  VEHICLE_ID_REQ_VIN: 0x0003,
  VEHICLE_ID_RES: 0x0004,
  ROUTING_ACTIVATION_REQ: 0x0005,
  ROUTING_ACTIVATION_RES: 0x0006,
  ALIVE_CHECK_REQ: 0x0007,
  ALIVE_CHECK_RES: 0x0008,
  DOIP_ENTITY_STATUS_REQ: 0x4001,
  DOIP_ENTITY_STATUS_RES: 0x4002,
  DIAGNOSTIC_MESSAGE: 0x8001,
  DIAGNOSTIC_MESSAGE_ACK: 0x8002,
  DIAGNOSTIC_MESSAGE_NACK: 0x8003,
};

/**
 * @param {number} payloadType
 * @param {Buffer} payload
 */
export function buildDoipFrame(payloadType, payload = Buffer.alloc(0)) {
  const header = Buffer.alloc(8);
  header.writeUInt8(0x02, 0); // protocol version
  header.writeUInt8(0xfd, 1); // inverse
  header.writeUInt16BE(payloadType & 0xffff, 2);
  header.writeUInt32BE(payload.length, 4);
  return Buffer.concat([header, payload]);
}

/**
 * @param {Buffer} buf
 * @returns {{ version: number, payloadType: number, payload: Buffer, consumed: number } | null}
 */
export function parseDoipFrame(buf) {
  if (buf.length < 8) return null;
  const version = buf.readUInt8(0);
  const payloadType = buf.readUInt16BE(2);
  const len = buf.readUInt32BE(4);
  if (buf.length < 8 + len) return null;
  return {
    version,
    payloadType,
    payload: buf.subarray(8, 8 + len),
    consumed: 8 + len,
  };
}

/**
 * UDP vehicle identification broadcast (best-effort).
 * @param {{ timeoutMs?: number, port?: number, log?: Function }} [opts]
 */
export function discoverDoipVehicles(opts = {}) {
  const timeoutMs = opts.timeoutMs ?? 2000;
  const port = opts.port ?? DOIP_UDP_DEFAULT;
  const log = opts.log || (() => {});

  return new Promise((resolve) => {
    const sock = dgram.createSocket('udp4');
    /** @type {object[]} */
    const found = [];

    sock.on('message', (msg, rinfo) => {
      const frame = parseDoipFrame(msg);
      if (!frame) {
        log('rx', `UDP ${rinfo.address}:${rinfo.port} raw=${msg.toString('hex')}`);
        return;
      }
      log(
        'rx',
        `UDP DoIP type=0x${frame.payloadType.toString(16)} from ${rinfo.address} payload=${frame.payload.toString('hex')}`,
      );
      if (frame.payloadType === DOIP_TYPE.VEHICLE_ID_RES && frame.payload.length >= 17) {
        const vin = frame.payload.subarray(0, 17).toString('ascii').replace(/\0/g, '').trim();
        const logicalAddress =
          frame.payload.length >= 19 ? frame.payload.readUInt16BE(17) : null;
        found.push({
          address: rinfo.address,
          port: rinfo.port,
          vin: vin || null,
          logicalAddress,
          rawHex: frame.payload.toString('hex'),
        });
      }
    });

    sock.on('error', (e) => {
      log('err', `UDP discover: ${e.message}`);
      try {
        sock.close();
      } catch {
        /* ignore */
      }
      resolve(found);
    });

    sock.bind(() => {
      try {
        sock.setBroadcast(true);
      } catch {
        /* ignore */
      }
      const req = buildDoipFrame(DOIP_TYPE.VEHICLE_ID_REQ);
      log('tx', `UDP broadcast VehicleIdentificationRequest → :${port}`);
      sock.send(req, port, '255.255.255.255');
      // Also try link-local style — some VCIs answer unicast only after directed probe
      setTimeout(() => {
        try {
          sock.close();
        } catch {
          /* ignore */
        }
        resolve(found);
      }, timeoutMs);
    });
  });
}

/**
 * Open TCP DoIP session: connect → routing activation → optional UDS DIDs.
 *
 * @param {{
 *   host: string,
 *   port?: number,
 *   sourceAddress?: number,
 *   targetAddress?: number,
 *   activationType?: number,
 *   log?: (dir: string, line: string) => void,
 * }} opts
 */
export async function openDoipSession(opts) {
  const host = String(opts.host || '').trim();
  if (!host) throw new Error('DoIP requires host (VAS Wi‑Fi IP or vehicle gateway)');
  const port = Number(opts.port || DOIP_TCP_DEFAULT);
  const sourceAddress = Number(opts.sourceAddress ?? 0x0e00); // typical tester
  const targetAddress = Number(opts.targetAddress ?? 0x0000); // often 0 for activation
  const activationType = Number(opts.activationType ?? 0x00); // default
  const log = opts.log || (() => {});

  const socket = await connectTcp(host, port, 5000);
  log('info', `DoIP TCP connected ${host}:${port}`);

  let rxBuf = Buffer.alloc(0);
  /** @type {((f: object) => void)[]} */
  const waiters = [];

  socket.on('data', (chunk) => {
    rxBuf = Buffer.concat([rxBuf, chunk]);
    log('rx', `TCP raw +${chunk.length}B hex=${chunk.toString('hex')}`);
    while (true) {
      const frame = parseDoipFrame(rxBuf);
      if (!frame) break;
      rxBuf = rxBuf.subarray(frame.consumed);
      log(
        'rx',
        `DoIP type=0x${frame.payloadType.toString(16)} len=${frame.payload.length} payload=${frame.payload.toString('hex')}`,
      );
      const w = waiters.shift();
      if (w) w(frame);
    }
  });

  socket.on('error', (e) => log('err', `DoIP TCP error: ${e.message}`));
  socket.on('close', () => log('info', 'DoIP TCP closed'));

  function waitFrame(timeoutMs = 3000) {
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => {
        const i = waiters.indexOf(resolve);
        if (i >= 0) waiters.splice(i, 1);
        reject(new Error('DoIP frame timeout'));
      }, timeoutMs);
      waiters.push((frame) => {
        clearTimeout(t);
        resolve(frame);
      });
    });
  }

  function send(payloadType, payload) {
    const frame = buildDoipFrame(payloadType, payload);
    log('tx', `DoIP type=0x${payloadType.toString(16)} hex=${frame.toString('hex')}`);
    socket.write(frame);
  }

  // Routing activation request: SA (2) + activation type (1) + reserved (4) = 7 bytes min
  const actPayload = Buffer.alloc(7);
  actPayload.writeUInt16BE(sourceAddress & 0xffff, 0);
  actPayload.writeUInt8(activationType & 0xff, 2);
  // bytes 3-6 reserved 0
  send(DOIP_TYPE.ROUTING_ACTIVATION_REQ, actPayload);

  let activation = null;
  try {
    const res = await waitFrame(4000);
    if (res.payloadType === DOIP_TYPE.ROUTING_ACTIVATION_RES) {
      activation = {
        ok: res.payload.length >= 5 ? res.payload.readUInt8(4) === 0x10 : false,
        rawHex: res.payload.toString('hex'),
      };
      log('info', `Routing activation response: ${JSON.stringify(activation)}`);
    } else {
      log('err', `Unexpected DoIP type after activation: 0x${res.payloadType.toString(16)}`);
    }
  } catch (e) {
    log('err', e.message);
  }

  /**
   * Send diagnostic message (UDS) and wait for response / ACK.
   * @param {number[]} udsBytes
   * @param {number} [ta]
   */
  async function diagnostic(udsBytes, ta = targetAddress || 0x0001) {
    const payload = Buffer.alloc(4 + udsBytes.length);
    payload.writeUInt16BE(sourceAddress & 0xffff, 0);
    payload.writeUInt16BE(ta & 0xffff, 2);
    Buffer.from(udsBytes).copy(payload, 4);
    send(DOIP_TYPE.DIAGNOSTIC_MESSAGE, payload);
    const frames = [];
    // Collect ACK + diagnostic response (best-effort, 2 frames / 2.5s)
    const deadline = Date.now() + 2500;
    while (Date.now() < deadline && frames.length < 3) {
      try {
        const f = await waitFrame(Math.max(50, deadline - Date.now()));
        frames.push(f);
        if (f.payloadType === DOIP_TYPE.DIAGNOSTIC_MESSAGE) break;
      } catch {
        break;
      }
    }
    return frames;
  }

  return {
    host,
    port,
    sourceAddress,
    targetAddress,
    activation,
    diagnostic,
    /**
     * Drain any pending TCP data into the log (no parse wait).
     * @param {number} [ms]
     */
    async listen(ms = 500) {
      await sleep(ms);
    },
    close() {
      try {
        socket.destroy();
      } catch {
        /* ignore */
      }
    },
  };
}

function connectTcp(host, port, timeoutMs) {
  return new Promise((resolve, reject) => {
    const s = net.connect({ host, port }, () => {
      clearTimeout(t);
      resolve(s);
    });
    const t = setTimeout(() => {
      s.destroy();
      reject(new Error(`DoIP TCP connect timeout ${host}:${port}`));
    }, timeoutMs);
    s.on('error', (e) => {
      clearTimeout(t);
      reject(e);
    });
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
