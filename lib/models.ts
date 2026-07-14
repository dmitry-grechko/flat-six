import type { BodyType, Vehicle } from './types';

/**
 * Registry of selectable car variants — the single source of truth for which
 * 3D models the app can render. Add a generation/body by appending an entry
 * here (and its `id` to BodyType, its credit to lib/credits, and dropping the
 * GLB in public/models). Everything else (selector chips, exterior viewer,
 * default model name) is derived from this list.
 */
export interface CarVariant {
  /** stable id, also stored as vehicle.body */
  id: BodyType;
  generation: '981' | '987' | '991' | (string & {});
  bodyStyle: 'boxster' | 'cayman' | 'sedan';
  /** short label for the model picker chip, e.g. "Cayman (987)" */
  label: string;
  /** default vehicle.model when this variant is chosen, e.g. "Cayman S (987)" */
  modelName: string;
  /** public path of the exterior GLB */
  glb: string;
  /**
   * Whether we have the 2D cutaway hotspot experience (front + engine images
   * with clickable component pins) for this variant. Both 981 and 987 do.
   */
  hasCutaway2D: boolean;
  /**
   * Whether we have per-part 3D X-ray internals (assembly GLBs + parts
   * manifests + flow systems) for this variant. 981 and 987 both do — the
   * 987 set lives under /models/components/987/ (xray-assemblies-987).
   */
  hasXray3D: boolean;
  /**
   * Optional signature powertrain for variants that shipped in only one config
   * (e.g. the 981 GT4 is a 3.8 L, manual-only car). When set, new vehicles of
   * this variant seed to it and the model picker snaps to it, instead of the
   * generic per-generation default. Must exactly match a string returned by
   * enginesFor()/transmissionsFor() for this variant's generation.
   */
  defaultEngine?: string;
  defaultTransmission?: string;
  /**
   * Release gate. 'development' variants are hidden from the model picker for
   * non-admin users (but stay fully functional once in a garage) — the mechanism
   * for shipping an in-progress car to production for admin testing before it is
   * made public. Defaults to 'stable' when unset.
   */
  status?: 'stable' | 'development';
  /**
   * Manufacturer. Defaults to 'Porsche' when unset (every legacy variant). Set
   * explicitly for other marques (e.g. 'Audi') as multi-marque support lands.
   */
  make?: string;
}

export const CAR_VARIANTS: CarVariant[] = [
  { id: 'boxster', generation: '981', bodyStyle: 'boxster', label: 'Boxster (981)', modelName: 'Boxster S (981)', glb: '/models/boxster-real.glb', hasCutaway2D: true, hasXray3D: true },
  { id: 'cayman', generation: '981', bodyStyle: 'cayman', label: 'Cayman (981)', modelName: 'Cayman S (981)', glb: '/models/cayman.glb', hasCutaway2D: true, hasXray3D: true },
  // Cayman GT4 (981) — dedicated exterior GLB; shares the 981 cutaway + X-ray.
  // Only ever a 3.8 L flat-six with a 6-speed manual (no PDK), so it carries a
  // signature powertrain instead of the generic 981 S/PDK default.
  { id: 'cayman-gt4-981', generation: '981', bodyStyle: 'cayman', label: 'Cayman GT4 (981)', modelName: 'Cayman GT4 (981)', glb: '/models/cayman-gt4-981.glb', hasCutaway2D: true, hasXray3D: true, defaultEngine: '3.8 L Flat-Six (Spyder/GT4)', defaultTransmission: '6-Speed Manual' },
  { id: 'cayman-987', generation: '987', bodyStyle: 'cayman', label: 'Cayman (987)', modelName: 'Cayman S (987)', glb: '/models/cayman-987.glb', hasCutaway2D: true, hasXray3D: true },
  // No Boxster 987 GLB yet — reuse the Cayman 987 model for the 3D exterior.
  // Same generation, so it shares the 987 cutaway + knowledge + documents.
  { id: 'boxster-987', generation: '987', bodyStyle: 'boxster', label: 'Boxster (987)', modelName: 'Boxster S (987)', glb: '/models/cayman-987.glb', hasCutaway2D: true, hasXray3D: true },
  // Boxster Spyder (987.2) — dedicated exterior GLB; shares 987 cutaway + X-ray.
  { id: 'spyder-987', generation: '987', bodyStyle: 'boxster', label: 'Spyder (987)', modelName: 'Boxster Spyder (987)', glb: '/models/spyder-987.glb', hasCutaway2D: true, hasXray3D: true },
  // Audi A4 (B9, 2016–2023) — DEV MODE (status: 'development'): admin-only in the
  // model picker. FLAT·SIX's first non-Porsche marque — a scaffold to collect
  // models/data on. No 2D cutaway / 3D X-ray yet (honest absence); OBD runs on a
  // generic-UDS pack (lib/obd/pack-audi-b9.ts). Powertrain is provisional.
  { id: 'audi-a4-b9', make: 'Audi', generation: 'audi-b9', bodyStyle: 'sedan', label: 'A4 (B9) · dev', modelName: 'Audi A4 (B9)', glb: '/models/audi-a4-b9.glb', hasCutaway2D: false, hasXray3D: false, status: 'development', defaultEngine: '2.0 TFSI', defaultTransmission: '7-Speed S tronic (DSG)' },
];

export function getVariant(id: BodyType): CarVariant {
  return CAR_VARIANTS.find((v) => v.id === id) ?? CAR_VARIANTS[0];
}

export function variantGlb(id: BodyType): string {
  return getVariant(id).glb;
}

/** All distinct generations we know about, e.g. ['981','987']. */
export const GENERATIONS: string[] = Array.from(new Set(CAR_VARIANTS.map((v) => v.generation)));

/** Resolve a stored vehicle.body id to its generation (defaults to 981). */
export function generationForBody(body: string | null | undefined): string {
  return CAR_VARIANTS.find((v) => v.id === body)?.generation ?? '981';
}

/**
 * Resolve a 987's sub-generation: 987.1 (2005–2008, M96/M97) vs 987.2 (2009–2012,
 * 9A1 DFI). Returns null for non-987 cars (981 has no such split). Used to scope
 * per-car part numbers — e.g. the 9A1 DFI engine/fuel parts only apply to 987.2.
 *
 * Powertrain signals are unambiguous where present (2.9 / PDK = 987.2; 2.7 /
 * Tiptronic = 987.1); the shared 3.4 S and plain manuals fall back to model year.
 */
export function subGeneration(vehicle: Pick<Vehicle, 'body' | 'engine' | 'trans' | 'year'>): '987.1' | '987.2' | null {
  if (generationForBody(vehicle.body) !== '987') return null;
  const engine = (vehicle.engine || '').toLowerCase();
  const trans = (vehicle.trans || '').toLowerCase();
  if (/\b2\.9\b/.test(engine) || trans.includes('pdk')) return '987.2';
  if (/\b2\.7\b/.test(engine) || trans.includes('tiptronic')) return '987.1';
  const year = parseInt(String(vehicle.year ?? '').replace(/\D/g, ''), 10);
  if (Number.isFinite(year) && year > 0) return year >= 2009 ? '987.2' : '987.1';
  return null;
}
