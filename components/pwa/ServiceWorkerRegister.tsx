'use client';

import { useEffect } from 'react';
import { isElectronShell } from '@/lib/obd/electronClient';

/**
 * Registers the next-pwa service worker.
 *
 * next-pwa is configured with `register: false` because its automatic
 * registration script is not injected into the App Router output — so the SW
 * never registered and the PWA had no offline support. We register it here on
 * `load` from the root layout instead. Guarded so it is a no-op when the SW
 * file is absent (e.g. `next dev`, where next-pwa is disabled).
 *
 * Electron Desktop skips the SW entirely and clears any stale registration left
 * from an older build (otherwise precached login chunks never update).
 */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

    if (isElectronShell()) {
      void navigator.serviceWorker.getRegistrations().then((regs) => {
        for (const reg of regs) void reg.unregister();
      });
      return;
    }

    const register = () => {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch((err) => {
        // Non-fatal: the app still works online without the SW.
        console.error('Service worker registration failed:', err);
      });
    };

    if (document.readyState === 'complete') register();
    else {
      window.addEventListener('load', register, { once: true });
      return () => window.removeEventListener('load', register);
    }
  }, []);

  return null;
}
