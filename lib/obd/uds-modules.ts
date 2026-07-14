/**
 * Per-generation diagnostic module registry for UDS/KWP fault scanning.
 *
 * Each entry is the CAN request ID we send a diagnostic request to, plus the
 * response ID we expect back, and which protocol family the module speaks.
 *
 * IMPORTANT: only the DME (engine, standard OBD physical address 7E0/7E8) is
 * CONFIRMED. Every other address here is a CANDIDATE — a plausible starting
 * point, `addressConfirmed: false` — to be verified on a real car with the
 * scan (a `refused` 7F response still proves the address is right; `silent`
 * means the id/gateway routing is wrong). Fill in verified ids as you learn
 * them; keep 981 and 987 separate (never cross generations).
 *
 * Reference for discovery: tools/obd-bridge/uds-probe.mjs sweeps candidate ids.
 */

export interface UdsModule {
  id: string;
  name: string;
  /** 11-bit diagnostic request CAN id (hex, no 0x). */
  reqId: string;
  /** Expected response CAN id (hex). */
  respId: string;
  /** 'obd' = read DTCs via generic Mode 03/07 (the DME); 'uds'/'kwp' = per-module. */
  protocol: 'uds' | 'kwp' | 'obd';
  /** true only when verified on a real vehicle; false = candidate to confirm. */
  addressConfirmed: boolean;
  note?: string;
}

/** DME is standard OBD physical addressing — the one confirmed anchor. */
const DME: UdsModule = {
  id: 'dme',
  name: 'DME / Engine',
  reqId: '7E0',
  respId: '7E8',
  protocol: 'obd', // read via generic Mode 03/07 — universal, no UDS needed
  addressConfirmed: true,
  note: 'Engine ECU — DTCs read via generic OBD Mode 03/07.',
};

// Candidate non-DME modules. Addresses are UNVERIFIED starting points — the
// scan will report which actually answer through the gateway on a given car.
const CANDIDATES_987: UdsModule[] = [
  { id: 'psm', name: 'PSM / ABS', reqId: '760', respId: '768', protocol: 'kwp', addressConfirmed: false, note: 'Candidate id — verify on car.' },
  { id: 'airbag', name: 'Airbag / SRS', reqId: '780', respId: '788', protocol: 'kwp', addressConfirmed: false, note: 'Candidate id — verify on car.' },
  { id: 'cluster', name: 'Instrument cluster', reqId: '720', respId: '728', protocol: 'kwp', addressConfirmed: false, note: 'Candidate id — verify on car.' },
  { id: 'pcm', name: 'PCM / Climate', reqId: '740', respId: '748', protocol: 'kwp', addressConfirmed: false, note: 'Candidate id — verify on car.' },
  { id: 'gateway', name: 'Gateway', reqId: '710', respId: '718', protocol: 'uds', addressConfirmed: false, note: 'Candidate id — verify on car.' },
];

