/**
 * Tests for the candidate part-number extractor.
 * Run: npx tsx lib/parts-extract.test.ts
 */
import { extractPartNumbers, normalizePartNumber } from './parts-extract';

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}
const eq = (a: string[], b: string[]) => a.length === b.length && a.every((x, i) => x === b[i]);

// Multiple numbers with L/R annotations + a trailing 2-digit suffix.
assert(
  eq(extractPartNumbers('Radiators 991.106.131.03 (L) / 991.106.132.03 (R) · centre 991.106.138.02'),
    ['991.106.131.03', '991.106.132.03', '991.106.138.02']),
  'radiators triple',
);

// Alphanumeric prefixes (9A1) and "PN" prose around the number.
assert(eq(extractPartNumbers('Mahle OX 366D · PN 9A1.107.224.00'), ['9A1.107.224.00']), '9A1 prefix');
assert(eq(extractPartNumbers('AGM 12 V 70 Ah (PN 999.611.070.12)'), ['999.611.070.12']), 'PN in parens');

// Letter-suffix and all-letter prefix; 3-group numbers with no suffix.
assert(
  eq(extractPartNumbers('PSE actuator 991.111.381.02 / .385.01 · solenoid 7PP.906.283.F'),
    ['991.111.381.02', '7PP.906.283.F']),
  'letter suffix + dropped fragment',
);
assert(eq(extractPartNumbers('Reservoir 991.528.703.01 · pump PAB.955.651'), ['991.528.703.01', 'PAB.955.651']), 'all-letter prefix');
assert(eq(extractPartNumbers('Rear muffler 981.111.922 · PSE valve'), ['981.111.922']), '3-group, no suffix');

// Trusted fluid P/N + a candidate reservoir number (the real brakefluid string).
assert(
  eq(extractPartNumbers('DOT 4 (P/N 000.043.210.82) · reservoir 997.355.013.01'),
    ['000.043.210.82', '997.355.013.01']),
  'brake fluid + reservoir',
);

// Non-part tokens (belt/plug codes, capacities) must NOT be extracted.
assert(eq(extractPartNumbers('Bosch FGR-5-NQE-04 · Gates 6PK1768 · Mobil 1 0W-40 · 7.5 L'), []), 'no false positives');

// A preceding all-caps word must NOT be mis-read as the prefix (dots-only rule).
assert(eq(extractPartNumbers('DME 991.618.602.03 (variant-specific)'), ['991.618.602.03']), 'DME prefix not swallowed');
// A trailing non-Porsche vendor number (spaces / no dots) is ignored.
assert(eq(extractPartNumbers('Throttle body 997.605.115.01 (Bosch 0280750474)'), ['997.605.115.01']), 'Bosch number ignored');

// De-duplication + empty input.
assert(eq(extractPartNumbers('981.351.939.04 and again 981.351.939.04'), ['981.351.939.04']), 'de-dupes');
assert(eq(extractPartNumbers(''), []), 'empty');
assert(eq(extractPartNumbers(null), []), 'null');

assert(normalizePartNumber('981.351.939.04') === '98135193904', 'normalise');

console.log('lib/parts-extract tests OK');
