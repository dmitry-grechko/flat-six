// Full Porsche 981 cooling system (id 'cooling'). A mid-engine layout: two
// front-corner radiators (with fans, air guides, A/C condenser) feed long
// coolant lines the length of the chassis back to the rear engine, where the
// water pumps, thermostat, oil cooler, PDK cooler and expansion tank live.
//
// Coordinate frame: +Z = front, -Z = rear, +Y = up, +X = right. The root group
// stays named 'coolingRadiator' (the app + manifest reference this name). Every
// PRIMARY part from cooling-parts.json is exposed as a child mesh/group whose
// name exactly equals that part's `node` field, so the app can pin it.

import { group, box, cyl, tube, sphere, at, rot } from '../lib/primitives.mjs';

export const meta = {
  id: 'cooling',
  label: 'Front Radiator & Condenser',
  system: 'Cooling',
  node: 'coolingRadiator',
  hotspot3d: '0 0 0',
};

const HALF = Math.PI / 2;

// Build one finned radiator core + alloy end tanks into a named group.
function radiatorUnit(name, sub = false) {
  const g = group(name);
  const add = (m) => { g.add(m); return m; };
  // dark finned core
  add(at(box('core', 1.2, 1.2, 0.16, 'core'), 0, 0, 0));
  for (let i = 0; i < 8; i++) {
    add(at(box(`${name}_fin_${i}`, 0.015, 1.1, 0.18, 'tank'), -0.5 + i * 0.14, 0, 0.01));
  }
  // alloy end tanks top/bottom
  add(at(box('tankTop', 1.28, 0.16, 0.2, 'tank'), 0, 0.66, 0));
  add(at(box('tankBottom', 1.28, 0.16, 0.2, 'tank'), 0, -0.66, 0));
  return g;
}

// Build an electric fan assembly (shroud + hub + a few blades) into a group.
function fanUnit(name) {
  const g = group(name);
  const add = (m) => { g.add(m); return m; };
  add(at(box('shroud', 1.1, 1.1, 0.12, 'plastic'), 0, 0, 0));
  add(rot(at(cyl('hub', 0.14, 0.14, 0.16, 'cover', 14), 0, 0, -0.08), HALF, 0, 0));
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    add(rot(at(box(`blade_${i}`, 0.42, 0.12, 0.03, 'cover'), Math.cos(a) * 0.34, Math.sin(a) * 0.34, -0.08), 0, 0, a));
  }
  return g;
}

