import type { BodyType } from './types';

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
  bodyStyle: 'boxster' | 'cayman';
  /** short label for the model picker chip, e.g. "Cayman (987)" */
  label: string;
  /** default vehicle.model when this variant is chosen, e.g. "Cayman S (987)" */
  modelName: string;
  /** public path of the exterior GLB */
  glb: string;
  /**
   * Whether we have per-part internals (X-ray parts manifests) for this variant.
   * Only the 981 has them today; other generations render exterior + recolor
   * and reuse the shared/procedural internals until their own are authored.
   */
  hasInternals: boolean;
}

export const CAR_VARIANTS: CarVariant[] = [
  { id: 'boxster', generation: '981', bodyStyle: 'boxster', label: 'Boxster (981)', modelName: 'Boxster S (981)', glb: '/models/boxster-real.glb', hasInternals: true },
  { id: 'cayman', generation: '981', bodyStyle: 'cayman', label: 'Cayman (981)', modelName: 'Cayman S (981)', glb: '/models/cayman.glb', hasInternals: true },
  { id: 'cayman-987', generation: '987', bodyStyle: 'cayman', label: 'Cayman (987)', modelName: 'Cayman S (987)', glb: '/models/cayman-987.glb', hasInternals: false },
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
