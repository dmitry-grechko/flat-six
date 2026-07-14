/**
 * Audi A4 (B9, 2016–2023) — DEV pack.
 *
 * FLAT·SIX's first non-Porsche vehicle, shipped admin-only (the CarVariant carries
 * `status: 'development'`) as a scaffold to collect data on. `visibility: 'private'`
 * marks it out of any public engine release — it's a personal / in-development
 * car, not part of the open Porsche packs.
 *
 * What works today: the DME/ECM answers generic OBD-II (Mode 01 live data, Mode 03
 * generic DTCs) like any compliant car. What is UNVERIFIED — the "collect the
 * data" work dev mode exists to hold — is VAG manufacturer fault memory, the
 * non-DME module map (UDS / ISO 14229), enhanced PIDs, and DID identity reads. The
 * profile below is generic UDS until confirmed on the actual car.
 */
import { registerVehiclePack } from './packs';
import { udsModulesFor } from './uds-modules';

registerVehiclePack({
  key: 'audi-b9',
  make: 'Audi',
  model: 'A4 (B9)',
  generation: 'audi-b9',
  visibility: 'private',
  profile: {
    generation: 'audi-b9',
    cylinders: 4, // base 2.0 TFSI inline-four (the S4 V6 is a later trim — refine then)
    dme: {
      protocol: 'uds',
      readCmd: '1902FF',
      readSid: '19',
      clearCmd: '14FFFFFF',
      clearSid: '14',
      verified: false,
      note: 'Candidate — B9 is VAG UDS (ISO 14229). Generic OBD Mode 03 is confirmed-universal; manufacturer fault memory + module addresses are unverified. Discover on-car with tools/obd-bridge/uds-probe.mjs.',
    },
    modules: udsModulesFor('audi-b9'),
  },
});
