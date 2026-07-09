import type { XrayAssembly } from './xray-assemblies';

/**
 * X-RAY layer modes for the unified scene:
 *  - all:        assemblies + every flow system
 *  - mechanical: assemblies + dashed concept connections (the original view)
 *  - air:        ghosted assemblies + intake/exhaust flow tubes
 *  - lines:      ghosted assemblies + oil/coolant/fuel/brake line tubes
 *  - wiring:     ghosted assemblies + main harness runs, fuse box & ECU nodes
 */
export type XrayLayer = 'all' | 'mechanical' | 'air' | 'lines' | 'wiring';

export const XRAY_LAYERS: { id: XrayLayer; label: string }[] = [
  { id: 'all',        label: 'ALL' },
  { id: 'mechanical', label: 'MECHANICAL' },
  { id: 'air',        label: 'AIR' },
  { id: 'lines',      label: 'LINES' },
  { id: 'wiring',     label: 'WIRING' },
];

export type FlowLayerId = 'air' | 'lines' | 'wiring';

/**
 * One routed run of tube. Points are car-space coordinates (same frame as
 * `hotspot3d` in xray-assemblies.ts: origin = car centroid, +Z = front,
 * +X = right, wheels at z ±1.5 / rotors at x ±1.3). Point ORDER = flow
 * direction — the animated particles travel first → last.
 */
export interface FlowPathDef {
  points: [number, number, number][];
  /** Closed loop (oil circuit) — particles cycle around it. */
  closed?: boolean;
}

/** PBR spec for the pipe body — mirrors tools/gen/lib/materials.mjs palette. */
export interface PipeMaterial {
  color: string;
  metalness: number;
  roughness: number;
}

/**
 * A component body that belongs to a flow system (fuel tank, fuse box, ECU…):
 * a labeled box rendered in the same technical-illustration style, at a
 * car-space position. Selecting it selects the whole system.
 */
export interface FlowNode {
  id: string;
  label: string;
  at: [number, number, number];
  /** Box dimensions [w, h, d] in scene units. */
  size: [number, number, number];
  /** Body color (plastic/case tone from the gen palette). */
  color: string;
}

export interface FlowSystem {
  id: 'intake' | 'exhaust-flow' | 'coolant' | 'oil-lines' | 'fuel' | 'brake-lines' | 'harness';
  layer: FlowLayerId;
  label: string;
  /** System accent — used for the animated pulses, clamp fittings and label. */
  color: string;
  /** Realistic pipe body material (rubber hose, titanium header, steel line…). */
  pipe: PipeMaterial;
  /** Tube radius in scene units. */
  radius: number;
  /** Particle travel speed — full path traversals per second. */
  speed: number;
  desc: string;
  /** Assembly whose parts manifest covers this system ("inspect parts" jump). */
  relatedAssembly: XrayAssembly['id'];
  /** Car-space anchor for the floating label. */
  labelAt: [number, number, number];
  paths: FlowPathDef[];
  /** Component bodies (tank, fuse box, ECU…) rendered with the system. */
  nodes?: FlowNode[];
}

