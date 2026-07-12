/**
 * Smoke tests for variant-aware transmission maintenance.
 * Run: npx tsx lib/knowledge/transmission.test.ts
 */
import { transmissionMaintenance, transmissionKindOf } from './transmission';

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

assert(transmissionKindOf('7-Speed PDK') === 'pdk', 'kind PDK');
assert(transmissionKindOf('6-Speed Manual') === 'manual', 'kind manual');
assert(transmissionKindOf('5-Speed Tiptronic S') === 'tiptronic', 'kind tiptronic');
assert(transmissionKindOf('') === null, 'kind unknown');

// 981 PDK → both fluids with their Porsche part numbers.
const pdk = transmissionMaintenance('7-Speed PDK', '981');
assert(!!pdk && pdk.part.includes('000-043-305-13'), 'PDK clutch fluid P/N');
assert(!!pdk && pdk.part.includes('000-043-305-49'), 'PDK gear oil P/N');

// 981 manual → the 75W-90 gear oil only, NOT the PDK clutch fluid.
const man = transmissionMaintenance('6-Speed Manual', '981');
assert(!!man && man.part.includes('000-043-305-49'), 'manual gear oil P/N');
assert(!!man && !man.part.includes('305-13'), 'manual excludes PDK clutch fluid');

// 987.1 Tiptronic → ATF, not gear oil; and no coolant capacity leaks into the spec.
const tip = transmissionMaintenance('5-Speed Tiptronic S', '987');
assert(!!tip && tip.part.includes('000-043-207-00'), 'tiptronic ATF P/N');
assert(!!tip && !/coolant/i.test(tip.spec), 'tiptronic spec has no coolant');

// Unknown transmission → null so the UI falls back to generic copy.
assert(transmissionMaintenance(undefined, '981') === null, 'unknown trans → null');

console.log('lib/knowledge transmission tests OK');
