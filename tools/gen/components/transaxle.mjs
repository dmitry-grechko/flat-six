// 7-speed PDK transaxle (id 'trans') — FULL PART COVERAGE BUILD.
// Large brushed-aluminium dual-clutch gearbox bolted to the rear face of the
// engine. Every PRIMARY part in trans-parts.json (tier !== 'sub') is emitted as
// a distinctly-named mesh/group, positioned to SHOW WHERE IT IS on the unit so
// the app can drop a numbered pin on the real location.
//
// Coordinates (matching the app hotspot convention):
//   +Z = FRONT, toward the engine (bell-housing / clutch end)
//   -Z = REAR (tail / end cover)
//   +Y = up, -Y = down (ATF pan / electrohydraulic lives at the bottom)
//   +X = right, -X = left (output flanges / driveshafts exit the sides)
//
// Tier A silhouette (981 WM):
//   - Bellhousing bolt face / ears: WM 373419 Fig 8 / Fig 2 (p5814, p5817)
//   - Stepped ribbed case + ATF pan underside: WM 375519 (p5842–p5845)
//   - Electrohydraulic under pan: WM 375519 Fig 1 intake (p5844)
//   - Dynamic hydro-mount + bracket: WM 374019 (p5832–p5836)
//   - PDK TCU body-side install: WM 373019 Fig 1–3 (p5794–p5798)
//
// Internal rotating parts (input shafts, lay shafts, gear sets, synchros,
// selector forks) are placed along the central case axis so their pins land on
// the case body where the real part sits inside.

