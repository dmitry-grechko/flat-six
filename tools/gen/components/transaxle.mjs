// 7-speed PDK transaxle (id 'trans') — FULL PART COVERAGE BUILD.
// Large brushed-aluminium dual-clutch gearbox bolted to the rear face of the
// engine. Every PRIMARY part in trans-parts.json (tier !== 'sub') is emitted as
// a distinctly-named mesh/group, positioned to SHOW WHERE IT IS on the unit so
// the app can drop a numbered pin on the real location.
//
// Coordinates (matching the app hotspot convention):
//   +Z = FRONT, toward the engine (bell-housing / clutch end)
//   -Z = REAR (tail / end cover)
//   +Y = up, -Y = down (oil pan / sump lives at the bottom)
//   +X = right, -X = left (output flanges / driveshafts exit the sides)
//
// Internal rotating parts (input shafts, lay shafts, gear sets, synchros,
// selector forks) are placed along the central case axis so their pins land on
// the case body where the real part sits inside.

import {
  group, box, roundBox, cyl, cylArc, capsule, torus, torusArc, tube, sphere, at, rot,
} from '../lib/primitives.mjs';

export const meta = {
  id: 'trans',
  label: 'PDK Transaxle',
  system: 'Transmission',
  node: 'transaxle',
  hotspot3d: '0 0 -1.4',
};

const HALF_PI = Math.PI / 2;

// fluid / seal inline material specs
const FLUID = { color: 0xc8861f, metalness: 0.1, roughness: 0.4 };
const COOLANT = { color: 0x2f6fb0, metalness: 0.2, roughness: 0.5 };

