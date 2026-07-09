// Full Porsche 981 cooling system (id 'cooling'). A mid-engine layout: two
// front-corner radiators (with fans, air guides, A/C condenser) feed long
// coolant lines the length of the chassis back to the rear engine, where the
// water pumps, thermostat, oil cooler, PDK cooler and expansion tank live.
//
// WM geometry refs (factory CAD figures):
//   - Radiator module overview ~4174 (WM 197019 Fig 1): corner module ahead of
//     front wheel, angled outboard, fan on rear face, mounts top/bottom.
//   - Electric fan WM 190819 (~4083–4084): A/C condenser stacked on rad face;
//     vertical side air guide flush to core; 5-blade fan in deep square shroud.
//   - Middle radiator ~4198 (WM 198019 Fig 1): low centre rad + front air guide.
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

// Corner radiator: taller-than-wide core, vertical L/R side tanks (WM ~4174 /
// 190819), thin top/bottom headers kept for hose attach points.
// Middle / secondary (sub=true): wider-than-tall, low centre unit (WM ~4198).
function radiatorUnit(name, sub = false) {
  const g = group(name);
  const add = (m) => { g.add(m); return m; };

  const w = sub ? 1.55 : 1.0;
  const h = sub ? 0.72 : 1.35;
  const d = sub ? 0.14 : 0.16;
  const tankW = 0.14;
  const headerH = 0.1;

  add(at(box('core', w, h, d, 'core'), 0, 0, 0));
  const finCount = sub ? 10 : 8;
  const finSpan = w * 0.82;
  const finStart = -finSpan / 2;
  const finStep = finSpan / (finCount - 1);
  for (let i = 0; i < finCount; i++) {
    add(at(box(`${name}_fin_${i}`, 0.015, h * 0.9, d + 0.02, 'tank'), finStart + i * finStep, 0, 0.01));
  }

  // Vertical side tanks (primary CAD read on corner + middle rads).
  add(at(box('tankLeft', tankW, h + 0.06, d + 0.04, 'tank'), -(w / 2 + tankW / 2), 0, 0));
  add(at(box('tankRight', tankW, h + 0.06, d + 0.04, 'tank'), w / 2 + tankW / 2, 0, 0));
  // Thin top/bottom headers (hose / mount faces).
  add(at(box('tankTop', w + tankW * 2, headerH, d + 0.04, 'tank'), 0, h / 2 + headerH / 2, 0));
  add(at(box('tankBottom', w + tankW * 2, headerH, d + 0.04, 'tank'), 0, -(h / 2 + headerH / 2), 0));
  return g;
}

