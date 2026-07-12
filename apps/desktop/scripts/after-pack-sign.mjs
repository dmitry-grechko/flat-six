/**
 * electron-builder afterPack hook — ad-hoc code sign the macOS .app.
 *
 * The build sets mac.identity=null (no Developer ID / notarization yet), which
 * means electron-builder skips signing entirely. An unsigned bundle is rejected
 * by Gatekeeper and — critically — will not launch at all on Apple Silicon,
 * which requires at least an ad-hoc signature. We ad-hoc sign here so the app
 * runs locally. This is NOT a substitute for Developer ID signing + notarization
 * for public distribution (users still see an "unidentified developer" prompt on
 * a browser-downloaded copy), but it makes the app runnable.
 */
import { execFileSync } from 'node:child_process';
import path from 'node:path';

export default async function afterPack(context) {
  if (context.electronPlatformName !== 'darwin') return;
  const productFilename = context.packager.appInfo.productFilename;
  const appPath = path.join(context.appOutDir, `${productFilename}.app`);
  console.log(`[after-pack] ad-hoc signing ${appPath}`);
  execFileSync('codesign', ['--force', '--deep', '--sign', '-', appPath], {
    stdio: 'inherit',
  });
  console.log('[after-pack] ad-hoc signing complete');
}
