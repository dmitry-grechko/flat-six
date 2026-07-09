// Generic small-part builder, reused for several maintenance items by varying a
// small set of options. Demonstrates the "one builder, many components" pattern.
//
// Exposes makeCanister (cylindrical filters) and makePanel (panel air filter),
// plus three concrete components mapped to data.ts ids: oil, airfilter, plugs.

import { group, box, cyl, torus, at, rot } from '../lib/primitives.mjs';

// Cylindrical canister filter (oil filter cartridge / spin-on).
export function makeCanister({ node, r = 0.4, h = 1.1, bodyMat = 'red', capMat = 'steel', pleats = true }) {
  const g = group(node);
  const add = (m) => { g.add(m); return m; };
  add(at(cyl('body', r, r, h, bodyMat, 28), 0, 0, 0));
  add(at(cyl('topCap', r * 0.9, r * 0.9, 0.1, capMat, 28), 0, h / 2 + 0.04, 0));
  add(at(torus('seal', r * 0.7, 0.05, 'rubber', 10, 28), 0, -h / 2 + 0.05, 0));
  add(at(cyl('threadBoss', r * 0.35, r * 0.35, 0.18, capMat, 18), 0, -h / 2 - 0.06, 0));
  if (pleats) {
    for (let i = 0; i < 20; i++) {
      const a = (i / 20) * Math.PI * 2;
      add(rot(at(box(`pleat_${i}`, 0.03, h * 0.8, 0.06, 'paper'), Math.cos(a) * r * 1.01, 0, Math.sin(a) * r * 1.01), 0, a, 0));
    }
  }
  return g;
}

// Flat panel air filter element in a frame (cabin particle filter, HVAC).
export function makePanel({ node, w = 1.4, h = 0.9, d = 0.22 }) {
  const g = group(node);
  const add = (m) => { g.add(m); return m; };
  add(at(box('frame', w, d, h, 'rubber'), 0, 0, 0));
  // pleated media
  const n = 16;
  for (let i = 0; i < n; i++) {
    add(at(box(`pleat_${i}`, w * 0.92 / n, d * 0.7, h * 0.9, 'paper'), -w * 0.46 + (i + 0.5) * (w * 0.92 / n), 0, 0));
  }
  return g;
}

/**
 * 981 engine air-cleaner element (WM 242419) — long cylindrical cartridge
 * that slides into the side air-cleaner housing, not a flat panel.
 * Local +Y = cylinder axis (caller rotates into the housing).
 */
export function makeCylindricalAirCleaner({
  node,
  r = 0.09,
  len = 0.42,
  bodyMat = 'paper',
  mountMat = 'intake',
  ringMat = 'rubber',
}) {
  const g = group(node);
  const add = (m) => { g.add(m); return m; };
  // Pleated cylindrical media
  add(at(cyl('elementBody', r, r * 0.95, len, bodyMat, 28), 0, 0, 0));
  // Inner mesh hint
  add(at(cyl('elementCore', r * 0.45, r * 0.45, len * 0.92, 'steel', 16), 0, 0, 0));
  // Outer O-ring near mount end
  add(at(torus('oRingOuter', r * 1.02, 0.012, ringMat, 8, 24), 0, -len * 0.42, 0));
  // Mounting / end-cap (WM item 3) — open mouth toward scoop
  add(at(cyl('mounting', r * 1.08, r * 1.12, len * 0.18, mountMat, 24), 0, -len * 0.55, 0));
  add(at(torus('oRingInner', r * 0.85, 0.01, ringMat, 8, 20), 0, -len * 0.48, 0));
  // Positioning pegs on end face (WM Fig 2)
  add(at(cyl('positioningPinA', 0.012, 0.012, 0.04, mountMat, 8), 0, -len * 0.66, r * 0.55));
  add(at(cyl('positioningPinB', 0.012, 0.012, 0.04, mountMat, 8), 0, -len * 0.66, -r * 0.55));
  add(at(box('fasteningTab', 0.04, 0.03, 0.02, mountMat), r * 0.7, -len * 0.55, 0));
  return g;
}

// Spark plugs + coil pack assembly (id 'plugs').
export function makeCoilPlug({ node }) {
  const g = group(node);
  const add = (m) => { g.add(m); return m; };
  for (let i = 0; i < 3; i++) {
    const z = (i - 1) * 0.5;
    add(at(box(`coil_${i}`, 0.28, 0.36, 0.32, 'cover'), 0, 0.3, z));
    add(at(cyl(`coilBoot_${i}`, 0.09, 0.11, 0.3, 'rubber', 14), 0, 0.0, z));
    // spark plug below the boot
    add(at(cyl(`plugBody_${i}`, 0.07, 0.07, 0.22, 'steel', 14), 0, -0.28, z));
    add(at(cyl(`plugHex_${i}`, 0.09, 0.09, 0.08, 'aluDark', 6), 0, -0.14, z));
    add(at(cyl(`plugTip_${i}`, 0.02, 0.02, 0.1, 'steel', 8), 0, -0.43, z));
  }
  return g;
}

// ---- Concrete components ----

export const oilFilter = {
  meta: { id: 'oil', label: 'Oil Filter Element', system: 'Engine', node: 'oilFilter', hotspot3d: '0 0 0' },
  build: () => makeCanister({ node: 'oilFilter', r: 0.4, h: 1.1, bodyMat: 'red', pleats: true }),
};

export const airFilter = {
  meta: { id: 'airfilter', label: 'Panel Air Filter', system: 'Engine', node: 'airFilter', hotspot3d: '0 0 0' },
  build: () => makePanel({ node: 'airFilter', w: 1.4, h: 0.9, d: 0.22 }),
};

export const coilPlug = {
  meta: { id: 'plugs', label: 'Spark Plugs & Coils', system: 'Engine', node: 'coilPlug', hotspot3d: '0 0.1 0' },
  build: () => makeCoilPlug({ node: 'coilPlug' }),
};
