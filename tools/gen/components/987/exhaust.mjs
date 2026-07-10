// 987 Boxster/Cayman exhaust — forked from the 981 builder and reshaped against
// the 2009 Service Introduction (987.2) figures.
//
// Factory layout (SI doc p53 fig 2_50_09, p54 fig 2_51_09/2_52_09, p57
// fig 2_55_09, p60 fig 2_59_09):
//  - Redesigned manifolds with enlarged tube cross sections and nearly equal
//    pipe lengths, with the MAIN catalytic converter INTEGRATED into the
//    manifold per cylinder bank — one larger converter housing with TWO ceramic
//    monoliths in series (987.1 instead had pre-cats in the manifolds and the
//    main cats inside the rear silencers).
//  - Per bank: manifold → oxygen sensor LSU 4.9 → first monolith → oxygen
//    sensor LSF → second monolith → connecting pipe → rear silencer.
//  - TWO large rear silencers, one per side, laid DIAGONALLY (front-outboard
//    inlet → rear-inboard outlet), not transverse corner cans like the 981.
//  - Two connecting pipes BETWEEN the silencers mix the gases of banks 1 and 2
//    at the centre before the tailpipes (SI doc p53).
//  - Central exit: S models (3.4) twin tailpipe fed as a true twin-pipe system
//    with two separate pipe connections (SI doc p55); base 2.9 models use a
//    single oval tailpipe (SI doc p60). Modelled here as the S twin tip.
//  - PSE sport exhaust remained a 987 option — bypass valve + vacuum actuator
//    on the rear silencer are kept.
//
// Coordinate convention (native gen space, same scale as the 981 module):
//   +X = right, -X = left, +Y = up, +Z = FRONT of car, -Z = REAR.
// Headers at x ±1.85, system runs rearward toward -Z, low (-Y), converging to
// the centre (x ~ 0) at the rear tips.
//
// Every PRIMARY part in 987/exhaust-parts.json appears as a named mesh/group.

import { group, box, roundBox, cyl, tube, torus, torusArc, at, rot } from '../../lib/primitives.mjs';

export const meta = {
  id: 'exhaust',
  label: 'Exhaust & Sport System',
  system: 'Exhaust',
  node: 'exhaust',
  hotspot3d: '0 -0.7 -1.6',
  generation: '987',
};

const HALF_PI = Math.PI / 2;

// Rear silencer attitude — diagonal cans (SI figs 2_50_09 / 2_55_09):
// axis runs from the front-outboard inlet to the rear-inboard outlet.
const MUFFLER_YAW = -0.76; // radians; applied as dir * MUFFLER_YAW with scale.x = dir
const MUFFLER_C = { x: 1.02, y: -1.22, z: -3.45 }; // right-can centre (mirror for left)
const MUFFLER_LEN = 1.35;

