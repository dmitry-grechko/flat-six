/**
 * Smoke tests for lib/obd/insights (fuel trims, readiness, misfire).
 * Run: npx tsx lib/obd/insights.test.ts
 */
import { analyzeFuelTrims, assessReadiness, misfireCounts } from './insights';
import type { Mode06Data, Mode06Test, MonitorStatus } from './types';

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

/* ------------------------------------------------------------- fuel trims */

// Both banks near-zero → normal / ok, direction normal.
const ftNormal = analyzeFuelTrims({ stft_b1_pct: 2, ltft_b1_pct: 1, stft_b2_pct: -2, ltft_b2_pct: 1 });
assert(ftNormal.bank1?.total === 3 && ftNormal.bank1?.severity === 'ok', 'trims: B1 total 3, ok');
assert(ftNormal.bank1?.direction === 'normal', 'trims: near-zero direction normal');
assert(ftNormal.overall?.scope === 'normal' && ftNormal.overall.severity === 'ok', 'trims: overall normal/ok');
assert(/normal/i.test(ftNormal.summary) && /±10%/.test(ftNormal.hint), 'trims: normal summary + hint');

// A positive-but-small total is still "normal" direction (near-zero), not lean.
const ftSmall = analyzeFuelTrims({ stft_b1_pct: 5, ltft_b1_pct: 3 });
assert(ftSmall.bank1?.total === 8 && ftSmall.bank1?.direction === 'normal', 'trims: +8% is normal, not lean');

// Both banks lean & significant → systemic, worst severity alert.
const ftSystemic = analyzeFuelTrims({ stft_b1_pct: 12, ltft_b1_pct: 16, stft_b2_pct: 12, ltft_b2_pct: 8 });
assert(ftSystemic.bank1?.total === 28 && ftSystemic.bank1?.severity === 'alert', 'trims: B1 28 alert');
assert(ftSystemic.bank2?.total === 20 && ftSystemic.bank2?.severity === 'watch', 'trims: B2 20 watch');
assert(ftSystemic.overall?.scope === 'systemic' && ftSystemic.overall.direction === 'lean', 'trims: systemic lean');
assert(ftSystemic.overall?.severity === 'alert', 'trims: systemic worst severity alert');
assert(/both banks are adding fuel/i.test(ftSystemic.hint), 'trims: systemic lean hint');

// One bank rich & significant, other normal → bank-specific.
const ftBank = analyzeFuelTrims({ stft_b1_pct: -20, ltft_b1_pct: -10, stft_b2_pct: 1, ltft_b2_pct: 2 });
assert(ftBank.bank1?.total === -30 && ftBank.bank1?.direction === 'rich', 'trims: B1 -30 rich');
assert(ftBank.overall?.scope === 'bank-specific' && ftBank.overall.direction === 'rich', 'trims: bank-specific rich');
assert(/bank 1 is pulling fuel/i.test(ftBank.hint), 'trims: bank-1 rich hint names bank 1');

// Both significant but opposite directions → not systemic.
const ftSplit = analyzeFuelTrims({ stft_b1_pct: 14, ltft_b1_pct: 14, stft_b2_pct: -14, ltft_b2_pct: -14 });
assert(ftSplit.overall?.scope === 'bank-specific', 'trims: opposite directions are not systemic');

// Boundary: |total| exactly 10 → watch, exactly 25 → watch, 9.x → ok.
assert(analyzeFuelTrims({ stft_b1_pct: 6, ltft_b1_pct: 4 }).bank1?.severity === 'watch', 'trims: 10 → watch');
assert(analyzeFuelTrims({ stft_b1_pct: 13, ltft_b1_pct: 12 }).bank1?.severity === 'watch', 'trims: 25 → watch');
assert(analyzeFuelTrims({ stft_b1_pct: 5, ltft_b1_pct: 4.9 }).bank1?.severity === 'ok', 'trims: 9.9 → ok');

// Unit-tagged string values coerce to numbers.
const ftStr = analyzeFuelTrims({ stft_b1_pct: '12.5', ltft_b1_pct: '13' });
assert(ftStr.bank1?.total === 25.5 && ftStr.bank1?.severity === 'alert', 'trims: string values coerce');

// Missing / partial data → nulls, no throw.
const ftNone = analyzeFuelTrims({});
assert(ftNone.bank1 === null && ftNone.bank2 === null && ftNone.overall === null, 'trims: empty → nulls');
assert(analyzeFuelTrims(null).overall === null, 'trims: null input → no crash');
const ftPartial = analyzeFuelTrims({ stft_b1_pct: 15 }); // LTFT missing
assert(ftPartial.bank1?.total === null && ftPartial.overall === null, 'trims: partial bank not analysable');

// Zero is real data, not "missing".
const ftZero = analyzeFuelTrims({ stft_b1_pct: 0, ltft_b1_pct: 0 });
assert(ftZero.bank1?.total === 0 && ftZero.bank1?.severity === 'ok', 'trims: 0 is data, ok');

/* --------------------------------------------------------------- readiness */

function monitor(id: string, label: string, available: boolean, incomplete: boolean) {
  return { id, label, available, incomplete };
}
function readiness(mil: boolean, monitors: MonitorStatus['monitors']): MonitorStatus {
  return { mil, dtcCount: 0, ignition: 'spark', monitors };
}

