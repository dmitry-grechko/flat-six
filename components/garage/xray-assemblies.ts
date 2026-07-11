import type { EnginePart, PartsManifest } from '@/lib/types';
import { XRAY_ASSEMBLIES_987 } from './xray-assemblies-987';

/** The inspectable assemblies available in the X-RAY view. */
export interface XrayAssembly {
  id: 'engine' | 'trans' | 'exhaust' | 'fbrakes' | 'rbrakes' | 'cooling' | 'oil' | 'airfilter' | 'plugs' | 'susp' | 'elec' | 'driveline' | 'fuel';
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
  /**
   * Named GLB nodes hidden in the UNIFIED scene only (still visible + pinnable
   * in the focused single-assembly view). Used for chassis-mounted hardware
   * baked into a bilateral corner GLB — rendering it mirrored on both sides
   * would duplicate one-per-car parts (master cylinder, ABS unit…).
   */
  hideInUnified?: string[];
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
  // Exhaust spans engine headers (z≈-0.85) to the rear tips (z≈-2.0): sized so the
  // native span (ports z0 → tips z-4.05, sphere r≈3.33) lands at scale ≈0.28 and
  // the flow-systems 'exhaust-flow' tubes thread through headers→cats→X-pipe→tips.
  { id: 'exhaust',   label: 'Exhaust',           glb: '/models/components/exhaust.glb',   manifest: '/models/components/exhaust-parts.json',   hotspot3d: '0 -0.55 -1.85', displayRadius: 0.93 },
  // Brake GLBs include the chassis hydraulics (MC/booster/ABS at native y≈2.1),
  // which drag the bbox centre ~0.7 above the rotor — so the hotspot y sits HIGH
  // so the ROTOR (native origin) lands at the hub (y≈-0.33), and displayRadius is
  // sized for a ~0.2-radius rotor. Rotors sit just outboard of the suspension
  // knuckles (driveshaft ≈0.87 → suspension ≈1.05 → rotor 1.15).
  { id: 'fbrakes',   label: 'Front Brakes',      glb: '/models/components/fbrakes.glb',   manifest: '/models/components/fbrakes-parts.json',   hotspot3d: '0 -0.17 1.5',  displayRadius: 0.49, bilateral: true, lateralOffset: 1.15,
    hideInUnified: ['brakeMasterCylinder', 'brakeBooster', 'absHydraulicControlUnit'] },
  { id: 'rbrakes',   label: 'Rear Brakes',       glb: '/models/components/rbrakes.glb',   manifest: '/models/components/rbrakes-parts.json',   hotspot3d: '0 -0.2 -1.34', displayRadius: 0.46, bilateral: true, lateralOffset: 1.15,
    hideInUnified: ['absPsmHydraulicUnit', 'brakeFluidReservoir'] },
  // Cooling GLB spans radiators (native x ±1.6, z 2.2) AND engine-bay pumps: sized
  // so the front cores land at the bumper corners (±0.41, -0.07, ~1.89) at a
  // legible ~0.31 core height. The engine-bay bits compress toward mid-car — fine.
  { id: 'cooling',   label: 'Cooling System',    glb: '/models/components/cooling.glb',   manifest: '/models/components/cooling-parts.json',   hotspot3d: '0 -0.05 1.45', displayRadius: 0.80 },
  { id: 'oil',       label: 'Oil & Lubrication', glb: '/models/components/oil.glb',       manifest: '/models/components/oil-parts.json',       hotspot3d: '0.6 0.1 -0.9', displayRadius: 0.22 },
  // Dual air cleaners merge at central throttle (WM 242519 / 244601).
  { id: 'airfilter', label: 'Air Intake',        glb: '/models/components/airfilter.glb', manifest: '/models/components/airfilter-parts.json', hotspot3d: '0 0 0', carSpace: true, worldScale: 1 },
  // Ignition & fuel is a FULL flat-six model (coils on both banks at native x±1.5):
  // sit it on the engine (same hotspot, engine-scale radius) so the coils land on
  // the cylinder heads instead of rendering as a small cluster off to the side.
  { id: 'plugs',     label: 'Ignition & Fuel',   glb: '/models/components/plugs.glb',     manifest: '/models/components/plugs-parts.json',     hotspot3d: '0 0.2 -0.8', displayRadius: 0.70 },
  // Engine grew denser after WM detail pass — slightly larger display so it stays
  // the visual anchor next to exhaust/cooling in the joint view.
  // (engine displayRadius kept at 0.70; tune here if layout report flags extent)
  { id: 'susp',      label: 'Suspension',        glb: '/models/components/susp.glb',      manifest: '/models/components/susp-parts.json',      hotspot3d: '0 0 0', carSpace: true, worldScale: 0.95 },
  // Car-space: battery (passenger +X frunk) and fuse box (driver −X) must keep
  // their lateral packaging — normalize/recenter was collapsing them to centre
  // and the wiring-layer FlowNode boxes then looked like duplicates/mis-sides.
  { id: 'elec',      label: 'Electrical',        glb: '/models/components/elec.glb',      manifest: '/models/components/elec-parts.json',      hotspot3d: '0 0 0', carSpace: true, worldScale: 1 },
  { id: 'driveline', label: 'Driveline',         glb: '/models/components/driveline.glb', manifest: '/models/components/driveline-parts.json', hotspot3d: '0 0.05 0', carSpace: true, worldScale: 0.95 },
  // Fuel tank packaging (WM 20 Overview Of Fuel Tank Component ~4310) — low ahead of cabin.
  { id: 'fuel',      label: 'Fuel Tank',         glb: '/models/components/fuel.glb',      manifest: '/models/components/fuel-parts.json',      hotspot3d: '0 -0.08 0.95', displayRadius: 0.55 },
];

/** Assembly set per garage generation ('981' default, '987' has its own file). */
export function xrayAssembliesFor(generation: string): XrayAssembly[] {
  return generation === '987' ? XRAY_ASSEMBLIES_987 : XRAY_ASSEMBLIES;
}

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
