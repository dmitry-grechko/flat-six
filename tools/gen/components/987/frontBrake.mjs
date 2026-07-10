// 987 front brake assembly (id 'fbrakes') — forked from the 981 builder,
// calibrated to the 2009 Service Introduction (doc p119, figs 4_21_09 /
// 4_28_09 / 4_22_09):
//
//   - 987.2 front discs: 318 x 28 mm cross-drilled, involute-shaped internally
//     vented — fitted to ALL models (the basic Boxster/Cayman moved up from the
//     987.1's 298 x 24 mm to the S disc). Caliper: 4-piston aluminium monobloc
//     fixed caliper (black anodized on the 2.9 base cars, red on S, yellow PCCB).
//   - Brake booster ratio raised to i=5.0 with steel discs (i=4.5 with PCCB).
//   - Parking brake (rear only): the 987 uses a CABLE-OPERATED drum-in-hat
//     parking brake worked from the hand lever — there is NO motor-on-caliper
//     EPB (that arrived with the 981). makeBrake therefore draws a mechanical
//     expander + actuating cable under the legacy `epbActuator*` node names
//     (the parts JSON keeps those node ids and relabels them).
//
// The app pins a part ONLY if the GLB contains a mesh/group whose NAME exactly
// equals that part's `node` field in the parts JSON. Left carries geometry,
// Right gets empty named pin-anchor groups (bilateral unified view mirrors).
// CRITICAL app hide-list nodes that must keep existing: brakeMasterCylinder,
// brakeBooster, absHydraulicControlUnit (front) / absPsmHydraulicUnit,
// brakeFluidReservoir (rear).

import { group, box, cyl, tube, at, rot, torusArc } from '../../lib/primitives.mjs';

// Default node-name set = FRONT brake (987/fbrakes-parts.json primary nodes).
const FRONT_NODES = {
  root: 'frontBrake',
  rotorLeft: 'frontBrakeRotorLeft',
  rotorRight: 'frontBrakeRotorRight',
  caliperLeft: 'frontBrakeCaliperLeft',
  caliperRight: 'frontBrakeCaliperRight',
  masterCylinder: 'brakeMasterCylinder',
  booster: 'brakeBooster',
  absUnit: 'absHydraulicControlUnit',
  wheelSpeedLeft: 'wheelSpeedSensorFrontLeft',
  wheelSpeedRight: 'wheelSpeedSensorFrontRight',
  rear: false,
};

const SENSOR_MAT = { color: 0x2a2d33, metalness: 0.6, roughness: 0.45 };
const ACTUATOR_MAT = { color: 0x2a2d33, metalness: 0.7, roughness: 0.4 };
const SHOE_MAT = { color: 0x4a3a2a, metalness: 0.25, roughness: 0.75 };
const VANE_MAT = { color: 0x6a6d72, metalness: 0.9, roughness: 0.55 };
const CABLE_MAT = { color: 0x202225, metalness: 0.3, roughness: 0.75 };

