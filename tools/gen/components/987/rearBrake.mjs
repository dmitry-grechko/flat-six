// 987 rear brake assembly (id 'rbrakes') — 299 mm cross-drilled vented disc
// (299 x 20 mm base / 299 x 24 mm S — 2009 Service Introduction doc p119),
// 4-piston monobloc fixed caliper and a CABLE-OPERATED drum-in-hat parking
// brake (hand lever; no motor-on-caliper EPB on the 987 — the legacy
// `epbActuator*` node names are kept as the app pin contract and now carry
// the mechanical expander + Bowden cable drawn by the 987 makeBrake fork).
//
// Reuses makeBrake from ./frontBrake.mjs (the 987 fork), passing the rear
// node-name set so every primary part in 987/rbrakes-parts.json has an anchor.
// CRITICAL hide-list nodes kept: absPsmHydraulicUnit, brakeFluidReservoir.

import { makeBrake } from './frontBrake.mjs';

// Rear node-name set = rbrakes-parts.json primary nodes (tier !== 'sub').
const REAR_NODES = {
  root: 'rearBrake',
  rotorLeft: 'rearRotorLeft',
  rotorRight: 'rearRotorRight',
  caliperLeft: 'rearCaliperLeft',
  caliperRight: 'rearCaliperRight',
  pads: 'rearBrakePads',
  epbActuatorLeft: 'epbActuatorLeft',
  epbActuatorRight: 'epbActuatorRight',
  // Sub-node names for the drum-in-hat shoes / return springs
  epbShoeLeft: 'epbShoeLeft',
  epbShoeRight: 'epbShoeRight',
  epbSpringLeft: 'epbSpringLeft',
  epbSpringRight: 'epbSpringRight',
  wheelSpeedLeft: 'wheelSpeedSensorRearLeft',
  wheelSpeedRight: 'wheelSpeedSensorRearRight',
  absUnit: 'absPsmHydraulicUnit',
  brakeLines: 'brakeLines',
  fluidReservoir: 'brakeFluidReservoir',
  // rear has no separate master-cylinder / booster primary node (those are sub).
  masterCylinder: null,
  booster: null,
  rear: true,
};

export const meta = {
  id: 'rbrakes',
  label: 'Rear Brake (299mm)',
  system: 'Brakes',
  node: 'rearBrake',
  hotspot3d: '0 0.7 0',
  generation: '987',
};

export function build() {
  // 299 mm rear vs 318 mm front → discR 0.94 of front; disc 24 mm (S) vs 28 mm.
  return makeBrake({ discR: 0.94, discT: 0.14, pistons: 4, nodes: REAR_NODES });
}
