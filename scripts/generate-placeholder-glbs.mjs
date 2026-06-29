/**
 * Pure Node.js GLB writer — no browser polyfills needed.
 * Generates susp.glb, elec.glb, driveline.glb
 * Run: node scripts/generate-placeholder-glbs.mjs
 */

import * as THREE from '/Users/dmytrogrechko/Development/porsche/node_modules/three/build/three.module.js';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, '../public/models/components');

// ── GLB binary writer ──────────────────────────────────────────────────────

function pad4(n) { return Math.ceil(n / 4) * 4; }

/**
 * Build a GLB from a list of mesh descriptors.
 * Each descriptor: { name, geometry: THREE.BufferGeometry, color: [r,g,b] }
 */
function buildGLB(meshes) {
  const binParts   = [];   // ArrayBuffer fragments that go into the BIN chunk
  const accessors  = [];
  const bufferViews= [];
  const gltfMeshes = [];
  const gltfNodes  = [];
  const materials  = [];

  let binOffset = 0;

  function addBufferView(data, target) {
    const bv = { buffer: 0, byteOffset: binOffset, byteLength: data.byteLength };
    if (target) bv.target = target;
    bufferViews.push(bv);
    binParts.push(data.buffer instanceof ArrayBuffer ? data.buffer : data.buffer);
    binOffset += data.byteLength;
    return bufferViews.length - 1;
  }

  function addAccessor(bvIdx, componentType, count, type, min, max) {
    const acc = { bufferView: bvIdx, byteOffset: 0, componentType, count, type };
    if (min !== undefined) acc.min = min;
    if (max !== undefined) acc.max = max;
    accessors.push(acc);
    return accessors.length - 1;
  }

  meshes.forEach(({ name, geometry, color, matrix }) => {
    const geo = geometry.clone();
    if (matrix) geo.applyMatrix4(matrix);
    geo.computeVertexNormals();

    const posArr = geo.attributes.position.array;
    const normArr= geo.attributes.normal.array;
    const idxArr = geo.index
      ? (geo.index.array.length > 65535 ? new Uint32Array(geo.index.array) : new Uint16Array(geo.index.array))
      : null;

    // Position
    const posF32 = new Float32Array(posArr);
    const posBV  = addBufferView(posF32, 34962 /* ARRAY_BUFFER */);
    const posBox = geo.boundingBox || (geo.computeBoundingBox(), geo.boundingBox);
    const posAcc = addAccessor(posBV, 5126, posF32.length / 3, 'VEC3',
      [posBox.min.x, posBox.min.y, posBox.min.z],
      [posBox.max.x, posBox.max.y, posBox.max.z]);

    // Normal
    const normF32= new Float32Array(normArr);
    const normBV = addBufferView(normF32, 34962);
    const normAcc= addAccessor(normBV, 5126, normF32.length / 3, 'VEC3');

    // Indices
    let idxAcc = undefined;
    if (idxArr) {
      const idxBV = addBufferView(idxArr, 34963 /* ELEMENT_ARRAY_BUFFER */);
      idxAcc = addAccessor(idxBV, idxArr instanceof Uint32Array ? 5125 : 5123, idxArr.length, 'SCALAR');
    }

    // Material
    const [r, g, b] = color;
    materials.push({
      name,
      pbrMetallicRoughness: {
        baseColorFactor: [r / 255, g / 255, b / 255, 1.0],
        metallicFactor: 0.65,
        roughnessFactor: 0.5,
      }
    });
    const matIdx = materials.length - 1;

    const prim = { attributes: { POSITION: posAcc, NORMAL: normAcc }, material: matIdx };
    if (idxAcc !== undefined) prim.indices = idxAcc;
    gltfMeshes.push({ name, primitives: [prim] });
    gltfNodes.push({ name, mesh: gltfMeshes.length - 1 });
  });

  // Pad each binPart to 4-byte boundary
  const paddedParts = binParts.map(ab => {
    const buf = ab instanceof ArrayBuffer ? ab : ab.buffer;
    const padded = pad4(buf.byteLength);
    if (padded === buf.byteLength) return new Uint8Array(buf);
    const out = new Uint8Array(padded);
    out.set(new Uint8Array(buf));
    return out;
  });
  const totalBin = paddedParts.reduce((s, p) => s + p.byteLength, 0);

  const json = JSON.stringify({
    asset: { version: '2.0', generator: 'FLAT·SIX placeholder generator' },
    scene: 0,
    scenes: [{ nodes: gltfNodes.map((_, i) => i) }],
    nodes: gltfNodes,
    meshes: gltfMeshes,
    accessors,
    bufferViews,
    buffers: [{ byteLength: totalBin }],
    materials,
  });

  const jsonBytes  = new TextEncoder().encode(json);
  const jsonPadded = pad4(jsonBytes.byteLength);
  const jsonChunk  = new Uint8Array(jsonPadded);
  jsonChunk.fill(0x20); // pad with spaces
  jsonChunk.set(jsonBytes);

  // Total = 12 (header) + 8 (json chunk header) + jsonPadded + 8 (bin chunk header) + totalBin
  const totalLen = 12 + 8 + jsonPadded + 8 + totalBin;
  const out = new DataView(new ArrayBuffer(totalLen));
  let o = 0;

  // Header
  out.setUint32(o, 0x46546C67, true); o += 4; // magic "glTF"
  out.setUint32(o, 2,          true); o += 4; // version
  out.setUint32(o, totalLen,   true); o += 4; // total length

  // JSON chunk
  out.setUint32(o, jsonPadded,   true); o += 4;
  out.setUint32(o, 0x4E4F534A,   true); o += 4; // "JSON"
  new Uint8Array(out.buffer, o, jsonPadded).set(jsonChunk); o += jsonPadded;

  // BIN chunk
  out.setUint32(o, totalBin,    true); o += 4;
  out.setUint32(o, 0x004E4942,  true); o += 4; // "BIN\0"
  for (const part of paddedParts) {
    new Uint8Array(out.buffer, o, part.byteLength).set(part);
    o += part.byteLength;
  }

  return Buffer.from(out.buffer);
}

