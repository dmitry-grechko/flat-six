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

const REGISTRY: Record<string, UdsModule[]> = {
  '987': [DME, ...CANDIDATES_987],
  '981': [DME, ...CANDIDATES_981],
};

/** Modules to scan for a generation. Unknown generations fall back to DME-only. */
export function udsModulesFor(generation: string): UdsModule[] {
  return REGISTRY[generation] ?? [DME];
}