export function makeBrake(opts) {
  const {
    discR = 1.0,
    discT = 0.16,
    pistons = 4,
    nodes = FRONT_NODES,
  } = opts || {};
  const N = { ...FRONT_NODES, ...nodes };

  const brake = group(N.root);
  const add = (m, p = brake) => { p.add(m); return m; };

  // -------------------------------------------------------------------------
  // Rotor: cross-drilled ventilated ring + alloy hat (SI fig 4_21_09/4_28_09).
  // -------------------------------------------------------------------------
  function buildRotor(name) {
    const g = group(name);
    const faceT = discT * 0.38;
    const gap = discT * 0.24;
    g.add(rot(at(cyl(`${name}_faceO`, discR, discR, faceT, 'disc', 48), gap / 2 + faceT / 2, 0, 0), 0, 0, Math.PI / 2));
    g.add(rot(at(cyl(`${name}_faceI`, discR, discR, faceT, 'disc', 48), -(gap / 2 + faceT / 2), 0, 0), 0, 0, Math.PI / 2));
    // Vent vanes between faces (internally vented disc)
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const vx = Math.cos(a) * discR * 0.72;
      const vy = Math.sin(a) * discR * 0.72;
      g.add(rot(at(box(`${name}_vane_${i}`, gap * 0.9, discR * 0.18, 0.04, VANE_MAT), 0, vy, vx), a, 0, 0));
    }
    // Alloy hat (center bell) — drum-in-hat volume for the rear parking shoes
    g.add(rot(at(cyl(`${name}_hat`, discR * 0.42, discR * 0.42, discT + 0.14, 'hat', 28), 0, 0, 0), 0, 0, Math.PI / 2));
    // Wheel studs (5-lug, kept short)
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      g.add(rot(at(cyl(`${name}_stud_${i}`, 0.045, 0.045, 0.1, 'steel', 10),
        Math.cos(a) * discR * 0.28, Math.sin(a) * discR * 0.28, discT * 0.55), 0, 0, Math.PI / 2));
    }
    // Cross-drilled pattern: flush dark discs on the outer face (involute sweep)
    const rows = 3;
    const holesPerRow = 6;
    const faceOut = discT * 0.38 + discT * 0.12 + 0.01;
    for (let row = 0; row < rows; row++) {
      const rFrac = 0.58 + row * 0.12;
      const r = discR * rFrac;
      const sweepBias = row * 0.28;
      for (let i = 0; i < holesPerRow; i++) {
        const a = sweepBias + (i / holesPerRow) * Math.PI * 2 + row * 0.1;
        const hx = Math.cos(a) * r;
        const hy = Math.sin(a) * r;
        const hr = 0.032 + row * 0.006;
        g.add(rot(at(cyl(`${name}_drill_${row}_${i}`, hr, hr, 0.02, 'cover', 8),
          faceOut, hy, hx), 0, 0, Math.PI / 2));
      }
    }
    return g;
  }

  // -------------------------------------------------------------------------
  // Fixed 4-piston monobloc caliper: ribbed body, bridge with pad windows,
  // mount ears with 2 fastening screws.
  // -------------------------------------------------------------------------
  function buildCaliper(name) {
    const cal = group(name);
    const cy = discR * 0.78;
    const halfT = discT / 2;
    const bodyH = 0.62;
    const bodyD = 0.95;
    const bodyW = 0.28;

    cal.add(at(box(`${name}_outer`, bodyW, bodyH, bodyD, 'caliper', 2), halfT + 0.2, cy, 0));
    cal.add(at(box(`${name}_inner`, bodyW, bodyH, bodyD, 'caliper', 2), -(halfT + 0.2), cy, 0));

    cal.add(at(box(`${name}_bridge`, discT + 0.08, 0.22, bodyD * 0.92, 'caliper'), 0, discR * 0.98, 0));
    cal.add(at(box(`${name}_win0`, discT + 0.02, 0.14, 0.28, 'castDark'), 0, discR * 0.96, 0.22));
    cal.add(at(box(`${name}_win1`, discT + 0.02, 0.14, 0.28, 'castDark'), 0, discR * 0.96, -0.22));

    for (let i = 0; i < 4; i++) {
      const z = -0.32 + i * 0.22;
      cal.add(at(box(`${name}_ribO_${i}`, 0.04, bodyH * 0.85, 0.05, 'castDark'), halfT + 0.34, cy, z));
      cal.add(at(box(`${name}_ribI_${i}`, 0.04, bodyH * 0.85, 0.05, 'castDark'), -(halfT + 0.34), cy, z));
    }

    const perSide = Math.max(1, Math.floor(pistons / 2));
    for (let i = 0; i < perSide; i++) {
      const z = (i - (perSide - 1) / 2) * 0.38;
      cal.add(rot(at(cyl(`${name}_pistonO_${i}`, 0.1, 0.1, 0.1, 'steel', 14), halfT + 0.06, cy, z), 0, 0, Math.PI / 2));
      cal.add(rot(at(cyl(`${name}_pistonI_${i}`, 0.1, 0.1, 0.1, 'steel', 14), -(halfT + 0.06), cy, z), 0, 0, Math.PI / 2));
    }

    cal.add(at(box(`${name}_padEdgeO`, 0.035, 0.42, 0.72, 'pad'), halfT + 0.04, cy, 0));
    cal.add(at(box(`${name}_padEdgeI`, 0.035, 0.42, 0.72, 'pad'), -(halfT + 0.04), cy, 0));
    cal.add(at(box(`${name}_retainer`, discT + 0.12, 0.03, 0.04, 'steel'), 0, discR * 1.02, 0));

    cal.add(at(box(`${name}_ear0`, 0.16, 0.14, 0.14, 'caliper'), 0, discR * 0.52, 0.42));
    cal.add(at(box(`${name}_ear1`, 0.16, 0.14, 0.14, 'caliper'), 0, discR * 0.52, -0.42));
    cal.add(rot(at(cyl(`${name}_bolt0`, 0.045, 0.045, 0.22, 'bolt', 10), 0, discR * 0.52, 0.42), 0, 0, Math.PI / 2));
    cal.add(rot(at(cyl(`${name}_bolt1`, 0.045, 0.045, 0.22, 'bolt', 10), 0, discR * 0.52, -0.42), 0, 0, Math.PI / 2));

    cal.add(at(cyl(`${name}_bleeder`, 0.03, 0.03, 0.12, 'bolt', 10), halfT + 0.18, discR * 1.05, 0.35));
    cal.add(tube(`${name}_xover`, [
      [halfT + 0.2, discR * 1.05, 0.3],
      [0, discR * 1.12, 0],
      [-(halfT + 0.2), discR * 1.05, -0.3],
    ], 0.018, 'steel', 12, 8));

    return cal;
  }

  // Drum-in-hat parking brake shoes — rear only, inside the hat radius.
  function buildParkingShoes(sideTag) {
    const shoeNode = sideTag === 'L' ? (N.epbShoeLeft || 'epbShoeLeft') : (N.epbShoeRight || 'epbShoeRight');
    const springNode = sideTag === 'L' ? (N.epbSpringLeft || 'epbSpringLeft') : (N.epbSpringRight || 'epbSpringRight');
    const g = group(shoeNode);
    const r = discR * 0.36;
    g.add(rot(at(torusArc(`${shoeNode}_upper`, r, 0.035, SHOE_MAT, 8, 20, Math.PI * 0.9), 0, 0, 0), 0, Math.PI / 2, 0.2));
    g.add(rot(at(torusArc(`${shoeNode}_lower`, r, 0.035, SHOE_MAT, 8, 20, Math.PI * 0.9), 0, 0, 0), 0, Math.PI / 2, Math.PI + 0.2));
    // Adjustment star wheel between shoe tips
    g.add(at(cyl(`${shoeNode}_adjuster`, 0.035, 0.035, 0.07, 'steel', 12), 0, r * 0.9, 0));
    // Return/tension spring hint (named sub-node for parts JSON)
    const spr = group(springNode);
    spr.add(at(cyl(`${springNode}_coil`, 0.01, 0.01, r * 1.1, 'steel', 8), 0, -r * 0.15, 0));
    g.add(spr);
    return g;
  }

  // 987 parking-brake actuation: mechanical expander lever at the bottom of the
  // drum with a Bowden cable running inboard to the hand-lever linkage — NOT a
  // motor-on-caliper EPB. Node name stays `epbActuator*` (app pin contract).
  function buildParkingCableActuator(node) {
    const g = group(node);
    const r = discR * 0.36;
    // Expander housing between the lower shoe tips
    g.add(at(box(`${node}_expander`, 0.09, 0.07, 0.1, ACTUATOR_MAT), -0.02, -r * 0.95, 0));
    // Actuating lever plate
    g.add(rot(at(box(`${node}_lever`, 0.02, 0.14, 0.05, 'steel'), -0.05, -r * 0.7, 0.04), 0, 0, 0.35));
    // Bowden cable: exits the backing area inboard (-x) and sweeps down/forward
    g.add(tube(`${node}_cable`, [
      [-0.06, -r * 0.95, 0.02],
      [-0.25, -r * 1.15, 0.15],
      [-0.5, -r * 1.2, 0.4],
      [-0.75, -r * 1.05, 0.7],
    ], 0.016, CABLE_MAT, 24, 8));
    // Cable end fitting / abutment
    g.add(at(cyl(`${node}_abutment`, 0.024, 0.024, 0.06, 'bolt', 10), -0.06, -r * 0.95, 0.02));
    return g;
  }

  // ---- Rotors / calipers: full geometry on Left only. ----
  add(buildRotor(N.rotorLeft));
  add(group(N.rotorRight));

  add(buildCaliper(N.caliperLeft));
  add(group(N.caliperRight));

  // ---- Parking brake actuation (rear only): cable expander, Right = anchor ----
  if (N.rear && N.epbActuatorLeft) {
    add(buildParkingCableActuator(N.epbActuatorLeft));
    if (N.epbActuatorRight) add(group(N.epbActuatorRight));
  }

  // ---- Brake pads ----
  if (N.pads) {
    const pads = group(N.pads);
    pads.add(at(box(`${N.pads}_outer`, 0.04, 0.45, 0.8, 'pad'), discT / 2 + 0.03, discR * 0.78, 0));
    pads.add(at(box(`${N.pads}_inner`, 0.04, 0.45, 0.8, 'pad'), -(discT / 2 + 0.03), discR * 0.78, 0));
    pads.add(at(box(`${N.pads}_backO`, 0.02, 0.08, 0.75, 'steel'), discT / 2 + 0.055, discR * 0.95, 0));
    pads.add(at(box(`${N.pads}_backI`, 0.02, 0.08, 0.75, 'steel'), -(discT / 2 + 0.055), discR * 0.95, 0));
    add(pads);
  } else {
    const pads = group('frontBrakePads');
    pads.add(at(box('padOuter', 0.04, 0.45, 0.8, 'pad'), discT / 2 + 0.03, discR * 0.78, 0));
    pads.add(at(box('padInner', 0.04, 0.45, 0.8, 'pad'), -(discT / 2 + 0.03), discR * 0.78, 0));
    pads.add(at(box('padBackO', 0.02, 0.08, 0.75, 'steel'), discT / 2 + 0.055, discR * 0.95, 0));
    pads.add(at(box('padBackI', 0.02, 0.08, 0.75, 'steel'), -(discT / 2 + 0.055), discR * 0.95, 0));
    add(pads);
  }

  // ---- Parking brake shoes (rear) — Left geometry; Right empty pin anchors ----
  if (N.rear) {
    add(buildParkingShoes('L'));
    add(group(N.epbShoeRight || 'epbShoeRight'));
    add(group(N.epbSpringRight || 'epbSpringRight'));
  }

  // ---- Wheel-speed (ABS) sensor — Left geometry; Right empty pin anchor ----
  const wsL = group(N.wheelSpeedLeft);
  wsL.add(rot(at(cyl(`${N.wheelSpeedLeft}_body`, 0.05, 0.05, 0.24, SENSOR_MAT, 12), 0.05, discR * 0.32, 0.55), Math.PI / 2, 0, 0));
  add(wsL);
  add(group(N.wheelSpeedRight));

  // ---- Brake line / flexi hose ----
  const lineNode = N.brakeLines || 'frontBrakeFlexHose';
  const hose = group(lineNode);
  hose.add(tube(`${lineNode}_flex`, [
    [-(discT / 2 + 0.18), discR * 0.95, 0.4],
    [-(discT / 2 + 0.45), discR * 1.2, 0.5],
    [-(discT / 2 + 0.6), discR * 1.5, 0.45],
  ], 0.035, 'hose', 18, 10));
  add(hose);

  // ---- Brake fluid reservoir ----
  if (N.fluidReservoir) {
    const res = group(N.fluidReservoir);
    res.add(at(box(`${N.fluidReservoir}_tank`, 0.3, 0.36, 0.24, 'translucent'), 0, discR * 1.9, 1.0));
    add(res);
  }

  // -------------------------------------------------------------------------
  // Chassis-mounted hydraulics (booster i=5.0 with steel discs — SI doc p119)
  // -------------------------------------------------------------------------
  if (N.masterCylinder) {
    const mc = group(N.masterCylinder);
    mc.add(rot(at(cyl(`${N.masterCylinder}_body`, 0.16, 0.16, 0.5, 'steel', 18), 0, discR * 2.1, 1.4), 0, 0, Math.PI / 2));
    add(mc);
  }
  if (N.booster) {
    const bs = group(N.booster);
    bs.add(rot(at(cyl(`${N.booster}_can`, 0.42, 0.42, 0.5, 'cast', 24), 0.5, discR * 2.1, 1.4), 0, 0, Math.PI / 2));
    add(bs);
  }
  if (N.absUnit) {
    const abs = group(N.absUnit);
    abs.add(at(box(`${N.absUnit}_block`, 0.4, 0.34, 0.3, 'cast'), -0.6, discR * 2.0, 1.4));
    abs.add(rot(at(cyl(`${N.absUnit}_pump`, 0.1, 0.1, 0.2, ACTUATOR_MAT, 12), -0.6, discR * 2.0, 1.6), Math.PI / 2, 0, 0));
    add(abs);
  }

  return brake;
}

export const meta = {
  id: 'fbrakes',
  label: 'Front Brake (318mm)',
  system: 'Brakes',
  node: 'frontBrake',
  hotspot3d: '0 0.78 0',
  generation: '987',
};

export function build() {
  // 987.2: 318 x 28 mm front on all models (987.1 base: 298 x 24 mm).
  return makeBrake({ discR: 1.0, discT: 0.16, pistons: 4, nodes: FRONT_NODES });
}