// ── Geometry helpers ───────────────────────────────────────────────────────

function box(w, h, d) { return new THREE.BoxGeometry(w, h, d); }
function cyl(r, h, seg = 12) { return new THREE.CylinderGeometry(r, r, h, seg); }
function cyl2(rt, rb, h, seg = 12) { return new THREE.CylinderGeometry(rt, rb, h, seg); }
function torus(r, tube, rseg = 10, tseg = 24) { return new THREE.TorusGeometry(r, tube, rseg, tseg); }
function sphere(r, wseg = 12, hseg = 8) { return new THREE.SphereGeometry(r, wseg, hseg); }

function mat4(px = 0, py = 0, pz = 0, rx = 0, ry = 0, rz = 0) {
  const m = new THREE.Matrix4();
  m.compose(
    new THREE.Vector3(px, py, pz),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)),
    new THREE.Vector3(1, 1, 1)
  );
  return m;
}

// ── Suspension scene ───────────────────────────────────────────────────────

function buildSusp() {
  const steel  = [136, 153, 170];
  const alum   = [176, 184, 193];
  const red    = [180,  34,   0];
  const rubber = [ 42,  42,  42];
  const PI2 = Math.PI / 2;

  const meshes = [];

  for (const sx of [-1, 1]) {
    const s = sx;
    // Strut body
    meshes.push({ name: `frontStrut_${s<0?'L':'R'}`,  geometry: cyl(0.045, 0.52), color: steel, matrix: mat4(s*0.7, 0.1, 0.38) });
    // Spring coils
    for (let i = 0; i < 5; i++) {
      meshes.push({ name: 'coilSpring', geometry: torus(0.08, 0.018, 8, 16), color: steel, matrix: mat4(s*0.7, -0.05+i*0.065, 0.38, PI2, 0, 0) });
    }
    // Shock rod
    meshes.push({ name: 'shockRod',  geometry: cyl(0.022, 0.28, 8), color: alum, matrix: mat4(s*0.7, -0.22, 0.38) });
    // Lower control arm
    meshes.push({ name: `lowerArm_${s<0?'L':'R'}`, geometry: box(0.42, 0.028, 0.075), color: alum, matrix: mat4(s*0.38, -0.28, 0.38, 0, s*0.35, 0) });
    // Hub
    meshes.push({ name: `hub_${s<0?'L':'R'}`, geometry: cyl(0.07, 0.065, 16), color: alum, matrix: mat4(s*0.7, -0.28, 0.38, 0, 0, PI2) });
    // Caliper
    meshes.push({ name: 'brakeCaliperStub', geometry: box(0.055, 0.06, 0.11), color: red, matrix: mat4(s*(0.7+0.09), -0.28, 0.38) });
    // Tie rod
    meshes.push({ name: 'tieRod', geometry: cyl(0.012, 0.28, 8), color: steel, matrix: mat4(s*0.55, -0.22, 0.3, 0, 0, s*0.4) });
    // Rear trailing arm
    meshes.push({ name: `trailingArm_${s<0?'L':'R'}`, geometry: box(0.06, 0.05, 0.5), color: alum, matrix: mat4(s*0.7, -0.28, -0.4) });
    // Rear hub
    meshes.push({ name: 'rearHub', geometry: cyl(0.065, 0.055, 16), color: alum, matrix: mat4(s*0.7, -0.28, -0.55, 0, 0, PI2) });
    // Rear spring
    meshes.push({ name: 'rearSpring', geometry: cyl(0.07, 0.28, 12), color: steel, matrix: mat4(s*0.7, 0.0, -0.42) });
  }

  // Front ARB
  meshes.push({ name: 'frontARB',      geometry: cyl(0.018, 1.3, 8), color: steel,  matrix: mat4(0, -0.26, 0.3, 0, 0, PI2) });
  // Steering rack
  meshes.push({ name: 'steeringRack',  geometry: cyl(0.03, 1.1, 8),  color: alum,   matrix: mat4(0, -0.16, 0.28, 0, 0, PI2) });
  // Pinion housing
  meshes.push({ name: 'pinionHousing', geometry: box(0.07, 0.09, 0.12), color: alum, matrix: mat4(0.05, -0.12, 0.22) });
  // Subframe
  meshes.push({ name: 'frontSubframe', geometry: box(1.1, 0.04, 0.06), color: alum, matrix: mat4(0, -0.38, 0.32) });

  return meshes;
}

