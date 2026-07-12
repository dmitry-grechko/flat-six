// Variant-aware brake maintenance, derived from the sourced knowledge base
// (specs.json / specs-987.json) rather than hand-typed strings. Base vs S/GTS
// brakes differ — the S/GTS runs a larger vented disc, the 2.7/2.9 base a
// smaller one — so this resolves the disc size, torques, fluid and a note from
// the car's engine, exactly the way transmission.ts resolves PDK/manual/Tiptronic.
//
// Note: the KB carries brake TORQUE / DISC TOLERANCE / FLUID (all cited) but no
// pad/disc PART NUMBERS. Those are surfaced separately by the garage's
// verified-or-hidden lookup against the Supabase parts catalog — so this module
// deliberately does not invent pad/disc numbers.

import { getSpecs } from './index';
import { porschePartNumber } from './transmission';
import type { Spec } from './types';

export type BrakeSize = 'base' | 's';
export type BrakeComponentId = 'fbrakes' | 'rbrakes' | 'brakefluid';

/** The component ids the brake resolver handles (2D cutaway node ids). */
export const BRAKE_COMPONENT_IDS: BrakeComponentId[] = ['fbrakes', 'rbrakes', 'brakefluid'];

/**
 * Map an engine label to the overall brake PACKAGE. The 2.7 (981/987.1) and 2.9
 * (987.2) are the "base" cars; the 3.4 S, 3.4 GTS and 3.8 Spyder/GT4 all run the
 * larger "S" brakes. Note: on the 987.2 the base 2.9's FRONT axle was upsized to
 * the S brake at the factory — that per-axle nuance is applied in
 * brakeMaintenance, not here (this stays the whole-car package indicator).
 */
export function brakeSizeOf(engine: string | null | undefined): BrakeSize {
  const e = (engine || '').toLowerCase();
  if (/\b2\.7\b|\b2\.9\b/.test(e)) return 'base';
  return 's';
}

export interface BrakeFluid {
  name: string;
  value: string;
  partNumber: string | null;
  source?: string;
}

export interface BrakeMaintenance {
  size: BrakeSize;
  /** Card "Spec / Fill" — disc size + wear limits, or the fluid spec. */
  spec: string;
  /** Card "Torque" — composed from the KB torque specs. */
  torque: string | null;
  note: string;
  /** Trusted, cited fluids with Porsche P/Ns (brake fluid on the fluid card). */
  fluids: BrakeFluid[];
  /** The specs consulted, for citations / debugging. */
  sources: string[];
}

const specById = (specs: Spec[], id: string): Spec | undefined => specs.find((s) => s.id === id);

/** Strip the "(63 lb-ft)"-style parenthetical so composed torque lines stay short. */
const nm = (value: string): string => value.replace(/\s*\([^)]*lb-ft[^)]*\)/i, '').trim();

const FRONT_NOTE =
  'Front discs vary by model — the S/GTS run the larger vented rotor (and on the 987.2 the base 2.9 got the S front ' +
  'brake from the factory); the 981/987.1 base runs a smaller one. The wear sensor is on the front left; keep the ' +
  'guide pins clean and bed new pads in over ~200 miles.';
const REAR_NOTE =
  'The rear brake has a drum-in-hat parking brake inside the rotor. Release the park brake fully and retract the ' +
  'pistons squarely before fitting new pads. The rear disc diameter (299 mm) is shared base vs S, but the S runs a ' +
  'thicker rotor.';
const FLUID_NOTE =
  'DOT 4 low-viscosity brake fluid; flush every 2 years regardless of mileage. The reservoir sits on the master ' +
  'cylinder in the frunk — bleed farthest-caliper-first.';

/**
 * Resolve the brake maintenance card for a 2D-cutaway brake node. Returns null
 * when the generation has no brake specs (so callers fall back to the
 * component's own hand-typed copy).
 */
export function brakeMaintenance(
  componentId: string,
  vehicle: { engine: string | null | undefined },
  generation: string,
): BrakeMaintenance | null {
  if (!BRAKE_COMPONENT_IDS.includes(componentId as BrakeComponentId)) return null;

  const specs = getSpecs(generation);
  const size = brakeSizeOf(vehicle.engine);
  const wheelBolt = specById(specs, 'torque-wheel-bolt');
  const caliperFront = specById(specs, 'torque-caliper-bolt-front');
  const caliperRear = specById(specs, 'torque-caliper-bolt-rear');
  const discScrew = specById(specs, 'torque-brake-disc-screw');
  const bleeder = specById(specs, 'torque-bleeder-valve');
  const fluid = specById(specs, 'fluid-brake');
  const pad = specById(specs, 'tol-pad-min');

  const sources = (arr: (Spec | undefined)[]) =>
    arr.filter((s): s is Spec => !!s && !!s.source).map((s) => s.source!);

  if (componentId === 'brakefluid') {
    if (!fluid) return null;
    const partNumber = porschePartNumber(fluid.notes);
    return {
      size,
      spec: [fluid.value, 'change every 2 yr'].join(' · '),
      torque: bleeder ? `Bleeder ${nm(bleeder.value)}` : null,
      note: FLUID_NOTE,
      fluids: [{ name: 'Brake fluid', value: fluid.value, partNumber, source: fluid.source }],
      sources: sources([fluid, bleeder]),
    };
  }

  // Per-axle disc size. On the 987.2 the base 2.9 was upgraded to the S FRONT-axle
  // brake at the factory ("...now also equipped with the S brake system on the front
  // axle", 987 2009 Service Introduction), so its front disc is S-size while the rear
  // stays base. Everywhere else each axle follows the overall package.
  const engine = (vehicle.engine || '').toLowerCase();
  const is987TwoBase = generation === '987' && /\b2\.9\b/.test(engine);
  const frontSize: BrakeSize = size === 's' || is987TwoBase ? 's' : 'base';
  const rearSize: BrakeSize = size;

  const isFront = componentId === 'fbrakes';
  const disc = specById(specs, isFront ? `tol-front-disc-${frontSize}` : `tol-rear-disc-${rearSize}`);
  const caliper = isFront ? caliperFront : caliperRear;

  // Without a disc tolerance for this generation there's nothing sourced to show.
  if (!disc && !caliper && !wheelBolt) return null;

  const specParts = [
    disc ? `${isFront ? 'Front' : 'Rear'} disc ${disc.value}` : '',
    pad ? `pads ${pad.value.replace(/\s*friction material$/i, '')}` : '',
  ].filter(Boolean);

  const torqueParts = [
    wheelBolt ? `Wheel bolts ${nm(wheelBolt.value)}` : '',
    caliper ? `caliper ${nm(caliper.value)}` : '',
    discScrew ? `disc screw ${nm(discScrew.value)}` : '',
  ].filter(Boolean);

  return {
    size,
    spec: specParts.join(' · ') || '—',
    torque: torqueParts.join(' · ') || null,
    note: isFront ? FRONT_NOTE : REAR_NOTE,
    fluids: [],
    sources: sources([disc, caliper, wheelBolt, discScrew, pad]),
  };
}
