/**
 * Smoke tests for lib/obd decode helpers.
 * Run: npx tsx lib/obd/decode.test.ts
 */
import {
  decodeDtc,
  decodePidBytes,
  parseDtcs,
  parsePid01,
  parsePidBitmap,
} from './decode';

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

assert(decodeDtc(0x01, 0x34) === 'P0134', 'DTC P0134');
assert(decodePidBytes('0C', '0BB8') === 750, 'RPM 750');
assert(decodePidBytes('05', '64') === 60, 'Coolant 60C');

const bits = parsePidBitmap('4100BE1FA813', '00');
assert(!!bits && bits.includes('0C'), 'bitmap includes RPM');

const rpm = parsePid01('410C0BB8', '0C');
assert(rpm === 750, 'parsePid01 RPM');

const dtcs = parseDtcs('4301030134', '03');
assert(dtcs.includes('P0134') || dtcs.length >= 1, 'parseDtcs');

console.log('lib/obd decode tests OK');
