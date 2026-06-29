// 981 Boxster S exhaust & PSE sport system — FULL PART COVERAGE BUILD.
// CENTER-EXIT layout (the real 981 / SOUL performance reference): tubular headers
// from each bank (3 runners) merge to collectors high near the engine, through
// flex bellows into close-coupled primary cats, then pipes run rearward and DOWN
// joined by an X-pipe / mid-pipe and secondary cats + a centre resonator, into TWO
// big rear muffler canisters sitting low at the very rear, exiting as DUAL
// tailpipe tips clustered at the CENTRE rear (near x=0). PSE vacuum valve +
// actuator on the outboard side of a muffler. Lambda sensors, heat shields,
// rubber hangers, gaskets/flanges, clamps and brackets are all named nodes.
//
// Coordinate convention (shared with other modules):
//   +X = right, -X = left, +Y = up, +Z = FRONT of car, -Z = REAR.
// So the engine sits around z = 0..-1, and the system runs back toward -Z, low (-Y),
// converging to the centre (x ~ 0) at the rear tips.
//
// Every primary part in exhaust-parts.json appears as a named mesh or group, and
// most sub-parts are emitted too (organised under per-side / per-assembly groups).

import { group, box, roundBox, cyl, capsule, tube, torus, torusArc, at, rot } from '../lib/primitives.mjs';

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
  // ---- pipes carrying gas rearward & down from each cat toward the mufflers
  for (const [dir, sk] of [[1, 'R'], [-1, 'L']]) {
    add(tube(`connectingPipe_${sk}`, [
      [dir * 0.85, -1.0, -1.95],
      [dir * 0.6, -1.05, -2.4],
      [dir * 0.5, -1.08, -2.75],
      [dir * 0.45, -1.05, -3.0],
    ], 0.1, 'exhaustD', 18, 12));
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
  // SILENCING — two big rear muffler canisters low at the rear, inlet gaskets,
  // PSE bypass valve + vacuum actuator + vacuum line, dual CENTRE-EXIT tips,
  // and the PSE silencer mounting bracket.
  // ====================================================================
  function makeMuffler(dir, side) {
    const sk = side;
    const mx = dir * 0.55, my = -1.05, mz = -3.25;
    const muffler = group(`muffler_${sk}`);
    add(rot(at(cyl(`mufflerBody_${sk}`, 0.4, 0.4, 0.95, 'exhaustD', 24), mx, my, mz), HALF_PI, 0, 0), muffler);
    add(rot(at(cyl(`mufflerEndFront_${sk}`, 0.42, 0.4, 0.06, 'exhaustD', 24), mx, my, mz + 0.48), HALF_PI, 0, 0), muffler);
    add(rot(at(cyl(`mufflerEndRear_${sk}`, 0.4, 0.42, 0.06, 'exhaustD', 24), mx, my, mz - 0.48), HALF_PI, 0, 0), muffler);
    // inlet pipe stub into the front face
    add(rot(at(cyl(`mufflerInlet_${sk}`, 0.1, 0.1, 0.2, 'exhaustD', 14), mx + dir * 0.15, my + 0.15, mz + 0.55), HALF_PI, 0, 0), muffler);
    exhaust.add(muffler);

    // ---- muffler inlet gasket (flat ring at the inlet flange)
    add(rot(at(torus(`mufflerInletGasket_${sk}`, 0.12, 0.025, { color: 0x9aa0a6, metalness: 0.6, roughness: 0.7 }, 8, 20), mx + dir * 0.15, my + 0.15, mz + 0.62), HALF_PI, 0, 0));

    // ---- PSE silencer mounting bracket (R side carries the named node)
    if (sk === 'R') {
      add(at(box('silencerBracketPSE', 0.12, 0.3, 0.15, 'steel'), mx + dir * 0.25, my + 0.3, mz));
    }
  }
  makeMuffler(1, 'R');
  makeMuffler(-1, 'L');

  // ---- PSE bypass valve (integrated into a muffler, outboard) + actuator + line
  const pseValve = group('pseValve');
  const pvx = 0.85, pvy = -0.85, pvz = -3.2;
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

  // ---- DUAL tailpipe tips, clustered at the CENTRE rear (signature 981 look)
  // Two tips side by side near x=0, pointing rearward (-Z).
  for (const [dir, sk, xoff] of [[1, 'R', 0.18], [-1, 'L', -0.18]]) {
    const tip = group(`tip_${sk}_0`);
    add(rot(at(cyl(`tipOuter_${sk}_0`, 0.13, 0.12, 0.42, 'exhaustC', 20), xoff, -1.0, -3.85), HALF_PI, 0, 0), tip);
    add(rot(at(cyl(`tipInner_${sk}_0`, 0.1, 0.1, 0.3, { color: 0x1a1a1a, metalness: 0.7, roughness: 0.4 }, 18), xoff, -1.0, -3.95), HALF_PI, 0, 0), tip);
    add(rot(at(torus(`tipRim_${sk}_0`, 0.13, 0.02, 'exhaustC', 8, 22), xoff, -1.0, -4.05), HALF_PI, 0, 0), tip);
    // short connector pipe from the muffler rear to the tip
    add(tube(`tipPipe_${sk}_0`, [
      [dir * 0.55, -1.05, -3.7], [dir * 0.35, -1.02, -3.78], [xoff, -1.0, -3.85],
    ], 0.085, 'exhaustC', 14, 12), tip);
    exhaust.add(tip);
  }

  // ====================================================================
  // MOUNTING — rubber hangers suspending the system, pipe clamp, clamping
  // sleeve at an intermediate joint.
  // ====================================================================
  for (const [dir, sk] of [[1, 'R'], [-1, 'L']]) {
    const hanger = group(`hanger_${sk}`);
    add(at(box(`hangerBracket_${sk}`, 0.06, 0.2, 0.08, 'steel'), dir * 0.6, -0.78, -2.95), hanger);
    add(at(box(`hangerRubber_${sk}`, 0.08, 0.16, 0.1, 'rubber'), dir * 0.6, -0.92, -2.95), hanger);
    exhaust.add(hanger);
  }

  // ---- pipe clamp (band clamp at a pipe-to-pipe joint)
  add(rot(at(torus('exhaustClamp', 0.11, 0.03, 'steel', 10, 22), 0.45, -1.05, -2.9), HALF_PI, 0, 0));

  // ---- clamping sleeve (slip-on sleeve at an intermediate connection)
  add(rot(at(cyl('exhaustClampingSleeve', 0.12, 0.12, 0.14, 'steel', 16), -0.45, -1.05, -2.9), HALF_PI, 0, 0));

  return exhaust;
}
