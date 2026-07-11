/**
 * "Will it fit?" — native tyre/wheel fitment checker. Pure functions, no API.
 *
 * Combines three checks:
 *  1. tyre↔rim compatibility — is the tyre section width in the rim's approved
 *     range (ETRTO / Tire Rack guideline table below);
 *  2. overall-diameter vs the OEM setup (speedo error, ABS/PSM window);
 *  3. clearance — how far the wheel pokes out / moves in vs OEM (rub risk).
 */

import { overallDiameterMm, speedoErrorPct, offsetDelta } from './calc';
import type { WheelSpec } from './oem';

/**
 * Approved rim-width range per tyre section width, in inches (J).
 * [min, ideal, max]. Guideline values (ETRTO / Tire Rack) — manufacturers'
 * specs for a specific tyre can differ slightly.
 */
const RIM_RANGE_BY_TYRE: Record<number, [number, number, number]> = {
  185: [5.0, 6.0, 6.5],
  195: [5.5, 6.0, 7.0],
  205: [5.5, 6.5, 7.5],
  215: [6.0, 7.0, 8.0],
  225: [6.0, 7.5, 8.5],
  235: [6.5, 8.0, 9.0],
  245: [7.5, 8.5, 9.5],
  255: [8.0, 9.0, 10.0],
  265: [8.5, 9.5, 10.0],
  275: [9.0, 9.5, 11.0],
  285: [9.5, 10.0, 11.0],
  295: [10.0, 10.5, 11.5],
  305: [10.5, 11.0, 12.0],
  315: [10.5, 11.5, 12.0],
};

export type RimFitStatus = 'ideal' | 'ok' | 'narrow' | 'wide' | 'out' | 'unknown';

export interface RimFit {
  status: RimFitStatus;
  min: number | null;
  ideal: number | null;
  max: number | null;
  message: string;
}

/** Nearest tyre-width key (rounded to the nearest 10 mm) that we have data for. */
function nearestTyreKey(width: number): number | null {
  const keys = Object.keys(RIM_RANGE_BY_TYRE).map(Number);
  let best: number | null = null;
  let bestD = Infinity;
  for (const k of keys) {
    const d = Math.abs(k - width);
    if (d < bestD) {
      bestD = d;
      best = k;
    }
  }
  // Only trust it within 7 mm of a known width (i.e. real tyre sizes).
  return best !== null && bestD <= 7 ? best : null;
}

/** Is a tyre section width appropriate for a given rim width (J, inches)? */
export function tyreRimFit(tyreWidth: number, rimWidthJ: number): RimFit {
  const key = nearestTyreKey(tyreWidth);
  if (key === null) {
    return { status: 'unknown', min: null, ideal: null, max: null, message: 'Unusual tyre width — no rim-fit guideline.' };
  }
  const [min, ideal, max] = RIM_RANGE_BY_TYRE[key];
  const base = { min, ideal, max };
  if (rimWidthJ < min - 0.75)
    return { ...base, status: 'out', message: `Rim far too narrow — ${tyreWidth} needs ${min}–${max}J.` };
  if (rimWidthJ > max + 0.75)
    return { ...base, status: 'out', message: `Rim far too wide — ${tyreWidth} needs ${min}–${max}J.` };
  if (rimWidthJ < min)
    return { ...base, status: 'narrow', message: `Rim a bit narrow — tyre will balloon (ideal ${ideal}J).` };
  if (rimWidthJ > max)
    return { ...base, status: 'wide', message: `Rim a bit wide — tyre will be stretched (ideal ${ideal}J).` };
  if (Math.abs(rimWidthJ - ideal) <= 0.5)
    return { ...base, status: 'ideal', message: `Ideal — ${tyreWidth} on ${rimWidthJ}J.` };
  return { ...base, status: 'ok', message: `OK — within the ${min}–${max}J approved range.` };
}

