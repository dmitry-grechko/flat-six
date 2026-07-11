/**
 * Windows J2534 PassThru discovery + optional FFI session (koffi).
 *
 * Registry: HKLM\SOFTWARE\PassThruSupport.04.04 (and Wow6432Node).
 * DLL: manufacturer FunctionLibrary (I+ME Actia VAS6154 PassThru package).
 */

import { spawnSync } from 'node:child_process';

/** Common J2534-1 protocol IDs */
export const PROTOCOL = {
  J1850VPW: 0x01,
  J1850PWM: 0x02,
  ISO9141: 0x03,
  ISO14230: 0x04,
  CAN: 0x05,
  ISO15765: 0x06,
  SCI_A_ENGINE: 0x07,
  SCI_A_TRANS: 0x08,
  SCI_B_ENGINE: 0x09,
  SCI_B_TRANS: 0x0a,
  /** Vendor / J2534-2 style DoIP — not universal; Actia may use a different id */
  ISO13400: 0x0e00,
};

const STATUS_NOERROR = 0;

/**
 * Discover installed PassThru devices via Windows registry (PowerShell).
 * @returns {{ name: string, vendor: string, dllPath: string, key: string }[]}
 */
export function listPassThruDevices() {
  if (process.platform !== 'win32') return [];

  const script = `
$ErrorActionPreference = 'SilentlyContinue'
$roots = @(
  'HKLM:\\SOFTWARE\\PassThruSupport.04.04',
  'HKLM:\\SOFTWARE\\WOW6432Node\\PassThruSupport.04.04',
  'HKLM:\\SOFTWARE\\PassThruSupport.04.05',
  'HKLM:\\SOFTWARE\\WOW6432Node\\PassThruSupport.04.05'
)
$out = @()
foreach ($root in $roots) {
  if (-not (Test-Path $root)) { continue }
  Get-ChildItem $root | ForEach-Object {
    $p = Get-ItemProperty $_.PSPath
    $dll = $p.FunctionLibrary
    if (-not $dll) { $dll = $p.'FunctionLibrary' }
    $name = $p.Name; if (-not $name) { $name = $_.PSChildName }
    $vendor = $p.Vendor; if (-not $vendor) { $vendor = '' }
    if ($dll) {
      $out += [pscustomobject]@{
        name = [string]$name
        vendor = [string]$vendor
        dllPath = [string]$dll
        key = [string]$_.PSChildName
      }
    }
  }
}
$out | ConvertTo-Json -Compress
`;

  const r = spawnSync(
    'powershell.exe',
    ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script],
    { encoding: 'utf8', windowsHide: true, timeout: 15000 },
  );

  if (r.status !== 0 || !r.stdout?.trim()) return [];
  try {
    const parsed = JSON.parse(r.stdout.trim());
    const list = Array.isArray(parsed) ? parsed : [parsed];
    return list
      .filter((d) => d?.dllPath)
      .map((d) => ({
        name: String(d.name || 'PassThru'),
        vendor: String(d.vendor || ''),
        dllPath: String(d.dllPath),
        key: String(d.key || ''),
      }));
  } catch {
    return [];
  }
}

/**
 * Prefer VAS / Actia entries when present.
 * @param {{ name: string, vendor: string, dllPath: string }[]} devices
 */
export function pickVasDevice(devices) {
  const blob = (d) => `${d.name} ${d.vendor} ${d.dllPath}`.toLowerCase();
  return (
    devices.find((d) => /vas\s*6154|vas6154|actia/.test(blob(d))) ||
    devices.find((d) => /vas|pass.?thru/.test(blob(d))) ||
    devices[0] ||
    null
  );
}

/**
 * Open a PassThru channel and expose raw read/write + close.
 * Requires optional dependency `koffi` (installed with tools/obd-bridge).
 *
 * @param {{
 *   dllPath: string,
 *   protocolId?: number,
 *   baudRate?: number,
 *   log?: (dir: string, line: string) => void,
 * }} opts
 */
