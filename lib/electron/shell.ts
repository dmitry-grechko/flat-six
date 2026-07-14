/**
 * Detect whether the app is running inside the FLAT·SIX Electron desktop shell.
 *
 * Environment detection — deliberately lives outside the OBD engine so that
 * non-OBD features (analytics, PWA registration, auth deep-links, desktop
 * updates) can ask "am I in the desktop app?" without depending on
 * `@flatsix/obd-core`. `window.flatsix` is typed globally in
 * `lib/electron/flatsix.d.ts`.
 */
export function isElectronShell(): boolean {
  return typeof window !== 'undefined' && window.flatsix?.isElectron === true;
}
