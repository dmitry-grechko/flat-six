// 981 MA1 3.4L water-cooled flat-six (MA1.21) — FULL PART COVERAGE BUILD.
// Every PRIMARY node from engine-parts.json is a distinctly-named group/mesh
// so the app can pin via getObjectByName(part.node).
//
// WM geometry refs (factory CAD figures under tools/gen/wm-refs/engine/):
//   crank-chains-3640 / 3653 — flat-plane crank, webs, front chain sprockets
//   piston-rod-3740 — 97mm DFI dish piston, 3 rings, I-beam rod, shells, cap, bolts
//   cams-valvetrain-3871 — head + dual cams + bearing saddles
//   cams-valvetrain-3872 — intake cam phaser vs exhaust sprocket
//   solenoids-tappets-3911 — lift solenoids on SIDE of head; cam-control on TOP
//   solenoids-tappets-3931 — bucket + switching tappets
//   belt-side-3597 — accessory face overview
//
// Right-hand coords, viewed from above / 3-4 front:
//   X = bank spread (+X = Bank1 / driver / right = cylHead_R; -X = Bank2 / L)
//   Y = up
//   Z = fore/aft; +Z FRONT accessory face; -Z REAR bellhousing.
// Cylinder Z at (i-1)*0.72. Cutaway on RIGHT bank (+X).
// Water-cooled: NO cooling fins, NO central fan.

import {
  group, box, roundBox, cyl, cylArc, capsule, lathe, tube, torus, sphere, extrude, at, rot,
} from '../lib/primitives.mjs';
import { footprint, centerline } from '../lib/wm-traces.mjs';

export const meta = {
  id: 'engine',
  label: '3.4L Flat-Six (MA1)',
  system: 'Engine',
  node: 'engine',
  hotspot3d: '0 1.2 0',
};

const HALF_PI = Math.PI / 2;

/** WM 175019 Fig 1 (p4035) — blue CAD outline traced → gen XZ footprint. */
const OIL_PAN_FOOTPRINT = footprint('981/traces/oil-pan-4035.trace.json');

/** WM 3537 S-bend hose — placed on Bank1 coolant connection. */
const ENGINE_HOSE_S = centerline('981/traces/coolant-hoses-3537.trace.json', {
  origin: [1.35, 0.45, 0.9],
  map: (x, y) => [-y * 0.5, -x * 0.35, -x * 0.4],
  scale: 0.85,
});
const ENGINE_HOSE_S_L = ENGINE_HOSE_S.map(([x, y, z]) => [-x - 0.15, y - 0.05, z]);

