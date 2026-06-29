// Suspension & steering (id 'susp'). Authored directly in UNIFIED-SCENE CAR-SPACE
// so the four corners line up with the brakes/driveline (see AXLE in
// components/garage/xray-assemblies.ts): front axle z=+1.5, rear axle z=-1.5,
// half-track x=±0.82, hub centre y=-0.35. Coil springs sit ABOVE the hubs/rotors.
// No brake rotors/calipers here — those belong to the fbrakes/rbrakes assemblies.
//
// Coordinate convention: +Z = front, -Z = rear, +Y = up, +X = right.

import { group, box, cyl, torus, at, rot } from '../lib/primitives.mjs';

export const meta = {
  id: 'susp',
  label: 'Suspension & Steering',
  system: 'Suspension',
  node: 'suspension',
  hotspot3d: '0 0 0',
};

// Shared car-space anchors (mirror of AXLE in xray-assemblies.ts).
const FRONT_Z = 1.5;
const REAR_Z = -1.5;
const TRACK = 0.82;
const HUB_Y = -0.35;

// Materials (inline specs — no shared-lib edits).
const SPRING = { color: 0xc23535, metalness: 0.55, roughness: 0.42 }; // red coil
const STRUT = { color: 0x8a8d92, metalness: 0.9, roughness: 0.4 };
const SHOCK = { color: 0x6f7377, metalness: 0.85, roughness: 0.45 };
const HUB = { color: 0xbfc3c9, metalness: 0.9, roughness: 0.4 };

// A coil spring as a stack of red tori around a vertical axis.
function coilSpring(name, x, y, z, { r = 0.12, turns = 6, pitch = 0.075, tube: t = 0.022 } = {}) {
  const g = group(name);
  for (let i = 0; i < turns; i++) {
    g.add(rot(at(torus(`${name}_c${i}`, r, t, SPRING, 8, 16), x, y + i * pitch, z), Math.PI / 2, 0, 0));
  }
  return g;
}

export function build() {
  const susp = group('suspension');
  const add = (m, p = susp) => { p.add(m); return m; };

  // ── FRONT corners: MacPherson strut + coil + shock + lower arm + hub ──
  for (const [side, sx] of [['Left', -1], ['Right', 1]]) {
    const x = sx * TRACK;
    // Wheel hub / knuckle (axle along X)
    add(rot(at(cyl(`frontWheelHub${side}`, 0.13, 0.13, 0.14, HUB, 18), x, HUB_Y, FRONT_Z), 0, 0, Math.PI / 2));
    // Strut body (vertical), from just above the hub up to the top mount
    add(at(cyl(`frontStrut${side}`, 0.05, 0.06, 0.7, STRUT, 14), x, HUB_Y + 0.45, FRONT_Z));
    // Shock absorber (thin piston rod inside the lower strut)
    add(at(cyl(`frontShockAbsorber${side}`, 0.03, 0.03, 0.42, SHOCK, 10), x, HUB_Y + 0.18, FRONT_Z));
    // Coil spring around the strut — top (~+0.4) sits well above the rotor (~-0.05)
    add(coilSpring(`frontCoilSpring${side}`, x, HUB_Y + 0.05, FRONT_Z));
    // Lower control arm — from hub inward toward the subframe
    add(rot(at(box(`frontLowerControlArm${side}`, 0.55, 0.05, 0.12, 'cast'), x * 0.6, HUB_Y - 0.06, FRONT_Z - 0.05), 0, sx * 0.32, 0));
    // ARB drop link (sub) — connects the sway bar to the strut
    add(at(cyl(`frontArbEndLink${side}`, 0.018, 0.018, 0.22, 'steel', 8), x * 0.86, HUB_Y + 0.05, FRONT_Z - 0.16));
  }
  // Front anti-roll bar — bar across the front
  add(rot(at(cyl('frontAntiRollBar', 0.025, 0.025, TRACK * 1.85, 'steel', 12), 0, HUB_Y - 0.02, FRONT_Z - 0.18), 0, 0, Math.PI / 2));
  // Front subframe / crossmember
  add(at(box('frontSubframe', TRACK * 1.9, 0.08, 0.16, 'castDark'), 0, HUB_Y - 0.14, FRONT_Z - 0.08));

  // ── REAR corners: multilink arm set + coil + shock + hub ──
  for (const [side, sx] of [['Left', -1], ['Right', 1]]) {
    const x = sx * TRACK;
    add(rot(at(cyl(`rearWheelHub${side}`, 0.13, 0.13, 0.14, HUB, 18), x, HUB_Y, REAR_Z), 0, 0, Math.PI / 2));
    // Shock absorber (vertical)
    add(at(cyl(`rearShockAbsorber${side}`, 0.035, 0.04, 0.6, SHOCK, 12), x, HUB_Y + 0.32, REAR_Z));
    // Coil spring (slightly inboard, as on the 981 rear)
    add(coilSpring(`rearCoilSpring${side}`, x - sx * 0.12, HUB_Y + 0.05, REAR_Z, { turns: 6, pitch: 0.07 }));
    // Multi-link control-arm SET — upper / lower / toe / camber links as a named group
    const arms = group(`rearControlArmSet${side}`);
    add(rot(at(box(`rearArmLower_${side}`, 0.62, 0.05, 0.1, 'cast'), x * 0.62, HUB_Y - 0.05, REAR_Z + 0.02), 0, sx * 0.3, 0), arms);
    add(rot(at(box(`rearArmUpper_${side}`, 0.5, 0.045, 0.08, 'cast'), x * 0.66, HUB_Y + 0.16, REAR_Z + 0.04), 0, sx * 0.28, 0), arms);
    add(rot(at(box(`rearArmToe_${side}`, 0.58, 0.04, 0.07, 'castDark'), x * 0.62, HUB_Y - 0.02, REAR_Z - 0.18), 0, sx * 0.34, 0), arms);
    add(rot(at(box(`rearArmCamber_${side}`, 0.54, 0.04, 0.07, 'castDark'), x * 0.64, HUB_Y + 0.04, REAR_Z + 0.2), 0, sx * 0.3, 0), arms);
    susp.add(arms);
  }
  add(rot(at(cyl('rearAntiRollBar', 0.022, 0.022, TRACK * 1.8, 'steel', 12), 0, HUB_Y + 0.05, REAR_Z + 0.22), 0, 0, Math.PI / 2));
  add(at(box('rearSubframe', TRACK * 1.95, 0.09, 0.5, 'castDark'), 0, HUB_Y - 0.12, REAR_Z));

  // ── Steering (front) ──
  add(rot(at(cyl('steeringRack', 0.035, 0.035, TRACK * 1.7, 'cast', 12), 0, HUB_Y + 0.16, FRONT_Z - 0.2), 0, 0, Math.PI / 2));
  for (const [side, sx] of [['Left', -1], ['Right', 1]]) {
    add(at(cyl(`tieRod${side}`, 0.016, 0.016, 0.3, 'steel', 8), sx * TRACK * 0.78, HUB_Y + 0.05, FRONT_Z - 0.12), susp);
  }
  // Column + Sport Chrono wheel up into the cabin (left side / LHD)
  add(rot(at(cyl('steeringColumn', 0.022, 0.022, 0.7, 'castDark', 10), -0.34, HUB_Y + 0.45, FRONT_Z - 0.55), 0.7, 0, 0));
  add(rot(at(torus('steeringWheel', 0.17, 0.025, SPRING, 10, 28), -0.34, HUB_Y + 0.78, FRONT_Z - 0.95), 0.5, 0, 0));

  return susp;
}
