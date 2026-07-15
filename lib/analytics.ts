import { isElectronShell } from '@/lib/electron/shell';

/**
 * Privacy-respecting Google Analytics (GA4) with Consent Mode v2.
 *
 * - No gtag script loads and no request hits Google until the visitor accepts
 *   in the consent banner (`setConsent('granted')` → `loadGa()`).
 * - Disabled entirely in the Electron desktop shell (a desktop app shouldn't
 *   quietly phone home; see the analytics decision in the changelog).
 * - Every event is tagged with `platform` (web | pwa) so surfaces can be split
 *   without a second data stream.
 */
declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    __flatsixGaLoaded?: boolean;
  }
}

export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_ID || 'G-9MJNMP28HR';
const CONSENT_KEY = 'flatsix.analyticsConsent';

export type Consent = 'granted' | 'denied';

export function getConsent(): Consent | null {
  if (typeof window === 'undefined') return null;
  try {
    const v = window.localStorage.getItem(CONSENT_KEY);
    return v === 'granted' || v === 'denied' ? v : null;
  } catch {
    return null;
  }
}

/** Record the visitor's choice; load GA on grant, revoke on deny. */
export function setConsent(c: Consent): void {
  try {
    window.localStorage.setItem(CONSENT_KEY, c);
  } catch {
    /* ignore */
  }
  if (c === 'granted') loadGa();
  else window.gtag?.('consent', 'update', { analytics_storage: 'denied' });
}

function analyticsEnabled(): boolean {
  return (
    typeof window !== 'undefined' &&
    !!GA_MEASUREMENT_ID &&
    !isElectronShell() &&
    getConsent() === 'granted'
  );
}

/** Inject gtag.js once, with Consent Mode defaulting denied then granted. */
export function loadGa(): void {
  if (typeof window === 'undefined' || isElectronShell() || !GA_MEASUREMENT_ID) return;
  if (window.__flatsixGaLoaded) {
    window.gtag?.('consent', 'update', { analytics_storage: 'granted' });
    return;
  }
  window.__flatsixGaLoaded = true;

  window.dataLayer = window.dataLayer || [];
  const gtag: Window['gtag'] = (...args: unknown[]) => {
    window.dataLayer!.push(args);
  };
  window.gtag = gtag;

  gtag('consent', 'default', {
    analytics_storage: 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
  });
  gtag('consent', 'update', { analytics_storage: 'granted' });
  gtag('js', new Date());
  // page_view is sent by trackPageView (covers SPA navigations too).
  gtag('config', GA_MEASUREMENT_ID, { send_page_view: false });

  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(s);
}

function platform(): 'web' | 'pwa' {
  if (typeof window !== 'undefined' && window.matchMedia?.('(display-mode: standalone)').matches) {
    return 'pwa';
  }
  return 'web';
}

/** Fire a custom event (no-op until consent is granted). */
export function track(event: string, params?: Record<string, unknown>): void {
  if (!analyticsEnabled() || !window.gtag) return;
  window.gtag('event', event, { platform: platform(), ...params });
}

/** Fire a page_view (initial + SPA route changes). */
export function trackPageView(path: string): void {
  if (!analyticsEnabled() || !window.gtag) return;
  window.gtag('event', 'page_view', { page_path: path, platform: platform() });
}
