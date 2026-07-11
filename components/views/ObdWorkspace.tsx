'use client';

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import Link from 'next/link';
import { useObdBridge } from '@/lib/obd/useObdBridge';
import { useVehicle } from '@/lib/vehicle-context';
import { mono, sans } from '@/components/tools/ui';
import type { FaultModule, LiveData, PortInfo, VehicleInfo } from '@/lib/obd/types';
import { BetaBadge } from '@/components/shell/BetaBadge';
import { useObdFocus } from '@/lib/obd/ObdFocusContext';

const TABS = [
  { id: 'connection', label: 'Connection' },
  { id: 'live', label: 'Live data' },
  { id: 'faults', label: 'Fault codes' },
  { id: 'vehicle', label: 'Vehicle info' },
  { id: 'debug', label: 'Debug' },
] as const;

type TabId = (typeof TABS)[number]['id'];

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
  padding: '16px 20px',
  font: `600 12px/1 ${mono}`,
  letterSpacing: '.14em',
  color: '#D5001C',
  borderBottom: '1px solid #F0F0F1',
  textTransform: 'uppercase',
};

const btnBase: CSSProperties = {
  minHeight: 44,
  padding: '0 18px',
  borderRadius: 4,
  font: `600 12px/1 ${sans}`,
  letterSpacing: '.08em',
  textTransform: 'uppercase',
  cursor: 'pointer',
  border: 'none',
};

const tabBtn = (active: boolean): CSSProperties => ({
  minHeight: 44,
  padding: '0 16px',
  borderRadius: 4,
  border: active ? '1px solid #0B0B0C' : '1px solid #C9C9CD',
  background: active ? '#0B0B0C' : '#fff',
  color: active ? '#fff' : '#0B0B0C',
  font: `600 12px/1 ${mono}`,
  letterSpacing: '.1em',
  textTransform: 'uppercase',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
});

