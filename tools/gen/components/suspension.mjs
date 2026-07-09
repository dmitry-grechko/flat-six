// Suspension & steering (id 'susp'). Authored directly in UNIFIED-SCENE CAR-SPACE
// so the four corners line up with the brakes/driveline (see AXLE in
// components/garage/xray-assemblies.ts): front axle z=+1.5, rear axle z=-1.5,
// half-track x=±0.82, hub centre y=-0.35. Coil springs sit ABOVE the hubs/rotors.
// No brake rotors/calipers here — those belong to the fbrakes/rbrakes assemblies.
//
// Coordinate convention: +Z = front, -Z = rear, +Y = up, +X = right.
//
// WM Tier A (981): front-strut-3339 Overview Of Front Spring Strut; rear-strut-5542
// Overview Of Rear Spring Strut; wheel-bearing-3295…3304 hub/bearing unit.

import { group, box, cyl, torus, tube, at, rot, capsule } from '../lib/primitives.mjs';

export const meta = {
  id: 'susp',
  label: 'Suspension & Steering',
  system: 'Suspension',
  node: 'suspension',
  hotspot3d: '0 0 0',
};

// Shared car-space anchors. TRACK is wide so the corners stack cleanly OUTSIDE
// the driveshafts (≈0.87) and just INSIDE the rotors (≈1.3): driveshaft → susp →
// rotor. FRONT/REAR_Z are 1.58 so that at worldScale 0.95 the wheelbase lands at
// z = ±1.5, matching the brakes' hotspots.
const FRONT_Z = 1.58;
const REAR_Z = -1.58;
const TRACK = 1.1;
const HUB_Y = -0.35;

// Materials (inline specs — no shared-lib edits).
const SPRING = { color: 0xc23535, metalness: 0.55, roughness: 0.42 }; // red coil
const STRUT = { color: 0x8a8d92, metalness: 0.9, roughness: 0.4 };
const SHOCK = { color: 0x6f7377, metalness: 0.85, roughness: 0.45 };
const HUB = { color: 0xbfc3c9, metalness: 0.9, roughness: 0.4 };
const BELLOWS = { color: 0x1a1c1f, metalness: 0.08, roughness: 0.9 };
const BUMP = { color: 0x2a2d33, metalness: 0.15, roughness: 0.85 };
const MOUNT = { color: 0xa8adb5, metalness: 0.88, roughness: 0.42 };

// Coil spring as stacked tori (WM: ~5–6 front coils, ~4.5–5 rear).
function coilSpring(name, x, y, z, { r = 0.095, turns = 6, pitch = 0.055, tube: t = 0.016 } = {}) {
  const g = group(name);
  for (let i = 0; i < turns; i++) {
    g.add(rot(at(torus(`${name}_c${i}`, r, t, SPRING, 8, 16), x, y + i * pitch, z), Math.PI / 2, 0, 0));
  }
  return g;
}

// Corrugated dust bellows (WM strut item — accordion sleeve on piston rod).
function dustBellows(name, x, y, z, { r = 0.038, h = 0.14, ribs = 5 } = {}) {
  const g = group(name);
  const pitch = h / ribs;
  for (let i = 0; i < ribs; i++) {
    const rr = r * (i % 2 === 0 ? 1.0 : 0.78);
    g.add(at(cyl(`${name}_r${i}`, rr, rr, pitch * 0.85, BELLOWS, 12), x, y + i * pitch, z));
  }
  return g;
}

