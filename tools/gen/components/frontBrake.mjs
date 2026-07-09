// Front brake assembly (id 'fbrakes'). 318 mm vented steel disc with curved
// drill pattern + alloy hat, a red fixed multi-piston caliper (ribbed body,
// bridge windows, 2 mount bolts), brake pads visible in the caliper window,
// plus hydraulic / sensor / ABS hardware the app pins.
//
// WM Tier A (981): caliper-pads-3111 Locating Brake Calliper Fastening Screws;
// disc-perforations-3159 curved friction-surface bores; parking-brake-3199…
// (rear shoes via makeBrake when rear:true).
//
// The app pins a part ONLY if the GLB contains a mesh/group whose NAME exactly
// equals that part's `node` field in the parts JSON. Parts JSON lists Left AND
// Right nodes; we emit full geometry on Left and empty named groups on Right
// (pin anchors). Unified view is bilateral and mirrors the corner — do NOT bake
// co-located L+R meshes or drill/stud cylinders stack into a bolt porcupine.
//
// makeBrake(opts) is shared with rearBrake.mjs: pass a `nodes` set to control the
// exact node names emitted, plus disc sizing. Defaults emit the front node names.

import { group, box, cyl, tube, at, rot, torusArc } from '../lib/primitives.mjs';

// Default node-name set = FRONT brake (fbrakes-parts.json primary nodes).
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
  // front JSON has no primary EPB / pad / line nodes, but we still draw pads and
  // a flexi hose for visual completeness under cosmetic names (not pinned).
  rear: false,
};

