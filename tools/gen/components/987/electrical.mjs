// 987 electrical — delegates to the shared 981 builder. Verified against the
// 2006/2009 packaging (cutaways + lib/data-987.ts): battery under the front
// luggage-compartment floor, fuse/relay carrier at the driver-side footwell,
// alternator + starter on the rear mid-engine — identical placement to what
// the 981 module draws, so no geometry fork is needed. The 987.2 has no PDCC
// or electric steering hardware; 987-correct wording (AGM battery in the
// frunk, 9A1 alternator, Sport Chrono Package Plus console switch) lives in
// public/models/components/987/elec-parts.json.
import { meta as base, build as build981 } from '../electrical.mjs';

export const meta = { ...base, generation: '987' };

export function build() {
  return build981();
}
