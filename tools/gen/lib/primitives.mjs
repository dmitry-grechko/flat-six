// Shared primitive builders. Thin wrappers over THREE geometry classes that
// attach a material spec (from materials.mjs) to mesh.userData so the GLB
// writer can emit pbrMetallicRoughness without a renderer.
//
// All geometry classes used here (Box, Cylinder, Torus, Tube, Sphere, Capsule)
// are pure math and run headless in Node.

import * as THREE from 'three';
import { MATERIALS } from './materials.mjs';

function resolveMat(mat) {
  if (typeof mat === 'string') {
    if (!MATERIALS[mat]) throw new Error(`Unknown material key: ${mat}`);
    return MATERIALS[mat];
  }
  return mat;
}

function tagMesh(mesh, name, mat) {
  mesh.name = name;
  mesh.userData.material = resolveMat(mat);
  return mesh;
}

export function group(name) {
  const g = new THREE.Group();
  g.name = name;
  return g;
}

export function box(name, w, h, d, mat, segs = 1) {
  return tagMesh(new THREE.Mesh(new THREE.BoxGeometry(w, h, d, segs, segs, segs)), name, mat);
}

// Rounded box approximation without the addon: a box is fine for CAD look, but
// we expose a chamfered variant for hero parts using more segments is overkill;
// keep plain box for size. (RoundedBoxGeometry addon also works headless, but
// plain boxes keep poly counts and file size low.)

export function cyl(name, rTop, rBot, h, mat, radial = 24) {
  return tagMesh(new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, radial)), name, mat);
}

// Partial / open cylinder shell (theta sweep) — used for cutaway bores & half shells.
export function cylArc(name, rTop, rBot, h, mat, radial = 24, thetaStart = 0, thetaLength = Math.PI * 2, openEnded = true) {
  return tagMesh(new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, radial, 1, openEnded, thetaStart, thetaLength)), name, mat);
}

// Capsule — nice for rounded canisters / coil packs / hose ends.
export function capsule(name, r, len, mat, radial = 16, caps = 6) {
  return tagMesh(new THREE.Mesh(new THREE.CapsuleGeometry(r, len, caps, radial)), name, mat);
}

// Lathe a 2D profile (array of [x,y]) around Y — for pulleys, hubs, filler necks.
export function lathe(name, profile, mat, segments = 32, phiStart = 0, phiLength = Math.PI * 2) {
  const pts = profile.map((p) => new THREE.Vector2(p[0], p[1]));
  return tagMesh(new THREE.Mesh(new THREE.LatheGeometry(pts, segments, phiStart, phiLength)), name, mat);
}

// Rounded box via a chamfer-ish extrude is heavy; instead expose a many-segment
// box used sparingly where smooth shading reads better.
export function roundBox(name, w, h, d, mat, seg = 3) {
  return tagMesh(new THREE.Mesh(new THREE.BoxGeometry(w, h, d, seg, seg, seg)), name, mat);
}

// Partial torus (theta sweep) — belt spans / arched clamp bands.
export function torusArc(name, r, tube, mat, radial = 12, tubular = 36, arc = Math.PI * 2) {
  return tagMesh(new THREE.Mesh(new THREE.TorusGeometry(r, tube, radial, tubular, arc)), name, mat);
}

export function tube(name, points, radius, mat, tubular = 24, radial = 12, closed = false) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(p[0], p[1], p[2])));
  return tagMesh(new THREE.Mesh(new THREE.TubeGeometry(curve, tubular, radius, radial, closed)), name, mat);
}

/**
 * Extrude a 2D footprint (array of [x,y] in the shape plane) along +Z by `depth`.
 * Used for irregular cast pans / flanges traced from WM CAD top views.
 * Caller typically rotates so the flange lies in XZ (car horizontal).
 */
export function extrude(name, shapePoints2d, depth, mat, opts = {}) {
  const {
    bevel = true,
    bevelThickness = Math.min(0.03, depth * 0.15),
    bevelSize = Math.min(0.03, depth * 0.12),
    bevelSegments = 2,
    curveSegments = 8,
  } = opts;
  const shape = new THREE.Shape(shapePoints2d.map((p) => new THREE.Vector2(p[0], p[1])));
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: bevel,
    bevelThickness,
    bevelSize,
    bevelSegments,
    curveSegments,
  });
  // Center on depth so at() places the mid-plane
  geo.translate(0, 0, -depth / 2);
  return tagMesh(new THREE.Mesh(geo), name, mat);
}

export function torus(name, r, tube, mat, radial = 12, tubular = 36) {
  return tagMesh(new THREE.Mesh(new THREE.TorusGeometry(r, tube, radial, tubular)), name, mat);
}

export function sphere(name, r, mat, segs = 18) {
  return tagMesh(new THREE.Mesh(new THREE.SphereGeometry(r, segs, Math.max(8, segs / 2))), name, mat);
}

// Helpers to place a mesh fluently.
export function at(obj, x, y, z) { obj.position.set(x, y, z); return obj; }
export function rot(obj, x, y, z) { obj.rotation.set(x, y, z); return obj; }

export { THREE };
