'use client';

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useObdBridge } from '@/lib/obd-react/useObdBridge';
import { useVehicle, modelGlb } from '@/lib/vehicle-context';
import { generationForBody } from '@/lib/models';
import type { EnginePart } from '@/lib/types';
import { getFaultCodes, type FaultCode } from '@/lib/knowledge';
import { ALL_LIVE_PIDS } from '@/lib/obd/pids';
import { mono, sans } from '@/components/tools/ui';
import { FuelTrimInsight, ReadinessInsight, MisfireInsight } from '@/components/views/ObdInsights';
import type {
  ClearResult,
  FaultModule,
  LiveData,
  Mode06Data,
  Mode06Test,
  ModuleScanData,
  PortInfo,
  VehicleInfo,
} from '@/lib/obd/types';
import { udsModulesFor } from '@/lib/obd/uds-modules';
import { BetaBadge } from '@/components/shell/BetaBadge';
import { useObdFocus } from '@/lib/obd-react/ObdFocusContext';
import { createClient } from '@/lib/supabase/client';
import { isAdminEmail } from '@/lib/admin';
import { DEMO_MODE } from '@/lib/demo';

// The 3D car viewer pulls in three.js/R3F — load it only when the 3D map is
// opened (client-only; R3F can't SSR).
const ObdCarViewer = dynamic(() => import('@/components/garage/GLBViewer'), {
  ssr: false,
  loading: () => (
    <div style={{ display: 'grid', placeItems: 'center', height: '100%', font: `500 12px/1 ${mono}`, color: '#9A9AA0' }}>
      Loading 3D…
    </div>
  ),
});

