// 987 Suspension & steering (id 'susp') — forked from the 981 builder and
// calibrated to the 2009 Service Introduction (987.2):
//
//   - Front axle (SI doc p108/4_29_09): strut suspension with trailing link and
//     wishbone — same architecture the 981 module already draws (MacPherson).
//   - Rear axle (SI doc p110/4_30_09): "McPherson axle … essentially the same as
//     the previous model" — strut + lateral/toe/trailing links, NOT the 981-era
//     marketing "multi-link". Geometry is kept (the link set reads correctly
//     against fig 4_30_09); labels live in susp-parts.json.
//   - Steering (SI doc p109): HYDRAULIC power-assisted rack with variable ratio
//     (the 981's rack is electric/EPAS). This fork adds the hydraulic hardware:
//     psPump (belt-driven, on the engine accessory face), psReservoir (CHF 11S,
//     front trunk) and psLines (pressure/return/suction runs), plus a rotary
//     valve body + line fittings on the rack itself.
//   - PASM optional (SI doc p111) — the thin damper wire stubs stay.
//
// Authored directly in UNIFIED-SCENE CAR-SPACE like the 981 module: front axle
// z=+1.5, rear axle z=-1.5 (at worldScale 0.95), half-track x=±0.82 nominal,
// hub centre y=-0.35. +Z = front, -Z = rear, +Y = up, +X = right (LHD driver +X).
// No brake rotors/calipers here — those belong to fbrakes/rbrakes.

import { group, box, cyl, torus, tube, at, rot, capsule, THREE } from '../../lib/primitives.mjs';

export const meta = {
  id: 'susp',
  label: 'Suspension & Steering',
  system: 'Suspension',
  node: 'suspension',
  hotspot3d: '0 0 0',
  generation: '987',
};

// Shared car-space anchors (same as 981 — the unified scene expects them).
const FRONT_Z = 1.58;
const REAR_Z = -1.58;
const TRACK = 1.1;
const HUB_Y = -0.35;

// Materials (inline specs — no shared-lib edits).
const SPRING = { color: 0xc23535, metalness: 0.55, roughness: 0.42 }; // coil (987 springs are colour-coded)
const STRUT = { color: 0x8a8d92, metalness: 0.9, roughness: 0.4 };
const SHOCK = { color: 0x6f7377, metalness: 0.85, roughness: 0.45 };
const HUB = { color: 0xbfc3c9, metalness: 0.9, roughness: 0.4 };
const BELLOWS = { color: 0x1a1c1f, metalness: 0.08, roughness: 0.9 };
const BUMP = { color: 0x2a2d33, metalness: 0.15, roughness: 0.85 };
const MOUNT = { color: 0xa8adb5, metalness: 0.88, roughness: 0.42 };
const PS_FLUID = { color: 0x2e5d3a, metalness: 0.15, roughness: 0.6 }; // CHF 11S reservoir tint

// Coil spring as stacked tori (SI: coil spring on double-tube gas-filled strut).
function coilSpring(name, x, y, z, { r = 0.095, turns = 6, pitch = 0.055, tube: t = 0.016 } = {}) {
  const g = group(name);
  for (let i = 0; i < turns; i++) {
    g.add(rot(at(torus(`${name}_c${i}`, r, t, SPRING, 8, 16), x, y + i * pitch, z), Math.PI / 2, 0, 0));
  }
  return g;
}

// Corrugated dust bellows (accordion sleeve on piston rod).
function dustBellows(name, x, y, z, { r = 0.038, h = 0.14, ribs = 5 } = {}) {
  const g = group(name);
  const pitch = h / ribs;
  for (let i = 0; i < ribs; i++) {
    const rr = r * (i % 2 === 0 ? 1.0 : 0.78);
    g.add(at(cyl(`${name}_r${i}`, rr, rr, pitch * 0.85, BELLOWS, 12), x, y + i * pitch, z));
  }
  return g;
}

