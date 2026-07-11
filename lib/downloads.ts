/**
 * Catalog of companion downloads (OBD bridge, Track Electron, Track PWA).
 * Set `href` / `hrefMac` to GitHub Release asset URLs when publish goes live.
 */

export type DownloadId = 'track-electron' | 'track-pwa' | 'obd-bridge';

export type DownloadItem = {
  id: DownloadId;
  name: string;
  tagline: string;
  platform: string;
  /** Primary download (Windows Electron, or single-URL items). */
  href: string | null;
  /** Optional second download (macOS Electron). */
  hrefMac?: string | null;
  cta: string;
  ctaMac?: string;
  installNotes: string[];
  /** Dev / contributor command — not the owner path. */
  command?: string;
  /** Audience hint shown in the UI. */
  audience: 'owners' | 'contributors';
};

export const DOWNLOADS: DownloadItem[] = [
  {
    id: 'track-electron',
    name: 'Track Desktop',
    tagline:
      'Recommended for owners. Double-click app with live OBD (USB + Classic Bluetooth), offline knowledge search, and session recording — no terminal, no separate bridge.',
    platform: 'Windows (installer + portable) · macOS (DMG, Intel + Apple Silicon)',
    href: null,
    hrefMac: null,
    cta: 'Download for Windows',
    ctaMac: 'Download for Mac',
    audience: 'owners',
    command: 'npm run track:electron:pack',
    installNotes: [
      'Packaged builds are not on GitHub Releases yet (still in testing). When published, use the buttons above.',
      'Windows: NSIS installer (Setup) or portable .exe. macOS: .dmg — build Mac packages on a Mac (or CI); unsigned builds need Right-click → Open the first time.',
      'Dev pack: npm run track:electron:pack (Windows host) or npm run track:electron:pack:mac (macOS host). Output: apps/track-electron/release/.',
    ],
  },
  {
    id: 'track-pwa',
    name: 'Track PWA',
    tagline:
      'Same Track companion UI as Desktop (OBD connect, live gauges, faults, offline knowledge, sessions) — install from Chrome/Edge. Not the full garage/3D web app.',
    platform: 'Desktop Chrome / Edge · Android Chrome (offline KB + sessions; live OBD needs desktop USB Web Serial or Track Desktop)',
    href: null,
    cta: 'Open Track (install from browser)',
    audience: 'owners',
    command: 'npm run track:pwa',
    installNotes: [
      'Hosted install URL is not published yet. After hosting apps/track/dist on HTTPS: open the URL → Install app in Chrome.',
      'Packages the Track companion we already built (apps/track) — one codebase shared with Electron. It does not wrap the whole Next.js garage (auth, 3D X-RAY, etc.).',
      'Live OBD in the PWA uses Web Serial (USB ELM on desktop Chrome). Classic Bluetooth needs Track Desktop.',
    ],
  },
  {
    id: 'obd-bridge',
    name: 'OBD Bridge (lab helper)',
    tagline:
      'Local serial helper for contributors and browser Live OBD when you are not using Track Desktop. Owners should prefer Track Desktop instead.',
    platform: 'Windows · macOS · Linux (requires Node)',
    href: null,
    cta: 'Download helper',
    audience: 'contributors',
    command: 'npm run obd-bridge',
    installNotes: [
      'Not packaged as a double-click app yet — still a Node process from the repo.',
      'From a clone: run the command below; leave http://127.0.0.1:8765 running while using Live OBD in bridge mode.',
      'Desktop Chrome USB ELM usually does not need this — use Web Serial on Live OBD or Track PWA.',
    ],
  },
];

export const REPO_URL = 'https://github.com/dmitry-grechko/flat-six';
