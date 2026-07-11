/**
 * Catalog of companion downloads (OBD bridge, Track Electron, Track PWA).
 * All are beta while packaging / release hosting is still settling —
 * swap `href` to a real artifact URL when a release is published.
 */

export type DownloadId = 'obd-bridge' | 'track-electron' | 'track-pwa';

export type DownloadItem = {
  id: DownloadId;
  name: string;
  tagline: string;
  platform: string;
  /** When set, primary CTA downloads / opens this URL. */
  href: string | null;
  /** Button label for href (ignored when href is null). */
  cta: string;
  /** Shown when href is null, or as secondary “from source” help. */
  installNotes: string[];
  /** Shell command to copy (dev / from-source path). */
  command?: string;
};

export const DOWNLOADS: DownloadItem[] = [
  {
    id: 'obd-bridge',
    name: 'OBD Bridge',
    tagline:
      'Local serial helper for Classic Bluetooth ELM327 and browsers without Web Serial. Live OBD in the main app can use this when USB Web Serial is not available.',
    platform: 'Windows · macOS · Linux (Node 22+)',
    href: null,
    cta: 'Download',
    command: 'npm run obd-bridge',
    installNotes: [
      'Clone the FLAT·SIX repo, then from the repo root run the command below.',
      'The helper listens on http://127.0.0.1:8765. Leave it running while you use Live OBD in bridge mode.',
      'Desktop Chrome/Edge with a USB ELM usually does not need the bridge — use Web Serial on Live OBD instead.',
    ],
  },
  {
    id: 'track-electron',
    name: 'Track Desktop',
    tagline:
      'Windows Electron shell for the Track companion: live OBD over USB or Classic BT (serialport in main), offline knowledge search, and session recording.',
    platform: 'Windows (portable .exe)',
    href: null,
    cta: 'Download Windows',
    command: 'npm run track:electron:pack',
    installNotes: [
      'Packaged Windows builds are not published yet (beta).',
      'From a clone with Node 20+: install apps/track and apps/track-electron deps, then run the pack command — output lands in apps/track-electron/release/.',
      'For day-to-day testing use npm run track:electron (dev) instead of packing.',
    ],
  },
  {
    id: 'track-pwa',
    name: 'Track PWA',
    tagline:
      'Installable Track companion for desktop Chrome: Web Serial USB ELM, offline knowledge, and sessions — same UI as the Electron shell.',
    platform: 'Desktop Chrome / Edge (PWA)',
    href: null,
    cta: 'Open Track',
    command: 'npm run track:pwa',
    installNotes: [
      'Hosted install URL is not published yet (beta).',
      'Build static assets with the command below, then npm --prefix apps/track run preview — or host apps/track/dist behind HTTPS.',
      'In Chrome: open the preview URL → Install app. Use Web Serial for USB ELM without the bridge.',
    ],
  },
];

export const REPO_URL = 'https://github.com/dmitry-grechko/flat-six';