export const FLOW_SYSTEMS: FlowSystem[] = [
  // ── AIR ──────────────────────────────────────────────────────────────────
  {
    id: 'intake',
    layer: 'air',
    label: 'Intake Air',
    color: '#A5B4FC',
    pipe: { color: '#23262b', metalness: 0.3, roughness: 0.6 },   // black plastic ducting
    radius: 0.05,
    speed: 0.16,
    desc: 'Intake air enters through BOTH side scoops into dual air cleaner housings, merges at a single central throttle housing, then feeds the intake-air distributors / plenums.',
    relatedAssembly: 'airfilter',
    labelAt: [0, 0.45, -0.7],
    paths: [
      // Left scoop → L housing → throttle → L head ports
      { points: [[-1.05, 0.36, -0.5], [-0.78, 0.36, -0.55], [-0.42, 0.34, -0.62], [-0.2, 0.35, -0.58], [0, 0.35, -0.55], [-0.22, 0.32, -0.69], [-0.355, 0.2, -0.69]] },
      // Right scoop → R housing → throttle → R head ports
      { points: [[1.05, 0.36, -0.5], [0.78, 0.36, -0.55], [0.42, 0.34, -0.62], [0.2, 0.35, -0.58], [0, 0.35, -0.55], [0.22, 0.32, -0.69], [0.355, 0.2, -0.69]] },
    ],
  },
  {
    id: 'exhaust-flow',
    layer: 'air',
    label: 'Exhaust Flow',
    color: '#F97316',
    pipe: { color: '#c9b79f', metalness: 1.0, roughness: 0.5 },   // titanium-ish headers
    radius: 0.032,
    speed: 0.22,
    desc: 'Burnt gases leave both cylinder banks through the headers, merge in the catalytic converters and X-pipe under the transaxle, and exit through the twin center tailpipes.',
    relatedAssembly: 'exhaust',
    labelAt: [0, -0.55, -2.15],
    // Car-space: headers → cats → connecting pipes → muffler inlets → cans →
    // centre sleeve → twin tips (mapped from native after aft/low shift).
    paths: [
      { points: [
        [-0.24, -0.56, -1.62], [-0.21, -0.63, -1.82], [-0.21, -0.65, -1.88],
        [-0.26, -0.66, -1.99], [-0.28, -0.67, -2.10], [-0.31, -0.66, -2.19],
        [-0.37, -0.69, -2.26], [-0.30, -0.71, -2.34], [-0.16, -0.70, -2.38],
        [0.00, -0.70, -2.40], [-0.04, -0.70, -2.45],
      ] },
      { points: [
        [0.24, -0.56, -1.62], [0.21, -0.63, -1.82], [0.21, -0.65, -1.88],
        [0.26, -0.66, -1.99], [0.28, -0.67, -2.10], [0.31, -0.66, -2.19],
        [0.37, -0.69, -2.26], [0.30, -0.71, -2.34], [0.16, -0.70, -2.38],
        [0.00, -0.70, -2.40], [0.04, -0.70, -2.45],
      ] },
    ],
  },
  // ── LINES ────────────────────────────────────────────────────────────────
  {
    id: 'coolant',
    layer: 'lines',
    label: 'Coolant Lines',
    color: '#34D399',
    pipe: { color: '#202225', metalness: 0.2, roughness: 0.8 },   // black rubber hose
    radius: 0.03,
    speed: 0.12,
    desc: 'The mid engine pumps coolant forward through underbody sill pipes to the twin front radiators and back — the long 981 coolant loop that makes bleeding the system a ritual.',
    relatedAssembly: 'cooling',
    labelAt: [-0.95, -0.3, 0.6],
    paths: [
      // Feed: engine → left sill pipe → front-left radiator
      { points: [[-0.3, 0.05, -0.72], [-0.7, -0.45, -0.35], [-0.84, -0.55, 0.3], [-0.72, -0.45, 1.2], [-0.41, -0.07, 1.86]] },
      // Return: front-right radiator → right sill pipe → engine
      { points: [[0.41, -0.07, 1.86], [0.72, -0.45, 1.2], [0.84, -0.55, 0.3], [0.7, -0.45, -0.35], [0.3, 0.05, -0.72]] },
    ],
  },
  {
    id: 'oil-lines',
    layer: 'lines',
    label: 'Oil Circuit',
    color: '#F59E0B',
    pipe: { color: '#303338', metalness: 0.2, roughness: 0.8 },   // braided breather hose
    radius: 0.024,
    speed: 0.14,
    desc: 'Integrated dry-sump circuit: scavenge stages pull oil from the sump into the tank, through the filter, then the pressure stage feeds the crank and cam galleries.',
    relatedAssembly: 'oil',
    labelAt: [0.85, 0.4, -0.9],
    paths: [
      // Compact closed loop: sump → pump/filter (oil assembly sits at 0.6 0.1 -0.9) → galleries → back
      { closed: true, points: [[0.2, -0.18, -0.8], [0.5, -0.06, -0.98], [0.64, 0.12, -0.9], [0.5, 0.35, -0.8], [0.2, 0.3, -0.68], [0.04, 0.05, -0.72]] },
    ],
  },
  {
    id: 'fuel',
    layer: 'lines',
    label: 'Fuel Line',
    color: '#F472B6',
    pipe: { color: '#3b3f45', metalness: 0.6, roughness: 0.55 }, // coated steel hard line
    radius: 0.021,
    speed: 0.1,
    desc: 'Fuel is drawn from the tank ahead of the cabin bulkhead by the in-tank pump and routed along the center tunnel to the rail and injectors at the engine.',
    relatedAssembly: 'fuel',
    labelAt: [-0.1, -0.25, 0.4],
    paths: [
      // Tank outlet (underside) → center tunnel → fuel rail at the engine
      { points: [[0, -0.2, 0.9], [-0.1, -0.4, 0.55], [-0.15, -0.42, 0], [-0.2, -0.3, -0.5], [-0.42, 0.22, -0.85]] },
    ],
    // Tank body now lives in the dedicated `fuel` assembly (WM tank overview).
  },
  {
    id: 'brake-lines',
    layer: 'lines',
    label: 'Brake Lines',
    color: '#38BDF8',
    pipe: { color: '#c2c6cc', metalness: 1.0, roughness: 0.35 }, // zinc-plated steel lines
    radius: 0.014,
    speed: 0.08,
    desc: 'The master cylinder at the cowl drops the hydraulic lines straight to the floor pan — short runs along the front subframe to the front calipers, long runs down the tunnel to the rears.',
    relatedAssembly: 'fbrakes',
    labelAt: [0.62, 0.52, 1.25],
    // All four lines drop from the MC to floor level (~y -0.5) and stay low —
    // no aerial runs. Caliper ends match the resized rotors (x ±1.14, z ±1.4).
    paths: [
      // Front-left (passenger side of car in this packaging)
      { points: [[0.35, 0.3, 1.15], [0.35, -0.4, 1.3], [-0.2, -0.52, 1.38], [-0.8, -0.45, 1.4], [-1.08, -0.36, 1.4]] },
      // Front-right (driver / MC side)
      { points: [[0.35, 0.3, 1.15], [0.4, -0.35, 1.3], [0.8, -0.45, 1.4], [1.08, -0.36, 1.4]] },
      // Rear-left
      { points: [[0.35, 0.3, 1.15], [0.3, -0.45, 0.9], [0.25, -0.52, 0.2], [-0.1, -0.52, -0.7], [-0.7, -0.5, -1.25], [-1.08, -0.36, -1.38]] },
      // Rear-right
      { points: [[0.35, 0.3, 1.15], [0.3, -0.45, 0.9], [0.25, -0.52, 0.2], [0.3, -0.52, -0.7], [0.7, -0.5, -1.25], [1.08, -0.36, -1.38]] },
    ],
    nodes: [
      // Tandem master cylinder + booster on the cowl, driver's side (+X).
      { id: 'master-cyl', label: 'Master Cylinder', at: [0.35, 0.33, 1.15], size: [0.16, 0.12, 0.22], color: '#8b8e93' },
    ],
  },
  // ── WIRING ───────────────────────────────────────────────────────────────
  {
    id: 'harness',
    layer: 'wiring',
    label: 'Main Harness',
    color: '#FCD34D',
    pipe: { color: '#1a1c1f', metalness: 0.2, roughness: 0.85 }, // taped loom
    radius: 0.016,
    speed: 0.3,
    desc: 'Power runs from the front-trunk battery (passenger side) through the driver-side fuse and relay panel, then the main loom follows the tunnel to the DME, alternator and starter at the back.',
    relatedAssembly: 'elec',
    labelAt: [0.7, 0.4, 0.9],
    // Battery + fuse box live in the elec GLB — do not re-draw them as FlowNodes.
    paths: [
      { points: [[-0.62, 0.22, 1.05], [-0.3, -0.1, 0.65], [-0.25, -0.25, 0.05], [-0.3, -0.05, -0.7], [-0.35, 0.05, -0.95]] },
      { points: [[-0.62, 0.28, 1.05], [-0.2, 0.24, 1.0], [0.25, 0.22, 0.97], [0.62, 0.2, 0.95]] },
      { points: [[0.62, 0.18, 0.95], [0.5, -0.1, 0.45], [0.45, -0.25, -0.35], [0.5, 0.0, -0.8], [0.55, 0.3, -1.02]] },
      { points: [[0.55, 0.3, -1.0], [0.3, 0.35, -0.9], [0.05, 0.3, -0.85]] },
    ],
    nodes: [
      { id: 'dme', label: 'DME · ECU', at: [0.55, 0.32, -1.05], size: [0.3, 0.08, 0.24], color: '#33414d' },
    ],
  },
];

export function flowsForLayer(layer: XrayLayer): FlowSystem[] {
  if (layer === 'mechanical') return [];
  if (layer === 'all') return FLOW_SYSTEMS;
  return FLOW_SYSTEMS.filter((f) => f.layer === layer);
}
