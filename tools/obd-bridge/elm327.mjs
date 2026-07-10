/**
 * Minimal ELM327 client for Mode 01 PIDs + Mode 03 DTCs.
 * Enough for local MVP validation — not production-hardened.
 */

const PROMPT = '>';

export class Elm327 {
  /** @type {import('serialport').SerialPort | null} */
  #port = null;
  /** @type {{ ts: number; dir: 'tx' | 'rx' | 'err'; line: string }[]} */
  #log = [];
  #maxLog = 200;

  constructor(path, baudRate = 38400) {
    this.path = path;
    this.baudRate = baudRate;
    this.adapterInfo = '';
    this.protocol = '';
  }

  #push(dir, line) {
    this.#log.push({ ts: Date.now(), dir, line });
    if (this.#log.length > this.#maxLog) this.#log.shift();
  }

  getDebugLog() {
    return [...this.#log];
  }

  isOpen() {
    return this.#port?.isOpen === true;
  }

  async open() {
    const { SerialPort } = await import('serialport');
    if (this.#port?.isOpen) await this.close();

    this.#port = new SerialPort({
      path: this.path,
      baudRate: this.baudRate,
      autoOpen: false,
    });

    await new Promise((resolve, reject) => {
      this.#port.open((err) => (err ? reject(err) : resolve()));
    });

    // ELM327 needs a beat after open (especially Bluetooth SPP).
    await sleep(400);
    await this.init();
  }

  async close() {
    if (!this.#port) return;
    const p = this.#port;
    this.#port = null;
    await new Promise((resolve) => {
      if (!p.isOpen) return resolve();
      p.close(() => resolve());
    });
  }

  async init() {
    await this.command('ATZ', 3000);
    await sleep(300);
    await this.command('ATE0');
    await this.command('ATL0');
    await this.command('ATS0');
    await this.command('ATH0');
    await this.command('ATSP0'); // auto protocol
    this.adapterInfo = (await this.command('ATI')).trim();
    try {
      this.protocol = (await this.command('ATDPN')).trim();
    } catch {
      this.protocol = (await this.command('ATDP')).trim();
    }
  }

  /**
   * Send AT or OBD command; returns cleaned response body (no prompts).
   */
  async command(cmd, timeoutMs = 2500) {
    if (!this.#port?.isOpen) throw new Error('Serial port not open');
    const line = cmd.trim();
    this.#push('tx', line);

    return new Promise((resolve, reject) => {
      let buf = '';
      const timer = setTimeout(() => {
        cleanup();
        this.#push('err', `TIMEOUT ${line}`);
        reject(new Error(`Timeout waiting for response to: ${line}`));
      }, timeoutMs);

      const onData = (chunk) => {
        buf += chunk.toString('utf8').replace(/\r/g, '\n');
        // ELM ends with '>' prompt when ready
        if (buf.includes(PROMPT) || buf.includes('ERROR') || buf.includes('UNABLE TO CONNECT')) {
          cleanup();
          const out = cleanElmResponse(buf);
          this.#push('rx', out || buf.trim());
          if (/UNABLE TO CONNECT/i.test(out)) {
            reject(new Error('ELM327: UNABLE TO CONNECT — ignition on? Dongle seated?'));
            return;
          }
          if (/^ERROR/i.test(out)) {
            reject(new Error(`ELM327 error: ${out}`));
            return;
          }
          resolve(out);
        }
      };

      const onErr = (err) => {
        cleanup();
        this.#push('err', err.message);
        reject(err);
      };

      const cleanup = () => {
        clearTimeout(timer);
        this.#port?.off('data', onData);
        this.#port?.off('error', onErr);
      };

      this.#port.on('data', onData);
      this.#port.on('error', onErr);
      this.#port.write(`${line}\r`, (err) => {
        if (err) {
          cleanup();
          reject(err);
        }
      });
    });
  }

  async readPid(hexPid) {
    const pid = hexPid.toUpperCase().replace(/^0x/, '');
    const raw = await this.command(`01${pid}`);
    return parsePid01(raw, pid);
  }

  async readDtcs() {
    const raw = await this.command('03', 4000);
    return parseDtcs(raw);
  }

  async snapshot() {
    const out = {
      at: new Date().toISOString(),
      adapter: this.adapterInfo,
      protocol: this.protocol,
      pids: {},
      dtcs: [],
      errors: [],
    };

    const pids = [
      ['0C', 'rpm'],
      ['05', 'coolant_c'],
      ['0D', 'speed_kmh'],
      ['42', 'voltage_v'],
      ['04', 'engine_load_pct'],
    ];

    for (const [pid, key] of pids) {
      try {
        const v = await this.readPid(pid);
        if (v != null) out.pids[key] = v;
      } catch (e) {
        out.errors.push({ pid, message: e.message });
      }
    }

    try {
      out.dtcs = await this.readDtcs();
    } catch (e) {
      out.errors.push({ pid: '03', message: e.message });
    }

    return out;
  }
}

function cleanElmResponse(buf) {
  return buf
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && l !== PROMPT && !/^SEARCHING/i.test(l))
    .join('\n')
    .replace(/>$/g, '')
    .trim();
}

function parsePid01(raw, pid) {
  const hex = raw.replace(/\s+/g, '').toUpperCase();
  // 41 0C 0B F0 ...
  const marker = `410${pid.toUpperCase()}`;
  const idx = hex.indexOf(marker);
  if (idx < 0) {
    if (/NO DATA|NODATA/i.test(raw)) return null;
    throw new Error(`Unexpected PID response for ${pid}: ${raw}`);
  }
  const data = hex.slice(idx + marker.length);
  const bytes = data.match(/.{1,2}/g)?.map((b) => parseInt(b, 16)) ?? [];
  if (!bytes.length) return null;

  switch (pid.toUpperCase()) {
    case '0C': // RPM
      return Math.round(((bytes[0] * 256) + (bytes[1] ?? 0)) / 4);
    case '05': // Coolant °C
      return bytes[0] - 40;
    case '0D': // km/h
      return bytes[0];
    case '42': // Control module voltage
      return Math.round(((bytes[0] * 256) + (bytes[1] ?? 0)) / 1000 * 100) / 100;
    case '04': // Engine load %
      return Math.round((bytes[0] * 100) / 255);
    default:
      return bytes;
  }
}

function parseDtcs(raw) {
  const hex = raw.replace(/\s+/g, '').toUpperCase();
  const idx = hex.indexOf('43');
  if (idx < 0) {
    if (/NO DATA|NODATA/i.test(raw)) return [];
    return [];
  }
  const body = hex.slice(idx + 2);
  const count = parseInt(body.slice(0, 2), 16);
  const codes = [];
  let pos = 2;
  for (let i = 0; i < count && pos + 4 <= body.length; i++) {
    const a = parseInt(body.slice(pos, pos + 2), 16);
    const b = parseInt(body.slice(pos + 2, pos + 4), 16);
    pos += 4;
    codes.push(decodeDtc(a, b));
  }
  return codes;
}

function decodeDtc(a, b) {
  const ch = ['P', 'C', 'B', 'U'][(a >> 6) & 3];
  const d1 = (a >> 4) & 3;
  const d2 = a & 0x0f;
  const d3 = (b >> 4) & 0x0f;
  const d4 = b & 0x0f;
  return `${ch}${d1}${d2.toString(16).toUpperCase()}${d3.toString(16).toUpperCase()}${d4.toString(16).toUpperCase()}`;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
