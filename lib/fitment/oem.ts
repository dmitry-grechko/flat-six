/**
 * Structured OEM wheel/tyre fitment presets for 981 & 987 Boxster/Cayman.
 *
 * These numbers are extracted from the free-text `notes`/`value` prose in
 * `lib/knowledge/specs.json` (981) and `lib/knowledge/specs-987.json` (987) —
 * that data was human-readable only; this file makes it machine-readable so the
 * native fitment calculators can pre-fill OEM stock values.
 *
 * Presets are grouped by generation ('981' | '987'); the 987 set is further
 * split by sub-generation (987.1 / 987.2) in the label since fitment differs.
 * Only fitments with a complete front+rear ET in the source are included.
 *
 * VERIFICATION: the 981 presets (8Jx18 ET57 / 9Jx18 ET47; 8Jx19 ET57 / 9.5Jx19
 * ET45; 8Jx20 ET57 / 9.5Jx20 ET45) are confirmed against the factory 981 Parts
 * Catalog (2012-2016). The 987 presets share the same source and are consistent
 * with the workshop-manual wheel sizes, but no 987 parts catalog was available to
 * confirm every ET. PCD and centre bore are the standard Porsche 5x130 / 71.6 mm.
 */

/** Bolt pattern — shared across all 981/987 Boxster/Cayman. */
export const PCD = '5x130';

/** Wheel centre bore, mm — shared across all 981/987 Boxster/Cayman. */
export const CENTER_BORE_MM = 71.6;

/**
 * Wheel-bolt (lug) torque per generation, VERIFIED against the factory workshop
 * manuals: 981 = 160 Nm (WM "440519 Removing and installing wheel"), 987 = 130 Nm
 * (WM "44 Wheels and tires / tire pressure"). Both use M14x1.5 bolts, 19 mm hex.
 * NOTE: `lib/data.ts` still lists 130 Nm for the 981 — a stale pre-2011 value;
 * 160 Nm here is correct (tracked in the follow-up cleanup task).
 */
export const WHEEL_BOLT_TORQUE: Record<'981' | '987', string> = {
  '981': '160 Nm (118 lb-ft)',
  '987': '130 Nm (96 lb-ft)',
};

export interface WheelSpec {
  /** rim width, J (inch) */
  rimWidth: number;
  /** rim diameter, inch */
  rimDiameter: number;
  /** offset (ET), mm */
  offsetEt: number;
  /** fitted tyre */
  tire: {
    /** section width, mm */
    width: number;
    /** aspect ratio, % */
    aspect: number;
  };
}

export interface FitmentPreset {
  id: string;
  generation: '981' | '987';
  /** picker label, e.g. `981 · 19" (S / GTS)` */
  label: string;
  /** trims/variants this fitment shipped on, from the source `appliesTo`. */
  trims: string[];
  front: WheelSpec;
  rear: WheelSpec;
  /** source URL for the fitment figures. */
  source: string;
}