export async function openPassThruSession(opts) {
  const dllPath = String(opts.dllPath || '').trim();
  if (!dllPath) throw new Error('PassThru requires dllPath (FunctionLibrary from registry)');
  if (process.platform !== 'win32') {
    throw new Error('J2534 PassThru is Windows-only in this bridge');
  }

  let koffi;
  try {
    koffi = await import('koffi');
  } catch {
    throw new Error(
      'PassThru needs the koffi package. In tools/obd-bridge run: npm install koffi',
    );
  }

  const lib = koffi.load(dllPath);
  const log = opts.log || (() => {});

  // PASSTHRU_MSG — classic J2534-1 layout (4128-byte Data)
  const PassThruMsg = koffi.struct('PASSTHRU_MSG', {
    ProtocolID: 'uint32',
    RxStatus: 'uint32',
    TxFlags: 'uint32',
    Timestamp: 'uint32',
    DataSize: 'uint32',
    ExtraDataIndex: 'uint32',
    Data: koffi.array('uint8', 4128),
  });

  const PassThruOpen = lib.func('long __stdcall PassThruOpen(void *pName, _Out_ uint32 *pDeviceID)');
  const PassThruClose = lib.func('long __stdcall PassThruClose(uint32 DeviceID)');
  const PassThruConnect = lib.func(
    'long __stdcall PassThruConnect(uint32 DeviceID, uint32 ProtocolID, uint32 Flags, uint32 BaudRate, _Out_ uint32 *pChannelID)',
  );
  const PassThruDisconnect = lib.func('long __stdcall PassThruDisconnect(uint32 ChannelID)');
  const PassThruReadMsgs = lib.func(
    'long __stdcall PassThruReadMsgs(uint32 ChannelID, _Inout_ void *pMsg, _Inout_ uint32 *pNumMsgs, uint32 Timeout)',
  );
  const PassThruWriteMsgs = lib.func(
    'long __stdcall PassThruWriteMsgs(uint32 ChannelID, _Inout_ void *pMsg, _Inout_ uint32 *pNumMsgs, uint32 Timeout)',
  );
  const PassThruStartMsgFilter = lib.func(
    'long __stdcall PassThruStartMsgFilter(uint32 ChannelID, uint32 FilterType, void *pMaskMsg, void *pPatternMsg, void *pFlowControlMsg, _Out_ uint32 *pFilterID)',
  );
  const PassThruGetLastError = lib.func('long __stdcall PassThruGetLastError(_Out_ char *pErrorDescription)');

  const deviceId = [0];
  let rc = PassThruOpen(null, deviceId);
  if (rc !== STATUS_NOERROR) {
    throw new Error(`PassThruOpen failed (${rc}): ${getLastError(PassThruGetLastError)}`);
  }
  log('info', `PassThruOpen ok deviceId=${deviceId[0]} dll=${dllPath}`);

  const protocolId = Number(opts.protocolId ?? PROTOCOL.ISO15765);
  const baudRate = Number(opts.baudRate || 500000);
  const channelId = [0];
  rc = PassThruConnect(deviceId[0], protocolId, 0, baudRate, channelId);
  if (rc !== STATUS_NOERROR) {
    PassThruClose(deviceId[0]);
    throw new Error(
      `PassThruConnect failed (${rc}) protocol=0x${protocolId.toString(16)} baud=${baudRate}: ${getLastError(PassThruGetLastError)}`,
    );
  }
  log(
    'info',
    `PassThruConnect ok channelId=${channelId[0]} protocol=0x${protocolId.toString(16)} baud=${baudRate}`,
  );

  // PASS_FILTER (1) — accept all (mask/pattern zeros) so raw RX shows up
  try {
    const mask = {
      ProtocolID: protocolId,
      RxStatus: 0,
      TxFlags: 0,
      Timestamp: 0,
      DataSize: 4,
      ExtraDataIndex: 0,
      Data: new Array(4128).fill(0),
    };
    const pattern = { ...mask, Data: new Array(4128).fill(0) };
    const filterId = [0];
    const frc = PassThruStartMsgFilter(channelId[0], 1, mask, pattern, null, filterId);
    if (frc === STATUS_NOERROR) {
      log('info', `PassThruStartMsgFilter PASS_FILTER id=${filterId[0]}`);
    } else {
      log('err', `PassThruStartMsgFilter rc=${frc} (continuing without filter)`);
    }
  } catch (e) {
    log('err', `Filter setup skipped: ${e.message}`);
  }

  const msgSize = koffi.sizeof(PassThruMsg);

  return {
    deviceId: deviceId[0],
    channelId: channelId[0],
    protocolId,
    baudRate,
    dllPath,

    /**
     * @param {number[]} bytes
     * @param {number} [txFlags]
     */
    write(bytes, txFlags = 0) {
      const data = new Array(4128).fill(0);
      for (let i = 0; i < bytes.length && i < 4128; i++) data[i] = bytes[i] & 0xff;
      const msg = {
        ProtocolID: protocolId,
        RxStatus: 0,
        TxFlags: txFlags,
        Timestamp: 0,
        DataSize: bytes.length,
        ExtraDataIndex: 0,
        Data: data,
      };
      const num = [1];
      const buf = koffi.alloc(PassThruMsg, 1);
      koffi.encode(buf, PassThruMsg, msg);
      const wrc = PassThruWriteMsgs(channelId[0], buf, num, 1000);
      const hex = bytes.map((b) => b.toString(16).padStart(2, '0')).join(' ');
      if (wrc !== STATUS_NOERROR) {
        log('err', `PassThruWriteMsgs rc=${wrc} tx=${hex}`);
        throw new Error(`PassThruWriteMsgs failed (${wrc}): ${getLastError(PassThruGetLastError)}`);
      }
      log('tx', hex);
      return true;
    },

    /**
     * @param {number} [timeoutMs]
     * @param {number} [maxMsgs]
     * @returns {{ hex: string, data: number[], rxStatus: number, timestamp: number }[]}
     */
    read(timeoutMs = 200, maxMsgs = 8) {
      const num = [maxMsgs];
      const buf = koffi.alloc(PassThruMsg, maxMsgs);
      const rrc = PassThruReadMsgs(channelId[0], buf, num, timeoutMs);
      // ERR_BUFFER_EMPTY / timeout-ish codes vary; treat no-error + 0 msgs as empty
      if (rrc !== STATUS_NOERROR && num[0] === 0) {
        // 0x10 often ERR_BUFFER_EMPTY — not fatal
        if (rrc !== 0x10 && rrc !== 9) {
          log('err', `PassThruReadMsgs rc=${rrc}`);
        }
        return [];
      }
      const out = [];
      const count = Math.min(num[0], maxMsgs);
      for (let i = 0; i < count; i++) {
        const msg = koffi.decode(buf, i * msgSize, PassThruMsg);
        const size = Math.min(msg.DataSize || 0, 4128);
        const data = [];
        for (let j = 0; j < size; j++) data.push(msg.Data[j] & 0xff);
        const hex = data.map((b) => b.toString(16).padStart(2, '0')).join(' ');
        log('rx', hex || `(empty DataSize=${msg.DataSize})`);
        out.push({
          hex,
          data,
          rxStatus: msg.RxStatus,
          timestamp: msg.Timestamp,
        });
      }
      return out;
    },

    close() {
      try {
        PassThruDisconnect(channelId[0]);
        log('info', 'PassThruDisconnect ok');
      } catch {
        /* ignore */
      }
      try {
        PassThruClose(deviceId[0]);
        log('info', 'PassThruClose ok');
      } catch {
        /* ignore */
      }
    },
  };
}

function getLastError(fn) {
  try {
    const buf = Buffer.alloc(256);
    fn(buf);
    const s = buf.toString('utf8').replace(/\0.*$/, '').trim();
    return s || '(no error string)';
  } catch {
    return '(PassThruGetLastError unavailable)';
  }
}

/**
 * Resolve protocol name from UI → numeric id.
 * @param {string | number} nameOrId
 */
export function resolveProtocolId(nameOrId) {
  if (typeof nameOrId === 'number' && Number.isFinite(nameOrId)) return nameOrId;
  const key = String(nameOrId || 'ISO15765').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (PROTOCOL[key] != null) return PROTOCOL[key];
  if (key === 'DOIP' || key === 'ISO13400' || key === 'ISO13400PS') return PROTOCOL.ISO13400;
  const n = Number(nameOrId);
  if (Number.isFinite(n)) return n;
  return PROTOCOL.ISO15765;
}
