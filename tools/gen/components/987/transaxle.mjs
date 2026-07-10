// 987.2 PDK transaxle (id 'trans') — FULL PART COVERAGE BUILD, forked from the
// shared 981 builder and calibrated against the 2009 "Service Introduction"
// (Boxster/Cayman 987.2). The 987.2 PDK (type CG2.00 / CG2.20) is the same
// ZF-built 7-speed dual-clutch family later used by the 981, so the overall
// packaging matches the 981 case; this fork adjusts the 987-specific details:
//
//   - TCU: "located in the rear right of the luggage compartment beneath the
//     cover" (SI doc p102) — mirrored to the RIGHT side (the 981 module had it
//     rear-left).
//   - Dual-mass flywheel: SI doc p90 "engine torque is transmitted into the
//     clutches via a dual-mass flywheel" — modelled as a two-mass disc + ring
//     gear at the engine face (node name pdkTorsionalDamper kept for pinning).
//   - Parking lock (NEW primary node pdkParkingLock): catch engages the
//     toothing of the parking-lock gear on the pinion shaft, blocking the
//     final drive (SI doc p88, Figs 3_77_09 / 3_78_09).
//   - Oil cooler: plate-stack oil/water heat exchanger on the case exterior
//     close to the bell housing, cooling the CLUTCH/hydraulic oil only (gear
//     oil is cooled by the housing) — SI doc p96, Figs 3_85_09 / 3_86_09.
//   - Sensors: 4 distance sensors (one tower on the shift rods), 2 rpm
//     sensors (one housing), 2 pressure + 1 temperature sensor — ALL inside
//     the transmission (SI doc p97/98, Figs 3_52_09 / 3_54_09). Speed-sensor
//     pin moved inboard; distance-sensor tower added on the selector rods.
//   - Hydraulic control: valve body with 16 valves (EDS1–6, system pressure,
//     cooling, selection valves…) in the oil pan area (SI doc p93–95,
//     Figs 3_82_09 / 3_45_09 / 3_83_09) — second solenoid row added.
//   - Reverse runs through an intermediate gear wheel (SI doc p80 Fig 3_69_09)
//     — small idler disc added to the gear-set group.
//
// Coordinates (matching the app hotspot convention):
//   +Z = FRONT, toward the engine (bell-housing / clutch end)
//   -Z = REAR (tail / end cover)
//   +Y = up, -Y = down (oil pan / hydraulic control lives at the bottom)
//   +X = right, -X = left (output flanges / driveshafts exit the sides)
//
// The ATF-pan footprint trace comes from the 981 WM (same 7DT pan family);
// the 987.2 cutaway Fig 3_65_09 shows the same shield-shaped sump silhouette.

import {
  group, box, roundBox, cyl, torus, torusArc, tube, sphere, extrude, at, rot,
} from '../../lib/primitives.mjs';
import { footprint } from '../../lib/wm-traces.mjs';

export const meta = {
  id: 'trans',
  label: 'PDK Transaxle',
  system: 'Transmission',
  node: 'transaxle',
  hotspot3d: '0 0 -1.4',
  generation: '987',
};

const HALF_PI = Math.PI / 2;

// fluid / seal inline material specs
const FLUID = { color: 0xc8861f, metalness: 0.1, roughness: 0.4 };
const COOLANT = { color: 0x2f6fb0, metalness: 0.2, roughness: 0.5 };

