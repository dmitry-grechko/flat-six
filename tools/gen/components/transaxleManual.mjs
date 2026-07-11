// 6-speed MANUAL transaxle (id 'trans-manual', 981 G81.20) — FULL PART
// COVERAGE BUILD. Companion to the PDK module (transaxle.mjs): same
// technical-illustration style, same coordinate conventions and overall
// envelope so the app's existing transmission placement works unchanged.
// Every PRIMARY part in trans-manual-parts.json (tier !== 'sub') is emitted
// as a distinctly-named mesh/group so the app can drop a numbered pin on it.
//
// Coordinates (matching the app hotspot convention, identical to the PDK):
//   +Z = FRONT, toward the engine (bell-housing / clutch end)
//   -Z = REAR (tail / end cover)
//   +Y = up, -Y = down (simple case floor — NO ATF pan on the manual)
//   +X = right, -X = left (output flanges / driveshafts exit the sides)
//
// What visually distinguishes the manual from the PDK:
//   - Bell end: dual-mass flywheel + single dry clutch (pressure plate +
//     friction disc) + concentric slave cylinder (CSC) on the input axis —
//     instead of the PDK's wet dual-clutch pack and torsional damper.
//   - Single smoother gear case, slightly narrower than the PDK; no
//     shield-shaped ATF pan, no mechatronic/valve body/solenoids/pump/cooler.
//     Bottom is a plain ribbed case floor with a gear-oil drain plug; a side
//     fill/level plug sits on the right case wall.
//   - Internals: one input shaft on the centre axis, one pinion/lay shaft
//     below it, 6 forward gear pairs + reverse idler, synchro rings, two
//     selector rods with shift forks.
//   - Shift interface: external shift/selector unit on TOP of the case with
//     TWO shift-cable stubs running toward +Z (to the cabin) — the manual's
//     visual signature.
//   - Shared driveline (mirrors the PDK positions): final-drive/differential
//     bulge low between the output flanges, ring gear, output flanges x2,
//     CV half-shafts x2, rear hydro-mount + bracket at (0, 0.15, -1.72).

import {
  group, box, roundBox, cyl, torus, torusArc, tube, sphere, at, rot,
} from '../lib/primitives.mjs';

export const meta = {
  id: 'trans-manual',
  label: 'Manual Transaxle',
  system: 'Transmission',
  node: 'transaxleManual',
  hotspot3d: '0 0 -1.4',
};

const HALF_PI = Math.PI / 2;

// inline material specs
const GEAR_OIL = { color: 0xb8871f, metalness: 0.1, roughness: 0.4 };   // amber hypoid oil
const FRICTION = { color: 0x5d4a36, metalness: 0.15, roughness: 0.85 }; // organic clutch facing