import {
  group, box, roundBox, cyl, torus, torusArc, tube, sphere, at, rot,
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
  // MAIN CASE — stepped dual-clutch casting (not a single gear box).
  // WM 373419 / 375519: bell → clutch barrel → gear case → tail / end cover;
  // dense structural ribs; final-drive bulge low between output flanges.
  // ====================================================================

  // bell housing (engine end, +Z) — large conical/cylindrical alloy mass
  add(rot(at(cyl('bellHousing', 1.38, 1.12, 0.95, 'alu', 36), 0, 0.02, 1.12), HALF_PI, 0, 0));
  // mounting flange ring to engine (WM bolt face)
  add(rot(at(torus('bellFlange', 1.34, 0.1, 'aluDark', 10, 36), 0, 0.02, 1.58), 0, 0, 0));
  // flange mounting ears at ~12 / 3 / 5 / 7 / 9 o'clock (WM 373419 Fig 8 bolts 1–5)
  const earAngles = [
    [Math.PI * 0.5, 'Top'],           // 12:00 bolt 4
    [0, 'R'],                         // 3:00 bolt 5
    [-Math.PI * 0.35, 'BR'],          // ~5:00 bolt 2
    [Math.PI + Math.PI * 0.35, 'BL'], // ~7:00 bolt 1
    [Math.PI, 'L'],                   // 9:00 bolt 3
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
  // final-drive / differential housing (bulge low between the output flanges)
  add(rot(at(cyl('finalDrive', 0.62, 0.62, 0.95, 'alu', 28), 0, -0.42, -0.2), 0, 0, HALF_PI));

  // rearMount — PRIMARY: dynamic hydro-mount + transmission bracket (WM 374019)
  // Cylindrical ribbed mount + Y/L bracket with lightening holes (p5832–p5836).
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
  // stud nut under bracket (WM callout A)
  add(at(cyl('rearMount_nut', 0.08, 0.08, 0.06, 'bolt', 8), 0, -0.22, 0), rearMount);
  add(at(console, 0, 0, 0), rearMount);
  add(at(rearMount, 0, 0.15, -1.72));

  // Structural casting ribs — vertical side ribs + cross-grid near mount (WM 5833)
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
  // PDK HOUSING — bellhousing band, rear end cover, ATF pan (lower sump).
  // WM 375519: shield-shaped pan with perimeter lip + underside cooling ribs;
  // electrohydraulic control sits above the pan (intake snorkel interface).
  // ====================================================================

  // pdkBellhousing — ribbed cylindrical band just behind the bell (clutch case)
  add(rot(at(cyl('pdkBellhousing', 0.98, 0.98, 0.55, 'aluDark', 36), 0, 0.0, 0.58), HALF_PI, 0, 0));
  // circumferential stiffening ribs on clutch band
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    add(at(box(`pdkBellRib_${i}`, 0.06, 0.55, 0.1, 'cast'),
      Math.cos(a) * 1.0, Math.sin(a) * 1.0, 0.58));
  }

  // pdkEndCover — rear closing plate at the tail end (-Z face)
  add(rot(at(cyl('pdkEndCover', 0.55, 0.55, 0.16, 'aluDark', 28), 0, -0.12, -1.58), HALF_PI, 0, 0));
  add(rot(at(torus('pdkSeal1', 0.52, 0.03, 'rubber', 8, 24), 0, -0.12, -1.5), 0, 0, 0));

  // pdkOilPan — LOWER SUMP. Shield / home-plate footprint (WM 375519 Fig 1).
  // Wider toward rear of pan face, perimeter lip, underside cooling ribs.
  const oilPan = group('pdkOilPan');
  // main pan body — slightly tapered (wider at -Z / rear of pan)
  add(at(roundBox('pdkOilPan_body', 1.45, 0.28, 1.35, 'aluDark', 3), 0, 0, 0.05), oilPan);
  add(at(roundBox('pdkOilPan_rearWiden', 1.58, 0.26, 0.55, 'aluDark', 3), 0, -0.01, -0.45), oilPan);
  // perimeter mounting lip / flange
  add(at(box('pdkOilPan_lip', 1.68, 0.05, 1.55, 'alu'), 0, 0.14, 0.0), oilPan);
  // underside cooling ribs (WM 5842 / 5843)
  for (let i = 0; i < 7; i++) {
    add(at(box(`pdkOilPan_rib_${i}`, 1.35, 0.04, 0.07, 'cast'), 0, -0.16, 0.5 - i * 0.16), oilPan);
  }
  // perimeter sump bolts (visual; PRIMARY remains pdkOilPan)
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    add(at(cyl(`pdkSumpBolt_${i}`, 0.035, 0.035, 0.05, 'bolt', 8),
      Math.cos(a) * 0.72, 0.16, Math.sin(a) * 0.65), oilPan);
  }
  add(at(oilPan, 0, -0.95, 0.05));

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
  // HYDRAULIC CONTROL — electrohydraulic under ATF pan (WM 375519 p5844).
  // Valve body + solenoid bank + intake duct sit in the sump cavity;
  // heat exchanger / pump remain on the case exterior.
  // ====================================================================

  // pdkValveBody — HCU plate stack in the ATF pan cavity (underside packaging).
  const valveBody = group('pdkValveBody');
  add(roundBox('pdkValveBody_body', 1.15, 0.22, 1.05, 'aluDark', 3), valveBody);
  // channel / casting detail on the valve body face
  for (let i = 0; i < 5; i++) {
    add(at(box(`pdkValveBody_ch_${i}`, 1.0, 0.035, 0.05, 'cast'), 0, 0.12, 0.4 - i * 0.2), valveBody);
  }
  // intake duct / snorkel seat (WM 5844 blue callout)
  add(at(cyl('pdkValveBody_intake', 0.12, 0.12, 0.08, 'alu', 16), 0.25, -0.12, 0.1), valveBody);
  add(at(valveBody, 0.0, -0.68, 0.05));

  // pdkShiftSolenoids — row along one edge of the electrohydraulic unit (WM 5844).
  const solenoids = group('pdkShiftSolenoids');
  for (let i = 0; i < 7; i++) {
    add(rot(at(cyl(`pdkShiftSolenoids_${i}`, 0.055, 0.055, 0.18, 'steel', 14),
      -0.42 + i * 0.14, 0.0, 0.0), HALF_PI, 0, 0), solenoids);
  }
  add(at(solenoids, 0.0, -0.55, -0.42));

  // pdkFluidPump — small electric oil pump cylinder on the case side.
  add(rot(at(cyl('pdkFluidPump', 0.2, 0.2, 0.3, 'aluDark', 20), -0.95, -0.35, 0.45), 0, 0, HALF_PI));

  // pdkFluidFilter — strainer integrated with ATF pan (WM: filter replaced with pan).
  add(at(roundBox('pdkFluidFilter', 0.75, 0.1, 0.65, 'plastic', 2), 0, -0.82, 0.15));

  // pdkFluidTempSensor — small NTC sensor on the case side near the pan lip.
  add(rot(at(cyl('pdkFluidTempSensor', 0.05, 0.05, 0.16, 'steel', 12), 0.72, -0.55, -0.35), 0, 0, HALF_PI));

  // pdkHeatExchanger — finned oil-to-water cooler block on the case side.
  const cooler = group('pdkHeatExchanger');
  add(box('pdkHeatExchanger_core', 0.22, 0.7, 0.85, 'aluDark'), cooler);
  for (let i = 0; i < 8; i++) {
    add(at(box(`pdkHeatExchanger_fin_${i}`, 0.26, 0.62, 0.04, 'alu'), 0, 0, 0.35 - i * 0.1), cooler);
  }
  add(at(cooler, 0.98, 0.15, 0.35));

  // pdkOilPressureLine + pdkOilReturnLine — pump ↔ valve body (now underside).
  add(tube('pdkOilPressureLine', [
    [-0.95, -0.35, 0.45], [-0.55, -0.45, 0.25], [-0.2, -0.6, 0.1], [0.0, -0.68, 0.05],
  ], 0.03, 'steel', 24, 8));
  add(tube('pdkOilReturnLine', [
    [0.35, -0.68, -0.2], [0.2, -0.5, -0.15], [0.0, -0.75, 0.0], [0.0, -0.82, 0.15],
  ], 0.03, 'steel', 24, 8));

  // cooler hoses (sub parts) running from the heat exchanger.
  add(tube('pdkCoolHose1', [
    [0.98, 0.35, 0.65], [1.1, 0.55, 0.85], [1.2, 0.85, 1.05],
  ], 0.05, COOLANT, 20, 8));
  add(tube('pdkCoolHose2', [
    [0.98, -0.05, 0.65], [1.15, -0.25, 0.9], [1.25, -0.5, 1.05],
  ], 0.05, COOLANT, 20, 8));
  add(tube('pdkCoolHose3', [
    [0.98, 0.15, 0.0], [0.7, -0.25, -0.1], [0.3, -0.65, -0.05],
  ], 0.045, FLUID, 20, 8));
  add(tube('pdkMoldedHose', [
    [0.98, 0.45, 0.5], [1.05, 0.75, 0.25], [0.9, 0.95, -0.05],
  ], 0.045, 'rubber', 20, 8));
  add(tube('pdkVacuumHose', [
    [0.3, 0.55, 0.15], [0.55, 0.7, 0.35], [0.85, 0.85, 0.55],
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
  // CONTROLS — selector housing (case top); mechatronic = electrohydraulic
  // module packaged with the valve body under the ATF pan (WM 375519).
  // ====================================================================

  // selectorHousing — gear-selection mechanism housing on top of the case.
  add(at(roundBox('selectorHousing', 0.85, 0.38, 0.7, 'aluDark', 3), 0.05, 0.95, 0.15));
  // mechatronic — combined hydraulic/electronic module above the pan cavity
  // (same packaging zone as valve body / solenoids per WM underside figs).
  const mecha = group('mechatronic');
  add(roundBox('mechatronic_plate', 0.95, 0.18, 0.85, 'cover', 3), mecha);
  add(at(roundBox('mechatronic_block', 0.7, 0.16, 0.55, 'cast', 2), 0.05, 0.14, 0.05), mecha);
  add(at(mecha, 0.05, -0.58, 0.08));
  // pdkSelectorShaft (sub) — internal selector shaft.
  add(rot(at(cyl('pdkSelectorShaft', 0.04, 0.04, 0.9, 'steel', 12), 0.1, 0.55, 0.0), HALF_PI, 0, 0));

  // ====================================================================
  // PDK CONTROL — TCU is body-mounted (rear luggage, LH), not on the case.
  // WM 373019 Fig 1 (p5794): installation position; Fig 2–3: ribbed box +
  // dual connectors in a slide-in bracket.
  // ====================================================================

  // pdkTcu — distinct control-module box offset rear-left of the transaxle
  // (representative of the body-side mount near the LH rear quarter).
  const tcu = group('pdkTcu');
  add(roundBox('pdkTcu_body', 0.48, 0.22, 0.72, 'cover', 3), tcu);
  // cooling / stiffening ribs on the outer face (WM 5796 / 5797)
  for (let i = 0; i < 5; i++) {
    add(at(box(`pdkTcu_rib_${i}`, 0.42, 0.025, 0.04, 'cast'), 0, 0.12, 0.28 - i * 0.12), tcu);
  }
  // slide-in mounting bracket
  add(at(box('pdkTcu_bracket', 0.52, 0.08, 0.78, 'aluDark'), 0, -0.14, 0), tcu);
  add(at(box('pdkTcu_bracketSide', 0.06, 0.28, 0.78, 'aluDark'), 0.26, 0.0, 0), tcu);
  // dual multi-pin connectors on the long face (WM Fig 2/3 plugs 1 & 2)
  add(at(roundBox('pdkTcu_conn1', 0.14, 0.12, 0.18, 'plastic', 2), -0.12, -0.02, 0.42), tcu);
  add(at(roundBox('pdkTcu_conn2', 0.14, 0.12, 0.18, 'plastic', 2), 0.12, -0.02, 0.42), tcu);
  add(at(tcu, -1.35, 0.55, -0.85));

  // pdkGearSelectorUnit — cabin push-button selector (representative location).
  const selUnit = group('pdkGearSelectorUnit');
  add(roundBox('pdkGearSelectorUnit_base', 0.3, 0.1, 0.4, 'cover'), selUnit);
  add(at(box('pdkGearSelectorUnit_knob', 0.12, 0.14, 0.12, 'plastic'), 0, 0.12, 0.0), selUnit);
  add(at(selUnit, -0.55, 1.25, 0.55));

  // pdkShiftPaddles — steering-wheel paddles (small detail near the front-top).
  const paddles = group('pdkShiftPaddles');
  add(rot(at(box('pdkShiftPaddles_up', 0.06, 0.22, 0.14, 'cover'), 0.18, 0, 0), 0, 0, -0.3), paddles);
  add(rot(at(box('pdkShiftPaddles_dn', 0.06, 0.22, 0.14, 'cover'), -0.18, 0, 0), 0, 0, 0.3), paddles);
  add(at(paddles, 0.0, 1.28, 0.7));

  // pdkSpeedSensors — Hall-effect sensors on input + output shafts.
  const sensors = group('pdkSpeedSensors');
  add(rot(cyl('pdkSpeedSensors_in', 0.05, 0.05, 0.18, 'steel', 12), 0, 0, 0), sensors);
  add(rot(at(cyl('pdkSpeedSensors_out', 0.05, 0.05, 0.18, 'steel', 12), -0.5, -0.4, 0), 0, 0, 0), sensors);
  add(at(sensors, 0.78, 0.45, -0.5));

  // ====================================================================
  // SERVICE — drain/fill plugs, fluid (WM 375519 drain on ATF pan face).
  // ====================================================================

  // drainPlug — bottom plug offset on the ATF pan (WM 5842 yellow callout).
  add(at(cyl('drainPlug', 0.09, 0.09, 0.08, 'aluDark', 12), -0.35, -1.12, -0.35));
  add(at(cyl('drainPlugSeal', 0.1, 0.1, 0.02, 'rubber', 10), -0.35, -1.07, -0.35));
  // fillPlug — side level plug on the case.
  add(rot(at(cyl('fillPlug', 0.1, 0.1, 0.08, 'aluDark', 12), 0.88, -0.35, -0.25), 0, 0, HALF_PI));

  // pdkFluid — thin fluid layer in the sump above the pan floor.
  add(at(box('pdkFluid', 1.3, 0.1, 1.2, FLUID), 0, -0.88, 0.05));

  return trans;
}
