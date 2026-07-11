/**
 * Bridge-local adapter helpers.
 * Production session host is lib/obd (ObdHost). VAS lab modules stay here for koffi/DLL.
 */

export { createVas6154Adapter, listPassThruDevices, pickVasDevice, discoverDoipVehicles } from './vas6154/adapter.mjs';

export const ADAPTER_META = [
  {
    id: 'elm327',
    label: 'ELM327 (USB / BT Classic)',
    experimental: false,
    description: 'Production — lib/obd Elm327 over serial.',
  },
  {
    id: 'vas6154',
    label: 'VAS 6154 (Experimental)',
    experimental: true,
    description: 'Lab — PassThru/DoIP raw transcript (this folder).',
  },
];
