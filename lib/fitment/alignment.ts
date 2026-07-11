/**
 * OEM alignment reference for 981 & 987 Boxster/Cayman — numeric (decimal degrees)
 * so the alignment calculator can check measured values against the range.
 *
 * 987: VERIFIED from the factory workshop manual ("44 Adjustment values for
 * suspension alignment", standard suspension) — see 987.1 WM v3 p843-844.
 *
 * 981: UNCONFIRMED. Values are a community/dealer spec sheet for a PASM car
 * lowered ~10 mm. To be confirmed against the factory "4X00IN Adjustment values
 * for suspension alignment" sheet (not in our document set) — tracked in GitHub
 * issue #7. Sign convention: camber negative = top tilts in; toe positive = toe-in.
 */

export interface Range {
  /** target/spec value, decimal degrees (or inches for ride height) */
  spec: number;
  /** acceptable minimum */
  min: number;
  /** acceptable maximum */
  max: number;
}

export interface AxleSpec {
  camber: Range;
  toe: Range;
  /** front axle only */
  caster?: Range;
  /** convention note for toe, e.g. "total" or "per wheel" */
  toeNote?: string;
}

export interface GenAlignment {
  generation: '981' | '987';
  /** suspension/height context the values apply to */
  setup: string;
  front: AxleSpec;
  rear: AxleSpec;
  /** optional ride-height reference (display strings) */
  rideHeight?: { front: string; rear: string };
  verified: boolean;
  source: string;
  notes?: string;
}

export const ALIGNMENT: Record<'981' | '987', GenAlignment> = {
  // ── 981 — UNCONFIRMED (PASM, lowered ~10 mm) ──────────────────────────────
  '981': {
    generation: '981',
    setup: 'PASM, lowered ~10 mm',
    front: {
      camber: { spec: -0.5, min: -0.8, max: -0.3 },
      toe: { spec: 0.02, min: -0.03, max: 0.06 },
      caster: { spec: 8.2, min: 7.4, max: 8.7 },
      toeNote: 'total',
    },
    rear: {
      camber: { spec: -1.5, min: -1.8, max: -1.3 },
      toe: { spec: 0.13, min: 0.05, max: 0.22 },
      toeNote: 'total',
    },
    rideHeight: { front: '14.7″ ± 0.4″', rear: '15.1″ ± 0.4″' },
    verified: false,
    source: 'Community/dealer spec sheet (PASM, -10 mm) — pending confirmation vs factory 4X00IN',
    notes:
      'UNCONFIRMED — for a PASM car lowered ~10 mm; standard-suspension figures differ. Confirm against the factory "4X00IN Adjustment values for suspension alignment" sheet.',
  },
  // ── 987 — VERIFIED (standard suspension) ─────────────────────────────────
  '987': {
    generation: '987',
    setup: 'Standard suspension',
    front: {
      camber: { spec: -0.17, min: -0.42, max: 0.08 },
      toe: { spec: 0.08, min: 0.0, max: 0.17 },
      caster: { spec: 8.0, min: 7.5, max: 8.5 },
      toeNote: 'total',
    },
    rear: {
      camber: { spec: -1.33, min: -1.58, max: -1.08 },
      toe: { spec: 0.08, min: 0.0, max: 0.17 },
      toeNote: 'per wheel',
    },
    verified: true,
    source: 'Porsche Workshop Manual (987) — "44 Adjustment values for suspension alignment", standard',
    notes: 'PASM / sport chassis run more negative camber than these standard figures.',
  },
};

export function alignmentForGeneration(gen: string | null | undefined): GenAlignment | null {
  if (gen !== '981' && gen !== '987') return null;
  return ALIGNMENT[gen];
}

export type CheckStatus = 'in' | 'low' | 'high';

/** Where a measured value falls relative to a spec range. */
export function checkValue(measured: number, range: Range): CheckStatus {
  if (measured < range.min) return 'low';
  if (measured > range.max) return 'high';
  return 'in';
}
