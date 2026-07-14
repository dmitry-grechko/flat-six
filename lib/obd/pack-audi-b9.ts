/**
 * Audi A4 (B9, 2016–2023) — DEV pack.
 *
 * FLAT·SIX's first non-Porsche vehicle, shipped admin-only (the CarVariant carries
 * `status: 'development'`) as a scaffold to collect data on. `visibility: 'private'`
 * marks it out of any public engine release — it's a personal / in-development
 * car, not part of the open Porsche packs.
 *
 * VERIFIED live on a 2017 A4 (B9) over ISO 15765-4 (CAN 11-bit, 500 kbps): the
 * DME/ECM answers generic OBD-II (Mode 01 live data, Mode 03 generic DTCs) and UDS
 * `19 02`, and the full VAG module map (25 modules, UDS / ISO 14229) was discovered
 * and identified — see `uds-modules.ts` (`REGISTRY['audi-b9']`). Still open: enhanced
 * live PIDs (VAG `22` DIDs) and any manufacturer fault descriptions (the car scanned
 * clean, so none captured yet). Note: cluster coding writes (e.g. km↔mph units in the
 * Virtual Cockpit long coding) are gated by UDS security access level 3 — read-only here.
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
      verified: true,
      note: 'Verified on a 2017 A4 (B9): ECM 7E0/7E8 answers generic OBD Mode 03 (scanned clean) and UDS 19 02. 25 VAG modules mapped via open-filter sweep — req+0x6A response ids (see uds-modules.ts). Clear (14) stays behind the UI confirm.',
    },
    modules: udsModulesFor('audi-b9'),
  },
});