export function build() {
  const rad = group('coolingRadiator');
  const add = (m, p = rad) => { p.add(m); return m; };

  // ---------------------------------------------------------------------------
  // FRONT END — two corner radiators, fans, air guides, condenser
  // ---------------------------------------------------------------------------
  const RZ = 2.2;          // front radiator plane (z)
  const LX = -1.6, RX = 1.6; // left / right corner x

  // PRIMARY: both front radiators. The JSON has a single combined node for the
  // pair, so this group spans both corners; the two cores live inside it.
  const radsLR = group('radiatorsLeftRight');
  radsLR.add(at(radiatorUnit('radLeftCore'), LX, 0, RZ));
  radsLR.add(at(radiatorUnit('radRightCore'), RX, 0, RZ));
  add(radsLR);

  // PRIMARY: radiator fan modules (the pair) — group spanning both fans.
  const fanModules = group('radiatorFanModules');
  fanModules.add(at(fanUnit('fanModuleLeft'), LX, 0, RZ - 0.2));
  fanModules.add(at(fanUnit('fanModuleRight'), RX, 0, RZ - 0.2));
  add(fanModules);

  // PRIMARY: dedicated left electric fan node (distinct from the module pair).
  add(at(fanUnit('radiatorFanLeft'), LX, 0, RZ - 0.34));

  // SUB: secondary / centre radiator + its fan, between the corners.
  add(at(radiatorUnit('radiatorFanSecondary', true), 0, -0.1, RZ + 0.05));

  // SUB: air guides flanking the radiators.
  add(at(box('radiatorAirGuideLeft', 0.2, 1.3, 0.5, 'plastic'), LX - 0.7, 0, RZ));
  add(at(box('radiatorAirGuideRight', 0.2, 1.3, 0.5, 'plastic'), RX + 0.7, 0, RZ));

  // SUB: A/C condenser thin panel ahead of the right radiator + its air guide.
  add(at(box('acCondenser', 1.1, 1.05, 0.08, 'plastic'), RX, 0, RZ + 0.18));
  add(at(box('acCondenserAirGuide', 1.15, 1.1, 0.06, 'plastic'), RX, 0, RZ + 0.26));

  // SUB: fan control module — a box near the left fan.
  add(at(box('fanControlModule', 0.26, 0.2, 0.12, 'cover'), LX + 0.55, -0.5, RZ - 0.3));

  // SUB: radiator-outlet coolant temp sensor on the left radiator bottom tank.
  add(rot(at(cyl('coolantTempSensorRadiatorOutlet', 0.04, 0.04, 0.12, 'steel', 10), LX + 0.55, -0.66, RZ), HALF, 0, 0));

  // ---------------------------------------------------------------------------
  // REAR / ENGINE BAY — pumps, thermostat, oil + PDK coolers, reservoir
  // ---------------------------------------------------------------------------
  const EZ = -0.9;  // engine plane (z)

  // PRIMARY: main (mechanical) water pump — cylinder on the engine.
  add(rot(at(cyl('mainWaterPump', 0.22, 0.22, 0.3, 'cast', 20), 0.25, -0.1, EZ), 0, 0, HALF));

  // PRIMARY: electric auxiliary water pump — smaller cylinder beside it.
  add(rot(at(cyl('waterPumpElectric', 0.14, 0.14, 0.22, 'cast', 18), -0.45, -0.15, EZ + 0.1), 0, 0, HALF));

  // PRIMARY: map-controlled thermostat housing near the pump.
  add(at(box('coolantThermostat', 0.24, 0.24, 0.22, 'cast'), 0.25, 0.2, EZ + 0.1));

  // SUB: pump housing, water guide housing, pulley, internal block plumbing.
  add(rot(at(cyl('coolantPumpHousing', 0.26, 0.26, 0.18, 'cast', 18), 0.25, -0.1, EZ - 0.16), 0, 0, HALF));
  add(at(box('waterGuideHousing', 0.5, 0.3, 0.3, 'cast'), 0, 0.05, EZ - 0.25));
  add(rot(at(cyl('coolantPumpPulley', 0.16, 0.16, 0.06, 'steel', 16), 0.46, -0.1, EZ), 0, 0, HALF));
  add(rot(at(cyl('waterPipeInternal', 0.06, 0.06, 0.6, 'cast', 12), 0, 0, EZ - 0.3), 0, 0, HALF));
  add(rot(at(cyl('distributerTubeLeft', 0.05, 0.05, 0.5, 'cast', 12), -0.3, 0.1, EZ - 0.28), HALF, 0, 0));
  add(rot(at(cyl('distributerTubeRight', 0.05, 0.05, 0.5, 'cast', 12), 0.3, 0.1, EZ - 0.28), HALF, 0, 0));

  // SUB: thermostat seal, engine coolant temp sensor near housing.
  add(rot(at(cyl('thermostatSeal', 0.13, 0.13, 0.03, 'rubber', 16), 0.25, 0.34, EZ + 0.1), HALF, 0, 0));
  add(rot(at(cyl('coolantTemperatureSensor', 0.04, 0.04, 0.12, 'steel', 10), 0.1, 0.28, EZ + 0.12), HALF, 0, 0));

  // PRIMARY: engine oil cooler / water-to-oil heat exchanger — box on the block.
  add(at(box('engineOilCooler', 0.4, 0.26, 0.36, 'cast'), -0.55, 0.05, EZ - 0.05));
  // PRIMARY: oil temperature sensor on the oil cooler.
  add(rot(at(cyl('oilTemperatureSensor', 0.04, 0.04, 0.14, 'steel', 10), -0.55, 0.22, EZ - 0.05), 0, 0, 0));

  // PRIMARY: PDK fluid cooler near the transaxle (further rear).
  add(at(box('pDKFluidCooler', 0.42, 0.24, 0.34, 'cast'), 0.5, -0.2, EZ - 0.4));

  // PRIMARY: coolant expansion / reservoir tank — translucent, up high, rear.
  const tank = group('coolantExpansionTank');
  tank.add(at(box('tankBody', 0.34, 0.4, 0.3, 'translucent'), 0, 0, 0));
  tank.add(at(cyl('coolantReservoirCap', 0.09, 0.09, 0.08, 'plastic', 16), 0, 0.24, 0));
  add(at(tank, -0.6, 0.62, EZ + 0.2));
  // SUB: water-level sender in the tank.
  add(rot(at(cyl('waterLevelSender', 0.04, 0.04, 0.12, 'steel', 10), -0.6, 0.4, EZ + 0.2), 0, 0, 0));

  // ---------------------------------------------------------------------------
  // PLUMBING — long front-to-rear coolant lines (mid-engine car)
  // ---------------------------------------------------------------------------
  // PRIMARY: upper radiator hose — engine outlet up to top of right radiator.
  add(tube('upperRadiatorHose', [
    [0.25, 0.34, EZ + 0.1], [0.6, 0.5, 0.2], [1.0, 0.4, 1.2], [RX, 0.66, RZ],
  ], 0.06, 'hose'));

  // PRIMARY: lower radiator hose — bottom of left radiator back to pump inlet.
  add(tube('lowerRadiatorHose', [
    [LX, -0.66, RZ], [-1.0, -0.5, 1.2], [-0.6, -0.4, 0.2], [-0.45, -0.3, EZ + 0.1],
  ], 0.06, 'hose'));

  // PRIMARY: coolant hoses (the upper+lower circuit pair as a named group).
  const hoses = group('coolantHoses');
  hoses.add(tube('hoseCircuitRight', [
    [0.3, 0.0, EZ], [0.9, 0.1, 0.6], [RX, 0.2, RZ - 0.1],
  ], 0.055, 'hose'));
  hoses.add(tube('hoseCircuitLeft', [
    [-0.3, 0.0, EZ], [-0.9, 0.1, 0.6], [LX, 0.2, RZ - 0.1],
  ], 0.055, 'hose'));
  add(hoses);

  // PRIMARY: heater hoses to/from the cabin heater core (forward, low).
  add(tube('heaterHoseSupply', [
    [0.2, 0.0, EZ + 0.1], [0.3, -0.2, 0.5], [0.35, -0.3, 1.8],
  ], 0.04, 'hose'));
  add(tube('heaterHoseReturn', [
    [0.45, -0.35, 1.8], [0.4, -0.25, 0.5], [0.3, -0.05, EZ + 0.1],
  ], 0.04, 'hose'));

  // SUB: rigid heater pipeline running through the front structure.
  add(rot(at(cyl('heaterPipeline', 0.035, 0.035, 1.6, 'tank', 12), 0.4, -0.32, 1.0), HALF, 0, 0));

  // SUB: aluminium crossover pipes left/right spanning the engine bay.
  add(tube('coolantPipes', [
    [-0.6, -0.4, EZ], [0, -0.45, 0.4], [0.6, -0.4, 1.4],
  ], 0.05, 'tank'));
  add(rot(at(cyl('crossoverPipeLeft', 0.045, 0.045, 2.6, 'tank', 12), -0.55, -0.45, 0.6), HALF, 0, 0));
  add(rot(at(cyl('crossoverPipeRight', 0.045, 0.045, 2.6, 'tank', 12), 0.55, -0.45, 0.6), HALF, 0, 0));

  // SUB: expansion-tank feed / overflow / reservoir / vent lines (rear, high).
  add(tube('expansionTankFeedHose', [
    [-0.6, 0.42, EZ + 0.2], [-0.55, 0.2, EZ + 0.05], [-0.45, 0.0, EZ],
  ], 0.03, 'hose'));
  add(tube('coolantOverflowHose', [
    [-0.6, 0.5, EZ + 0.05], [-0.75, 0.3, EZ], [-0.8, 0.1, EZ - 0.1],
  ], 0.025, 'hose'));
  add(tube('coolantWaterHoseReservoir', [
    [-0.42, 0.42, EZ + 0.2], [-0.2, 0.3, EZ + 0.1], [0.1, 0.25, EZ + 0.1],
  ], 0.03, 'hose'));
  add(tube('breatherLine', [
    [RX, 0.66, RZ], [0.5, 0.6, 0.8], [-0.45, 0.55, EZ + 0.25],
  ], 0.02, 'hose'));

  // SUB: bleeder screw (high point) + block drain plug (low).
  add(rot(at(cyl('coolantBleederScrew', 0.025, 0.025, 0.06, 'steel', 10), -0.45, 0.55, EZ + 0.25), HALF, 0, 0));
  add(at(cyl('coolantDrainPlug', 0.04, 0.04, 0.05, 'steel', 10), 0.1, -0.45, EZ - 0.2));

  return rad;
}