const SENSOR_MAT = { color: 0x2a2d33, metalness: 0.6, roughness: 0.45 };
const ACTUATOR_MAT = { color: 0x2a2d33, metalness: 0.7, roughness: 0.4 };
const SHOE_MAT = { color: 0x4a3a2a, metalness: 0.25, roughness: 0.75 };
const VANE_MAT = { color: 0x6a6d72, metalness: 0.9, roughness: 0.55 };

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
  // Rotor: ventilated ring + curved drill pattern (WM 3159) + alloy hat.
  // Rotor stays near origin for bilateral unified placement.
  // -------------------------------------------------------------------------
  function buildRotor(name) {
    const g = group(name);
    const faceT = discT * 0.38;
    const gap = discT * 0.24;
    // Outer friction face
    g.add(rot(at(cyl(`${name}_faceO`, discR, discR, faceT, 'disc', 48), gap / 2 + faceT / 2, 0, 0), 0, 0, Math.PI / 2));
    // Inner friction face
    g.add(rot(at(cyl(`${name}_faceI`, discR, discR, faceT, 'disc', 48), -(gap / 2 + faceT / 2), 0, 0), 0, 0, Math.PI / 2));
    // Vent vanes between faces (silhouette of ventilated disc)
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const vx = Math.cos(a) * discR * 0.72;
      const vy = Math.sin(a) * discR * 0.72;
      g.add(rot(at(box(`${name}_vane_${i}`, gap * 0.9, discR * 0.18, 0.04, VANE_MAT), 0, vy, vx), a, 0, 0));
    }
    // Alloy hat (center bell) — drum-in-hat volume for rear parking shoes
    g.add(rot(at(cyl(`${name}_hat`, discR * 0.42, discR * 0.42, discT + 0.14, 'hat', 28), 0, 0, 0), 0, 0, Math.PI / 2));
    // Wheel-stud hints (5-lug only — keep short so they don't read as a bolt forest)
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      g.add(rot(at(cyl(`${name}_stud_${i}`, 0.045, 0.045, 0.1, 'steel', 10),
        Math.cos(a) * discR * 0.28, Math.sin(a) * discR * 0.28, discT * 0.55), 0, 0, Math.PI / 2));
    }
    // Curved perforation pattern (WM 3159): flush dark discs on the outer face —
    // NOT through-cylinders (those read as a porcupine of bolts when L+R stack).
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
  // Fixed multi-piston caliper: ribbed body, bridge with pad windows, mount ears
  // with 2 fastening screws (WM 3111 arrows).
  // -------------------------------------------------------------------------
  function buildCaliper(name, epbNode) {
    const cal = group(name);
    const cy = discR * 0.78;
    const halfT = discT / 2;
    const bodyH = 0.62;
    const bodyD = 0.95;
    const bodyW = 0.28;

    // Outer / inner piston housings (rounded via multi-seg boxes)
    cal.add(at(box(`${name}_outer`, bodyW, bodyH, bodyD, 'caliper', 2), halfT + 0.2, cy, 0));
    cal.add(at(box(`${name}_inner`, bodyW, bodyH, bodyD, 'caliper', 2), -(halfT + 0.2), cy, 0));

    // Bridge over disc with two pad-view windows (WM caliper face openings)
    cal.add(at(box(`${name}_bridge`, discT + 0.08, 0.22, bodyD * 0.92, 'caliper'), 0, discR * 0.98, 0));
    // Window cutouts implied by darker recessed panels + visible pads behind
    cal.add(at(box(`${name}_win0`, discT + 0.02, 0.14, 0.28, 'castDark'), 0, discR * 0.96, 0.22));
    cal.add(at(box(`${name}_win1`, discT + 0.02, 0.14, 0.28, 'castDark'), 0, discR * 0.96, -0.22));

    // Cooling / structure ribs on outer face (WM ribbed body)
    for (let i = 0; i < 4; i++) {
      const z = -0.32 + i * 0.22;
      cal.add(at(box(`${name}_ribO_${i}`, 0.04, bodyH * 0.85, 0.05, 'castDark'), halfT + 0.34, cy, z));
      cal.add(at(box(`${name}_ribI_${i}`, 0.04, bodyH * 0.85, 0.05, 'castDark'), -(halfT + 0.34), cy, z));
    }

    // Pistons (half on each side)
    const perSide = Math.max(1, Math.floor(pistons / 2));
    for (let i = 0; i < perSide; i++) {
      const z = (i - (perSide - 1) / 2) * 0.38;
      cal.add(rot(at(cyl(`${name}_pistonO_${i}`, 0.1, 0.1, 0.1, 'steel', 14), halfT + 0.06, cy, z), 0, 0, Math.PI / 2));
      cal.add(rot(at(cyl(`${name}_pistonI_${i}`, 0.1, 0.1, 0.1, 'steel', 14), -(halfT + 0.06), cy, z), 0, 0, Math.PI / 2));
    }

    // Pad edges visible in caliper window (backing plate + friction)
    cal.add(at(box(`${name}_padEdgeO`, 0.035, 0.42, 0.72, 'pad'), halfT + 0.04, cy, 0));
    cal.add(at(box(`${name}_padEdgeI`, 0.035, 0.42, 0.72, 'pad'), -(halfT + 0.04), cy, 0));
    // Retaining spring / pin across window
    cal.add(at(box(`${name}_retainer`, discT + 0.12, 0.03, 0.04, 'steel'), 0, discR * 1.02, 0));

    // Mount ears + 2 fastening screws to wheel carrier (WM 3111)
    cal.add(at(box(`${name}_ear0`, 0.16, 0.14, 0.14, 'caliper'), 0, discR * 0.52, 0.42));
    cal.add(at(box(`${name}_ear1`, 0.16, 0.14, 0.14, 'caliper'), 0, discR * 0.52, -0.42));
    cal.add(rot(at(cyl(`${name}_bolt0`, 0.045, 0.045, 0.22, 'bolt', 10), 0, discR * 0.52, 0.42), 0, 0, Math.PI / 2));
    cal.add(rot(at(cyl(`${name}_bolt1`, 0.045, 0.045, 0.22, 'bolt', 10), 0, discR * 0.52, -0.42), 0, 0, Math.PI / 2));

    // Bleeder on top
    cal.add(at(cyl(`${name}_bleeder`, 0.03, 0.03, 0.12, 'bolt', 10), halfT + 0.18, discR * 1.05, 0.35));
    // Crossover tube hint on bridge
    cal.add(tube(`${name}_xover`, [
      [halfT + 0.2, discR * 1.05, 0.3],
      [0, discR * 1.12, 0],
      [-(halfT + 0.2), discR * 1.05, -0.3],
    ], 0.018, 'steel', 12, 8));

    // EPB actuator motor on the back of the caliper (rear brakes only)
    if (epbNode) {
      const epb = group(epbNode);
      epb.add(rot(at(cyl(`${epbNode}_motor`, 0.12, 0.12, 0.32, ACTUATOR_MAT, 16), -(halfT + 0.38), cy, -0.15), 0, 0, Math.PI / 2));
      epb.add(at(box(`${epbNode}_housing`, 0.2, 0.24, 0.24, ACTUATOR_MAT), -(halfT + 0.45), cy, -0.15));
      // Connector stub (WM EPB plug)
      epb.add(at(box(`${epbNode}_plug`, 0.08, 0.06, 0.1, SENSOR_MAT), -(halfT + 0.55), cy + 0.08, -0.15));
      cal.add(epb);
    }
    return cal;
  }

  // Drum-in-hat parking brake shoes (WM 3199–3203) — rear only, under hat radius
  function buildParkingShoes(sideTag) {
    const shoeNode = sideTag === 'L' ? (N.epbShoeLeft || 'epbShoeLeft') : (N.epbShoeRight || 'epbShoeRight');
    const springNode = sideTag === 'L' ? (N.epbSpringLeft || 'epbSpringLeft') : (N.epbSpringRight || 'epbSpringRight');
    const g = group(shoeNode);
    const r = discR * 0.36;
    // Two crescent shoes in the disc plane (YZ) — WM 3199/3200 drum-in-hat
    g.add(rot(at(torusArc(`${shoeNode}_upper`, r, 0.035, SHOE_MAT, 8, 20, Math.PI * 0.9), 0, 0, 0), 0, Math.PI / 2, 0.2));
    g.add(rot(at(torusArc(`${shoeNode}_lower`, r, 0.035, SHOE_MAT, 8, 20, Math.PI * 0.9), 0, 0, 0), 0, Math.PI / 2, Math.PI + 0.2));
    // Adjustment star wheel between shoe tips (WM blue highlight)
    g.add(at(cyl(`${shoeNode}_adjuster`, 0.035, 0.035, 0.07, 'steel', 12), 0, r * 0.9, 0));
    // Tension spring hint (named sub-node for parts JSON)
    const spr = group(springNode);
    spr.add(at(cyl(`${springNode}_coil`, 0.01, 0.01, r * 1.1, 'steel', 8), 0, -r * 0.15, 0));
    g.add(spr);
    return g;
  }

  // ---- Rotors / calipers: full geometry on Left only. ----
  // Right-side names are empty groups so parts JSON can still pin them. Baking
  // L+R meshes at the same origin made drill/stud cylinders look like ~80 bolts
  // (and bilateral unified view would double that again).
  add(buildRotor(N.rotorLeft));
  add(group(N.rotorRight));

  add(buildCaliper(N.caliperLeft, N.rear ? N.epbActuatorLeft : null));
  add(group(N.caliperRight));
  if (N.rear && N.epbActuatorRight) add(group(N.epbActuatorRight));

  // ---- Brake pads ----
  // Rear JSON pins a single 'rearBrakePads' node; front pads are cosmetic.
  if (N.pads) {
    const pads = group(N.pads);
    pads.add(at(box(`${N.pads}_outer`, 0.04, 0.45, 0.8, 'pad'), discT / 2 + 0.03, discR * 0.78, 0));
    pads.add(at(box(`${N.pads}_inner`, 0.04, 0.45, 0.8, 'pad'), -(discT / 2 + 0.03), discR * 0.78, 0));
    // Backing-plate tops visible in window
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
  // Chassis-mounted hydraulics
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
};

export function build() {
  return makeBrake({ discR: 1.0, discT: 0.16, pistons: 4, nodes: FRONT_NODES });
}