// Triangular spring-strut support mount.
function strutTopMount(name, x, y, z, { scale = 1 } = {}) {
  const g = group(name);
  const s = scale;
  g.add(at(cyl(`${name}_hub`, 0.028 * s, 0.028 * s, 0.04 * s, MOUNT, 14), x, y, z));
  g.add(at(box(`${name}_plate`, 0.14 * s, 0.018 * s, 0.12 * s, MOUNT), x, y - 0.012 * s, z));
  for (let i = 0; i < 3; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / 3;
    const lx = x + Math.cos(a) * 0.055 * s;
    const lz = z + Math.sin(a) * 0.055 * s;
    g.add(at(cyl(`${name}_ear${i}`, 0.022 * s, 0.022 * s, 0.016 * s, MOUNT, 10), lx, y - 0.012 * s, lz));
    g.add(at(cyl(`${name}_bolt${i}`, 0.008 * s, 0.008 * s, 0.03 * s, 'bolt', 8), lx, y + 0.01 * s, lz));
  }
  g.add(at(cyl(`${name}_nut`, 0.016 * s, 0.016 * s, 0.014 * s, 'bolt', 6), x, y + 0.028 * s, z));
  return g;
}

// Wheel-bearing unit: square 4-bolt flange + tiered hub.
function wheelBearingHub(name, x, y, z, { sx = 1 } = {}) {
  const g = group(name);
  g.add(at(box(`${name}_flange`, 0.11, 0.11, 0.028, HUB), x, y, z));
  const holeR = 0.038;
  for (const [dx, dy] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) {
    g.add(at(cyl(`${name}_bolt_${dx}_${dy}`, 0.01, 0.01, 0.04, 'bolt', 8),
      x + dx * holeR, y + dy * holeR, z));
  }
  g.add(rot(at(cyl(`${name}_bearing`, 0.045, 0.045, 0.055, 'cast', 18), x - sx * 0.04, y, z), 0, 0, Math.PI / 2));
  g.add(rot(at(cyl(`${name}_hubFace`, 0.055, 0.055, 0.03, HUB, 20), x + sx * 0.035, y, z), 0, 0, Math.PI / 2));
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    g.add(rot(at(cyl(`${name}_stud${i}`, 0.008, 0.008, 0.04, 'steel', 8),
      x + sx * 0.05, y + Math.sin(a) * 0.032, z + Math.cos(a) * 0.032), 0, 0, Math.PI / 2));
  }
  g.add(at(box(`${name}_knuckle`, 0.07, 0.18, 0.08, 'castDark'), x, y - 0.02, z));
  return g;
}

// Front lower control arm — wishbone (SI front axle: "trailing link and wishbone").
function frontWishbone(name, kx, sx, y, z) {
  const g = group(name);
  const inX = kx * 0.35;
  const midX = kx * 0.55;
  g.add(rot(at(box(`${name}_fwd`, 0.42, 0.04, 0.055, 'cast'), midX, y, z + 0.08), 0, sx * 0.38, 0));
  g.add(rot(at(box(`${name}_aft`, 0.38, 0.04, 0.055, 'cast'), midX * 0.98, y, z - 0.1), 0, sx * 0.22, 0));
  g.add(at(cyl(`${name}_bj`, 0.028, 0.028, 0.04, 'cast', 12), kx, y, z));
  g.add(at(cyl(`${name}_bushF`, 0.022, 0.022, 0.05, 'castDark', 10), inX, y, z + 0.12));
  g.add(at(cyl(`${name}_bushA`, 0.022, 0.022, 0.05, 'castDark', 10), inX, y, z - 0.14));
  return g;
}