export interface FitCandidate {
  rimWidth: number;
  rimDiameter: number;
  offsetEt: number;
  tire: { width: number; aspect: number };
}

export type Verdict = 'fits' | 'caution' | 'no';

export interface FitReport {
  rim: RimFit;
  /** null when there is no OEM baseline to compare against. */
  diameter: { deltaMm: number; deltaPct: number; status: Verdict; message: string } | null;
  speedo: { errorPct: number; message: string } | null;
  clearance: { outerPokeMm: number; innerMoveMm: number; status: Verdict; message: string } | null;
  overall: Verdict;
}

const worst = (a: Verdict, b: Verdict): Verdict => {
  const rank: Record<Verdict, number> = { fits: 0, caution: 1, no: 2 };
  return rank[a] >= rank[b] ? a : b;
};

/**
 * Full fitment check of a candidate wheel/tyre against an OEM baseline (the
 * selected disk's OEM spec). `oem` may be null to check tyre↔rim only.
 */
export function willItFit(candidate: FitCandidate, oem: WheelSpec | null): FitReport {
  const rim = tyreRimFit(candidate.tire.width, candidate.rimWidth);
  let overall: Verdict =
    rim.status === 'out' ? 'no' : rim.status === 'narrow' || rim.status === 'wide' ? 'caution' : 'fits';

  let diameter: FitReport['diameter'] = null;
  let speedo: FitReport['speedo'] = null;
  let clearance: FitReport['clearance'] = null;

  if (oem) {
    const candDia = overallDiameterMm(candidate.tire.width, candidate.tire.aspect, candidate.rimDiameter);
    const oemDia = overallDiameterMm(oem.tire.width, oem.tire.aspect, oem.rimDiameter);
    const deltaMm = candDia - oemDia;
    const deltaPct = oemDia ? (deltaMm / oemDia) * 100 : 0;
    const dStatus: Verdict = Math.abs(deltaPct) > 5 ? 'no' : Math.abs(deltaPct) > 3 ? 'caution' : 'fits';
    diameter = {
      deltaMm,
      deltaPct,
      status: dStatus,
      message:
        dStatus === 'fits'
          ? 'Rolling diameter within ±3% of OEM.'
          : dStatus === 'caution'
            ? 'Rolling diameter 3–5% off OEM — speedo/ABS drift.'
            : 'Rolling diameter >5% off OEM — not recommended.',
    };

    const err = speedoErrorPct(oemDia, candDia);
    speedo = {
      errorPct: err,
      message: `Speedo reads ${err > 0 ? 'high' : err < 0 ? 'low' : 'unchanged'} by ${Math.abs(err).toFixed(1)}%.`,
    };

    const off = offsetDelta({
      oldWidthIn: oem.rimWidth,
      oldEt: oem.offsetEt,
      newWidthIn: candidate.rimWidth,
      newEt: candidate.offsetEt,
    });
    const cStatus: Verdict =
      off.outerPokeMm > 15 || off.innerMoveMm > 15 ? 'no' : off.outerPokeMm > 8 || off.innerMoveMm > 8 ? 'caution' : 'fits';
    clearance = {
      outerPokeMm: off.outerPokeMm,
      innerMoveMm: off.innerMoveMm,
      status: cStatus,
      message:
        cStatus === 'fits'
          ? 'Sits close to OEM — clearance similar.'
          : `${off.outerPokeMm >= 0 ? `+${off.outerPokeMm.toFixed(0)} mm poke` : `${(-off.outerPokeMm).toFixed(0)} mm tuck`}, ${off.innerMoveMm >= 0 ? `${off.innerMoveMm.toFixed(0)} mm toward strut` : `${(-off.innerMoveMm).toFixed(0)} mm off strut`} — check fender/strut clearance.`,
    };

    overall = worst(overall, worst(dStatus, cStatus));
  }

  return { rim, diameter, speedo, clearance, overall };
}
