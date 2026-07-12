/**
 * Resolve Desktop / companion download URLs from the latest GitHub Release.
 * Avoids hardcoding RELEASE_TAG (which caused prod to stay on 0.1.5 after 0.1.6 shipped).
 */

export const REPO_OWNER = 'dmitry-grechko';
export const REPO_NAME = 'flat-six';
export const REPO_URL = `https://github.com/${REPO_OWNER}/${REPO_NAME}`;
export const SITE_URL = 'https://www.flat-six.org';

export type LatestDesktopAssets = {
  tag: string;
  version: string;
  /** Prefer NSIS Setup; falls back to generic .exe if naming varies. */
  winSetup: string | null;
  winPortable: string | null;
  macArm: string | null;
  macIntel: string | null;
  obdBridgeZip: string | null;
  releaseUrl: string;
};

type GhAsset = { name: string; browser_download_url: string };
type GhRelease = {
  tag_name: string;
  html_url: string;
  assets: GhAsset[];
};

function stripV(tag: string): string {
  return tag.replace(/^v/i, '');
}

function pick(assets: GhAsset[], ...tests: ((n: string) => boolean)[]): string | null {
  for (const test of tests) {
    const hit = assets.find((a) => test(a.name));
    if (hit) return hit.browser_download_url;
  }
  return null;
}

/** Fetch latest published GitHub Release assets (cached ~5 min on Vercel/Next). */
export async function getLatestDesktopAssets(): Promise<LatestDesktopAssets | null> {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/latest`,
      {
        headers: {
          Accept: 'application/vnd.github+json',
          'User-Agent': 'flat-six-downloads',
        },
        next: { revalidate: 300 },
      },
    );
    if (!res.ok) return null;
    const release = (await res.json()) as GhRelease;
    const assets = release.assets || [];
    const version = stripV(release.tag_name);

    // Prefer explicitly named Setup / portable so NSIS vs portable never collide.
    const winSetup =
      pick(
        assets,
        (n) => /setup/i.test(n) && /\.exe$/i.test(n) && !/portable/i.test(n),
        (n) => /^FLAT-SIX-[\d.]+-x64\.exe$/i.test(n),
        (n) => /\.exe$/i.test(n) && !/portable/i.test(n) && !/blockmap/i.test(n),
      ) ?? null;

    const winPortable =
      pick(
        assets,
        (n) => /portable/i.test(n) && /\.exe$/i.test(n),
      ) ?? null;

    const macArm =
      pick(
        assets,
        (n) => /arm64/i.test(n) && /\.dmg$/i.test(n),
      ) ?? null;

    const macIntel =
      pick(
        assets,
        (n) => /x64/i.test(n) && /\.dmg$/i.test(n),
        (n) => /\.dmg$/i.test(n) && !/arm64/i.test(n),
      ) ?? null;

    const obdBridgeZip =
      pick(
        assets,
        (n) => /obd-bridge/i.test(n) && /\.zip$/i.test(n),
        (n) => /bridge/i.test(n) && /\.zip$/i.test(n),
      ) ?? null;

    return {
      tag: release.tag_name,
      version,
      winSetup,
      winPortable,
      macArm,
      macIntel,
      obdBridgeZip,
      releaseUrl: release.html_url || `${REPO_URL}/releases/tag/${release.tag_name}`,
    };
  } catch {
    return null;
  }
}
