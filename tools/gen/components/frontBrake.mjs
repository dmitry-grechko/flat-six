// Front brake assembly (id 'fbrakes'). 318 mm vented steel disc with drilled
// face + alloy hat, a red Brembo 4-piston fixed monobloc caliper straddling the
// disc, brake pads, plus the hydraulic, sensor and ABS hardware the app pins.
//
// The app pins a part ONLY if the GLB contains a mesh/group whose NAME exactly
// equals that part's `node` field in the parts JSON. The parts JSON lists Left
// AND Right rotors/calipers/sensors as separate primary nodes, so even though we
// build a single corner centred at the origin (the app renders it bilaterally),
// we emit BOTH a Left and a Right named node for each side-specific part. The
// Right node is a co-located mirror so it carries real geometry as a pin anchor.
//
// makeBrake(opts) is shared with rearBrake.mjs: pass a `nodes` set to control the
// exact node names emitted, plus disc sizing. Defaults emit the front node names.

import { group, box, cyl, tube, at, rot, THREE } from '../lib/primitives.mjs';

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
  // Build ONE rotor (vented, drilled) + alloy hat as a named group, so it can be
  // reused for the Left anchor and a mirrored Right anchor.
  // -------------------------------------------------------------------------
  function buildRotor(name) {
    const g = group(name);
    // vented disc
    g.add(rot(at(cyl('disc', discR, discR, discT, 'disc', 40), 0, 0, 0), 0, 0, Math.PI / 2));
    // alloy hat (center bell)
    g.add(rot(at(cyl('hat', discR * 0.42, discR * 0.42, discT + 0.12, 'hat', 28), 0, 0, 0), 0, 0, Math.PI / 2));
    // wheel-stud hints around the hat
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      g.add(rot(at(cyl(`${name}_stud_${i}`, 0.05, 0.05, discT + 0.18, 'steel', 10),
        Math.cos(a) * discR * 0.28, Math.sin(a) * discR * 0.28, 0), 0, 0, Math.PI / 2));
    }
    // drilled-hole ring (cosmetic dimples)
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      g.add(rot(at(cyl(`${name}_drill_${i}`, 0.04, 0.04, discT + 0.02, 'cover', 8),
        Math.cos(a) * discR * 0.72, Math.sin(a) * discR * 0.72, 0), 0, 0, Math.PI / 2));
    }
    return g;
  }

  // -------------------------------------------------------------------------
  // Build ONE caliper (red monobloc, straddling top of disc) as a named group.
  // EPB actuator (rear only) bolts onto the back of the caliper.
  // -------------------------------------------------------------------------
  function buildCaliper(name, epbNode) {
    const cal = group(name);
    cal.add(at(box(`${name}_outer`, 0.34, 0.7, 0.9, 'caliper'), discT / 2 + 0.18, discR * 0.78, 0));
    cal.add(at(box(`${name}_inner`, 0.34, 0.7, 0.9, 'caliper'), -(discT / 2 + 0.18), discR * 0.78, 0));
    cal.add(at(box(`${name}_bridge`, 0.05, 0.5, 0.9, 'caliper'), 0, discR * 0.95, 0));
    // pistons
    for (let i = 0; i < pistons / 2; i++) {
      const z = (i - (pistons / 2 - 1) / 2) * 0.42;
      cal.add(rot(at(cyl(`${name}_pistonO_${i}`, 0.1, 0.1, 0.12, 'steel', 14), discT / 2 + 0.05, discR * 0.78, z), 0, 0, Math.PI / 2));
      cal.add(rot(at(cyl(`${name}_pistonI_${i}`, 0.1, 0.1, 0.12, 'steel', 14), -(discT / 2 + 0.05), discR * 0.78, z), 0, 0, Math.PI / 2));
    }
    // bleeder valve (tiny cylinder on top of caliper)
    cal.add(rot(at(cyl(`${name}_bleeder`, 0.03, 0.03, 0.12, 'bolt', 10), discT / 2 + 0.18, discR * 0.95, 0.35), 0, 0, 0));
    // bracket bolts
    cal.add(rot(at(cyl(`${name}_bolt0`, 0.04, 0.04, 0.18, 'bolt', 10), 0, discR * 0.6, 0.4), 0, 0, Math.PI / 2));
    cal.add(rot(at(cyl(`${name}_bolt1`, 0.04, 0.04, 0.18, 'bolt', 10), 0, discR * 0.6, -0.4), 0, 0, Math.PI / 2));
    // EPB actuator motor on the back of the caliper (rear brakes only)
    if (epbNode) {
      const epb = group(epbNode);
      epb.add(rot(at(cyl(`${epbNode}_motor`, 0.12, 0.12, 0.3, ACTUATOR_MAT, 16), -(discT / 2 + 0.34), discR * 0.78, -0.2), 0, 0, Math.PI / 2));
      epb.add(at(box(`${epbNode}_housing`, 0.18, 0.22, 0.22, ACTUATOR_MAT), -(discT / 2 + 0.4), discR * 0.78, -0.2));
      cal.add(epb);
    }
    return cal;
  }

  // ---- Rotors: Left anchor at origin, Right anchor mirrored across X. ----
  add(buildRotor(N.rotorLeft));
  add(at(buildRotor(N.rotorRight), 0, 0, 0)).scale.set(-1, 1, 1);

  // ---- Calipers: Left + mirrored Right. (rear passes EPB node names) ----
  const calL = add(buildCaliper(N.caliperLeft, N.rear ? N.epbActuatorLeft : null));
  const calR = add(buildCaliper(N.caliperRight, N.rear ? N.epbActuatorRight : null));
  calR.scale.set(-1, 1, 1);

  // ---- Brake pads ----
  // Rear JSON pins a single 'rearBrakePads' node; front pads are cosmetic.
  if (N.pads) {
    const pads = group(N.pads);
    pads.add(at(box(`${N.pads}_outer`, 0.04, 0.45, 0.8, 'pad'), discT / 2 + 0.03, discR * 0.78, 0));
    pads.add(at(box(`${N.pads}_inner`, 0.04, 0.45, 0.8, 'pad'), -(discT / 2 + 0.03), discR * 0.78, 0));
    add(pads);
  } else {
    add(at(box('padOuter', 0.04, 0.45, 0.8, 'pad'), discT / 2 + 0.03, discR * 0.78, 0));
    add(at(box('padInner', 0.04, 0.45, 0.8, 'pad'), -(discT / 2 + 0.03), discR * 0.78, 0));
  }

  // ---- Wheel-speed (ABS) sensors near the hub, one per side ----
  const wsL = group(N.wheelSpeedLeft);
  wsL.add(rot(at(cyl(`${N.wheelSpeedLeft}_body`, 0.05, 0.05, 0.24, SENSOR_MAT, 12), 0.05, discR * 0.32, 0.55), Math.PI / 2, 0, 0));
  add(wsL);
  const wsR = group(N.wheelSpeedRight);
  wsR.add(rot(at(cyl(`${N.wheelSpeedRight}_body`, 0.05, 0.05, 0.24, SENSOR_MAT, 12), -0.05, discR * 0.32, 0.55), Math.PI / 2, 0, 0));
  add(wsR);

  // ---- Brake line / flexi hose: a tube stub running up to the caliper inlet ----
  const lineNode = N.brakeLines || 'frontBrakeFlexHose';
  const hose = group(lineNode);
  hose.add(tube(`${lineNode}_flex`, [
    [-(discT / 2 + 0.18), discR * 0.95, 0.4],
    [-(discT / 2 + 0.45), discR * 1.2, 0.5],
    [-(discT / 2 + 0.6), discR * 1.5, 0.45],
  ], 0.035, 'hose', 18, 10));
  add(hose);

  // ---- Brake fluid reservoir (rear JSON pins it; small alloy/translucent tank) ----
  if (N.fluidReservoir) {
    const res = group(N.fluidReservoir);
    res.add(at(box(`${N.fluidReservoir}_tank`, 0.3, 0.36, 0.24, 'translucent'), 0, discR * 1.9, 1.0));
    add(res);
  }

  // -------------------------------------------------------------------------
  // Chassis-mounted hydraulics: master cylinder, vacuum booster, ABS/PSM unit.
  // These are single (not per-corner) parts; placed above/behind the assembly.
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