// 987.2/981 PDK adds a transmission controller; otherwise similar candidates.
// Mapped live on a real 981 (map-all.mjs sweep → map-names.mjs read of DID 22 F1
// 97 "system name"). Comfort/body modules sit at request ids ~0x70B–0x76F and
// reply on request + 0x6A over UDS `19 02` (a few speak KWP `18 00 FF 00`) — NOT
// the +8 emissions convention. `addressConfirmed` = the address answered on a
// real car; names in (parens) are the raw F1 97 code where the function isn't
// yet certain. The DME (7E0, generic OBD) is the separate `DME` entry above.
const CANDIDATES_981: UdsModule[] = [
  { id: 'tpms', name: 'TPMS (tyre pressure)', reqId: '70B', respId: '775', protocol: 'uds', addressConfirmed: true, note: 'F1 97 = RDK (Reifendruckkontrolle).' },
  { id: 'kls', name: 'Module (KLS)', reqId: '70C', respId: '776', protocol: 'uds', addressConfirmed: true, note: 'F1 97 = KLS — function unconfirmed.' },
  { id: 'bcm-rear', name: 'BCM rear (body)', reqId: '70D', respId: '777', protocol: 'uds', addressConfirmed: true, note: 'F1 97 = BCM; rear body module (alarm/DWA).' },
  { id: 'bcm-front', name: 'BCM front (body)', reqId: '70E', respId: '778', protocol: 'uds', addressConfirmed: true, note: 'F1 97 = BCM — verified: returns 89 02 0E (front compartment light).' },
  { id: 'mod-710', name: 'Module 0x710 (zen)', reqId: '710', respId: '77A', protocol: 'uds', addressConfirmed: true, note: 'F1 97 = zen — function unconfirmed; had DTC 000603.' },
  { id: 'eps', name: 'Steering (EPS)', reqId: '712', respId: '77C', protocol: 'uds', addressConfirmed: true, note: 'F1 97 = EPS (electric power steering).' },
  { id: 'psm', name: 'PSM / ABS', reqId: '713', respId: '77D', protocol: 'uds', addressConfirmed: true, note: 'F1 97 = PSM (Porsche Stability Management).' },
  { id: 'cluster', name: 'Instrument cluster', reqId: '714', respId: '77E', protocol: 'uds', addressConfirmed: true, note: 'F1 97 = Kom (Kombiinstrument); had DTC 00A150.' },
  { id: 'airbag', name: 'Airbag / SRS', reqId: '715', respId: '77F', protocol: 'uds', addressConfirmed: true, note: 'F1 97 = AB (airbag).' },
  { id: 'pdk', name: 'PDK / Transmission', reqId: '71E', respId: '788', protocol: 'kwp', addressConfirmed: true, note: 'F1 97 = PDK; speaks KWP.' },
  { id: 'mod-725', name: 'Module 0x725', reqId: '725', respId: '78F', protocol: 'uds', addressConfirmed: true, note: 'Responds; F1 97 blank — unidentified.' },
  { id: 'mod-729', name: 'Module 0x729 (SU)', reqId: '729', respId: '793', protocol: 'uds', addressConfirmed: true, note: 'F1 97 = SU — function unconfirmed.' },
  { id: 'mod-72d', name: 'Module 0x72D (HDS)', reqId: '72D', respId: '797', protocol: 'uds', addressConfirmed: true, note: 'F1 97 = HDS — function unconfirmed.' },
  { id: 'climate', name: 'Climate (2-zone)', reqId: '746', respId: '7B0', protocol: 'uds', addressConfirmed: true, note: 'F1 97 = BKE (2-zone climate).' },
  { id: 'epb', name: 'Parking brake (EPB)', reqId: '752', respId: '7BC', protocol: 'uds', addressConfirmed: true, note: 'F1 97 = EPB; had DTC 000024 (electric parking brake).' },
  { id: 'mod-753', name: 'Module 0x753 (Wae)', reqId: '753', respId: '7BD', protocol: 'kwp', addressConfirmed: true, note: 'F1 97 = Wae — function unconfirmed; speaks KWP.' },
  { id: 'mod-754', name: 'Module 0x754', reqId: '754', respId: '7BE', protocol: 'uds', addressConfirmed: true, note: 'Responds; F1 97 = "S" — unidentified.' },
  { id: 'park-assist', name: 'Park assist (PAS)', reqId: '755', respId: '7BF', protocol: 'uds', addressConfirmed: true, note: 'F1 97 = PAS (Parkassistent).' },
  { id: 'mod-76f', name: 'Module 0x76F', reqId: '76F', respId: '7D9', protocol: 'kwp', addressConfirmed: true, note: 'Responds (KWP); F1 97 blank — unidentified.' },
  { id: 'pcm', name: 'PCM head unit', reqId: '773', respId: '7DD', protocol: 'kwp', addressConfirmed: true, note: 'F1 97 = PCM; speaks KWP.' },
  { id: 'mod-7f1', name: 'Module 0x7F1 (gateway?)', reqId: '7F1', respId: '7F9', protocol: 'uds', addressConfirmed: true, note: 'Responds; F1 97 blank — likely the gateway.' },
];

