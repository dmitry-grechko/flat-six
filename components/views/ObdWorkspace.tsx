'use client';

import { useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import Link from 'next/link';
import { useObdBridge } from '@/lib/obd/useObdBridge';
import { useVehicle } from '@/lib/vehicle-context';
import { mono, sans } from '@/components/tools/ui';
import type { AdapterKind, FaultModule, LiveData, PortInfo, VehicleInfo } from '@/lib/obd/types';
import { BetaBadge } from '@/components/shell/BetaBadge';

const TABS = [
  { id: 'connection', label: 'Connection' },
  { id: 'live', label: 'Live data' },
  { id: 'faults', label: 'Fault codes' },
  { id: 'vehicle', label: 'Vehicle info' },
  { id: 'debug', label: 'Debug' },
] as const;

type TabId = (typeof TABS)[number]['id'];
type VasMode = 'passthru' | 'doip' | 'auto';

function isLikelyMac(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Mac|iPhone|iPad/i.test(navigator.platform) || /Mac OS|Macintosh/i.test(navigator.userAgent);
}

function isLikelyWindows(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Win/i.test(navigator.platform) || /Windows/i.test(navigator.userAgent);
}

const card: CSSProperties = {
  background: '#fff',
  border: '1px solid #E3E3E5',
  borderRadius: 6,
  overflow: 'hidden',
};

const cardHead: CSSProperties = {
  margin: 0,
  padding: '14px 18px',
  font: `600 11px/1 ${mono}`,
  letterSpacing: '.14em',
  color: '#D5001C',
  borderBottom: '1px solid #F0F0F1',
  textTransform: 'uppercase',
};

const btnBase: CSSProperties = {
  height: 36,
  padding: '0 14px',
  borderRadius: 2,
  font: `600 11px/1 ${sans}`,
  letterSpacing: '.08em',
  textTransform: 'uppercase',
  cursor: 'pointer',
  border: 'none',
};

function fmt(v: unknown): string {
  if (v == null) return '—';
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : String(v);
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

export default function ObdWorkspace() {
  const { vehicle: garageVehicle } = useVehicle();
  const obd = useObdBridge();
  const [tab, setTab] = useState<TabId>('connection');
  const [port, setPort] = useState('');
  const [baud, setBaud] = useState('38400');
  const [adapterKind, setAdapterKind] = useState<AdapterKind>('elm327');
  const [experimentalOk, setExperimentalOk] = useState(false);
  const [vasMode, setVasMode] = useState<VasMode>(() => (isLikelyMac() ? 'doip' : 'passthru'));
  const [dllPath, setDllPath] = useState('');
  const [doipHost, setDoipHost] = useState('');
  const [doipPort, setDoipPort] = useState('13400');
  const [j2534, setJ2534] = useState<{ name: string; vendor?: string; dllPath: string }[]>([]);
  const [j2534Note, setJ2534Note] = useState<string | null>(null);

  const selectedPort = port || obd.ports[0]?.path || '';
  const isWebSerial = obd.mode === 'web-serial';
  const onMac = useMemo(() => isLikelyMac(), []);
  const onWindows = useMemo(() => isLikelyWindows(), []);
  const pollOk = obd.status?.pollSupported !== false && adapterKind === 'elm327';

  const vinMatch = useMemo(() => {
    const obdVin = obd.vehicleInfo?.vin?.toUpperCase();
    const garageVin = garageVehicle.vin?.replace(/\s/g, '').toUpperCase();
    if (!obdVin || !garageVin || garageVin.length < 8) return null;
    return obdVin === garageVin || obdVin.endsWith(garageVin) || garageVin.endsWith(obdVin);
  }, [obd.vehicleInfo?.vin, garageVehicle.vin]);

  async function selectAdapter(kind: AdapterKind) {
    setAdapterKind(kind);
    obd.setError(null);
    if (kind === 'vas6154' && obd.mode === 'web-serial') {
      await obd.setMode('bridge');
    }
  }

  async function refreshJ2534() {
    try {
      const fn = obd.client.listJ2534;
      if (!fn) {
        setJ2534Note('J2534 list needs the local bridge.');
        return;
      }
      const data = await fn();
      setJ2534(data.devices || []);
      setJ2534Note(data.note || null);
      if (!dllPath && data.devices?.[0]?.dllPath) setDllPath(data.devices[0].dllPath);
    } catch (e) {
      setJ2534([]);
      setJ2534Note(e instanceof Error ? e.message : String(e));
    }
  }

  async function discoverDoip() {
    try {
      const fn = obd.client.discoverDoip;
      if (!fn) {
        obd.setError('DoIP discovery needs the local bridge.');
        return;
      }
      const data = await fn({ port: Number(doipPort) || 13400 });
      const first = data.found?.[0]?.address;
      if (first) setDoipHost(first);
      else obd.setError('No DoIP hosts found — enter the VAS Wi‑Fi / RNDIS IP manually.');
    } catch (e) {
      obd.setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function handleConnect() {
    if (adapterKind === 'vas6154') {
      if (!experimentalOk) {
        obd.setError('VAS 6154 is experimental — enable the Experimental toggle to connect.');
        return;
      }
      if (isWebSerial) {
        obd.setError('VAS needs Local bridge. Switch transport and try again.');
        return;
      }
    } else if (!isWebSerial && !selectedPort) {
      obd.setError('Select a serial port first.');
      return;
    }
    try {
      await obd.connect(
        adapterKind === 'vas6154'
          ? {
              adapter: 'vas6154',
              experimental: true,
              mode: vasMode,
              dllPath: dllPath || undefined,
              host: doipHost.trim() || undefined,
              doipPort: Number(doipPort) || 13400,
              baudRate: Number(baud) || 500000,
              readDids: true,
            }
          : {
              adapter: 'elm327',
              port: isWebSerial ? 'web-serial' : selectedPort,
              baudRate: Number(baud) || 38400,
            },
      );
      setTab(adapterKind === 'vas6154' ? 'debug' : 'live');
    } catch {
      /* error already set */
    }
  }

  return (
    <div
      className="padView"
      style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 1100, padding: 28 }}
    >
      <PlatformCompatNote onMac={onMac} onWindows={onWindows} />

      {obd.needsBridge && (
        <div
          style={{
            background: '#fff',
            border: '1px solid rgba(213,0,28,.35)',
            borderRadius: 6,
            padding: '16px 18px',
            display: 'flex',
            flexWrap: 'wrap',
            gap: 12,
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ font: `600 12px/1.3 ${mono}`, letterSpacing: '.08em', color: '#D5001C', marginBottom: 6 }}>
              LOCAL OBD HELPER OFFLINE
            </div>
            <div style={{ font: `400 14px/1.5 ${sans}`, color: '#3A3A3E' }}>
              Start the serial bridge for Classic BT / VAS, or switch to <strong>Web Serial</strong> for USB ELM
              (desktop Chrome — no helper). Setup under{' '}
              <Link href="/downloads" style={{ color: '#D5001C', fontWeight: 500, textDecoration: 'none' }}>
                Downloads
              </Link>
              .
            </div>
            <code
              style={{
                display: 'inline-block',
                marginTop: 8,
                font: `500 12px/1.4 ${mono}`,
                background: '#F4F4F5',
                padding: '6px 10px',
                borderRadius: 3,
              }}
            >
              npm run obd-bridge
            </code>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {obd.webSerialOk && adapterKind === 'elm327' && (
              <button
                type="button"
                style={{ ...btnBase, background: '#D5001C', color: '#fff' }}
                onClick={() => obd.setMode('web-serial')}
              >
                Use Web Serial
              </button>
            )}
            <button
              type="button"
              style={{ ...btnBase, background: '#0B0B0C', color: '#fff' }}
              onClick={() => navigator.clipboard.writeText('npm run obd-bridge')}
            >
              Copy command
            </button>
            <button
              type="button"
              style={{ ...btnBase, background: '#fff', color: '#0B0B0C', border: '1px solid #C9C9CD' }}
              onClick={() => obd.refreshHealth()}
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Connected strip */}
      <div
        style={{
          ...card,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          alignItems: 'center',
          padding: '12px 16px',
        }}
      >
        <StatusDot on={obd.connected} label={obd.connected ? 'CONNECTED' : 'DISCONNECTED'} />
        <span style={{ font: `500 11px/1.3 ${mono}`, color: '#6E6E73' }}>
          {adapterKind === 'vas6154' ? 'VAS 6154' : 'ELM327'}
          {' · '}
          {isWebSerial ? 'Web Serial (USB)' : `Bridge${obd.health?.platform ? ` · ${obd.health.platform}` : ''}`}
        </span>
        {obd.status?.path && (
          <span style={{ font: `500 11px/1.3 ${mono}`, color: '#6E6E73' }}>
            {obd.status.path} @ {obd.status.baudRate}
            {obd.status.adapter ? ` · ${obd.status.adapter}` : ''}
            {obd.status.protocol ? ` · ${obd.status.protocol}` : ''}
          </span>
        )}
        <label
          style={{
            marginLeft: 'auto',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            cursor: obd.connected && pollOk ? 'pointer' : 'not-allowed',
            opacity: obd.connected && pollOk ? 1 : 0.45,
            font: `600 11px/1 ${mono}`,
            letterSpacing: '.08em',
            userSelect: 'none',
          }}
          title={!pollOk ? 'Live poll is ELM327-only' : undefined}
          onClick={() => {
            if (!obd.connected || obd.busy || !pollOk) return;
            obd.setPolling(!obd.polling, 2000);
          }}
        >
          <span
            style={{
              width: 44,
              height: 24,
              borderRadius: 12,
              background: obd.polling ? '#D5001C' : '#D2D2D6',
              position: 'relative',
              transition: 'background .15s',
            }}
          >
            <span
              style={{
                position: 'absolute',
                top: 3,
                left: obd.polling ? 23 : 3,
                width: 18,
                height: 18,
                borderRadius: '50%',
                background: '#fff',
                transition: 'left .15s',
              }}
            />
          </span>
          LIVE POLL
        </label>
      </div>

      {obd.error && (
        <div
          style={{
            background: 'rgba(213,0,28,.08)',
            border: '1px solid rgba(213,0,28,.25)',
            color: '#8A0011',
            borderRadius: 4,
            padding: '12px 14px',
            font: `400 14px/1.4 ${sans}`,
          }}
        >
          {obd.error}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            style={{
              height: 36,
              padding: '0 14px',
              borderRadius: 2,
              border: t.id === tab ? '1px solid #0B0B0C' : '1px solid #C9C9CD',
              background: t.id === tab ? '#0B0B0C' : '#fff',
              color: t.id === tab ? '#fff' : '#0B0B0C',
              font: `600 11px/1 ${mono}`,
              letterSpacing: '.1em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'connection' && (
        <ConnectionPanel
          obd={obd}
          port={selectedPort}
          setPort={setPort}
          baud={baud}
          setBaud={setBaud}
          adapterKind={adapterKind}
          onSelectAdapter={selectAdapter}
          experimentalOk={experimentalOk}
          setExperimentalOk={setExperimentalOk}
          vasMode={vasMode}
          setVasMode={setVasMode}
          dllPath={dllPath}
          setDllPath={setDllPath}
          doipHost={doipHost}
          setDoipHost={setDoipHost}
          doipPort={doipPort}
          setDoipPort={setDoipPort}
          j2534={j2534}
          j2534Note={j2534Note}
          onRefreshJ2534={refreshJ2534}
          onDiscoverDoip={discoverDoip}
          onMac={onMac}
          onConnect={handleConnect}
        />
      )}
      {tab === 'live' && <LivePanel live={obd.live} onRefresh={obd.refreshLive} busy={obd.busy} connected={obd.connected} />}
      {tab === 'faults' && (
        <FaultsPanel
          modules={obd.faults?.modules ?? []}
          onRefresh={obd.refreshFaults}
          busy={obd.busy}
          connected={obd.connected}
        />
      )}
      {tab === 'vehicle' && (
        <VehiclePanel
          info={obd.vehicleInfo}
          vinMatch={vinMatch}
          garageVin={garageVehicle.vin}
          onRefresh={obd.refreshVehicle}
          busy={obd.busy}
          connected={obd.connected}
        />
      )}
      {tab === 'debug' && <DebugPanel obd={obd} />}
    </div>
  );
}

function PlatformCompatNote({ onMac, onWindows }: { onMac: boolean; onWindows: boolean }) {
  return (
    <div style={{ ...card, padding: '16px 18px', borderColor: 'rgba(213,0,28,.22)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
        <div style={{ font: `600 11px/1 ${mono}`, letterSpacing: '.14em', color: '#D5001C' }}>
          PLATFORM SUPPORT
        </div>
        <BetaBadge tone="page" />
        <span style={{ font: `500 10px/1 ${mono}`, letterSpacing: '.08em', color: '#9A9AA0' }}>
          {onMac ? 'THIS DEVICE · MAC' : onWindows ? 'THIS DEVICE · WINDOWS' : 'THIS DEVICE'}
        </span>
      </div>
      <ul
        style={{
          margin: 0,
          padding: '0 0 0 18px',
          font: `400 13px/1.65 ${sans}`,
          color: '#3A3A3E',
        }}
      >
        <li>
          <strong>ELM327 USB</strong> — works here via Web Serial on desktop Chrome/Edge (Mac and Windows). No
          bridge needed.
        </li>
        <li>
          <strong>ELM327 Classic Bluetooth</strong> — needs the local bridge (or Electron Track), not Web Serial.
        </li>
        <li>
          <strong>VAS 6154 PassThru</strong> — Windows + local bridge only (J2534 DLL). Not available in the
          browser or on Mac PassThru.
        </li>
        <li>
          <strong>VAS 6154 DoIP</strong> — experimental over the bridge if the VCI has a reachable IP (Wi‑Fi /
          RNDIS). Possible on Mac, but lab-only — not full Live OBD.
        </li>
      </ul>
      {onMac && (
        <p
          style={{
            margin: '12px 0 0',
            padding: '10px 12px',
            background: '#F4F4F5',
            borderRadius: 3,
            font: `400 13px/1.5 ${sans}`,
            color: '#6E6E73',
          }}
        >
          On this Mac, plan on <strong>USB ELM + Web Serial</strong> for Live OBD. Use Windows for VAS PassThru
          testing.
        </p>
      )}
    </div>
  );
}

function StatusDot({ on, label }: { on: boolean; label: string }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        font: `600 11px/1 ${mono}`,
        letterSpacing: '.1em',
        padding: '8px 12px',
        borderRadius: 3,
        background: '#F4F4F5',
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: on ? '#3CD37A' : '#B4B4B8',
        }}
      />
      {label}
    </span>
  );
}

function ConnectionPanel({
  obd,
  port,
  setPort,
  baud,
  setBaud,
  adapterKind,
  onSelectAdapter,
  experimentalOk,
  setExperimentalOk,
  vasMode,
  setVasMode,
  dllPath,
  setDllPath,
  doipHost,
  setDoipHost,
  doipPort,
  setDoipPort,
  j2534,
  j2534Note,
  onRefreshJ2534,
  onDiscoverDoip,
  onMac,
  onConnect,
}: {
  obd: ReturnType<typeof useObdBridge>;
  port: string;
  setPort: (v: string) => void;
  baud: string;
  setBaud: (v: string) => void;
  adapterKind: AdapterKind;
  onSelectAdapter: (k: AdapterKind) => void;
  experimentalOk: boolean;
  setExperimentalOk: (v: boolean) => void;
  vasMode: VasMode;
  setVasMode: (v: VasMode) => void;
  dllPath: string;
  setDllPath: (v: string) => void;
  doipHost: string;
  setDoipHost: (v: string) => void;
  doipPort: string;
  setDoipPort: (v: string) => void;
  j2534: { name: string; vendor?: string; dllPath: string }[];
  j2534Note: string | null;
  onRefreshJ2534: () => void;
  onDiscoverDoip: () => void;
  onMac: boolean;
  onConnect: () => void;
}) {
  const isWebSerial = obd.mode === 'web-serial';
  const isVas = adapterKind === 'vas6154';
  const showDoip = isVas && (vasMode === 'doip' || vasMode === 'auto');
  const showPassThru = isVas && (vasMode === 'passthru' || vasMode === 'auto');
  const canConnect = isVas
    ? obd.bridgeOnline && !obd.connected && !obd.busy && experimentalOk && !isWebSerial
    : isWebSerial
      ? !obd.connected && !obd.busy
      : obd.bridgeOnline && !obd.connected && !obd.busy;

  const fieldLabel: CSSProperties = {
    font: `500 11px/1 ${mono}`,
    letterSpacing: '.08em',
    color: '#6E6E73',
    textTransform: 'uppercase',
  };
  const selectStyle: CSSProperties = {
    height: 38,
    border: '1px solid #D2D2D6',
    borderRadius: 3,
    padding: '0 12px',
    font: `500 12px/1 ${mono}`,
    background: '#fff',
  };
  const inputStyle: CSSProperties = {
    ...selectStyle,
    minWidth: 180,
  };

  return (
    <section style={card}>
      <h2 style={cardHead}>Connection</h2>
      <div style={{ padding: '18px 20px 22px' }}>
        <div style={{ marginBottom: 16 }}>
          <div style={{ ...fieldLabel, marginBottom: 8 }}>Adapter</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <button
              type="button"
              disabled={obd.connected || obd.busy}
              onClick={() => onSelectAdapter('elm327')}
              style={{
                ...btnBase,
                background: !isVas ? '#0B0B0C' : '#fff',
                color: !isVas ? '#fff' : '#0B0B0C',
                border: !isVas ? 'none' : '1px solid #C9C9CD',
              }}
            >
              ELM327
            </button>
            <button
              type="button"
              disabled={obd.connected || obd.busy}
              onClick={() => onSelectAdapter('vas6154')}
              style={{
                ...btnBase,
                background: isVas ? '#0B0B0C' : '#fff',
                color: isVas ? '#fff' : '#0B0B0C',
                border: isVas ? 'none' : '1px solid #C9C9CD',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              VAS 6154
              <BetaBadge tone={isVas ? 'dark' : 'page'} />
            </button>
          </div>
          <p style={{ margin: '10px 0 0', font: `400 13px/1.5 ${sans}`, color: '#6E6E73' }}>
            {isVas
              ? 'Experimental lab path — J2534 PassThru (Windows) and/or DoIP raw transcript. Not a full UDS stack; use Debug for RX.'
              : 'Production path — USB / Classic BT serial. Generic OBD talks to the DME only.'}
          </p>
        </div>

        {isVas && (
          <div
            style={{
              marginBottom: 16,
              padding: '14px 14px',
              background: '#F8F8F9',
              border: '1px solid #E3E3E5',
              borderRadius: 4,
            }}
          >
            <label
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                cursor: obd.connected ? 'not-allowed' : 'pointer',
                font: `600 11px/1 ${mono}`,
                letterSpacing: '.08em',
                opacity: obd.connected ? 0.5 : 1,
              }}
              onClick={() => {
                if (!obd.connected) setExperimentalOk(!experimentalOk);
              }}
            >
              <span
                style={{
                  width: 44,
                  height: 24,
                  borderRadius: 12,
                  background: experimentalOk ? '#D5001C' : '#D2D2D6',
                  position: 'relative',
                  transition: 'background .15s',
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    top: 3,
                    left: experimentalOk ? 23 : 3,
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    background: '#fff',
                    transition: 'left .15s',
                  }}
                />
              </span>
              EXPERIMENTAL — I UNDERSTAND
            </label>
            {onMac && (
              <p style={{ margin: '10px 0 0', font: `400 13px/1.5 ${sans}`, color: '#8A0011' }}>
                PassThru will not work on Mac. Use mode <strong>DoIP</strong> with a reachable VCI IP, or test
                PassThru on Windows.
              </p>
            )}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginTop: 14 }}>
              <label style={fieldLabel}>Mode</label>
              <select
                value={vasMode}
                onChange={(e) => setVasMode(e.target.value as VasMode)}
                disabled={obd.connected}
                style={selectStyle}
              >
                <option value="passthru">PassThru (Windows)</option>
                <option value="doip">DoIP (TCP)</option>
                <option value="auto">Auto (PassThru → DoIP)</option>
              </select>
            </div>
            {showPassThru && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginTop: 12 }}>
                <label style={fieldLabel}>PassThru DLL</label>
                <select
                  value={dllPath}
                  onChange={(e) => setDllPath(e.target.value)}
                  disabled={obd.connected || !obd.bridgeOnline}
                  style={{ ...selectStyle, minWidth: 260, maxWidth: '100%' }}
                >
                  <option value="">— auto / refresh J2534 —</option>
                  {j2534.map((d) => (
                    <option key={d.dllPath} value={d.dllPath}>
                      {d.name}
                      {d.vendor ? ` · ${d.vendor}` : ''} — {d.dllPath}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  style={{ ...btnBase, background: '#fff', color: '#0B0B0C', border: '1px solid #C9C9CD' }}
                  disabled={!obd.bridgeOnline || obd.busy || obd.connected}
                  onClick={onRefreshJ2534}
                >
                  Refresh J2534
                </button>
              </div>
            )}
            {j2534Note && showPassThru && (
              <p style={{ margin: '8px 0 0', font: `400 12px/1.45 ${sans}`, color: '#9A9AA0' }}>{j2534Note}</p>
            )}
            {showDoip && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginTop: 12 }}>
                <label style={fieldLabel}>DoIP host</label>
                <input
                  value={doipHost}
                  onChange={(e) => setDoipHost(e.target.value)}
                  disabled={obd.connected}
                  placeholder="169.254.x.x or VAS Wi‑Fi IP"
                  style={inputStyle}
                />
                <label style={fieldLabel}>Port</label>
                <input
                  value={doipPort}
                  onChange={(e) => setDoipPort(e.target.value)}
                  disabled={obd.connected}
                  style={{ ...inputStyle, minWidth: 90, width: 100 }}
                />
                <button
                  type="button"
                  style={{ ...btnBase, background: '#fff', color: '#0B0B0C', border: '1px solid #C9C9CD' }}
                  disabled={!obd.bridgeOnline || obd.busy || obd.connected}
                  onClick={onDiscoverDoip}
                >
                  Discover
                </button>
              </div>
            )}
          </div>
        )}

        <p style={{ margin: '0 0 14px', font: `400 14px/1.5 ${sans}`, color: '#3A3A3E' }}>
          {!isVas && isWebSerial
            ? 'Desktop Chrome/Edge talks to the USB ELM327 directly (Web Serial) — no local helper. Leave MS/HS on HS-CAN.'
            : !isVas
              ? 'USB or Bluetooth Classic via the local bridge (COM / cu.*). Leave MS/HS on HS-CAN.'
              : 'VAS uses the local bridge only — Web Serial cannot open PassThru/DoIP.'}
        </p>

        {!isVas && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
            <button
              type="button"
              disabled={!obd.webSerialOk || obd.connected || obd.busy}
              onClick={() => obd.setMode('web-serial')}
              style={{
                ...btnBase,
                background: isWebSerial ? '#0B0B0C' : '#fff',
                color: isWebSerial ? '#fff' : '#0B0B0C',
                border: isWebSerial ? 'none' : '1px solid #C9C9CD',
                opacity: obd.webSerialOk ? 1 : 0.45,
              }}
            >
              Web Serial (USB)
            </button>
            <button
              type="button"
              disabled={obd.connected || obd.busy}
              onClick={() => obd.setMode('bridge')}
              style={{
                ...btnBase,
                background: !isWebSerial ? '#0B0B0C' : '#fff',
                color: !isWebSerial ? '#fff' : '#0B0B0C',
                border: !isWebSerial ? 'none' : '1px solid #C9C9CD',
              }}
            >
              Local bridge
            </button>
            {!obd.webSerialOk && (
              <span style={{ font: `400 13px/1.4 ${sans}`, color: '#6E6E73', alignSelf: 'center' }}>
                Web Serial needs desktop Chrome or Edge
              </span>
            )}
          </div>
        )}

        {isVas && (
          <div style={{ marginBottom: 14, font: `500 12px/1.4 ${mono}`, color: '#6E6E73' }}>
            Transport: local bridge (required)
          </div>
        )}

        {!isWebSerial && !isVas && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginBottom: 14 }}>
            <label style={fieldLabel}>Port</label>
            <select
              value={port}
              onChange={(e) => setPort(e.target.value)}
              disabled={!obd.bridgeOnline}
              style={{ ...selectStyle, minWidth: 220 }}
            >
              <option value="">— select port —</option>
              {obd.ports.map((p: PortInfo) => (
                <option key={p.path} value={p.path}>
                  [{p.transport}] {p.path}
                  {p.manufacturer ? ` · ${p.manufacturer}` : ''}
                </option>
              ))}
            </select>
            <button
              type="button"
              style={{ ...btnBase, background: '#fff', color: '#0B0B0C', border: '1px solid #C9C9CD' }}
              disabled={!obd.bridgeOnline || obd.busy}
              onClick={() => obd.refreshPorts()}
            >
              Refresh ports
            </button>
          </div>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          {!isVas && (
            <>
              <label style={fieldLabel}>Baud</label>
              <select value={baud} onChange={(e) => setBaud(e.target.value)} style={selectStyle}>
                <option value="38400">38400</option>
                <option value="9600">9600</option>
                <option value="115200">115200</option>
              </select>
            </>
          )}
          <button
            type="button"
            style={{ ...btnBase, background: '#D5001C', color: '#fff' }}
            disabled={!canConnect}
            onClick={onConnect}
          >
            {obd.busy && !obd.connected
              ? 'Connecting…'
              : isVas
                ? 'Connect VAS'
                : isWebSerial
                  ? 'Connect USB ELM'
                  : 'Connect'}
          </button>
          <button
            type="button"
            style={{ ...btnBase, background: '#fff', color: '#0B0B0C', border: '1px solid #C9C9CD' }}
            disabled={!obd.connected || obd.busy}
            onClick={() => obd.disconnect()}
          >
            Disconnect
          </button>
        </div>
      </div>
    </section>
  );
}

