/**
 * Native wheel & tyre fitment math — pure functions, no React, no data deps.
 *
 * This is deliberately our own implementation rather than the wheel-size.com API:
 * every result below is plain geometry, so FLAT·SIX needs no third-party fitment
 * service and stays fully offline-capable.
 *
 * Units: tyre section width in mm, aspect ratio in %, rim diameter & width in
 * inches, offset (ET) in mm. Distances are returned in mm unless noted.
 */

const MM_PER_INCH = 25.4;
const MM_PER_MILE = 1_609_344;

export interface TyreSize {
  /** section width, mm (e.g. 235) */
  width: number;
  /** aspect ratio, % (e.g. 40) */
  aspect: number;
  /** rim diameter, inch (e.g. 19) */
  rim: number;
}

/**
 * Parse a tyre string like `235/40R19`, `235/40 ZR19`, or `235/40ZR19` into its
 * numeric parts. Returns null if it doesn't look like a tyre size.
 */
export function parseTyre(input: string): TyreSize | null {
  const m = input.match(/(\d{3})\s*\/\s*(\d{2})\s*[A-Za-z ]*?(\d{2})\b/);
  if (!m) return null;
  return { width: Number(m[1]), aspect: Number(m[2]), rim: Number(m[3]) };
}

/** Format a tyre size back to the canonical `235/40R19` string. */
export function formatTyre(t: TyreSize): string {
  return `${t.width}/${t.aspect}R${t.rim}`;
}

/** Sidewall height (one side), mm. */
export function sidewallMm(width: number, aspect: number): number {
  return (width * aspect) / 100;
}

/** Overall tyre diameter, mm = rim + two sidewalls. */
export function overallDiameterMm(width: number, aspect: number, rim: number): number {
  return rim * MM_PER_INCH + 2 * sidewallMm(width, aspect);
}

/** Convenience: overall diameter straight from a TyreSize. */
export function tyreDiameterMm(t: TyreSize): number {
  return overallDiameterMm(t.width, t.aspect, t.rim);
}

/** Rolling circumference, mm. */
export function circumferenceMm(diameterMm: number): number {
  return Math.PI * diameterMm;
}

/** Tyre revolutions per mile. */
export function revsPerMile(diameterMm: number): number {
  return MM_PER_MILE / circumferenceMm(diameterMm);
}

/**
 * Speedometer error after swapping from `oldDia` to `newDia` (both mm), where the
 * speedo was calibrated for `oldDia`. Returns indicated-minus-actual as a % of
 * actual: a bigger new tyre travels further per rev, so the speedo reads LOW
 * (negative); a smaller new tyre reads HIGH (positive).
 *
 * indicated = actual · oldDia / newDia  ⇒  error% = (oldDia − newDia) / newDia · 100
 */
export function speedoErrorPct(oldDia: number, newDia: number): number {
  if (newDia === 0) return 0;
  return ((oldDia - newDia) / newDia) * 100;
}

/** Actual road speed for a given indicated speed after an old→new tyre swap. */
export function actualSpeed(indicated: number, oldDia: number, newDia: number): number {
  if (oldDia === 0) return 0;
  return indicated * (newDia / oldDia);
}

export interface OffsetInput {
  oldWidthIn: number;
  oldEt: number;
  newWidthIn: number;
  newEt: number;
}

export interface OffsetResult {
  /** + = new wheel/tyre sticks OUT further (toward the fender / more poke). */
  outerPokeMm: number;
  /** + = new wheel/tyre moves IN further (toward strut/suspension — less clearance). */
  innerMoveMm: number;
  /** How far the whole wheel's mounting shifted vs the old one (+ = outboard). */
  centerlineShiftMm: number;
}

/**
 * Offset / poke geometry for an old→new wheel swap.
 *
 * ET (offset) is the distance from the wheel's mounting face to its centreline.
 * Using the rim width consistently, the edges relative to the hub centreline are:
 *   outer edge = width/2 − ET   (outboard)
 *   inner edge = width/2 + ET   (inboard)
 * The *deltas* between old and new are exact regardless of bead-vs-flange width
 * convention, since the same convention is used on both sides.
 *
 * Example: same width, +10 mm ET → the wheel moves 10 mm inboard (outerPoke −10,
 * innerMove +10, centrelineShift −10).
 */
export function offsetDelta(i: OffsetInput): OffsetResult {
  const oldW = i.oldWidthIn * MM_PER_INCH;
  const newW = i.newWidthIn * MM_PER_INCH;

  const oldOuter = oldW / 2 - i.oldEt;
  const newOuter = newW / 2 - i.newEt;
  const oldInner = oldW / 2 + i.oldEt;
  const newInner = newW / 2 + i.newEt;

  return {
    outerPokeMm: newOuter - oldOuter,
    innerMoveMm: newInner - oldInner,
    centerlineShiftMm: i.oldEt - i.newEt,
  };
}

export interface StaggerResult {
  frontDia: number;
  rearDia: number;
  /** rear − front overall diameter, mm. */
  deltaMm: number;
  /** delta as a % of the front diameter. */
  deltaPct: number;
  /** true when |deltaPct| is within tolerance (default 3%). */
  ok: boolean;
}

/**
 * Compare front vs rear overall diameter for a staggered setup. These cars are
 * RWD so front/rear tyre *sizes* differ by design — this checks the rolling
 * *diameter* gap, which PSM/ABS calibration assumes stays within a window.
 */
export function staggerMatch(frontDia: number, rearDia: number, tolPct = 3): StaggerResult {
  const deltaMm = rearDia - frontDia;
  const deltaPct = frontDia === 0 ? 0 : (deltaMm / frontDia) * 100;
  return { frontDia, rearDia, deltaMm, deltaPct, ok: Math.abs(deltaPct) <= tolPct };
}

/** Toe angle (degrees) → toe gap (mm) measured across a wheel of `wheelDiaIn` (rim inches). */
export function toeDegToMm(toeDeg: number, wheelDiaIn: number): number {
  return wheelDiaIn * MM_PER_INCH * Math.tan((toeDeg * Math.PI) / 180);
}

/** Toe gap (mm) → toe angle (degrees) across a wheel of `wheelDiaIn` (rim inches). */
export function toeMmToDeg(toeMm: number, wheelDiaIn: number): number {
  const d = wheelDiaIn * MM_PER_INCH;
  return d ? (Math.atan(toeMm / d) * 180) / Math.PI : 0;
}