export function build() {
  const trans = group('transaxle');
  const add = (m, p = trans) => { p.add(m); return m; };

  // ====================================================================
  // MAIN CASE — keep the existing good case shape.
  // ====================================================================

  // bell housing (engine end) — large conical/cylindrical alloy mass
  add(rot(at(cyl('bellHousing', 1.35, 1.05, 0.9, 'alu', 32), 0, 0, 1.1), HALF_PI, 0, 0));
  // mounting flange ring to engine
  add(rot(at(torus('bellFlange', 1.32, 0.09, 'aluDark', 10, 32), 0, 0, 1.55), 0, 0, 0));

  // main gearbox case — the big alloy gear case (gearCase node)
  add(at(box('gearCase', 1.7, 1.6, 1.6, 'alu'), 0, -0.05, 0.05));
  // tail taper toward rear
  add(rot(at(cyl('tailCase', 0.55, 0.9, 1.1, 'alu', 24), 0, -0.1, -1.0), HALF_PI, 0, 0));
  // final-drive / differential housing (bulge low between the output flanges)
  add(rot(at(cyl('finalDrive', 0.62, 0.62, 0.95, 'alu', 28), 0, -0.42, -0.2), 0, 0, HALF_PI));
  add(at(box('rearMount', 0.7, 0.7, 0.4, 'aluDark'), 0, -0.1, -1.6));

  // ribbed casting detail down the case sides
  for (let i = 0; i < 5; i++) {
    const z = 0.7 - i * 0.34;
    add(at(box(`ribR_${i}`, 0.06, 1.3, 0.12, 'aluDark'), 0.88, -0.05, z));
    add(at(box(`ribL_${i}`, 0.06, 1.3, 0.12, 'aluDark'), -0.88, -0.05, z));
  }
  // top ribs
  for (let i = 0; i < 4; i++) {
    add(at(box(`ribTop_${i}`, 1.4, 0.07, 0.1, 'aluDark'), 0, 0.78, 0.55 - i * 0.34));
  }

  // ====================================================================
  // PDK HOUSING — main bellhousing/case, rear end cover, lower oil pan/sump.
  // ====================================================================

  // pdkBellhousing — main structural PDK case shell wrapping the clutch end.
  // A ribbed cylindrical band just behind the bell housing, on the case body.
  add(rot(at(cyl('pdkBellhousing', 0.92, 0.92, 0.5, 'aluDark', 32), 0, 0.0, 0.62), HALF_PI, 0, 0));

  // pdkEndCover — rear closing plate at the tail end (-Z face).
  add(rot(at(cyl('pdkEndCover', 0.58, 0.58, 0.14, 'aluDark', 28), 0, -0.1, -1.52), HALF_PI, 0, 0));

  // pdkOilPan — LOWER SUMP. Shallow pan at the very BOTTOM of the case, the
  // lowest visible element. Service item removed for every fluid change.
  const oilPan = group('pdkOilPan');
  add(roundBox('pdkOilPan_body', 1.55, 0.3, 1.55, 'aluDark'), oilPan);
  add(at(box('pdkOilPan_lip', 1.62, 0.06, 1.62, 'alu'), 0, 0.15, 0), oilPan);
  add(at(oilPan, 0, -0.92, 0.0));

  // ====================================================================
  // DUAL CLUTCH — concentric wet clutch pack, actuator, torsional damper.
  // All concentric at the bell-housing (engine) end.
  // ====================================================================

  // pdkTorsionalDamper — disc at the very engine-end face (flex plate adapter).
  add(rot(at(cyl('pdkTorsionalDamper', 0.78, 0.78, 0.1, 'steel', 28), 0, 0, 1.62), HALF_PI, 0, 0));

  // pdkDualClutchPack — large concentric wet clutch cylinder inside the bell.
  const clutch = group('pdkDualClutchPack');
  add(rot(cyl('pdkDualClutchPack_K1', 0.74, 0.74, 0.34, 'steel', 30), HALF_PI, 0, 0), clutch);
  add(rot(at(cyl('pdkDualClutchPack_K2', 0.55, 0.55, 0.46, 'steel', 30), 0, 0, -0.06), HALF_PI, 0, 0), clutch);
  add(rot(at(torus('pdkDualClutchPack_basket', 0.74, 0.06, 'aluDark', 10, 30), 0, 0, 0.18), 0, 0, 0), clutch);
  add(at(clutch, 0, 0, 1.18));

  // pdkClutchActuatorCylinder — electro-hydraulic concentric slave on the clutch
  // axis, just behind the clutch pack.
  add(rot(at(cyl('pdkClutchActuatorCylinder', 0.4, 0.4, 0.22, 'steel', 24), 0, 0, 0.86), HALF_PI, 0, 0));

  // ====================================================================
  // GEAR SHAFTS — input shafts (concentric), lay shafts, gear sets, synchros,
  // selector forks. Internal: placed along the central case axis.
  // ====================================================================

  // pdkInputShaft1 — solid inner input shaft (odd gears), on the centre axis.
  add(rot(at(cyl('pdkInputShaft1', 0.1, 0.1, 1.6, 'steel', 16), 0, 0.0, 0.0), HALF_PI, 0, 0));
  // pdkInputShaft2 — hollow outer input shaft concentric with shaft 1.
  add(rot(at(cyl('pdkInputShaft2', 0.17, 0.17, 1.1, 'steel', 18), 0, 0.0, 0.25), HALF_PI, 0, 0));

  // pdkOutputLayShafts — lay shafts offset below the input axis.
  const layShafts = group('pdkOutputLayShafts');
  add(rot(cyl('pdkOutputLayShafts_a', 0.09, 0.09, 1.5, 'steel', 16), HALF_PI, 0, 0), layShafts);
  add(rot(at(cyl('pdkOutputLayShafts_b', 0.09, 0.09, 1.5, 'steel', 16), 0.34, 0, 0), HALF_PI, 0, 0), layShafts);
  add(at(layShafts, -0.17, -0.36, 0.0));

  // pdkGearSets — helical gear pairs along the shafts (group of discs).
  const gears = group('pdkGearSets');
  for (let i = 0; i < 7; i++) {
    const z = 0.6 - i * 0.18;
    add(rot(at(cyl(`pdkGearSets_in_${i}`, 0.16, 0.16, 0.1, 'steel', 24), 0, 0.0, z), HALF_PI, 0, 0), gears);
    add(rot(at(cyl(`pdkGearSets_out_${i}`, 0.2, 0.2, 0.1, 'steel', 24), -0.17, -0.36, z), HALF_PI, 0, 0), gears);
  }
  add(gears);

  // pdkSynchronizerRings — synchro hubs/rings between gears on the lay shaft.
  const synchros = group('pdkSynchronizerRings');
  for (let i = 0; i < 4; i++) {
    const z = 0.5 - i * 0.28;
    add(rot(at(torus(`pdkSynchronizerRings_${i}`, 0.22, 0.04, 'bolt', 8, 20), -0.17, -0.36, z), HALF_PI, 0, 0), synchros);
  }
  add(synchros);

  // pdkSelectorForks — selector forks/rods that slide the synchro sleeves.
  const forks = group('pdkSelectorForks');
  add(rot(at(cyl('pdkSelectorForks_rod1', 0.035, 0.035, 1.3, 'steel', 10), 0.0, -0.1, 0.0), HALF_PI, 0, 0), forks);
  add(rot(at(cyl('pdkSelectorForks_rod2', 0.035, 0.035, 1.3, 'steel', 10), 0.0, -0.62, 0.0), HALF_PI, 0, 0), forks);
  for (let i = 0; i < 3; i++) {
    const z = 0.4 - i * 0.3;
    add(rot(at(torusArc(`pdkSelectorForks_fork_${i}`, 0.18, 0.025, 'steel', 8, 18, Math.PI), -0.17, -0.36, z), HALF_PI, 0, 0), forks);
  }
  add(forks);

  // ====================================================================
  // HYDRAULIC CONTROL — valve body, solenoids, pump, filter, temp sensor,
  // heat exchanger + hoses, pressure/return lines.
  // ====================================================================

  // pdkValveBody — central valve body / HCU. Detailed block on top of the case.
  const valveBody = group('pdkValveBody');
  add(roundBox('pdkValveBody_body', 0.95, 0.28, 1.0, 'aluDark'), valveBody);
  // channel / casting detail on the valve body face
  for (let i = 0; i < 4; i++) {
    add(at(box(`pdkValveBody_ch_${i}`, 0.85, 0.04, 0.06, 'cast'), 0, 0.16, 0.36 - i * 0.24), valveBody);
  }
  add(at(valveBody, 0.05, 0.86, -0.1));

  // pdkShiftSolenoids — row of proportional solenoids on the valve body.
  const solenoids = group('pdkShiftSolenoids');
  for (let i = 0; i < 6; i++) {
    add(rot(at(cyl(`pdkShiftSolenoids_${i}`, 0.06, 0.06, 0.2, 'steel', 14), -0.32 + i * 0.13, 0.0, 0.0), HALF_PI, 0, 0), solenoids);
  }
  add(at(solenoids, 0.05, 1.05, 0.32));

  // pdkFluidPump — small electric oil pump cylinder on the case side.
  add(rot(at(cyl('pdkFluidPump', 0.2, 0.2, 0.3, 'aluDark', 20), -0.92, -0.45, 0.5), 0, 0, HALF_PI));

  // pdkFluidFilter — fluid filter / strainer inside-near the oil pan.
  add(at(box('pdkFluidFilter', 0.7, 0.1, 0.7, 'plastic'), 0, -0.78, 0.0));

  // pdkFluidTempSensor — small NTC sensor on the case/valve body.
  add(rot(at(cyl('pdkFluidTempSensor', 0.05, 0.05, 0.16, 'steel', 12), 0.55, 0.78, -0.4), HALF_PI, 0, 0));

  // pdkHeatExchanger — finned oil-to-water cooler block on the case side.
  const cooler = group('pdkHeatExchanger');
  add(box('pdkHeatExchanger_core', 0.22, 0.7, 0.85, 'aluDark'), cooler);
  for (let i = 0; i < 8; i++) {
    add(at(box(`pdkHeatExchanger_fin_${i}`, 0.26, 0.62, 0.04, 'alu'), 0, 0, 0.35 - i * 0.1), cooler);
  }
  add(at(cooler, 0.98, 0.2, 0.4));

  // pdkOilPressureLine + pdkOilReturnLine — sub parts, but build them as named
  // lines so they show up (sub coverage bonus). Pressure line: pump -> valve body.
  add(tube('pdkOilPressureLine', [
    [-0.92, -0.45, 0.5], [-0.6, 0.2, 0.4], [-0.2, 0.7, 0.0], [0.0, 0.82, -0.1],
  ], 0.03, 'steel', 24, 8));
  add(tube('pdkOilReturnLine', [
    [0.4, 0.82, -0.3], [0.2, 0.3, -0.4], [0.0, -0.4, -0.2], [0.0, -0.78, 0.0],
  ], 0.03, 'steel', 24, 8));

  // cooler hoses (sub parts) running from the heat exchanger.
  add(tube('pdkCoolHose1', [
    [0.98, 0.4, 0.7], [1.1, 0.6, 0.9], [1.2, 0.9, 1.1],
  ], 0.05, COOLANT, 20, 8));
  add(tube('pdkCoolHose2', [
    [0.98, 0.0, 0.7], [1.15, -0.2, 0.95], [1.25, -0.5, 1.1],
  ], 0.05, COOLANT, 20, 8));
  add(tube('pdkCoolHose3', [
    [0.98, 0.2, 0.05], [0.7, -0.2, -0.1], [0.3, -0.7, -0.1],
  ], 0.045, FLUID, 20, 8));
  add(tube('pdkMoldedHose', [
    [0.98, 0.5, 0.55], [1.05, 0.8, 0.3], [0.9, 1.0, 0.0],
  ], 0.045, 'rubber', 20, 8));
  add(tube('pdkVacuumHose', [
    [0.3, 0.82, 0.2], [0.6, 1.0, 0.4], [0.9, 1.1, 0.6],
  ], 0.025, 'rubber', 18, 6));

  // ====================================================================
  // FINAL DRIVE — ring & pinion, differential, drive flanges, half-shafts.
  // At the rear / sides, low between the output flanges.
  // ====================================================================

  // pdkFinalDriveGearSet — hypoid ring gear disc (sub) at the diff.
  add(rot(at(cyl('pdkFinalDriveGearSet', 0.5, 0.5, 0.12, 'steel', 30), 0, -0.42, -0.2), 0, 0, HALF_PI));
  // pdkDifferential — diff carrier (sub) at the centre of the final drive.
  add(rot(at(sphere('pdkDifferential', 0.3, 'aluDark', 18), 0, -0.42, -0.2), 0, 0, 0));

  // pdkDriveFlanges — splined output flanges (x2) — PRIMARY node group.
  const flanges = group('pdkDriveFlanges');
  add(rot(at(cyl('outputFlangeR', 0.28, 0.28, 0.3, 'alu', 20), 1.0, -0.42, -0.2), 0, 0, HALF_PI), flanges);
  add(rot(at(cyl('outputFlangeL', 0.28, 0.28, 0.3, 'alu', 20), -1.0, -0.42, -0.2), 0, 0, HALF_PI), flanges);
  add(flanges);

  // pdkRearDriveshafts — CV half-shafts (x2) extending from the flanges.
  const shafts = group('pdkRearDriveshafts');
  add(rot(at(cyl('pdkRearDriveshafts_R', 0.09, 0.09, 0.9, 'steel', 16), 1.55, -0.42, -0.2), 0, 0, HALF_PI), shafts);
  add(rot(at(cyl('pdkRearDriveshafts_L', 0.09, 0.09, 0.9, 'steel', 16), -1.55, -0.42, -0.2), 0, 0, HALF_PI), shafts);
  add(rot(at(sphere('pdkRearDriveshafts_cvR', 0.16, 'bolt', 14), 1.2, -0.42, -0.2), 0, 0, 0), shafts);
  add(rot(at(sphere('pdkRearDriveshafts_cvL', 0.16, 'bolt', 14), -1.2, -0.42, -0.2), 0, 0, 0), shafts);
  add(shafts);

  // ====================================================================
  // CONTROLS — selector housing, mechatronic unit, selector shaft.
  // ====================================================================

  // selectorHousing — gear-selection mechanism housing on top of the case.
  add(at(box('selectorHousing', 0.9, 0.45, 0.8, 'aluDark'), 0.1, 0.62, 0.2));
  // mechatronic — combined hydraulic/electronic module (valve body + TCU block).
  add(at(roundBox('mechatronic', 0.5, 0.34, 0.6, 'cover'), 0.45, 1.12, 0.0));
  // pdkSelectorShaft (sub) — internal selector shaft.
  add(rot(at(cyl('pdkSelectorShaft', 0.04, 0.04, 0.9, 'steel', 12), 0.1, 0.55, 0.0), HALF_PI, 0, 0));

  // ====================================================================
  // PDK CONTROL — TCU, cabin selector unit, shift paddles, speed sensors.
  // ====================================================================

  // pdkTcu — TCU / control module box mounted on/near the case.
  add(at(roundBox('pdkTcu', 0.55, 0.16, 0.42, 'cover'), -0.45, 1.0, -0.3));

  // pdkGearSelectorUnit — cabin push-button selector (shown as a small console
  // detail near the front-top so it has a representative location).
  const selUnit = group('pdkGearSelectorUnit');
  add(roundBox('pdkGearSelectorUnit_base', 0.3, 0.1, 0.4, 'cover'), selUnit);
  add(at(box('pdkGearSelectorUnit_knob', 0.12, 0.14, 0.12, 'plastic'), 0, 0.12, 0.0), selUnit);
  add(at(selUnit, -0.5, 1.18, 0.55));

  // pdkShiftPaddles — steering-wheel paddles (small detail near the front-top).
  const paddles = group('pdkShiftPaddles');
  add(rot(at(box('pdkShiftPaddles_up', 0.06, 0.22, 0.14, 'cover'), 0.18, 0, 0), 0, 0, -0.3), paddles);
  add(rot(at(box('pdkShiftPaddles_dn', 0.06, 0.22, 0.14, 'cover'), -0.18, 0, 0), 0, 0, 0.3), paddles);
  add(at(paddles, 0.0, 1.22, 0.7));

  // pdkSpeedSensors — Hall-effect sensors on input + output shafts.
  const sensors = group('pdkSpeedSensors');
  add(rot(cyl('pdkSpeedSensors_in', 0.05, 0.05, 0.18, 'steel', 12), 0, 0, 0), sensors);
  add(rot(at(cyl('pdkSpeedSensors_out', 0.05, 0.05, 0.18, 'steel', 12), -0.5, -0.4, 0), 0, 0, 0), sensors);
  add(at(sensors, 0.78, 0.5, -0.5));

  // ====================================================================
  // SERVICE — drain/fill plugs, fluid.
  // ====================================================================

  // drainPlug — bottom plug at the lowest point of the oil pan.
  add(at(cyl('drainPlug', 0.1, 0.1, 0.08, 'aluDark', 12), 0, -1.1, -0.1));
  // fillPlug — side level plug.
  add(rot(at(cyl('fillPlug', 0.1, 0.1, 0.08, 'aluDark', 12), 0.86, -0.4, -0.3), 0, 0, HALF_PI));

  // pdkFluid — represented as a thin translucent-ish fluid layer in the sump.
  add(at(box('pdkFluid', 1.4, 0.12, 1.4, FLUID), 0, -0.86, 0.0));

  return trans;
}