function fmt(v: unknown): string {
  if (v == null) return '—';
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : String(v);
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

export default function ObdWorkspace() {
  const { vehicle: garageVehicle } = useVehicle();
  const obd = useObdBridge();
  const { focus: obdFocus, setFocus: setObdFocus, toggleFocus } = useObdFocus();
  const [tab, setTab] = useState<TabId>('connection');
  const [port, setPort] = useState('');
  const [baud, setBaud] = useState('38400');
  const [onMac, setOnMac] = useState(false);
  const [onWindows, setOnWindows] = useState(false);

  const selectedPort = port || obd.ports[0]?.path || '';
  const isWebSerial = obd.mode === 'web-serial';
  const pollOk = obd.status?.pollSupported !== false;

  // Platform UA only after mount — keeps SSR HTML identical to the first client paint.
  useEffect(() => {
    setOnMac(isLikelyMac());
    setOnWindows(isLikelyWindows());
  }, []);

  const vinMatch = useMemo(() => {
    const obdVin = obd.vehicleInfo?.vin?.toUpperCase();
    const garageVin = garageVehicle.vin?.replace(/\s/g, '').toUpperCase();
    if (!obdVin || !garageVin || garageVin.length < 8) return null;
    return obdVin === garageVin || obdVin.endsWith(garageVin) || garageVin.endsWith(obdVin);
  }, [obd.vehicleInfo?.vin, garageVehicle.vin]);

  async function handleConnect() {
    if (!isWebSerial && !selectedPort) {
      obd.setError('Select a serial port first.');
      return;
    }
    try {
      await obd.connect({
        adapter: 'elm327',
        port: isWebSerial ? 'web-serial' : selectedPort,
        baudRate: Number(baud) || 38400,
      });
      setTab('live');
    } catch {
      /* error already set */
    }
  }

  return (
    <div
      className={obdFocus ? 'obdFocusRoot' : 'padView'}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        maxWidth: obdFocus ? 'none' : 1100,
        padding: obdFocus ? undefined : 28,
        minHeight: obdFocus ? '100%' : undefined,
      }}
    >
      <div className={obdFocus ? 'obdFocusChrome obdTopChrome' : 'obdTopChrome'}>
        <ObdToolbar
          focus={obdFocus}
          onToggleFocus={toggleFocus}
          onExitFocus={() => setObdFocus(false)}
          connected={obd.connected}
          modeLabel={isWebSerial ? 'Web Serial (USB)' : `Bridge${obd.health?.platform ? ` · ${obd.health.platform}` : ''}`}
        />

        <div className="obdTabBar">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                style={tabBtn(t.id === tab)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

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
              Start the serial bridge for Classic Bluetooth, or switch to <strong>Web Serial</strong> for USB ELM
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
            {obd.webSerialOk && (
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
          padding: '14px 18px',
        }}
      >
        <StatusDot on={obd.connected} label={obd.connected ? 'CONNECTED' : 'DISCONNECTED'} />
        <span style={{ font: `500 12px/1.3 ${mono}`, color: '#6E6E73' }}>
          ELM327
          {' · '}
          {isWebSerial ? 'Web Serial (USB)' : `Bridge${obd.health?.platform ? ` · ${obd.health.platform}` : ''}`}
        </span>
        {obd.status?.path && (
          <span style={{ font: `500 12px/1.3 ${mono}`, color: '#6E6E73' }}>
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
            gap: 12,
            cursor: obd.connected && pollOk ? 'pointer' : 'not-allowed',
            opacity: obd.connected && pollOk ? 1 : 0.45,
            font: `600 12px/1 ${mono}`,
            letterSpacing: '.08em',
            userSelect: 'none',
            minHeight: 44,
            padding: '4px 0',
          }}
          title={!pollOk ? 'Live poll unavailable for this adapter' : undefined}
          onClick={() => {
            if (!obd.connected || obd.busy || !pollOk) return;
            obd.setPolling(!obd.polling, 2000);
          }}
        >
          <span
            style={{
              width: 52,
              height: 28,
              borderRadius: 14,
              background: obd.polling ? '#D5001C' : '#D2D2D6',
              position: 'relative',
              transition: 'background .15s',
              flexShrink: 0,
            }}
          >
            <span
              style={{
                position: 'absolute',
                top: 3,
                left: obd.polling ? 27 : 3,
                width: 22,
                height: 22,
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

      {tab === 'connection' && (
        <ConnectionPanel
          obd={obd}
          port={selectedPort}
          setPort={setPort}
          baud={baud}
          setBaud={setBaud}
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

function ObdToolbar({
  focus,
  onToggleFocus,
  onExitFocus,
  connected,
  modeLabel,
}: {
  focus: boolean;
  onToggleFocus: () => void;
  onExitFocus: () => void;
  connected: boolean;
  modeLabel: string;
}) {
  return (
    <div
      className="obdToolbar"
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 10,
        padding: focus ? '12px 0 4px' : '4px 0',
      }}
    >
      {focus && (
        <div style={{ minWidth: 0, flex: '1 1 140px' }}>
          <div style={{ font: `500 10px/1 ${mono}`, letterSpacing: '.16em', color: '#9A9AA0' }}>DIAGNOSTICS</div>
          <div
            style={{
              font: "400 18px/1.2 'Helvetica Neue',Arial,sans-serif",
              color: '#0B0B0C',
              marginTop: 4,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              flexWrap: 'wrap',
            }}
          >
            <span>Live OBD</span>
            <BetaBadge tone="page" />
          </div>
        </div>
      )}
      {focus && (
        <span
          style={{
            font: `600 11px/1 ${mono}`,
            letterSpacing: '.08em',
            color: connected ? '#1A7A42' : '#6E6E73',
            padding: '10px 12px',
            background: '#fff',
            border: '1px solid #E3E3E5',
            borderRadius: 4,
          }}
        >
          {connected ? 'CONNECTED' : 'DISCONNECTED'} · {modeLabel}
        </span>
      )}
      <div style={{ marginLeft: focus ? 'auto' : 0, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {focus ? (
          <button
            type="button"
            onClick={onExitFocus}
            aria-label="Exit focus mode"
            style={{
              ...btnBase,
              background: '#0B0B0C',
              color: '#fff',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span aria-hidden style={{ fontSize: 16, lineHeight: 1 }}>×</span>
            Exit focus
          </button>
        ) : (
          <button
            type="button"
            onClick={onToggleFocus}
            aria-label="Enter focus mode"
            style={{
              ...btnBase,
              background: '#fff',
              color: '#0B0B0C',
              border: '1px solid #C9C9CD',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span aria-hidden style={{ fontSize: 14, lineHeight: 1 }}>⤢</span>
            Focus
          </button>
        )}
      </div>
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
          <strong>ELM327 Classic Bluetooth</strong> — needs the local bridge (or FLAT·SIX Desktop), not Web Serial.
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
          On this Mac, use <strong>USB ELM + Web Serial</strong> for the simplest Live OBD path, or the local bridge
          for Classic Bluetooth adapters.
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
        gap: 10,
        font: `600 12px/1 ${mono}`,
        letterSpacing: '.1em',
        padding: '10px 14px',
        borderRadius: 4,
        background: '#F4F4F5',
        minHeight: 44,
      }}
    >
      <span
        style={{
          width: 10,
          height: 10,
          borderRadius: '50%',
          background: on ? '#3CD37A' : '#B4B4B8',
          flexShrink: 0,
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
  onConnect,
}: {
  obd: ReturnType<typeof useObdBridge>;
  port: string;
  setPort: (v: string) => void;
  baud: string;
  setBaud: (v: string) => void;
  onConnect: () => void;
}) {
  const isWebSerial = obd.mode === 'web-serial';
  const canConnect = isWebSerial
    ? !obd.connected && !obd.busy
    : obd.bridgeOnline && !obd.connected && !obd.busy;

  const fieldLabel: CSSProperties = {
    font: `500 12px/1 ${mono}`,
    letterSpacing: '.08em',
    color: '#6E6E73',
    textTransform: 'uppercase',
    minHeight: 44,
    display: 'inline-flex',
    alignItems: 'center',
  };
  const selectStyle: CSSProperties = {
    minHeight: 44,
    border: '1px solid #D2D2D6',
    borderRadius: 4,
    padding: '0 14px',
    font: `500 13px/1 ${mono}`,
    background: '#fff',
  };

  return (
    <section style={card}>
      <h2 style={cardHead}>Connection</h2>
      <div style={{ padding: '20px 22px 24px' }}>
        <p style={{ margin: '0 0 14px', font: `400 14px/1.5 ${sans}`, color: '#3A3A3E' }}>
          USB or Bluetooth Classic serial via ELM327. Generic OBD talks to the DME only. Leave MS/HS on HS-CAN.
        </p>

        <p style={{ margin: '0 0 14px', font: `400 14px/1.5 ${sans}`, color: '#3A3A3E' }}>
          {isWebSerial
            ? 'Desktop Chrome/Edge talks to the USB ELM327 directly (Web Serial) — no local helper.'
            : 'USB or Bluetooth Classic via the local bridge (COM / cu.*).'}
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
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

        {!isWebSerial && (
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
          <label style={fieldLabel}>Baud</label>
          <select value={baud} onChange={(e) => setBaud(e.target.value)} style={selectStyle}>
            <option value="38400">38400</option>
            <option value="9600">9600</option>
            <option value="115200">115200</option>
          </select>
          <button
            type="button"
            style={{ ...btnBase, background: '#D5001C', color: '#fff' }}
            disabled={!canConnect}
            onClick={onConnect}
          >
            {obd.busy && !obd.connected ? 'Connecting…' : isWebSerial ? 'Connect USB ELM' : 'Connect'}
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
      <div style={{ padding: '20px 22px 24px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
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
                  gridTemplateColumns: 'repeat(auto-fill, minmax(148px, 1fr))',
                  gap: 14,
                }}
              >
                {(groups[group] || []).map((m) => (
                  <div
                    key={m.key}
                    style={{ background: '#141416', color: '#fff', borderRadius: 8, padding: '16px 18px', minHeight: 88 }}
                  >
                    <div
                      style={{
                        font: `500 10px/1 ${mono}`,
                        letterSpacing: '.12em',
                        color: '#76767B',
                        marginBottom: 10,
                      }}
                    >
                      {m.label}
                    </div>
                    <div style={{ font: `300 30px/1.1 ${sans}`, wordBreak: 'break-word' }}>{fmt(m.value)}</div>
                    <div style={{ font: `500 12px/1 ${mono}`, color: '#9A9AA0', marginTop: 8 }}>
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
        font: `500 12px/1 ${mono}`,
        padding: '10px 14px',
        borderRadius: 4,
        border: `1px solid ${border}`,
        color,
        background: '#fff',
        minHeight: 44,
        display: 'inline-flex',
        alignItems: 'center',
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
      <div style={{ padding: '20px 22px 24px' }}>
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
    <div style={{ marginBottom: 12 }}>
      <div style={{ font: `600 11px/1 ${mono}`, letterSpacing: '.08em', color: '#9A9AA0', marginBottom: 8 }}>
        {label}
      </div>
      {!codes?.length ? (
        <div style={{ color: '#6E6E73', font: `400 14px/1.4 ${sans}`, padding: '8px 0' }}>(none)</div>
      ) : (
        <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
          {codes.map((c) => (
            <li key={c} style={{ margin: '6px 0' }}>
              <Link
                href={`/faults?q=${encodeURIComponent(c)}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  minHeight: 44,
                  padding: '10px 14px',
                  borderRadius: 4,
                  border: '1px solid #E3E3E5',
                  background: '#fff',
                  color: '#D5001C',
                  textDecoration: 'none',
                  font: `600 14px/1.3 ${mono}`,
                }}
              >
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
      <div style={{ padding: '20px 22px 24px' }}>
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
      <div style={{ padding: '20px 22px 24px' }}>
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
