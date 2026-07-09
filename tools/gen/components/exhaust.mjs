// 981 Boxster S exhaust & PSE sport system — FULL PART COVERAGE BUILD.
// Factory rear layout from WM 263319 Fig 1 (Exploded View Of Rear Silencer With
// Holder And Tailpipe Cover): tubular headers from each bank merge to collectors,
// flex bellows → close-coupled primary cats → X-pipe / mid-pipe + secondary cats
// + centre resonator, then outboard into TWO rounded-rectangular rear silencers
// at the rear corners (items 4/5), joined at centre by a clamping sleeve (6) into
// a T-shaped twin tailpipe cover (8). Item (1) rear silencer holder bridges above
// both cans. PSE vacuum valve + actuator on the outboard muffler. Lambda sensors,
// heat shields, rubber hangers, gaskets/flanges, clamps and brackets are named.
//
// Coordinate convention (shared with other modules):
//   +X = right, -X = left, +Y = up, +Z = FRONT of car, -Z = REAR.
// So the engine sits around z = 0..-1, and the system runs back toward -Z, low (-Y),
// converging to the centre (x ~ 0) at the rear tips.
//
// Every primary part in exhaust-parts.json appears as a named mesh or group, and
// most sub-parts are emitted too (organised under per-side / per-assembly groups).

import { group, box, roundBox, cyl, tube, torus, torusArc, at, rot } from '../lib/primitives.mjs';

export const meta = {
  id: 'exhaust',
  label: 'Exhaust & Sport System',
  system: 'Exhaust',
  node: 'exhaust',
  hotspot3d: '0 -0.7 -1.6',
};

const HALF_PI = Math.PI / 2;

