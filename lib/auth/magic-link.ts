/**
 * Magic-link helpers — Desktop/PWA open email in an external browser, so the
 * session cookie never lands in the app unless we complete sign-in here.
 */

import { isElectronShell } from '@/lib/electron/shell';

export function isInstalledPwa(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/** True when the magic link will probably open outside this webview. */
export function needsInAppSignInHandoff(): boolean {
  return isElectronShell() || isInstalledPwa();
}

/** Redirect target passed to Supabase when requesting a magic link. */
export function magicLinkRedirectUrl(origin: string, next: string): string {
  const q = next ? `?next=${encodeURIComponent(next)}` : '';
  if (isElectronShell()) return `flatsix://auth/callback${q}`;
  return `${origin}/auth/callback${q}`;
}

/** Accept Supabase verify URLs, our callback, or Desktop deep links. */
export function isAllowedMagicLinkUrl(raw: string): boolean {
  try {
    const url = new URL(raw.trim());
    if (url.protocol === 'flatsix:' && url.hostname === 'auth') return true;
    if (url.pathname === '/auth/callback' || url.pathname.endsWith('/auth/callback')) return true;
    if (url.hostname.endsWith('.supabase.co') && url.pathname.includes('/auth/v1/verify')) return true;
    return false;
  } catch {
    return false;
  }
}
