/**
 * Back-compat note — ELM327 now lives in lib/obd.
 * Bridge entry: `npm start` → server.ts → ObdHost.
 * Browser-safe: import from '../../lib/obd/index.ts'
 * Node host: import from '../../lib/obd/node.ts'
 */
export { Elm327, PRIORITY_PIDS, SECONDARY_PIDS, UDS_PLACEHOLDER_MODULES } from '../../lib/obd/index.ts';