export function build() {
  const exhaust = group('exhaust');
  const add = (m, p = exhaust) => { p.add(m); return m; };

  // ====================================================================
  // MANIFOLD ASSEMBLY (per bank) — tubular manifold with 3 primary runners
  // of nearly equal length merging to a collector (SI doc p54), manifold
  // gasket + studs at the head interface, and a support bracket.
  // ====================================================================
  function makeManifold(dir, side) {
    const sk = side;
    const header = group(`headerBank_${sk}`);
    for (let i = 0; i < 3; i++) {
      const z = (i - 1) * 0.72;
      add(tube(`primaryRunner_${sk}_${i}`, [
        [dir * 1.85, 0.05, z],
        [dir * 1.9, -0.25, z * 0.7],
        [dir * 1.55, -0.5, -0.15],
        [dir * 1.2, -0.62, -0.55],
        [dir * 1.0, -0.66, -0.85],
      ], 0.09, 'exhaust', 22, 12), header);
      add(rot(at(torus(`headerPortFlange_${sk}_${i}`, 0.13, 0.03, 'exhaustC', 8, 18), dir * 1.86, 0.05, z), 0, 0, HALF_PI), header);
    }
    // collector — merges the three runners into the integrated cat inlet
    add(rot(at(cyl(`headerCollector_${sk}`, 0.15, 0.2, 0.5, 'exhaust', 20), dir * 0.95, -0.7, -1.0), Math.PI / 2.3, 0, 0), header);
    exhaust.add(header);

    add(at(box(`manifoldGasket_${sk}`, 0.05, 0.55, 1.9, { color: 0x9aa0a6, metalness: 0.6, roughness: 0.7 }), dir * 1.94, 0.05, 0));

    const studs = group(`manifoldStuds_${sk}`);
    for (let i = 0; i < 3; i++) {
      const z = (i - 1) * 0.72;
      add(rot(at(cyl(`manifoldStud_${sk}_${i}`, 0.04, 0.04, 0.18, 'bolt', 8), dir * 1.97, 0.05, z), 0, 0, HALF_PI), studs);
    }
    exhaust.add(studs);

    if (sk === 'R') {
      add(at(box('manifoldBracket', 0.1, 0.3, 0.12, 'cast'), dir * 0.7, -0.55, -0.95));
    }
  }
  makeManifold(1, 'R');
  makeManifold(-1, 'L');

  // ====================================================================
  // AFTERTREATMENT — main catalytic converter INTEGRATED into the manifold,
  // two ceramic monoliths in series per bank (SI doc p54 fig 2_51_09):
  //   LSU 4.9 → first monolith (cat_*) → LSF → second monolith (secondaryCat).
  // ====================================================================
  function makeCat(dir, side) {
    const sk = side;
    const cat = group(`cat_${sk}`);
    // first monolith — close-coupled, directly below/behind the collector
    const cx = dir * 0.9, cy = -0.82, cz = -1.3;
    add(rot(at(cyl(`catBody_${sk}`, 0.21, 0.21, 0.55, 'exhaustC', 20), cx, cy, cz), Math.PI / 2.15, 0, 0), cat);
    add(rot(at(cyl(`catInletCone_${sk}`, 0.15, 0.21, 0.16, 'exhaustC', 18), cx + dir * 0.02, cy + 0.1, cz + 0.34), Math.PI / 2.15, 0, 0), cat);
    add(rot(at(cyl(`catOutletCone_${sk}`, 0.21, 0.15, 0.16, 'exhaustC', 18), cx - dir * 0.03, cy - 0.1, cz - 0.34), Math.PI / 2.15, 0, 0), cat);
    exhaust.add(cat);

    // heat shield wrapped over the integrated cat (mid-engine bay protection)
    add(rot(at(torusArc(`heatShield_cat${sk}`, 0.28, 0.02, 'cover', 8, 20, Math.PI), cx, cy + 0.12, cz), Math.PI / 2.15, 0, dir * 0.3));

    // LSU 4.9 broadband sensor — ahead of the first monolith
    const preO2 = group(`preCatO2Sensor_${sk}`);
    add(rot(at(cyl(`preCatO2Body_${sk}`, 0.05, 0.05, 0.18, 'steel', 10), cx + dir * 0.18, cy + 0.28, cz + 0.4), 0, 0, dir * 0.7), preO2);
    add(rot(at(cyl(`preCatO2Connector_${sk}`, 0.06, 0.06, 0.1, 'rubber', 8), cx + dir * 0.3, cy + 0.38, cz + 0.42), 0, 0, dir * 0.7), preO2);
    exhaust.add(preO2);

    // LSF step sensor — between the first and second monoliths
    const postO2 = group(`postCatO2Sensor_${sk}`);
    add(rot(at(cyl(`postCatO2Body_${sk}`, 0.05, 0.05, 0.18, 'steel', 10), cx + dir * 0.16, cy - 0.22, cz - 0.42), 0, 0, dir * 0.7), postO2);
    add(rot(at(cyl(`postCatO2Connector_${sk}`, 0.06, 0.06, 0.1, 'rubber', 8), cx + dir * 0.28, cy - 0.12, cz - 0.44), 0, 0, dir * 0.7), postO2);
    exhaust.add(postO2);
  }
  makeCat(1, 'R');
  makeCat(-1, 'L');

  // ---- second monolith per bank — in series directly downstream of the first
  // (same integrated converter housing; NOT an underfloor cat like the 981).
  const secondaryCat = group('secondaryCat');
  for (const [dir, sk] of [[1, 'R'], [-1, 'L']]) {
    add(rot(at(cyl(`secondaryCatBody_${sk}`, 0.19, 0.19, 0.45, 'exhaustC', 18), dir * 0.84, -1.0, -1.72), Math.PI / 2.15, 0, 0), secondaryCat);
    add(rot(at(cyl(`secondaryCatOutlet_${sk}`, 0.19, 0.12, 0.14, 'exhaustC', 16), dir * 0.81, -1.08, -1.98), Math.PI / 2.15, 0, 0), secondaryCat);
  }
  exhaust.add(secondaryCat);

  // ---- lambda probe wiring holder (bracket near the integrated cats)
  add(at(box('lambdaProbeHolder', 0.12, 0.08, 0.1, 'steel'), 0.6, -0.68, -1.25));

  // ====================================================================
  // CONNECTING PIPES — one per bank, sweeping rearward and OUTBOARD from the
  // integrated cat outlet to the front-outboard inlet of each rear silencer
  // (SI fig 2_55_09). A corrugated decoupling section sits just ahead of the
  // silencer inlet.
  // ====================================================================
  for (const [dir, sk] of [[1, 'R'], [-1, 'L']]) {
    add(tube(`connectingPipe_${sk}`, [
      [dir * 0.81, -1.1, -2.02],
      [dir * 0.95, -1.13, -2.3],
      [dir * 1.18, -1.16, -2.6],
      [dir * 1.38, -1.18, -2.8],
      [dir * 1.53, -1.19, -2.93],
    ], 0.1, 'exhaustD', 22, 12));

    // flex / decoupling bellows in the pipe run ahead of the silencer inlet
    const flex = group(`flexPipe_${sk}`);
    add(tube(`flexPipeBody_${sk}`, [
      [dir * 1.14, -1.155, -2.55],
      [dir * 1.32, -1.175, -2.74],
    ], 0.115, 'steel', 8, 14), flex);
    for (let r = 0; r < 4; r++) {
      const t = (r + 0.5) / 4;
      const px = 1.14 + t * 0.18, pz = -2.55 - t * 0.19;
      add(tube(`flexPipeRib_${sk}_${r}`, [
        [dir * (px - 0.014), -1.155 - t * 0.02, pz + 0.015],
        [dir * (px + 0.014), -1.155 - t * 0.02, pz - 0.015],
      ], 0.13, 'steel', 4, 14), flex);
    }
    exhaust.add(flex);
  }

  // ---- underbody heat shield spanning the cat / connecting-pipe run
  add(at(box('heatShield_underbody', 2.2, 0.05, 1.5, 'cover'), 0, -0.88, -2.3));

  // ====================================================================
  // SILENCING — two large rear silencers laid diagonally (front-outboard →
  // rear-inboard), rounded canisters with rolled bands (SI fig 2_50_09).
  // 987.2: main cats REMOVED from the silencers, internals redesigned.
  // ====================================================================
  function makeMuffler(dir, side) {
    const sk = side;
    const mx = dir * MUFFLER_C.x, my = MUFFLER_C.y, mz = MUFFLER_C.z;
    const muffler = group(`muffler_${sk}`);
    const mufflerH = 0.5;
    add(roundBox(`mufflerBody_${sk}`, MUFFLER_LEN, mufflerH, 0.56, 'exhaustD', 4), muffler);
    // rolled circumferential bands on the can
    add(at(roundBox(`mufflerBandA_${sk}`, 0.05, mufflerH + 0.03, 0.59, 'exhaustD', 2), 0.32, 0, 0), muffler);
    add(at(roundBox(`mufflerBandB_${sk}`, 0.05, mufflerH + 0.03, 0.59, 'exhaustD', 2), -0.28, 0, 0), muffler);
    // domed end caps
    add(at(roundBox(`mufflerEndOut_${sk}`, 0.12, mufflerH - 0.04, 0.5, 'exhaustD', 4), 0.66, 0, 0), muffler);
    add(at(roundBox(`mufflerEndIn_${sk}`, 0.12, mufflerH - 0.04, 0.5, 'exhaustD', 4), -0.66, 0, 0), muffler);
    // inlet stub on the front-outboard end (local +X)
    add(rot(at(cyl(`mufflerInlet_${sk}`, 0.1, 0.1, 0.22, 'exhaustD', 14), 0.76, 0.02, 0), 0, 0, HALF_PI), muffler);
    // outlet stub on the rear-inboard end (local -X) toward the mixing chamber
    add(rot(at(cyl(`mufflerOutlet_${sk}`, 0.09, 0.09, 0.24, 'exhaustD', 14), -0.76, -0.02, 0), 0, 0, HALF_PI), muffler);
    at(muffler, mx, my, mz);
    // mirror local X for left; yaw so the can runs front-outboard → rear-inboard
    muffler.scale.x = dir;
    muffler.rotation.y = dir * MUFFLER_YAW;
    exhaust.add(muffler);

    // inlet gasket at the connecting-pipe joint (front-outboard end)
    add(rot(at(torus(`mufflerInletGasket_${sk}`, 0.115, 0.022, { color: 0x9aa0a6, metalness: 0.6, roughness: 0.7 }, 8, 20),
      dir * 1.56, -1.19, -2.96), HALF_PI * 0.55, dir * 0.6, 0));
  }
  makeMuffler(1, 'R');
  makeMuffler(-1, 'L');

  // ---- connecting pipes BETWEEN the silencers — mix banks 1 & 2 at the
  // centre before the tailpipes (SI doc p53). Two transverse pipes.
  const midPipe = group('midPipe');
  add(tube('crossoverPipeA', [
    [0.52, -1.2, -3.78], [0.0, -1.21, -3.86], [-0.52, -1.2, -3.92],
  ], 0.085, 'exhaustD', 16, 12), midPipe);
  add(tube('crossoverPipeB', [
    [-0.5, -1.24, -3.98], [0.0, -1.25, -4.05], [0.5, -1.24, -3.96],
  ], 0.085, 'exhaustD', 16, 12), midPipe);
  exhaust.add(midPipe);

  // ---- centre mixing chamber / tailpipe connection where both banks' gases
  // blend before exiting (carries the twin-tip assembly).
  const resonator = group('resonator');
  add(at(roundBox('mixChamberBody', 0.5, 0.26, 0.3, 'exhaustD', 3), 0, -1.23, -4.05), resonator);
  add(rot(at(cyl('mixChamberEndR', 0.11, 0.13, 0.07, 'exhaustD', 16), 0.27, -1.23, -4.05), 0, 0, HALF_PI), resonator);
  add(rot(at(cyl('mixChamberEndL', 0.13, 0.11, 0.07, 'exhaustD', 16), -0.27, -1.23, -4.05), 0, 0, HALF_PI), resonator);
  exhaust.add(resonator);

  // ---- heat shield over the crossover / mixing section
  add(at(box('heatShield_midPipe', 1.3, 0.04, 0.55, 'cover'), 0, -0.98, -3.9));

  // ====================================================================
  // TAILPIPES — central exit. S models: twin tailpipe as a true twin-pipe
  // system with two separate pipe connections (SI doc p55); base 2.9: single
  // oval tip (SI doc p60). Modelled as the S twin tip.
  // ====================================================================
  const tipBaseY = -1.23;
  const tipBaseZ = -4.2;
  for (const [dir, sk, xoff] of [[1, 'R', 0.15], [-1, 'L', -0.15]]) {
    const tip = group(`tip_${sk}_0`);
    add(rot(at(cyl(`tipOuter_${sk}_0`, 0.12, 0.11, 0.3, 'exhaustC', 20), xoff, tipBaseY, tipBaseZ - 0.12), HALF_PI, 0, 0), tip);
    add(rot(at(cyl(`tipInner_${sk}_0`, 0.09, 0.09, 0.24, { color: 0x1a1a1a, metalness: 0.7, roughness: 0.4 }, 18), xoff, tipBaseY, tipBaseZ - 0.18), HALF_PI, 0, 0), tip);
    add(rot(at(torus(`tipRim_${sk}_0`, 0.12, 0.016, 'exhaustC', 8, 22), xoff, tipBaseY, tipBaseZ - 0.26), HALF_PI, 0, 0), tip);
    add(rot(at(torus(`tipClamp_${sk}_0`, 0.125, 0.02, 'steel', 8, 20), xoff, tipBaseY, tipBaseZ - 0.02), HALF_PI, 0, 0), tip);
    // separate pipe connection from this side's silencer outlet / mixing
    // chamber to the tip (twin-pipe system, no shared T-branch)
    add(tube(`tipPipe_${sk}_0`, [
      [dir * 0.45, -1.23, -3.98],
      [dir * 0.28, -1.23, -4.05],
      [xoff, tipBaseY, tipBaseZ + 0.02],
      [xoff, tipBaseY, tipBaseZ - 0.1],
    ], 0.08, 'exhaustC', 16, 12), tip);
    exhaust.add(tip);
  }

  // ====================================================================
  // PSE SPORT EXHAUST (option on the 987) — bypass valve integrated at the
  // rear silencer outlet with vacuum actuator + supply line.
  // ====================================================================
  const pseValve = group('pseValve');
  const pvx = 0.72, pvy = -1.18, pvz = -3.78;
  add(at(box('pseValveBody', 0.18, 0.18, 0.22, 'exhaustD'), pvx, pvy, pvz), pseValve);
  add(rot(at(cyl('pseValveFlap', 0.09, 0.09, 0.05, 'steel', 14), pvx, pvy, pvz), HALF_PI, 0, 0), pseValve);
  exhaust.add(pseValve);

  const pseActuator = group('pseActuator');
  add(rot(at(cyl('pseActuatorCan', 0.1, 0.1, 0.16, { color: 0x2b2b2e, metalness: 0.3, roughness: 0.6 }, 16), pvx + 0.2, pvy + 0.18, pvz + 0.05), 0, 0, HALF_PI), pseActuator);
  add(at(cyl('pseActuatorRod', 0.022, 0.022, 0.15, 'steel', 8), pvx + 0.08, pvy + 0.1, pvz + 0.02), pseActuator);
  exhaust.add(pseActuator);

  add(tube('pseVacuumLine', [
    [pvx + 0.25, pvy + 0.25, pvz + 0.05],
    [pvx + 0.2, pvy + 0.6, pvz + 0.5],
    [pvx, pvy + 0.9, pvz + 1.2],
    [pvx - 0.3, pvy + 1.1, pvz + 1.9],
  ], 0.025, 'rubber', 30, 8));

  // ====================================================================
  // MOUNTING — silencer holder bridge, rubber hangers, pipe clamps.
  // ====================================================================
  const silencerBracketPSE = group('silencerBracketPSE');
  add(at(roundBox('silencerHolderBridge', 2.6, 0.08, 0.18, 'steel', 2), 0, -0.82, -3.45), silencerBracketPSE);
  add(at(box('silencerHolderCentrePost', 0.14, 0.36, 0.12, 'steel'), 0, -0.64, -3.42), silencerBracketPSE);
  for (const dir of [1, -1]) {
    add(at(box(`silencerHolderArm_${dir > 0 ? 'R' : 'L'}`, 0.1, 0.26, 0.12, 'steel'),
      dir * 1.05, -0.97, -3.45), silencerBracketPSE);
    add(at(box(`silencerHolderPad_${dir > 0 ? 'R' : 'L'}`, 0.22, 0.06, 0.16, 'steel'),
      dir * 1.05, -1.1, -3.45), silencerBracketPSE);
  }
  exhaust.add(silencerBracketPSE);

  for (const [dir, sk] of [[1, 'R'], [-1, 'L']]) {
    const hanger = group(`hanger_${sk}`);
    add(at(box(`hangerBracket_${sk}`, 0.06, 0.2, 0.08, 'steel'), dir * 1.3, -0.78, -3.2), hanger);
    add(at(box(`hangerRubber_${sk}`, 0.08, 0.16, 0.1, 'rubber'), dir * 1.3, -0.92, -3.2), hanger);
    exhaust.add(hanger);
  }

  // ---- pipe clamp at the right silencer inlet joint
  add(rot(at(torus('exhaustClamp', 0.115, 0.028, 'steel', 10, 22), 1.48, -1.185, -2.9), HALF_PI * 0.55, 0.6, 0));

  // ---- clamping sleeve joining the left connecting pipe to its silencer
  add(tube('exhaustClampingSleeve', [
    [-1.42, -1.18, -2.84],
    [-1.55, -1.195, -2.96],
  ], 0.115, 'steel', 6, 16));

  return exhaust;
}
