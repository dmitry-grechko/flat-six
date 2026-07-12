/**
 * Custom macOS updater for the ad-hoc-signed build.
 *
 * macOS auto-update via Squirrel.Mac (what electron-updater uses) requires a
 * Developer ID signature + notarization, which this build does not have. So on
 * macOS we do the update ourselves: read the GitHub Releases feed, download the
 * arch-matched zip, verify its sha512, extract the .app, then swap it over the
 * installed bundle and relaunch — no DMG, no manual install.
 *
 * It emits the same status phases as the electron-updater path so the existing
 * DesktopUpdateBanner works unchanged. Windows keeps electron-updater (which
 * applies updates fine without signing).
 *
 * NOTE: this only takes effect from a build that CONTAINS it — a user must
 * install one release with this updater once; from then on the in-app button
 * works. Requires the app to live somewhere writable (e.g. /Applications) and
 * not be running App-Translocated.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawn, execFileSync } from 'node:child_process';
import { app } from 'electron';

const OWNER = 'dmitry-grechko';
const REPO = 'flat-six';

function feedUrl() {
  return `https://github.com/${OWNER}/${REPO}/releases/latest/download/latest-mac.yml`;
}
function assetUrl(version, file) {
  return `https://github.com/${OWNER}/${REPO}/releases/download/v${version}/${file}`;
}

/** Minimal parse of electron-builder's latest-mac.yml → { version, files:[{url,sha512,size}] }. */
function parseFeed(text) {
  const version = (text.match(/^version:\s*(.+)$/m) || [])[1]?.trim();
  const files = [];
  const re = /- url:\s*(.+?)\s*\n\s*sha512:\s*(.+?)\s*\n\s*size:\s*(\d+)/g;
  let m;
  while ((m = re.exec(text))) files.push({ url: m[1].trim(), sha512: m[2].trim(), size: Number(m[3]) });
  return { version, files };
}

/** Numeric semver-ish compare (no prerelease tags in our tags). a > b ? */
function isNewer(a, b) {
  const pa = String(a).split('.').map((n) => parseInt(n, 10) || 0);
  const pb = String(b).split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) > (pb[i] || 0);
  }
  return false;
}

function currentAppRoot() {
  // …/FLAT·SIX.app/Contents/MacOS/FLAT·SIX → …/FLAT·SIX.app
  return path.dirname(path.dirname(path.dirname(process.execPath)));
}

async function sha512Base64(file) {
  const hash = createHash('sha512');
  await new Promise((resolve, reject) => {
    fs.createReadStream(file).on('data', (d) => hash.update(d)).on('end', resolve).on('error', reject);
  });
  return hash.digest('base64');
}

export function createMacUpdater({ push }) {
  const state = { downloading: false, ready: null }; // ready: { version, appPath, tmpDir }

  async function check() {
    push({ phase: 'checking' });
    const res = await fetch(feedUrl(), { redirect: 'follow' });
    if (!res.ok) throw new Error(`update feed ${res.status}`);
    const feed = parseFeed(await res.text());
    if (!feed.version) throw new Error('could not read update feed');
    if (!isNewer(feed.version, app.getVersion())) {
      push({ phase: 'uptodate' });
      return;
    }
    push({ phase: 'available', version: feed.version });
    await download(feed);
  }

  async function download(feed) {
    if (state.downloading) return;
    state.downloading = true;
    try {
      const arch = process.arch === 'arm64' ? 'arm64' : 'x64';
      const entry = feed.files.find((f) => f.url.endsWith('.zip') && f.url.includes(arch));
      if (!entry) throw new Error(`no ${arch} build in release`);

      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'flatsix-update-'));
      const zipPath = path.join(tmpDir, entry.url);

      const res = await fetch(assetUrl(feed.version, entry.url), { redirect: 'follow' });
      if (!res.ok || !res.body) throw new Error(`download ${res.status}`);
      const total = entry.size || Number(res.headers.get('content-length')) || 0;
      let received = 0;
      const out = fs.createWriteStream(zipPath);
      const reader = res.body.getReader();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        received += value.length;
        out.write(Buffer.from(value));
        if (total) push({ phase: 'downloading', percent: Math.min(99, Math.round((received / total) * 100)) });
      }
      await new Promise((r) => out.end(r));

      const digest = await sha512Base64(zipPath);
      if (digest !== entry.sha512) throw new Error('downloaded file failed integrity check');

      // Extract the .app (ditto preserves the bundle + code signature).
      execFileSync('ditto', ['-x', '-k', zipPath, tmpDir]);
      const appName = fs.readdirSync(tmpDir).find((n) => n.endsWith('.app'));
      if (!appName) throw new Error('no .app in downloaded update');

      state.ready = { version: feed.version, appPath: path.join(tmpDir, appName), tmpDir };
      push({ phase: 'ready', version: feed.version });
    } catch (e) {
      push({ phase: 'error', message: e instanceof Error ? e.message : String(e) });
    } finally {
      state.downloading = false;
    }
  }

  /** Swap the installed bundle with the downloaded one and relaunch. */
  function install() {
    if (!state.ready) return;
    const appRoot = currentAppRoot();

    if (appRoot.includes('/AppTranslocation/')) {
      push({ phase: 'error', message: 'Move FLAT·SIX to your Applications folder, then update again.' });
      return;
    }
    try {
      fs.accessSync(path.dirname(appRoot), fs.constants.W_OK);
    } catch {
      push({ phase: 'error', message: `No permission to update ${appRoot}. Move it somewhere you own (e.g. ~/Applications).` });
      return;
    }

    const script = `#!/bin/bash
OLD=$1; NEW=$2; PID=$3
for i in $(seq 1 150); do kill -0 "$PID" 2>/dev/null || break; sleep 0.2; done
sleep 0.5
BK="\${OLD}.old-$$"
if ditto "$OLD" "$BK"; then
  if rm -rf "$OLD" && ditto "$NEW" "$OLD"; then
    xattr -dr com.apple.quarantine "$OLD" 2>/dev/null || true
    rm -rf "$BK"
  else
    rm -rf "$OLD"; ditto "$BK" "$OLD"; rm -rf "$BK"
  fi
fi
rm -rf "$(dirname "$NEW")"
open "$OLD"
`;
    const scriptPath = path.join(state.ready.tmpDir, 'swap.sh');
    fs.writeFileSync(scriptPath, script, { mode: 0o755 });

    const child = spawn('/bin/bash', [scriptPath, appRoot, state.ready.appPath, String(process.pid)], {
      detached: true,
      stdio: 'ignore',
    });
    child.unref();
    setTimeout(() => app.quit(), 300);
  }

  return { check, install };
}