export function build() {
  const engine = group('engine');
  const add = (m, p = engine) => { p.add(m); return m; };

  // ====================================================================
  // STRUCTURE — crankcase, cylinder heads L/R, sump/oil pan, motor mounts,
  // starter motor, transaxle bellhousing. RIGHT bank cutaway for internals.
  // Tier A silhouette: WM belt-side-3597 (unit carrier / case massing) +
  // oil-pan-4035/4045 (lower finned pan + upper frame).
  // ====================================================================
  const structure = group('structure');

  // ---- crankcase (+ engineBlock alias for PRIMARY eng-block-001)
  // Flat-six: wide shallow case with bank shoulders, not a single brick.
  const crankcase = group('crankcase');
  // Central tunnel (crank tunnel / case split)
  add(roundBox('crankcaseMain', 1.55, 1.35, 2.35, 'block', 3), crankcase);
  // Bank shoulders (cylinder banks flare outboard)
  add(at(roundBox('crankcaseBankR', 0.95, 1.05, 2.15, 'block', 3), 1.05, 0.05, 0), crankcase);
  add(at(roundBox('crankcaseBankL', 0.95, 1.05, 2.15, 'block', 3), -1.05, 0.05, 0), crankcase);
  // Horizontal case ribs (WM belt-side / pump figs show finned casting)
  for (let i = 0; i < 6; i++) {
    const y = -0.45 + i * 0.18;
    add(at(box(`crankcaseRibR_${i}`, 0.04, 0.06, 1.9, 'castDark'), 1.52, y, 0), crankcase);
    add(at(box(`crankcaseRibL_${i}`, 0.04, 0.06, 1.9, 'castDark'), -1.52, y, 0), crankcase);
  }
  // Horizontal split seam (upper/lower crankcase halves)
  add(at(box('crankcaseSeam', 3.1, 0.1, 2.4, 'castDark'), 0, -0.15, 0), crankcase);
  add(at(box('crankcaseWebFront', 2.9, 1.1, 0.1, 'castDark'), 0, 0, 1.2), crankcase);
  add(at(box('crankcaseWebRear', 2.9, 1.1, 0.1, 'castDark'), 0, 0, -1.2), crankcase);
  // Unit carrier / coolant distributor housing mass on Bank2 accessory face (WM -10-)
  add(at(roundBox('unitCarrier', 0.55, 0.95, 0.7, 'cast', 2), -1.55, 0.15, 1.05), crankcase);
  for (const zz of [-0.9, -0.3, 0.3, 0.9]) {
    for (const s of [1, -1]) {
      add(rot(at(cyl(`caseBolt_${s > 0 ? 'R' : 'L'}_${zz}`, 0.07, 0.07, 0.14, 'bolt', 10), s * 1.55, 0, zz), 0, 0, HALF_PI), crankcase);
    }
  }
  for (let i = 0; i < 3; i++) {
    const z = (i - 1) * 0.72;
    add(rot(at(cylArc(`bore_${i}`, 0.36, 0.36, 0.95, 'bore', 28, Math.PI * 0.35, Math.PI * 1.5, true), 1.18, 0.1, z), 0, 0, HALF_PI), crankcase);
  }
  structure.add(crankcase);

  const engineBlock = group('engineBlock');
  add(at(roundBox('engineBlockCasting', 1.5, 1.25, 2.2, 'block', 3), 0, 0, 0), engineBlock);
  add(at(roundBox('engineBlockBankR', 0.9, 0.95, 2.05, 'block', 2), 1.05, 0.05, 0), engineBlock);
  add(at(roundBox('engineBlockBankL', 0.9, 0.95, 2.05, 'block', 2), -1.05, 0.05, 0), engineBlock);
  add(at(box('engineBlockSeam', 3.0, 0.08, 2.22, 'castDark'), 0, -0.15, 0), engineBlock);
  structure.add(engineBlock);

  // ---- sump / oil pan (+ oilPanSump alias)
  // WM 175019: lower pan = irregular flange + dense longitudinal cooling fins +
  // two support-dome recesses; upper pan = open frame with side protrusion.
  const sump = group('sump');
  // Lower pan body — extruded irregular footprint, fins on underside
  const oilPanBody = rot(extrude('oilPan', OIL_PAN_FOOTPRINT, 0.55, 'cast', {
    bevelThickness: 0.04, bevelSize: 0.035,
  }), HALF_PI, 0, 0);
  oilPanBody.position.set(0, -1.15, 0);
  sump.add(oilPanBody);
  // Perimeter flange lip (thinner plate above body)
  const oilPanLip = rot(extrude('oilPanLip', OIL_PAN_FOOTPRINT.map(([x, z]) => [x * 1.04, z * 1.04]), 0.06, 'castDark', {
    bevel: false,
  }), HALF_PI, 0, 0);
  oilPanLip.position.set(0, -0.85, 0);
  sump.add(oilPanLip);
  // Longitudinal cooling fins (WM 4035 — dense vertical fins across pan face)
  for (let i = 0; i < 11; i++) {
    const x = -0.95 + i * 0.19;
    add(at(box(`sumpRib_${i}`, 0.045, 0.42, 1.55, 'castDark'), x, -1.28, 0.05), sump);
  }
  // Support domes (screws 3 & 4 in WM sequence) — circular recesses mid-pan
  add(at(cyl('oilPanDomeA', 0.16, 0.16, 0.12, 'castDark', 16), -0.25, -1.0, 0.1), sump);
  add(at(cyl('oilPanDomeB', 0.16, 0.16, 0.12, 'castDark', 16), 0.35, -1.0, 0.1), sump);
  add(at(cyl('oilDrainPlug', 0.1, 0.1, 0.16, 'bolt', 12), 0.7, -1.48, 0.35), sump);
  // Upper oil pan frame (WM 4045) — open rectangular frame + side box protrusion
  const oilSumpUpperPart = group('oilSumpUpperPart');
  add(at(box('oilSumpUpperFrame', 2.2, 0.22, 1.7, 'cast'), 0, -0.72, 0), oilSumpUpperPart);
  add(at(box('oilSumpUpperCutout', 1.5, 0.24, 1.1, 'castDark'), 0, -0.72, 0), oilSumpUpperPart);
  add(at(box('oilSumpUpperProtrusion', 0.55, 0.28, 0.7, 'cast'), -1.25, -0.7, 0.15), oilSumpUpperPart);
  add(at(box('oilSumpBaffle', 1.8, 0.06, 1.4, 'castDark'), 0, -0.62, 0), oilSumpUpperPart);
  sump.add(oilSumpUpperPart);
  const oilSumpGasket = group('oilSumpGasket');
  add(at(box('oilSumpGasketRing', 2.35, 0.03, 1.85, 'damper'), 0, -0.58, 0), oilSumpGasket);
  sump.add(oilSumpGasket);
  structure.add(sump);

  const oilPanSump = group('oilPanSump');
  const oilPanSumpBody = rot(extrude('oilPanSumpBody', OIL_PAN_FOOTPRINT.map(([x, z]) => [x * 0.98, z * 0.98]), 0.5, 'cast', {
    bevelThickness: 0.035, bevelSize: 0.03,
  }), HALF_PI, 0, 0);
  oilPanSumpBody.position.set(0, -1.15, 0);
  oilPanSump.add(oilPanSumpBody);
  structure.add(oilPanSump);

  // ---- cylinder heads (cylHead_L/R) + Bank1/Bank2 aliases
  // Bank1 = +X / R (driver); Bank2 = -X / L (passenger)
  function makeHead(dir, side) {
    const head = group(`cylHead_${side}`);
    add(at(roundBox(`headCasting_${side}`, 1.0, 1.2, 2.25, 'block'), dir * 1.35, 0.05, 0), head);
    add(at(box(`headDeck_${side}`, 0.3, 1.1, 2.2, 'castDark'), dir * 1.85, 0.05, 0), head);
    for (let i = 0; i < 3; i++) {
      const z = (i - 1) * 0.72;
      add(rot(at(cyl(`portBoss_${side}_${i}`, 0.2, 0.2, 0.35, 'block', 14), dir * 1.95, 0.35, z), 0, 0, HALF_PI), head);
    }
    structure.add(head);
  }
  makeHead(1, 'R');
  makeHead(-1, 'L');

  // Sub: head bolts (TTY) — representative set on both banks
  const headBolts = group('headBolts');
  for (const s of [1, -1]) {
    const sk = s > 0 ? 'R' : 'L';
    for (let i = 0; i < 6; i++) {
      const z = -0.9 + i * 0.36;
      add(at(cyl(`headBolt_${sk}_${i}`, 0.04, 0.04, 0.2, 'bolt', 8), s * 1.55, 0.55, z), headBolts);
    }
  }
  structure.add(headBolts);

  const cylinderHeadBank1 = group('cylinderHeadBank1');
  add(at(roundBox('cylinderHeadBank1Cast', 0.95, 1.15, 2.2, 'block'), 1.35, 0.05, 0), cylinderHeadBank1);
  structure.add(cylinderHeadBank1);
  const cylinderHeadBank2 = group('cylinderHeadBank2');
  add(at(roundBox('cylinderHeadBank2Cast', 0.95, 1.15, 2.2, 'block'), -1.35, 0.05, 0), cylinderHeadBank2);
  structure.add(cylinderHeadBank2);

  // ---- head gaskets (MLS plates between heads and case)
  const headGaskets = group('headGaskets');
  for (const s of [1, -1]) {
    const sk = s > 0 ? 'B1' : 'B2';
    add(at(box(`headGasket_${sk}`, 0.08, 1.05, 2.15, 'steel'), s * 1.05, 0.05, 0), headGaskets);
  }
  structure.add(headGaskets);

  // ---- motor mounts
  const mounts = group('motorMounts');
  for (const s of [1, -1]) {
    const sk = s > 0 ? 'R' : 'L';
    const mount = group(`motorMount_${sk}`);
    add(at(roundBox(`motorMountLug_${sk}`, 0.42, 0.45, 0.55, 'cast'), s * 1.7, -0.75, -0.4), mount);
    add(rot(at(cyl(`motorMountBush_${sk}`, 0.17, 0.17, 0.36, 'damper', 16), s * 2.0, -0.75, -0.4), 0, 0, HALF_PI), mount);
    add(rot(at(cyl(`motorMountBolt_${sk}`, 0.05, 0.05, 0.42, 'bolt', 10), s * 2.0, -0.75, -0.4), 0, 0, HALF_PI), mount);
    mounts.add(mount);
  }
  structure.add(mounts);

  // ---- bellhousing + starter
  const bell = group('bellhousing');
  add(rot(at(cyl('bellTaper', 1.0, 1.5, 1.1, 'cast', 32), 0, -0.1, -1.85), HALF_PI, 0, 0), bell);
  add(rot(at(cyl('bellSnout', 0.55, 0.55, 0.5, 'castDark', 24), 0, -0.1, -2.55), HALF_PI, 0, 0), bell);
  add(rot(at(torus('bellFlange', 1.45, 0.08, 'cast', 12, 40), 0, -0.1, -1.32), HALF_PI, 0, 0), bell);
  for (let b = 0; b < 12; b++) {
    const a = (b / 12) * Math.PI * 2;
    add(at(cyl(`bellBolt_${b}`, 0.045, 0.045, 0.12, 'bolt', 8),
      Math.cos(a) * 1.42, -0.1 + Math.sin(a) * 1.42, -1.32), bell);
  }
  for (let r = 0; r < 12; r++) {
    const a = (r / 12) * Math.PI * 2;
    add(rot(at(box(`bellRib_${r}`, 0.05, 0.1, 1.0, 'castDark'),
      Math.cos(a) * 1.15, -0.1 + Math.sin(a) * 1.15, -1.85), 0, 0, a), bell);
  }
  structure.add(bell);

  const starterMotor = group('starterMotor');
  add(rot(at(cyl('starterBody', 0.22, 0.22, 0.6, 'cast', 18), 1.1, -0.5, -1.7), HALF_PI, 0, 0), starterMotor);
  add(rot(at(cyl('starterNose', 0.14, 0.14, 0.25, 'castDark', 14), 1.1, -0.5, -1.35), HALF_PI, 0, 0), starterMotor);
  add(rot(at(cyl('starterSolenoid', 0.1, 0.1, 0.4, 'cast', 12), 1.1, -0.28, -1.7), HALF_PI, 0, 0), starterMotor);
  structure.add(starterMotor);

  engine.add(structure);

  // ====================================================================
  // ROTATING — crank (WM 3640/3653), pistons/rods (WM 3740), IMS, flex plate
  // ====================================================================
  const rotating = group('rotating');

  // ---- crankshaft: flat-plane boxer webs + main/rod journals (WM Fig 18)
  const crankshaft = group('crankshaft');
  const crankshaftForged = group('crankshaftForged');
  add(rot(at(cyl('crankMainShaft', 0.15, 0.15, 2.25, 'steel', 18), 0, 0, 0), HALF_PI, 0, 0), crankshaftForged);
  // Main journals (7) along Z
  for (let i = 0; i < 7; i++) {
    const z = -1.05 + i * 0.35;
    add(rot(at(cyl(`crankMainJournal_${i}`, 0.17, 0.17, 0.14, 'polished', 16), 0, 0, z), HALF_PI, 0, 0), crankshaftForged);
  }
  // Counterweight webs — flat-sided semi-disc style (box + half cyl)
  for (let i = 0; i < 6; i++) {
    const z = -0.9 + i * 0.36;
    const side = i % 2 === 0 ? 1 : -1;
    add(rot(at(cyl(`crankWebDisc_${i}`, 0.36, 0.36, 0.1, 'steel', 20), 0, side * 0.08, z), HALF_PI, 0, 0), crankshaftForged);
    add(at(box(`crankWebFlat_${i}`, 0.55, 0.22, 0.09, 'steel'), side * 0.12, 0, z), crankshaftForged);
  }
  // Rod journals (crankpins) — offset for boxer throws
  for (let i = 0; i < 3; i++) {
    const z = (i - 1) * 0.72;
    add(rot(at(cyl(`crankPin_${i}`, 0.13, 0.13, 0.22, 'polished', 14), 0.2, 0, z), HALF_PI, 0, 0), crankshaftForged);
    add(rot(at(cyl(`crankPinMirror_${i}`, 0.13, 0.13, 0.22, 'polished', 14), -0.2, 0, z), HALF_PI, 0, 0), crankshaftForged);
  }
  // Front sprocket nose (timing drive)
  add(rot(at(cyl('crankSprocketNose', 0.2, 0.2, 0.12, 'steel', 24), 0, 0, 1.05), HALF_PI, 0, 0), crankshaftForged);
  add(rot(at(cyl('crankSprocketTeeth', 0.22, 0.22, 0.06, 'castDark', 28), 0, 0, 1.12), HALF_PI, 0, 0), crankshaftForged);
  // Rear flange
  add(rot(at(cyl('crankRearFlange', 0.28, 0.28, 0.1, 'steel', 20), 0, 0, -1.15), HALF_PI, 0, 0), crankshaftForged);
  // Sub: main bearing shells + front/rear oil seals
  const crankshaftMainBearings = group('crankshaftMainBearings');
  for (let i = 0; i < 7; i++) {
    const z = -1.05 + i * 0.35;
    add(rot(at(cylArc(`mainBearingShell_${i}`, 0.175, 0.175, 0.12, 'polished', 12, 0, Math.PI, true), 0, -0.02, z), HALF_PI, 0, 0), crankshaftMainBearings);
  }
  crankshaft.add(crankshaftMainBearings);
  const crankshaftOilSeal = group('crankshaftOilSeal');
  add(rot(at(torus('crankOilSealFront', 0.2, 0.03, 'damper', 8, 24), 0, 0, 1.18), HALF_PI, 0, 0), crankshaftOilSeal);
  add(rot(at(torus('crankOilSealRear', 0.26, 0.03, 'damper', 8, 24), 0, 0, -1.2), HALF_PI, 0, 0), crankshaftOilSeal);
  crankshaft.add(crankshaftOilSeal);
  crankshaft.add(crankshaftForged);
  rotating.add(crankshaft);

  // ---- main bearing caps along crank axis
  const mainBearingCaps = group('mainBearingCaps');
  for (let i = 0; i < 7; i++) {
    const z = -1.05 + i * 0.35;
    add(at(box(`mainBearingCap_${i}`, 0.55, 0.22, 0.16, 'cast'), 0, -0.28, z), mainBearingCaps);
    add(at(cyl(`mainBearingBoltL_${i}`, 0.035, 0.035, 0.18, 'bolt', 8), -0.18, -0.4, z), mainBearingCaps);
    add(at(cyl(`mainBearingBoltR_${i}`, 0.035, 0.035, 0.18, 'bolt', 8), 0.18, -0.4, z), mainBearingCaps);
  }
  rotating.add(mainBearingCaps);

  // ---- pistons (WM 3740): dish crown + 3 ring grooves; pistonsDfi alias group
  const pistons = group('pistons');
  const pistonsDfi = group('pistonsDfi');
  for (const s of [1, -1]) {
    const sk = s > 0 ? 'R' : 'L';
    for (let i = 0; i < 3; i++) {
      const z = (i - 1) * 0.72;
      const px = s * 1.0;
      const py = 0.1;
      // Skirt + crown
      add(rot(at(cyl(`piston_${sk}_${i}`, 0.34, 0.34, 0.32, 'piston', 24), px, py, z), 0, 0, HALF_PI), pistons);
      // Dish crown indent (DFI)
      add(rot(at(cyl(`pistonDish_${sk}_${i}`, 0.18, 0.18, 0.04, 'castDark', 16), px + s * 0.14, py, z), 0, 0, HALF_PI), pistons);
      // Three ring grooves (thin tori around skirt)
      for (let r = 0; r < 3; r++) {
        add(rot(at(torus(`pistonRing_${sk}_${i}_${r}`, 0.345, 0.012, 'steel', 6, 24),
          px + s * (0.08 - r * 0.04), py, z), 0, HALF_PI, 0), pistons);
      }
      add(rot(at(cyl(`pistonPin_${sk}_${i}`, 0.06, 0.06, 0.4, 'steel', 10), px - 0.05, py, z), HALF_PI, 0, 0), pistons);
      // Duplicate representative mesh under pistonsDfi for pin targeting
      add(rot(at(cyl(`pistonDfi_${sk}_${i}`, 0.33, 0.33, 0.3, 'piston', 20), px, py, z), 0, 0, HALF_PI), pistonsDfi);
    }
  }
  // Sub: piston ring sets (named group for pin)
  const pistonRings = group('pistonRings');
  for (const s of [1, -1]) {
    const sk = s > 0 ? 'R' : 'L';
    for (let i = 0; i < 3; i++) {
      const z = (i - 1) * 0.72;
      add(rot(at(torus(`pistonRingSet_${sk}_${i}`, 0.35, 0.015, 'steel', 6, 20), s * 1.08, 0.1, z), 0, HALF_PI, 0), pistonRings);
    }
  }
  pistons.add(pistonRings);
  rotating.add(pistons);
  rotating.add(pistonsDfi);

  // ---- connecting rods (WM 3740): I-beam + big-end cap + bolts + shells
  const conRods = group('conRods');
  const connectingRods = group('connectingRods');
  for (const s of [1, -1]) {
    const sk = s > 0 ? 'R' : 'L';
    for (let i = 0; i < 3; i++) {
      const z = (i - 1) * 0.72;
      const rodX = s * 0.55;
      // I-beam shaft (thin web + flanges)
      add(rot(at(box(`conRodBeam_${sk}_${i}`, 0.5, 0.06, 0.04, 'steel'), rodX, 0.05, z), 0, 0, s * 0.2), conRods);
      add(rot(at(box(`conRodFlange_${sk}_${i}`, 0.48, 0.12, 0.02, 'steel'), rodX, 0.05, z), 0, 0, s * 0.2), conRods);
      // Small end
      add(rot(at(torus(`conRodSmallEnd_${sk}_${i}`, 0.08, 0.035, 'steel', 8, 14), s * 0.9, 0.1, z), 0, HALF_PI, 0), conRods);
      // Big end + cap + shells + bolts
      add(rot(at(torus(`conRodBigEnd_${sk}_${i}`, 0.13, 0.045, 'steel', 8, 16), s * 0.28, 0.0, z), 0, HALF_PI, 0), conRods);
      add(at(box(`conRodCap_${sk}_${i}`, 0.28, 0.1, 0.12, 'castDark'), s * 0.28, -0.12, z), conRods);
      add(rot(at(cylArc(`conRodShell_${sk}_${i}`, 0.12, 0.12, 0.1, 'polished', 12, 0, Math.PI, true), s * 0.28, 0.0, z), HALF_PI, 0, 0), conRods);
      add(at(cyl(`conRodBoltA_${sk}_${i}`, 0.025, 0.025, 0.2, 'bolt', 8), s * 0.2, -0.18, z), conRods);
      add(at(cyl(`conRodBoltB_${sk}_${i}`, 0.025, 0.025, 0.2, 'bolt', 8), s * 0.36, -0.18, z), conRods);
      // Alias meshes
      add(rot(at(box(`connectingRod_${sk}_${i}`, 0.48, 0.1, 0.06, 'steel'), rodX, 0.05, z), 0, 0, s * 0.2), connectingRods);
    }
  }
  // Sub: con-rod bearing shells
  const conRodBearings = group('conRodBearings');
  for (const s of [1, -1]) {
    const sk = s > 0 ? 'R' : 'L';
    for (let i = 0; i < 3; i++) {
      const z = (i - 1) * 0.72;
      add(rot(at(cylArc(`conRodBearing_${sk}_${i}`, 0.125, 0.125, 0.08, 'polished', 10, 0, Math.PI, true), s * 0.28, 0.0, z), HALF_PI, 0, 0), conRodBearings);
    }
  }
  connectingRods.add(conRodBearings);
  rotating.add(conRods);
  rotating.add(connectingRods);

  // ---- intermediate shaft (IMS): parallel to crank, slightly offset, front sprocket
  const intermediateShaft = group('intermediateShaft');
  add(rot(at(cyl('imsShaft', 0.1, 0.1, 1.6, 'steel', 14), 0, 0.35, 0.2), HALF_PI, 0, 0), intermediateShaft);
  add(rot(at(cyl('imsSprocket', 0.16, 0.16, 0.08, 'steel', 20), 0, 0.35, 1.0), HALF_PI, 0, 0), intermediateShaft);
  add(rot(at(cyl('imsRearBearing', 0.12, 0.12, 0.1, 'castDark', 12), 0, 0.35, -0.55), HALF_PI, 0, 0), intermediateShaft);
  const imsBearing = group('imsBearing');
  add(rot(at(cyl('imsBearingRace', 0.13, 0.13, 0.12, 'polished', 14), 0, 0.35, 0.85), HALF_PI, 0, 0), imsBearing);
  add(rot(at(torus('imsBearingSeal', 0.12, 0.02, 'damper', 6, 16), 0, 0.35, 0.85), HALF_PI, 0, 0), imsBearing);
  intermediateShaft.add(imsBearing);
  rotating.add(intermediateShaft);

  // ---- crank pulley / vibration damper
  const crankPulleyG = group('crankPulley');
  const FZ = 1.32;
  const crankC = [0, -0.5];
  const pulley = lathe('crankPulleyDisc', [
    [0.16, -0.16], [0.16, -0.12], [0.5, -0.12], [0.5, -0.06],
    [0.46, -0.02], [0.5, 0.02], [0.46, 0.06], [0.5, 0.1],
    [0.5, 0.13], [0.16, 0.13], [0.16, 0.16],
  ], 'polished', 36);
  add(rot(at(pulley, crankC[0], crankC[1], FZ), HALF_PI, 0, 0), crankPulleyG);
  add(rot(at(torus('crankDamperRing', 0.42, 0.07, 'damper', 12, 40), crankC[0], crankC[1], FZ), 0, 0, 0), crankPulleyG);
  add(rot(at(cyl('crankHubCap', 0.18, 0.18, 0.2, 'polished', 20), crankC[0], crankC[1], FZ + 0.05), HALF_PI, 0, 0), crankPulleyG);
  for (let b = 0; b < 8; b++) {
    const a = (b / 8) * Math.PI * 2;
    add(rot(at(cyl(`crankBolt_${b}`, 0.035, 0.035, 0.1, 'bolt', 8),
      crankC[0] + Math.cos(a) * 0.28, crankC[1] + Math.sin(a) * 0.28, FZ + 0.16), HALF_PI, 0, 0), crankPulleyG);
  }
  // Sub: harmonic balancer alias (same damper ring region)
  const harmonicBalancer = group('harmonicBalancer');
  add(rot(at(torus('harmonicBalancerRing', 0.4, 0.06, 'damper', 10, 36), crankC[0], crankC[1], FZ), 0, 0, 0), harmonicBalancer);
  add(rot(at(cyl('harmonicBalancerHub', 0.16, 0.16, 0.12, 'polished', 16), crankC[0], crankC[1], FZ), HALF_PI, 0, 0), harmonicBalancer);
  crankPulleyG.add(harmonicBalancer);
  rotating.add(crankPulleyG);

  // ---- flywheel + flexPlate (PDK adapter disc near flywheel)
  const flywheel = group('flywheel');
  add(rot(at(cyl('flywheelDisc', 0.78, 0.78, 0.16, 'steel', 36), 0, 0, -1.18), HALF_PI, 0, 0), flywheel);
  add(rot(at(torus('flywheelRingGear', 0.8, 0.06, 'cast', 12, 48), 0, 0, -1.18), 0, 0, 0), flywheel);
  add(rot(at(cyl('flywheelHub', 0.2, 0.2, 0.22, 'castDark', 18), 0, 0, -1.12), HALF_PI, 0, 0), flywheel);
  rotating.add(flywheel);

  const flexPlate = group('flexPlate');
  add(rot(at(cyl('flexPlateDisc', 0.72, 0.72, 0.04, 'steel', 32), 0, 0, -1.28), HALF_PI, 0, 0), flexPlate);
  add(rot(at(cyl('flexPlateHub', 0.18, 0.18, 0.08, 'castDark', 16), 0, 0, -1.28), HALF_PI, 0, 0), flexPlate);
  for (let b = 0; b < 8; b++) {
    const a = (b / 8) * Math.PI * 2;
    add(at(cyl(`flexPlateBolt_${b}`, 0.03, 0.03, 0.06, 'bolt', 6),
      Math.cos(a) * 0.55, Math.sin(a) * 0.55, -1.28), flexPlate);
  }
  rotating.add(flexPlate);

  engine.add(rotating);

  // ====================================================================
  // VALVETRAIN — covers, per-bank cams (WM 3871/3872), valves, tappets,
  // solenoids (WM 3911), timing chains (primary/secondary), covers
  // ====================================================================
  const valvetrain = group('valvetrain');

  function makeCamCover(dir, side) {
    const cover = group(`camCover_${side}`);
    add(at(roundBox(`camCoverBody_${side}`, 1.0, 0.55, 2.2, 'cover'), dir * 1.7, 0.62, 0), cover);
    add(at(roundBox(`camCoverCrown_${side}`, 0.66, 0.2, 2.12, 'cover'), dir * 1.7, 0.95, 0), cover);
    for (let r = 0; r < 4; r++) {
      add(at(box(`camRib_${side}_${r}`, 0.9, 0.05, 2.14, 'cover'), dir * 1.7, 0.85 - r * 0.12, 0), cover);
    }
    for (const zz of [-0.95, -0.32, 0.32, 0.95]) {
      add(rot(at(cyl(`camBolt_${side}_${zz}`, 0.06, 0.06, 0.14, 'bolt', 10), dir * 2.2, 0.62, zz), 0, 0, HALF_PI), cover);
    }
    valvetrain.add(cover);
  }
  makeCamCover(1, 'R');
  makeCamCover(-1, 'L');

  // Sub: valve cover gaskets L/R
  const valveCoverGasketL = group('valveCoverGasketL');
  add(at(box('valveCoverGasketLRing', 0.95, 0.03, 2.15, 'damper'), -1.7, 0.38, 0), valveCoverGasketL);
  valvetrain.add(valveCoverGasketL);
  const valveCoverGasketR = group('valveCoverGasketR');
  add(at(box('valveCoverGasketRRing', 0.95, 0.03, 2.15, 'damper'), 1.7, 0.38, 0), valveCoverGasketR);
  valvetrain.add(valveCoverGasketR);

  // ---- camshafts: keep camshaft_intake / camshaft_exhaust assemblies AND
  // per-bank PRIMARY groups intakeCamBank1/2, exhaustCamBank1/2
  const camIntake = group('camshaft_intake');
  const camExhaust = group('camshaft_exhaust');
  const intakeCamBank1 = group('intakeCamBank1');
  const exhaustCamBank1 = group('exhaustCamBank1');
  const intakeCamBank2 = group('intakeCamBank2');
  const exhaustCamBank2 = group('exhaustCamBank2');
  const camPhasers = group('camPhasers');
  const camBearingCaps = group('camBearingCaps');

  function makeCamBank(dir, bank, intakeParent, exhaustParent, intakeAsm, exhaustAsm) {
    const ix = dir * 1.7;
    const iy = 0.67;
    const ey = 0.5;
    // Intake shaft + lobes
    add(rot(at(cyl(`intakeCamShaft_B${bank}`, 0.07, 0.07, 2.1, 'steel', 14), ix, iy, 0), HALF_PI, 0, 0), intakeParent);
    add(rot(at(cyl(`camIntake_asm_B${bank}`, 0.065, 0.065, 2.05, 'steel', 12), ix, iy, 0), HALF_PI, 0, 0), intakeAsm);
    for (let i = 0; i < 6; i++) {
      const z = -0.9 + i * 0.36;
      add(rot(at(cyl(`intakeCamLobe_B${bank}_${i}`, 0.11, 0.11, 0.07, 'steel', 12), ix, iy, z), HALF_PI, 0, 0), intakeParent);
    }
    // Exhaust shaft + lobes
    add(rot(at(cyl(`exhaustCamShaft_B${bank}`, 0.07, 0.07, 2.1, 'steel', 14), ix, ey, 0), HALF_PI, 0, 0), exhaustParent);
    add(rot(at(cyl(`camExhaust_asm_B${bank}`, 0.065, 0.065, 2.05, 'steel', 12), ix, ey, 0), HALF_PI, 0, 0), exhaustAsm);
    for (let i = 0; i < 6; i++) {
      const z = -0.9 + i * 0.36;
      add(rot(at(cyl(`exhaustCamLobe_B${bank}_${i}`, 0.11, 0.11, 0.07, 'steel', 12), ix, ey, z), HALF_PI, 0, 0), exhaustParent);
    }
    // Intake cam phaser (large controller disc at +Z) — WM 3872
    add(rot(at(cyl(`camPhaser_B${bank}`, 0.2, 0.2, 0.16, 'cast', 24), ix, iy, 1.12), HALF_PI, 0, 0), camPhasers);
    add(rot(at(cyl(`camPhaserTeeth_B${bank}`, 0.22, 0.22, 0.05, 'steel', 28), ix, iy, 1.2), HALF_PI, 0, 0), camPhasers);
    add(rot(at(cyl(`camPhaserScrew_B${bank}`, 0.04, 0.04, 0.22, 'bolt', 8), ix, iy, 1.28), HALF_PI, 0, 0), camPhasers);
    add(rot(at(torus(`camPhaserFriction_B${bank}`, 0.15, 0.02, 'castDark', 8, 20), ix, iy, 1.05), HALF_PI, 0, 0), camPhasers);
    // Exhaust sprocket (simpler, thinner)
    add(rot(at(cyl(`exhSprocket_B${bank}`, 0.16, 0.16, 0.07, 'steel', 22), ix, ey, 1.12), HALF_PI, 0, 0), exhaustParent);
    add(rot(at(cyl(`exhSprocketScrew_B${bank}`, 0.035, 0.035, 0.12, 'bolt', 8), ix, ey, 1.2), HALF_PI, 0, 0), exhaustParent);
    // Cam bearing caps / saddles along cams (WM 3871)
    for (let c = 0; c < 4; c++) {
      const z = -0.85 + c * 0.55;
      add(at(box(`camCapIn_B${bank}_${c}`, 0.22, 0.1, 0.14, 'cast'), ix, iy + 0.12, z), camBearingCaps);
      add(at(box(`camCapEx_B${bank}_${c}`, 0.22, 0.1, 0.14, 'cast'), ix, ey + 0.12, z), camBearingCaps);
    }
    // Front bridge saddle
    add(at(box(`camFrontSaddle_B${bank}`, 0.45, 0.14, 0.2, 'cast'), ix, 0.62, 1.0), camBearingCaps);
  }
  makeCamBank(1, 1, intakeCamBank1, exhaustCamBank1, camIntake, camExhaust);
  makeCamBank(-1, 2, intakeCamBank2, exhaustCamBank2, camIntake, camExhaust);
  valvetrain.add(camIntake);
  valvetrain.add(camExhaust);
  valvetrain.add(intakeCamBank1);
  valvetrain.add(exhaustCamBank1);
  valvetrain.add(intakeCamBank2);
  valvetrain.add(exhaustCamBank2);
  valvetrain.add(camPhasers);
  valvetrain.add(camBearingCaps);

  // ---- valves + springs + hydraulic tappets (cutaway bank shows more detail)
  const intakeValves = group('intakeValves');
  const exhaustValves = group('exhaustValves');
  const hydraulicTappets = group('hydraulicTappets');
  const valveSprings = group('valveSprings');

  for (const s of [1, -1]) {
    const bank = s > 0 ? 1 : 2;
    for (let i = 0; i < 3; i++) {
      const z = (i - 1) * 0.72;
      // Two intake + two exhaust valves per cylinder (representative)
      for (const v of [0, 1]) {
        const zOff = (v - 0.5) * 0.18;
        const ix = s * 1.55;
        const ex = s * 1.85;
        // Intake valve stem + head
        add(rot(at(cyl(`intakeValveStem_B${bank}_${i}_${v}`, 0.025, 0.025, 0.45, 'steel', 8), ix, 0.25, z + zOff), 0, 0, HALF_PI * 0.15 * s), intakeValves);
        add(rot(at(cyl(`intakeValveHead_B${bank}_${i}_${v}`, 0.08, 0.02, 0.04, 'polished', 12), ix - s * 0.2, 0.05, z + zOff), 0, 0, HALF_PI), intakeValves);
        // Exhaust valve
        add(rot(at(cyl(`exhaustValveStem_B${bank}_${i}_${v}`, 0.022, 0.022, 0.42, 'steel', 8), ex, 0.2, z + zOff), 0, 0, -HALF_PI * 0.15 * s), exhaustValves);
        add(rot(at(cyl(`exhaustValveHead_B${bank}_${i}_${v}`, 0.07, 0.02, 0.035, 'polished', 12), ex - s * 0.15, 0.0, z + zOff), 0, 0, HALF_PI), exhaustValves);
        // Switching tappet (intake, larger) + bucket (exhaust) — WM 3931
        add(at(cyl(`tappetSwitch_B${bank}_${i}_${v}`, 0.07, 0.07, 0.1, 'cast', 12), ix, 0.55, z + zOff), hydraulicTappets);
        add(at(cyl(`tappetBucket_B${bank}_${i}_${v}`, 0.055, 0.055, 0.09, 'castDark', 12), ex, 0.48, z + zOff), hydraulicTappets);
        // Valve springs (torus stack)
        add(rot(at(torus(`valveSpringIn_B${bank}_${i}_${v}`, 0.05, 0.012, 'steel', 6, 16), ix, 0.4, z + zOff), HALF_PI, 0, 0), valveSprings);
        add(rot(at(torus(`valveSpringEx_B${bank}_${i}_${v}`, 0.045, 0.01, 'steel', 6, 14), ex, 0.35, z + zOff), HALF_PI, 0, 0), valveSprings);
      }
    }
  }
  valvetrain.add(intakeValves);
  valvetrain.add(exhaustValves);
  valvetrain.add(hydraulicTappets);
  valvetrain.add(valveSprings);

  // Sub: valve stem seals
  const valveStemSeals = group('valveStemSeals');
  for (const s of [1, -1]) {
    const bank = s > 0 ? 1 : 2;
    for (let i = 0; i < 3; i++) {
      const z = (i - 1) * 0.72;
      for (const v of [0, 1]) {
        const zOff = (v - 0.5) * 0.18;
        add(rot(at(torus(`valveStemSealIn_B${bank}_${i}_${v}`, 0.03, 0.01, 'damper', 6, 12), s * 1.55, 0.3, z + zOff), HALF_PI, 0, 0), valveStemSeals);
        add(rot(at(torus(`valveStemSealEx_B${bank}_${i}_${v}`, 0.028, 0.01, 'damper', 6, 12), s * 1.85, 0.25, z + zOff), HALF_PI, 0, 0), valveStemSeals);
      }
    }
  }
  valvetrain.add(valveStemSeals);

  // ---- VarioCam solenoids (WM 3911): cam-control on TOP; lift on SIDE
  // Bank1 = +X (R), Bank2 = -X (L)
  function makeVanosSolenoid(name, x, y, z) {
    const g = group(name);
    add(at(cyl(`${name}_body`, 0.07, 0.07, 0.32, 'cover', 14), x, y, z), g);
    add(at(cyl(`${name}_rib`, 0.08, 0.08, 0.06, 'castDark', 12), x, y + 0.08, z), g);
    add(at(box(`${name}_conn`, 0.08, 0.1, 0.1, 'damper'), x, y + 0.2, z), g);
    return g;
  }
  valvetrain.add(makeVanosSolenoid('vanosSolenoidB1Intake', 1.55, 0.95, 0.35));
  valvetrain.add(makeVanosSolenoid('vanosSolenoidB1Exhaust', 1.85, 0.95, 0.35));
  valvetrain.add(makeVanosSolenoid('vanosSolenoidB2Intake', -1.55, 0.95, 0.35));
  valvetrain.add(makeVanosSolenoid('vanosSolenoidB2Exhaust', -1.85, 0.95, 0.35));

  // Lift actuators — shorter/wider on SIDE of heads
  const variocamLiftActuators = group('variocamLiftActuators');
  for (const s of [1, -1]) {
    const sk = s > 0 ? 'B1' : 'B2';
    for (let i = 0; i < 3; i++) {
      const z = (i - 1) * 0.72;
      add(rot(at(cyl(`liftActuator_${sk}_${i}`, 0.1, 0.1, 0.22, 'cover', 14), s * 2.15, 0.45, z), 0, 0, HALF_PI), variocamLiftActuators);
      add(rot(at(cyl(`liftActuatorFlange_${sk}_${i}`, 0.12, 0.12, 0.04, 'castDark', 12), s * 2.05, 0.45, z), 0, 0, HALF_PI), variocamLiftActuators);
    }
  }
  valvetrain.add(variocamLiftActuators);

  // Keep legacy varioCamActuator for any old refs
  const varioCam = group('varioCamActuator');
  for (const s of [1, -1]) {
    const sk = s > 0 ? 'R' : 'L';
    add(rot(at(cyl(`varioCamSolenoid_${sk}`, 0.13, 0.13, 0.32, 'cover', 16), s * 1.7, 0.7, 1.15), HALF_PI, 0, 0), varioCam);
    add(rot(at(cyl(`varioCamConnector_${sk}`, 0.07, 0.07, 0.14, 'damper', 10), s * 1.7, 0.9, 1.18), HALF_PI, 0, 0), varioCam);
  }
  valvetrain.add(varioCam);

  // ---- cam position sensors near cam front ends
  const camPositionSensors = group('camPositionSensors');
  for (const s of [1, -1]) {
    const sk = s > 0 ? 'B1' : 'B2';
    add(at(box(`camPosSensorIn_${sk}`, 0.1, 0.12, 0.14, 'cover'), s * 1.7, 0.85, 1.25), camPositionSensors);
    add(at(box(`camPosSensorEx_${sk}`, 0.1, 0.12, 0.14, 'cover'), s * 1.7, 0.55, 1.25), camPositionSensors);
    add(at(cyl(`camPosSensorTipIn_${sk}`, 0.03, 0.03, 0.08, 'steel', 8), s * 1.7, 0.78, 1.18), camPositionSensors);
    add(at(cyl(`camPosSensorTipEx_${sk}`, 0.03, 0.03, 0.08, 'steel', 8), s * 1.7, 0.48, 1.18), camPositionSensors);
  }
  valvetrain.add(camPositionSensors);

  // ---- timing: keep timingChain parent; add primary/secondary/tensioners/guides/covers
  const timing = group('timingChain');
  add(rot(at(cyl('crankSprocket', 0.18, 0.18, 0.08, 'steel', 24), 0, 0, 1.0), HALF_PI, 0, 0), timing);
  for (const s of [1, -1]) {
    const sk = s > 0 ? 'R' : 'L';
    add(rot(at(cyl(`camSprocket_${sk}`, 0.16, 0.16, 0.08, 'steel', 24), s * 1.7, 0.6, 1.0), HALF_PI, 0, 0), timing);
  }

  // Primary: crank ↔ IMS (lower loop)
  const primaryTimingChain = group('primaryTimingChain');
  add(tube('primaryChainLoop', [
    [0, 0.18, 1.05], [0.15, 0.28, 1.05], [0, 0.42, 1.05],
    [-0.15, 0.28, 1.05], [0, 0.0, 1.05], [0, -0.1, 1.05],
  ], 0.03, 'damper', 40, 8, true), primaryTimingChain);
  add(rot(at(cyl('primaryChainSprocketCrank', 0.14, 0.14, 0.05, 'steel', 18), 0, 0, 1.08), HALF_PI, 0, 0), primaryTimingChain);
  timing.add(primaryTimingChain);

  // Secondary: IMS ↔ cams L/R
  const secondaryTimingChains = group('secondaryTimingChains');
  for (const s of [1, -1]) {
    const sk = s > 0 ? 'R' : 'L';
    add(tube(`secondaryChainLoop_${sk}`, [
      [0, 0.35, 1.05], [s * 0.6, 0.45, 1.05], [s * 1.7, 0.76, 1.05],
      [s * 1.86, 0.6, 1.05], [s * 1.7, 0.44, 1.05], [s * 0.5, 0.2, 1.05],
      [0, 0.15, 1.05],
    ], 0.032, 'damper', 50, 8, true), secondaryTimingChains);
  }
  timing.add(secondaryTimingChains);

  // Sub: cam sprockets (named for pin)
  const timingChainSprocketCam = group('timingChainSprocketCam');
  for (const s of [1, -1]) {
    const sk = s > 0 ? 'B1' : 'B2';
    add(rot(at(cyl(`camSprocketNamedIn_${sk}`, 0.15, 0.15, 0.06, 'steel', 20), s * 1.7, 0.67, 1.1), HALF_PI, 0, 0), timingChainSprocketCam);
    add(rot(at(cyl(`camSprocketNamedEx_${sk}`, 0.14, 0.14, 0.05, 'steel', 18), s * 1.7, 0.5, 1.1), HALF_PI, 0, 0), timingChainSprocketCam);
  }
  secondaryTimingChains.add(timingChainSprocketCam);

  // Legacy closed loops (visual continuity)
  for (const s of [1, -1]) {
    const sk = s > 0 ? 'R' : 'L';
    add(tube(`timingChainLoop_${sk}`, [
      [0, 0.18, 1.05], [s * 0.6, 0.4, 1.05], [s * 1.7, 0.76, 1.05],
      [s * 1.86, 0.6, 1.05], [s * 1.7, 0.44, 1.05], [s * 0.5, 0.0, 1.05],
      [0, -0.18, 1.05], [0, 0.0, 1.05],
    ], 0.028, 'belt', 60, 8, true), timing);
  }

  const chainTensioners = group('chainTensioners');
  const tensioner = group('timingChainTensioner');
  for (const s of [1, -1]) {
    const sk = s > 0 ? 'R' : 'L';
    add(rot(at(cyl(`chainTensionerBody_${sk}`, 0.09, 0.09, 0.34, 'cast', 14), s * 0.95, 0.3, 1.05), 0, 0, s * 0.5), tensioner);
    add(rot(at(box(`chainTensionerShoe_${sk}`, 0.5, 0.06, 0.08, 'cover'), s * 1.1, 0.45, 1.05), 0, 0, s * 0.6), tensioner);
    add(rot(at(cyl(`chainTensionerPrim_${sk}`, 0.08, 0.08, 0.28, 'cast', 12), s * 0.7, 0.15, 1.08), 0, 0, s * 0.4), chainTensioners);
    add(rot(at(box(`chainTensionerShoePrim_${sk}`, 0.4, 0.05, 0.07, 'cover'), s * 0.85, 0.28, 1.08), 0, 0, s * 0.5), chainTensioners);
  }
  // Third (lower/primary) tensioner
  add(at(cyl('chainTensionerLower', 0.08, 0.08, 0.25, 'cast', 12), 0.35, -0.05, 1.05), chainTensioners);
  timing.add(tensioner);
  timing.add(chainTensioners);

  const chainGuides = group('chainGuides');
  for (const s of [1, -1]) {
    const sk = s > 0 ? 'R' : 'L';
    add(rot(at(box(`chainGuideRail_${sk}`, 0.7, 0.05, 0.08, 'cover'), s * 1.0, 0.55, 1.02), 0, 0, s * 0.35), chainGuides);
    add(rot(at(box(`chainGuideFixed_${sk}`, 0.55, 0.04, 0.07, 'castDark'), s * 1.2, 0.35, 1.0), 0, 0, s * 0.55), chainGuides);
  }
  add(at(box('chainGuidePrimary', 0.35, 0.04, 0.07, 'cover'), 0.2, 0.2, 1.0), chainGuides);
  timing.add(chainGuides);

  const timingChainCovers = group('timingChainCovers');
  for (const s of [1, -1]) {
    const sk = s > 0 ? 'B1' : 'B2';
    add(at(roundBox(`timingChainCover_${sk}`, 0.55, 0.85, 0.2, 'cover'), s * 1.5, 0.45, 1.25), timingChainCovers);
    add(at(box(`timingChainCoverRib_${sk}`, 0.5, 0.05, 0.18, 'castDark'), s * 1.5, 0.7, 1.25), timingChainCovers);
  }
  timing.add(timingChainCovers);

  valvetrain.add(timing);
  engine.add(valvetrain);

  // ====================================================================
  // INDUCTION
  // ====================================================================
  const induction = group('induction');

  const intakeManifold = group('intakeManifold');
  add(at(roundBox('plenumBox', 0.95, 0.7, 0.95, 'plenum'), 0, 1.85, 0.1), intakeManifold);
  add(at(roundBox('plenumBoxLid', 0.8, 0.16, 0.8, 'plenum'), 0, 2.22, 0.1), intakeManifold);
  for (const s of [1, -1]) {
    const sk = s > 0 ? 'R' : 'L';
    add(tube(`intakeTube_${sk}`, [
      [s * 0.42, 1.95, 0.1], [s * 0.85, 1.95, 0.1], [s * 1.25, 1.78, 0.1],
      [s * 1.5, 1.5, 0.05], [s * 1.62, 1.2, 0.0],
    ], 0.26, 'plenum', 36, 22), intakeManifold);
    add(rot(at(torus(`tubeClampInner_${sk}`, 0.28, 0.045, 'polished', 10, 28), s * 0.5, 1.95, 0.1), 0, 0, HALF_PI), intakeManifold);
    add(rot(at(torus(`tubeClampOuter_${sk}`, 0.28, 0.045, 'polished', 10, 28), s * 1.6, 1.25, 0.0), 0.5, 0, HALF_PI), intakeManifold);
    add(at(roundBox(`plenumCap_${sk}`, 0.55, 0.85, 2.0, 'plenum'), s * 1.78, 0.95, 0.0), intakeManifold);
    add(at(roundBox(`plenumCapCrown_${sk}`, 0.3, 0.2, 1.7, 'plenum'), s * 1.78, 1.45, 0.0), intakeManifold);
    add(rot(at(box(`porschePlate_${sk}`, 1.5, 0.04, 0.34, 'polished'), s * 2.07, 0.95, 0.0), 0, HALF_PI, 0), intakeManifold);
    for (let i = 0; i < 3; i++) {
      const z = (i - 1) * 0.72;
      add(tube(`runner_${sk}_${i}`, [
        [s * 1.78, 0.55, z], [s * 1.8, 0.35, z], [s * 1.82, 0.12, z],
      ], 0.11, 'plenum', 16, 14), intakeManifold);
      add(rot(at(torus(`runnerClamp_${sk}_${i}`, 0.13, 0.03, 'polished', 8, 20), s * 1.81, 0.18, z), 0, 0, HALF_PI), intakeManifold);
    }
  }
  induction.add(intakeManifold);

  const throttleBody = group('throttleBody');
  add(rot(at(cyl('throttleBodyBore', 0.3, 0.3, 0.6, 'cast', 24), 0, 1.85, -0.55), HALF_PI, 0, 0), throttleBody);
  add(rot(at(torus('throttleClamp', 0.32, 0.04, 'polished', 10, 28), 0, 1.85, -0.28), HALF_PI, 0, 0), throttleBody);
  add(rot(at(cyl('throttleMotor', 0.12, 0.12, 0.22, 'cover', 14), 0.32, 1.85, -0.55), 0, 0, HALF_PI), throttleBody);
  induction.add(throttleBody);

  // Dual-track TPS on throttle body
  const throttlePositionSensors = group('throttlePositionSensors');
  add(at(box('tpsBody', 0.12, 0.1, 0.14, 'cover'), 0.42, 1.95, -0.55), throttlePositionSensors);
  add(at(box('tpsConnector', 0.08, 0.08, 0.1, 'damper'), 0.42, 2.08, -0.55), throttlePositionSensors);
  induction.add(throttlePositionSensors);

  const mafSensor = group('mafSensor');
  add(tube('intakeSnorkel', [
    [0, 1.85, -0.85], [0, 2.05, -1.2], [0.25, 2.2, -1.45], [0.7, 2.25, -1.5],
  ], 0.24, 'plenum', 24, 18), mafSensor);
  add(rot(at(cyl('mafBody', 0.26, 0.26, 0.34, 'cast', 20), 0.45, 2.23, -1.48), 0, 0.5, HALF_PI), mafSensor);
  add(rot(at(box('mafConnector', 0.1, 0.12, 0.14, 'damper'), 0.45, 2.42, -1.48), 0, 0, 0), mafSensor);
  induction.add(mafSensor);

  // MAP on plenum (distinct from MAF)
  const mapSensor = group('mapSensor');
  add(at(box('mapSensorBody', 0.12, 0.1, 0.14, 'cover'), 0.35, 2.15, 0.35), mapSensor);
  add(at(cyl('mapSensorNipple', 0.03, 0.03, 0.08, 'hose2', 8), 0.35, 2.05, 0.35), mapSensor);
  induction.add(mapSensor);

  const aos = group('airOilSeparator');
  add(at(capsule('aosCanister', 0.22, 0.4, 'cover', 18), -1.6, 0.55, -0.7), aos);
  add(tube('aosHose', [
    [-1.6, 0.85, -0.7], [-1.4, 1.1, -0.4], [-0.9, 1.2, 0.0], [-0.3, 1.4, 0.2],
  ], 0.07, 'hose2', 20, 10), aos);
  induction.add(aos);

  // Sub: crankcase oil separator (near AOS)
  const oilSeparatorCrankcase = group('oilSeparatorCrankcase');
  add(at(capsule('oilSeparatorCrankcaseCan', 0.18, 0.3, 'cast', 14), -1.4, 0.35, -0.5), oilSeparatorCrankcase);
  add(tube('oilSeparatorCrankcaseHose', [
    [-1.4, 0.55, -0.5], [-1.2, 0.7, -0.3], [-0.8, 0.85, 0.0],
  ], 0.05, 'hose2', 16, 8), oilSeparatorCrankcase);
  induction.add(oilSeparatorCrankcase);

  // Sub: air filter element + housing (near MAF snorkel for inspectability)
  const airFilterHousing = group('airFilterHousing');
  add(at(roundBox('airFilterHousingBody', 0.7, 0.35, 0.5, 'plenum'), 1.1, 2.15, -1.3), airFilterHousing);
  induction.add(airFilterHousing);
  const airFilterElement = group('airFilterElement');
  add(at(box('airFilterMedia', 0.55, 0.2, 0.35, 'paper'), 1.1, 2.15, -1.3), airFilterElement);
  for (let i = 0; i < 5; i++) {
    add(at(box(`airFilterPleat_${i}`, 0.5, 0.18, 0.02, 'paper'), 1.1, 2.15, -1.42 + i * 0.06), airFilterElement);
  }
  induction.add(airFilterElement);

  // Sub: intake air bypass / resonance flap actuator on plenum
  const intakeAirBypassActuator = group('intakeAirBypassActuator');
  add(at(cyl('intakeBypassActuatorBody', 0.08, 0.08, 0.2, 'cover', 12), 0.4, 1.7, 0.4), intakeAirBypassActuator);
  add(at(box('intakeBypassActuatorConn', 0.08, 0.08, 0.1, 'damper'), 0.4, 1.85, 0.4), intakeAirBypassActuator);
  induction.add(intakeAirBypassActuator);

  engine.add(induction);

  // ====================================================================
  // FUEL & IGNITION
  // ====================================================================
  const fuelIgnition = group('fuelIgnition');

  const fuelRail = group('fuelRail');
  for (const s of [1, -1]) {
    const sk = s > 0 ? 'R' : 'L';
    add(rot(at(cyl(`fuelRailTube_${sk}`, 0.06, 0.06, 2.0, 'polished', 14), s * 1.5, 0.45, 0), HALF_PI, 0, 0), fuelRail);
  }
  add(tube('fuelFeedLine', [
    [1.5, 0.45, -1.0], [0.9, 0.7, -1.1], [0, 0.8, -1.0], [-1.5, 0.45, -1.0],
  ], 0.04, 'polished', 30, 10), fuelRail);
  fuelIgnition.add(fuelRail);

  // DI injectors (existing)
  const injectors = group('injectors');
  for (const s of [1, -1]) {
    const sk = s > 0 ? 'R' : 'L';
    for (let i = 0; i < 3; i++) {
      const z = (i - 1) * 0.72;
      add(rot(at(cyl(`injector_${sk}_${i}`, 0.05, 0.04, 0.3, 'cover', 12), s * 1.5, 0.25, z), 0, 0, 0), injectors);
      add(rot(at(cyl(`injectorConnector_${sk}_${i}`, 0.06, 0.06, 0.1, 'damper', 8), s * 1.5, 0.42, z), 0, 0, 0), injectors);
    }
  }
  fuelIgnition.add(injectors);

  // Port injectors — stubs near intake ports (distinct from DI)
  const portInjectors = group('portInjectors');
  for (const s of [1, -1]) {
    const sk = s > 0 ? 'R' : 'L';
    for (let i = 0; i < 3; i++) {
      const z = (i - 1) * 0.72;
      add(rot(at(cyl(`portInjector_${sk}_${i}`, 0.04, 0.035, 0.22, 'cast', 10), s * 1.9, 0.4, z), 0, 0, HALF_PI * 0.3 * s), portInjectors);
      add(at(box(`portInjectorConn_${sk}_${i}`, 0.06, 0.07, 0.08, 'damper'), s * 2.0, 0.5, z), portInjectors);
    }
  }
  fuelIgnition.add(portInjectors);

  // High-pressure fuel pump (DFI) — cam-driven on Bank1 head front
  const highPressureFuelPump = group('highPressureFuelPump');
  add(at(roundBox('hpfpBody', 0.28, 0.32, 0.35, 'cast'), 1.55, 0.85, 0.95), highPressureFuelPump);
  add(rot(at(cyl('hpfpCamFollower', 0.08, 0.08, 0.15, 'steel', 12), 1.55, 0.7, 0.95), HALF_PI, 0, 0), highPressureFuelPump);
  add(at(cyl('hpfpOutlet', 0.04, 0.04, 0.12, 'polished', 8), 1.55, 1.05, 0.95), highPressureFuelPump);
  add(at(box('hpfpConnector', 0.1, 0.08, 0.1, 'damper'), 1.7, 0.95, 0.95), highPressureFuelPump);
  fuelIgnition.add(highPressureFuelPump);

  // Sub: low-pressure fuel line, HP pressure sensor, low-side regulator
  const fuelLineLow = group('fuelLineLow');
  add(tube('fuelLineLowRun', [
    [1.55, 0.85, 0.95], [1.2, 0.9, 0.5], [0.6, 1.0, 0.0], [0, 1.1, -0.5], [-0.5, 1.0, -1.0],
  ], 0.035, 'hose2', 28, 8), fuelLineLow);
  highPressureFuelPump.add(fuelLineLow);
  const fuelPressureSensorHP = group('fuelPressureSensorHP');
  add(at(cyl('fuelPressureSensorHPBody', 0.045, 0.045, 0.1, 'steel', 10), 1.7, 1.0, 0.95), fuelPressureSensorHP);
  add(at(box('fuelPressureSensorHPConn', 0.06, 0.07, 0.07, 'damper'), 1.7, 1.1, 0.95), fuelPressureSensorHP);
  highPressureFuelPump.add(fuelPressureSensorHP);
  const fuelPressureRegLow = group('fuelPressureRegLow');
  add(at(cyl('fuelPressureRegLowBody', 0.07, 0.07, 0.12, 'cast', 12), 1.35, 0.95, 0.75), fuelPressureRegLow);
  add(at(cyl('fuelPressureRegLowCap', 0.05, 0.05, 0.06, 'castDark', 10), 1.35, 1.05, 0.75), fuelPressureRegLow);
  highPressureFuelPump.add(fuelPressureRegLow);

  const coilPacks = group('coilPacks');
  for (const s of [1, -1]) {
    const sk = s > 0 ? 'R' : 'L';
    for (let i = 0; i < 3; i++) {
      const z = (i - 1) * 0.72;
      add(at(capsule(`coilPack_${sk}_${i}`, 0.16, 0.3, 'cover', 14), s * 1.7, 1.12, z), coilPacks);
      add(at(box(`coilConnector_${sk}_${i}`, 0.13, 0.12, 0.16, 'damper'), s * 1.7, 1.34, z), coilPacks);
    }
  }
  fuelIgnition.add(coilPacks);

  const sparkPlugs = group('sparkPlugs');
  for (const s of [1, -1]) {
    const sk = s > 0 ? 'R' : 'L';
    for (let i = 0; i < 3; i++) {
      const z = (i - 1) * 0.72;
      add(at(cyl(`sparkPlug_${sk}_${i}`, 0.045, 0.045, 0.34, 'steel', 10), s * 1.7, 0.78, z), sparkPlugs);
    }
  }
  fuelIgnition.add(sparkPlugs);

  engine.add(fuelIgnition);

  // ====================================================================
  // ACCESSORY DRIVE (+Z face)
  // ====================================================================
  const accessoryDrive = group('accessoryDrive');
  const altC = [0.95, 0.5];
  const wpC = [-0.95, 0.45];
  const acC = [0.2, 1.0];
  const tens1 = [-0.55, -0.15];
  const tens2 = [0.55, 0.05];

  const alternator = group('alternator');
  add(rot(at(cyl('alternatorBody', 0.33, 0.33, 0.66, 'cast', 24), altC[0], altC[1], FZ - 0.18), HALF_PI, 0, 0), alternator);
  add(rot(at(cyl('alternatorEnd', 0.3, 0.35, 0.16, 'castDark', 24), altC[0], altC[1], FZ - 0.5), HALF_PI, 0, 0), alternator);
  for (let r = 0; r < 10; r++) {
    const a = (r / 10) * Math.PI * 2;
    add(rot(at(box(`altFin_${r}`, 0.04, 0.28, 0.02, 'castDark'),
      altC[0] + Math.cos(a) * 0.18, altC[1] + Math.sin(a) * 0.18, FZ - 0.55), 0, 0, a), alternator);
  }
  add(rot(at(cyl('alternatorPulley', 0.2, 0.2, 0.16, 'polished', 18), altC[0], altC[1], FZ + 0.2), HALF_PI, 0, 0), alternator);
  accessoryDrive.add(alternator);

  const acCompressor = group('acCompressor');
  add(rot(at(cyl('acCompressorBody', 0.32, 0.32, 0.5, 'cast', 22), acC[0], acC[1], FZ - 0.15), HALF_PI, 0, 0), acCompressor);
  add(rot(at(cyl('acCompressorClutch', 0.26, 0.26, 0.14, 'castDark', 20), acC[0], acC[1], FZ + 0.18), HALF_PI, 0, 0), acCompressor);
  add(rot(at(cyl('acCompressorPulley', 0.22, 0.22, 0.16, 'polished', 18), acC[0], acC[1], FZ + 0.26), HALF_PI, 0, 0), acCompressor);
  add(rot(at(box('acCompressorPort', 0.16, 0.16, 0.2, 'castDark'), acC[0] + 0.3, acC[1], FZ - 0.15), 0, 0, 0), acCompressor);
  accessoryDrive.add(acCompressor);

  const waterPump = group('waterPump');
  add(rot(at(cyl('waterPumpBody', 0.3, 0.3, 0.3, 'cast', 22), wpC[0], wpC[1], FZ - 0.1), HALF_PI, 0, 0), waterPump);
  add(rot(at(cyl('waterPumpPulley', 0.24, 0.24, 0.16, 'polished', 18), wpC[0], wpC[1], FZ + 0.12), HALF_PI, 0, 0), waterPump);
  add(rot(at(cyl('waterPumpHubBolt', 0.05, 0.05, 0.18, 'bolt', 8), wpC[0], wpC[1], FZ + 0.22), HALF_PI, 0, 0), waterPump);
  accessoryDrive.add(waterPump);

  const tensionerPulley = group('tensionerPulley');
  add(rot(at(cyl('tensionerPulleyWheel', 0.17, 0.17, 0.15, 'damper', 18), tens1[0], tens1[1], FZ + 0.05), HALF_PI, 0, 0), tensionerPulley);
  add(rot(at(box('tensionerArm', 0.5, 0.12, 0.1, 'cast'), -0.3, -0.35, FZ + 0.05), 0, 0, 0.6), tensionerPulley);
  add(rot(at(cyl('tensionerHousing', 0.16, 0.16, 0.2, 'cast', 16), -0.85, -0.55, FZ), HALF_PI, 0, 0), tensionerPulley);
  accessoryDrive.add(tensionerPulley);

  const idlerPulley = group('idlerPulley');
  add(rot(at(cyl('idlerPulleyWheel', 0.15, 0.15, 0.15, 'damper', 18), tens2[0], tens2[1], FZ + 0.05), HALF_PI, 0, 0), idlerPulley);
  add(rot(at(cyl('idlerPulleyBolt', 0.04, 0.04, 0.16, 'bolt', 8), tens2[0], tens2[1], FZ + 0.14), HALF_PI, 0, 0), idlerPulley);
  accessoryDrive.add(idlerPulley);

  const serpentineBelt = group('serpentineBelt');
  add(tube('serpentineBeltRun', [
    [crankC[0], crankC[1] - 0.5, FZ + 0.05],
    [tens2[0] + 0.18, tens2[1] - 0.15, FZ + 0.05],
    [altC[0], altC[1] - 0.22, FZ + 0.05],
    [altC[0] + 0.22, altC[1], FZ + 0.05],
    [acC[0] + 0.24, acC[1] - 0.1, FZ + 0.05],
    [acC[0] - 0.24, acC[1] - 0.1, FZ + 0.05],
    [wpC[0] + 0.26, wpC[1] + 0.1, FZ + 0.05],
    [wpC[0] - 0.05, wpC[1] + 0.26, FZ + 0.05],
    [wpC[0] - 0.26, wpC[1], FZ + 0.05],
    [tens1[0] - 0.18, tens1[1] + 0.1, FZ + 0.05],
    [crankC[0] - 0.5, crankC[1], FZ + 0.05],
  ], 0.05, 'belt', 90, 10, true), serpentineBelt);
  accessoryDrive.add(serpentineBelt);

  engine.add(accessoryDrive);

  // ====================================================================
  // LUBRICATION & COOLING
  // ====================================================================
  const lubeCooling = group('lubeCooling');

  const oilFilterHousing = group('oilFilterHousing');
  add(rot(at(cyl('oilFilterBody', 0.28, 0.28, 0.5, 'cast', 22), 1.25, 0.85, 0.55), 0.4, 0, 0), oilFilterHousing);
  add(rot(at(cyl('oilFilterCap', 0.3, 0.3, 0.12, 'castDark', 22), 1.25, 1.08, 0.65), 0.4, 0, 0), oilFilterHousing);
  for (let r = 0; r < 6; r++) {
    const a = (r / 6) * Math.PI * 2;
    add(at(box(`oilFilterFlute_${r}`, 0.04, 0.12, 0.04, 'castDark'),
      1.25 + Math.cos(a) * 0.28, 1.1, 0.66 + Math.sin(a) * 0.1), oilFilterHousing);
  }
  // Sub: oil filter cartridge insert
  const oilFilterInsert = group('oilFilterInsert');
  add(rot(at(cyl('oilFilterInsertMedia', 0.2, 0.2, 0.35, 'paper', 16), 1.25, 0.85, 0.55), 0.4, 0, 0), oilFilterInsert);
  add(rot(at(cyl('oilFilterInsertCore', 0.08, 0.08, 0.32, 'steel', 10), 1.25, 0.85, 0.55), 0.4, 0, 0), oilFilterInsert);
  oilFilterHousing.add(oilFilterInsert);
  lubeCooling.add(oilFilterHousing);

  // Oil-to-water heat exchanger near oil filter
  const oilHeatExchanger = group('oilHeatExchanger');
  add(at(roundBox('oilHeatExchangerBody', 0.35, 0.28, 0.4, 'cast'), 0.85, 0.55, 0.7), oilHeatExchanger);
  add(rot(at(cyl('oilHeatExchangerPortA', 0.06, 0.06, 0.12, 'polished', 10), 0.85, 0.7, 0.7), 0, 0, 0), oilHeatExchanger);
  add(rot(at(cyl('oilHeatExchangerPortB', 0.05, 0.05, 0.1, 'tank', 10), 1.0, 0.55, 0.7), 0, 0, HALF_PI), oilHeatExchanger);
  lubeCooling.add(oilHeatExchanger);

  const oilFillerNeck = group('oilFillerNeck');
  add(at(cyl('oilFillerTube', 0.18, 0.2, 0.28, 'cast', 18), 1.0, 1.55, -0.55), oilFillerNeck);
  add(at(lathe('oilFillerCap', [
    [0.0, 0.0], [0.22, 0.0], [0.23, 0.08], [0.18, 0.12], [0.1, 0.13], [0.0, 0.13],
  ], 'oilcap', 24), 1.0, 1.7, -0.55), oilFillerNeck);
  add(rot(at(cyl('dipstickTube', 0.045, 0.045, 0.95, 'steel', 10), 1.45, 0.55, -0.95), 0.35, 0, 0), oilFillerNeck);
  add(at(sphere('dipstickHandle', 0.1, 'yellow', 14), 1.6, 1.05, -1.12), oilFillerNeck);
  lubeCooling.add(oilFillerNeck);

  const oilPump = group('oilPump');
  add(rot(at(cyl('oilPumpBody', 0.26, 0.26, 0.3, 'cast', 20), 0, -0.55, 0.95), HALF_PI, 0, 0), oilPump);
  add(rot(at(cyl('oilPumpDriveGear', 0.18, 0.18, 0.1, 'steel', 20), 0, -0.55, 1.12), HALF_PI, 0, 0), oilPump);
  add(at(box('oilPickupTube', 0.06, 0.5, 0.06, 'cast'), 0, -0.85, 0.5), oilPump);
  add(at(box('oilPickupStrainer', 0.3, 0.08, 0.4, 'castDark'), 0, -1.05, 0.3), oilPump);
  lubeCooling.add(oilPump);

  const thermostatHousing = group('thermostatHousing');
  add(rot(at(cyl('thermostatBody', 0.2, 0.2, 0.3, 'cast', 20), -0.4, -0.2, 1.05), 0.4, 0, 0), thermostatHousing);
  add(rot(at(cyl('thermostatCap', 0.22, 0.22, 0.1, 'castDark', 18), -0.4, -0.05, 1.18), 0.4, 0, 0), thermostatHousing);
  add(rot(at(cyl('thermostatNeck', 0.12, 0.12, 0.3, 'cast', 14), -0.4, -0.45, 1.2), 0.8, 0, 0), thermostatHousing);
  lubeCooling.add(thermostatHousing);

  // Coolant temp sensor on thermostat area
  const coolantTempSensor = group('coolantTempSensor');
  add(rot(at(cyl('coolantTempSensorBody', 0.05, 0.05, 0.14, 'steel', 10), -0.55, -0.15, 1.15), 0.4, 0, 0), coolantTempSensor);
  add(at(box('coolantTempSensorConn', 0.07, 0.08, 0.08, 'damper'), -0.55, 0.0, 1.2), coolantTempSensor);
  lubeCooling.add(coolantTempSensor);

  const coolantPlumbing = group('coolantPlumbing');
  // WM belt-side-3597: thick vertical coolant connection piece (-5-) on Bank1 face
  add(at(cyl('coolantConnectionPiece', 0.14, 0.14, 0.85, 'tank', 16), 1.55, 0.15, 1.15), coolantPlumbing);
  add(at(cyl('coolantConnectionFlare', 0.17, 0.14, 0.12, 'polished', 16), 1.55, 0.5, 1.15), coolantPlumbing);
  // Coolant distributor housing on unit carrier (WM -10-) — multi-port casting
  add(at(roundBox('coolantDistributorHousing', 0.42, 0.55, 0.5, 'cast', 2), -1.55, -0.15, 1.15), coolantPlumbing);
  add(rot(at(cyl('coolantDistributorPortA', 0.09, 0.09, 0.18, 'tank', 12), -1.55, 0.05, 1.4), HALF_PI, 0, 0), coolantPlumbing);
  add(rot(at(cyl('coolantDistributorPortB', 0.08, 0.08, 0.16, 'tank', 12), -1.75, -0.05, 1.15), 0, 0, HALF_PI), coolantPlumbing);
  // Twin parallel coolant pipes into distributor (WM 3614 Fig 19)
  add(tube('coolantPipeThick', [
    [1.55, 0.55, 1.15], [1.2, 0.7, 1.05], [0.4, 0.75, 0.95], [-0.6, 0.55, 1.05], [-1.4, 0.15, 1.25],
  ], 0.075, 'tank', 36, 12), coolantPlumbing);
  add(tube('coolantPipeThin', [
    [1.45, 0.35, 1.25], [1.0, 0.55, 1.2], [0.3, 0.6, 1.1], [-0.5, 0.4, 1.15], [-1.35, -0.05, 1.3],
  ], 0.055, 'tank', 36, 12), coolantPlumbing);
  for (let i = 0; i < 3; i++) {
    add(rot(at(cyl(`coolantUnionRib_${i}`, 0.13, 0.13, 0.05, 'polished', 16), 1.0 - i * 0.07, 0.7, 1.0), 0, 0, HALF_PI), coolantPlumbing);
  }
  add(rot(at(cyl('coolantUnionPipe', 0.1, 0.1, 0.55, 'tank', 18), 0.75, 0.7, 1.0), 0, 0, HALF_PI), coolantPlumbing);
  // S-bend molded hoses (WM 3537 traced centerline)
  add(tube('coolantHoseUpper', ENGINE_HOSE_S, 0.11, 'hose', 48, 14), coolantPlumbing);
  add(tube('coolantHoseLower', ENGINE_HOSE_S_L, 0.1, 'hose', 48, 14), coolantPlumbing);
  const eh0 = ENGINE_HOSE_S[0];
  const ehN = ENGINE_HOSE_S[ENGINE_HOSE_S.length - 1];
  add(rot(at(torus('coolantClamp1', 0.13, 0.025, 'polished', 8, 20), eh0[0], eh0[1], eh0[2]), 0.6, 0, 0), coolantPlumbing);
  add(rot(at(torus('coolantClamp2', 0.11, 0.025, 'polished', 8, 20), ehN[0], ehN[1], ehN[2]), 0.6, 0, 0), coolantPlumbing);
  lubeCooling.add(coolantPlumbing);

  engine.add(lubeCooling);

  // ====================================================================
  // SENSORS / ECU / HARNESS / EXHAUST STUBS
  // ====================================================================
  const sensors = group('engineSensors');

  const crankPositionSensor = group('crankPositionSensor');
  add(at(box('ckpBody', 0.1, 0.12, 0.14, 'cover'), 0.45, -0.35, 1.15), crankPositionSensor);
  add(rot(at(cyl('ckpTip', 0.03, 0.03, 0.1, 'steel', 8), 0.35, -0.35, 1.1), 0, 0, HALF_PI), crankPositionSensor);
  sensors.add(crankPositionSensor);

  const knockSensors = group('knockSensors');
  add(rot(at(cyl('knockSensor_R', 0.06, 0.06, 0.12, 'cast', 10), 0.9, -0.15, 0.2), 0, 0, HALF_PI), knockSensors);
  add(rot(at(cyl('knockSensor_L', 0.06, 0.06, 0.12, 'cast', 10), -0.9, -0.15, 0.2), 0, 0, HALF_PI), knockSensors);
  add(at(box('knockSensorConn_R', 0.06, 0.07, 0.08, 'damper'), 1.0, -0.05, 0.2), knockSensors);
  add(at(box('knockSensorConn_L', 0.06, 0.07, 0.08, 'damper'), -1.0, -0.05, 0.2), knockSensors);
  sensors.add(knockSensors);

  // APP — cabin sensor stub near throttle for inspectability
  const acceleratorPedalSensor = group('acceleratorPedalSensor');
  add(at(box('appSensorBody', 0.14, 0.1, 0.16, 'cover'), -0.5, 1.6, -0.9), acceleratorPedalSensor);
  add(at(box('appSensorConn', 0.08, 0.08, 0.1, 'damper'), -0.5, 1.72, -0.9), acceleratorPedalSensor);
  sensors.add(acceleratorPedalSensor);

  // DME / ECU box near rear/top
  const dmeEcu = group('dmeEcu');
  add(at(roundBox('dmeEcuBody', 0.55, 0.2, 0.7, 'cover'), 0, 1.5, -1.4), dmeEcu);
  add(at(box('dmeEcuConnA', 0.2, 0.1, 0.12, 'damper'), -0.15, 1.55, -1.1), dmeEcu);
  add(at(box('dmeEcuConnB', 0.2, 0.1, 0.12, 'damper'), 0.15, 1.55, -1.1), dmeEcu);
  sensors.add(dmeEcu);

  // Wiring harness — a few loom tube runs
  const engineWiringHarness = group('engineWiringHarness');
  add(tube('harnessMain', [
    [0, 1.45, -1.2], [0.5, 1.3, -0.6], [1.2, 1.1, 0.0], [1.5, 0.9, 0.5],
  ], 0.04, 'hose2', 24, 8), engineWiringHarness);
  add(tube('harnessLeft', [
    [0, 1.45, -1.2], [-0.5, 1.3, -0.6], [-1.2, 1.1, 0.0], [-1.5, 0.9, 0.5],
  ], 0.04, 'hose2', 24, 8), engineWiringHarness);
  add(tube('harnessFront', [
    [1.5, 0.9, 0.5], [1.0, 0.7, 1.0], [0.3, 0.5, 1.15], [-0.4, 0.4, 1.1],
  ], 0.035, 'hose2', 20, 8), engineWiringHarness);
  sensors.add(engineWiringHarness);

  engine.add(sensors);

  // ---- exhaust header stubs + lambda / EGT sensors
  const headers = group('headerStubs');
  for (let i = 0; i < 3; i++) {
    const z = (i - 1) * 0.72;
    for (const s of [1, -1]) {
      const sk = s > 0 ? 'R' : 'L';
      add(tube(`headerStub_${sk}_${i}`, [
        [s * 1.85, -0.35, z], [s * 1.95, -0.8, z * 0.6], [s * 1.4, -1.15, -0.2], [s * 0.8, -1.35, -1.0],
      ], 0.1, 'exhaust', 22, 12), headers);
      add(rot(at(torus(`headerFlange_${sk}_${i}`, 0.13, 0.03, 'exhaustC', 8, 18), s * 1.86, -0.35, z), 0, 0, HALF_PI), headers);
    }
  }
  add(rot(at(cyl('headerCollector', 0.22, 0.22, 1.0, 'exhaust', 18), 0, -1.45, -1.4), Math.PI / 2.4, 0, 0), headers);

  const lambdaSensors = group('lambdaSensors');
  const lambdaPts = [
    [1.7, -0.7, 0.5], [1.5, -1.0, -0.3], [-1.7, -0.7, 0.5], [-1.5, -1.0, -0.3],
  ];
  lambdaPts.forEach((p, i) => {
    add(rot(at(cyl(`lambdaSensor_${i}`, 0.04, 0.04, 0.16, 'steel', 10), p[0], p[1], p[2]), 0.6, 0, HALF_PI * 0.3), lambdaSensors);
    add(at(box(`lambdaSensorConn_${i}`, 0.06, 0.07, 0.08, 'damper'), p[0], p[1] + 0.1, p[2]), lambdaSensors);
  });
  headers.add(lambdaSensors);

  const exhaustGasTempSensor = group('exhaustGasTempSensor');
  add(rot(at(cyl('egtSensor_R', 0.035, 0.035, 0.14, 'steel', 8), 1.6, -0.9, 0.0), 0.5, 0, HALF_PI * 0.2), exhaustGasTempSensor);
  add(rot(at(cyl('egtSensor_L', 0.035, 0.035, 0.14, 'steel', 8), -1.6, -0.9, 0.0), 0.5, 0, -HALF_PI * 0.2), exhaustGasTempSensor);
  add(at(box('egtSensorConn_R', 0.05, 0.06, 0.07, 'damper'), 1.65, -0.8, 0.0), exhaustGasTempSensor);
  add(at(box('egtSensorConn_L', 0.05, 0.06, 0.07, 'damper'), -1.65, -0.8, 0.0), exhaustGasTempSensor);
  headers.add(exhaustGasTempSensor);

  engine.add(headers);

  return engine;
}
