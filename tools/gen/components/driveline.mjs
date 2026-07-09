// Driveline (id 'driveline') — mid-engine RWD 981 half-shafts, CVs, diff nose,
// mounts. Authored in UNIFIED-SCENE CAR-SPACE (aligns with brakes/susp AXLE).
//
// WM refs: drive-shaft-5465 (flange + 6 bolts + bellows), CV joint 5473,
// diff/flanged shaft 5917–5925. Coordinate: +Z front, -Z rear, +Y up, +X right.

import { group, box, cyl, sphere, at, rot } from '../lib/primitives.mjs';

export const meta = {
  id: 'driveline',
  label: 'Driveline',
  system: 'Transmission',
  node: 'driveline',
  hotspot3d: '0 0 0',
};

const REAR_Z = -1.58;
const HUB_Y = -0.35;
const HALF_OUTER = 0.92;
const HALF_INNER = 0.18;

const SHAFT = { color: 0x8a8d92, metalness: 0.95, roughness: 0.3 };
const JOINT = { color: 0xbfc3c9, metalness: 0.9, roughness: 0.4 };
const BOOT = { color: 0x1a1c1f, metalness: 0.08, roughness: 0.9 };
const FLANGE = { color: 0xa8adb5, metalness: 0.92, roughness: 0.35 };

function cvBellows(name, x, y, z, { sx = 1, r = 0.055 } = {}) {
  const g = group(name);
  for (let i = 0; i < 5; i++) {
    const rr = r * (i % 2 === 0 ? 1 : 0.78);
    g.add(rot(at(cyl(`${name}_r${i}`, rr, rr, 0.022, BOOT, 12),
      x + sx * (i - 2) * 0.018, y, z), 0, 0, Math.PI / 2));
  }
  return g;
}

function flangeWithBolts(name, x, y, z, { sx = 1, bolts = 6 } = {}) {
  const g = group(name);
  g.add(rot(at(cyl(`${name}_disc`, 0.09, 0.09, 0.028, FLANGE, 24), x, y, z), 0, 0, Math.PI / 2));
  g.add(rot(at(cyl(`${name}_hub`, 0.045, 0.045, 0.04, JOINT, 16), x - sx * 0.02, y, z), 0, 0, Math.PI / 2));
  for (let i = 0; i < bolts; i++) {
    const a = (i / bolts) * Math.PI * 2;
    g.add(rot(at(cyl(`${name}_bolt${i}`, 0.01, 0.01, 0.035, 'bolt', 8),
      x + sx * 0.01, y + Math.sin(a) * 0.065, z + Math.cos(a) * 0.065), 0, 0, Math.PI / 2));
  }
  return g;
}

export function build() {
  const driveline = group('driveline');
  const add = (m, p = driveline) => { p.add(m); return m; };

  add(rot(at(cyl('engineToPdkAdapter', 0.34, 0.34, 0.12, JOINT, 24), 0, HUB_Y + 0.18, -1.1), Math.PI / 2, 0, 0));

  const mounts = group('engineMounts');
  for (const sx of [-1, 1]) {
    const sk = sx < 0 ? 'L' : 'R';
    add(at(box(`engMountBracket_${sk}`, 0.16, 0.1, 0.14, 'cast'), sx * 0.55, HUB_Y + 0.1, -1.0), mounts);
    add(at(cyl(`engMountRubber_${sk}`, 0.06, 0.06, 0.1, 'rubber', 12), sx * 0.55, HUB_Y - 0.02, -1.0), mounts);
  }
  driveline.add(mounts);

  add(at(box('pdkTransmissionMount', 0.3, 0.14, 0.18, 'cast'), 0, HUB_Y - 0.1, -1.9));
  add(at(cyl('pdkMountRubber', 0.07, 0.07, 0.12, 'rubber', 12), 0, HUB_Y - 0.22, -1.9));

  // Differential / final-drive housing (WM 39 / 5925)
  const differential = group('differential');
  add(at(box('differentialHousing', 0.42, 0.28, 0.36, 'cast'), 0, HUB_Y, REAR_Z + 0.02), differential);
  add(rot(at(cyl('diffOutput', 0.12, 0.12, 0.28, JOINT, 18), 0, HUB_Y, REAR_Z), 0, 0, Math.PI / 2), differential);
  add(rot(at(cyl('halfshaftFlangeLeft', 0.08, 0.08, 0.04, FLANGE, 20), -0.14, HUB_Y, REAR_Z), 0, 0, Math.PI / 2), differential);
  add(rot(at(cyl('halfshaftFlangeRight', 0.08, 0.08, 0.04, FLANGE, 20), 0.14, HUB_Y, REAR_Z), 0, 0, Math.PI / 2), differential);
  add(rot(at(cyl('diffProtectiveSleeve', 0.05, 0.04, 0.1, 'cover', 12), 0.22, HUB_Y, REAR_Z), 0, 0, Math.PI / 2), differential);
  driveline.add(differential);

  // PRIMARY groups for shafts / CVs / bellows (WM 422119)
  const shaftL = group('rearDriveShaftLeft');
  const shaftR = group('rearDriveShaftRight');
  const innerCVs = group('innerCVJoints');
  const outerCVs = group('outerCVJoints');
  const bellows = group('cvBellows');

  for (const [tag, sx, shaft] of [['Left', -1, shaftL], ['Right', 1, shaftR]]) {
    const mid = sx * (HALF_INNER + HALF_OUTER) / 2;
    const len = HALF_OUTER - HALF_INNER;

    shaft.add(flangeWithBolts(`rearDriveShaft${tag}_flangeInner`, sx * HALF_INNER, HUB_Y, REAR_Z, { sx }));
    shaft.add(rot(at(cyl(`rearDriveShaft${tag}_tube`, 0.028, 0.028, len * 0.72, SHAFT, 12),
      mid, HUB_Y, REAR_Z), 0, 0, Math.PI / 2));
    shaft.add(rot(at(cyl(`rearDriveShaft${tag}_stub`, 0.022, 0.022, 0.08, SHAFT, 10),
      sx * (HALF_OUTER + 0.04), HUB_Y, REAR_Z), 0, 0, Math.PI / 2));

    innerCVs.add(at(sphere(`innerCVJoint${tag}`, 0.065, JOINT, 14), sx * HALF_INNER, HUB_Y, REAR_Z));
    outerCVs.add(at(sphere(`outerCVJoint${tag}`, 0.058, JOINT, 14), sx * HALF_OUTER, HUB_Y, REAR_Z));

    bellows.add(cvBellows(`innerCVBellows${tag}`, sx * (HALF_INNER + 0.06), HUB_Y, REAR_Z, { sx, r: 0.052 }));
    bellows.add(cvBellows(`outerCVBellows${tag}`, sx * (HALF_OUTER - 0.05), HUB_Y, REAR_Z, { sx: -sx, r: 0.048 }));
  }

  driveline.add(shaftL);
  driveline.add(shaftR);
  driveline.add(innerCVs);
  driveline.add(outerCVs);
  driveline.add(bellows);

  const lugs = group('lugBolts');
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    add(rot(at(cyl(`lug_${i}`, 0.016, 0.016, 0.1, 'bolt', 8),
      HALF_OUTER + 0.04, HUB_Y + Math.sin(a) * 0.06, REAR_Z + Math.cos(a) * 0.06), 0, 0, Math.PI / 2), lugs);
  }
  driveline.add(lugs);

  return driveline;
}
