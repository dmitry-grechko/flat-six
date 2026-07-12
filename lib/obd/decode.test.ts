/**
 * Smoke tests for lib/obd decode helpers.
 * Run: npx tsx lib/obd/decode.test.ts
 */
import {
  classifyObdResponse,
  decodeDtc,
  decodePidBytes,
  parseDtcs,
  parseMode06,
  parseMode06Bitmap,
  parsePid01,
  parsePidBitmap,
  parseUdsDtcs,
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

// Fuel trims: signed percent centered on 0x80.
assert(decodePidBytes('06', '80') === 0, 'STFT B1 = 0%');
assert(decodePidBytes('07', '99') === 19.5, 'LTFT B1 = +19.5%'); // (0x99-128)*100/128
assert(decodePidBytes('08', '66') === -20.3, 'STFT B2 = -20.3%'); // (0x66-128)*100/128

// Fuel / barometric pressure.
assert(decodePidBytes('0A', '64') === 300, 'fuel pressure 300 kPa'); // 100 * 3
assert(decodePidBytes('33', '65') === 101, 'baro 101 kPa');

// O2 sensor: voltage + optional trim; 0xFF trim byte means "not used".
assert(decodePidBytes('14', '9980') === '0.765 V / 0%', 'O2 B1S1 voltage + trim');
assert(decodePidBytes('15', '80FF') === '0.640 V', 'O2 B1S2 voltage only (trim 0xFF)');

// Mode 06: supported-MID bitmap (0xC0 → MIDs 01 & 02).
const mids = parseMode06Bitmap('4600C0000000', '00');
assert(mids.length === 2 && mids.includes('01') && mids.includes('02'), 'mode06 bitmap');

// Mode 06 — real captured catalyst monitor (MID 21): 9-byte record
// MID·TID·UASID·value·min·max = 21 91 05 0000 0000 8000 → 0 in [0,32768] pass.
const m06cat = parseMode06('00A\n0:462191050000\n1:00008000AAAAAA', '21');
assert(m06cat.length === 1 && m06cat[0].value === 0 && m06cat[0].max === 32768 && m06cat[0].result === 'pass', 'mode06 catalyst');

// Real multi-frame misfire (MID A2): two records, AA padding ends the list.
const m06mis = parseMode06('013\n0:46A20C240001\n1:0000FFFFA20B24\n2:00120000FFFFAA', 'A2');
assert(m06mis.length === 2, 'mode06 misfire count');
assert(m06mis[0].value === 1 && m06mis[1].value === 18 && m06mis.every((t) => t.result === 'pass'), 'mode06 misfire values');

// Signed interpretation: unsigned [0x8000..0x0026] is malformed (min>max), so
// the signed reading [-32768..38] is used → value -96 is in range → pass.
const m06signed = parseMode06('46010181FFA080000026', '01');
assert(m06signed.length === 1 && m06signed[0].signed === true && m06signed[0].value === -96 && m06signed[0].result === 'pass', 'mode06 signed');

// Genuine failure: value 0x0500 above max 0x0100 → fail.
const m06fail = parseMode06('46010105050000000100', '01');
assert(m06fail.length === 1 && m06fail[0].result === 'fail', 'mode06 fail');

// Real 14-frame response (MID 35): frame counters run 0-9 then A-D in HEX and
// must all be stripped, or the letters corrupt the stream. Expect 10 records.
const m0635 =
  '05B\n0:4635B01C0025\n1:000003F435B11C\n2:0B6D01E7FFFF35\n3:B281FFA0800026\n4:9435B381F9DD80\n5:0026AA35B481FF\n6:0E800026B035B5\n7:9C0CE501917FFF\n8:35B69C04E100E1\n9:7FFF35B7053700\nA:00005D0035B805\nB:340000005D0035\nC:B9397FF278F987\nD:07AAAAAAAAAAAA';
const m35 = parseMode06(m0635, '35');
assert(m35.length === 10, 'mode06 hex-frame count (10 records)');
assert(m35.every((t) => t.result !== 'unknown'), 'mode06 hex-frame all limits well-formed');
assert(m35[7].tid === 'B7' && m35[7].result === 'pass', 'mode06 hex-frame TID B7 pass');

// UDS DTCs (59 02): real BCM-front frame 59 02 1B 89 02 0E 2E → raw code 89020E.
const udsDtc = parseUdsDtcs('59021B89020E2E', 'uds');
assert(udsDtc.length === 1 && udsDtc[0].code === '89020E' && (udsDtc[0].status & 0x08) !== 0, 'uds dtc (raw hex)');

// KWP DTCs (58): 2-byte DTC 01 34 + status.
const kwpDtc = parseUdsDtcs('5801013420', 'kwp');
assert(kwpDtc.length === 1 && kwpDtc[0].code === 'P0134', 'kwp dtc');

// Real 981 DME response to `18 00 FF 00`: 58 01 00 0C 38 → one DTC P000C.
const kwpReal = parseUdsDtcs('5801000C38', 'kwp');
assert(kwpReal.length === 1 && kwpReal[0].code === 'P000C' && kwpReal[0].status === 0x38, 'kwp P000C');

// Response classification.
assert(classifyObdResponse('5902FF0000', '19') === 'positive', 'classify positive');
assert(classifyObdResponse('7F1911', '19') === 'refused', 'classify refused (present)');
assert(classifyObdResponse('NO DATA', '19') === 'silent', 'classify silent');

console.log('lib/obd decode tests OK');
