/** Entry for Electron / Node host bundle. */
import { ObdHost } from './host';

export function createObdHost(platform: NodeJS.Platform = process.platform): ObdHost {
  return new ObdHost(platform);
}

export { ObdHost };