export function build() {
  const susp = group('suspension');
  const add = (m, p = susp) => { p.add(m); return m; };

  // ── FRONT corners: strut suspension with trailing link + wishbone (SI 4_29_09) ──
  for (const [side, sx] of [['Left', -1], ['Right', 1]]) {
    const x = sx * TRACK;
    const kx = x;
    const az = FRONT_Z;

    add(wheelBearingHub(`frontWheelHub${side}`, kx, HUB_Y, az, { sx }));

    // Strut assembly (double-tube gas-filled shock + coil spring, SI doc p109)
    const strut = group(`frontStrut${side}`);
    const bodyY = HUB_Y + 0.28;
    strut.add(at(cyl(`frontStrut${side}_body`, 0.038, 0.042, 0.42, STRUT, 14), kx, bodyY, az));
    strut.add(at(cyl(`frontStrut${side}_seat`, 0.1, 0.1, 0.018, STRUT, 18), kx, HUB_Y + 0.12, az));
    strut.add(at(cyl(`frontStrut${side}_seatLip`, 0.085, 0.09, 0.012, 'castDark', 16), kx, HUB_Y + 0.135, az));
    strut.add(at(cyl(`frontStrut${side}_upperPlate`, 0.095, 0.095, 0.014, MOUNT, 16), kx, HUB_Y + 0.48, az));
    strut.add(at(cyl(`frontStrut${side}_bump`, 0.04, 0.022, 0.055, BUMP, 12), kx, HUB_Y + 0.52, az));
    strut.add(strutTopMount(`frontStrut${side}_mount`, kx, HUB_Y + 0.58, az));
    strut.add(dustBellows(`frontStrut${side}_bellows`, kx, HUB_Y + 0.2, az, { r: 0.036, h: 0.16, ribs: 6 }));
    // PASM wire stub (SI doc p111 — PASM optional, dampers actively adjustable)
    strut.add(tube(`frontStrut${side}_pasm`, [
      [kx, HUB_Y + 0.05, az],
      [kx - sx * 0.04, HUB_Y - 0.02, az - 0.06],
      [kx - sx * 0.08, HUB_Y - 0.06, az - 0.12],
    ], 0.006, 'hose', 8, 6));
    strut.add(at(box(`frontStrut${side}_fork`, 0.055, 0.08, 0.06, 'castDark'), kx, HUB_Y + 0.06, az));
    add(strut);

    add(at(cyl(`frontShockAbsorber${side}`, 0.014, 0.014, 0.38, SHOCK, 10), kx, HUB_Y + 0.32, az));
    add(coilSpring(`frontCoilSpring${side}`, kx, HUB_Y + 0.14, az, { r: 0.092, turns: 6, pitch: 0.052, tube: 0.015 }));
    add(frontWishbone(`frontLowerControlArm${side}`, kx, sx, HUB_Y - 0.08, az));

    // Lower trailing arm/link (SI: "strut suspension with trailing link and wishbone")
    const trail = group(`frontTrailingArm${side}`);
    trail.add(rot(at(box(`frontTrailingArm${side}_arm`, 0.52, 0.045, 0.06, 'cast'),
      kx * 0.58, HUB_Y - 0.1, az - 0.22), 0, sx * 0.55, 0));
    trail.add(at(cyl(`frontTrailingArm${side}_bushInner`, 0.024, 0.024, 0.05, 'castDark', 10),
      kx * 0.28, HUB_Y - 0.1, az - 0.28));
    trail.add(at(cyl(`frontTrailingArm${side}_bushOuter`, 0.022, 0.022, 0.045, 'castDark', 10),
      kx * 0.88, HUB_Y - 0.08, az - 0.12));
    trail.add(at(box(`frontTrailingArm${side}_spoiler`, 0.28, 0.02, 0.1, 'cover'),
      kx * 0.55, HUB_Y - 0.14, az - 0.18));
    add(trail);

    const carrier = group(`frontWheelCarrier${side}`);
    carrier.add(at(box(`frontWheelCarrier${side}_body`, 0.08, 0.22, 0.1, 'cast'), kx, HUB_Y + 0.02, az));
    carrier.add(at(cyl(`frontWheelCarrier${side}_strutClamp`, 0.04, 0.04, 0.1, 'castDark', 12), kx, HUB_Y + 0.12, az));
    add(carrier);

    add(at(cyl(`frontArbEndLink${side}`, 0.014, 0.014, 0.18, 'steel', 8), kx * 0.95, HUB_Y + 0.04, az - 0.16));
  }
  // Front ARB: tube 24.0 x 3.8 mm basis / 24.5 x 3.8 mm PASM (SI doc p109 table).
  add(rot(at(cyl('frontAntiRollBar', 0.025, 0.025, TRACK * 1.85, 'steel', 12), 0, HUB_Y - 0.02, FRONT_Z - 0.18), 0, 0, Math.PI / 2));
  add(at(box('frontSubframe', TRACK * 1.9, 0.08, 0.16, 'castDark'), 0, HUB_Y - 0.14, FRONT_Z - 0.08));

  // ── REAR corners: McPherson rear axle (SI doc p110/4_30_09) — strut +
  //    lateral / toe / trailing links + hub unit. Same silhouette as the fig. ──
  for (const [side, sx] of [['Left', -1], ['Right', 1]]) {
    const x = sx * TRACK;
    const kx = x;
    const az = REAR_Z;
    const springX = kx - sx * 0.1;

    add(wheelBearingHub(`rearWheelHub${side}`, kx, HUB_Y, az, { sx }));

    // Rear spring strut (double-tube gas-filled shock + coil, new rebound stop springs)
    const shock = group(`rearShockAbsorber${side}`);
    shock.add(at(cyl(`rearShockAbsorber${side}_body`, 0.036, 0.04, 0.4, SHOCK, 14), springX, HUB_Y + 0.28, az));
    shock.add(at(cyl(`rearShockAbsorber${side}_seat`, 0.095, 0.095, 0.016, STRUT, 16), springX, HUB_Y + 0.14, az));
    shock.add(at(cyl(`rearShockAbsorber${side}_rod`, 0.012, 0.012, 0.28, 'steel', 10), springX, HUB_Y + 0.42, az));
    shock.add(at(cyl(`rearShockAbsorber${side}_upperPlate`, 0.09, 0.09, 0.014, MOUNT, 16), springX, HUB_Y + 0.46, az));
    shock.add(at(cyl(`rearShockAbsorber${side}_bump`, 0.032, 0.02, 0.045, BUMP, 12), springX, HUB_Y + 0.5, az));
    shock.add(dustBellows(`rearShockAbsorber${side}_bellows`, springX, HUB_Y + 0.22, az, { r: 0.034, h: 0.14, ribs: 5 }));
    shock.add(strutTopMount(`rearShockAbsorber${side}_mount`, springX, HUB_Y + 0.56, az, { scale: 0.95 }));
    shock.add(tube(`rearShockAbsorber${side}_pasm`, [
      [springX, HUB_Y + 0.08, az],
      [springX - sx * 0.05, HUB_Y + 0.02, az + 0.08],
      [springX - sx * 0.1, HUB_Y - 0.04, az + 0.14],
    ], 0.006, 'hose', 8, 6));
    add(shock);

    add(coilSpring(`rearCoilSpring${side}`, springX, HUB_Y + 0.15, az, { r: 0.09, turns: 5, pitch: 0.05, tube: 0.015 }));

    // Rear link SET (lateral arms + toe link + camber/upper link — fig 4_30_09)
    const arms = group(`rearControlArmSet${side}`);
    arms.add(rot(at(box(`rearArmLower_${side}`, 0.58, 0.042, 0.07, 'cast'), x * 0.62, HUB_Y - 0.06, az + 0.02), 0, sx * 0.28, 0));
    arms.add(at(cyl(`rearArmLowerBush_${side}`, 0.02, 0.02, 0.045, 'castDark', 10), x * 0.32, HUB_Y - 0.06, az + 0.02));
    arms.add(rot(at(box(`rearArmUpper_${side}`, 0.48, 0.038, 0.055, 'cast'), x * 0.66, HUB_Y + 0.14, az + 0.04), 0, sx * 0.26, 0));
    arms.add(rot(at(capsule(`rearArmToe_${side}`, 0.016, 0.5, 'castDark', 8), x * 0.62, HUB_Y - 0.01, az - 0.18), 0, 0, Math.PI / 2 + sx * 0.34));
    arms.add(rot(at(capsule(`rearArmCamber_${side}`, 0.016, 0.46, 'castDark', 8), x * 0.64, HUB_Y + 0.05, az + 0.18), 0, 0, Math.PI / 2 + sx * 0.3));
    arms.add(at(box(`rearArmCarrier_${side}`, 0.06, 0.16, 0.07, 'cast'), kx, HUB_Y + 0.02, az));
    susp.add(arms);

    const rTrail = group(`rearTrailingArm${side}`);
    rTrail.add(rot(at(box(`rearTrailingArm${side}_arm`, 0.62, 0.05, 0.07, 'cast'),
      x * 0.55, HUB_Y - 0.08, az - 0.08), 0, sx * 0.2, 0));
    rTrail.add(at(cyl(`rearTrailingArm${side}_bush`, 0.025, 0.025, 0.055, 'castDark', 10),
      x * 0.25, HUB_Y - 0.08, az - 0.1));
    add(rTrail);

    const rCarrier = group(`rearWheelCarrier${side}`);
    rCarrier.add(at(box(`rearWheelCarrier${side}_body`, 0.09, 0.24, 0.11, 'cast'), kx, HUB_Y + 0.02, az));
    rCarrier.add(at(cyl(`rearWheelCarrier${side}_hubBore`, 0.05, 0.05, 0.06, 'castDark', 14), kx, HUB_Y, az));
    add(rCarrier);
  }
  // Rear ARB: tube 17.2–19.6 mm variants per model/transmission (SI doc p111 table).
  add(rot(at(cyl('rearAntiRollBar', 0.022, 0.022, TRACK * 1.8, 'steel', 12), 0, HUB_Y + 0.05, REAR_Z + 0.22), 0, 0, Math.PI / 2));
  add(at(box('rearSubframe', TRACK * 1.95, 0.09, 0.5, 'castDark'), 0, HUB_Y - 0.12, REAR_Z));

  // ── Steering (front) — 987 = HYDRAULIC power steering with variable ratio ──
  // Rack tube with rotary-valve body at the pinion + pressure/return fittings.
  {
    const rack = group('steeringRack');
    const rackY = HUB_Y + 0.16;
    const rackZ = FRONT_Z - 0.2;
    rack.add(rot(at(cyl('steeringRack_tube', 0.035, 0.035, TRACK * 1.7, 'cast', 12), 0, rackY, rackZ), 0, 0, Math.PI / 2));
    // Rotary valve / pinion housing on the driver side (hydraulic tell-tale)
    rack.add(at(cyl('steeringRack_valveBody', 0.05, 0.05, 0.12, 'cast', 14), 0.38, rackY + 0.02, rackZ));
    // Pressure + return line fittings on the valve body
    rack.add(rot(at(cyl('steeringRack_fitP', 0.014, 0.014, 0.07, 'bolt', 8), 0.44, rackY + 0.05, rackZ), 0, 0, Math.PI / 2));
    rack.add(rot(at(cyl('steeringRack_fitR', 0.014, 0.014, 0.07, 'bolt', 8), 0.44, rackY - 0.01, rackZ), 0, 0, Math.PI / 2));
    // Hydraulic power-cylinder sleeve on the rack tube
    rack.add(rot(at(cyl('steeringRack_powerCyl', 0.045, 0.045, 0.34, 'castDark', 14), -0.35, rackY, rackZ), 0, 0, Math.PI / 2));
    add(rack);
  }
  for (const [side, sx] of [['Left', -1], ['Right', 1]]) {
    add(at(cyl(`tieRod${side}`, 0.016, 0.016, 0.3, 'steel', 8), sx * TRACK * 0.78, HUB_Y + 0.05, FRONT_Z - 0.12), susp);
  }

  // PRIMARY psPump — belt-driven vane pump on the engine accessory face (rear).
  // Sits by the accessory drive plane used by the alternator (~0.35,0.05,-0.95)
  // and coolant pump pulley (~0.48,-0.12,-0.95) so the belt run reads as one system.
  {
    const pump = group('psPump');
    pump.add(rot(at(cyl('psPump_body', 0.07, 0.075, 0.16, 'cast', 18), 0.58, 0.02, -1.0), Math.PI / 2, 0, 0));
    pump.add(rot(at(cyl('psPump_rear', 0.055, 0.055, 0.05, 'castDark', 14), 0.58, 0.02, -1.1), Math.PI / 2, 0, 0));
    pump.add(at(torus('psPump_pulley', 0.055, 0.018, 'steel', 10, 22), 0.58, 0.02, -0.9));
    pump.add(rot(at(cyl('psPump_pulleyHub', 0.02, 0.02, 0.04, 'steel', 12), 0.58, 0.02, -0.9), Math.PI / 2, 0, 0));
    // Union fittings for suction / pressure
    pump.add(at(cyl('psPump_fitS', 0.016, 0.016, 0.05, 'bolt', 8), 0.58, 0.1, -1.02));
    pump.add(rot(at(cyl('psPump_fitP', 0.013, 0.013, 0.05, 'bolt', 8), 0.64, -0.02, -1.0), 0, 0, Math.PI / 2));
    add(pump);
  }

  // PRIMARY psReservoir — CHF 11S fluid reservoir in the front trunk (driver side),
  // clear of the brake master cylinder (~0.35,0.33,1.15) and fuse carrier (0.62,0.18,0.95).
  {
    const res = group('psReservoir');
    res.add(at(cyl('psReservoir_body', 0.055, 0.05, 0.15, PS_FLUID, 16), 0.55, 0.3, 1.32));
    res.add(at(cyl('psReservoir_cap', 0.035, 0.035, 0.03, 'cover', 12), 0.55, 0.39, 1.32));
    res.add(at(cyl('psReservoir_neck', 0.02, 0.02, 0.04, 'plastic', 10), 0.55, 0.21, 1.32));
    add(res);
  }

  // PRIMARY psLines — pressure line pump→rack, return line rack→reservoir and
  // suction reservoir→pump, hugging the right sill like the coolant pipes.
  {
    const lines = group('psLines');
    lines.add(tube('psLine_pressure', [
      [0.64, -0.02, -1.0],
      [0.62, -0.3, -0.5],
      [0.62, -0.36, 0.5],
      [0.55, -0.28, 1.1],
      [0.45, -0.19, 1.36],
    ], 0.013, 'tank', 36, 8));
    lines.add(tube('psLine_return', [
      [0.44, -0.2, 1.4],
      [0.5, 0.0, 1.36],
      [0.55, 0.22, 1.33],
    ], 0.012, 'hose', 20, 8));
    lines.add(tube('psLine_suction', [
      [0.56, 0.24, 1.28],
      [0.62, -0.2, 0.6],
      [0.6, -0.25, -0.4],
      [0.58, 0.08, -1.0],
    ], 0.015, 'hose', 32, 8));
    add(lines);
  }

  // PRIMARY steeringColumn — wheel → U-joint → rack pinion (unchanged vs 981).
  {
    const col = group('steeringColumn');
    const cx = 0.38;
    const rackY = HUB_Y + 0.18;
    const rackZ = FRONT_Z - 0.2;
    const wheelY = 0.62;
    const wheelZ = 0.48;
    const ujY = 0.22;
    const ujZ = 0.95;

    const shaftBetween = (name, r, ax, ay, az, bx, by, bz, mat) => {
      const dir = new THREE.Vector3(bx - ax, by - ay, bz - az);
      const len = dir.length();
      const mesh = cyl(name, r, r, len, mat, 12);
      mesh.position.set((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
      return mesh;
    };

    col.add(shaftBetween('steeringColumnLower', 0.022, cx, ujY, ujZ, cx, rackY, rackZ, 'castDark'));
    col.add(at(box('steeringUJoint', 0.05, 0.05, 0.05, 'cast'), cx, ujY, ujZ));
    col.add(shaftBetween('steeringColumnUpper', 0.028, cx, wheelY, wheelZ, cx, ujY, ujZ, 'castDark'));

    const colDir = new THREE.Vector3(0, ujY - wheelY, ujZ - wheelZ).normalize();
    const rim = torus('steeringWheelRim', 0.17, 0.016, 'castDark', 10, 28);
    rim.position.set(cx, wheelY, wheelZ);
    rim.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), colDir);
    col.add(rim);
    col.add(at(cyl('steeringWheelHub', 0.045, 0.045, 0.04, 'cast', 14), cx, wheelY, wheelZ));
    const spoke = box('steeringWheelSpoke', 0.22, 0.02, 0.03, 'castDark');
    spoke.position.set(cx, wheelY, wheelZ);
    spoke.quaternion.copy(rim.quaternion);
    col.add(spoke);
    add(col);
  }

  return susp;
}