const TABS = [
  { id: 'connection', label: 'Connection' },
  { id: 'live', label: 'Live data' },
  { id: 'faults', label: 'Fault codes' },
  { id: 'monitors', label: 'Monitors' },
  { id: 'insights', label: 'Insights' },
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
  const { vehicle: garageVehicle, activeId } = useVehicle();
  const obd = useObdBridge();
  const { focus: obdFocus, setFocus: setObdFocus, toggleFocus } = useObdFocus();
  const [tab, setTab] = useState<TabId>('connection');
  const [port, setPort] = useState('');
  const [baud, setBaud] = useState('38400');
  const [onMac, setOnMac] = useState(false);
  const [onWindows, setOnWindows] = useState(false);
  // Debug log is owner-only (same gate as the Admin nav item). Server-side data
  // isn't sensitive, but the raw ELM trace is noise for everyone else.
  const [isAdmin, setIsAdmin] = useState(DEMO_MODE);

  const selectedPort = port || obd.ports[0]?.path || '';
  const isWebSerial = obd.mode === 'web-serial';
  const pollOk = obd.status?.pollSupported !== false;

  const visibleTabs = useMemo(() => TABS.filter((t) => t.id !== 'debug' || isAdmin), [isAdmin]);

  // Single source of truth for the connection lifecycle → drives the animated
  // indicator and the one stateful Connect/Disconnect button.
  const connState: ConnState = obd.connected
    ? 'connected'
    : obd.busy && !obd.status?.connected
      ? 'connecting'
      : 'idle';

  // Resolve DTCs to knowledge-base descriptions, scoped to the active car's
  // generation (981 vs 987 codes differ — never cross them).
  const generation = generationForBody(garageVehicle.body);
  const describeDtc = useMemo(() => {
    const byCode = new Map<string, FaultCode>();
    for (const f of getFaultCodes(generation)) byCode.set(f.code.toUpperCase(), f);
    return (code: string): FaultCode | undefined => byCode.get(code.toUpperCase());
  }, [generation]);

  // Platform UA only after mount — keeps SSR HTML identical to the first client paint.
  useEffect(() => {
    setOnMac(isLikelyMac());
    setOnWindows(isLikelyWindows());
    if (DEMO_MODE) return;
    createClient()
      .auth.getUser()
      .then(({ data }) => setIsAdmin(isAdminEmail(data.user?.email)))
      .catch(() => {});
  }, []);

  // Never leave a hidden tab selected (e.g. Debug after an admin signs out).
  useEffect(() => {
    if (tab === 'debug' && !isAdmin) setTab('connection');
  }, [tab, isAdmin]);

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
            {visibleTabs.map((t) => (
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
        <ConnectionIndicator
          state={connState}
          label={connState === 'connected' ? 'CONNECTED' : connState === 'connecting' ? 'CONNECTING…' : 'DISCONNECTED'}
        />
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
          connState={connState}
        />
      )}
      {tab === 'live' && (
        <LivePanel live={obd.live} onRefresh={obd.refreshLive} busy={obd.busy} connected={obd.connected} />
      )}
      {tab === 'faults' && (
        <FaultsPanel
          modules={obd.faults?.modules ?? []}
          onRefresh={obd.refreshFaults}
          busy={obd.busy}
          connected={obd.connected}
          describeDtc={describeDtc}
          moduleScan={obd.moduleScan}
          onScanModules={() => obd.scanModules(generation)}
          onClearFaults={() => obd.clearFaults(generation)}
          onSaveScan={() => obd.saveScan({ vehicleId: activeId, generation })}
          generation={generation}
          glbSrc={modelGlb(garageVehicle.body)}
          paintHex={garageVehicle.colorHex}
        />
      )}
      {tab === 'monitors' && (
        <Mode06Panel
          data={obd.mode06}
          onRefresh={obd.refreshMode06}
          busy={obd.busy}
          connected={obd.connected}
        />
      )}
      {tab === 'insights' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <FuelTrimInsight live={obd.live} />
          <ReadinessInsight live={obd.live} />
          <MisfireInsight mode06={obd.mode06} />
        </div>
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
      {tab === 'debug' && isAdmin && <DebugPanel obd={obd} />}
    </div>
  );
}

type ConnState = 'idle' | 'connecting' | 'connected';

/** Live connection state with pulsing rings (green live / amber connecting). */
function ConnectionIndicator({ state, label }: { state: ConnState; label: string }) {
  const color = state === 'connected' ? '#3CD37A' : state === 'connecting' ? '#E0A100' : '#B4B4B8';
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 12,
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
          position: 'relative',
          width: 12,
          height: 12,
          flexShrink: 0,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {state !== 'idle' && (
          <span
            className={state === 'connecting' ? 'obdRingFast' : 'obdRing'}
            style={{ position: 'absolute', width: 12, height: 12, borderRadius: '50%', background: color }}
          />
        )}
        <span
          className={state === 'connecting' ? 'obdBlink' : undefined}
          style={{ width: 10, height: 10, borderRadius: '50%', background: color, position: 'relative' }}
        />
      </span>
      {label}
    </span>
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

/** One button, three states — replaces the confusing Connect + Disconnect pair. */
function ConnectButton({
  connState,
  canConnect,
  isWebSerial,
  onConnect,
  onDisconnect,
}: {
  connState: ConnState;
  canConnect: boolean;
  isWebSerial: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}) {
  if (connState === 'connecting') {
    return (
      <button
        type="button"
        disabled
        style={{ ...btnBase, background: '#E0A100', color: '#fff', display: 'inline-flex', alignItems: 'center', gap: 10, opacity: 0.9 }}
      >
        <span
          className="obdSpin"
          aria-hidden
          style={{
            width: 14,
            height: 14,
            borderRadius: '50%',
            border: '2px solid rgba(255,255,255,.4)',
            borderTopColor: '#fff',
            display: 'inline-block',
          }}
        />
        Connecting…
      </button>
    );
  }
  if (connState === 'connected') {
    return (
      <button
        type="button"
        onClick={onDisconnect}
        style={{ ...btnBase, background: '#0B0B0C', color: '#fff', display: 'inline-flex', alignItems: 'center', gap: 10 }}
      >
        <span aria-hidden style={{ width: 8, height: 8, borderRadius: '50%', background: '#3CD37A' }} />
        Disconnect
      </button>
    );
  }
  return (
    <button
      type="button"
      style={{ ...btnBase, background: canConnect ? '#D5001C' : '#E7A6AE', color: '#fff', cursor: canConnect ? 'pointer' : 'not-allowed' }}
      disabled={!canConnect}
      onClick={onConnect}
    >
      {isWebSerial ? 'Connect USB ELM' : 'Connect'}
    </button>
  );
}

function ConnectionPanel({
  obd,
  port,
  setPort,
  baud,
  setBaud,
  onConnect,
  connState,
}: {
  obd: ReturnType<typeof useObdBridge>;
  port: string;
  setPort: (v: string) => void;
  baud: string;
  setBaud: (v: string) => void;
  onConnect: () => void;
  connState: ConnState;
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
          <select
            value={baud}
            onChange={(e) => setBaud(e.target.value)}
            disabled={connState === 'connected'}
            style={{ ...selectStyle, opacity: connState === 'connected' ? 0.5 : 1 }}
          >
            <option value="38400">38400</option>
            <option value="9600">9600</option>
            <option value="115200">115200</option>
          </select>
          <ConnectButton
            connState={connState}
            canConnect={canConnect}
            isWebSerial={isWebSerial}
            onConnect={onConnect}
            onDisconnect={() => obd.disconnect()}
          />
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
  const order = ['Engine', 'Fuel trim', 'Fuel & air', 'O2 sensors', 'Throttle', 'Temps', 'Status'];
  const values = live?.values ?? {};

  // Render a FIXED grid from the full PID catalog (independent of capability
  // discovery, which can come back incomplete). Every PID always has a tile;
  // one without a value shows "N/A" in place, so the layout never shifts.
  const grouped = new Map<string, typeof ALL_LIVE_PIDS>();
  for (const def of ALL_LIVE_PIDS) {
    const group = def[2];
    const list = grouped.get(group) ?? [];
    list.push(def);
    grouped.set(group, list);
  }
  const keys = [
    ...order.filter((g) => grouped.has(g)),
    ...[...grouped.keys()].filter((g) => !order.includes(g)),
  ];

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
        {!connected ? (
          <p style={{ margin: 0, color: '#6E6E73', font: `400 14px/1.5 ${sans}` }}>
            Connect to see live PIDs.
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
                {(grouped.get(group) ?? []).map(([pid, key, , label, unit]) => {
                  const has = values[key] !== undefined && values[key] !== null;
                  return (
                    <div
                      key={key}
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
                        {label}
                      </div>
                      <div style={{ font: `300 30px/1.1 ${sans}`, wordBreak: 'break-word', color: has ? '#fff' : '#5A5A5F' }}>
                        {has ? fmt(values[key]) : 'N/A'}
                      </div>
                      <div style={{ font: `500 12px/1 ${mono}`, color: '#9A9AA0', marginTop: 8 }}>
                        {unit || `PID ${pid}`}
                      </div>
                    </div>
                  );
                })}
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

type MapState = 'fault' | 'clean' | 'refused' | 'silent' | 'unknown';

interface MapModule {
  id: string;
  name: string;
  short: string;
  state: MapState;
  codes: string[];
  // Placement on the silhouette in %; null = no known location (listed instead).
  x: number | null;
  y: number | null;
}

// Approximate top-down placement on a mid-engine silhouette (nose left, engine
// behind the cabin). Deliberately schematic — a health map, not the 3D view.
// Keyed by module id from lib/obd/uds-modules.ts; ids without an entry here are
// still shown (as an "other modules" list), so a faulted module is never hidden.
// Percentages of the traced-silhouette container (nose left). The greenhouse
// spans ~33–80% of length, engine bay ~80–93% — keep engine/PDK pins behind it.
const MODULE_MAP_POS: Record<string, { x: number; y: number; short: string }> = {
  'bcm-front': { x: 18, y: 40, short: 'BCM FR' },
  psm: { x: 24, y: 33, short: 'ABS' },
  cluster: { x: 40, y: 30, short: 'CLUSTER' },
  airbag: { x: 48, y: 55, short: 'AIRBAG' },
  pcm: { x: 40, y: 72, short: 'PCM' },
  gateway: { x: 58, y: 42, short: 'GATEWAY' },
  dme: { x: 82, y: 45, short: 'ENGINE' },
  pdk: { x: 88, y: 62, short: 'PDK' },
  'bcm-rear': { x: 84, y: 32, short: 'BCM RR' },
  eps: { x: 28, y: 46, short: 'STEERING' },
  tpms: { x: 50, y: 22, short: 'TPMS' },
  climate: { x: 34, y: 66, short: 'CLIMATE' },
  epb: { x: 78, y: 55, short: 'PARK BRK' },
  'park-assist': { x: 94, y: 50, short: 'PARK ASST' },
  'mod-7f1': { x: 58, y: 40, short: 'GATEWAY' },
};

const STATE_STYLE: Record<MapState, { fill: string; label: string }> = {
  fault: { fill: '#D5001C', label: 'Fault stored' },
  clean: { fill: '#3CD37A', label: 'Reached · clean' },
  refused: { fill: '#E0A100', label: 'Present · declined' },
  silent: { fill: '#B4B4B8', label: 'No response' },
  unknown: { fill: '#fff', label: 'Not scanned' },
};

// Pin fill for the 3D view — like STATE_STYLE but 'unknown' is a visible grey
// (a white pin would vanish against the light 3D scene background).
function pinColorFor(state: MapState): string {
  return state === 'unknown' ? '#9A9AA0' : STATE_STYLE[state].fill;
}

// True top-view silhouette traced from the real 981 Boxster model
// (public/models/boxster-real.glb): triangles projected onto the ground plane,
// outline + greenhouse iso-contour extracted, simplified. Nose LEFT, door
// mirrors included. Regenerate with:
//   node tools/trace-topview.mjs public/models/boxster-real.glb 0.76
const CAR_TOP_VIEWBOX = '0 0 300 144';
const CAR_TOP_OUTLINE =
  'M136.0,8.9L131.1,10.5L127.5,13.3L119.9,15.1L66.3,15.1L42.3,16.9L32.0,20.0L26.7,23.8L22.0,29.7L18.4,35.5L14.1,43.3L11.0,50.9L9.0,61.4L8.6,73.8L9.2,84.6L11.5,95.0L22.0,113.2L27.4,120.4L30.5,122.8L34.6,124.4L49.1,127.8L80.1,128.5L119.7,128.1L126.6,129.4L131.6,133.2L136.0,134.7L137.0,134.7L137.7,133.6L136.3,128.1L138.6,127.8L166.1,127.4L178.4,128.6L188.5,128.0L216.5,129.3L239.8,129.0L258.5,127.5L264.5,126.3L271.6,123.1L276.2,120.4L279.1,117.5L281.9,113.1L285.8,104.3L289.9,88.4L291.1,73.8L290.8,61.5L289.9,54.8L287.8,45.2L284.6,35.9L280.7,27.8L277.8,23.9L273.8,21.2L265.6,17.1L259.1,14.9L255.3,14.3L215.3,13.9L192.2,15.2L179.7,14.7L166.2,15.8L138.6,15.4L136.3,15.1L138.4,8.7L137.2,8.7Z';
const CAR_TOP_CABIN =
  'M140.0,25.0L126.2,25.5L123.0,26.2L120.6,28.2L112.8,38.6L109.3,40.3L104.6,40.2L101.3,48.8L99.1,57.2L97.7,69.8L97.8,79.0L99.1,86.0L101.4,94.6L104.5,101.5L105.9,102.6L111.1,103.4L112.8,104.6L121.7,116.2L129.4,117.6L136.0,117.9L160.3,117.5L186.4,115.9L189.0,116.6L197.6,116.2L207.7,115.0L213.1,113.6L217.5,111.7L224.5,106.8L226.6,99.7L227.4,98.6L230.7,96.7L231.8,93.1L233.9,92.2L235.2,90.9L236.4,88.2L236.6,86.1L238.2,84.3L238.7,81.4L238.7,61.8L238.2,59.0L236.5,56.7L235.9,53.5L234.1,51.2L231.8,50.2L230.2,45.9L227.4,44.6L223.7,36.4L217.1,31.2L210.6,28.8L199.2,27.0L190.4,26.6L186.4,27.3L173.1,26.1L141.7,25.1Z';

// Approximate anchors on the exterior GLB as "nx ny nz" fractions of the model
// AABB half-extents from center. Convention (from lib/exterior-parts.ts):
// +Z = front, −Z = rear, +Y = up, +X = left. First-pass placements — refine on
// the real model. Modules without an anchor fall back to the "other" list.
const MODULE_3D_POS: Record<string, string> = {
  'bcm-front': '0.15 0.05 0.55', // front luggage compartment
  psm: '0 -0.05 0.45', // ABS unit, front
  cluster: '0.4 0.4 0.35', // driver-side dash
  pcm: '0 0.25 0.3', // centre dash (head unit)
  airbag: '0 -0.1 0.15', // centre console
  gateway: '0 0 0.2', // central, under dash
  dme: '0.15 0 -0.5', // mid-engine bay, behind cabin
  pdk: '0 -0.2 -0.7', // transaxle, rear
  'bcm-rear': '0.15 0.05 -0.55', // rear compartment
  eps: '0 0 0.45', // steering rack, front axle
  tpms: '0 0.1 0.15', // central receiver
  climate: '0 0.1 0.32', // centre console
  epb: '0 -0.2 -0.55', // rear axle
  'park-assist': '0 0 -0.85', // rear bumper
  'mod-7f1': '0 0 0.2', // central gateway, under dash
};

/**
 * Merge every data source into one module list, keyed by id. Data-driven: the
 * set of modules comes from the per-generation registry + the DME fault read +
 * the UDS scan results — NOT a hardcoded list — so newly-discovered modules and
 * their faults always surface. Codes from the Mode 03/07/0A read AND the UDS
 * scan are merged (a clean emissions read must not mask a UDS fault on the same
 * ECU). `fault` wins over `clean` wins over `refused` wins over `silent`.
 */
function buildMapModules(modules: FaultModule[], scan: ModuleScanData | null, generation: string): MapModule[] {
  type Acc = { name?: string; codes: string[]; reached: boolean; refused: boolean; silent: boolean };
  const byId = new Map<string, Acc>();
  const at = (id: string): Acc => {
    let a = byId.get(id);
    if (!a) byId.set(id, (a = { codes: [], reached: false, refused: false, silent: false }));
    return a;
  };

  // Registry gives the expected module set + names for this generation.
  for (const m of udsModulesFor(generation)) at(m.id).name ??= m.name;

  // DME (and any other *available* module) from the generic Mode 03/07/0A read.
  for (const m of modules) {
    if (!m.available) continue;
    const a = at(m.id);
    a.name = m.name;
    a.reached = true;
    a.codes.push(...(m.confirmed ?? []), ...(m.pending ?? []), ...(m.permanent ?? []));
  }

  // Per-module UDS/KWP scan results.
  for (const r of scan?.results ?? []) {
    const a = at(r.id);
    a.name = r.name;
    if (r.reachable === 'positive') {
      a.reached = true;
      a.codes.push(...(r.confirmedDtcs ?? []), ...(r.pendingDtcs ?? []));
    } else if (r.reachable === 'refused') a.refused = true;
    else a.silent = true;
  }

  return [...byId.entries()].map(([id, a]) => {
    const codes = [...new Set(a.codes)];
    const state: MapState = codes.length
      ? 'fault'
      : a.reached
        ? 'clean'
        : a.refused
          ? 'refused'
          : a.silent
            ? 'silent'
            : 'unknown';
    const pos = MODULE_MAP_POS[id];
    return { id, name: a.name ?? id, short: pos?.short ?? '', state, codes, x: pos?.x ?? null, y: pos?.y ?? null };
  });
}

function SaveScanControl({
  onSave,
  disabled,
}: {
  onSave: () => Promise<{ ok: boolean; error?: string }>;
  disabled: boolean;
}) {
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const doSave = async () => {
    setSaving(true);
    setMsg(null);
    const r = await onSave();
    setSaving(false);
    setMsg(r.ok ? 'Saved — an AI assistant can read this scan over MCP.' : (r.error ?? 'Save failed'));
  };
  return (
    <>
      <button
        type="button"
        onClick={doSave}
        disabled={disabled || saving}
        style={{ ...btnBase, background: '#0B0B0C', color: '#fff', opacity: saving ? 0.7 : 1 }}
      >
        {saving ? 'Saving…' : 'Save scan'}
      </button>
      {msg && <span style={{ font: `500 12px/1.4 ${mono}`, color: '#6E6E73', alignSelf: 'center' }}>{msg}</span>}
    </>
  );
}

function ClearFaultsControl({
  onClear,
  disabled,
}: {
  onClear: () => Promise<ClearResult | null>;
  disabled: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const [working, setWorking] = useState(false);
  const [result, setResult] = useState<ClearResult | null>(null);

  const doClear = async () => {
    setWorking(true);
    const r = await onClear();
    setResult(r);
    setWorking(false);
    setConfirming(false);
  };

  if (confirming) {
    return (
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 10,
          alignItems: 'center',
          padding: '10px 14px',
          border: '1px solid rgba(213,0,28,.35)',
          borderRadius: 6,
          background: '#fff',
        }}
      >
        <span style={{ font: `400 13px/1.4 ${sans}`, color: '#8A0011', flex: '1 1 260px' }}>
          Clear all stored codes? This also resets emissions-readiness monitors, and an active fault (like a live P000C)
          will return on the next drive. Not reversible.
        </span>
        <button
          type="button"
          style={{ ...btnBase, background: '#D5001C', color: '#fff' }}
          disabled={working}
          onClick={doClear}
        >
          {working ? 'Clearing…' : 'Yes, clear codes'}
        </button>
        <button
          type="button"
          style={{ ...btnBase, background: '#fff', color: '#0B0B0C', border: '1px solid #C9C9CD' }}
          disabled={working}
          onClick={() => setConfirming(false)}
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        style={{ ...btnBase, background: '#fff', color: '#8A0011', border: '1px solid rgba(213,0,28,.35)' }}
        disabled={disabled}
        onClick={() => {
          setResult(null);
          setConfirming(true);
        }}
      >
        Clear fault codes
      </button>
      {result && (
        <span style={{ font: `500 12px/1.4 ${mono}`, color: result.cleared.length ? '#1A7A42' : '#8A0011' }}>
          {result.cleared.length ? `Cleared: ${result.cleared.join(', ')}` : 'No memory acknowledged the clear'}
          {result.errors.length ? ` (${result.errors.map((e) => `${e.cmd}: ${e.message}`).join('; ')})` : ''}
        </span>
      )}
    </>
  );
}

function FaultsPanel({
  modules,
  onRefresh,
  busy,
  connected,
  describeDtc,
  moduleScan,
  onScanModules,
  onClearFaults,
  onSaveScan,
  generation,
  glbSrc,
  paintHex,
}: {
  modules: FaultModule[];
  onRefresh: () => void;
  busy: boolean;
  connected: boolean;
  describeDtc: (code: string) => FaultCode | undefined;
  moduleScan: ModuleScanData | null;
  onScanModules: () => void;
  onClearFaults: () => Promise<ClearResult | null>;
  onSaveScan: () => Promise<{ ok: boolean; error?: string }>;
  generation: string;
  glbSrc: string;
  paintHex?: string;
}) {
  const [focusId, setFocusId] = useState<string | null>(null);
  const mapModules = useMemo(
    () => buildMapModules(modules, moduleScan, generation),
    [modules, moduleScan, generation],
  );

  const jumpTo = (id: string) => {
    setFocusId(id);
    if (typeof document !== 'undefined') {
      requestAnimationFrame(() => {
        document.getElementById(`obd-mod-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }
    window.setTimeout(() => setFocusId((cur) => (cur === id ? null : cur)), 2400);
  };

  return (
    <section style={card}>
      <h2 style={cardHead}>Fault codes</h2>
      <div style={{ padding: '20px 22px 24px' }}>
        <p style={{ margin: '0 0 14px', font: `400 14px/1.5 ${sans}`, color: '#3A3A3E' }}>
          Generic OBD Mode 03 / 07 / 0A reads the engine emissions ECU (DME) only. Run the module scan below to probe
          the rest. Click a code to look it up in Fault Finding.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 14, alignItems: 'center' }}>
          <button
            type="button"
            style={{ ...btnBase, background: '#fff', color: '#0B0B0C', border: '1px solid #C9C9CD' }}
            disabled={!connected || busy}
            onClick={onRefresh}
          >
            Refresh faults
          </button>
          <ClearFaultsControl onClear={onClearFaults} disabled={!connected || busy} />
          <SaveScanControl onSave={onSaveScan} disabled={!connected || busy} />
        </div>

        {(modules.length > 0 || moduleScan) && (
          <FaultMap
            modules={mapModules}
            describeDtc={describeDtc}
            onJump={jumpTo}
            glbSrc={glbSrc}
            paintHex={paintHex}
          />
        )}

        {!modules.length ? (
          <p style={{ margin: 0, color: '#6E6E73', font: `400 14px/1.5 ${sans}` }}>
            {connected ? 'No fault scan yet.' : 'Connect to scan fault codes.'}
          </p>
        ) : (
          modules.map((m) => (
            <div
              key={m.id}
              id={m.available ? `obd-mod-${m.id}` : undefined}
              className={m.available && focusId === m.id ? 'obdCardFlash' : undefined}
              style={{ borderRadius: 6 }}
            >
              <ModuleCard module={m} describeDtc={describeDtc} />
            </div>
          ))
        )}

        <ModuleScanSection
          scan={moduleScan}
          onScan={onScanModules}
          busy={busy}
          connected={connected}
          describeDtc={describeDtc}
          generation={generation}
          focusId={focusId}
        />
      </div>
    </section>
  );
}

/** Module health map — schematic silhouette or the real 3D car, pins by state. */
function FaultMap({
  modules,
  describeDtc,
  onJump,
  glbSrc,
  paintHex,
}: {
  modules: MapModule[];
  describeDtc: (code: string) => FaultCode | undefined;
  onJump: (id: string) => void;
  glbSrc: string;
  paintHex?: string;
}) {
  const [sel, setSel] = useState<string | null>(null);
  const [view, setView] = useState<'schematic' | '3d'>('schematic');
  const selected = modules.find((m) => m.id === sel) ?? null;

  // Pins go on the silhouette; modules with no known location but a real result
  // (reached / faulted / refused) are listed below so faults are never hidden.
  const pins = useMemo(() => modules.filter((m) => m.x != null && m.y != null), [modules]);
  const others = useMemo(() => modules.filter((m) => m.x == null && m.state !== 'unknown'), [modules]);

  // 3D pins: the same modules, anchored on the exterior GLB and coloured by state.
  const parts3d = useMemo<EnginePart[]>(
    () =>
      modules
        .filter((m) => MODULE_3D_POS[m.id])
        .map((m) => ({
          id: m.id,
          node: '',
          label: `${m.name} — ${STATE_STYLE[m.state].label}`,
          assembly: 'ECU',
          system: 'Electrical',
          hotspotNorm: MODULE_3D_POS[m.id],
          pinColor: pinColorFor(m.state),
          pinBadge: m.state === 'fault' ? String(m.codes.length) : '',
        })),
    [modules],
  );

  const counts = useMemo(() => {
    const c: Record<MapState, number> = { fault: 0, clean: 0, refused: 0, silent: 0, unknown: 0 };
    for (const m of modules) c[m.state] += 1;
    return c;
  }, [modules]);

  const legend: MapState[] = ['fault', 'clean', 'refused', 'silent', 'unknown'];

  const segBtn = (active: boolean): CSSProperties => ({
    minHeight: 36,
    padding: '0 12px',
    borderRadius: 4,
    border: active ? '1px solid #0B0B0C' : '1px solid #C9C9CD',
    background: active ? '#0B0B0C' : '#fff',
    color: active ? '#fff' : '#0B0B0C',
    font: `600 10px/1 ${mono}`,
    letterSpacing: '.1em',
    textTransform: 'uppercase',
    cursor: 'pointer',
  });

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <span style={{ font: `600 11px/1 ${mono}`, letterSpacing: '.1em', color: '#0B0B0C', textTransform: 'uppercase' }}>
          Module map
        </span>
        <div style={{ display: 'inline-flex', gap: 6, marginLeft: 'auto' }}>
          <button type="button" style={segBtn(view === 'schematic')} onClick={() => setView('schematic')}>
            Schematic
          </button>
          <button type="button" style={segBtn(view === '3d')} onClick={() => setView('3d')}>
            3D
          </button>
        </div>
        <span
          title="X-ray cutaway view is coming soon"
          style={{
            font: `600 9px/1 ${mono}`,
            letterSpacing: '.1em',
            textTransform: 'uppercase',
            padding: '5px 8px',
            borderRadius: 2,
            background: '#F0F0F1',
            color: '#9A9AA0',
          }}
        >
          X-ray · soon
        </span>
      </div>

      {view === '3d' && (
        <div
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: 560,
            margin: '0 auto',
            height: 'clamp(280px, 56vw, 420px)',
            border: '1px solid #E3E3E5',
            borderRadius: 8,
            overflow: 'hidden',
            background: '#eef0f2',
          }}
        >
          <ObdCarViewer
            src={glbSrc}
            paintHex={paintHex}
            parts={parts3d}
            selectedPartId={sel}
            onSelectPart={(id) => setSel((prev) => (prev === id ? null : id))}
          />
        </div>
      )}

      {view === 'schematic' && (
      <div className="obdFaultMap" style={{ position: 'relative', width: '100%', maxWidth: 560, margin: '0 auto', aspectRatio: '300 / 144' }}>
        <svg viewBox={CAR_TOP_VIEWBOX} width="100%" height="100%" aria-hidden style={{ display: 'block' }}>
          <path d={CAR_TOP_OUTLINE} fill="#F4F4F5" stroke="#C9C9CD" strokeWidth={1.6} strokeLinejoin="round" />
          <path d={CAR_TOP_CABIN} fill="#ECECEE" stroke="#D8D8DC" strokeWidth={1.2} strokeLinejoin="round" />
          <text x={24} y={106} fill="#B4B4B8" style={{ font: `600 8px ${mono}`, letterSpacing: '.1em' }}>
            FRONT
          </text>
          <text x={252} y={106} fill="#B4B4B8" style={{ font: `600 8px ${mono}`, letterSpacing: '.1em' }}>
            REAR
          </text>
        </svg>

        {pins.map((m) => {
          const st = STATE_STYLE[m.state];
          const active = sel === m.id;
          return (
            <button
              key={m.id}
              type="button"
              className="obdMapPin"
              aria-label={`${m.name}: ${st.label}${m.codes.length ? `, ${m.codes.length} codes` : ''}`}
              aria-pressed={active}
              onClick={() => setSel((prev) => (prev === m.id ? null : m.id))}
              style={{
                position: 'absolute',
                left: `${m.x}%`,
                top: `${m.y}%`,
                transform: 'translate(-50%, -50%)',
                width: 34,
                height: 34,
                borderRadius: '50%',
                background: 'transparent',
                border: 'none',
                padding: 0,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: active ? 4 : 3,
              }}
            >
              <span
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  background: m.state === 'unknown' ? '#fff' : st.fill,
                  border: active ? '3px solid #0B0B0C' : m.state === 'unknown' ? '2px dashed #B4B4B8' : '2px solid #fff',
                  boxShadow: '0 1px 3px rgba(0,0,0,.3)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  font: `700 10px/1 ${mono}`,
                  color: '#fff',
                }}
              >
                {m.state === 'fault' ? m.codes.length : ''}
              </span>
            </button>
          );
        })}
      </div>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', margin: '14px 0 0' }}>
        {legend.map((s) => (
          <span
            key={s}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              font: `500 11px/1 ${mono}`,
              color: counts[s] ? '#3A3A3E' : '#B4B4B8',
            }}
          >
            <span
              style={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                background: s === 'unknown' ? '#fff' : STATE_STYLE[s].fill,
                border: s === 'unknown' ? '1.5px dashed #B4B4B8' : '1.5px solid #fff',
                boxShadow: '0 0 0 1px #E3E3E5',
              }}
            />
            {STATE_STYLE[s].label} · {counts[s]}
          </span>
        ))}
      </div>

      <p style={{ margin: '10px 0 0', font: `400 12px/1.5 ${sans}`, color: '#9A9AA0', textAlign: 'center' }}>
        {view === '3d'
          ? 'Approximate locations on the exterior body — drag to rotate, tap a pin. X-ray cutaway coming soon.'
          : 'Schematic placement — tap a module for its codes.'}
      </p>

      {others.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ font: `600 10px/1 ${mono}`, letterSpacing: '.12em', color: '#6E6E73', textTransform: 'uppercase', marginBottom: 10 }}>
            Other modules (no mapped location)
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {others.map((m) => {
              const st = STATE_STYLE[m.state];
              const active = sel === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setSel((prev) => (prev === m.id ? null : m.id))}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    minHeight: 40,
                    padding: '8px 12px',
                    borderRadius: 4,
                    border: `1px solid ${active ? '#0B0B0C' : '#E3E3E5'}`,
                    background: '#fff',
                    cursor: 'pointer',
                    font: `500 12px/1.2 ${sans}`,
                    color: '#0B0B0C',
                  }}
                >
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: st.fill, boxShadow: '0 0 0 1px #E3E3E5', flexShrink: 0 }} />
                  {m.name}
                  {m.state === 'fault' && (
                    <span style={{ font: `700 10px/1 ${mono}`, color: '#D5001C' }}>· {m.codes.length}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {selected && (
        <div
          style={{
            marginTop: 14,
            background: '#fff',
            border: `1px solid ${
              selected.state === 'fault'
                ? 'rgba(213,0,28,.3)'
                : selected.state === 'clean'
                  ? 'rgba(27,138,75,.35)'
                  : selected.state === 'refused'
                    ? 'rgba(178,106,0,.35)'
                    : '#E3E3E5'
            }`,
            borderRadius: 6,
            padding: '14px 16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
            <span style={{ font: `600 14px/1.2 ${sans}` }}>{selected.name}</span>
            <span
              style={{
                font: `600 9px/1 ${mono}`,
                letterSpacing: '.1em',
                textTransform: 'uppercase',
                padding: '4px 8px',
                borderRadius: 2,
                background: selected.state === 'unknown' ? '#F0F0F1' : STATE_STYLE[selected.state].fill,
                color: selected.state === 'unknown' ? '#6E6E73' : '#fff',
              }}
            >
              {STATE_STYLE[selected.state].label}
            </span>
          </div>
          {selected.codes.length ? (
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {selected.codes.map((c) => {
                const info = describeDtc(c);
                return (
                  <li key={c}>
                    <Link
                      href={`/faults?q=${encodeURIComponent(c)}`}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        minHeight: 40,
                        padding: '8px 12px',
                        borderRadius: 4,
                        border: '1px solid #E3E3E5',
                        background: '#fff',
                        textDecoration: 'none',
                      }}
                    >
                      <span style={{ color: '#D5001C', font: `600 13px/1 ${mono}` }}>{c}</span>
                      {info && <SeverityTag severity={info.severity} />}
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p style={{ margin: 0, font: `400 13px/1.5 ${sans}`, color: '#6E6E73' }}>
              {selected.state === 'clean'
                ? 'Reached and reported no stored codes.'
                : selected.state === 'refused'
                  ? 'Module answered but declined the read — the address looks right.'
                  : selected.state === 'silent'
                    ? 'No response at this address on this car.'
                    : 'Not scanned yet — run the module scan below.'}
            </p>
          )}
          {selected.state !== 'unknown' && (
            <button
              type="button"
              onClick={() => onJump(selected.id)}
              style={{
                marginTop: 12,
                minHeight: 40,
                padding: '0 14px',
                borderRadius: 4,
                border: '1px solid #C9C9CD',
                background: '#fff',
                color: '#0B0B0C',
                font: `600 11px/1 ${mono}`,
                letterSpacing: '.08em',
                textTransform: 'uppercase',
                cursor: 'pointer',
              }}
            >
              Jump to details ↓
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function ModuleScanSection({
  scan,
  onScan,
  busy,
  connected,
  describeDtc,
  generation,
  focusId,
}: {
  scan: ModuleScanData | null;
  onScan: () => void;
  busy: boolean;
  connected: boolean;
  describeDtc: (code: string) => FaultCode | undefined;
  generation: string;
  focusId: string | null;
}) {
  const reach: Record<string, { bg: string; fg: string; label: string }> = {
    positive: { bg: '#E8F8EE', fg: '#1A7A42', label: 'ANSWERED' },
    refused: { bg: '#FCEFD8', fg: '#8A5A00', label: 'REACHED · DECLINED' },
    silent: { bg: '#F0F0F1', fg: '#6E6E73', label: 'NO RESPONSE' },
  };
  return (
    <div style={{ marginTop: 26, borderTop: '1px solid #F0F0F1', paddingTop: 20 }}>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ font: `600 12px/1 ${mono}`, letterSpacing: '.1em', color: '#0B0B0C', textTransform: 'uppercase' }}>
          Module scan (UDS / KWP · beta)
        </span>
        <span style={{ font: `600 9px/1 ${mono}`, letterSpacing: '.1em', padding: '4px 8px', borderRadius: 2, background: '#F0F0F1', color: '#6E6E73' }}>
          {generation}
        </span>
      </div>
      <p style={{ margin: '0 0 14px', font: `400 13px/1.5 ${sans}`, color: '#6E6E73' }}>
        Read-only probe of non-DME modules (ABS, PDK, airbag, cluster…). Non-DME addresses are candidates until confirmed
        on a real car — <strong>PRESENT · REFUSED</strong> still means the address is right; <strong>NO RESPONSE</strong> means
        the id or gateway routing needs adjusting. Requires ignition on.
      </p>
      <button
        type="button"
        style={{ ...btnBase, background: '#0B0B0C', color: '#fff', marginBottom: 14 }}
        disabled={!connected || busy}
        onClick={onScan}
      >
        {busy ? 'Scanning…' : 'Scan modules'}
      </button>

      {!scan ? (
        <p style={{ margin: 0, color: '#6E6E73', font: `400 14px/1.5 ${sans}` }}>
          {connected ? 'No module scan yet.' : 'Connect to scan modules.'}
        </p>
      ) : (
        <div>
          {scan.results.map((r) => {
            const tone = reach[r.reachable];
            return (
              <div
                key={r.id}
                id={r.id !== 'dme' ? `obd-mod-${r.id}` : undefined}
                className={r.id !== 'dme' && focusId === r.id ? 'obdCardFlash' : undefined}
                style={{ border: '1px solid #E3E3E5', borderRadius: 6, padding: '14px 16px', marginBottom: 12 }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                  <span style={{ font: `600 13px/1.2 ${sans}` }}>
                    {r.name}{' '}
                    <span style={{ font: `500 11px/1 ${mono}`, color: '#9A9AA0' }}>
                      {r.reqId} · {r.protocol === 'obd' ? 'OBD-II' : r.protocol.toUpperCase()}
                    </span>
                  </span>
                  <span style={{ font: `600 9px/1 ${mono}`, letterSpacing: '.1em', padding: '4px 8px', borderRadius: 2, background: tone.bg, color: tone.fg }}>
                    {tone.label}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: r.reachable === 'positive' ? 10 : 0 }}>
                  {!r.addressConfirmed && <Chip>candidate address</Chip>}
                  {r.sessionOk && <Chip ok>ext. session OK</Chip>}
                  {r.detail && <Chip>declined: {r.detail}</Chip>}
                  {r.reachable === 'silent' && r.addressConfirmed && <Chip>no reply at this id</Chip>}
                  {r.error && <Chip ok={false}>{r.error}</Chip>}
                </div>
                {r.reachable === 'positive' && (
                  <>
                    <DtcList label="Confirmed" codes={r.confirmedDtcs} describeDtc={describeDtc} />
                    <DtcList label="Pending" codes={r.pendingDtcs} describeDtc={describeDtc} />
                  </>
                )}
              </div>
            );
          })}
          <p style={{ margin: '4px 0 0', font: `400 12px/1.5 ${sans}`, color: '#9A9AA0' }}>{scan.note}</p>
        </div>
      )}
    </div>
  );
}

function ModuleCard({
  module: m,
  describeDtc,
}: {
  module: FaultModule;
  describeDtc: (code: string) => FaultCode | undefined;
}) {
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
      <DtcList label="Confirmed (Mode 03)" codes={m.confirmed} describeDtc={describeDtc} />
      <DtcList label="Pending (Mode 07)" codes={m.pending} describeDtc={describeDtc} />
      <DtcList label="Permanent (Mode 0A)" codes={m.permanent} describeDtc={describeDtc} />
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

function DtcList({
  label,
  codes,
  describeDtc,
}: {
  label: string;
  codes: string[];
  describeDtc: (code: string) => FaultCode | undefined;
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ font: `600 11px/1 ${mono}`, letterSpacing: '.08em', color: '#9A9AA0', marginBottom: 8 }}>
        {label}
      </div>
      {!codes?.length ? (
        <div style={{ color: '#6E6E73', font: `400 14px/1.4 ${sans}`, padding: '8px 0' }}>(none)</div>
      ) : (
        <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
          {codes.map((c) => {
            const info = describeDtc(c);
            return (
              <li key={c} style={{ margin: '6px 0' }}>
                <Link
                  href={`/faults?q=${encodeURIComponent(c)}`}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    flexDirection: 'column',
                    gap: 6,
                    minHeight: 44,
                    padding: '10px 14px',
                    borderRadius: 4,
                    border: '1px solid #E3E3E5',
                    background: '#fff',
                    textDecoration: 'none',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{ color: '#D5001C', font: `600 14px/1.3 ${mono}` }}>{c}</span>
                    {info && <SeverityTag severity={info.severity} />}
                  </span>
                  {info ? (
                    <span style={{ color: '#3A3A3E', font: `400 13px/1.4 ${sans}` }}>{info.title}</span>
                  ) : (
                    <span style={{ color: '#9A9AA0', font: `400 12px/1.4 ${sans}` }}>
                      No description on file — tap to search Fault Finding
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function SeverityTag({ severity }: { severity: FaultCode['severity'] }) {
  const map: Record<string, { bg: string; fg: string }> = {
    HIGH: { bg: '#FBE3E6', fg: '#8A0011' },
    MED: { bg: '#FCEFD8', fg: '#8A5A00' },
    LOW: { bg: '#E8F8EE', fg: '#1A7A42' },
  };
  const tone = map[severity] ?? { bg: '#F0F0F1', fg: '#6E6E73' };
  return (
    <span
      style={{
        font: `600 9px/1 ${mono}`,
        letterSpacing: '.1em',
        textTransform: 'uppercase',
        padding: '4px 8px',
        borderRadius: 2,
        background: tone.bg,
        color: tone.fg,
      }}
    >
      {severity}
    </span>
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

/** Small "?" affordance with a tap/hover popover. Works on touch and mouse. */
// A "?" that toggles a plain-English note. The note expands full-width BELOW
// the header (flex-basis:100% inside a flex-wrap row) rather than floating, so
// it never clips off-screen on a phone/tablet. Parent row must be flex-wrap.
function HelpTip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        aria-label={open ? 'Hide explanation' : 'What is this?'}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        style={{
          width: 20,
          height: 20,
          borderRadius: '50%',
          border: `1px solid ${open ? '#0B0B0C' : '#C9C9CD'}`,
          background: open ? '#0B0B0C' : '#fff',
          color: open ? '#fff' : '#6E6E73',
          font: `700 11px/1 ${mono}`,
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0,
          flexShrink: 0,
        }}
      >
        ?
      </button>
      {open && (
        <span
          role="tooltip"
          style={{
            flexBasis: '100%',
            width: '100%',
            marginTop: 8,
            background: '#F4F4F5',
            border: '1px solid #E9E9EB',
            borderRadius: 6,
            padding: '10px 12px',
            textAlign: 'left',
            textTransform: 'none',
            letterSpacing: 0,
            font: `400 12px/1.55 ${sans}`,
            color: '#3A3A3E',
          }}
        >
          {text}
        </span>
      )}
    </>
  );
}

/** Plain-English explanation of a Mode 06 monitor, keyed by its label prefix. */
function monitorHelp(monitor: string): string {
  const m = monitor.toLowerCase();
  if (m.startsWith('o2 sensor'))
    return 'Checks one oxygen sensor’s switching speed and voltage. A lazy or slow sensor shows up here — often before it trips a check-engine light — and can quietly hurt fuel economy.';
  if (m.startsWith('misfire'))
    return 'Counts combustion events the ECU flagged as misfires. “General” is the whole engine; a per-cylinder row points at one coil, plug, or injector. A handful of counts is normal — steadily climbing numbers are not.';
  if (m.startsWith('catalyst'))
    return 'Rates how well the catalytic converter is cleaning the exhaust by comparing the sensors before and after it. A failing result is the classic P0420 / P0430.';
  if (m.startsWith('evap'))
    return 'Tests the fuel-vapour (EVAP) system for leaks — sometimes as small as a loose or worn fuel cap.';
  if (m.startsWith('egr') || m.includes('vvt'))
    return 'Checks that the exhaust-gas-recirculation / variable-valve-timing actuators respond the way the ECU commanded.';
  if (m.startsWith('secondary air'))
    return 'Checks the cold-start air pump that helps the catalytic converter warm up and start working sooner.';
  return 'One of the ECU’s built-in self-tests. The bar shows where the measured value landed between the ECU’s own pass/fail limits — inside = PASS, outside = FAIL.';
}

function Mode06Panel({
  data,
  onRefresh,
  busy,
  connected,
}: {
  data: Mode06Data | null;
  onRefresh: () => void;
  busy: boolean;
  connected: boolean;
}) {
  // Group tests by monitor label for readability.
  const groups = useMemo(() => {
    const map = new Map<string, NonNullable<Mode06Data['tests']>>();
    for (const t of data?.tests ?? []) {
      const list = map.get(t.monitor) ?? [];
      list.push(t);
      map.set(t.monitor, list);
    }
    return [...map.entries()];
  }, [data]);

  return (
    <section style={card}>
      <h2 style={cardHead}>On-board monitors · Mode 06</h2>
      <div style={{ padding: '20px 22px 24px' }}>
        <p style={{ margin: '0 0 14px', font: `400 14px/1.5 ${sans}`, color: '#3A3A3E' }}>
          Each row is a self-diagnostic the ECU runs continuously (O2 response, catalyst efficiency, per-cylinder misfire
          counts…). The bar shows where the latest measured value sits between the ECU&apos;s own <strong>min and max
          limits</strong>: <strong>PASS</strong> = inside the limits, <strong>FAIL</strong> = outside. The numbers are the
          ECU&apos;s internal test units — Mode 06 doesn&apos;t standardise scaling across test types, so the pass/fail and
          the bar position are the signal, not the absolute value. Misfire monitors are the exception: those values are
          plain counts.
        </p>
        <button
          type="button"
          style={{ ...btnBase, background: '#fff', color: '#0B0B0C', border: '1px solid #C9C9CD', marginBottom: 14 }}
          disabled={!connected || busy}
          onClick={onRefresh}
        >
          {busy ? 'Reading…' : 'Read monitors'}
        </button>

        {!data ? (
          <p style={{ margin: 0, color: '#6E6E73', font: `400 14px/1.5 ${sans}` }}>
            {connected ? 'No monitor read yet.' : 'Connect to read on-board monitors.'}
          </p>
        ) : !groups.length ? (
          <p style={{ margin: 0, color: '#6E6E73', font: `400 14px/1.5 ${sans}` }}>
            This ECU reported no Mode 06 test results
            {data.supportedMids.length ? ` (MIDs seen: ${data.supportedMids.join(', ')}).` : '.'}
          </p>
        ) : (
          <>
            <Mode06Summary data={data} />
            {groups.map(([monitor, tests]) => (
              <div key={monitor} style={{ marginBottom: 18 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <span style={{ font: `600 11px/1 ${mono}`, letterSpacing: '.08em', color: '#0B0B0C' }}>{monitor}</span>
                  <HelpTip text={monitorHelp(monitor)} />
                </div>
                <div style={{ display: 'grid', gap: 8 }}>
                  {tests.map((t, i) => (
                    <Mode06Row key={`${t.mid}-${t.tid}-${i}`} test={t} />
                  ))}
                </div>
              </div>
            ))}
          </>
        )}
        {!!data?.errors?.length && (
          <div style={{ marginTop: 10, color: '#8A0011', font: `500 12px/1.4 ${mono}` }}>
            {data.errors.map((e) => `MID ${e.mid}: ${e.message}`).join('\n')}
          </div>
        )}
      </div>
    </section>
  );
}

function Mode06Summary({ data }: { data: Mode06Data }) {
  const total = data.tests.length;
  const passed = data.tests.filter((t) => t.result === 'pass').length;
  const failed = data.tests.filter((t) => t.result === 'fail').length;
  const unknown = data.tests.filter((t) => t.result === 'unknown').length;
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 8,
        alignItems: 'center',
        marginBottom: 18,
        paddingBottom: 14,
        borderBottom: '1px solid #F0F0F1',
      }}
    >
      <Chip ok>Read OK · {total} tests</Chip>
      <Chip ok>{passed} passed</Chip>
      {failed > 0 && <Chip ok={false}>{failed} failed</Chip>}
      {unknown > 0 && <Chip>{unknown} unreadable limits</Chip>}
    </div>
  );
}

function Mode06Row({ test: t }: { test: Mode06Test }) {
  const span = t.max - t.min;
  const frac = span > 0 ? Math.min(1, Math.max(0, (t.value - t.min) / span)) : null;
  const tone =
    t.result === 'pass'
      ? { bar: '#3CD37A', label: 'PASS', ok: true as const }
      : t.result === 'fail'
        ? { bar: '#D5001C', label: 'FAIL', ok: false as const }
        : { bar: '#B4B4B8', label: '—', ok: undefined };
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        flexWrap: 'wrap',
        border: '1px solid #E3E3E5',
        borderRadius: 4,
        padding: '10px 14px',
      }}
    >
      <span style={{ font: `500 11px/1.4 ${mono}`, color: '#9A9AA0', width: 56, flexShrink: 0 }}>TID {t.tid}</span>
      <div style={{ flex: '1 1 160px', minWidth: 140 }}>
        <div style={{ position: 'relative', height: 6, background: '#EEEEF0', borderRadius: 3 }}>
          {frac != null && (
            <span
              style={{
                position: 'absolute',
                top: -3,
                left: `calc(${frac * 100}% - 6px)`,
                width: 12,
                height: 12,
                borderRadius: '50%',
                background: tone.bar,
                border: '2px solid #fff',
                boxShadow: '0 0 0 1px #E3E3E5',
              }}
            />
          )}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, font: `500 11px/1 ${mono}`, color: '#6E6E73' }}>
          <span>{t.min}</span>
          <span style={{ color: '#0B0B0C', fontWeight: 600 }}>{t.value}</span>
          <span>{t.max}</span>
        </div>
      </div>
      <Chip ok={tone.ok}>{tone.label}</Chip>
    </div>
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
