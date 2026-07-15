'use client';

import type { ObdClient } from './types';

type Invoke = (channel: string, ...args: unknown[]) => Promise<unknown>;

function getInvoke(): Invoke {
  const api = typeof window !== 'undefined' ? window.flatsix : undefined;
  if (!api?.invoke) throw new Error('Electron IPC not available');
  return api.invoke;
}

/** ObdClient over Electron preload IPC (serialport in main). */
export function createElectronObdClient(): ObdClient {
  const invoke = getInvoke();
  return {
    health: () => invoke('obd:health') as ReturnType<ObdClient['health']>,
    listPorts: () => invoke('obd:listPorts') as ReturnType<ObdClient['listPorts']>,
    connect: (opts) => invoke('obd:connect', opts) as ReturnType<ObdClient['connect']>,
    disconnect: () => invoke('obd:disconnect') as ReturnType<ObdClient['disconnect']>,
    status: () => invoke('obd:status') as ReturnType<ObdClient['status']>,
    capabilities: () => invoke('obd:capabilities') as ReturnType<ObdClient['capabilities']>,
    getLive: () => invoke('obd:getLive') as ReturnType<ObdClient['getLive']>,
    refreshLive: (opts) => invoke('obd:refreshLive', opts) as ReturnType<ObdClient['refreshLive']>,
    getFaults: () => invoke('obd:getFaults') as ReturnType<ObdClient['getFaults']>,
    refreshFaults: () => invoke('obd:refreshFaults') as ReturnType<ObdClient['refreshFaults']>,
    getVehicle: () => invoke('obd:getVehicle') as ReturnType<ObdClient['getVehicle']>,
    refreshVehicle: () => invoke('obd:refreshVehicle') as ReturnType<ObdClient['refreshVehicle']>,
    getMode06: () => invoke('obd:getMode06') as ReturnType<ObdClient['getMode06']>,
    refreshMode06: () => invoke('obd:refreshMode06') as ReturnType<ObdClient['refreshMode06']>,
    getModuleScan: () => invoke('obd:getModuleScan') as ReturnType<ObdClient['getModuleScan']>,
    scanModules: (generation) => invoke('obd:scanModules', generation) as ReturnType<ObdClient['scanModules']>,
    clearFaults: (generation) => invoke('obd:clearFaults', generation) as ReturnType<ObdClient['clearFaults']>,
    pollStart: (intervalMs) => invoke('obd:pollStart', intervalMs) as ReturnType<ObdClient['pollStart']>,
    pollStop: () => invoke('obd:pollStop') as ReturnType<ObdClient['pollStop']>,
    debug: () => invoke('obd:debug') as ReturnType<ObdClient['debug']>,
  };
}
