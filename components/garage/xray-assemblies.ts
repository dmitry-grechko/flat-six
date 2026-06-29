import type { EnginePart, PartsManifest } from '@/lib/types';

/** The inspectable assemblies available in the X-RAY view. */
export interface XrayAssembly {
  id: 'engine' | 'trans' | 'exhaust' | 'fbrakes' | 'rbrakes' | 'cooling' | 'oil' | 'airfilter' | 'plugs' | 'susp' | 'elec' | 'driveline';
  label: string;
  /** GLB rendered by <GLBViewer src>. */
  glb: string;
  /** Parts manifest fetched lazily when this assembly is first inspected. */
  manifest: string;
  /**
   * Approximate 3D position "x y z" within the car's world space for the
   * unified all-systems scene. Origin = car centroid, +Z = front of car.
   */
  hotspot3d: string;
  /**
   * Target bounding-sphere radius in scene units. Controls relative size so
   * a spark plug doesn't render the same size as the engine block.
   * Defaults to 0.65 if omitted.
   */
  displayRadius?: number;
  /**
   * When true, render this assembly mirrored on both +x and -x sides
   * (front/rear brakes both appear left AND right). lateralOffset sets
   * the x distance from centre (default 0.75).
   */
  bilateral?: boolean;
  lateralOffset?: number;
  /**
   * Car-space placement: render at a fixed `worldScale` positioned by hotspot3d
   * as a pure offset, with NO bounding-box recentering and NO per-assembly size
   * normalization. The GLB's own coordinates ARE the unified-scene car coordinates,
   * so a full-width chassis model (suspension, driveline) keeps its 4 corners at
   * the wheels and stays aligned with the (bilateral) brakes. Ignores displayRadius.
   */
  carSpace?: boolean;
  worldScale?: number;
}

/**
 * Canonical wheel-corner coordinates shared by the unified "stripped car" scene.
 * Brakes (bilateral) and the car-space suspension/driveline models all align to
 * these so rotors, hubs and springs sit at the same four corners.
 */
export const AXLE = { frontZ: 1.5, rearZ: -1.5, halfTrack: 0.82, hubY: -0.35 };

export const XRAY_ASSEMBLIES: XrayAssembly[] = [
  { id: 'engine',    label: 'Engine',           glb: '/models/components/engine.glb',    manifest: '/models/components/engine-parts.json',    hotspot3d: '0 0.2 -0.8',   displayRadius: 0.70 },
  { id: 'trans',     label: 'Transaxle',         glb: '/models/components/trans.glb',     manifest: '/models/components/trans-parts.json',     hotspot3d: '0 -0.1 -1.7',  displayRadius: 0.55 },
  { id: 'exhaust',   label: 'Exhaust',           glb: '/models/components/exhaust.glb',   manifest: '/models/components/exhaust-parts.json',   hotspot3d: '0 -0.7 -1.2',  displayRadius: 0.50 },
  // Brakes sit at the four wheel corners (AXLE). Suspension & driveline (carSpace) align to the same corners.
  { id: 'fbrakes',   label: 'Front Brakes',      glb: '/models/components/fbrakes.glb',   manifest: '/models/components/fbrakes-parts.json',   hotspot3d: '0 -0.35 1.5',  displayRadius: 0.30, bilateral: true, lateralOffset: 0.82 },
  { id: 'rbrakes',   label: 'Rear Brakes',       glb: '/models/components/rbrakes.glb',   manifest: '/models/components/rbrakes-parts.json',   hotspot3d: '0 -0.35 -1.5', displayRadius: 0.30, bilateral: true, lateralOffset: 0.82 },
  { id: 'cooling',   label: 'Cooling System',    glb: '/models/components/cooling.glb',   manifest: '/models/components/cooling-parts.json',   hotspot3d: '0 0.3 1.9',    displayRadius: 0.40 },
  { id: 'oil',       label: 'Oil & Lubrication', glb: '/models/components/oil.glb',       manifest: '/models/components/oil-parts.json',       hotspot3d: '0.6 0.1 -0.9', displayRadius: 0.12 },
  { id: 'airfilter', label: 'Air Intake',        glb: '/models/components/airfilter.glb', manifest: '/models/components/airfilter-parts.json', hotspot3d: '0 0.7 -0.6',   displayRadius: 0.22 },
  { id: 'plugs',     label: 'Ignition & Fuel',   glb: '/models/components/plugs.glb',     manifest: '/models/components/plugs-parts.json',     hotspot3d: '-0.5 0.3 -0.9', displayRadius: 0.10 },
  // susp & driveline are full-width chassis models authored in car-space (their
  // own coords = scene coords), placed raw so their 4 corners align with the brakes.
  { id: 'susp',      label: 'Suspension',        glb: '/models/components/susp.glb',      manifest: '/models/components/susp-parts.json',      hotspot3d: '0 0 0', carSpace: true, worldScale: 1 },
  { id: 'elec',      label: 'Electrical',        glb: '/models/components/elec.glb',      manifest: '/models/components/elec-parts.json',      hotspot3d: '0 0.25 0.4',  displayRadius: 0.9 },
  { id: 'driveline', label: 'Driveline',         glb: '/models/components/driveline.glb', manifest: '/models/components/driveline-parts.json', hotspot3d: '0 0 0', carSpace: true, worldScale: 1 },
];

/**
 * Fetch + cache a parts manifest per assembly. Resolves to [] if the manifest
 * 404s (pipeline hasn't generated it yet) so the viewer just shows no pins.
 */
const cache = new Map<string, Promise<EnginePart[]>>();

export function loadAssemblyParts(manifest: string): Promise<EnginePart[]> {
  let p = cache.get(manifest);
  if (!p) {
    p = fetch(manifest)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => ((d as PartsManifest | null)?.parts ?? []))
      .catch(() => []);
    cache.set(manifest, p);
  }
  return p;
}

/** A part is primary unless explicitly tagged 'sub'. */
export function isPrimary(p: EnginePart): boolean {
  return p.tier !== 'sub';
}

/** Sub-parts whose `parent` points at the given primary id. */
export function childrenOf(parts: EnginePart[], parentId: string): EnginePart[] {
  return parts.filter((p) => p.tier === 'sub' && p.parent === parentId);
}