export function build() {
  const trans = group('transaxle');
  const add = (m, p = trans) => { p.add(m); return m; };

  // ====================================================================
  // MAIN CASE — stepped dual-clutch casting (not a single gear box).
  // SI Fig 3_65_09 cutaway / 3_85_09 side view: bell → clutch barrel →
  // gear case → tail; dense structural ribs; final-drive bulge low.
  // ====================================================================

  // bell housing (engine end, +Z) — large conical/cylindrical alloy mass
  add(rot(at(cyl('bellHousing', 1.38, 1.12, 0.95, 'alu', 36), 0, 0.02, 1.12), HALF_PI, 0, 0));
  // mounting flange ring to engine (redesigned engine/transmission flange on
  // the 987.2 — SI doc p104)
  add(rot(at(torus('bellFlange', 1.34, 0.1, 'aluDark', 10, 36), 0, 0.02, 1.58), 0, 0, 0));
  // flange mounting ears at ~12 / 3 / 5 / 7 / 9 o'clock
  const earAngles = [
    [Math.PI * 0.5, 'Top'],           // 12:00
    [0, 'R'],                         // 3:00
    [-Math.PI * 0.35, 'BR'],          // ~5:00
    [Math.PI + Math.PI * 0.35, 'BL'], // ~7:00
    [Math.PI, 'L'],                   // 9:00
  ];
  for (const [ang, tag] of earAngles) {
    const ex = Math.cos(ang) * 1.28;
    const ey = Math.sin(ang) * 1.28;
    add(at(roundBox(`bellEar_${tag}`, 0.28, 0.22, 0.14, 'aluDark'), ex, ey + 0.02, 1.55));
    add(rot(at(cyl(`bellEarBoss_${tag}`, 0.07, 0.07, 0.08, 'bolt', 10), ex, ey + 0.02, 1.62), HALF_PI, 0, 0));
  }

  // gearCase — PRIMARY: stepped main alloy shell (clutch step + mid case + rear step)
  const gearCase = group('gearCase');
  // mid gear case (taller, slightly wider)
  add(at(roundBox('gearCase_mid', 1.72, 1.55, 1.35, 'alu', 4), 0, -0.02, 0.05), gearCase);
  // clutch-end step (wider barrel just behind bell)
  add(at(roundBox('gearCase_clutchStep', 1.85, 1.48, 0.55, 'alu', 4), 0, 0.0, 0.72), gearCase);
  // rear step toward end cover
  add(at(roundBox('gearCase_rearStep', 1.35, 1.25, 0.55, 'alu', 4), 0, -0.08, -0.72), gearCase);
  // upper casting shoulder
  add(at(roundBox('gearCase_topShoulder', 1.45, 0.35, 1.1, 'aluDark', 3), 0, 0.72, 0.05), gearCase);
  add(gearCase);

  // tail taper toward rear (-Z)
  add(rot(at(cyl('tailCase', 0.48, 0.78, 0.95, 'alu', 28), 0, -0.12, -1.15), HALF_PI, 0, 0));
  // final-drive / differential housing (hypoid drive — SI Fig 3_75_09)
  add(rot(at(cyl('finalDrive', 0.62, 0.62, 0.95, 'alu', 28), 0, -0.42, -0.2), 0, 0, HALF_PI));

  // rearMount — PRIMARY: dynamic hydro-mount + transmission bracket
  const rearMount = group('rearMount');
  // hydro-mount body (radial cooling ribs)
  add(at(cyl('rearMount_body', 0.28, 0.32, 0.42, 'rubber', 24), 0, 0.28, 0), rearMount);
  add(at(cyl('rearMount_dome', 0.22, 0.26, 0.14, 'rubber', 20), 0, 0.52, 0), rearMount);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    add(at(box(`rearMount_rib_${i}`, 0.04, 0.32, 0.08, 'cast'),
      Math.cos(a) * 0.3, 0.28, Math.sin(a) * 0.3), rearMount);
  }
  // electrical plug boss (dynamic unit mount)
  add(at(roundBox('rearMount_plug', 0.14, 0.1, 0.12, 'cover'), 0.34, 0.38, 0), rearMount);
  // transmission bracket / console — vertical flange + arm with lightening holes
  const console = group('pdkTransaxleMountConsole');
  add(at(box('pdkTransaxleMountConsole_flange', 0.12, 0.55, 0.42, 'aluDark'), -0.55, 0.05, 0), console);
  add(at(box('pdkTransaxleMountConsole_arm', 0.55, 0.12, 0.32, 'aluDark'), -0.22, -0.12, 0), console);
  add(at(cyl('pdkTransaxleMountConsole_hole1', 0.08, 0.08, 0.14, 'cast', 12), -0.35, -0.12, 0), console);
  add(at(cyl('pdkTransaxleMountConsole_hole2', 0.06, 0.06, 0.14, 'cast', 10), -0.18, -0.12, 0.08), console);
  add(at(cyl('pdkTransaxleMountConsole_seat', 0.18, 0.18, 0.1, 'alu', 16), 0, -0.12, 0), console);
  add(at(cyl('rearMount_nut', 0.08, 0.08, 0.06, 'bolt', 8), 0, -0.22, 0), rearMount);
  add(at(console, 0, 0, 0), rearMount);
  add(at(rearMount, 0, 0.15, -1.72));

  // Structural casting ribs — reinforced ribbed structure on the 987.2 case
  // inner/outer walls (SI doc p104: "ribbed structure … reinforced").
  for (let i = 0; i < 6; i++) {
    const z = 0.85 - i * 0.32;
    add(at(box(`ribR_${i}`, 0.07, 1.35, 0.1, 'aluDark'), 0.9, -0.05, z));
    add(at(box(`ribL_${i}`, 0.07, 1.35, 0.1, 'aluDark'), -0.9, -0.05, z));
  }
  // horizontal cross ribs (square-grid look on case sides)
  for (let i = 0; i < 4; i++) {
    const y = 0.45 - i * 0.32;
    add(at(box(`ribXR_${i}`, 0.05, 0.08, 1.5, 'aluDark'), 0.92, y, 0.05));
    add(at(box(`ribXL_${i}`, 0.05, 0.08, 1.5, 'aluDark'), -0.92, y, 0.05));
  }
  // top ribs
  for (let i = 0; i < 5; i++) {
    add(at(box(`ribTop_${i}`, 1.5, 0.06, 0.09, 'aluDark'), 0, 0.82, 0.6 - i * 0.3));
  }

  // ====================================================================
  // PDK HOUSING — bellhousing band, rear end cover, oil pan (lower sump).
  // Two separate oil chambers (SI doc p66 Fig 3_65_09): hydraulic/clutch
  // oil (5.2 l Pentosin FFL 3) + gear-wheel oil (2.95 l Mobilube PTX
  // 75W-90). Hydraulic control sits in the oil pan area.
  // ====================================================================

  // pdkBellhousing — ribbed cylindrical band just behind the bell (clutch case)
  add(rot(at(cyl('pdkBellhousing', 0.98, 0.98, 0.55, 'aluDark', 36), 0, 0.0, 0.58), HALF_PI, 0, 0));
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    add(at(box(`pdkBellRib_${i}`, 0.06, 0.55, 0.1, 'cast'),
      Math.cos(a) * 1.0, Math.sin(a) * 1.0, 0.58));
  }

  // pdkEndCover — rear closing plate at the tail end (-Z face)
  add(rot(at(cyl('pdkEndCover', 0.55, 0.55, 0.16, 'aluDark', 28), 0, -0.12, -1.58), HALF_PI, 0, 0));
  add(rot(at(torus('pdkSeal1', 0.52, 0.03, 'rubber', 8, 24), 0, -0.12, -1.5), 0, 0, 0));

  // pdkOilPan — LOWER SUMP. Shield-shaped pan (traced from the 981 WM;
  // the 987.2 cutaway Fig 3_65_09 shows the same 7DT pan silhouette).
  const ATF_PAN_FOOTPRINT = footprint('981/traces/atf-pan-5842.trace.json');
  const oilPan = group('pdkOilPan');
  const panBody = rot(extrude('pdkOilPan_body', ATF_PAN_FOOTPRINT, 0.32, 'aluDark', {
    bevelThickness: 0.035, bevelSize: 0.03,
  }), HALF_PI, 0, 0);
  oilPan.add(panBody);
  add(at(box('pdkOilPan_step', 1.45, 0.06, 0.12, 'cast'), 0, -0.02, 0.05), oilPan);
  const panLip = rot(extrude('pdkOilPan_lip', ATF_PAN_FOOTPRINT.map(([x, z]) => [x * 1.08, z * 1.08]), 0.05, 'alu', {
    bevel: false,
  }), HALF_PI, 0, 0);
  panLip.position.set(0, 0.16, 0);
  oilPan.add(panLip);
  for (let i = 0; i < 9; i++) {
    add(at(box(`pdkOilPan_rib_${i}`, 1.25, 0.035, 0.055, 'cast'), 0, -0.18, 0.55 - i * 0.13), oilPan);
  }
  for (let i = 0; i < 5; i++) {
    add(at(box(`pdkOilPan_ribX_${i}`, 0.045, 0.03, 1.15, 'cast'), -0.5 + i * 0.25, -0.19, 0), oilPan);
  }
  // Intake boss on pan floor (mates to the hydraulic control unit intake)
  add(at(cyl('pdkOilPan_intake', 0.09, 0.09, 0.14, 'alu', 14), 0.2, 0.08, -0.1), oilPan);
  // Perimeter sump bolts along flange (visual; PRIMARY remains pdkOilPan)
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const rx = 0.68 + 0.08 * Math.cos(a * 2);
    const rz = 0.58 + 0.1 * Math.sin(a * 2);
    add(at(cyl(`pdkSumpBolt_${i}`, 0.03, 0.03, 0.045, 'bolt', 8),
      Math.cos(a) * rx, 0.18, Math.sin(a) * rz), oilPan);
  }
  add(at(oilPan, 0, -0.95, 0.05));

  // ====================================================================
  // DUAL CLUTCH — radial wet clutch packs (SI doc p90 Fig 3_40_09):
  // K1 outer pack Ø202 mm drives INNER input shaft 1 (gears 1-3-5-7 + R),
  // K2 inner pack Ø153 mm drives OUTER input shaft 2 (gears 2-4-6).
  // Torque enters through a DUAL-MASS FLYWHEEL (SI doc p90).
  // ====================================================================

  // pdkTorsionalDamper — PRIMARY pin: dual-mass flywheel at the engine face
  // (primary + secondary mass discs and a starter ring gear).
  add(rot(at(cyl('pdkTorsionalDamper', 0.78, 0.78, 0.1, 'steel', 28), 0, 0, 1.62), HALF_PI, 0, 0));
  // secondary mass disc + arc-spring ring of the dual-mass flywheel
  add(rot(at(cyl('dmfSecondaryMass', 0.68, 0.68, 0.08, 'aluDark', 28), 0, 0, 1.5), HALF_PI, 0, 0));
  add(rot(at(torus('dmfArcSpringRing', 0.58, 0.045, 'steel', 8, 28), 0, 0, 1.56), 0, 0, 0));
  // starter ring gear on the primary mass rim
  add(rot(at(torus('dmfRingGear', 0.8, 0.025, 'bolt', 6, 40), 0, 0, 1.62), 0, 0, 0));

  // pdkDualClutchPack — radial (concentric) wet clutch packs inside the bell.
  const clutch = group('pdkDualClutchPack');
  add(rot(cyl('pdkDualClutchPack_K1', 0.74, 0.74, 0.34, 'steel', 30), HALF_PI, 0, 0), clutch); // outer Ø202
  add(rot(at(cyl('pdkDualClutchPack_K2', 0.55, 0.55, 0.46, 'steel', 30), 0, 0, -0.06), HALF_PI, 0, 0), clutch); // inner Ø153
  add(rot(at(torus('pdkDualClutchPack_basket', 0.74, 0.06, 'aluDark', 10, 30), 0, 0, 0.18), 0, 0, 0), clutch); // outer disc carrier (engine speed)
  add(at(clutch, 0, 0, 1.18));

  // pdkClutchActuatorCylinder — hydraulic actuation pistons on the clutch
  // axis (clutches open when depressurised — SI doc p90).
  add(rot(at(cyl('pdkClutchActuatorCylinder', 0.4, 0.4, 0.22, 'steel', 24), 0, 0, 0.86), HALF_PI, 0, 0));

  // ====================================================================
  // GEAR SHAFTS — input shafts (concentric), main + pinion shaft, gear
  // sets, synchros, selector forks. SI doc p80 Fig 3_69_09: input shaft 1,
  // input shaft 2, main shaft, pinion shaft, intermediate reverse wheel.
  // ====================================================================

  // pdkInputShaft1 — solid INNER input shaft (gears 1-3-5-7 + reverse, K1).
  add(rot(at(cyl('pdkInputShaft1', 0.1, 0.1, 1.6, 'steel', 16), 0, 0.0, 0.0), HALF_PI, 0, 0));
  // pdkInputShaft2 — hollow OUTER input shaft (gears 2-4-6, K2).
  add(rot(at(cyl('pdkInputShaft2', 0.17, 0.17, 1.1, 'steel', 18), 0, 0.0, 0.25), HALF_PI, 0, 0));

  // pdkOutputLayShafts — main shaft + pinion shaft below the input axis.
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
  // intermediate gear wheel for reverse (SI Fig 3_69_09 item 5) — idler
  // between the shafts that reverses rotation.
  add(rot(at(cyl('pdkGearSets_revIdler', 0.13, 0.13, 0.09, 'steel', 20), -0.34, -0.18, -0.55), HALF_PI, 0, 0), gears);
  add(gears);

  // pdkSynchronizerRings — fully synchronized shift-sleeve sets (SI doc p68).
  const synchros = group('pdkSynchronizerRings');
  for (let i = 0; i < 4; i++) {
    const z = 0.5 - i * 0.28;
    add(rot(at(torus(`pdkSynchronizerRings_${i}`, 0.22, 0.04, 'bolt', 8, 20), -0.17, -0.36, z), HALF_PI, 0, 0), synchros);
  }
  add(synchros);

  // pdkSelectorForks — 4 hydraulically actuated shift rods, each switching
  // two gears (4&6 / 5&7 / 1&3 / 2&R — SI doc p87 Fig 3_76_09), each rod
  // carrying a sensor magnet read by the distance-sensor tower.
  const forks = group('pdkSelectorForks');
  add(rot(at(cyl('pdkSelectorForks_rod1', 0.035, 0.035, 1.3, 'steel', 10), 0.0, -0.1, 0.0), HALF_PI, 0, 0), forks);
  add(rot(at(cyl('pdkSelectorForks_rod2', 0.035, 0.035, 1.3, 'steel', 10), 0.0, -0.62, 0.0), HALF_PI, 0, 0), forks);
  for (let i = 0; i < 3; i++) {
    const z = 0.4 - i * 0.3;
    add(rot(at(torusArc(`pdkSelectorForks_fork_${i}`, 0.18, 0.025, 'steel', 8, 18, Math.PI), -0.17, -0.36, z), HALF_PI, 0, 0), forks);
  }
  // distance-sensor tower on the shift rods (4 integrated absolute distance
  // sensors + sensor magnets — SI doc p98 Fig 3_54_09)
  add(at(roundBox('pdkDistanceSensorTower', 0.14, 0.32, 0.24, 'cover', 2), 0.28, -0.36, 0.15), forks);
  add(at(box('pdkDistanceSensorTower_conn', 0.08, 0.08, 0.1, 'plastic'), 0.28, -0.16, 0.15), forks);
  add(forks);

  // ====================================================================
  // HYDRAULIC CONTROL — valve body in the oil pan area (SI doc p93–95,
  // Figs 3_82_09 / 3_45_09 / 3_46_09 / 3_83_09): port plate + intermediate
  // plate + valve housing, 2 solenoid valves, 6 EDS pressure regulators,
  // gear/clutch/selection valves — 16 valves total.
  // ====================================================================

  // pdkValveBody — hydraulic switching device plate stack in the pan cavity.
  const valveBody = group('pdkValveBody');
  add(roundBox('pdkValveBody_body', 1.15, 0.22, 1.05, 'aluDark', 3), valveBody);
  for (let i = 0; i < 5; i++) {
    add(at(box(`pdkValveBody_ch_${i}`, 1.0, 0.035, 0.05, 'cast'), 0, 0.12, 0.4 - i * 0.2), valveBody);
  }
  // intake boss toward the pan floor
  add(at(cyl('pdkValveBody_intake', 0.12, 0.12, 0.08, 'alu', 16), 0.25, -0.12, 0.1), valveBody);
  add(at(valveBody, 0.0, -0.68, 0.05));

  // pdkShiftSolenoids — solenoid valves + EDS pressure regulators along the
  // valve-body edges (SI Fig 3_45_09: solenoid valves 8, pressure regulators 7).
  const solenoids = group('pdkShiftSolenoids');
  for (let i = 0; i < 7; i++) {
    add(rot(at(cyl(`pdkShiftSolenoids_${i}`, 0.055, 0.055, 0.18, 'steel', 14),
      -0.42 + i * 0.14, 0.0, 0.0), HALF_PI, 0, 0), solenoids);
  }
  // second row: pressure regulators (EDS) on the opposite edge
  for (let i = 0; i < 4; i++) {
    add(rot(at(cyl(`pdkPressureRegulators_${i}`, 0.05, 0.05, 0.16, 'steel', 12),
      -0.28 + i * 0.18, 0.0, 0.95), HALF_PI, 0, 0), solenoids);
  }
  add(at(solenoids, 0.0, -0.55, -0.42));

  // pdkFluidPump — transmission oil pump feeding the hydraulic control
  // (supplies actuators, clutches, cooling and lubrication — SI doc p93).
  add(rot(at(cyl('pdkFluidPump', 0.2, 0.2, 0.3, 'aluDark', 20), -0.95, -0.35, 0.45), 0, 0, HALF_PI));

  // pdkFluidFilter — strainer integrated with the oil pan.
  add(at(roundBox('pdkFluidFilter', 0.75, 0.1, 0.65, 'plastic', 2), 0, -0.82, 0.15));

  // pdkFluidTempSensor — temperature sensor wired permanently to the internal
  // harness (led out via the 20-pin connector — SI doc p97). Sensor sits
  // inside, near the valve body / pan lip.
  add(rot(at(cyl('pdkFluidTempSensor', 0.05, 0.05, 0.16, 'steel', 12), 0.72, -0.55, -0.35), 0, 0, HALF_PI));

  // pdkHeatExchanger — oil/water heat exchanger on the case exterior close to
  // the bell housing; cools the clutch/hydraulic oil only (SI Figs 3_85_09 /
  // 3_86_09 — gear oil is cooled sufficiently by the housing).
  const cooler = group('pdkHeatExchanger');
  add(box('pdkHeatExchanger_core', 0.22, 0.7, 0.85, 'aluDark'), cooler);
  for (let i = 0; i < 8; i++) {
    add(at(box(`pdkHeatExchanger_fin_${i}`, 0.26, 0.62, 0.04, 'alu'), 0, 0, 0.35 - i * 0.1), cooler);
  }
  add(at(cooler, 0.98, 0.35, 0.75));

  // pdkOilPressureLine + pdkOilReturnLine — pump ↔ valve body (underside).
  add(tube('pdkOilPressureLine', [
    [-0.95, -0.35, 0.45], [-0.55, -0.45, 0.25], [-0.2, -0.6, 0.1], [0.0, -0.68, 0.05],
  ], 0.03, 'steel', 24, 8));
  add(tube('pdkOilReturnLine', [
    [0.35, -0.68, -0.2], [0.2, -0.5, -0.15], [0.0, -0.75, 0.0], [0.0, -0.82, 0.15],
  ], 0.03, 'steel', 24, 8));

  // cooler water supply/return + oil hose (SI Fig 3_86_09 items 2/3).
  add(tube('pdkCoolHose1', [
    [0.98, 0.55, 1.05], [1.1, 0.75, 1.2], [1.2, 1.0, 1.35],
  ], 0.05, COOLANT, 20, 8));
  add(tube('pdkCoolHose2', [
    [0.98, 0.15, 1.05], [1.15, -0.1, 1.25], [1.25, -0.35, 1.4],
  ], 0.05, COOLANT, 20, 8));
  add(tube('pdkCoolHose3', [
    [0.98, 0.35, 0.4], [0.7, -0.2, 0.05], [0.3, -0.65, -0.05],
  ], 0.045, FLUID, 20, 8));
  add(tube('pdkMoldedHose', [
    [0.98, 0.65, 0.9], [1.05, 0.9, 0.6], [0.9, 1.0, 0.3],
  ], 0.045, 'rubber', 20, 8));
  add(tube('pdkVacuumHose', [
    [0.3, 0.55, 0.15], [0.55, 0.7, 0.35], [0.85, 0.85, 0.55],
  ], 0.025, 'rubber', 18, 6));

  // ====================================================================
  // FINAL DRIVE — hypoid ring & pinion, differential (optional LSD with
  // 22% traction / 27% overrun lock), drive flanges, half-shafts.
  // SI doc p86 Figs 3_75_09 / 3_42_09.
  // ====================================================================

  // pdkFinalDriveGearSet — hypoid ring gear disc (sub) at the diff.
  add(rot(at(cyl('pdkFinalDriveGearSet', 0.5, 0.5, 0.12, 'steel', 30), 0, -0.42, -0.2), 0, 0, HALF_PI));
  // pdkDifferential — diff carrier (sub) at the centre of the final drive.
  add(rot(at(sphere('pdkDifferential', 0.3, 'aluDark', 18), 0, -0.42, -0.2), 0, 0, 0));

  // pdkParkingLock — PRIMARY (NEW): catch engages the toothing of the
  // parking-lock gear on the pinion shaft, blocking the final drive
  // (SI doc p88, Figs 3_77_09 / 3_78_09).
  const parkLock = group('pdkParkingLock');
  // parking-lock gear on the pinion-shaft axis ahead of the ring gear
  add(rot(at(cyl('pdkParkingLock_gear', 0.19, 0.19, 0.07, 'bolt', 16), 0, -0.42, -0.55), HALF_PI, 0, 0), parkLock);
  // catch (pawl) below the gear + leg spring
  add(rot(at(box('pdkParkingLock_catch', 0.08, 0.22, 0.1, 'steel'), 0.08, -0.62, -0.55), 0, 0, -0.35), parkLock);
  add(rot(at(torusArc('pdkParkingLock_legSpring', 0.07, 0.015, 'steel', 6, 14, Math.PI), 0.16, -0.68, -0.55), HALF_PI, 0, 0), parkLock);
  // connecting rod up to the selector shaft (engaged mechanically via the
  // selector lever; released hydraulically)
  add(tube('pdkParkingLock_rod', [
    [0.1, -0.6, -0.55], [0.12, -0.1, -0.4], [0.1, 0.45, -0.2],
  ], 0.022, 'steel', 18, 8), parkLock);
  add(parkLock);

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
  // CONTROLS — selector housing (case top); mechatronic = hydraulic control
  // module packaged with the valve body in the oil pan area.
  // ====================================================================

  // selectorHousing — gear-selection mechanism housing on top of the case.
  add(at(roundBox('selectorHousing', 0.85, 0.38, 0.7, 'aluDark', 3), 0.05, 0.95, 0.15));
  // mechatronic — combined hydraulic/electronic module above the pan cavity
  const mecha = group('mechatronic');
  add(roundBox('mechatronic_plate', 0.95, 0.18, 0.85, 'cover', 3), mecha);
  add(at(roundBox('mechatronic_block', 0.7, 0.16, 0.55, 'cast', 2), 0.05, 0.14, 0.05), mecha);
  add(at(mecha, 0.05, -0.58, 0.08));
  // pdkSelectorShaft (sub) — internal selector shaft.
  add(rot(at(cyl('pdkSelectorShaft', 0.04, 0.04, 0.9, 'steel', 12), 0.1, 0.55, 0.0), HALF_PI, 0, 0));

  // ====================================================================
  // PDK CONTROL — the 987.2 transmission control unit is body-mounted in
  // the REAR RIGHT of the luggage compartment beneath the cover
  // (SI doc p102, Fig 3_88_09) — offset to the right, unlike the 981.
  // ====================================================================

  // pdkTcu — control-module box offset rear-RIGHT of the transaxle
  // (representative of the body-side mount in the rear luggage compartment).
  const tcu = group('pdkTcu');
  add(roundBox('pdkTcu_body', 0.48, 0.22, 0.72, 'cover', 3), tcu);
  for (let i = 0; i < 5; i++) {
    add(at(box(`pdkTcu_rib_${i}`, 0.42, 0.025, 0.04, 'cast'), 0, 0.12, 0.28 - i * 0.12), tcu);
  }
  add(at(box('pdkTcu_bracket', 0.52, 0.08, 0.78, 'aluDark'), 0, -0.14, 0), tcu);
  add(at(box('pdkTcu_bracketSide', 0.06, 0.28, 0.78, 'aluDark'), -0.26, 0.0, 0), tcu);
  // multi-pin connectors (16-pin transmission connector + 20-pin sensor
  // connector route into the case — SI doc p97)
  add(at(roundBox('pdkTcu_conn1', 0.14, 0.12, 0.18, 'plastic', 2), -0.12, -0.02, 0.42), tcu);
  add(at(roundBox('pdkTcu_conn2', 0.14, 0.12, 0.18, 'plastic', 2), 0.12, -0.02, 0.42), tcu);
  add(at(tcu, 1.35, 0.55, -0.85));

  // pdkGearSelectorUnit — cabin selector lever (P/R/N/D/M with Tiptronic-style
  // manual gate; paddles/rocker switches on the wheel).
  const selUnit = group('pdkGearSelectorUnit');
  add(roundBox('pdkGearSelectorUnit_base', 0.3, 0.1, 0.4, 'cover'), selUnit);
  add(at(box('pdkGearSelectorUnit_knob', 0.12, 0.14, 0.12, 'plastic'), 0, 0.12, 0.0), selUnit);
  add(at(selUnit, -0.55, 1.25, 0.55));

  // pdkShiftPaddles — steering-wheel shift switches (small detail, front-top).
  const paddles = group('pdkShiftPaddles');
  add(rot(at(box('pdkShiftPaddles_up', 0.06, 0.22, 0.14, 'cover'), 0.18, 0, 0), 0, 0, -0.3), paddles);
  add(rot(at(box('pdkShiftPaddles_dn', 0.06, 0.22, 0.14, 'cover'), -0.18, 0, 0), 0, 0, 0.3), paddles);
  add(at(paddles, 0.0, 1.28, 0.7));

  // pdkSpeedSensors — 2 rpm sensors combined in one housing INSIDE the
  // transmission (SI doc p97 Fig 3_52_09) — pinned inboard on the shaft plane.
  const sensors = group('pdkSpeedSensors');
  add(rot(cyl('pdkSpeedSensors_in', 0.05, 0.05, 0.18, 'steel', 12), 0, 0, 0), sensors);
  add(rot(at(cyl('pdkSpeedSensors_out', 0.05, 0.05, 0.18, 'steel', 12), -0.35, -0.35, 0), 0, 0, 0), sensors);
  add(at(box('pdkSpeedSensors_housing', 0.16, 0.1, 0.14, 'cover'), -0.18, 0.12, 0), sensors);
  add(at(sensors, 0.55, 0.05, -0.55));

  // ====================================================================
  // SERVICE — drain/fill plugs, fluid. Two oil chambers with separate
  // change intervals: hydraulic oil 90,000 km / gear oil 180,000 km
  // (SI doc p66); level set via overflow bores with PIWIS in Oil fill mode.
  // ====================================================================

  // drainPlug — bottom plug offset on the oil pan.
  add(at(cyl('drainPlug', 0.09, 0.09, 0.08, 'aluDark', 12), -0.35, -1.12, -0.35));
  add(at(cyl('drainPlugSeal', 0.1, 0.1, 0.02, 'rubber', 10), -0.35, -1.07, -0.35));
  // fillPlug — side overflow/level bore on the case.
  add(rot(at(cyl('fillPlug', 0.1, 0.1, 0.08, 'aluDark', 12), 0.88, -0.35, -0.25), 0, 0, HALF_PI));

  // pdkFluid — thin fluid layer in the sump above the pan floor.
  add(at(box('pdkFluid', 1.3, 0.1, 1.2, FLUID), 0, -0.88, 0.05));

  return trans;
}
