#!/usr/bin/env node
/**
 * Trace a true top-view silhouette of a car GLB into SVG paths.
 *
 * Parses the GLB directly (no three.js / WebGL): walks the node hierarchy,
 * applies world transforms, projects every triangle onto the ground plane,
 * rasterizes into an occupancy grid + height map, then extracts:
 *   - the body outline  (largest connected blob boundary)
 *   - the greenhouse    (iso-contour of the height map)
 * Outputs simplified/smoothed SVG path strings in a 300x150-ish viewBox,
 * nose pointing LEFT (matches the OBD module map convention).
 *
 * Usage: node trace-topview.mjs /path/to/model.glb [cabinFrac=0.62]
 */
import fs from 'node:fs';

const file = process.argv[2];
const CABIN_FRAC = Number(process.argv[3] ?? 0.62);
if (!file) { console.error('usage: trace-topview.mjs model.glb [cabinFrac]'); process.exit(1); }

// ---------- GLB parse ----------
const buf = fs.readFileSync(file);
if (buf.readUInt32LE(0) !== 0x46546c67) throw new Error('not a GLB');
const jsonLen = buf.readUInt32LE(12);
const gltf = JSON.parse(buf.slice(20, 20 + jsonLen).toString());
// BIN chunk follows the JSON chunk
let off = 20 + jsonLen;
const binLen = buf.readUInt32LE(off);
const binType = buf.readUInt32LE(off + 4);
if (binType !== 0x004e4942) throw new Error('no BIN chunk');
const bin = buf.slice(off + 8, off + 8 + binLen);

const COMP_SIZE = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 };
const TYPE_N = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };

function readAccessor(idx) {
  const acc = gltf.accessors[idx];
  const bv = gltf.bufferViews[acc.bufferView];
  const n = TYPE_N[acc.type];
  const compSize = COMP_SIZE[acc.componentType];
  const stride = bv.byteStride || n * compSize;
  const base = (bv.byteOffset || 0) + (acc.byteOffset || 0);
  const out = new Float64Array(acc.count * n);
  for (let i = 0; i < acc.count; i++) {
    const p = base + i * stride;
    for (let c = 0; c < n; c++) {
      const q = p + c * compSize;
      let v;
      switch (acc.componentType) {
        case 5126: v = bin.readFloatLE(q); break;
        case 5125: v = bin.readUInt32LE(q); break;
        case 5123: v = bin.readUInt16LE(q); break;
        case 5121: v = bin.readUInt8(q); break;
        case 5122: v = bin.readInt16LE(q); break;
        case 5120: v = bin.readInt8(q); break;
        default: throw new Error('componentType ' + acc.componentType);
      }
      out[i * n + c] = v;
    }
  }
  return { data: out, count: acc.count, n };
}

