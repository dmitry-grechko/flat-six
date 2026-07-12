'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { bridgeBaseUrl, createHttpObdClient } from './httpClient';
import { createWebSerialClient, webSerialAvailable } from './webSerial';
import { createElectronObdClient, isElectronShell } from './electronClient';
import { DEMO_MODE } from '@/lib/demo';
import type { ObdScan } from '@/lib/types';
import type {
  ConnectOptions,
  DebugLogEntry,
  FaultsData,
  LiveData,
  Mode06Data,
  ModuleScanData,
  ObdClient,
  ObdStatus,
  PortInfo,
  VehicleInfo,
} from './types';

export type ObdTransportMode = 'web-serial' | 'bridge' | 'electron';

export type BridgeHealth = {
  ok: boolean;
  connected: boolean;
  port: string | null;
  baud: number | null;
  platform: string;
  transports: string[];
  note?: string;
  shell?: string;
};

/** Browser-only — call after mount so SSR and the first client paint match. */
function pickDefaultMode(): ObdTransportMode {
  if (isElectronShell()) return 'electron';
  if (webSerialAvailable()) return 'web-serial';
  return 'bridge';
}

function clientForMode(mode: ObdTransportMode): ObdClient {
  if (mode === 'electron') return createElectronObdClient();
  if (mode === 'web-serial') return createWebSerialClient();
  return createHttpObdClient(bridgeBaseUrl());
}