// null → not ready, explains no data.
const rNull = assessReadiness(null);
assert(!rNull.ready && rNull.incompleteLabels.length === 0 && /no readiness/i.test(rNull.note), 'readiness: null');

// MIL off, all complete → ready.
const rAll = assessReadiness(
  readiness(false, [monitor('cat', 'Catalyst', true, false), monitor('o2', 'O2 Sensor', true, false)]),
);
assert(rAll.ready && rAll.incompleteLabels.length === 0, 'readiness: all complete → ready');

// MIL off, exactly one incomplete → still ready (single-monitor allowance).
const rOne = assessReadiness(
  readiness(false, [monitor('cat', 'Catalyst', true, false), monitor('evap', 'EVAP', true, true)]),
);
assert(rOne.ready && rOne.incompleteLabels.length === 1 && rOne.incompleteLabels[0] === 'EVAP', 'readiness: one incomplete → ready');

// MIL off, two incomplete → not ready.
const rTwo = assessReadiness(
  readiness(false, [monitor('evap', 'EVAP', true, true), monitor('o2', 'O2 Sensor', true, true)]),
);
assert(!rTwo.ready && rTwo.incompleteLabels.length === 2, 'readiness: two incomplete → not ready');

// MIL on → never ready, even with everything complete.
const rMil = assessReadiness(readiness(true, [monitor('cat', 'Catalyst', true, false)]));
assert(!rMil.ready && rMil.mil && /MIL is on/i.test(rMil.note), 'readiness: MIL on → not ready');

// Unsupported monitors do not count as incomplete.
const rUnsupported = assessReadiness(
  readiness(false, [monitor('evap', 'EVAP', true, true), monitor('sec', 'Secondary Air', false, true)]),
);
assert(rUnsupported.ready && rUnsupported.incompleteLabels.length === 1, 'readiness: unsupported monitor ignored');

/* ----------------------------------------------------------------- misfire */

function misfire(mid: string, cyl: number | null, value: number, monitorLabel?: string): Mode06Test {
  return {
    mid,
    tid: '0B',
    uasid: '24',
    monitor: monitorLabel ?? (cyl == null ? 'Misfire · Monitor' : `Misfire · Cylinder ${cyl}`),
    value,
    min: 0,
    max: 0xffff,
    signed: false,
    result: 'pass',
  };
}
function mode06(tests: Mode06Test[]): Mode06Data {
  return { at: '', supportedMids: [], tests, errors: [] };
}

// null / no-misfire → empty.
assert(misfireCounts(null).length === 0, 'misfire: null → []');
const catalystOnly = mode06([
  { mid: '21', tid: '85', uasid: '05', monitor: 'Catalyst B1', value: 0, min: 0, max: 32768, signed: false, result: 'pass' },
]);
assert(misfireCounts(catalystOnly).length === 0, 'misfire: no misfire MIDs → []');

// Six cylinders, one clear outlier (cyl 5). Sorted ascending by cylinder.
const six = mode06([
  misfire('A1', 1, 0),
  misfire('A2', 2, 0),
  misfire('A3', 3, 1),
  misfire('A4', 4, 0),
  misfire('A5', 5, 150),
  misfire('A6', 6, 2),
]);
const sixOut = misfireCounts(six);
assert(sixOut.length === 6, 'misfire: 6 cylinders');
assert(sixOut.map((c) => c.cylinder).join(',') === '1,2,3,4,5,6', 'misfire: sorted by cylinder');
const cyl5 = sixOut.find((c) => c.cylinder === 5)!;
assert(cyl5.count === 150 && cyl5.outlier, 'misfire: cyl 5 elevated flagged');
assert(sixOut.filter((c) => c.outlier).length === 1, 'misfire: only cyl 5 is an outlier');

// Even counts across cylinders → no outliers.
const even = mode06([10, 11, 9, 12, 10, 11].map((v, i) => misfire(`A${i + 1}`, i + 1, v)));
assert(misfireCounts(even).every((c) => !c.outlier), 'misfire: even counts → no outlier');

// Multiple TIDs on one cylinder → count is the max, and that drives the flag.
const multi = mode06([
  misfire('A1', 1, 0),
  { ...misfire('A2', 2, 1), tid: '0B' },
  { ...misfire('A2', 2, 18), tid: '24' },
  misfire('A3', 3, 0),
]);
const multiOut = misfireCounts(multi);
const cyl2 = multiOut.find((c) => c.cylinder === 2)!;
assert(cyl2.count === 18 && cyl2.outlier, 'misfire: multi-TID cylinder uses max count and flags');

// General MID $A0 → cylinder null, kept in the list, never flagged.
const withGeneral = mode06([misfire('A0', null, 5), misfire('A1', 1, 0), misfire('A2', 2, 0)]);
const gen = misfireCounts(withGeneral);
const general = gen.find((c) => c.cylinder === null)!;
assert(!!general && general.count === 5 && !general.outlier, 'misfire: general MID A0 → cylinder null, not flagged');
assert(gen[gen.length - 1].cylinder === null, 'misfire: general row sorts last');

// Cylinder parsed from label even when MID arithmetic would differ.
const labelled = mode06([misfire('A1', null, 3, 'Misfire · Cylinder 4')]);
assert(misfireCounts(labelled)[0].cylinder === 4, 'misfire: cylinder read from label');

console.log('lib/obd insights tests OK');
