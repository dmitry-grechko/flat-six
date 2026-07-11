'use client';

import { useEffect, useState } from 'react';
import { isElectronShell } from '@/lib/obd/electronClient';

export type DesktopUpdateStatus =
  | { phase: 'idle' }
  | { phase: 'checking' }
  | { phase: 'available'; version: string; releaseNotes?: string }
  | { phase: 'downloading'; percent: number }
  | { phase: 'ready'; version: string }
  | { phase: 'error'; message: string }
  | { phase: 'uptodate' };

const SKIP_KEY = 'flatsix-skipped-version';

function readSkipped(): string | null {
  try {
    return localStorage.getItem(SKIP_KEY);
  } catch {
    return null;
  }
}

export function useDesktopUpdate() {
  const [status, setStatus] = useState<DesktopUpdateStatus>({ phase: 'idle' });
  const [skipped, setSkipped] = useState<string | null>(null);

  useEffect(() => {
    if (!isElectronShell()) return;
    setSkipped(readSkipped());
    const api = window.flatsix;
    if (!api?.onUpdateStatus) return;
    return api.onUpdateStatus((s) => setStatus(s));
  }, []);

  const version =
    status.phase === 'available' || status.phase === 'ready' ? status.version : null;

  const visible =
    isElectronShell() &&
    version !== null &&
    version !== skipped &&
    (status.phase === 'available' || status.phase === 'downloading' || status.phase === 'ready');

  const skipVersion = (v: string) => {
    try {
      localStorage.setItem(SKIP_KEY, v);
    } catch {
      /* ignore */
    }
    setSkipped(v);
  };

  const install = () => {
    void window.flatsix?.updateInstall?.();
  };

  return { status, visible, version, skipVersion, install };
}