export const FITMENT_PRESETS: FitmentPreset[] = [
  // ── 981 ────────────────────────────────────────────────────────────────
  {
    id: '981-18',
    generation: '981',
    label: '981 · 18" (base / S)',
    trims: ['base 2.7', 'S 3.4'],
    front: { rimWidth: 8, rimDiameter: 18, offsetEt: 57, tire: { width: 235, aspect: 45 } },
    rear: { rimWidth: 9, rimDiameter: 18, offsetEt: 47, tire: { width: 265, aspect: 45 } },
    source: 'https://www.wheel-size.com/size/porsche/cayman/981-2013-2016/',
  },
  {
    id: '981-19',
    generation: '981',
    label: '981 · 19" (base / S / GTS)',
    trims: ['base', 'S', 'GTS'],
    front: { rimWidth: 8, rimDiameter: 19, offsetEt: 57, tire: { width: 235, aspect: 40 } },
    rear: { rimWidth: 9.5, rimDiameter: 19, offsetEt: 45, tire: { width: 265, aspect: 40 } },
    source: 'https://www.wheel-size.com/size/porsche/boxster/981-2012-2017/',
  },
  {
    id: '981-20',
    generation: '981',
    label: '981 · 20" (GTS / Spyder)',
    trims: ['GTS', 'Spyder', 'S/base 20-inch option'],
    front: { rimWidth: 8, rimDiameter: 20, offsetEt: 57, tire: { width: 235, aspect: 35 } },
    rear: { rimWidth: 9.5, rimDiameter: 20, offsetEt: 45, tire: { width: 265, aspect: 35 } },
    source: 'https://tiresize.com/tires/Porsche/Cayman/',
  },

  // ── 987 ────────────────────────────────────────────────────────────────
  {
    id: '987-1-17',
    generation: '987',
    label: '987.1 · 17" (base)',
    trims: ['987.1 2.7 base'],
    front: { rimWidth: 6.5, rimDiameter: 17, offsetEt: 55, tire: { width: 205, aspect: 55 } },
    rear: { rimWidth: 8, rimDiameter: 17, offsetEt: 40, tire: { width: 235, aspect: 50 } },
    source: 'https://www.wheel-size.com/size/porsche/cayman/987-2005-2008/',
  },
  {
    id: '987-1-18',
    generation: '987',
    label: '987.1 · 18" (base / S)',
    trims: ['987.1 2.7 base', '987.1 3.4 S'],
    front: { rimWidth: 8, rimDiameter: 18, offsetEt: 57, tire: { width: 235, aspect: 40 } },
    rear: { rimWidth: 9, rimDiameter: 18, offsetEt: 43, tire: { width: 265, aspect: 40 } },
    source: 'https://www.wheel-size.com/size/porsche/cayman/987-2005-2008/',
  },
  {
    id: '987-1-19',
    generation: '987',
    label: '987.1 · 19" (base / S option)',
    trims: ['987.1 2.7 base', '987.1 3.4 S'],
    front: { rimWidth: 8, rimDiameter: 19, offsetEt: 57, tire: { width: 235, aspect: 35 } },
    rear: { rimWidth: 9.5, rimDiameter: 19, offsetEt: 46, tire: { width: 265, aspect: 35 } },
    source: 'https://www.wheel-size.com/size/porsche/cayman/987-2005-2008/',
  },
  {
    id: '987-2-17',
    generation: '987',
    label: '987.2 · 17" (base)',
    trims: ['987.2 2.9 base'],
    front: { rimWidth: 7, rimDiameter: 17, offsetEt: 55, tire: { width: 205, aspect: 55 } },
    rear: { rimWidth: 8.5, rimDiameter: 17, offsetEt: 40, tire: { width: 235, aspect: 50 } },
    source: 'https://www.wheel-size.com/size/porsche/cayman/987-2009-2012/',
  },
  {
    id: '987-2-18',
    generation: '987',
    label: '987.2 · 18" (base / S)',
    trims: ['987.2 2.9 base', '987.2 3.4 S'],
    front: { rimWidth: 8, rimDiameter: 18, offsetEt: 57, tire: { width: 235, aspect: 40 } },
    // Note: the 987.2 18" rear is 255 (vs 265 on the 987.1).
    rear: { rimWidth: 9, rimDiameter: 18, offsetEt: 43, tire: { width: 255, aspect: 40 } },
    source: 'https://www.wheel-size.com/size/porsche/cayman/987-2009-2012/',
  },
  {
    id: '987-2-19',
    generation: '987',
    label: '987.2 · 19" (S / R)',
    trims: ['987.2 3.4 S', '987.2 3.4 R'],
    front: { rimWidth: 8.5, rimDiameter: 19, offsetEt: 55, tire: { width: 235, aspect: 35 } },
    rear: { rimWidth: 10, rimDiameter: 19, offsetEt: 42, tire: { width: 265, aspect: 35 } },
    source: 'https://www.wheel-size.com/size/porsche/cayman/987-2009-2012/',
  },
];

/** Presets for a generation ('981' | '987'); unknown generations → []. */
export function presetsForGeneration(gen: string | null | undefined): FitmentPreset[] {
  if (gen !== '981' && gen !== '987') return [];
  return FITMENT_PRESETS.filter((p) => p.generation === gen);
}

/** Look up a preset by id. */
export function getPreset(id: string): FitmentPreset | undefined {
  return FITMENT_PRESETS.find((p) => p.id === id);
}
