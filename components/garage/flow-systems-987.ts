import type { FlowSystem } from './flow-systems';

/**
 * 987 (Boxster/Cayman 2005–2012, 987.2-flavored) flow systems for the unified
 * X-RAY scene. Same rendering contract as the 981 `FLOW_SYSTEMS` — car-space
 * control points, point order = flow direction.
 *
 * Notable 987 differences vs the 981 set:
 *  - Hydraulic power steering (belt-driven pump + CHF fluid) — the 981 went
 *    electric, so this LINES run only exists here.
 *  - Descriptions reference 987 packaging (987.2 9A1 DFI / 987.1 M96-M97).
 * Routing geometry is seeded from the 981 — both cars share the mid-engine,
 * front-radiator, center-exit-exhaust layout; the intake/exhaust runs are
 * calibrated against the 2009 Service Introduction figures.
 */
export const FLOW_SYSTEMS_987: FlowSystem[] = [
  // ── AIR ──────────────────────────────────────────────────────────────────
  {
    id: 'intake',
    layer: 'air',
    label: 'Intake Air',
    color: '#A5B4FC',
    pipe: { color: '#23262b', metalness: 0.3, roughness: 0.6 },
    radius: 0.05,
    speed: 0.16,
    desc: 'Intake air is drawn through the driver-side rear-quarter scoop into the single engine-compartment air cleaner, past the hot-film MAF sensor to the central throttle valve, then through the twin-flow distribution pipe and resonance tube into both intake manifolds of the mid-mounted flat six.',
    relatedAssembly: 'airfilter',
    labelAt: [-0.4, 0.52, -0.65],
    paths: [
      // Driver-side scoop → air cleaner → MAF → intake tube → central throttle
      // → distribution pipe → Bank 2 (left) manifold
      { points: [[-1.05, 0.32, -0.5], [-0.86, 0.36, -0.62], [-0.68, 0.44, -0.72], [-0.45, 0.46, -0.665], [-0.2, 0.475, -0.63], [0, 0.45, -0.64], [-0.15, 0.4, -0.73], [-0.25, 0.34, -0.7], [-0.355, 0.2, -0.69]] },
      // Distribution pipe branch → Bank 1 (right) manifold
      { points: [[0, 0.44, -0.68], [0.12, 0.41, -0.73], [0.25, 0.34, -0.7], [0.355, 0.2, -0.69]] },
    ],
  },
  {
    id: 'exhaust-flow',
    layer: 'air',
    label: 'Exhaust Flow',
    color: '#F97316',
    pipe: { color: '#c9b79f', metalness: 1.0, roughness: 0.5 },
    radius: 0.032,
    speed: 0.22,
    desc: 'Burnt gases leave each bank through the manifold with its integrated main catalytic converter (987.2 — the 987.1 carried its main cats in the rear silencers), sweep outboard through the connecting pipes into the diagonal rear silencers, mix in the crossover pipes between them, and exit the central tailpipes — twin tips on S models, a single oval tip on the base cars.',
    relatedAssembly: 'exhaust',
    labelAt: [0, -0.55, -2.15],
    paths: [
      // Left bank: manifold + integrated cat (close to the engine) → connecting
      // pipe outboard → diagonal silencer (front-outboard → rear-inboard) →
      // crossover mix at centre → tailpipe
      { points: [
        [-0.26, -0.50, -1.45], [-0.30, -0.60, -1.62], [-0.33, -0.65, -1.80],
        [-0.38, -0.67, -1.98], [-0.42, -0.68, -2.12], [-0.36, -0.70, -2.22],
        [-0.26, -0.71, -2.30], [-0.15, -0.71, -2.36], [-0.06, -0.71, -2.40],
        [0.00, -0.71, -2.42], [-0.04, -0.71, -2.47],
      ] },
      { points: [
        [0.26, -0.50, -1.45], [0.30, -0.60, -1.62], [0.33, -0.65, -1.80],
        [0.38, -0.67, -1.98], [0.42, -0.68, -2.12], [0.36, -0.70, -2.22],
        [0.26, -0.71, -2.30], [0.15, -0.71, -2.36], [0.06, -0.71, -2.40],
        [0.00, -0.71, -2.42], [0.04, -0.71, -2.47],
      ] },
    ],
  },
  // ── LINES ────────────────────────────────────────────────────────────────
  {
    id: 'coolant',
    layer: 'lines',
    label: 'Coolant Lines',
    color: '#34D399',
    pipe: { color: '#202225', metalness: 0.2, roughness: 0.8 },
    radius: 0.03,
    speed: 0.12,
    desc: 'The mid engine pumps coolant forward through underbody sill pipes to the twin front radiators and back — the long mid-engine coolant loop the 987 shares with every Boxster/Cayman, and the reason bleeding the system is a ritual.',
    relatedAssembly: 'cooling',
    labelAt: [-0.95, -0.3, 0.6],
    paths: [
      { points: [[-0.3, 0.05, -0.72], [-0.7, -0.45, -0.35], [-0.84, -0.55, 0.3], [-0.72, -0.45, 1.2], [-0.41, -0.07, 1.86]] },
      { points: [[0.41, -0.07, 1.86], [0.72, -0.45, 1.2], [0.84, -0.55, 0.3], [0.7, -0.45, -0.35], [0.3, 0.05, -0.72]] },
    ],
  },
  {
    id: 'oil-lines',
    layer: 'lines',
    label: 'Oil Circuit',
    color: '#F59E0B',
    pipe: { color: '#303338', metalness: 0.2, roughness: 0.8 },
    radius: 0.024,
    speed: 0.14,
    desc: 'Integrated dry-sump circuit: four scavenge stages pull oil from the heads, the demand-controlled pressure stage feeds the crank and cam galleries through the filter console — on the mid-engine 987.2 the cartridge is accessed from beneath, with the pressure sensor on top.',
    relatedAssembly: 'oil',
    labelAt: [0.85, 0.4, -0.9],
    paths: [
      { closed: true, points: [[0.2, -0.18, -0.8], [0.5, -0.06, -0.98], [0.64, 0.12, -0.9], [0.5, 0.35, -0.8], [0.2, 0.3, -0.68], [0.04, 0.05, -0.72]] },
    ],
  },
  {
    id: 'fuel',
    layer: 'lines',
    label: 'Fuel Line',
    color: '#F472B6',
    pipe: { color: '#3b3f45', metalness: 0.6, roughness: 0.55 },
    radius: 0.021,
    speed: 0.1,
    desc: 'Fuel is drawn from the tank ahead of the cabin by the in-tank pump and routed along the center tunnel to the engine — on the 987.2 DFI a high-pressure pump on the engine then lifts rail pressure to up to 120 bar.',
    relatedAssembly: 'fuel',
    labelAt: [-0.1, -0.25, 0.4],
    paths: [
      { points: [[0, -0.2, 0.9], [-0.1, -0.4, 0.55], [-0.15, -0.42, 0], [-0.2, -0.3, -0.5], [-0.42, 0.22, -0.85]] },
    ],
  },
  {
    id: 'ps-lines',
    layer: 'lines',
    label: 'Power Steering',
    color: '#C084FC',
    pipe: { color: '#2b2e33', metalness: 0.5, roughness: 0.6 },
    radius: 0.018,
    speed: 0.11,
    desc: 'Unlike the electric 981, the 987 steers hydraulically: a belt-driven pump on the engine pushes CHF 11S fluid forward along the right sill to the rack at the front axle, returning to the frunk reservoir which feeds the pump back through the suction line. Whining on lock usually means low fluid.',
    relatedAssembly: 'susp',
    labelAt: [0.72, -0.1, 0.3],
    // Pump / reservoir / rack bodies live in the 987 susp GLB (psPump,
    // psReservoir, steeringRack — carSpace ×0.95); these runs thread them.
    // Waypoints match susp GLB nodes × worldScale 0.95 (psPump / rack / psReservoir).
    paths: [
      // Pressure: engine-driven pump → right sill → rack valve body
      { points: [[0.55, 0.02, -0.95], [0.59, -0.28, -0.48], [0.59, -0.34, 0.48], [0.52, -0.27, 1.05], [0.43, -0.18, 1.29]] },
      // Return: rack → frunk reservoir
      { points: [[0.42, -0.19, 1.33], [0.48, 0.0, 1.29], [0.52, 0.28, 1.25]] },
      // Suction: reservoir → right sill → pump
      { points: [[0.52, 0.28, 1.25], [0.59, -0.19, 0.57], [0.57, -0.24, -0.38], [0.55, 0.08, -0.95]] },
    ],
  },
  {
    id: 'brake-lines',
    layer: 'lines',
    label: 'Brake Lines',
    color: '#38BDF8',
    pipe: { color: '#c2c6cc', metalness: 1.0, roughness: 0.35 },
    radius: 0.014,
    speed: 0.08,
    desc: 'The master cylinder at the cowl drops the hydraulic lines to the floor pan — short runs along the front subframe to the front calipers, long runs down the tunnel to the rears. S models clamp 318 mm front / 299 mm rear discs.',
    relatedAssembly: 'fbrakes',
    labelAt: [0.62, 0.52, 1.25],
    paths: [
      { points: [[0.35, 0.3, 1.15], [0.35, -0.4, 1.3], [-0.2, -0.52, 1.38], [-0.8, -0.45, 1.4], [-1.08, -0.36, 1.4]] },
      { points: [[0.35, 0.3, 1.15], [0.4, -0.35, 1.3], [0.8, -0.45, 1.4], [1.08, -0.36, 1.4]] },
      { points: [[0.35, 0.3, 1.15], [0.3, -0.45, 0.9], [0.25, -0.52, 0.2], [-0.1, -0.52, -0.7], [-0.7, -0.5, -1.25], [-1.08, -0.36, -1.38]] },
      { points: [[0.35, 0.3, 1.15], [0.3, -0.45, 0.9], [0.25, -0.52, 0.2], [0.3, -0.52, -0.7], [0.7, -0.5, -1.25], [1.08, -0.36, -1.38]] },
    ],
    nodes: [
      { id: 'master-cyl', label: 'Master Cylinder', at: [0.35, 0.33, 1.15], size: [0.16, 0.12, 0.22], color: '#8b8e93' },
    ],
  },
  // ── WIRING ───────────────────────────────────────────────────────────────
  {
    id: 'harness',
    layer: 'wiring',
    label: 'Main Harness',
    color: '#FCD34D',
    pipe: { color: '#1a1c1f', metalness: 0.2, roughness: 0.85 },
    radius: 0.016,
    speed: 0.3,
    desc: 'Power runs from the front-trunk battery through the fuse and relay panel, then the main loom follows the tunnel to the DME, alternator and starter at the mid-mounted engine.',
    relatedAssembly: 'elec',
    labelAt: [0.7, 0.4, 0.9],
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
  // ── VACUUM ───────────────────────────────────────────────────────────────
  {
    id: 'vacuum-brake',
    layer: 'vacuum',
    label: 'Brake Booster Vacuum',
    color: '#94A3B8',
    pipe: { color: '#1c1e21', metalness: 0.15, roughness: 0.85 }, // thin black rubber hose
    radius: 0.013,
    speed: 0.09,
    desc: 'On the 987.2 (9A1 DFI) a cam-driven vacuum pump evacuates the brake booster through an inline check valve, because direct injection leaves little manifold vacuum to spare. The earlier 987.1 (M96/M97 port injection) drew booster vacuum straight off the intake and had no dedicated pump. A hard pedal on the first press after the car sits points at the check valve or a cracked supply hose.',
    relatedAssembly: 'fbrakes',
    labelAt: [0.52, 0.12, 0.35],
    paths: [
      // Cam-driven vacuum pump → check valve → brake booster at the cowl
      { points: [[0.2, 0.04, -0.9], [0.27, 0.0, -0.4], [0.3, 0.03, 0.2], [0.33, 0.12, 0.7], [0.35, 0.24, 0.95]] },
    ],
    nodes: [
      { id: 'vac-pump', label: 'Vacuum Pump', at: [0.2, 0.04, -0.9], size: [0.1, 0.1, 0.12], color: '#4a4d52' },
      { id: 'check-valve', label: 'Check Valve', at: [0.3, 0.03, 0.2], size: [0.06, 0.06, 0.1], color: '#2f3237' },
      { id: 'booster', label: 'Brake Booster', at: [0.35, 0.26, 0.96], size: [0.17, 0.17, 0.13], color: '#55585d' },
    ],
  },
  {
    id: 'vacuum-evap',
    layer: 'vacuum',
    label: 'EVAP / Tank Vent',
    color: '#94A3B8',
    pipe: { color: '#1c1e21', metalness: 0.15, roughness: 0.85 },
    radius: 0.013,
    speed: 0.09,
    desc: 'Fuel vapor from the tank is stored in the charcoal canister ahead of the cabin; when the DME opens the tank-vent (purge) valve, manifold vacuum draws the stored vapor into the intake to be burned. A stuck or leaking purge valve, or a cracked line, is the usual cause of an evaporative-emissions (EVAP) fault code and a failed smoke test.',
    relatedAssembly: 'fuel',
    labelAt: [-0.4, -0.12, 0.3],
    paths: [
      // Charcoal canister (front) → center tunnel → purge valve → intake at engine
      { points: [[0.08, -0.2, 0.98], [0.0, -0.34, 0.55], [-0.06, -0.34, 0.0], [-0.12, -0.2, -0.5], [-0.22, 0.16, -0.68], [-0.2, 0.28, -0.62]] },
    ],
    nodes: [
      { id: 'canister', label: 'Charcoal Canister', at: [0.1, -0.2, 1.0], size: [0.16, 0.12, 0.12], color: '#2f3237' },
      { id: 'purge-valve', label: 'Purge Valve', at: [-0.22, 0.2, -0.66], size: [0.07, 0.06, 0.08], color: '#3a3d42' },
    ],
  },
  {
    id: 'vacuum-flap',
    layer: 'vacuum',
    label: 'Intake Resonance Flap',
    color: '#94A3B8',
    pipe: { color: '#1c1e21', metalness: 0.15, roughness: 0.85 },
    radius: 0.013,
    speed: 0.09,
    desc: 'The variable intake tunes runner length for both low-end torque and top-end power: a vacuum diaphragm swings the resonance/tuning flap in the intake distributor (the "resonance valve" on the 987.1, "tuning flaps" on the 987.2). A small reservoir and an electric solenoid hold and switch the vacuum. A leaking actuator or split hose leaves the flap stuck in one position and dulls throttle response at one end of the rev range.',
    relatedAssembly: 'airfilter',
    labelAt: [0.5, 0.5, -0.78],
    paths: [
      // Vacuum reservoir / solenoid → flap actuator on the intake plenum
      { points: [[0.32, 0.16, -0.98], [0.3, 0.26, -0.84], [0.26, 0.36, -0.75], [0.2, 0.42, -0.7]] },
    ],
    nodes: [
      { id: 'vac-reservoir', label: 'Vacuum Reservoir', at: [0.33, 0.15, -1.0], size: [0.12, 0.1, 0.1], color: '#2f3237' },
      { id: 'flap-actuator', label: 'Flap Actuator', at: [0.2, 0.43, -0.7], size: [0.08, 0.06, 0.08], color: '#3a3d42' },
    ],
  },
];