export function useObdBridge(initialMode?: ObdTransportMode) {
  // Stable default for SSR + first paint — upgrade in useEffect after mount.
  const [mode, setModeState] = useState<ObdTransportMode>(() => initialMode ?? 'bridge');
  const [webSerialOk, setWebSerialOk] = useState(false);
  const [envReady, setEnvReady] = useState(false);
  const autoPicked = useRef(!!initialMode);

  const client = useMemo(() => clientForMode(mode), [mode]);
  const clientRef = useRef(client);
  clientRef.current = client;

  const [bridgeOnline, setBridgeOnline] = useState(false);
  const [health, setHealth] = useState<BridgeHealth | null>(null);
  const [status, setStatus] = useState<ObdStatus | null>(null);
  const [ports, setPorts] = useState<PortInfo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [debugLog, setDebugLog] = useState<DebugLogEntry[]>([]);
  const [mode06, setMode06] = useState<Mode06Data | null>(null);
  const [moduleScan, setModuleScan] = useState<ModuleScanData | null>(null);

  const setMode = useCallback(async (next: ObdTransportMode) => {
    if (next === mode) return;
    try {
      await clientRef.current.disconnect().catch(() => {});
    } catch {
      /* ignore */
    }
    setStatus(null);
    setPorts([]);
    setDebugLog([]);
    setError(null);
    setModeState(next);
    setBridgeOnline(next === 'web-serial' || next === 'electron');
  }, [mode]);

  const refreshHealth = useCallback(async () => {
    try {
      const h = await clientRef.current.health();
      setHealth(h);
      setBridgeOnline(true);
      return h;
    } catch {
      if (mode === 'web-serial') {
        // Web Serial health never hits the network — only fails if client throws
        setBridgeOnline(true);
        setHealth({
          ok: true,
          connected: false,
          port: null,
          baud: null,
          platform: typeof navigator !== 'undefined' ? navigator.platform : 'browser',
          transports: ['web-serial'],
          note: 'Web Serial ready — click Connect to pick USB ELM327',
        });
        return null;
      }
      setBridgeOnline(false);
      setHealth(null);
      return null;
    }
  }, [mode]);

  const refreshPorts = useCallback(async () => {
    if (mode === 'bridge' && !bridgeOnline && !(await refreshHealth())) {
      setError('OBD bridge offline. Start it with: npm run obd-bridge — or switch to Web Serial (Chrome USB).');
      return;
    }
    try {
      const data = await clientRef.current.listPorts();
      setPorts(data.ports.filter((p) => !p.ignore));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [bridgeOnline, mode, refreshHealth]);

  const refreshStatus = useCallback(async () => {
    try {
      const st = await clientRef.current.status();
      setStatus(st);
      if (mode === 'web-serial' || st.connected) setBridgeOnline(true);
      return st;
    } catch {
      if (mode === 'bridge') setBridgeOnline(false);
      return null;
    }
  }, [mode]);

  const connect = useCallback(async (opts: ConnectOptions = {}) => {
    setBusy(true);
    setError(null);
    try {
      const res = await clientRef.current.connect({
        ...opts,
        port: mode === 'web-serial' ? 'web-serial' : opts.port,
        baudRate: opts.baudRate ?? 38400,
        adapter: opts.adapter ?? 'elm327',
      });
      setStatus(res.status);
      setBridgeOnline(true);
      return res.status;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      throw e;
    } finally {
      setBusy(false);
    }
  }, [mode]);

  const disconnect = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      await clientRef.current.disconnect();
      await refreshStatus();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, [refreshStatus]);

  const setPolling = useCallback(async (on: boolean, intervalMs = 2000) => {
    setError(null);
    try {
      if (on) {
        await clientRef.current.pollStart(intervalMs);
      } else {
        await clientRef.current.pollStop();
      }
      await refreshStatus();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [refreshStatus]);

  const refreshLive = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const live = await clientRef.current.refreshLive({ priorityOnly: false });
      setStatus((s) => (s ? { ...s, lastLive: live } : s));
      return live;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return null;
    } finally {
      setBusy(false);
    }
  }, []);

  const refreshFaults = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const faults = await clientRef.current.refreshFaults();
      setStatus((s) => (s ? { ...s, lastFaults: faults } : s));
      return faults;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return null;
    } finally {
      setBusy(false);
    }
  }, []);

  const refreshVehicle = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const vehicle = await clientRef.current.refreshVehicle();
      setStatus((s) => (s ? { ...s, lastVehicle: vehicle } : s));
      return vehicle;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return null;
    } finally {
      setBusy(false);
    }
  }, []);

  const refreshMode06 = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const data = await clientRef.current.refreshMode06();
      setMode06(data);
      return data;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return null;
    } finally {
      setBusy(false);
    }
  }, []);

  const scanModules = useCallback(async (generation: string) => {
    setBusy(true);
    setError(null);
    try {
      const data = await clientRef.current.scanModules(generation);
      setModuleScan(data);
      return data;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return null;
    } finally {
      setBusy(false);
    }
  }, []);

  const clearFaults = useCallback(async (generation: string) => {
    setBusy(true);
    setError(null);
    try {
      return await clientRef.current.clearFaults(generation);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return null;
    } finally {
      setBusy(false);
    }
  }, []);

  const loadDebug = useCallback(async () => {
    try {
      const d = await clientRef.current.debug();
      setDebugLog(d.log || []);
      return d;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return null;
    }
  }, []);

  /**
   * Persist the current scan (faults + live + Mode 06 + module scan) to the
   * garage so the get_obd_scan MCP tool can read it back for the AI. The active
   * car's generation and garage vehicleId live on the OBD page, not the
   * transport, so the caller passes them in. POSTs to /api/obd/scans → saveObdScan.
   */
  const saveScan = useCallback(
    async (
      opts: { vehicleId?: string | null; generation: string },
    ): Promise<{ ok: boolean; scan?: ObdScan; error?: string }> => {
      setError(null);
      if (DEMO_MODE) {
        const msg = 'Saving scans needs a signed-in garage (not available in demo).';
        setError(msg);
        return { ok: false, error: msg };
      }
      const payload = {
        vehicleId: opts.vehicleId ?? null,
        generation: opts.generation,
        faults: status?.lastFaults ?? null,
        live: status?.lastLive ?? null,
        mode06,
        moduleScan,
      };
      if (!payload.faults && !payload.live && !payload.mode06 && !payload.moduleScan) {
        const msg = 'Nothing to save yet — read faults or live data first.';
        setError(msg);
        return { ok: false, error: msg };
      }
      try {
        const res = await fetch('/api/obd/scans', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          const msg = typeof body?.error === 'string' ? body.error : `Save failed (${res.status})`;
          setError(msg);
          return { ok: false, error: msg };
        }
        return { ok: true, scan: body.scan as ObdScan };
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
        return { ok: false, error: msg };
      }
    },
    [status, mode06, moduleScan],
  );

  // Prefer Web Serial / Electron once we know the environment (avoids hydration mismatch).
  useEffect(() => {
    setWebSerialOk(webSerialAvailable());
    if (!autoPicked.current) {
      autoPicked.current = true;
      const preferred = pickDefaultMode();
      if (preferred !== 'bridge') {
        setModeState(preferred);
        setBridgeOnline(true);
      }
    }
    setEnvReady(true);
  }, []);

  // Health check on mount + when mode changes
  useEffect(() => {
    if (!envReady) return;
    let cancelled = false;
    const tick = async () => {
      if (cancelled) return;
      await refreshHealth();
    };
    tick();
    const id = setInterval(tick, mode === 'bridge' ? 4000 : 8000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [refreshHealth, mode, envReady]);

  // Status poll while online (keeps live tiles fresh when polling)
  useEffect(() => {
    if (!envReady) return;
    if (!bridgeOnline && mode === 'bridge') return;
    let cancelled = false;
    const tick = async () => {
      if (cancelled) return;
      await refreshStatus();
    };
    tick();
    const id = setInterval(tick, 1500);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [bridgeOnline, mode, refreshStatus, envReady]);

  // Load ports when transport is ready
  useEffect(() => {
    if (!envReady) return;
    if (mode === 'web-serial' || bridgeOnline) {
      refreshPorts().catch(() => {});
    }
  }, [bridgeOnline, mode, refreshPorts, envReady]);

  const live: LiveData | null = status?.lastLive ?? null;
  const faults: FaultsData | null = status?.lastFaults ?? null;
  const vehicle: VehicleInfo | null = status?.lastVehicle ?? null;
  const connected = status?.connected === true;
  const polling = status?.polling === true;
  // Don't show the bridge-offline banner until we've picked the real transport.
  const needsBridge = envReady && mode === 'bridge' && !bridgeOnline;

  return {
    client,
    mode,
    setMode,
    webSerialOk,
    needsBridge,
    bridgeUrl: bridgeBaseUrl(),
    bridgeOnline,
    health,
    status,
    ports,
    live,
    faults,
    vehicleInfo: vehicle,
    connected,
    polling,
    error,
    busy,
    debugLog,
    setError,
    refreshHealth,
    refreshPorts,
    refreshStatus,
    connect,
    disconnect,
    setPolling,
    refreshLive,
    refreshFaults,
    refreshVehicle,
    refreshMode06,
    scanModules,
    clearFaults,
    saveScan,
    mode06,
    moduleScan,
    loadDebug,
  };
}