export function build() {
  const trans = group('transaxleManual');
  const add = (m, p = trans) => { p.add(m); return m; };

  // ====================================================================
  // MAIN CASE — single smoother gear casing (vs the PDK's stepped
  // dual-clutch casting). Slightly narrower; still ribbed; plain floor.
  // ====================================================================

  // bell housing (engine end, +Z) — large conical alloy mass (same envelope
  // as the PDK bell so the unit drops into the identical engine-bay slot).
  add(rot(at(cyl('bellHousing', 1.38, 1.12, 0.95, 'alu', 36), 0, 0.02, 1.12), HALF_PI, 0, 0));
  // mounting flange ring to the engine block
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
  // cast gussets blending the bell cone into the case (top / bottom / sides)
  add(at(box('bellGusset_T', 0.08, 0.4, 0.5, 'aluDark'), 0, 1.15, 0.85));
  add(at(box('bellGusset_B', 0.08, 0.4, 0.5, 'aluDark'), 0, -1.08, 0.85));
  add(at(box('bellGusset_R', 0.4, 0.08, 0.5, 'aluDark'), 1.15, 0.02, 0.85));
  add(at(box('bellGusset_L', 0.4, 0.08, 0.5, 'aluDark'), -1.15, 0.02, 0.85));

  // gearCase — PRIMARY: one-piece manual gear casing (G81.20 6-speed).
  const gearCase = group('gearCase');
  // main barrel (narrower than the PDK mid case)
  add(at(roundBox('gearCase_main', 1.55, 1.45, 1.5, 'alu', 4), 0, -0.05, 0.1), gearCase);
  // clutch-end step mating to the bell
  add(at(roundBox('gearCase_front', 1.68, 1.35, 0.5, 'alu', 4), 0, 0.0, 0.78), gearCase);
  // rear step toward the tail / end cover
  add(at(roundBox('gearCase_rear', 1.2, 1.15, 0.5, 'alu', 4), 0, -0.1, -0.7), gearCase);
  // top boss the external shift unit bolts onto
  add(at(roundBox('gearCase_topBoss', 0.9, 0.3, 0.8, 'aluDark', 3), 0, 0.75, 0.15), gearCase);
  // simple case floor (NO shield-shaped ATF pan on the manual)
  add(at(box('gearCase_floor', 1.35, 0.1, 1.3, 'aluDark'), 0, -0.76, 0.0), gearCase);
  add(gearCase);

  // tail taper toward rear (-Z) + rear end cover
  add(rot(at(cyl('tailCase', 0.48, 0.78, 0.95, 'alu', 28), 0, -0.12, -1.15), HALF_PI, 0, 0));
  add(rot(at(cyl('mtEndCover', 0.55, 0.55, 0.16, 'aluDark', 28), 0, -0.12, -1.58), HALF_PI, 0, 0));
  add(rot(at(torus('mtEndCoverSeal', 0.52, 0.03, 'rubber', 8, 24), 0, -0.12, -1.5), 0, 0, 0));

  // final-drive / differential housing (bulge low between the output flanges,
  // same position as the PDK's) — PRIMARY node finalDrive.
  add(rot(at(cyl('finalDrive', 0.62, 0.62, 0.95, 'alu', 28), 0, -0.42, -0.2), 0, 0, HALF_PI));

  // Structural casting ribs — present but calmer than the PDK's dense grid.
  for (let i = 0; i < 5; i++) {
    const z = 0.68 - i * 0.33;
    add(at(box(`ribR_${i}`, 0.06, 1.2, 0.09, 'aluDark'), 0.8, -0.08, z));
    add(at(box(`ribL_${i}`, 0.06, 1.2, 0.09, 'aluDark'), -0.8, -0.08, z));
  }
  // two horizontal cross ribs per side
  for (let i = 0; i < 2; i++) {
    const y = 0.25 - i * 0.4;
    add(at(box(`ribXR_${i}`, 0.045, 0.07, 1.4, 'aluDark'), 0.82, y, 0.05));
    add(at(box(`ribXL_${i}`, 0.045, 0.07, 1.4, 'aluDark'), -0.82, y, 0.05));
  }
  // top ribs
  for (let i = 0; i < 4; i++) {
    add(at(box(`ribTop_${i}`, 1.3, 0.05, 0.08, 'aluDark'), 0, 0.69, 0.55 - i * 0.3));
  }
  // longitudinal floor ribs under the case floor
  for (let i = 0; i < 3; i++) {
    add(at(box(`ribFloor_${i}`, 0.05, 0.06, 1.25, 'cast'), -0.35 + i * 0.35, -0.83, 0.0));
  }

  // rearMount — PRIMARY: dynamic hydro-mount + transmission bracket at the
  // tail (identical position to the PDK: the mount is shared driveline kit).
  const rearMount = group('rearMount');
  add(at(cyl('rearMount_body', 0.28, 0.32, 0.42, 'rubber', 24), 0, 0.28, 0), rearMount);
  add(at(cyl('rearMount_dome', 0.22, 0.26, 0.14, 'rubber', 20), 0, 0.52, 0), rearMount);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    add(at(box(`rearMount_rib_${i}`, 0.04, 0.32, 0.08, 'cast'),
      Math.cos(a) * 0.3, 0.28, Math.sin(a) * 0.3), rearMount);
  }
  add(at(roundBox('rearMount_plug', 0.14, 0.1, 0.12, 'cover'), 0.34, 0.38, 0), rearMount);
  // transmission bracket / console — vertical flange + arm with lightening holes
  const console = group('mtMountConsole');
  add(at(box('mtMountConsole_flange', 0.12, 0.55, 0.42, 'aluDark'), -0.55, 0.05, 0), console);
  add(at(box('mtMountConsole_arm', 0.55, 0.12, 0.32, 'aluDark'), -0.22, -0.12, 0), console);
  add(at(cyl('mtMountConsole_hole1', 0.08, 0.08, 0.14, 'cast', 12), -0.35, -0.12, 0), console);
  add(at(cyl('mtMountConsole_hole2', 0.06, 0.06, 0.14, 'cast', 10), -0.18, -0.12, 0.08), console);
  add(at(cyl('mtMountConsole_seat', 0.18, 0.18, 0.1, 'alu', 16), 0, -0.12, 0), console);
  add(at(cyl('rearMount_nut', 0.08, 0.08, 0.06, 'bolt', 8), 0, -0.22, 0), rearMount);
  add(at(console, 0, 0, 0), rearMount);
  add(at(rearMount, 0, 0.15, -1.72));

  // ====================================================================
  // CLUTCH END (+Z) — the manual's give-away: dual-mass flywheel, single
  // dry clutch (pressure plate + friction disc), concentric slave cylinder.
  // ====================================================================

  // dualMassFlywheel — PRIMARY: two-mass flywheel at the engine face.
  const dmf = group('dualMassFlywheel');
  add(rot(at(cyl('dualMassFlywheel_primary', 0.78, 0.78, 0.1, 'steel', 32), 0, 0, 1.63), HALF_PI, 0, 0), dmf);
  add(rot(at(cyl('dualMassFlywheel_secondary', 0.66, 0.66, 0.08, 'aluDark', 32), 0, 0, 1.53), HALF_PI, 0, 0), dmf);
  add(rot(at(torus('dualMassFlywheel_ringGear', 0.79, 0.028, 'bolt', 6, 40), 0, 0, 1.63), 0, 0, 0), dmf);
  add(rot(at(torus('dualMassFlywheel_arcSprings', 0.56, 0.045, 'steel', 8, 28), 0, 0, 1.58), 0, 0, 0), dmf);
  add(dmf);

  // clutchAssembly — PRIMARY group: pressure plate + friction disc +
  // release bearing (each a named sub-node for its own pin).
  const clutchAsm = group('clutchAssembly');
  // pressure plate: stamped cover + clamp ring + polished diaphragm spring
  const pressure = group('clutchPressurePlate');
  add(rot(at(cyl('clutchPressurePlate_cover', 0.68, 0.68, 0.09, 'steel', 30), 0, 0, 1.37), HALF_PI, 0, 0), pressure);
  add(rot(at(torus('clutchPressurePlate_ring', 0.6, 0.04, 'aluDark', 8, 30), 0, 0, 1.4), 0, 0, 0), pressure);
  add(rot(at(cyl('clutchDiaphragmSpring', 0.5, 0.15, 0.12, 'polished', 28), 0, 0, 1.27), HALF_PI, 0, 0), pressure);
  add(pressure, clutchAsm);
  // friction disc: organic facing + splined hub + yellow damper-spring ring
  const disc = group('clutchDisc');
  add(rot(at(cyl('clutchDisc_facing', 0.6, 0.6, 0.05, FRICTION, 30), 0, 0, 1.46), HALF_PI, 0, 0), disc);
  add(rot(at(cyl('clutchDisc_hub', 0.14, 0.14, 0.1, 'steel', 18), 0, 0, 1.46), HALF_PI, 0, 0), disc);
  add(rot(at(torus('clutchDisc_damperSprings', 0.22, 0.035, 'yellow', 8, 20), 0, 0, 1.46), 0, 0, 0), disc);
  add(disc, clutchAsm);
  // release bearing riding on the CSC snout
  add(rot(at(cyl('clutchReleaseBearing', 0.2, 0.2, 0.09, 'polished', 24), 0, 0, 1.12), HALF_PI, 0, 0), clutchAsm);
  add(clutchAsm);

  // clutchSlaveCylinder — PRIMARY: concentric slave cylinder (CSC) on the
  // input-shaft axis just behind the clutch, with its hydraulic feed line
  // exiting over the bell to the clutch master circuit.
  const csc = group('clutchSlaveCylinder');
  add(rot(at(cyl('clutchSlaveCylinder_body', 0.27, 0.27, 0.2, 'aluDark', 24), 0, 0, 0.94), HALF_PI, 0, 0), csc);
  add(rot(at(cyl('clutchSlaveCylinder_snout', 0.13, 0.13, 0.16, 'cast', 18), 0, 0, 1.04), HALF_PI, 0, 0), csc);
  add(tube('clutchSlaveCylinder_line', [
    [0.26, 0.08, 0.94], [0.62, 0.35, 0.9], [0.88, 0.68, 0.85], [0.95, 0.85, 0.8],
  ], 0.022, 'steel', 24, 8), csc);
  add(at(cyl('clutchSlaveCylinder_fitting', 0.04, 0.04, 0.08, 'bolt', 10), 0.95, 0.9, 0.8), csc);
  add(csc);

  // ====================================================================
  // GEAR TRAIN — input shaft on the centre axis, pinion/lay shaft below,
  // 6 forward gear pairs + reverse idler, synchros, 2 selector rods+forks.
  // ====================================================================

  // mtInputShaft — PRIMARY: single input shaft; its nose runs through the
  // CSC and clutch into the flywheel pilot bearing.
  add(rot(at(cyl('mtInputShaft', 0.085, 0.085, 2.5, 'steel', 16), 0, 0, 0.2), HALF_PI, 0, 0));

  // mtPinionShaft — PRIMARY: pinion / lay shaft below the input axis,
  // carrying the driven gears into the final-drive pinion.
  add(rot(at(cyl('mtPinionShaft', 0.1, 0.1, 1.5, 'steel', 16), 0, -0.36, -0.05), HALF_PI, 0, 0));

  // mtGearSets — PRIMARY: 6 helical forward pairs (1st small on the input,
  // 6th large — radii sum to the 0.36 shaft centre distance) + reverse idler.
  const gears = group('mtGearSets');
  const PAIRS = [
    [0.115, 0.245], [0.135, 0.225], [0.155, 0.205],
    [0.175, 0.185], [0.195, 0.165], [0.215, 0.145],
  ];
  PAIRS.forEach(([ri, ro], i) => {
    const z = 0.62 - i * 0.22;
    add(rot(at(cyl(`mtGearSets_in_${i + 1}`, ri, ri, 0.09, 'steel', 24), 0, 0, z), HALF_PI, 0, 0), gears);
    add(rot(at(cyl(`mtGearSets_out_${i + 1}`, ro, ro, 0.09, 'steel', 24), 0, -0.36, z), HALF_PI, 0, 0), gears);
  });
  // small reverse idler between the shafts (reverses rotation)
  add(rot(at(cyl('mtReverseIdler', 0.11, 0.11, 0.08, 'steel', 20), -0.3, -0.18, -0.62), HALF_PI, 0, 0), gears);
  add(gears);

  // mtSynchroRings — brass blocker rings on the pinion-shaft gear cluster.
  const synchros = group('mtSynchroRings');
  for (let i = 0; i < 4; i++) {
    const z = 0.51 - i * 0.22;
    add(rot(at(torus(`mtSynchroRings_${i}`, 0.2, 0.035, 'bolt', 8, 20), 0, -0.36, z), 0, 0, 0), synchros);
  }
  add(synchros);

  // mtSelectorForks — two selector rods + three shift forks straddling the
  // synchro sleeves (cable-shifted, no hydraulics on the manual).
  const forks = group('mtSelectorForks');
  add(rot(at(cyl('mtSelectorForks_rod1', 0.032, 0.032, 1.3, 'steel', 10), 0.18, -0.1, 0.0), HALF_PI, 0, 0), forks);
  add(rot(at(cyl('mtSelectorForks_rod2', 0.032, 0.032, 1.3, 'steel', 10), -0.18, -0.1, 0.0), HALF_PI, 0, 0), forks);
  for (let i = 0; i < 3; i++) {
    const z = 0.4 - i * 0.3;
    const side = i % 2 === 0 ? 0.18 : -0.18;
    add(rot(at(torusArc(`mtSelectorForks_fork_${i}`, 0.17, 0.024, 'steel', 8, 18, Math.PI), 0, -0.36, z), 0, 0, 0), forks);
    add(at(box(`mtSelectorForks_stem_${i}`, 0.035, 0.14, 0.045, 'steel'), side, -0.16, z), forks);
  }
  add(forks);

  // ====================================================================
  // SHIFT INTERFACE (case top) — the manual's visual signature: external
  // shift/selector unit with TWO cable stubs running toward +Z (cabin).
  // ====================================================================

  // shiftSelectorUnit — PRIMARY: selector housing bolted on the case top
  // boss, with select/shift cranks and the cable abutment bracket.
  const shiftUnit = group('shiftSelectorUnit');
  add(roundBox('shiftSelectorUnit_base', 0.72, 0.2, 0.6, 'aluDark', 3), shiftUnit);
  add(at(roundBox('shiftSelectorUnit_cover', 0.58, 0.1, 0.46, 'cover', 2), 0, 0.15, -0.05), shiftUnit);
  // select + shift crank levers with ball studs (cable ends snap on here)
  add(at(box('shiftSelectorUnit_lever1', 0.05, 0.16, 0.05, 'steel'), 0.16, 0.22, 0.15), shiftUnit);
  add(at(sphere('shiftSelectorUnit_ball1', 0.035, 'polished', 12), 0.16, 0.31, 0.15), shiftUnit);
  add(at(box('shiftSelectorUnit_lever2', 0.05, 0.16, 0.05, 'steel'), -0.16, 0.22, 0.15), shiftUnit);
  add(at(sphere('shiftSelectorUnit_ball2', 0.035, 'polished', 12), -0.16, 0.31, 0.15), shiftUnit);
  // cable abutment bracket + the two sheath seats on the +Z edge
  add(at(box('shiftSelectorUnit_bracket', 0.55, 0.08, 0.1, 'aluDark'), 0, 0.12, 0.32), shiftUnit);
  add(rot(at(cyl('shiftSelectorUnit_seatR', 0.05, 0.05, 0.14, 'cast', 12), 0.16, 0.12, 0.42), HALF_PI, 0, 0), shiftUnit);
  add(rot(at(cyl('shiftSelectorUnit_seatL', 0.05, 0.05, 0.14, 'cast', 12), -0.16, 0.12, 0.42), HALF_PI, 0, 0), shiftUnit);
  add(at(shiftUnit, 0, 1.0, 0.1));

  // shiftCables — the two Bowden cable stubs arcing up over the bell toward
  // +Z / the cabin (cut off illustration-style at the bell flange plane).
  const cables = group('shiftCables');
  add(tube('shiftCables_R', [
    [0.16, 1.14, 0.55], [0.28, 1.26, 0.9], [0.4, 1.36, 1.3], [0.46, 1.4, 1.62],
  ], 0.028, 'rubber', 28, 8), cables);
  add(tube('shiftCables_L', [
    [-0.16, 1.14, 0.55], [-0.28, 1.26, 0.9], [-0.4, 1.36, 1.3], [-0.46, 1.4, 1.62],
  ], 0.028, 'rubber', 28, 8), cables);
  add(rot(at(cyl('shiftCables_endR', 0.045, 0.045, 0.12, 'plastic', 10), 0.46, 1.4, 1.66), HALF_PI, 0, 0), cables);
  add(rot(at(cyl('shiftCables_endL', 0.045, 0.045, 0.12, 'plastic', 10), -0.46, 1.4, 1.66), HALF_PI, 0, 0), cables);
  add(cables);

  // mtSelectorShaft — vertical selector shaft dropping from the shift unit
  // into the case to work the internal selector gate.
  add(at(cyl('mtSelectorShaft', 0.04, 0.04, 0.5, 'steel', 12), 0, 0.7, 0.1));

  // ====================================================================
  // FINAL DRIVE — ring gear, differential, output flanges, half-shafts
  // (physically similar to the PDK's — same positions).
  // ====================================================================

  // mtRingGear — hypoid ring gear disc at the diff (sub of finalDrive).
  add(rot(at(cyl('mtRingGear', 0.5, 0.5, 0.12, 'steel', 30), 0, -0.42, -0.2), 0, 0, HALF_PI));
  // mtDifferential — diff carrier at the centre of the final drive.
  add(rot(at(sphere('mtDifferential', 0.3, 'aluDark', 18), 0, -0.42, -0.2), 0, 0, 0));

  // mtDriveFlanges — splined output flanges (x2) — PRIMARY node group.
  const flanges = group('mtDriveFlanges');
  add(rot(at(cyl('outputFlangeR', 0.28, 0.28, 0.3, 'alu', 20), 1.0, -0.42, -0.2), 0, 0, HALF_PI), flanges);
  add(rot(at(cyl('outputFlangeL', 0.28, 0.28, 0.3, 'alu', 20), -1.0, -0.42, -0.2), 0, 0, HALF_PI), flanges);
  add(flanges);

  // mtRearDriveshafts — CV half-shafts (x2) extending from the flanges.
  const shafts = group('mtRearDriveshafts');
  add(rot(at(cyl('mtRearDriveshafts_R', 0.09, 0.09, 0.9, 'steel', 16), 1.55, -0.42, -0.2), 0, 0, HALF_PI), shafts);
  add(rot(at(cyl('mtRearDriveshafts_L', 0.09, 0.09, 0.9, 'steel', 16), -1.55, -0.42, -0.2), 0, 0, HALF_PI), shafts);
  add(rot(at(sphere('mtRearDriveshafts_cvR', 0.16, 'bolt', 14), 1.2, -0.42, -0.2), 0, 0, 0), shafts);
  add(rot(at(sphere('mtRearDriveshafts_cvL', 0.16, 'bolt', 14), -1.2, -0.42, -0.2), 0, 0, 0), shafts);
  add(shafts);

  // ====================================================================
  // SERVICE + SMALL STUFF — drain / fill plugs, gear oil, case breather,
  // reverse-light switch, ground strap.
  // ====================================================================

  // drainPlug — PRIMARY: gear-oil drain on the case floor.
  add(at(cyl('drainPlug', 0.09, 0.09, 0.08, 'aluDark', 12), -0.3, -0.83, -0.1));
  add(at(cyl('drainPlugSeal', 0.1, 0.1, 0.02, 'rubber', 10), -0.3, -0.79, -0.1));
  // fillPlug — PRIMARY: side fill/level plug on the right case wall.
  add(rot(at(cyl('fillPlug', 0.095, 0.095, 0.09, 'aluDark', 12), 0.8, -0.3, -0.3), 0, 0, HALF_PI));

  // gearOil — thin amber oil layer above the case floor (shared gearbox +
  // final-drive filling on the manual).
  add(at(box('gearOil', 1.2, 0.07, 1.25, GEAR_OIL), 0, -0.69, 0.05));

  // caseBreather — vent on the case top.
  const breather = group('caseBreather');
  add(at(cyl('caseBreather_stem', 0.04, 0.04, 0.12, 'steel', 12), 0, 0, 0), breather);
  add(at(cyl('caseBreather_cap', 0.065, 0.065, 0.05, 'plastic', 12), 0, 0.08, 0), breather);
  add(at(breather, -0.4, 0.72, -0.25));

  // reverseLightSwitch — PRIMARY: small switch + connector on the case
  // top-rear, closing the reverse-lamp circuit when R is engaged.
  const revSwitch = group('reverseLightSwitch');
  add(at(cyl('reverseLightSwitch_body', 0.05, 0.05, 0.13, 'steel', 12), 0, 0, 0), revSwitch);
  add(at(roundBox('reverseLightSwitch_connector', 0.1, 0.08, 0.09, 'plastic', 2), 0, 0.11, 0), revSwitch);
  add(tube('reverseLightSwitch_wire', [
    [0, 0.15, 0], [0.15, 0.22, 0.15], [0.35, 0.28, 0.3],
  ], 0.015, 'rubber', 16, 6), revSwitch);
  add(at(revSwitch, 0.4, 0.53, -0.75));

  // groundStrap — braided transmission-to-body ground strap near the bell.
  add(tube('groundStrap', [
    [-0.8, 0.3, 0.85], [-1.0, 0.45, 1.1], [-1.2, 0.55, 1.35],
  ], 0.02, 'bolt', 18, 6));

  return trans;
}