// Triangular-ish spring-strut support mount (WM front -2- / rear -3-).
function strutTopMount(name, x, y, z, { scale = 1 } = {}) {
  const g = group(name);
  const s = scale;
  // Central hub
  g.add(at(cyl(`${name}_hub`, 0.028 * s, 0.028 * s, 0.04 * s, MOUNT, 14), x, y, z));
  // Triangular plate as three lobes + thin plate
  g.add(at(box(`${name}_plate`, 0.14 * s, 0.018 * s, 0.12 * s, MOUNT), x, y - 0.012 * s, z));
  for (let i = 0; i < 3; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / 3;
    const lx = x + Math.cos(a) * 0.055 * s;
    const lz = z + Math.sin(a) * 0.055 * s;
    g.add(at(cyl(`${name}_ear${i}`, 0.022 * s, 0.022 * s, 0.016 * s, MOUNT, 10), lx, y - 0.012 * s, lz));
    g.add(at(cyl(`${name}_bolt${i}`, 0.008 * s, 0.008 * s, 0.03 * s, 'bolt', 8), lx, y + 0.01 * s, lz));
  }
  // Top lock nut (WM -1- M14)
  g.add(at(cyl(`${name}_nut`, 0.016 * s, 0.016 * s, 0.014 * s, 'bolt', 6), x, y + 0.028 * s, z));
  return g;
}

// WM wheel-bearing unit: square 4-bolt flange + tiered hub (figs 3295 / 3301).
function wheelBearingHub(name, x, y, z, { sx = 1 } = {}) {
  const g = group(name);
  // Square-ish mounting flange (4 fastening screws)
  g.add(at(box(`${name}_flange`, 0.11, 0.11, 0.028, HUB), x, y, z));
  const holeR = 0.038;
  for (const [dx, dy] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) {
    g.add(at(cyl(`${name}_bolt_${dx}_${dy}`, 0.01, 0.01, 0.04, 'bolt', 8),
      x + dx * holeR, y + dy * holeR, z));
  }
  // Bearing barrel (inboard face)
  g.add(rot(at(cyl(`${name}_bearing`, 0.045, 0.045, 0.055, 'cast', 18), x - sx * 0.04, y, z), 0, 0, Math.PI / 2));
  // Hub flange / wheel face (outboard) — slim so it doesn't duplicate the brake rotor
  g.add(rot(at(cyl(`${name}_hubFace`, 0.055, 0.055, 0.03, HUB, 20), x + sx * 0.035, y, z), 0, 0, Math.PI / 2));
  // Stud ring hint
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    g.add(rot(at(cyl(`${name}_stud${i}`, 0.008, 0.008, 0.04, 'steel', 8),
      x + sx * 0.05, y + Math.sin(a) * 0.032, z + Math.cos(a) * 0.032), 0, 0, Math.PI / 2));
  }
  // Knuckle / carrier body under the bearing (slim upright)
  g.add(at(box(`${name}_knuckle`, 0.07, 0.18, 0.08, 'castDark'), x, y - 0.02, z));
  return g;
}

// Front lower control arm — A-arm / wishbone silhouette (WM wheel-bearing context).
function frontWishbone(name, kx, sx, y, z) {
  const g = group(name);
  const inX = kx * 0.35;
  const midX = kx * 0.55;
  // Forward leg
  g.add(rot(at(box(`${name}_fwd`, 0.42, 0.04, 0.055, 'cast'), midX, y, z + 0.08), 0, sx * 0.38, 0));
  // Aft leg
  g.add(rot(at(box(`${name}_aft`, 0.38, 0.04, 0.055, 'cast'), midX * 0.98, y, z - 0.1), 0, sx * 0.22, 0));
  // Outer ball-joint boss at knuckle
  g.add(at(cyl(`${name}_bj`, 0.028, 0.028, 0.04, 'cast', 12), kx, y, z));
  // Inner bushing bosses toward subframe
  g.add(at(cyl(`${name}_bushF`, 0.022, 0.022, 0.05, 'castDark', 10), inX, y, z + 0.12));
  g.add(at(cyl(`${name}_bushA`, 0.022, 0.022, 0.05, 'castDark', 10), inX, y, z - 0.14));
  return g;
}