// ── Electrical scene ───────────────────────────────────────────────────────

function buildElec() {
  const black  = [ 34,  34,  34];
  const silver = [170, 170, 170];
  const red    = [204,  17,   0];
  const gray   = [102, 102, 119];
  const dblue  = [ 51,  68,  85];
  const PI2 = Math.PI / 2;

  return [
    { name: 'battery',          geometry: box(0.25, 0.2, 0.19),      color: black,  matrix: mat4(0, 0, 0) },
    { name: 'termPos',          geometry: cyl(0.018, 0.04, 10),      color: red,    matrix: mat4( 0.07, 0.11, -0.04) },
    { name: 'termNeg',          geometry: cyl(0.018, 0.04, 10),      color: black,  matrix: mat4(-0.07, 0.11, -0.04) },
    { name: 'alternator',       geometry: cyl(0.07, 0.1, 16),        color: silver, matrix: mat4(0.42, 0.02, 0.1, 0, 0, PI2) },
    { name: 'alternatorPulley', geometry: torus(0.045, 0.012, 8, 16),color: silver, matrix: mat4(0.48, 0.02, 0.1, 0, PI2, 0) },
    { name: 'starterMotor',     geometry: cyl(0.05, 0.15, 12),       color: silver, matrix: mat4(-0.38, -0.06, 0, 0, 0, PI2) },
    { name: 'starterSolenoid',  geometry: cyl(0.022, 0.065, 8),      color: silver, matrix: mat4(-0.31, 0.04, 0) },
    { name: 'fuseRelayBox',     geometry: box(0.14, 0.04, 0.1),      color: gray,   matrix: mat4(0, 0.14, 0.22) },
    { name: 'DMEModule',        geometry: box(0.17, 0.03, 0.13),     color: dblue,  matrix: mat4(0, 0.14, -0.22) },
    { name: 'sportChronoModule',geometry: box(0.06, 0.025, 0.05),    color: gray,   matrix: mat4(0.12, 0.14, 0.1) },
    // Wiring harness approximation
    { name: 'wiringHarness_A',  geometry: cyl(0.006, 0.6, 4),        color: black,  matrix: mat4(-0.04, 0.08, 0.06, -0.15, 0, 0) },
    { name: 'wiringHarness_B',  geometry: cyl(0.006, 0.58, 4),       color: black,  matrix: mat4( 0.0,  0.08, 0.06,  0.05, 0, 0) },
    { name: 'wiringHarness_C',  geometry: cyl(0.006, 0.62, 4),       color: black,  matrix: mat4( 0.04, 0.08, 0.06,  0.25, 0, 0) },
  ];
}

