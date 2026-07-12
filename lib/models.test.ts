/**
 * Tests for sub-generation resolution (987.1 vs 987.2).
 * Run: npx tsx lib/models.test.ts
 */
import { subGeneration } from './models';
import type { BodyType } from './types';

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

const v = (body: BodyType, engine: string, trans: string, year: string) => ({ body, engine, trans, year });

// Unambiguous powertrain signals win regardless of year.
assert(subGeneration(v('cayman-987', '2.9 L Flat-Six', '6-Speed Manual', '2010')) === '987.2', '2.9 → 987.2');
assert(subGeneration(v('cayman-987', '3.4 L Flat-Six (S)', '7-Speed PDK', '2005')) === '987.2', 'PDK → 987.2 even if year odd');
assert(subGeneration(v('boxster-987', '2.7 L Flat-Six', '5-Speed Manual', '2007')) === '987.1', '2.7 → 987.1');
assert(subGeneration(v('cayman-987', '3.4 L Flat-Six (S)', '5-Speed Tiptronic S', '2011')) === '987.1', 'Tiptronic → 987.1');

// Ambiguous 3.4 S / plain manual → fall back to model year (987.2 = MY2009+).
assert(subGeneration(v('cayman-987', '3.4 L Flat-Six (S)', '6-Speed Manual', '2011')) === '987.2', '3.4 S 2011 → 987.2 by year');
assert(subGeneration(v('cayman-987', '3.4 L Flat-Six (S)', '6-Speed Manual', '2007')) === '987.1', '3.4 S 2007 → 987.1 by year');

// The Spyder is a 987.2 body.
assert(subGeneration(v('spyder-987', '3.4 L Flat-Six (S)', '6-Speed Manual', '2011')) === '987.2', 'Spyder 2011 → 987.2');

// Non-987 cars have no sub-generation.
assert(subGeneration(v('boxster', '3.4 L Flat-Six (S)', '7-Speed PDK', '2014')) === null, '981 → null');
assert(subGeneration(v('cayman-gt4-981', '3.8 L Flat-Six (Spyder/GT4)', '6-Speed Manual', '2016')) === null, '981 GT4 → null');

console.log('lib/models sub-generation tests OK');
