/** Detect shell and construct the right ObdClient. */

import type { ObdClient } from '../../../../lib/obd/types';
import { createHttpBridgeClient } from './httpBridge';
import { createElectronClient } from './electronIpc';
import { createWebSerialClient } from './webSerial';

export type ShellKind = 'electron' | 'pwa' | 'browser';

declare global {
  interface Window {
    flatsix?: {
      isElectron?: boolean;
      invoke?: (channel: string, ...args: unknown[]) => Promise<unknown>;
      obd?: ObdClient;
    };
  }
}

export function detectShell(): ShellKind {
  if (typeof window !== 'undefined' && window.flatsix?.isElectron) return 'electron';
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    const standalone =
      window.matchMedia?.('(display-mode: standalone)').matches ||
      // @ts-expect-error iOS legacy
      navigator.standalone === true;
    if (standalone) return 'pwa';
  }
  return 'browser';
}

export function createObdClient(): ObdClient {
  if (window.flatsix?.obd) return window.flatsix.obd;
  if (window.flatsix?.isElectron) return createElectronClient();

  const preferWebSerial =
    typeof navigator !== 'undefined' &&
    'serial' in navigator &&
    new URLSearchParams(location.search).get('transport') === 'webserial';

  if (preferWebSerial) return createWebSerialClient();

  const base =
    import.meta.env.VITE_OBD_BRIDGE_URL ||
    localStorage.getItem('flatsix.obdBridgeUrl') ||
    'http://127.0.0.1:8765';
  return createHttpBridgeClient(base);
}

export function webSerialAvailable(): boolean {
  return typeof navigator !== 'undefined' && 'serial' in navigator;
}
