// 987 coolingRadiator — delegates to the shared 981 builder. Verified against
// the 2009 Service Introduction (Cooling, doc p23–24 / fig 1_44_09) and the
// 2006 Cayman S cutaway: the 987 packaging matches what the 981 module draws —
//   - two corner radiators angled into the front bumper inlets, electric fans
//     behind the cores, A/C condenser stacked on the radiator face;
//   - optional centre (third) radiator low in the nose (hot-climate / S);
//   - engine-compartment coolant expansion tank with fill cap (the 996-era
//     trunk tank is gone);
//   - belt-driven coolant pump: on the 987.2 9A1 it is an EXTERNAL module on
//     the cylinder-bank-1–3 side of the crankcase (max flow +20% vs M96/M97),
//     which the 981 module's pump + pulley geometry already represents;
//   - long twin coolant pipes along the sills to the mid-mounted engine.
// 987-correct wording lives in public/models/components/987/cooling-parts.json.
import { meta as base, build as build981 } from '../coolingRadiator.mjs';

export const meta = { ...base, generation: '987' };

export function build() {
  return build981();
}