// Audi A4 (B9, MLB evo) — DISCOVERED + VERIFIED live on a 2017 A4 (VIN WAUFNAF42HN…),
// USB ELM327, ISO 15765-4 CAN 11-bit 500 kbps. An open-filter sweep of 0x700–0x7FF found
// 25 responders; each was identified with UDS `22 F1 97` (system name) + `22 F1 87` (VW
// part number). VAG uses the SAME req+0x6A response convention as the 981. All modules
// answered UDS `19 02` (fault read) and were clean. The DME (7E0, generic OBD Mode 03) is
// the shared `DME` entry above. Notes: `respId` collisions (74E/750 → 7B8, 773/774 → 7DD)
// are paired sensors / infotainment sub-modules; the ABS module (713) also answers on its
// powertrain-CAN address 7E4/7EC (not re-listed); 7F1 responds but refuses identity in the
// default session (protected). See tools/obd-bridge/ + docs/procedures/obd-module-discovery.md.
const CONFIRMED_AUDI_B9: UdsModule[] = [
  { id: 'steering-column', name: 'Steering column module', reqId: '70C', respId: '776', protocol: 'uds', addressConfirmed: true, note: 'F1 97 = Lenks.Modul; part 4M0907129GK.' },
  { id: 'bcm', name: 'Body control (BCM1)', reqId: '70E', respId: '778', protocol: 'uds', addressConfirmed: true, note: 'F1 97 = BCM1 MLBevo; part 8W0907063CG.' },
  { id: 'gateway', name: 'Gateway', reqId: '710', respId: '77A', protocol: 'uds', addressConfirmed: true, note: 'F1 97 = Gateway; part 4M1907468D.' },
  { id: 'eps', name: 'Steering assist (EPS)', reqId: '712', respId: '77C', protocol: 'uds', addressConfirmed: true, note: 'F1 97 = EPS_MLBEVO_ZF; part 8W0909144G.' },
  { id: 'abs', name: 'ABS / ESP', reqId: '713', respId: '77D', protocol: 'uds', addressConfirmed: true, note: 'F1 97 = ESP9 Plus (Bosch); part 8W0907379G. Also answers on 7E4/7EC.' },
  { id: 'cluster', name: 'Instrument cluster (Virtual Cockpit)', reqId: '714', respId: '77E', protocol: 'uds', addressConfirmed: true, note: 'F1 97 = FBenRDW; part 8W5920790C (Virtual Cockpit). Units = long coding DID 0600, byte 1 bit 1 (dual_speedometer); write needs security access level 3 (27 03).' },
  { id: 'airbag', name: 'Airbag / SRS', reqId: '715', respId: '77F', protocol: 'uds', addressConfirmed: true, note: 'F1 97 = Airbag10.44; part 8W0959655G.' },
  { id: 'front-camera', name: 'Front camera / driving assist', reqId: '730', respId: '79A', protocol: 'uds', addressConfirmed: true, note: 'F1 97 = FLA; part 8W0857511C.' },
  { id: 'climate', name: 'Climate (3-zone)', reqId: '746', respId: '7B0', protocol: 'uds', addressConfirmed: true, note: 'F1 97 = Klima Zone 3; part 8W0820043G.' },
  { id: 'door-driver', name: 'Door control, driver', reqId: '74A', respId: '7B4', protocol: 'uds', addressConfirmed: true, note: 'F1 97 = TSG FS; part 4M0959793E.' },
  { id: 'door-passenger', name: 'Door control, passenger', reqId: '74B', respId: '7B5', protocol: 'uds', addressConfirmed: true, note: 'F1 97 = TSG BFS; part 4M0959792E.' },
  { id: 'seat-memory', name: 'Seat memory, driver', reqId: '74C', respId: '7B6', protocol: 'uds', addressConfirmed: true, note: 'F1 97 = MEM-FS; part 4M1959760.' },
  { id: 'radar-rear', name: 'Rear radar (lane-change assist)', reqId: '74E', respId: '7B8', protocol: 'uds', addressConfirmed: true, note: 'F1 97 = MRR1Rear; part 4M0907566D.' },
  { id: 'radar-rear-2', name: 'Rear radar (second sensor)', reqId: '750', respId: '7B8', protocol: 'uds', addressConfirmed: true, note: 'Responds; shares resp 7B8 with 74E — paired rear sensor, identity not returned.' },
  { id: 'gear-selector', name: 'Gear selector (shift-by-wire)', reqId: '753', respId: '7BD', protocol: 'uds', addressConfirmed: true, note: 'F1 97 = GSM-LL; part 8W1713041L.' },
  { id: 'area-view', name: 'Area View camera (360°)', reqId: '769', respId: '7D3', protocol: 'uds', addressConfirmed: true, note: 'F1 97 = Areaview 2; part 4M0907428E.' },
  { id: 'mib', name: 'Infotainment (MIB2)', reqId: '76F', respId: '7D9', protocol: 'uds', addressConfirmed: true, note: 'F1 97 = MIB2_amp_P_B9; part 8W0035465.' },
  { id: 'nav', name: 'Navigation / multimedia', reqId: '773', respId: '7DD', protocol: 'uds', addressConfirmed: true, note: 'F1 97 = MU-P-LNS-US (US-spec); part 8W5035880.' },
  { id: 'mib-sub', name: 'Infotainment sub-module', reqId: '774', respId: '7DD', protocol: 'uds', addressConfirmed: true, note: 'Responds; shares resp 7DD with 773 — identity not returned.' },
  { id: 'trans', name: 'Transmission (S tronic DL382)', reqId: '7E1', respId: '7E9', protocol: 'uds', addressConfirmed: true, note: 'F1 97 = 0CL 20TFSINAR; part 8W1927155B. Also a generic-OBD emissions ECU.' },
  { id: 'mod-7f1', name: 'Protected module (7F1)', reqId: '7F1', respId: '7F9', protocol: 'uds', addressConfirmed: true, note: 'Responds but refuses 22 F1 97 in the default session — likely immobilizer / access control.' },
];

const REGISTRY: Record<string, UdsModule[]> = {
  '987': [DME, ...CANDIDATES_987],
  '981': [DME, ...CANDIDATES_981],
  // Audi A4 (B9) — DEV. DME (7E0) via generic OBD Mode 03; VAG modules mapped + verified live.
  'audi-b9': [DME, ...CONFIRMED_AUDI_B9],
};

/** Modules to scan for a generation. Unknown generations fall back to DME-only. */
export function udsModulesFor(generation: string): UdsModule[] {
  return REGISTRY[generation] ?? [DME];
}
