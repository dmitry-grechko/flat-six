// 987 fuelSystem — delegates to the shared 981 builder. Verified against the
// 2009 Service Introduction (Fuel supply, doc p39–41 / fig 2_08_09): ~64 l
// tank (incl. ~10 l reserve) low ahead of the cabin, in-tank pump module with
// sucking-jet pump, LIFETIME fuel filter and ~5.0 bar pressure regulator
// inside the tank (returnless system), low-pressure line running aft to the
// engine (987.2 DFI: to the high-pressure pump on bank 1 — engine-side scope;
// 987.1 2.9/MPI: ~4 bar at the injectors), filler neck on the right, EVAP
// carbon canister with leakage diagnosis unit (USA/Canada). This matches the
// 981 module's tank/pump/filler geometry, so only the wording in
// public/models/components/987/fuel-parts.json differs.
import { meta as base, build as build981 } from '../fuelSystem.mjs';

export const meta = { ...base, generation: '987' };

export function build() {
  return build981();
}