// Electric fan (WM 190819 Fig 7 / ~4084): 5 blades, deep square shroud,
// circular opening implied by hub + blades + ring.
function fanUnit(name) {
  const g = group(name);
  const add = (m) => { g.add(m); return m; };
  // Deep square shroud frame (CAD has noticeable depth).
  add(at(box('shroud', 1.15, 1.15, 0.24, 'plastic'), 0, 0, 0));
  // Circular opening ring on the rear face.
  add(rot(at(cyl('shroudRing', 0.48, 0.48, 0.04, 'plastic', 24), 0, 0, -0.1), HALF, 0, 0));
  add(rot(at(cyl('hub', 0.14, 0.14, 0.18, 'cover', 14), 0, 0, -0.1), HALF, 0, 0));
  const blades = 5;
  for (let i = 0; i < blades; i++) {
    const a = (i / blades) * Math.PI * 2;
    add(rot(at(box(`blade_${i}`, 0.44, 0.14, 0.03, 'cover'), Math.cos(a) * 0.32, Math.sin(a) * 0.32, -0.1), 0, 0, a));
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
  // Factory mounting (WM ~4174 / 197019 Fig 1): each corner radiator is ANGLED
  // so its face points forward-outboard into the corner air inlet (~35°). Fans
  // sit behind the core along the rotated normal.
  const YAW = 0.6; // ≈35°; left = -YAW, right = +YAW
  const NX = Math.sin(YAW) * 0.22, NZ = Math.cos(YAW) * 0.22;   // fan offset (behind)
  const FX = Math.sin(YAW) * 0.36, FZ = Math.cos(YAW) * 0.36; // left fan node (further behind)

  // Corner core half-extents (must match radiatorUnit defaults above).
  const CORE_W = 1.0;
  const CORE_H = 1.35;
  const SIDE_TANK_W = 0.14;
  const HEADER_H = 0.1;
  const CORE_HALF_W = CORE_W / 2 + SIDE_TANK_W; // outer face of side tank
  const CORE_TOP_Y = CORE_H / 2 + HEADER_H;     // top header outer face
  const CORE_BOT_Y = -(CORE_H / 2 + HEADER_H);

  // PRIMARY: both front radiators. The JSON has a single combined node for the
  // pair, so this group spans both corners; the two cores live inside it.
  const radsLR = group('radiatorsLeftRight');
  radsLR.add(rot(at(radiatorUnit('radLeftCore'), LX, 0, RZ), 0, -YAW, 0));
  radsLR.add(rot(at(radiatorUnit('radRightCore'), RX, 0, RZ), 0, YAW, 0));
  add(radsLR);

  // PRIMARY: radiator fan modules (the pair) — behind each angled core.
  const fanModules = group('radiatorFanModules');
  fanModules.add(rot(at(fanUnit('fanModuleLeft'), LX + NX, 0, RZ - NZ), 0, -YAW, 0));
  fanModules.add(rot(at(fanUnit('fanModuleRight'), RX - NX, 0, RZ - NZ), 0, YAW, 0));
  add(fanModules);

  // PRIMARY: dedicated left electric fan node (distinct from the module pair).
  add(rot(at(fanUnit('radiatorFanLeft'), LX + FX, 0, RZ - FZ), 0, -YAW, 0));

  // SUB: secondary / centre radiator (WM ~4198) — wider, shorter, lower, forward.
  add(at(radiatorUnit('radiatorFanSecondary', true), 0, -0.38, RZ + 0.12));

  // SUB: vertical side air guides flush to the outboard edge of each core
  // (WM 190819 ~4083 blue highlight), not distant plates. Offset along the
  // rotated local axes so the panel sits against the side tank.
  const GUIDE_W = 0.12;
  const GUIDE_H = CORE_H + 0.12;
  const GUIDE_D = 0.42;
  const guideLocalX = CORE_HALF_W + GUIDE_W / 2;
  // Left (yaw = -YAW): local -X is outboard.
  const lGuideX = LX - guideLocalX * Math.cos(YAW);
  const lGuideZ = RZ - guideLocalX * Math.sin(YAW);
  // Right (yaw = +YAW): local +X is outboard.
  const rGuideX = RX + guideLocalX * Math.cos(YAW);
  const rGuideZ = RZ - guideLocalX * Math.sin(YAW);
  add(rot(at(box('radiatorAirGuideLeft', GUIDE_W, GUIDE_H, GUIDE_D, 'plastic'), lGuideX, 0, lGuideZ), 0, -YAW, 0));
  add(rot(at(box('radiatorAirGuideRight', GUIDE_W, GUIDE_H, GUIDE_D, 'plastic'), rGuideX, 0, rGuideZ), 0, YAW, 0));

  // SUB: A/C condenser — thin stacked panel ahead of the right radiator along
  // the face normal (WM 190819 ~4083), plus its air guide slightly further out.
  const condOff = 0.14;
  const condGuideOff = 0.2;
  add(rot(at(box('acCondenser', 0.95, 1.2, 0.06, 'plastic'), RX + Math.sin(YAW) * condOff, 0, RZ + Math.cos(YAW) * condOff), 0, YAW, 0));
  add(rot(at(box('acCondenserAirGuide', 1.0, 1.25, 0.05, 'plastic'), RX + Math.sin(YAW) * condGuideOff, 0, RZ + Math.cos(YAW) * condGuideOff), 0, YAW, 0));

  // SUB: fan control module — a box near the left fan.
  add(at(box('fanControlModule', 0.26, 0.2, 0.12, 'cover'), LX + 0.55, -0.5, RZ - 0.3));

  // SUB: radiator-outlet coolant temp sensor on the left radiator bottom header.
  add(rot(at(cyl('coolantTempSensorRadiatorOutlet', 0.04, 0.04, 0.12, 'steel', 10), LX + 0.45, CORE_BOT_Y, RZ), HALF, 0, 0));

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
    [0.25, 0.34, EZ + 0.1], [0.6, 0.5, 0.2], [1.0, 0.4, 1.2], [RX, CORE_TOP_Y, RZ],
  ], 0.06, 'hose'));

  // PRIMARY: lower radiator hose — bottom of left radiator back to pump inlet.
  add(tube('lowerRadiatorHose', [
    [LX, CORE_BOT_Y, RZ], [-1.0, -0.5, 1.2], [-0.6, -0.4, 0.2], [-0.45, -0.3, EZ + 0.1],
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
    [RX, CORE_TOP_Y, RZ], [0.5, 0.6, 0.8], [-0.45, 0.55, EZ + 0.25],
  ], 0.02, 'hose'));

  // SUB: bleeder screw (high point) + block drain plug (low).
  add(rot(at(cyl('coolantBleederScrew', 0.025, 0.025, 0.06, 'steel', 10), -0.45, 0.55, EZ + 0.25), HALF, 0, 0));
  add(at(cyl('coolantDrainPlug', 0.04, 0.04, 0.05, 'steel', 10), 0.1, -0.45, EZ - 0.2));

  return rad;
}