export function build() {
  const exhaust = group('exhaust');
  const add = (m, p = exhaust) => { p.add(m); return m; };

  // ====================================================================
  // MANIFOLD ASSEMBLY (per bank) — tubular header with 3 primary runners
  // merging to a collector, manifold gasket + studs at the head interface,
  // flex bellows downstream of the collector, plus a manifold support bracket.
  // ====================================================================
  function makeManifold(dir, side) {
    const sk = side;
    // ---- header: group of 3 runners + collector
    const header = group(`headerBank_${sk}`);
    // head interface flange (z spread of the three exhaust ports on this bank)
    for (let i = 0; i < 3; i++) {
      const z = (i - 1) * 0.72;
      // primary runner: from the head port (high, outboard) curving down & rearward
      add(tube(`primaryRunner_${sk}_${i}`, [
        [dir * 1.85, 0.05, z],
        [dir * 1.9, -0.25, z * 0.7],
        [dir * 1.55, -0.5, -0.15],
        [dir * 1.2, -0.62, -0.55],
        [dir * 1.0, -0.66, -0.85],
      ], 0.085, 'exhaust', 22, 12), header);
      // port flange ring where the runner bolts to the head
      add(rot(at(torus(`headerPortFlange_${sk}_${i}`, 0.13, 0.03, 'exhaustC', 8, 18), dir * 1.86, 0.05, z), 0, 0, HALF_PI), header);
    }
    // collector — merges the three runners into one outlet
    add(rot(at(cyl(`headerCollector_${sk}`, 0.15, 0.2, 0.55, 'exhaust', 20), dir * 0.95, -0.7, -1.0), Math.PI / 2.3, 0, 0), header);
    exhaust.add(header);

    // ---- manifold gasket (flat plate sealing the flange face to the head)
    add(rot(at(box(`manifoldGasket_${sk}`, 0.05, 0.55, 1.9, { color: 0x9aa0a6, metalness: 0.6, roughness: 0.7 }), dir * 1.94, 0.05, 0), 0, 0, 0));

    // ---- manifold studs & nuts (x3) clamping the flange
    const studs = group(`manifoldStuds_${sk}`);
    for (let i = 0; i < 3; i++) {
      const z = (i - 1) * 0.72;
      add(rot(at(cyl(`manifoldStud_${sk}_${i}`, 0.04, 0.04, 0.18, 'bolt', 8), dir * 1.97, 0.05, z), 0, 0, HALF_PI), studs);
    }
    exhaust.add(studs);

    // ---- flex pipe / corrugated bellows between collector and primary cat
    const flex = group(`flexPipe_${sk}`);
    add(rot(at(cyl(`flexPipeBody_${sk}`, 0.14, 0.14, 0.42, 'steel', 18), dir * 0.92, -0.78, -1.32), Math.PI / 2.2, 0, 0), flex);
    // corrugation rings to read as a bellows
    for (let r = 0; r < 5; r++) {
      const t = r / 4;
      add(rot(at(torus(`flexPipeRib_${sk}_${r}`, 0.155, 0.028, 'steel', 8, 18),
        dir * (0.93 - t * 0.02), -0.74 - t * 0.16, -1.2 - t * 0.18), Math.PI / 2.2, 0, 0), flex);
    }
    exhaust.add(flex);

    // ---- manifold support bracket (one shared; emit on R side only as the node)
    if (sk === 'R') {
      add(at(box('manifoldBracket', 0.1, 0.3, 0.12, 'cast'), dir * 0.7, -0.55, -0.95));
    }
  }
  makeManifold(1, 'R');
  makeManifold(-1, 'L');

  // ====================================================================
  // AFTERTREATMENT — primary cats (per bank, close-coupled) with heat shields,
  // pre-cat & post-cat lambda/O2 sensors, secondary (underfloor) cats, and a
  // lambda probe wiring holder.
  // ====================================================================
  function makeCat(dir, side) {
    const sk = side;
    const cat = group(`cat_${sk}`);
    // bright canister, oriented along the rearward-down pipe run
    const cx = dir * 0.85, cy = -0.95, cz = -1.7;
    add(rot(at(cyl(`catBody_${sk}`, 0.2, 0.2, 0.8, 'exhaustC', 20), cx, cy, cz), Math.PI / 2.15, 0, 0), cat);
    add(rot(at(cyl(`catInletCone_${sk}`, 0.14, 0.2, 0.18, 'exhaustC', 18), cx, cy + 0.18, cz + 0.45), Math.PI / 2.15, 0, 0), cat);
    add(rot(at(cyl(`catOutletCone_${sk}`, 0.2, 0.14, 0.18, 'exhaustC', 18), cx, cy - 0.18, cz - 0.45), Math.PI / 2.15, 0, 0), cat);
    exhaust.add(cat);

    // ---- heat shield wrapped over the cat (curved half-shell plate)
    add(rot(at(torusArc(`heatShield_cat${sk}`, 0.27, 0.02, 'cover', 8, 20, Math.PI), cx, cy + 0.12, cz), Math.PI / 2.15, 0, dir * 0.3));

    // ---- pre-cat (upstream) lambda sensor — threaded into the pipe before the cat
    const preO2 = group(`preCatO2Sensor_${sk}`);
    add(rot(at(cyl(`preCatO2Body_${sk}`, 0.05, 0.05, 0.18, 'steel', 10), cx + dir * 0.18, cy + 0.32, cz + 0.5), 0, 0, dir * 0.7), preO2);
    add(rot(at(cyl(`preCatO2Connector_${sk}`, 0.06, 0.06, 0.1, 'rubber', 8), cx + dir * 0.3, cy + 0.42, cz + 0.52), 0, 0, dir * 0.7), preO2);
    exhaust.add(preO2);

    // ---- post-cat (downstream) lambda sensor — after the cat
    const postO2 = group(`postCatO2Sensor_${sk}`);
    add(rot(at(cyl(`postCatO2Body_${sk}`, 0.05, 0.05, 0.18, 'steel', 10), cx + dir * 0.18, cy - 0.3, cz - 0.5), 0, 0, dir * 0.7), postO2);
    add(rot(at(cyl(`postCatO2Connector_${sk}`, 0.06, 0.06, 0.1, 'rubber', 8), cx + dir * 0.3, cy - 0.2, cz - 0.52), 0, 0, dir * 0.7), postO2);
    exhaust.add(postO2);
  }
  makeCat(1, 'R');
  makeCat(-1, 'L');

  // ---- secondary (underfloor) catalytic converters (x2) downstream of the X-pipe
  const secondaryCat = group('secondaryCat');
  for (const [dir, sk] of [[1, 'R'], [-1, 'L']]) {
    add(rot(at(cyl(`secondaryCatBody_${sk}`, 0.16, 0.16, 0.55, 'exhaustC', 18), dir * 0.45, -1.05, -2.25), Math.PI / 2, 0, 0), secondaryCat);
  }
  exhaust.add(secondaryCat);

  // ---- lambda probe wiring holder (small bracket near the cats, centre-ish)
  add(at(box('lambdaProbeHolder', 0.12, 0.08, 0.1, 'steel'), 0.55, -0.7, -1.5));

  // ====================================================================
  // MID-SECTION — X-pipe / mid-pipe crossover joining both banks, a centre
  // resonator, and heat shields (mid-pipe + large underbody).
  // ====================================================================
  // ---- pipes carrying gas rearward & OUTBOARD from each cat toward the
  // corner silencers (WM 263319 Fig 1 items 4/5). Final segment rises and
  // curves forward into the silencer inlet neck (exploded-view inlet path).
  for (const [dir, sk] of [[1, 'R'], [-1, 'L']]) {
    add(tube(`connectingPipe_${sk}`, [
      [dir * 0.85, -1.0, -1.95],
      [dir * 1.1, -1.05, -2.45],
      [dir * 1.45, -1.08, -2.85],
      [dir * 1.65, -1.0, -3.05],
      [dir * 1.72, -0.88, -3.18],
      [dir * 1.7, -0.82, -3.28],
    ], 0.1, 'exhaustD', 20, 12));
  }

  // ---- mid-pipe / X-pipe crossover (the X linking left & right pipes centrally)
  const midPipe = group('midPipe');
  // the two diagonal crossover legs forming the X near the centre
  add(tube('xpipeLegA', [
    [0.5, -1.06, -2.35], [0.0, -1.08, -2.55], [-0.5, -1.06, -2.75],
  ], 0.085, 'exhaustD', 16, 12), midPipe);
  add(tube('xpipeLegB', [
    [-0.5, -1.06, -2.35], [0.0, -1.08, -2.55], [0.5, -1.06, -2.75],
  ], 0.085, 'exhaustD', 16, 12), midPipe);
  // small balance tube at the crossing
  add(rot(at(cyl('xpipeJunction', 0.09, 0.09, 0.3, 'exhaustD', 14), 0, -1.08, -2.55), 0, HALF_PI, 0), midPipe);
  exhaust.add(midPipe);

  // ---- centre-section resonator canister (ahead of the mufflers, centre)
  const resonator = group('resonator');
  add(rot(at(cyl('resonatorBody', 0.22, 0.22, 0.6, 'exhaustD', 20), 0, -1.05, -2.55), 0, HALF_PI, 0), resonator);
  add(rot(at(cyl('resonatorEndR', 0.18, 0.22, 0.08, 'exhaustD', 18), 0.32, -1.05, -2.55), 0, HALF_PI, 0), resonator);
  add(rot(at(cyl('resonatorEndL', 0.22, 0.18, 0.08, 'exhaustD', 18), -0.32, -1.05, -2.55), 0, HALF_PI, 0), resonator);
  exhaust.add(resonator);

  // ---- mid-pipe heat shield (curved plate over the X-pipe / resonator)
  add(at(box('heatShield_midPipe', 1.4, 0.04, 0.7, 'cover'), 0, -0.82, -2.5));

  // ---- large underbody / mid-section heat shield (signature mid-engine item)
  add(at(box('heatShield_underbody', 2.0, 0.05, 1.6, 'cover'), 0, -0.7, -1.9));

  // ====================================================================
  // SILENCING — WM 263319 Fig 1 rear silencer assembly:
  //   (4)/(5) rounded-rectangular silencers at rear corners
  //   (1) holder bridge spanning above both cans → silencerBracketPSE
  //   (6) clamping sleeve joining L/R outlets at centre before tips
  //   (8) T-shaped twin tailpipe cover (shared base + tip_R / tip_L outlets)
  // Plus inlet gaskets, PSE bypass valve + vacuum actuator + vacuum line.
  // ====================================================================
  function makeMuffler(dir, side) {
    const sk = side;
    // Canister centres stay at rear corners (native gen space ≈ ±1.7, z ≈ -3.3).
    const mx = dir * 1.7, my = -1.02, mz = -3.3;
    const muffler = group(`muffler_${sk}`);
    // Rounded-rectangular / oval can (WM Fig 1 + Fig 3 clamp view) — flatter
    // in Y than a cylinder, long axis along local X (transverse).
    add(roundBox(`mufflerBody_${sk}`, 1.1, 0.52, 0.72, 'exhaustD', 4), muffler);
    // subtle body ribs (horizontal indentations on the can)
    add(at(roundBox(`mufflerRibA_${sk}`, 0.95, 0.04, 0.74, 'exhaustD', 2), 0, 0.08, 0), muffler);
    add(at(roundBox(`mufflerRibB_${sk}`, 0.95, 0.04, 0.74, 'exhaustD', 2), 0, -0.08, 0), muffler);
    // end caps — slightly proud rounded faces
    add(at(roundBox(`mufflerEndOut_${sk}`, 0.08, 0.5, 0.68, 'exhaustD', 3), 0.56, 0, 0), muffler);
    add(at(roundBox(`mufflerEndIn_${sk}`, 0.08, 0.5, 0.68, 'exhaustD', 3), -0.56, 0, 0), muffler);
    // inlet neck: curves up/forward into the front face of the can
    add(tube(`mufflerInlet_${sk}`, [
      [-0.28, 0.18, 0.55],
      [-0.22, 0.28, 0.42],
      [-0.12, 0.22, 0.28],
      [0.0, 0.08, 0.12],
    ], 0.095, 'exhaustD', 12, 12), muffler);
    // short outlet stub on the inboard end (local +X → centre after yaw) toward sleeve
    add(rot(at(cyl(`mufflerOutlet_${sk}`, 0.09, 0.09, 0.28, 'exhaustD', 14), 0.62, 0.02, -0.08), 0, 0, HALF_PI), muffler);
    at(muffler, mx, my, mz);
    // mirror local X for left so inboard stays inboard; yaw so outlets trail
    // rearward toward the centre twin-tip cover.
    muffler.scale.x = dir;
    muffler.rotation.y = dir * -0.32;
    exhaust.add(muffler);

    // ---- muffler inlet gasket (flat ring at the inlet flange)
    add(rot(at(torus(`mufflerInletGasket_${sk}`, 0.12, 0.025, { color: 0x9aa0a6, metalness: 0.6, roughness: 0.7 }, 8, 20),
      mx - dir * 0.22, my + 0.22, mz + 0.48), HALF_PI, 0, 0));
  }
  makeMuffler(1, 'R');
  makeMuffler(-1, 'L');

  // ---- (1) Rear silencer holder — bridge/frame spanning above both silencers
  // (WM 263319 Fig 1 item 1 / Fig 3 holder view). Nested under the existing
  // PRIMARY contract node silencerBracketPSE (no new primary node names).
  const silencerBracketPSE = group('silencerBracketPSE');
  // transverse bridge rail above the cans
  add(at(roundBox('silencerHolderBridge', 3.2, 0.08, 0.18, 'steel', 2), 0, -0.62, -3.2), silencerBracketPSE);
  // central lattice / X reinforcement (transmission-bracket mount area)
  add(at(box('silencerHolderCentrePost', 0.14, 0.42, 0.12, 'steel'), 0, -0.42, -3.15), silencerBracketPSE);
  add(rot(at(box('silencerHolderXBraceA', 0.55, 0.05, 0.08, 'steel'), 0, -0.48, -3.18), 0, 0, 0.55), silencerBracketPSE);
  add(rot(at(box('silencerHolderXBraceB', 0.55, 0.05, 0.08, 'steel'), 0, -0.48, -3.18), 0, 0, -0.55), silencerBracketPSE);
  // outer drop arms toward each silencer
  for (const dir of [1, -1]) {
    add(at(box(`silencerHolderArm_${dir > 0 ? 'R' : 'L'}`, 0.1, 0.28, 0.12, 'steel'),
      dir * 1.45, -0.78, -3.22), silencerBracketPSE);
    add(at(box(`silencerHolderPad_${dir > 0 ? 'R' : 'L'}`, 0.22, 0.06, 0.16, 'steel'),
      dir * 1.55, -0.92, -3.25), silencerBracketPSE);
  }
  exhaust.add(silencerBracketPSE);

  // ---- PSE bypass valve (integrated into a muffler, outboard) + actuator + line
  const pseValve = group('pseValve');
  const pvx = 1.45, pvy = -0.85, pvz = -3.1;
  add(at(box('pseValveBody', 0.2, 0.2, 0.24, 'exhaustD'), pvx, pvy, pvz), pseValve);
  add(rot(at(cyl('pseValveFlap', 0.1, 0.1, 0.06, 'steel', 14), pvx, pvy, pvz), HALF_PI, 0, 0), pseValve);
  exhaust.add(pseValve);

  // ---- PSE vacuum actuator (pneumatic canister on the outboard side)
  const pseActuator = group('pseActuator');
  add(rot(at(cyl('pseActuatorCan', 0.11, 0.11, 0.18, { color: 0x2b2b2e, metalness: 0.3, roughness: 0.6 }, 16), pvx + 0.18, pvy + 0.18, pvz), 0, 0, HALF_PI), pseActuator);
  add(at(cyl('pseActuatorRod', 0.025, 0.025, 0.16, 'steel', 8), pvx + 0.05, pvy + 0.1, pvz), pseActuator);
  exhaust.add(pseActuator);

  // ---- PSE vacuum line (thin hose from intake region down to the actuator)
  add(tube('pseVacuumLine', [
    [pvx + 0.2, pvy + 0.25, pvz],
    [pvx + 0.1, pvy + 0.6, pvz + 0.3],
    [pvx - 0.2, pvy + 0.9, pvz + 0.9],
    [pvx - 0.5, pvy + 1.1, pvz + 1.6],
  ], 0.025, 'rubber', 30, 8));

  // ---- (6) Clamping sleeve at the L/R outlet junction, centre-rear, just
  // ahead of the twin tip cover (WM 263319 Fig 1 item 6).
  // sleeve axis along X (joins L↔R outlet pipes)
  add(rot(at(cyl('exhaustClampingSleeve', 0.13, 0.13, 0.22, 'steel', 16), 0, -1.0, -3.72), 0, 0, HALF_PI));

  // ---- (8) Twin tailpipe cover — one T-shaped assembly: shared base plate /
  // neck at the sleeve, then tip_R_0 / tip_L_0 outlet groups (PRIMARY nodes).
  const tipBaseY = -1.0;
  const tipBaseZ = -3.88;
  // shared T-stem / base plate (visual only; not a PRIMARY contract node)
  add(at(roundBox('tailpipeCoverBase', 0.55, 0.1, 0.22, 'exhaustC', 3), 0, tipBaseY, tipBaseZ + 0.08));
  add(rot(at(cyl('tailpipeCoverNeck', 0.11, 0.11, 0.18, 'exhaustC', 16), 0, tipBaseY, tipBaseZ + 0.18), HALF_PI, 0, 0));

  for (const [dir, sk, xoff] of [[1, 'R', 0.17], [-1, 'L', -0.17]]) {
    const tip = group(`tip_${sk}_0`);
    // outlet cylinders share the T crossbar; slightly shorter so the base reads
    add(rot(at(cyl(`tipOuter_${sk}_0`, 0.125, 0.115, 0.32, 'exhaustC', 20), xoff, tipBaseY, tipBaseZ - 0.05), HALF_PI, 0, 0), tip);
    add(rot(at(cyl(`tipInner_${sk}_0`, 0.095, 0.095, 0.24, { color: 0x1a1a1a, metalness: 0.7, roughness: 0.4 }, 18), xoff, tipBaseY, tipBaseZ - 0.12), HALF_PI, 0, 0), tip);
    add(rot(at(torus(`tipRim_${sk}_0`, 0.125, 0.018, 'exhaustC', 8, 22), xoff, tipBaseY, tipBaseZ - 0.2), HALF_PI, 0, 0), tip);
    // (7) screw-type clamp band on each tip neck
    add(rot(at(torus(`tipClamp_${sk}_0`, 0.13, 0.022, 'steel', 8, 20), xoff, tipBaseY, tipBaseZ + 0.02), HALF_PI, 0, 0), tip);
    // outlet pipe from corner silencer → centre sleeve → tip
    add(tube(`tipPipe_${sk}_0`, [
      [dir * 1.25, -1.02, -3.48],
      [dir * 0.65, -1.01, -3.62],
      [dir * 0.22, -1.0, -3.7],
      [xoff * 0.4, tipBaseY, tipBaseZ + 0.05],
      [xoff, tipBaseY, tipBaseZ - 0.05],
    ], 0.085, 'exhaustC', 16, 12), tip);
    exhaust.add(tip);
  }

  // ====================================================================
  // MOUNTING — rubber hangers suspending the system, inlet pipe clamp
  // (WM 263319 Fig 1 item 2 / Fig 3 clamp on rear silencer).
  // ====================================================================
  for (const [dir, sk] of [[1, 'R'], [-1, 'L']]) {
    const hanger = group(`hanger_${sk}`);
    add(at(box(`hangerBracket_${sk}`, 0.06, 0.2, 0.08, 'steel'), dir * 1.55, -0.78, -3.15), hanger);
    add(at(box(`hangerRubber_${sk}`, 0.08, 0.16, 0.1, 'rubber'), dir * 1.55, -0.92, -3.15), hanger);
    exhaust.add(hanger);
  }

  // ---- pipe clamp on the right silencer inlet joint (item 2); left is mirrored
  // visually by the gasket/inlet geometry — keep the named PRIMARY node once.
  add(rot(at(torus('exhaustClamp', 0.12, 0.03, 'steel', 10, 22), 1.7, -0.82, -3.22), HALF_PI, 0, 0));

  return exhaust;
}