export function build() {
  const susp = group('suspension');
  const add = (m, p = susp) => { p.add(m); return m; };

  // ── FRONT corners: MacPherson strut stack (WM 3339) + wishbone + hub unit ──
  for (const [side, sx] of [['Left', -1], ['Right', 1]]) {
    const x = sx * TRACK;
    const kx = x;
    const az = FRONT_Z;

    // Wheel hub & bearing unit (PRIMARY frontWheelHub*)
    add(wheelBearingHub(`frontWheelHub${side}`, kx, HUB_Y, az, { sx }));

    // Strut assembly group (PRIMARY frontStrut*) — body + seats + mount + bellows + bump
    const strut = group(`frontStrut${side}`);
    const bodyY = HUB_Y + 0.28;
    // Main damper tube with lower spring seat flange (WM shock body)
    strut.add(at(cyl(`frontStrut${side}_body`, 0.038, 0.042, 0.42, STRUT, 14), kx, bodyY, az));
    strut.add(at(cyl(`frontStrut${side}_seat`, 0.1, 0.1, 0.018, STRUT, 18), kx, HUB_Y + 0.12, az));
    strut.add(at(cyl(`frontStrut${side}_seatLip`, 0.085, 0.09, 0.012, 'castDark', 16), kx, HUB_Y + 0.135, az));
    // Upper spring plate (WM -5- / concave washer)
    strut.add(at(cyl(`frontStrut${side}_upperPlate`, 0.095, 0.095, 0.014, MOUNT, 16), kx, HUB_Y + 0.48, az));
    // Bump stop under mount (WM conical)
    strut.add(at(cyl(`frontStrut${side}_bump`, 0.04, 0.022, 0.055, BUMP, 12), kx, HUB_Y + 0.52, az));
    // Triangular support mount (WM -2-)
    strut.add(strutTopMount(`frontStrut${side}_mount`, kx, HUB_Y + 0.58, az));
    // Dust bellows inside spring envelope
    strut.add(dustBellows(`frontStrut${side}_bellows`, kx, HUB_Y + 0.2, az, { r: 0.036, h: 0.16, ribs: 6 }));
    // PASM wire stub at bottom of strut (WM callout)
    strut.add(tube(`frontStrut${side}_pasm`, [
      [kx, HUB_Y + 0.05, az],
      [kx - sx * 0.04, HUB_Y - 0.02, az - 0.06],
      [kx - sx * 0.08, HUB_Y - 0.06, az - 0.12],
    ], 0.006, 'hose', 8, 6));
    // Fork / clamp into knuckle
    strut.add(at(box(`frontStrut${side}_fork`, 0.055, 0.08, 0.06, 'castDark'), kx, HUB_Y + 0.06, az));
    add(strut);

    // Shock absorber piston rod (PRIMARY) — thin rod through bellows
    add(at(cyl(`frontShockAbsorber${side}`, 0.014, 0.014, 0.38, SHOCK, 10), kx, HUB_Y + 0.32, az));

    // Coil spring (PRIMARY) — ~6 coils around strut
    add(coilSpring(`frontCoilSpring${side}`, kx, HUB_Y + 0.14, az, { r: 0.092, turns: 6, pitch: 0.052, tube: 0.015 }));

    // Lower control arm wishbone (PRIMARY)
    add(frontWishbone(`frontLowerControlArm${side}`, kx, sx, HUB_Y - 0.08, az));

    // Lower trailing arm (WM 401719 / Fig Identifying Lower Trailing Arm Mounting)
    const trail = group(`frontTrailingArm${side}`);
    trail.add(rot(at(box(`frontTrailingArm${side}_arm`, 0.52, 0.045, 0.06, 'cast'),
      kx * 0.58, HUB_Y - 0.1, az - 0.22), 0, sx * 0.55, 0));
    trail.add(at(cyl(`frontTrailingArm${side}_bushInner`, 0.024, 0.024, 0.05, 'castDark', 10),
      kx * 0.28, HUB_Y - 0.1, az - 0.28));
    trail.add(at(cyl(`frontTrailingArm${side}_bushOuter`, 0.022, 0.022, 0.045, 'castDark', 10),
      kx * 0.88, HUB_Y - 0.08, az - 0.12));
    // Control-arm spoiler / aero cover hint (WM Fig Identifying Control Arm Spoiler)
    trail.add(at(box(`frontTrailingArm${side}_spoiler`, 0.28, 0.02, 0.1, 'cover'),
      kx * 0.55, HUB_Y - 0.14, az - 0.18));
    add(trail);

    // Wheel carrier / upright alias (PRIMARY) — knuckle already in hub unit
    const carrier = group(`frontWheelCarrier${side}`);
    carrier.add(at(box(`frontWheelCarrier${side}_body`, 0.08, 0.22, 0.1, 'cast'), kx, HUB_Y + 0.02, az));
    carrier.add(at(cyl(`frontWheelCarrier${side}_strutClamp`, 0.04, 0.04, 0.1, 'castDark', 12), kx, HUB_Y + 0.12, az));
    add(carrier);

    // ARB drop link (sub)
    add(at(cyl(`frontArbEndLink${side}`, 0.014, 0.014, 0.18, 'steel', 8), kx * 0.95, HUB_Y + 0.04, az - 0.16));
  }
  add(rot(at(cyl('frontAntiRollBar', 0.025, 0.025, TRACK * 1.85, 'steel', 12), 0, HUB_Y - 0.02, FRONT_Z - 0.18), 0, 0, Math.PI / 2));
  add(at(box('frontSubframe', TRACK * 1.9, 0.08, 0.16, 'castDark'), 0, HUB_Y - 0.14, FRONT_Z - 0.08));

  // ── REAR corners: multilink + strut stack (WM 5542) + hub unit ──
  for (const [side, sx] of [['Left', -1], ['Right', 1]]) {
    const x = sx * TRACK;
    const kx = x;
    const az = REAR_Z;
    const springX = kx - sx * 0.1;

    add(wheelBearingHub(`rearWheelHub${side}`, kx, HUB_Y, az, { sx }));

    // Rear shock / strut body (PRIMARY rearShockAbsorber*) — full stack like WM 5542
    const shock = group(`rearShockAbsorber${side}`);
    shock.add(at(cyl(`rearShockAbsorber${side}_body`, 0.036, 0.04, 0.4, SHOCK, 14), springX, HUB_Y + 0.28, az));
    shock.add(at(cyl(`rearShockAbsorber${side}_seat`, 0.095, 0.095, 0.016, STRUT, 16), springX, HUB_Y + 0.14, az));
    shock.add(at(cyl(`rearShockAbsorber${side}_rod`, 0.012, 0.012, 0.28, 'steel', 10), springX, HUB_Y + 0.42, az));
    shock.add(at(cyl(`rearShockAbsorber${side}_upperPlate`, 0.09, 0.09, 0.014, MOUNT, 16), springX, HUB_Y + 0.46, az));
    shock.add(at(cyl(`rearShockAbsorber${side}_bump`, 0.032, 0.02, 0.045, BUMP, 12), springX, HUB_Y + 0.5, az));
    shock.add(dustBellows(`rearShockAbsorber${side}_bellows`, springX, HUB_Y + 0.22, az, { r: 0.034, h: 0.14, ribs: 5 }));
    shock.add(strutTopMount(`rearShockAbsorber${side}_mount`, springX, HUB_Y + 0.56, az, { scale: 0.95 }));
    // PASM electric line on damper tube (WM -10- note)
    shock.add(tube(`rearShockAbsorber${side}_pasm`, [
      [springX, HUB_Y + 0.08, az],
      [springX - sx * 0.05, HUB_Y + 0.02, az + 0.08],
      [springX - sx * 0.1, HUB_Y - 0.04, az + 0.14],
    ], 0.006, 'hose', 8, 6));
    add(shock);

    // Coil spring (PRIMARY) — ~5 coils, slightly inboard
    add(coilSpring(`rearCoilSpring${side}`, springX, HUB_Y + 0.15, az, { r: 0.09, turns: 5, pitch: 0.05, tube: 0.015 }));

    // Multi-link control-arm SET (PRIMARY) — clearer link silhouettes
    const arms = group(`rearControlArmSet${side}`);
    // Lower trailing / lateral
    arms.add(rot(at(box(`rearArmLower_${side}`, 0.58, 0.042, 0.07, 'cast'), x * 0.62, HUB_Y - 0.06, az + 0.02), 0, sx * 0.28, 0));
    arms.add(at(cyl(`rearArmLowerBush_${side}`, 0.02, 0.02, 0.045, 'castDark', 10), x * 0.32, HUB_Y - 0.06, az + 0.02));
    // Upper link
    arms.add(rot(at(box(`rearArmUpper_${side}`, 0.48, 0.038, 0.055, 'cast'), x * 0.66, HUB_Y + 0.14, az + 0.04), 0, sx * 0.26, 0));
    // Toe link (slimmer, aft)
    arms.add(rot(at(capsule(`rearArmToe_${side}`, 0.016, 0.5, 'castDark', 8), x * 0.62, HUB_Y - 0.01, az - 0.18), 0, 0, Math.PI / 2 + sx * 0.34));
    // Camber link (fwd)
    arms.add(rot(at(capsule(`rearArmCamber_${side}`, 0.016, 0.46, 'castDark', 8), x * 0.64, HUB_Y + 0.05, az + 0.18), 0, 0, Math.PI / 2 + sx * 0.3));
    // Outer carrier boss
    arms.add(at(box(`rearArmCarrier_${side}`, 0.06, 0.16, 0.07, 'cast'), kx, HUB_Y + 0.02, az));
    susp.add(arms);

    // Rear trailing arm (PRIMARY) — WM drive-shaft R&I references toe + trailing arm
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
  add(rot(at(cyl('rearAntiRollBar', 0.022, 0.022, TRACK * 1.8, 'steel', 12), 0, HUB_Y + 0.05, REAR_Z + 0.22), 0, 0, Math.PI / 2));
  add(at(box('rearSubframe', TRACK * 1.95, 0.09, 0.5, 'castDark'), 0, HUB_Y - 0.12, REAR_Z));

  // ── Steering (front) — LHD column on driver (−X), visible wheel + shaft ──
  add(rot(at(cyl('steeringRack', 0.035, 0.035, TRACK * 1.7, 'cast', 12), 0, HUB_Y + 0.16, FRONT_Z - 0.2), 0, 0, Math.PI / 2));
  for (const [side, sx] of [['Left', -1], ['Right', 1]]) {
    add(at(cyl(`tieRod${side}`, 0.016, 0.016, 0.3, 'steel', 8), sx * TRACK * 0.78, HUB_Y + 0.05, FRONT_Z - 0.12), susp);
  }
  // PRIMARY steeringColumn — driver side (+X) with wheel rim for LHD packaging.
  {
    const col = group('steeringColumn');
    const cx = 0.38;
    // Lower intermediate shaft → rack pinion
    col.add(rot(at(cyl('steeringColumnLower', 0.022, 0.022, 0.35, 'castDark', 12), cx, HUB_Y + 0.22, FRONT_Z - 0.35), 0.35, 0, 0));
    col.add(at(box('steeringUJoint', 0.05, 0.05, 0.05, 'cast'), cx, HUB_Y + 0.38, FRONT_Z - 0.55));
    // Upper column toward wheel
    col.add(rot(at(cyl('steeringColumnUpper', 0.028, 0.028, 0.55, 'castDark', 12), cx, 0.35, 0.95), 0.55, 0, 0));
    // Steering wheel (rim + hub) — driver side landmark
    col.add(rot(at(torus('steeringWheelRim', 0.17, 0.016, 'castDark', 10, 28), cx, 0.58, 0.72), 0.55, 0, 0));
    col.add(at(cyl('steeringWheelHub', 0.045, 0.045, 0.04, 'cast', 14), cx, 0.52, 0.78));
    col.add(at(box('steeringWheelSpoke', 0.22, 0.02, 0.03, 'castDark'), cx, 0.55, 0.75));
    add(col);
  }

  return susp;
}
