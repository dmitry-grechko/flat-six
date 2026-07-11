import type { DesktopUpdateStatus } from './updateClient';

export type FlatsixInvoke = (channel: string, ...args: unknown[]) => Promise<unknown>;

export interface FlatsixElectronApi {
  isElectron?: boolean;
  invoke?: FlatsixInvoke;
  onUpdateStatus?: (callback: (status: DesktopUpdateStatus) => void) => () => void;
  updateInstall?: () => Promise<unknown>;
  updateCheck?: () => Promise<unknown>;
}

declare global {
  interface Window {
    flatsix?: FlatsixElectronApi;
  }
}

export {};
