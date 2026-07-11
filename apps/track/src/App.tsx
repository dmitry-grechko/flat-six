import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  AdapterKind,
  FaultsData,
  LiveData,
  ObdClient,
  ObdStatus,
  PortInfo,
  VehicleInfo,
} from '../../../lib/obd/types';
import {
  DEFAULT_GENERATION,
  KNOWLEDGE_GENERATIONS,
  ensureKnowledgePack,
  offlineSearch,
} from './knowledge';
import {
  deleteSession,
  listSessions,
  saveSession,
  type TrackSession,
} from './storage';
import { createObdClient, detectShell, webSerialAvailable, type ShellKind } from './transport';

type Tab = 'connect' | 'live' | 'faults' | 'knowledge' | 'sessions';

export function App() {
  const shell = useMemo(() => detectShell(), []);
  const [client] = useState<ObdClient>(() => createObdClient());
  const [tab, setTab] = useState<Tab>('connect');
  const [status, setStatus] = useState<ObdStatus | null>(null);
  const [ports, setPorts] = useState<PortInfo[]>([]);
  const [port, setPort] = useState('');
  const [baud, setBaud] = useState(38400);
  const [adapter, setAdapter] = useState<AdapterKind>('elm327');
  const [bridgeUrl, setBridgeUrl] = useState(
    () => localStorage.getItem('flatsix.obdBridgeUrl') || 'http://127.0.0.1:8765',
  );
  const [useWebSerial, setUseWebSerial] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [live, setLive] = useState<LiveData | null>(null);
  const [faults, setFaults] = useState<FaultsData | null>(null);
  const [vehicle, setVehicle] = useState<VehicleInfo | null>(null);
  const [healthNote, setHealthNote] = useState('');
  const [recording, setRecording] = useState(false);
  const sessionRef = useRef<TrackSession | null>(null);

  const refreshStatus = useCallback(async () => {
    try {
      const st = await client.status();
      setStatus(st);
      setLive(st.lastLive);
      setFaults(st.lastFaults);
      setVehicle(st.lastVehicle);
    } catch {
      /* offline bridge */
    }
  }, [client]);

  useEffect(() => {
    void (async () => {
      try {
        const h = await client.health();
        setHealthNote(h.note || `${h.platform} · ${h.transports?.join(', ')}`);
      } catch (e) {
        setHealthNote(
          shell === 'electron'
            ? 'Electron OBD host ready'
            : 'Bridge offline — start npm run obd-bridge, or use Web Serial / Electron',
        );
        setErr(e instanceof Error ? e.message : String(e));
      }
      await ensureKnowledgePack();
      await refreshStatus();
    })();
  }, [client, refreshStatus, shell]);

  useEffect(() => {
    if (!status?.polling && !recording) return;
    const id = setInterval(() => {
      void (async () => {
        try {
          const l = await client.getLive();
          setLive(l);
          if (recording && l && sessionRef.current) {
            sessionRef.current.samples.push({
              t: Date.now(),
              values: { ...l.values },
            });
          }
        } catch {
          /* ignore */
        }
      })();
    }, 1000);
    return () => clearInterval(id);
  }, [client, status?.polling, recording]);

  const loadPorts = async () => {
    setErr(null);
    try {
      const res = await client.listPorts();
      setPorts(res.ports);
      if (res.ports[0] && !port) setPort(res.ports[0].path);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  };

  const connect = async () => {
    setBusy(true);
    setErr(null);
    try {
      if (useWebSerial && !window.flatsix?.isElectron) {
        localStorage.setItem('flatsix.preferWebSerial', '1');
        const url = new URL(location.href);
        url.searchParams.set('transport', 'webserial');
        location.href = url.toString();
        return;
      }
      const res = await client.connect({
        port,
        baudRate: baud,
        adapter,
        experimental: adapter === 'vas6154' ? true : undefined,
      });
      setStatus(res.status);
      setLive(res.status.lastLive);
      setFaults(res.status.lastFaults);
      setVehicle(res.status.lastVehicle);
      setTab('live');
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const disconnect = async () => {
    setBusy(true);
    try {
      await client.pollStop();
      await client.disconnect();
      await refreshStatus();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const togglePoll = async () => {
    setErr(null);
    try {
      if (status?.polling) {
        await client.pollStop();
      } else {
        await client.pollStart(2000);
      }
      await refreshStatus();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  };

  const startRecording = () => {
    sessionRef.current = {
      id: crypto.randomUUID(),
      startedAt: new Date().toISOString(),
      label: `Session ${new Date().toLocaleString()}`,
      samples: [],
      faultsSnapshot: faults,
      vehicleSnapshot: vehicle,
    };
    setRecording(true);
  };

  const stopRecording = async () => {
    const s = sessionRef.current;
    setRecording(false);
    if (!s) return;
    s.endedAt = new Date().toISOString();
    await saveSession(s);
    sessionRef.current = null;
    setTab('sessions');
  };

  const shellLabel = (s: ShellKind) =>
    s === 'electron' ? 'Electron' : s === 'pwa' ? 'PWA' : 'Browser';

  return (
    <>
      <header className="app-header">
        <span className="mark" />
        <h1>FLAT·SIX</h1>
        <span className="sub">TRACK</span>
        <span className="shell-pill">
          {shellLabel(shell)}
          {status?.connected ? ' · LIVE' : ' · IDLE'}
        </span>
      </header>

      <nav className="tabs">
        {(
          [
            ['connect', 'Connect'],
            ['live', 'Live'],
            ['faults', 'Faults'],
            ['knowledge', 'Knowledge'],
            ['sessions', 'Sessions'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={tab === id ? 'active' : ''}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </nav>

      <main className="main">
        {err && <div className="card err">{err}</div>}

        {tab === 'connect' && (
          <ConnectPanel
            shell={shell}
            healthNote={healthNote}
            ports={ports}
            port={port}
            baud={baud}
            adapter={adapter}
            bridgeUrl={bridgeUrl}
            useWebSerial={useWebSerial}
            webSerialOk={webSerialAvailable()}
            connected={!!status?.connected}
            busy={busy}
            vehicle={vehicle}
            onPort={setPort}
            onBaud={setBaud}
            onAdapter={setAdapter}
            onBridgeUrl={(v) => {
              setBridgeUrl(v);
              localStorage.setItem('flatsix.obdBridgeUrl', v);
            }}
            onUseWebSerial={setUseWebSerial}
            onRefreshPorts={loadPorts}
            onConnect={connect}
            onDisconnect={disconnect}
          />
        )}

        {tab === 'live' && (
          <LivePanel
            live={live}
            polling={!!status?.polling}
            recording={recording}
            connected={!!status?.connected}
            onTogglePoll={togglePoll}
            onRefresh={async () => {
              try {
                setLive(await client.refreshLive({ priorityOnly: false }));
              } catch (e) {
                setErr(e instanceof Error ? e.message : String(e));
              }
            }}
            onStartRec={startRecording}
            onStopRec={stopRecording}
          />
        )}

        {tab === 'faults' && (
          <FaultsPanel
            faults={faults}
            onRefresh={async () => {
              try {
                setFaults(await client.refreshFaults());
              } catch (e) {
                setErr(e instanceof Error ? e.message : String(e));
              }
            }}
          />
        )}

        {tab === 'knowledge' && <KnowledgePanel />}

        {tab === 'sessions' && <SessionsPanel />}
      </main>
    </>
  );
}

function ConnectPanel(props: {
  shell: ShellKind;
  healthNote: string;
  ports: PortInfo[];
  port: string;
  baud: number;
  adapter: AdapterKind;
  bridgeUrl: string;
  useWebSerial: boolean;
  webSerialOk: boolean;
  connected: boolean;
  busy: boolean;
  vehicle: VehicleInfo | null;
  onPort: (v: string) => void;
  onBaud: (v: number) => void;
  onAdapter: (v: AdapterKind) => void;
  onBridgeUrl: (v: string) => void;
  onUseWebSerial: (v: boolean) => void;
  onRefreshPorts: () => void;
  onConnect: () => void;
  onDisconnect: () => void;
}) {
  const androidNoLive =
    props.shell !== 'electron' &&
    /android/i.test(navigator.userAgent) &&
    !props.webSerialOk;

  return (
    <>
      <div className="card">
        <h2>Connection</h2>
        <p className="muted">{props.healthNote}</p>
        {androidNoLive && (
          <p className="err" style={{ marginTop: 8 }}>
            Android Chrome PWA: offline knowledge and session replay work here. Live OBD needs
            Electron (laptop) or desktop Chrome Web Serial (USB).
          </p>
        )}
        <div className="row" style={{ marginTop: 12 }}>
          <div className="field">
            <label>Adapter</label>
            <select
              value={props.adapter}
              onChange={(e) => props.onAdapter(e.target.value as AdapterKind)}
            >
              <option value="elm327">ELM327</option>
              <option value="vas6154">VAS6154 (experimental stub)</option>
            </select>
          </div>
          <div className="field">
            <label>Baud</label>
            <select value={props.baud} onChange={(e) => props.onBaud(Number(e.target.value))}>
              <option value={9600}>9600</option>
              <option value={38400}>38400</option>
              <option value={115200}>115200</option>
            </select>
          </div>
        </div>
        {props.shell !== 'electron' && (
          <div className="row" style={{ marginTop: 10 }}>
            <div className="field">
              <label>Bridge URL</label>
              <input
                value={props.bridgeUrl}
                onChange={(e) => props.onBridgeUrl(e.target.value)}
                disabled={props.useWebSerial}
              />
            </div>
            {props.webSerialOk && (
              <label className="muted" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="checkbox"
                  checked={props.useWebSerial}
                  onChange={(e) => props.onUseWebSerial(e.target.checked)}
                />
                Use Web Serial (USB, desktop Chrome)
              </label>
            )}
          </div>
        )}
        <div className="row" style={{ marginTop: 10 }}>
          <div className="field">
            <label>Port</label>
            <select value={props.port} onChange={(e) => props.onPort(e.target.value)}>
              {props.ports.length === 0 && <option value="">— refresh ports —</option>}
              {props.ports.map((p) => (
                <option key={p.path} value={p.path}>
                  {p.path} {p.hint ? `· ${p.hint}` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="row" style={{ marginTop: 12 }}>
          <button type="button" className="btn secondary" onClick={props.onRefreshPorts}>
            Refresh ports
          </button>
          {!props.connected ? (
            <button type="button" className="btn" disabled={props.busy} onClick={props.onConnect}>
              Connect
            </button>
          ) : (
            <button type="button" className="btn secondary" disabled={props.busy} onClick={props.onDisconnect}>
              Disconnect
            </button>
          )}
        </div>
      </div>
      {props.vehicle && (
        <div className="card">
          <h2>Vehicle</h2>
          <div className="list">
            <div className="list-item">
              <strong>VIN</strong>
              <p>{props.vehicle.vin || '—'}</p>
            </div>
            <div className="list-item">
              <strong>CALID</strong>
              <p>{props.vehicle.calid || '—'}</p>
            </div>
            <div className="list-item">
              <strong>ECU</strong>
              <p>{props.vehicle.ecu_name || '—'}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function LivePanel(props: {
  live: LiveData | null;
  polling: boolean;
  recording: boolean;
  connected: boolean;
  onTogglePoll: () => void;
  onRefresh: () => void;
  onStartRec: () => void;
  onStopRec: () => void;
}) {
  const v = props.live?.values ?? {};
  const gauges = [
    { key: 'rpm', label: 'RPM', unit: '' },
    { key: 'speed_kmh', label: 'Speed', unit: 'km/h' },
    { key: 'coolant_c', label: 'Coolant', unit: '°C' },
    { key: 'oil_c', label: 'Oil', unit: '°C' },
    { key: 'voltage_v', label: 'Voltage', unit: 'V' },
    { key: 'engine_load_pct', label: 'Load', unit: '%' },
    { key: 'tps_pct', label: 'TPS', unit: '%' },
  ];

  return (
    <div className="card">
      <h2>Live data</h2>
      <div className="row" style={{ marginBottom: 12 }}>
        <button type="button" className="btn" disabled={!props.connected} onClick={props.onTogglePoll}>
          {props.polling ? 'Stop poll' : 'Start poll'}
        </button>
        <button type="button" className="btn secondary" disabled={!props.connected} onClick={props.onRefresh}>
          Refresh
        </button>
        {!props.recording ? (
          <button type="button" className="btn secondary" disabled={!props.connected} onClick={props.onStartRec}>
            Record session
          </button>
        ) : (
          <button type="button" className="btn" onClick={props.onStopRec}>
            Stop & save
          </button>
        )}
        {props.recording && <span className="chip on">Recording</span>}
      </div>
      {!props.live && <p className="muted">Connect and start polling to see gauges.</p>}
      <div className="gauge-grid">
        {gauges.map((g) => (
          <div className="gauge" key={g.key}>
            <div className="label">{g.label}</div>
            <div className="value">
              {v[g.key] != null ? String(v[g.key]) : '—'}
              {v[g.key] != null && g.unit ? <span className="unit">{g.unit}</span> : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FaultsPanel(props: { faults: FaultsData | null; onRefresh: () => void }) {
  return (
    <div className="card">
      <h2>Fault codes</h2>
      <div className="row" style={{ marginBottom: 12 }}>
        <button type="button" className="btn secondary" onClick={props.onRefresh}>
          Re-scan
        </button>
      </div>
      {!props.faults && <p className="muted">No fault scan yet.</p>}
      {props.faults?.modules.map((m) => (
        <div key={m.id} className="list-item" style={{ marginBottom: 8 }}>
          <strong>
            {m.name} {!m.available && <span className="chip">UDS required</span>}
          </strong>
          {m.available ? (
            <p>
              Confirmed: {m.confirmed.join(', ') || 'none'}
              <br />
              Pending: {m.pending.join(', ') || 'none'}
              <br />
              Permanent: {m.permanent.join(', ') || 'none'}
            </p>
          ) : (
            <p>{m.note}</p>
          )}
        </div>
      ))}
    </div>
  );
}

function KnowledgePanel() {
  const [q, setQ] = useState('');
  const [gen, setGen] = useState(DEFAULT_GENERATION);
  const [results, setResults] = useState(() => offlineSearch('oil', { generation: gen }));

  const run = () => setResults(offlineSearch(q || 'oil', { generation: gen }));

  return (
    <div className="card">
      <h2>Offline knowledge</h2>
      <p className="muted">
        Bundled TF search from lib/knowledge — works with airplane mode. Workshop-manual embeddings
        stay online in the main app.
      </p>
      <div className="row" style={{ marginTop: 10 }}>
        <div className="field">
          <label>Generation</label>
          <select value={gen} onChange={(e) => setGen(e.target.value)}>
            {KNOWLEDGE_GENERATIONS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>
        <div className="field" style={{ flex: 2 }}>
          <label>Query</label>
          <input
            value={q}
            placeholder="P0301, oil capacity, PDK…"
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && run()}
          />
        </div>
        <button type="button" className="btn" onClick={run}>
          Search
        </button>
      </div>
      <div className="list" style={{ marginTop: 12 }}>
        {results.map((r) => (
          <div className="list-item" key={r.id}>
            <strong>
              {r.title} <span className="chip">{r.kind}</span>
            </strong>
            <p>{r.text.slice(0, 280)}{r.text.length > 280 ? '…' : ''}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function SessionsPanel() {
  const [rows, setRows] = useState<TrackSession[]>([]);

  const reload = async () => setRows(await listSessions());

  useEffect(() => {
    void reload();
  }, []);

  return (
    <div className="card">
      <h2>Saved sessions</h2>
      <p className="muted">Stored in IndexedDB on this device.</p>
      <div className="row" style={{ margin: '10px 0' }}>
        <button type="button" className="btn secondary" onClick={() => void reload()}>
          Refresh
        </button>
      </div>
      {rows.length === 0 && <p className="muted">No sessions yet — record from Live.</p>}
      <div className="list">
        {rows.map((s) => (
          <div className="list-item" key={s.id}>
            <strong>{s.label}</strong>
            <p>
              {s.startedAt}
              {s.endedAt ? ` → ${s.endedAt}` : ''} · {s.samples.length} samples
            </p>
            <button
              type="button"
              className="btn secondary"
              style={{ marginTop: 8 }}
              onClick={async () => {
                await deleteSession(s.id);
                await reload();
              }}
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