// ---------- node world matrices ----------
function matMul(a, b) { // column-major 4x4 (glTF convention)
  const o = new Float64Array(16);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
    let s = 0;
    for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k];
    o[c * 4 + r] = s;
  }
  return o;
}
function nodeLocal(node) {
  if (node.matrix) return Float64Array.from(node.matrix);
  const [tx, ty, tz] = node.translation || [0, 0, 0];
  const [qx, qy, qz, qw] = node.rotation || [0, 0, 0, 1];
  const [sx, sy, sz] = node.scale || [1, 1, 1];
  const x2 = qx + qx, y2 = qy + qy, z2 = qz + qz;
  const xx = qx * x2, xy = qx * y2, xz = qx * z2;
  const yy = qy * y2, yz = qy * z2, zz = qz * z2;
  const wx = qw * x2, wy = qw * y2, wz = qw * z2;
  return Float64Array.from([
    (1 - (yy + zz)) * sx, (xy + wz) * sx, (xz - wy) * sx, 0,
    (xy - wz) * sy, (1 - (xx + zz)) * sy, (yz + wx) * sy, 0,
    (xz + wy) * sz, (yz - wx) * sz, (1 - (xx + yy)) * sz, 0,
    tx, ty, tz, 1,
  ]);
}
const IDENT = Float64Array.from([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);
const worldMeshes = []; // { positions: Float64Array (world xyz), indices }
function walk(nodeIdx, parent) {
  const node = gltf.nodes[nodeIdx];
  const world = matMul(parent, nodeLocal(node));
  if (node.mesh != null) {
    for (const prim of gltf.meshes[node.mesh].primitives) {
      if (prim.mode != null && prim.mode !== 4) continue; // triangles only
      if (prim.attributes.POSITION == null) continue;
      const pos = readAccessor(prim.attributes.POSITION);
      const world3 = new Float64Array(pos.count * 3);
      for (let i = 0; i < pos.count; i++) {
        const x = pos.data[i * 3], y = pos.data[i * 3 + 1], z = pos.data[i * 3 + 2];
        world3[i * 3]     = world[0] * x + world[4] * y + world[8]  * z + world[12];
        world3[i * 3 + 1] = world[1] * x + world[5] * y + world[9]  * z + world[13];
        world3[i * 3 + 2] = world[2] * x + world[6] * y + world[10] * z + world[14];
      }
      let indices = null;
      if (prim.indices != null) indices = readAccessor(prim.indices).data;
      worldMeshes.push({ positions: world3, indices, name: node.name || '' });
    }
  }
  for (const c of node.children || []) walk(c, world);
}
for (const n of gltf.scenes[gltf.scene || 0].nodes) walk(n, IDENT);

// ---------- global bbox / axis detection ----------
let min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
for (const m of worldMeshes) for (let i = 0; i < m.positions.length; i += 3)
  for (let c = 0; c < 3; c++) {
    const v = m.positions[i + c];
    if (v < min[c]) min[c] = v;
    if (v > max[c]) max[c] = v;
  }
const size = [max[0] - min[0], max[1] - min[1], max[2] - min[2]];
console.error('bbox size (x,y,z):', size.map((v) => v.toFixed(2)).join(' , '));
// Up axis = smallest of the two non-length... assume Y up (glTF convention).
// Length axis = larger of X/Z.
const lenAxis = size[0] > size[2] ? 0 : 2;
const widAxis = lenAxis === 0 ? 2 : 0;
console.error('length axis:', 'xyz'[lenAxis], ' width axis:', 'xyz'[widAxis]);

// ---------- rasterize triangles to occupancy + height map ----------
const GW = 1000;
const GH = Math.max(2, Math.round((GW * size[widAxis]) / size[lenAxis]));
const occ = new Uint8Array(GW * GH);
const hgt = new Float64Array(GW * GH).fill(-Infinity);
const gx = (L) => ((L - min[lenAxis]) / size[lenAxis]) * (GW - 1);
const gy = (W) => ((W - min[widAxis]) / size[widAxis]) * (GH - 1);

function rasterTri(ax, ay, bx, by, cx, cy, h) {
  const minX = Math.max(0, Math.floor(Math.min(ax, bx, cx)));
  const maxX = Math.min(GW - 1, Math.ceil(Math.max(ax, bx, cx)));
  const minY = Math.max(0, Math.floor(Math.min(ay, by, cy)));
  const maxY = Math.min(GH - 1, Math.ceil(Math.max(ay, by, cy)));
  const d = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
  if (Math.abs(d) < 1e-12) { // degenerate → stamp vertices
    for (const [px, py] of [[ax, ay], [bx, by], [cx, cy]]) {
      const xi = Math.round(px), yi = Math.round(py);
      if (xi >= 0 && xi < GW && yi >= 0 && yi < GH) {
        const k = yi * GW + xi; occ[k] = 1; if (h > hgt[k]) hgt[k] = h;
      }
    }
    return;
  }
  for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
    const w0 = ((bx - ax) * (y - ay) - (by - ay) * (x - ax)) / d;
    const w1 = ((cx - bx) * (y - by) - (cy - by) * (x - bx)) / d;
    const w2 = ((ax - cx) * (y - cy) - (ay - cy) * (x - cx)) / d;
    const inA = w0 >= -0.02 && w1 >= -0.02 && w2 >= -0.02;
    const inB = w0 <= 0.02 && w1 <= 0.02 && w2 <= 0.02;
    if (inA || inB) { const k = y * GW + x; occ[k] = 1; if (h > hgt[k]) hgt[k] = h; }
  }
}

