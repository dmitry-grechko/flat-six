/**
 * Smoke tests for variant-aware brake maintenance.
 * Run: npx tsx lib/knowledge/brakes.test.ts
 */
import { brakeMaintenance, brakeSizeOf } from './brakes';

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

// Brake-package resolution from the engine label.
assert(brakeSizeOf('2.7 L Flat-Six') === 'base', 'size base 2.7');
assert(brakeSizeOf('2.9 L Flat-Six') === 'base', 'size base 2.9');
assert(brakeSizeOf('3.4 L Flat-Six (S)') === 's', 'size S 3.4');
assert(brakeSizeOf('3.4 L Flat-Six (GTS)') === 's', 'size S GTS');
assert(brakeSizeOf('3.8 L Flat-Six (Spyder/GT4)') === 's', 'size S 3.8');
assert(brakeSizeOf('') === 's', 'size defaults to S');

const S = { engine: '3.4 L Flat-Six (S)' };
const BASE = { engine: '2.7 L Flat-Six' };

// 981 front, S → larger 330 mm disc + full torque set from the KB.
const f981s = brakeMaintenance('fbrakes', S, '981');
assert(!!f981s && /330 mm/.test(f981s.spec), '981 front S disc 330 mm');
assert(!!f981s && /160 Nm/.test(f981s.torque!), '981 front wheel bolt 160 Nm');
assert(!!f981s && /caliper 85 Nm/.test(f981s.torque!), '981 front caliper 85 Nm');
assert(!!f981s && /disc screw 10 Nm/.test(f981s.torque!), '981 front disc screw 10 Nm');
// No lb-ft parenthetical leaks into the composed torque line.
assert(!!f981s && !/lb-ft/.test(f981s.torque!), '981 front torque has no lb-ft');

// 981 front, base → the smaller 315 mm disc.
const f981base = brakeMaintenance('fbrakes', BASE, '981');
assert(!!f981base && /315 mm/.test(f981base.spec), '981 front base disc 315 mm');

// 981 rear → 299 mm disc, park-brake note.
const r981 = brakeMaintenance('rbrakes', S, '981');
assert(!!r981 && /299 mm/.test(r981.spec), '981 rear disc 299 mm');
assert(!!r981 && /parking brake/i.test(r981.note), '981 rear park-brake note');

// 981 brake fluid → trusted DOT 4 P/N from the KB + bleeder torque.
const fluid981 = brakeMaintenance('brakefluid', S, '981');
assert(!!fluid981 && fluid981.fluids[0]?.partNumber === '000-043-210-82', '981 brake fluid P/N');
assert(!!fluid981 && /14 Nm/.test(fluid981.torque!), '981 bleeder 14 Nm');

// 987 front, S → 28 mm (new) thickness from the KB + 130 Nm wheel bolt.
const f987s = brakeMaintenance('fbrakes', S, '987');
assert(!!f987s && /28 mm/.test(f987s.spec), '987 front S disc 28 mm');
assert(!!f987s && /130 Nm/.test(f987s.torque!), '987 front wheel bolt 130 Nm');

// 987.1 base (2.7) → the smaller 24 mm (new) front rotor.
const f987base = brakeMaintenance('fbrakes', BASE, '987');
assert(!!f987base && /24 mm/.test(f987base.spec), '987.1 2.7 front base disc 24 mm');

// 987.2 base (2.9) got the S brake on the FRONT axle from the factory (2009 SI):
// front disc is S-size (28 mm), but the REAR stays base (20 mm).
const NINE = { engine: '2.9 L Flat-Six' };
const f987_29 = brakeMaintenance('fbrakes', NINE, '987');
assert(!!f987_29 && /28 mm/.test(f987_29.spec), '987.2 2.9 front = S 28 mm (not 24)');
assert(!!f987_29 && !/24 mm/.test(f987_29.spec), '987.2 2.9 front is not the 24 mm base');
const r987_29 = brakeMaintenance('rbrakes', NINE, '987');
assert(!!r987_29 && /20 mm/.test(r987_29.spec), '987.2 2.9 rear = base 20 mm');
// The front upsizing is 987-only: a 981 2.7 keeps its base 315 mm front.
const f981_27 = brakeMaintenance('fbrakes', { engine: '2.7 L Flat-Six' }, '981');
assert(!!f981_27 && /315 mm/.test(f981_27.spec), '981 2.7 front stays base 315 mm');

// Non-brake / unknown component → null so the UI keeps its own copy.
assert(brakeMaintenance('oil', S, '981') === null, 'non-brake → null');
assert(brakeMaintenance('fbrakes', S, '999') === null, 'unknown generation → null');

console.log('lib/knowledge brakes tests OK');
