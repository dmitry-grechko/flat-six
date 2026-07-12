/**
 * Catalog of companion downloads — FLAT·SIX Desktop + PWA.
 * Desktop install links are resolved at request time from the latest GitHub Release
 * (see `lib/github-release.ts`) so the site never lags behind a new tag.
 */

import type { LatestDesktopAssets } from './github-release';
import { REPO_URL, SITE_URL } from './github-release';

export type DownloadId = 'desktop' | 'pwa' | 'obd-bridge';

export type DownloadItem = {
  id: DownloadId;
  name: string;
  tagline: string;
  platform: string;
  href: string | null;
  hrefMac?: string | null;
  cta: string;
  ctaMac?: string;
  installNotes: string[];
  /** macOS-specific first-launch steps (Gatekeeper), rendered as a callout. */
  macNotes?: string[];
  audience: 'owners' | 'contributors';
  /** Shown when links come from a live GitHub Release. */
  versionLabel?: string | null;
};

export { REPO_URL, SITE_URL };

export function buildDownloadsCatalog(assets: LatestDesktopAssets | null): DownloadItem[] {
  const version = assets?.version ?? null;
  const winHref = assets?.winSetup ?? assets?.winPortable ?? null;
  // Prefer Apple Silicon DMG for the primary Mac CTA (most owners).
  const macHref = assets?.macArm ?? assets?.macIntel ?? null;

  return [
    {
      id: 'desktop',
      name: 'FLAT·SIX Desktop',
      tagline:
        'Recommended for owners. Full garage app (history, plans, tools, Live OBD) with USB + Classic Bluetooth OBD built in — no terminal.',
      platform: 'Windows (installer + portable) · macOS (DMG, Intel + Apple Silicon)',
      href: winHref,
      hrefMac: macHref,
      cta: 'Download for Windows',
      ctaMac: 'Download for Mac',
      audience: 'owners',
      versionLabel: version ? `v${version}` : null,
      installNotes: [
        version
          ? `Latest release ${version} — Windows button is the NSIS installer (auto-update). Portable builds are on the GitHub Release page.`
          : 'Packaged builds publish via GitHub Releases — buttons say “soon” until a release is found.',
        'Installed Desktop checks GitHub for updates on launch and downloads them in the background.',
        'Live OBD uses the adapter inside the app. Documents and AI still need network.',
        assets?.macIntel && assets?.macArm
          ? 'Mac button is Apple silicon; Intel Macs — grab the x64 DMG from the release page.'
          : 'Mac: use the DMG that matches your chip (arm64 or x64) on the release page if unsure.',
      ],
      macNotes: [
        'The Mac build is not notarized yet, so on first launch macOS blocks it with “Apple could not verify FLAT·SIX is free of malware.”',
        'Open System Settings → Privacy & Security, scroll to Security, and click “Open Anyway” next to FLAT·SIX — then launch it again and confirm. You only do this once.',
        'On older macOS you can instead Control-click (right-click) FLAT·SIX in Applications → Open → Open.',
        'If it says the app “is damaged”, clear the download flag in Terminal: xattr -dr com.apple.quarantine "/Applications/FLAT·SIX.app"',
      ],
    },
    {
      id: 'pwa',
      name: 'FLAT·SIX PWA',
      tagline:
        'Install the full garage from Chrome/Edge. Offline: shell, curated knowledge, and synced garage data. Live OBD via Web Serial (USB) on desktop Chrome.',
      platform: 'Desktop Chrome / Edge · Android Chrome (garage + knowledge offline; live OBD limited)',
      href: SITE_URL,
      cta: 'Open site to install',
      audience: 'owners',
      installNotes: [
        'Open the site in Chrome or Edge → Install app (address bar or ⋮ menu).',
        'Sync your garage once while online, then airplane mode works for Garage, History, Plans, and Fault Finding (curated knowledge).',
        'Workshop PDFs and AI stay online-only for now.',
      ],
    },
    {
      id: 'obd-bridge',
      name: 'OBD Bridge (lab helper)',
      tagline:
        'Local serial helper for contributors when you are not using Desktop. Owners should use FLAT·SIX Desktop instead.',
      platform: 'Windows · macOS · Linux',
      href: assets?.obdBridgeZip ?? null,
      cta: 'Download bridge zip',
      audience: 'contributors',
      installNotes: [
        'Unzip, open a terminal in the folder, run npm start, then open http://127.0.0.1:8765.',
        'Requires Node 22+. Not a double-click owner app — use FLAT·SIX Desktop instead.',
        'Desktop Chrome USB ELM usually does not need this — use Web Serial on Live OBD or install Desktop.',
      ],
    },
  ];
}