// ── Driveline scene ────────────────────────────────────────────────────────

function buildDriveline() {
  const steel  = [136, 153, 170];
  const alum   = [176, 184, 193];
  const black  = [ 34,  34,  34];
  const rubber = [ 42,  42,  42];
  const PI2 = Math.PI / 2;

  const meshes = [
    // Centre torque tube
    { name: 'torqueTube', geometry: cyl(0.055, 1.6, 12), color: steel, matrix: mat4(0, 0, -0.1, 0, 0, PI2) },
    // CV joints at each end of torque tube
    { name: 'frontCVJoint', geometry: sphere(0.075, 12, 8), color: alum, matrix: mat4(-0.82, 0, -0.1) },
    { name: 'rearCVJoint',  geometry: sphere(0.075, 12, 8), color: alum, matrix: mat4( 0.82, 0, -0.1) },
    // Engine mount
    { name: 'engineMount',   geometry: box(0.12, 0.07, 0.06),  color: alum,   matrix: mat4(-0.82, -0.06, -0.1) },
    { name: 'mountIsolator', geometry: cyl(0.03, 0.05, 8),     color: rubber, matrix: mat4(-0.82, -0.10, -0.1) },
  ];

  for (const sx of [-1, 1]) {
    const s = sx;
    meshes.push({ name: `halfShaft_${s<0?'L':'R'}`,   geometry: cyl(0.025, 0.32, 10),    color: steel,  matrix: mat4(s*0.62, -0.02, 0.52, 0, 0, PI2) });
    meshes.push({ name: 'outerCVJoint',                geometry: sphere(0.055, 10, 8),    color: alum,   matrix: mat4(s*0.76, -0.02, 0.52) });
    meshes.push({ name: `wheelHub_${s<0?'L':'R'}`,     geometry: cyl(0.075, 0.065, 20),   color: alum,   matrix: mat4(s*0.88, -0.02, 0.52, 0, 0, PI2) });
    meshes.push({ name: `wheelRim_${s<0?'L':'R'}`,     geometry: torus(0.26, 0.028, 10, 32), color: alum, matrix: mat4(s*0.96, -0.02, 0.52, 0, PI2, 0) });
    meshes.push({ name: `tyre_${s<0?'L':'R'}`,         geometry: torus(0.26, 0.075, 10, 32), color: rubber, matrix: mat4(s*0.98, -0.02, 0.52, 0, PI2, 0) });
  }

  return meshes;
}

// ── Main ───────────────────────────────────────────────────────────────────

const assemblies = [
  { filename: 'susp.glb',      meshes: buildSusp()      },
  { filename: 'elec.glb',      meshes: buildElec()      },
  { filename: 'driveline.glb', meshes: buildDriveline() },
];

for (const { filename, meshes } of assemblies) {
  const buf = buildGLB(meshes);
  writeFileSync(path.join(OUT, filename), buf);
  console.log(`✓ ${filename}  (${(buf.length / 1024).toFixed(1)} KB,  ${meshes.length} meshes)`);
}

console.log('Done.');
