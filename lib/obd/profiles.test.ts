/**
 * Smoke tests for the per-generation OBD profile registry.
 * Run: npx tsx lib/obd/profiles.test.ts
 */
import { obdProfile, obdProfileGenerations } from './profiles';

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

// 981 is the verified-on-a-real-car profile: DME speaks KWP, reads via 18 00 FF 00.
const p981 = obdProfile('981');
assert(p981.dme.protocol === 'kwp', '981 DME is KWP');
assert(p981.dme.readCmd === '1800FF00', '981 read cmd');
assert(p981.dme.clearCmd === '14FF00', '981 clear cmd');
assert(p981.dme.verified === true, '981 read verified');
assert(p981.modules.some((m) => m.id === 'dme'), '981 includes DME module');

// 991 profile defaults to UDS (candidate, unverified).
const p991 = obdProfile('991');
assert(p991.dme.protocol === 'uds' && p991.dme.readCmd === '1902FF', '991 DME is UDS');
assert(p991.dme.verified === false, '991 unverified');

// Unknown generation falls back to UDS defaults, never throws.
const pUnknown = obdProfile('zzz');
assert(pUnknown.dme.protocol === 'uds', 'unknown → UDS default');
assert(pUnknown.modules.length >= 1, 'unknown → at least DME');

assert(obdProfileGenerations().includes('981'), 'registry lists 981');

console.log('lib/obd profiles tests OK');