for (const m of worldMeshes) {
  const P = m.positions;
  const idx = m.indices;
  const triCount = idx ? idx.length / 3 : P.length / 9;
  for (let t = 0; t < triCount; t++) {
    const i0 = idx ? idx[t * 3] : t * 3, i1 = idx ? idx[t * 3 + 1] : t * 3 + 1, i2 = idx ? idx[t * 3 + 2] : t * 3 + 2;
    const a = [P[i0 * 3], P[i0 * 3 + 1], P[i0 * 3 + 2]];
    const b = [P[i1 * 3], P[i1 * 3 + 1], P[i1 * 3 + 2]];
    const c = [P[i2 * 3], P[i2 * 3 + 1], P[i2 * 3 + 2]];
    const h = Math.max(a[1], b[1], c[1]); // Y up
    rasterTri(gx(a[lenAxis]), gy(a[widAxis]), gx(b[lenAxis]), gy(b[widAxis]), gx(c[lenAxis]), gy(c[widAxis]), h);
  }
}

// ---------- morphological close (fill pinholes) ----------
function dilate(src) {
  const out = new Uint8Array(src.length);
  for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
    if (!src[y * GW + x]) continue;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && nx < GW && ny >= 0 && ny < GH) out[ny * GW + nx] = 1;
    }
  }
  return out;
}
function erode(src) {
  const out = new Uint8Array(src.length);
  for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
    let ok = 1;
    for (let dy = -1; dy <= 1 && ok; dy++) for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || nx >= GW || ny < 0 || ny >= GH || !src[ny * GW + nx]) { ok = 0; break; }
    }
    out[y * GW + x] = ok;
  }
  return out;
}
let mask = erode(erode(dilate(dilate(occ)))); // morphological close, net-zero

// ---------- largest connected component ----------
function largestComponent(src) {
  const label = new Int32Array(src.length).fill(-1);
  let best = -1, bestSize = 0, cur = 0;
  const stack = [];
  for (let s = 0; s < src.length; s++) {
    if (!src[s] || label[s] !== -1) continue;
    let size = 0;
    stack.push(s); label[s] = cur;
    while (stack.length) {
      const k = stack.pop(); size++;
      const x = k % GW, y = (k / GW) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || nx >= GW || ny < 0 || ny >= GH) continue;
        const nk = ny * GW + nx;
        if (src[nk] && label[nk] === -1) { label[nk] = cur; stack.push(nk); }
      }
    }
    if (size > bestSize) { bestSize = size; best = cur; }
    cur++;
  }
  const out = new Uint8Array(src.length);
  for (let k = 0; k < src.length; k++) out[k] = label[k] === best ? 1 : 0;
  return out;
}
mask = largestComponent(mask);

// ---------- Moore boundary trace ----------
function traceBoundary(src) {
  let start = -1;
  for (let k = 0; k < src.length; k++) if (src[k]) { start = k; break; }
  if (start < 0) return [];
  const sx = start % GW, sy = (start / GW) | 0;
  const dirs = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
  const at = (x, y) => x >= 0 && x < GW && y >= 0 && y < GH && src[y * GW + x];
  const pts = [];
  let cx = sx, cy = sy, dir = 6; // came from below-ish
  const maxSteps = src.length * 4;
  for (let step = 0; step < maxSteps; step++) {
    pts.push([cx, cy]);
    let found = false;
    for (let i = 0; i < 8; i++) {
      const d = (dir + 6 + i) % 8; // start looking backwards-left (Moore)
      const nx = cx + dirs[d][0], ny = cy + dirs[d][1];
      if (at(nx, ny)) { cx = nx; cy = ny; dir = d; found = true; break; }
    }
    if (!found) break; // isolated pixel
    if (cx === sx && cy === sy && pts.length > 10) break;
  }
  return pts;
}

