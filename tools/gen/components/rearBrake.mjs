// Rear brake assembly (id 'rbrakes'). 299 mm vented disc, smaller red 4-piston
// caliper WITH an integrated electronic parking brake (EPB) motor-in-caliper
// actuator. Reuses the shared makeBrake builder from frontBrake.mjs, passing the
// rear node-name set so every primary part in rbrakes-parts.json gets a pin
// anchor (rotors, calipers, pads, EPB actuators, wheel-speed sensors, ABS/PSM
// unit, brake lines, and the fluid reservoir).

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
};

export function build() {
  return makeBrake({ discR: 0.85, discT: 0.13, pistons: 4, nodes: REAR_NODES });
}
