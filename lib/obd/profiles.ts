/**
 * Per-generation OBD diagnostic profiles — the map of "which protocol / which
 * command each model actually speaks". Bundled with the app (version-controlled,
 * offline-first, same for everyone), like the knowledge base.
 *
 * WHY this exists: manufacturer fault memory is NOT generic OBD. A 981 DME speaks
 * KWP2000 (`18 00 FF 00` reads its DTCs — verified on a real car; UDS `19` is
 * rejected). Newer platforms (991+) tend to speak UDS (`19 02`). Encoding this per
 * generation lets the scan/clear pick the right command automatically instead of
 * guessing. Add a generation by dropping in an entry below.
 *
 * `verified` marks whether the READ path was confirmed on a real vehicle. Clear
 * (`14`) commands are the logical counterpart of the read but are intentionally
 * left untested against a live car (clearing wipes real faults), so treat them as
 * best-effort until confirmed.
 */

import { udsModulesFor, type UdsModule } from './uds-modules';

export interface DmeFaultAccess {
  /** Protocol the DME's manufacturer fault memory speaks. */
  protocol: 'kwp' | 'uds';
  /** Command that READS all stored DTCs (beyond generic Mode 03). */
  readCmd: string;
  /** Request service id of `readCmd`, for response classification. */
  readSid: string;
  /** Command that CLEARS the manufacturer fault memory. */
  clearCmd: string;
  /** Request service id of `clearCmd`. */
  clearSid: string;
  /** True only if the READ path was confirmed on a real car of this generation. */
  verified: boolean;
  note?: string;
}

export interface ObdProfile {
  generation: string;
  /** Engine cylinder count — bounds per-cylinder misfire monitors (a flat-six
   *  reports Mode 06 MIDs beyond its 6 cylinders; the extra is an aggregate, not
   *  a real "cylinder 7"). 981/987/991 are flat-six; a 718 (982) would be 4. */
  cylinders: number;
  /** How to reach the DME's full fault memory beyond generic Mode 03. */
  dme: DmeFaultAccess;
  /** Non-DME diagnostic modules (addresses; candidates until confirmed). */
  modules: UdsModule[];
}

// KWP2000-on-CAN: `18 00 FF 00` = readDTCByStatus, status 00, group FF00 (all);
// `14 FF 00` = clearDiagnosticInformation, group FF00 (all). Verified read on 981.
const KWP_DME: Omit<DmeFaultAccess, 'verified' | 'note'> = {
  protocol: 'kwp',
  readCmd: '1800FF00',
  readSid: '18',
  clearCmd: '14FF00',
  clearSid: '14',
};

// UDS (ISO 14229): `19 02 FF` = ReadDTCInformation by status mask; `14 FF FF FF`
// = ClearDiagnosticInformation (all). Typical of newer platforms.
const UDS_DME: Omit<DmeFaultAccess, 'verified' | 'note'> = {
  protocol: 'uds',
  readCmd: '1902FF',
  readSid: '19',
  clearCmd: '14FFFFFF',
  clearSid: '14',
};

const PROFILES: Record<string, ObdProfile> = {
  '981': {
    generation: '981',
    cylinders: 6,
    dme: {
      ...KWP_DME,
      verified: true,
      note: 'Verified on a real 981: DME is KWP2000. 18 00 FF 00 reads the fault memory (returned P000C); UDS 19 is rejected (7F 19 11). Clear (14 FF 00) is the logical counterpart, untested to preserve a live fault.',
    },
    modules: udsModulesFor('981'),
  },
  '987': {
    generation: '987',
    cylinders: 6,
    dme: {
      ...KWP_DME,
      verified: false,
      note: 'Candidate — the 987 DME is likely KWP2000 like the 981; confirm 18 00 FF 00 on a real car.',
    },
    modules: udsModulesFor('987'),
  },
  '991': {
    generation: '991',
    cylinders: 6,
    dme: {
      ...UDS_DME,
      verified: false,
      note: 'Candidate — newer 991 platform likely UDS (ISO 14229); confirm 19 02 FF on a real car.',
    },
    modules: udsModulesFor('991'),
  },
};

const DEFAULT_PROFILE: ObdProfile = {
  generation: 'generic',
  cylinders: 6,
  dme: {
    ...UDS_DME,
    verified: false,
    note: 'Unknown generation — UDS defaults; may need KWP (18) on older Porsche DMEs.',
  },
  modules: udsModulesFor(''),
};

/** Generations we have a tuned OBD profile for. */
export const OBD_PROFILE_GENERATIONS = Object.keys(PROFILES);

/** The OBD profile for a generation (falls back to UDS defaults). */
export function obdProfile(generation: string): ObdProfile {
  return PROFILES[generation] ?? DEFAULT_PROFILE;
}