// ---------- simplify (RDP) + smooth (Chaikin) ----------
function rdp(pts, eps) {
  if (pts.length < 3) return pts;
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    const [ax, ay] = pts[a], [bx, by] = pts[b];
    const dx = bx - ax, dy = by - ay;
    const len = Math.hypot(dx, dy) || 1e-9;
    let maxD = -1, maxI = -1;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs(dx * (ay - pts[i][1]) - dy * (ax - pts[i][0])) / len;
      if (d > maxD) { maxD = d; maxI = i; }
    }
    if (maxD > eps) { keep[maxI] = 1; stack.push([a, maxI], [maxI, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}
function chaikin(pts, iters = 2) {
  let p = pts;
  for (let it = 0; it < iters; it++) {
    const out = [];
    for (let i = 0; i < p.length; i++) {
      const a = p[i], b = p[(i + 1) % p.length];
      out.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25]);
      out.push([a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
    }
    p = out;
  }
  return p;
}

// ---------- greenhouse (cabin) iso-contour from the height map ----------
const hThresh = min[1] + CABIN_FRAC * size[1];
let cabin = new Uint8Array(GW * GH);
for (let k = 0; k < cabin.length; k++) cabin[k] = mask[k] && hgt[k] > hThresh ? 1 : 0;
cabin = erode(erode(dilate(dilate(cabin))));
cabin = largestComponent(cabin);

// ---------- fit into viewBox, nose LEFT ----------
// Decide which end is the nose: the FRONT of a mid-engine car is LOWER than the
// engine deck? Not reliable. Use the cabin position instead: the cabin sits
// closer to the REAR on a mid-engine car... also fuzzy. Simplest robust cue:
// the windshield end of the greenhouse points to the front. Compute cabin
// centroid vs body centroid along length: cabin centroid is typically slightly
// rearward. If cabin centroid is LEFT of body centroid, nose is RIGHT → flip.
function centroidX(src) {
  let sx = 0, n = 0;
  for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) if (src[y * GW + x]) { sx += x; n++; }
  return sx / Math.max(1, n);
}
const bodyCx = centroidX(mask);
const cabCx = centroidX(cabin);
const noseIsLeft = cabCx > bodyCx; // cabin rearward → nose on the smaller-x side
console.error('body centroid x:', bodyCx.toFixed(1), 'cabin centroid x:', cabCx.toFixed(1), '→ nose', noseIsLeft ? 'LEFT (keep)' : 'RIGHT (flip)');

const VB_W = 300, PAD = 8;
const scale = (VB_W - PAD * 2) / GW;
const VB_H = Math.round(GH * scale + PAD * 2);
function toView(pts) {
  return pts.map(([x, y]) => [
    PAD + (noseIsLeft ? x : GW - 1 - x) * scale,
    PAD + y * scale,
  ]);
}
function toPath(pts, dec = 1) {
  const f = (v) => v.toFixed(dec);
  let d = `M${f(pts[0][0])},${f(pts[0][1])}`;
  for (let i = 1; i < pts.length; i++) d += `L${f(pts[i][0])},${f(pts[i][1])}`;
  return d + 'Z';
}

const outlinePts = toView(chaikin(rdp(traceBoundary(mask), 2.2), 2));
const cabinPts = toView(chaikin(rdp(traceBoundary(cabin), 2.2), 2));
// Re-simplify after smoothing to keep the path string compact.
const outlineFinal = rdp(outlinePts, 0.4);
const cabinFinal = rdp(cabinPts, 0.4);

console.error('outline pts:', outlineFinal.length, ' cabin pts:', cabinFinal.length, ' viewBox:', `0 0 ${VB_W} ${VB_H}`);

const outlinePath = toPath(outlineFinal);
const cabinPath = toPath(cabinFinal);

const svg = `<svg viewBox="0 0 ${VB_W} ${VB_H}" width="600" xmlns="http://www.w3.org/2000/svg">
  <path d="${outlinePath}" fill="#F4F4F5" stroke="#C9C9CD" stroke-width="1.6" stroke-linejoin="round"/>
  <path d="${cabinPath}" fill="#ECECEE" stroke="#D8D8DC" stroke-width="1.2" stroke-linejoin="round"/>
  <text x="14" y="${VB_H / 2 + 3}" fill="#B4B4B8" style="font:600 8px 'JetBrains Mono',monospace;letter-spacing:.1em">FRONT</text>
  <text x="${VB_W - 40}" y="${VB_H / 2 + 3}" fill="#B4B4B8" style="font:600 8px 'JetBrains Mono',monospace;letter-spacing:.1em">REAR</text>
</svg>`;

const out = {
  viewBox: `0 0 ${VB_W} ${VB_H}`,
  outline: outlinePath,
  cabin: cabinPath,
};
console.log(JSON.stringify(out));
fs.writeFileSync('/private/tmp/claude-501/-Users-dmytrogrechko-Development-porsche/54534265-7889-4217-87a7-73b5557b0be6/scratchpad/topview.svg', svg);
console.error('wrote topview.svg');
