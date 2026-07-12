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
// Discovered live on a real 981 (bcm-finder.mjs open-filter sweep): comfort/body
// modules sit at request ids ~0x70B–0x76F and reply on request+0x6A over UDS
// `19 02` — NOT the +8 emissions convention. The front BCM is confirmed (it
// returned the real fault 89 02 0E). The other ~20 responders are reachable but
// not yet mapped to a function; add them here as they're identified.
const CANDIDATES_981: UdsModule[] = [
  { id: 'bcm-front', name: 'BCM front (body)', reqId: '70E', respId: '778', protocol: 'uds', addressConfirmed: true, note: 'Front Body Control Module — verified: returns 89 02 0E (front compartment light).' },
];

const REGISTRY: Record<string, UdsModule[]> = {
  '987': [DME, ...CANDIDATES_987],
  '981': [DME, ...CANDIDATES_981],
};

/** Modules to scan for a generation. Unknown generations fall back to DME-only. */
export function udsModulesFor(generation: string): UdsModule[] {
  return REGISTRY[generation] ?? [DME];
}
