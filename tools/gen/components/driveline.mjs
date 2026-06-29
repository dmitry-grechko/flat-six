// Driveline (id 'driveline'). Rear-drive half-shaft / CV-joint / mount assembly
// for the mid-engine RWD 981, authored in UNIFIED-SCENE CAR-SPACE so it lines up
// with the brakes & suspension (AXLE in xray-assemblies.ts): rear axle z=-1.5,
// half-track x=±0.82, hub centre y=-0.35. The drivetrain leads from the engine/
// transaxle (rear-centre) out to the rear hubs/rotors.
//
// Coordinate convention: +Z = front, -Z = rear, +Y = up, +X = right.
// Renders NO tires/rims/wheels — only shafts, CV joints, hub flanges, mounts, bolts.

import { group, box, cyl, sphere, at, rot } from '../lib/primitives.mjs';

export const meta = {
  id: 'driveline',
  label: 'Driveline',
  system: 'Transmission',
  node: 'driveline',
  hotspot3d: '0 0 0',
};

const REAR_Z = -1.5;
const FRONT_Z = 1.5;
const TRACK = 0.82;
const HUB_Y = -0.35;

const SHAFT = { color: 0x8a8d92, metalness: 0.95, roughness: 0.3 };
const JOINT = { color: 0xbfc3c9, metalness: 0.9, roughness: 0.4 };
const HUBFLANGE = { color: 0xa9adb3, metalness: 0.9, roughness: 0.42 };

export function build() {
  const driveline = group('driveline');
  const add = (m, p = driveline) => { p.add(m); return m; };

  // Engine→PDK adapter / bellhousing interface (between engine and transaxle)
  add(rot(at(cyl('engineToPdkAdapter', 0.34, 0.34, 0.12, JOINT, 24), 0, HUB_Y + 0.18, -1.05), Math.PI / 2, 0, 0));

  // Engine mounts (hydraulic rubber) — left & right of the engine/transaxle
  const mounts = group('engineMounts');
  for (const sx of [-1, 1]) {
    add(at(box(`engMountBracket_${sx < 0 ? 'L' : 'R'}`, 0.16, 0.1, 0.14, 'cast'), sx * 0.55, HUB_Y + 0.1, -0.95), mounts);
    add(at(cyl(`engMountRubber_${sx < 0 ? 'L' : 'R'}`, 0.06, 0.06, 0.1, 'rubber', 12), sx * 0.55, HUB_Y - 0.02, -0.95), mounts);
  }
  driveline.add(mounts);

  // PDK / transmission rear mount
  add(at(box('pdkTransmissionMount', 0.3, 0.14, 0.18, 'cast'), 0, HUB_Y - 0.1, -1.85));
  add(at(cyl('pdkMountRubber', 0.07, 0.07, 0.12, 'rubber', 12), 0, HUB_Y - 0.22, -1.85));

  // Rear half-shafts: from the differential (centre-rear) out to each rear hub.
  for (const sx of [-1, 1]) {
    const tag = sx < 0 ? 'L' : 'R';
    // shaft runs along X from near-centre to the hub at the rear axle line
    add(rot(at(cyl(`rearHalfShaft_${tag}`, 0.03, 0.03, TRACK - 0.18, SHAFT, 10), sx * (TRACK / 2), HUB_Y, REAR_Z), 0, 0, Math.PI / 2));
    add(at(sphere(`innerCV_${tag}`, 0.07, JOINT, 12), sx * 0.18, HUB_Y, REAR_Z));   // inner CV (by diff)
    add(at(sphere(`outerCV_${tag}`, 0.06, JOINT, 12), sx * (TRACK - 0.1), HUB_Y, REAR_Z)); // outer CV (by hub)
  }
  // Central differential nose / output housing where the shafts meet
  add(rot(at(cyl('diffOutput', 0.12, 0.12, 0.22, JOINT, 18), 0, HUB_Y, REAR_Z), 0, 0, Math.PI / 2));

  // Rear wheel hub flanges (mount faces only — NO tire/rim) at the rear corners
  const rear = group('rearWheels');
  for (const sx of [-1, 1]) {
    add(rot(at(cyl(`rearHubFlange_${sx < 0 ? 'L' : 'R'}`, 0.12, 0.12, 0.08, HUBFLANGE, 20), sx * TRACK, HUB_Y, REAR_Z), 0, 0, Math.PI / 2), rear);
  }
  driveline.add(rear);

  // Front wheel hub flanges (RWD — no driveshaft, but the hubs exist) at the front corners
  const front = group('frontWheels');
  for (const sx of [-1, 1]) {
    add(rot(at(cyl(`frontHubFlange_${sx < 0 ? 'L' : 'R'}`, 0.12, 0.12, 0.08, HUBFLANGE, 20), sx * TRACK, HUB_Y, FRONT_Z), 0, 0, Math.PI / 2), front);
  }
  driveline.add(front);

  // Lug bolts: 5-bolt circle on the right rear hub face
  const lugs = group('lugBolts');
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    add(rot(at(cyl(`lug_${i}`, 0.016, 0.016, 0.1, 'bolt', 8),
      TRACK + 0.05, HUB_Y + Math.sin(a) * 0.07, REAR_Z + Math.cos(a) * 0.07), 0, 0, Math.PI / 2), lugs);
  }
  driveline.add(lugs);

  return driveline;
}