function LivePanel({
  live,
  onRefresh,
  busy,
  connected,
}: {
  live: LiveData | null;
  onRefresh: () => void;
  busy: boolean;
  connected: boolean;
}) {
  const order = ['Engine', 'Fuel & air', 'Throttle', 'Temps', 'Status'];
  const groups = live?.groups || {};
  const keys = [...order.filter((g) => groups[g]), ...Object.keys(groups).filter((g) => !order.includes(g))];

  return (
    <section style={card}>
      <h2 style={cardHead}>Live data</h2>
      <div style={{ padding: '18px 20px 22px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
          <button
            type="button"
            style={{ ...btnBase, background: '#fff', color: '#0B0B0C', border: '1px solid #C9C9CD' }}
            disabled={!connected || busy}
            onClick={onRefresh}
          >
            Refresh live
          </button>
        </div>
        {!keys.length ? (
          <p style={{ margin: 0, color: '#6E6E73', font: `400 14px/1.5 ${sans}` }}>
            {connected ? 'No live PIDs yet — connect and poll.' : 'Connect to see live PIDs.'}
          </p>
        ) : (
          keys.map((group) => (
            <div key={group} style={{ marginBottom: 20 }}>
              <div
                style={{
                  font: `600 10px/1 ${mono}`,
                  letterSpacing: '.12em',
                  color: '#6E6E73',
                  textTransform: 'uppercase',
                  marginBottom: 10,
                }}
              >
                {group}
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                  gap: 12,
                }}
              >
                {(groups[group] || []).map((m) => (
                  <div
                    key={m.key}
                    style={{ background: '#141416', color: '#fff', borderRadius: 6, padding: '14px 16px' }}
                  >
                    <div
                      style={{
                        font: `500 9px/1 ${mono}`,
                        letterSpacing: '.12em',
                        color: '#76767B',
                        marginBottom: 8,
                      }}
                    >
                      {m.label}
                    </div>
                    <div style={{ font: `300 26px/1 ${sans}`, wordBreak: 'break-word' }}>{fmt(m.value)}</div>
                    <div style={{ font: `500 11px/1 ${mono}`, color: '#9A9AA0', marginTop: 6 }}>
                      {m.unit || `PID ${m.pid}`}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
        {live?.readiness && (
          <div style={{ marginTop: 8 }}>
            <div
              style={{
                font: `600 10px/1 ${mono}`,
                letterSpacing: '.12em',
                color: '#6E6E73',
                marginBottom: 10,
              }}
            >
              READINESS
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <Chip ok={!live.readiness.mil}>MIL {live.readiness.mil ? 'ON' : 'OFF'}</Chip>
              <Chip>{live.readiness.dtcCount} DTC count</Chip>
              {(live.readiness.monitors || []).map((m) => (
                <Chip key={m.id} ok={!m.incomplete}>
                  {m.label}: {m.incomplete ? 'incomplete' : 'ready'}
                </Chip>
              ))}
            </div>
          </div>
        )}
        {!!live?.errors?.length && (
          <div
            style={{
              marginTop: 14,
              background: 'rgba(213,0,28,.08)',
              border: '1px solid rgba(213,0,28,.25)',
              color: '#8A0011',
              borderRadius: 4,
              padding: '12px 14px',
              font: `500 12px/1.4 ${mono}`,
              whiteSpace: 'pre-wrap',
            }}
          >
            {live.errors.map((e) => `${e.pid}: ${e.message}`).join('\n')}
          </div>
        )}
      </div>
    </section>
  );
}

function Chip({ children, ok }: { children: ReactNode; ok?: boolean }) {
  const border = ok === true ? '#B8E6C8' : ok === false ? '#F0B4BC' : '#E3E3E5';
  const color = ok === true ? '#1A7A42' : ok === false ? '#8A0011' : '#3A3A3E';
  return (
    <span
      style={{
        font: `500 11px/1 ${mono}`,
        padding: '6px 10px',
        borderRadius: 3,
        border: `1px solid ${border}`,
        color,
        background: '#fff',
      }}
    >
      {children}
    </span>
  );
}

function FaultsPanel({
  modules,
  onRefresh,
  busy,
  connected,
}: {
  modules: FaultModule[];
  onRefresh: () => void;
  busy: boolean;
  connected: boolean;
}) {
  return (
    <section style={card}>
      <h2 style={cardHead}>Fault codes</h2>
      <div style={{ padding: '18px 20px 22px' }}>
        <p style={{ margin: '0 0 14px', font: `400 14px/1.5 ${sans}`, color: '#3A3A3E' }}>
          Generic OBD Mode 03 / 07 / 0A reads the engine emissions ECU (DME) only. Click a code to look it up in Fault
          Finding.
        </p>
        <button
          type="button"
          style={{ ...btnBase, background: '#fff', color: '#0B0B0C', border: '1px solid #C9C9CD', marginBottom: 14 }}
          disabled={!connected || busy}
          onClick={onRefresh}
        >
          Refresh faults
        </button>
        {!modules.length ? (
          <p style={{ margin: 0, color: '#6E6E73', font: `400 14px/1.5 ${sans}` }}>
            {connected ? 'No fault scan yet.' : 'Connect to scan fault codes.'}
          </p>
        ) : (
          modules.map((m) => <ModuleCard key={m.id} module={m} />)
        )}
      </div>
    </section>
  );
}

function ModuleCard({ module: m }: { module: FaultModule }) {
  if (!m.available) {
    return (
      <div
        style={{
          border: '1px solid #E3E3E5',
          borderRadius: 6,
          padding: '14px 16px',
          marginBottom: 12,
          background: '#FAFAFA',
          opacity: 0.85,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
          <span style={{ font: `600 13px/1.2 ${sans}` }}>{m.name}</span>
          <span
            style={{
              font: `600 9px/1 ${mono}`,
              letterSpacing: '.1em',
              textTransform: 'uppercase',
              padding: '4px 8px',
              borderRadius: 2,
              background: '#F0F0F1',
              color: '#6E6E73',
            }}
          >
            UDS required
          </span>
        </div>
        <div style={{ font: `400 14px/1.4 ${sans}`, color: '#6E6E73' }}>
          {m.note || 'Not available via generic ELM327'}
        </div>
      </div>
    );
  }

  return (
    <div style={{ border: '1px solid #E3E3E5', borderRadius: 6, padding: '14px 16px', marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
        <span style={{ font: `600 13px/1.2 ${sans}` }}>{m.name}</span>
        <span
          style={{
            font: `600 9px/1 ${mono}`,
            letterSpacing: '.1em',
            textTransform: 'uppercase',
            padding: '4px 8px',
            borderRadius: 2,
            background: '#E8F8EE',
            color: '#1A7A42',
          }}
        >
          OBD-II
        </span>
      </div>
      <DtcList label="Confirmed (Mode 03)" codes={m.confirmed} />
      <DtcList label="Pending (Mode 07)" codes={m.pending} />
      <DtcList label="Permanent (Mode 0A)" codes={m.permanent} />
      {m.freezeFrame?.dtc && (
        <div style={{ marginTop: 10, font: `500 12px/1.4 ${mono}` }}>
          Freeze frame: {m.freezeFrame.dtc}
          {Object.keys(m.freezeFrame.pids || {}).length
            ? ` — ${Object.entries(m.freezeFrame.pids)
                .map(([k, v]) => `${k}=${v}`)
                .join(' · ')}`
            : ''}
        </div>
      )}
      {!!m.errors?.length && (
        <div style={{ marginTop: 10, color: '#8A0011', font: `500 12px/1.4 ${mono}` }}>
          {m.errors.map((e) => `${e.service}: ${e.message}`).join('\n')}
        </div>
      )}
    </div>
  );
}

function DtcList({ label, codes }: { label: string; codes: string[] }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ font: `600 10px/1 ${mono}`, letterSpacing: '.08em', color: '#9A9AA0', marginBottom: 6 }}>
        {label}
      </div>
      {!codes?.length ? (
        <div style={{ color: '#6E6E73', font: `400 14px/1.4 ${sans}` }}>(none)</div>
      ) : (
        <ul style={{ margin: 0, paddingLeft: 18, font: `500 13px/1.5 ${mono}` }}>
          {codes.map((c) => (
            <li key={c} style={{ margin: '4px 0' }}>
              <Link href={`/faults?q=${encodeURIComponent(c)}`} style={{ color: '#D5001C', textDecoration: 'none' }}>
                {c}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function VehiclePanel({
  info,
  vinMatch,
  garageVin,
  onRefresh,
  busy,
  connected,
}: {
  info: VehicleInfo | null;
  vinMatch: boolean | null;
  garageVin: string;
  onRefresh: () => void;
  busy: boolean;
  connected: boolean;
}) {
  const rows: [string, string | null | undefined][] = info
    ? [
        ['VIN', info.vin],
        ['Calibration ID', info.calid],
        ['CVN', info.cvn],
        ['ECU name', info.ecu_name],
        ['Adapter', info.adapter],
        ['Protocol', info.protocol],
        ['Mode 01 PIDs', info.supportedPids?.length ? `${info.supportedPids.length} supported` : null],
      ]
    : [];

  return (
    <section style={card}>
      <h2 style={cardHead}>Vehicle info</h2>
      <div style={{ padding: '18px 20px 22px' }}>
        <button
          type="button"
          style={{ ...btnBase, background: '#fff', color: '#0B0B0C', border: '1px solid #C9C9CD', marginBottom: 14 }}
          disabled={!connected || busy}
          onClick={onRefresh}
        >
          Refresh identity
        </button>
        {!info ? (
          <p style={{ margin: 0, color: '#6E6E73', font: `400 14px/1.5 ${sans}` }}>
            {connected ? 'No identity read yet.' : 'Connect to read vehicle identity.'}
          </p>
        ) : (
          <>
            {vinMatch != null && (
              <div
                style={{
                  marginBottom: 14,
                  padding: '10px 12px',
                  borderRadius: 4,
                  border: `1px solid ${vinMatch ? '#B8E6C8' : '#E3E3E5'}`,
                  background: vinMatch ? 'rgba(60,211,122,.08)' : '#F4F4F5',
                  font: `400 13px/1.4 ${sans}`,
                  color: '#3A3A3E',
                }}
              >
                {vinMatch
                  ? 'OBD VIN matches the active garage vehicle.'
                  : `Garage VIN on file: ${garageVin || '(none)'} — compare with OBD reading.`}
              </div>
            )}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(120px, 180px) 1fr',
                gap: '8px 16px',
                fontSize: 14,
              }}
            >
              {rows.map(([k, v]) => (
                <div key={k} style={{ display: 'contents' }}>
                  <div style={{ font: `500 11px/1.4 ${mono}`, letterSpacing: '.06em', color: '#6E6E73' }}>{k}</div>
                  <div style={{ font: `500 13px/1.4 ${mono}`, wordBreak: 'break-all' }}>{fmt(v)}</div>
                </div>
              ))}
            </div>
            {!!info.supportedPids?.length && (
              <div style={{ marginTop: 16 }}>
                <div
                  style={{
                    font: `600 10px/1 ${mono}`,
                    letterSpacing: '.12em',
                    color: '#6E6E73',
                    marginBottom: 8,
                  }}
                >
                  SUPPORTED MODE 01 PIDS
                </div>
                <div style={{ font: `500 11px/1.5 ${mono}`, color: '#3A3A3E', wordBreak: 'break-all' }}>
                  {info.supportedPids.join(' ')}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}

function DebugPanel({ obd }: { obd: ReturnType<typeof useObdBridge> }) {
  return (
    <section style={card}>
      <h2 style={cardHead}>Debug log</h2>
      <div style={{ padding: '18px 20px 22px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
          <button
            type="button"
            style={{ ...btnBase, background: '#0B0B0C', color: '#fff' }}
            onClick={() => obd.loadDebug()}
          >
            Refresh debug
          </button>
          <button
            type="button"
            style={{ ...btnBase, background: '#fff', color: '#0B0B0C', border: '1px solid #C9C9CD' }}
            onClick={() => {
              const payload = JSON.stringify(
                { bridgeUrl: obd.bridgeUrl, status: obd.status, log: obd.debugLog },
                null,
                2,
              );
              navigator.clipboard.writeText(payload);
            }}
          >
            Copy JSON
          </button>
        </div>
        <pre
          style={{
            margin: 0,
            background: '#0F0F11',
            color: '#C9C9CD',
            border: '1px solid #232327',
            borderRadius: 6,
            padding: 14,
            font: `500 11px/1.45 ${mono}`,
            maxHeight: 420,
            overflow: 'auto',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {obd.debugLog.length
            ? JSON.stringify({ log: obd.debugLog, status: obd.status }, null, 2)
            : '— click Refresh debug —'}
        </pre>
      </div>
    </section>
  );
}
