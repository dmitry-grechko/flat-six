#!/usr/bin/env node
/**
 * Unified X-RAY layout validator.
 *
 * Loads every assembly GLB, applies the same placement math as
 * UnifiedSceneClient.AssemblyMesh (displayRadius normalize / carSpace /
 * bilateral), then checks car-space AABBs against axle landmarks and
 * expected packaging zones.
 *
 *   npm run gen:layout
 *   node tools/gen/verify-unified-layout.mjs
 *   node tools/gen/verify-unified-layout.mjs --json
 *   node tools/gen/verify-unified-layout.mjs --fix   # print suggested displayRadius
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const ASSEMBLIES_TS = join(ROOT, 'components/garage/xray-assemblies.ts');
const FLOW_TS = join(ROOT, 'components/garage/flow-systems.ts');
const OUT_MD = join(ROOT, 'tools/gen/wm-refs/notes/unified-layout-report.md');

const AXLE = { frontZ: 1.5, rearZ: -1.5, halfTrack: 0.82, hubY: -0.35 };

/** Soft car envelope used for out-of-bounds warnings (scene units). */
// zMin reaches tip exits after the aft/low exhaust packaging shift.
const ENVELOPE = { x: 1.35, yMin: -1.35, yMax: 1.35, zMin: -2.85, zMax: 2.45 };

/**
 * Expected packaging zones (car-space). A placed AABB center should land near
 * the zone; extent checks catch gross scale mistakes.
 */
const ZONES = {
  engine:    { center: [0, 0.15, -0.85], tol: [0.55, 0.55, 0.55], maxExtent: [1.6, 1.4, 1.8] },
  trans:     { center: [0, -0.15, -1.65], tol: [0.45, 0.45, 0.45], maxExtent: [1.2, 1.0, 1.4] },
  exhaust:   { center: [0, -0.55, -1.85], tol: [0.7, 0.55, 0.85], maxExtent: [2.2, 1.2, 2.6] },
  fbrakes:   { center: [0, -0.25, 1.45], tol: [1.4, 0.55, 0.45], maxExtent: [2.8, 1.2, 1.2] },
  rbrakes:   { center: [0, -0.25, -1.4], tol: [1.4, 0.55, 0.45], maxExtent: [2.8, 1.2, 1.2] },
  cooling:   { center: [0, 0.0, 1.2], tol: [0.9, 0.7, 1.0], maxExtent: [2.4, 1.6, 3.2] },
  oil:       { center: [0.55, 0.1, -0.9], tol: [0.45, 0.4, 0.45], maxExtent: [0.9, 0.8, 0.9] },
  airfilter: { center: [0, 0.3, -0.9], tol: [0.7, 0.55, 0.7], maxExtent: [2.4, 1.2, 2.2] },
  plugs:     { center: [-0.4, 0.25, -0.9], tol: [0.5, 0.45, 0.5], maxExtent: [1.0, 0.9, 1.0] },
  susp:      { center: [0, -0.2, 0], tol: [0.4, 0.5, 0.4], maxExtent: [2.6, 1.4, 3.6] },
  // Car-space elec: battery (+X frunk) + fuse (−X) span the front half.
  elec:      { center: [0, 0.05, 0.35], tol: [0.7, 0.55, 1.2], maxExtent: [2.0, 1.4, 3.6] },
  // RWD half-shafts only (rear axle) — not a full-length propshaft.
  driveline: { center: [0, -0.2, -1.4], tol: [0.5, 0.45, 0.55], maxExtent: [2.4, 1.2, 2.2] },
  fuel:      { center: [0, -0.05, 0.95], tol: [0.55, 0.45, 0.55], maxExtent: [1.6, 1.0, 1.6] },
};

/** Assemblies expected to read as major volumes in the joint view. */
const MAJOR = new Set(['engine', 'trans', 'exhaust', 'fbrakes', 'rbrakes', 'cooling', 'airfilter', 'susp', 'elec', 'driveline', 'fuel']);

/** Landmark checks: named feature should land near a car-space point. */
const LANDMARKS = [
  { id: 'fbrakes', label: 'front rotor ≈ hub', expect: [AXLE.halfTrack + 0.33, AXLE.hubY, AXLE.frontZ], use: 'bilateralRightCenter', tol: 0.35 },
  { id: 'rbrakes', label: 'rear rotor ≈ hub', expect: [AXLE.halfTrack + 0.33, AXLE.hubY, AXLE.rearZ], use: 'bilateralRightCenter', tol: 0.4 },
  { id: 'susp', label: 'susp spans both axles', expect: null, use: 'spansAxles' },
  { id: 'driveline', label: 'driveline on rear axle', expect: null, use: 'drivelineRear' },
  { id: 'engine', label: 'engine ahead of trans (z)', expect: null, use: 'engineAheadOfTrans' },
  { id: 'exhaust', label: 'exhaust tips rearward of engine', expect: null, use: 'exhaustBehindEngine' },
  { id: 'cooling', label: 'cooling reaches front bumper zone', expect: null, use: 'coolingFront' },
];

const jsonMode = process.argv.includes('--json');
const suggest = process.argv.includes('--fix');
const writeReport = !process.argv.includes('--no-report');

// ── Parse assemblies from TS (single source of truth) ───────────────────────

function extractAssembliesArray(src) {
  const marker = 'export const XRAY_ASSEMBLIES';
  const start = src.indexOf(marker);
  if (start < 0) throw new Error('XRAY_ASSEMBLIES not found');
  // Skip the TypeScript `Type[]` and land on the value's opening `[`
  const eq = src.indexOf('=', start);
  const arrStart = src.indexOf('[', eq);
  let depth = 0;
  let i = arrStart;
  for (; i < src.length; i++) {
    const ch = src[i];
    if (ch === '[') depth++;
    else if (ch === ']') {
      depth--;
      if (depth === 0) {
        i++;
        break;
      }
    }
  }
  return src.slice(arrStart, i);
}

function splitTopLevelObjects(arrSrc) {
  // arrSrc includes outer [ ... ]
  const inner = arrSrc.slice(1, -1);
  const blocks = [];
  let depth = 0;
  let start = -1;
  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i];
    if (ch === '{') {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0 && start >= 0) {
        blocks.push(inner.slice(start, i + 1));
        start = -1;
      }
    }
  }
  return blocks;
}

function parseAssemblies(src) {
  const arr = extractAssembliesArray(src);
  const blocks = splitTopLevelObjects(arr);
  return blocks.map((block) => {
    const get = (key, cast = String) => {
      const mm = block.match(new RegExp(`${key}:\\s*'([^']*)'`))
        || block.match(new RegExp(`${key}:\\s*(-?[\\d.]+)`))
        || block.match(new RegExp(`${key}:\\s*(true|false)`));
      if (!mm) return undefined;
      if (cast === Number) return Number(mm[1]);
      if (cast === Boolean) return mm[1] === 'true';
      return mm[1];
    };
    const hide = [];
    const hideM = block.match(/hideInUnified:\s*\[([^\]]*)\]/);
    if (hideM) {
      for (const h of hideM[1].matchAll(/'([^']+)'/g)) hide.push(h[1]);
    }
    const id = get('id');
    return {
      id,
      label: get('label') ?? id,
      glb: get('glb'),
      hotspot3d: get('hotspot3d') ?? '0 0 0',
      displayRadius: get('displayRadius', Number),
      bilateral: get('bilateral', Boolean) ?? false,
      lateralOffset: get('lateralOffset', Number) ?? 0.75,
      carSpace: get('carSpace', Boolean) ?? false,
      worldScale: get('worldScale', Number) ?? 1,
      hideInUnified: hide,
    };
  }).filter((a) => a.id && a.glb);
}

function parseFlowEndpoints(src) {
  const pts = [];
  for (const m of src.matchAll(/\[(-?[\d.]+),\s*(-?[\d.]+),\s*(-?[\d.]+)\]/g)) {
    pts.push([Number(m[1]), Number(m[2]), Number(m[3])]);
  }
  return pts;
}

// ── GLB load + placement (mirrors UnifiedSceneClient) ───────────────────────

const loader = new GLTFLoader();

async function loadScene(relPath) {
  const abs = join(ROOT, 'public', relPath.replace(/^\//, ''));
  const buf = readFileSync(abs);
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  const gltf = await loader.parseAsync(ab, '');
  return gltf.scene;
}

function nativeBounds(scene) {
  const box = new THREE.Box3().setFromObject(scene);
  const sphere = box.getBoundingSphere(new THREE.Sphere());
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  return { box, sphere, size, center, radius: sphere.radius };
}

/** Place like AssemblyMesh; return world AABB(s) and meta. */
function placeAssembly(assembly, scene) {
  const [px, py, pz] = assembly.hotspot3d.split(' ').map(Number);
  const native = nativeBounds(scene);

  if (assembly.carSpace) {
    const s = assembly.worldScale ?? 1;
    const min = native.box.min.clone().multiplyScalar(s).add(new THREE.Vector3(px, py, pz));
    const max = native.box.max.clone().multiplyScalar(s).add(new THREE.Vector3(px, py, pz));
    const world = new THREE.Box3(min, max);
    return {
      mode: 'carSpace',
      scale: s,
      native,
      worlds: [world],
      center: world.getCenter(new THREE.Vector3()),
      groupPos: [px, py, pz],
    };
  }

  const targetRadius = assembly.displayRadius ?? 0.65;
  const scale = targetRadius / Math.max(native.radius, 0.001);
  const center = native.center.clone().multiplyScalar(scale);
  const bilateral = assembly.bilateral;
  const lateralOffset = assembly.lateralOffset ?? 0.75;
  const rightX = bilateral ? lateralOffset - center.x : px - center.x;
  const centerY = py - center.y;
  const centerZ = pz - center.z;

  const makeWorld = (gx, mirrorX = false) => {
    // World = groupPos + local * scale (with optional X mirror)
    const sx = mirrorX ? -scale : scale;
    const corners = [
      [native.box.min.x, native.box.min.y, native.box.min.z],
      [native.box.min.x, native.box.min.y, native.box.max.z],
      [native.box.min.x, native.box.max.y, native.box.min.z],
      [native.box.min.x, native.box.max.y, native.box.max.z],
      [native.box.max.x, native.box.min.y, native.box.min.z],
      [native.box.max.x, native.box.min.y, native.box.max.z],
      [native.box.max.x, native.box.max.y, native.box.min.z],
      [native.box.max.x, native.box.max.y, native.box.max.z],
    ];
    const w = new THREE.Box3();
    for (const [x, y, z] of corners) {
      w.expandByPoint(new THREE.Vector3(gx + x * sx, centerY + y * scale, centerZ + z * scale));
    }
    return w;
  };

  const worlds = bilateral
    ? [makeWorld(rightX, false), makeWorld(-rightX, true)]
    : [makeWorld(rightX, false)];

  const union = worlds[0].clone();
  for (let i = 1; i < worlds.length; i++) union.union(worlds[i]);

  return {
    mode: bilateral ? 'bilateral' : 'normalized',
    scale,
    native,
    worlds,
    union,
    center: union.getCenter(new THREE.Vector3()),
    groupPos: bilateral ? [0, centerY, centerZ] : [rightX, centerY, centerZ],
    rightX,
    centerY,
    centerZ,
    suggestedDisplayRadius: suggest ? targetRadius : undefined,
  };
}

function fmt(n, d = 2) {
  return (Number.isFinite(n) ? n : 0).toFixed(d);
}

function boxExtent(box) {
  const s = box.getSize(new THREE.Vector3());
  return [s.x, s.y, s.z];
}

function dist(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

// ── Checks ──────────────────────────────────────────────────────────────────

function runChecks(placed) {
  const issues = []; // { severity: 'error'|'warn'|'info', id, msg }
  const byId = Object.fromEntries(placed.map((p) => [p.id, p]));

  for (const p of placed) {
    const zone = ZONES[p.id];
    const world = p.union ?? p.worlds[0];
    const c = p.center;
    const ext = boxExtent(world);

    // Envelope
    if (Math.abs(c.x) > ENVELOPE.x + 0.5 || c.y < ENVELOPE.yMin - 0.4 || c.y > ENVELOPE.yMax + 0.4
      || c.z < ENVELOPE.zMin - 0.5 || c.z > ENVELOPE.zMax + 0.5) {
      issues.push({ severity: 'warn', id: p.id, msg: `center (${fmt(c.x)}, ${fmt(c.y)}, ${fmt(c.z)}) outside soft car envelope` });
    }
    if (world.min.y < -1.8 || world.max.y > 1.8) {
      issues.push({ severity: 'warn', id: p.id, msg: `Y span [${fmt(world.min.y)}, ${fmt(world.max.y)}] looks extreme for cabin/undercarriage` });
    }

    if (zone) {
      const dc = [
        Math.abs(c.x - zone.center[0]),
        Math.abs(c.y - zone.center[1]),
        Math.abs(c.z - zone.center[2]),
      ];
      if (dc[0] > zone.tol[0] || dc[1] > zone.tol[1] || dc[2] > zone.tol[2]) {
        issues.push({
          severity: 'warn',
          id: p.id,
          msg: `center off packaging zone (Δ ${fmt(dc[0])},${fmt(dc[1])},${fmt(dc[2])} vs tol ${zone.tol.join('/')}; got ${fmt(c.x)},${fmt(c.y)},${fmt(c.z)})`,
        });
      }
      if (ext[0] > zone.maxExtent[0] || ext[1] > zone.maxExtent[1] || ext[2] > zone.maxExtent[2]) {
        issues.push({
          severity: 'error',
          id: p.id,
          msg: `AABB too large ${ext.map((v) => fmt(v)).join('×')} (max ${zone.maxExtent.join('×')}) — displayRadius/worldScale likely wrong`,
        });
      }
    }

    // Scale sanity — majors must stay legible; small parts (oil/plugs) may use tiny scale.
    if (p.mode === 'normalized' || p.mode === 'bilateral') {
      const maxExt = Math.max(...ext);
      if (MAJOR.has(p.id) && p.scale < 0.08) {
        issues.push({ severity: 'error', id: p.id, msg: `scale ${fmt(p.scale, 4)} too small for a major assembly — raise displayRadius or shrink native bounds` });
      }
      if (MAJOR.has(p.id) && maxExt < 0.25) {
        issues.push({ severity: 'warn', id: p.id, msg: `world extent max ${fmt(maxExt)} — major assembly may be hard to read in joint view` });
      }
      if (!MAJOR.has(p.id) && maxExt < 0.06) {
        issues.push({ severity: 'warn', id: p.id, msg: `world extent max ${fmt(maxExt)} — may be nearly invisible next to the engine` });
      }
      if (p.scale > 2.5) {
        issues.push({ severity: 'warn', id: p.id, msg: `scale ${fmt(p.scale, 3)} large — native model small or displayRadius oversized` });
      }
    }
  }

  // Pairwise heavy overlap of centers (info only — assemblies intentionally overlap in X-RAY)
  for (let i = 0; i < placed.length; i++) {
    for (let j = i + 1; j < placed.length; j++) {
      const a = placed[i];
      const b = placed[j];
      const d = a.center.distanceTo(b.center);
      if (d < 0.12 && a.id !== 'oil' && b.id !== 'oil') {
        issues.push({
          severity: 'info',
          id: `${a.id}+${b.id}`,
          msg: `centers nearly coincident (d=${fmt(d, 3)}) — OK if nested systems, else check hotspots`,
        });
      }
    }
  }

  // Landmarks
  for (const lm of LANDMARKS) {
    if (lm.use === 'bilateralRightCenter') {
      const p = byId[lm.id];
      if (!p?.worlds?.[0]) continue;
      const rc = p.worlds[0].getCenter(new THREE.Vector3());
      const got = [rc.x, rc.y, rc.z];
      const d = dist(got, lm.expect);
      if (d > lm.tol) {
        issues.push({
          severity: 'warn',
          id: lm.id,
          msg: `${lm.label}: right instance center (${got.map((v) => fmt(v)).join(', ')}) vs hub-ish (${lm.expect.map((v) => fmt(v)).join(', ')}), d=${fmt(d)}`,
        });
      }
    }
    if (lm.use === 'spansAxles') {
      const p = byId[lm.id];
      if (!p) continue;
      const w = p.union ?? p.worlds[0];
      if (w.max.z < AXLE.frontZ - 0.35 || w.min.z > AXLE.rearZ + 0.35) {
        issues.push({
          severity: 'error',
          id: lm.id,
          msg: `${lm.label}: Z span [${fmt(w.min.z)}, ${fmt(w.max.z)}] does not cover axles ±1.5`,
        });
      }
      if (w.max.x < AXLE.halfTrack - 0.15 || w.min.x > -(AXLE.halfTrack - 0.15)) {
        issues.push({
          severity: 'warn',
          id: lm.id,
          msg: `${lm.label}: X span [${fmt(w.min.x)}, ${fmt(w.max.x)}] may miss track (±${AXLE.halfTrack})`,
        });
      }
    }
    if (lm.use === 'drivelineRear') {
      const p = byId[lm.id];
      if (!p) continue;
      const w = p.union ?? p.worlds[0];
      // Half-shafts should sit on the rear axle band and reach near half-track.
      if (w.max.z < AXLE.rearZ - 0.55 || w.min.z > AXLE.rearZ + 0.55) {
        issues.push({
          severity: 'error',
          id: lm.id,
          msg: `${lm.label}: Z span [${fmt(w.min.z)}, ${fmt(w.max.z)}] misses rear axle z=${AXLE.rearZ}`,
        });
      }
      if (w.max.x < AXLE.halfTrack - 0.25 || w.min.x > -(AXLE.halfTrack - 0.25)) {
        issues.push({
          severity: 'warn',
          id: lm.id,
          msg: `${lm.label}: X span [${fmt(w.min.x)}, ${fmt(w.max.x)}] may not reach hubs`,
        });
      }
    }
    if (lm.use === 'engineAheadOfTrans') {
      const e = byId.engine;
      const t = byId.trans;
      if (e && t && e.center.z <= t.center.z) {
        issues.push({ severity: 'error', id: 'engine', msg: `engine z=${fmt(e.center.z)} should be ahead of (greater than) trans z=${fmt(t.center.z)}` });
      }
    }
    if (lm.use === 'exhaustBehindEngine') {
      const e = byId.engine;
      const x = byId.exhaust;
      if (e && x) {
        const w = x.union ?? x.worlds[0];
        if (w.min.z > e.center.z - 0.2) {
          issues.push({ severity: 'warn', id: 'exhaust', msg: `exhaust minZ=${fmt(w.min.z)} not clearly behind engine center z=${fmt(e.center.z)}` });
        }
      }
    }
    if (lm.use === 'coolingFront') {
      const c = byId.cooling;
      if (c) {
        const w = c.union ?? c.worlds[0];
        if (w.max.z < 1.5) {
          issues.push({ severity: 'warn', id: 'cooling', msg: `cooling maxZ=${fmt(w.max.z)} — front radiators should reach ~bumper (z≳1.7)` });
        }
      }
    }
  }

  return issues;
}

function checkFlows(flowPts, placed) {
  const issues = [];
  if (!flowPts.length) return issues;
  // Soft envelope — allow side-scoop X out to ~2.0 (body flanks).
  let oob = 0;
  const samples = [];
  for (const [x, y, z] of flowPts) {
    // zMin matches ENVELOPE after aft exhaust tip packaging.
    if (Math.abs(x) > 2.05 || y < -1.25 || y > 1.25 || z < -2.85 || z > 2.45) {
      oob++;
      if (samples.length < 4) samples.push([x, y, z]);
    }
  }
  if (oob) {
    issues.push({
      severity: 'warn',
      id: 'flows',
      msg: `${oob}/${flowPts.length} flow waypoints outside soft envelope (e.g. ${samples.map((p) => p.map((n) => fmt(n)).join(',')).join('; ')}) — review flow-systems.ts`,
    });
  }
  return issues;
}

// ── Suggest displayRadius so a native feature radius maps to a target ───────

function suggestRadii(placed) {
  // Informational: show current scale and what displayRadius would keep scale≈0.25–0.4 for mid-size parts
  return placed
    .filter((p) => p.mode !== 'carSpace')
    .map((p) => {
      const targetScale = 0.3;
      const suggested = targetScale * p.native.radius;
      return {
        id: p.id,
        nativeRadius: p.native.radius,
        currentDisplayRadius: p.displayRadius ?? 0.65,
        currentScale: p.scale,
        suggestedDisplayRadiusForScale03: suggested,
      };
    });
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const assemblies = parseAssemblies(readFileSync(ASSEMBLIES_TS, 'utf8'));
  if (assemblies.length < 8) {
    console.error('Failed to parse XRAY_ASSEMBLIES — got', assemblies.length);
    process.exit(2);
  }

  const flowPts = parseFlowEndpoints(readFileSync(FLOW_TS, 'utf8'));
  const placed = [];

  for (const a of assemblies) {
    const scene = await loadScene(a.glb);
    // hideInUnified does not affect Box3 in the client (comment says bbox includes invisible);
    // match that: do not remove nodes before measuring.
    const result = placeAssembly(a, scene);
    placed.push({
      id: a.id,
      label: a.label,
      hotspot3d: a.hotspot3d,
      displayRadius: a.displayRadius,
      bilateral: a.bilateral,
      carSpace: a.carSpace,
      ...result,
      union: result.union ?? result.worlds[0],
    });
  }

  const issues = [...runChecks(placed), ...checkFlows(flowPts, placed)];
  const suggestions = suggest ? suggestRadii(placed) : null;

  const rows = placed.map((p) => {
    const w = p.union;
    const ext = boxExtent(w);
    return {
      id: p.id,
      mode: p.mode,
      scale: p.scale,
      hotspot: p.hotspot3d,
      displayRadius: p.displayRadius ?? null,
      nativeRadius: p.native.radius,
      center: [p.center.x, p.center.y, p.center.z],
      aabb: {
        min: [w.min.x, w.min.y, w.min.z],
        max: [w.max.x, w.max.y, w.max.z],
        extent: ext,
      },
    };
  });

  const errors = issues.filter((i) => i.severity === 'error');
  const warns = issues.filter((i) => i.severity === 'warn');
  const infos = issues.filter((i) => i.severity === 'info');

  if (jsonMode) {
    console.log(JSON.stringify({ axle: AXLE, rows, issues, suggestions }, null, 2));
  } else {
    console.log('\nUnified X-RAY layout\n');
    console.log(
      'ID'.padEnd(12)
      + 'MODE'.padEnd(12)
      + 'SCALE'.padEnd(8)
      + 'CENTER (x y z)'.padEnd(28)
      + 'EXTENT (w×h×d)'
    );
    console.log('-'.repeat(90));
    for (const r of rows) {
      console.log(
        r.id.padEnd(12)
        + r.mode.padEnd(12)
        + fmt(r.scale, 3).padEnd(8)
        + r.center.map((v) => fmt(v)).join(' ').padEnd(28)
        + r.aabb.extent.map((v) => fmt(v)).join('×')
      );
    }
    console.log('-'.repeat(90));
    console.log(`Assemblies: ${rows.length}   Flow waypoints parsed: ${flowPts.length}`);
    console.log(`Issues: ${errors.length} error(s), ${warns.length} warning(s), ${infos.length} info\n`);
    for (const i of [...errors, ...warns, ...infos]) {
      const tag = i.severity === 'error' ? 'ERROR' : i.severity === 'warn' ? 'WARN ' : 'INFO ';
      console.log(`  [${tag}] ${i.id}: ${i.msg}`);
    }
    if (suggestions) {
      console.log('\nSuggested displayRadius for ~0.30 scale:');
      for (const s of suggestions) {
        console.log(
          `  ${s.id.padEnd(12)} nativeR=${fmt(s.nativeRadius)}  current=${fmt(s.currentDisplayRadius)}→scale ${fmt(s.currentScale, 3)}  suggest≈${fmt(s.suggestedDisplayRadiusForScale03)}`
        );
      }
    }
    console.log('');
  }

  if (writeReport) {
    mkdirSync(dirname(OUT_MD), { recursive: true });
    const md = [
      '# Unified X-RAY layout report',
      '',
      `Generated by \`tools/gen/verify-unified-layout.mjs\`. Axle: frontZ=${AXLE.frontZ}, rearZ=${AXLE.rearZ}, halfTrack=${AXLE.halfTrack}, hubY=${AXLE.hubY}.`,
      '',
      '| Assembly | Mode | Scale | Center | Extent |',
      '| --- | --- | --- | --- | --- |',
      ...rows.map((r) =>
        `| ${r.id} | ${r.mode} | ${fmt(r.scale, 3)} | ${r.center.map((v) => fmt(v)).join(', ')} | ${r.aabb.extent.map((v) => fmt(v)).join(' × ')} |`
      ),
      '',
      '## Issues',
      '',
      ...(issues.length
        ? issues.map((i) => `- **${i.severity}** \`${i.id}\`: ${i.msg}`)
        : ['- None']),
      '',
      '## How to fix',
      '',
      '1. Adjust `hotspot3d` / `displayRadius` / `worldScale` / `lateralOffset` in `components/garage/xray-assemblies.ts`.',
      '2. Or rescale native geometry in `tools/gen/components/*.mjs` then `npm run gen:components`.',
      '3. Re-run `npm run gen:layout`.',
      '',
    ].join('\n');
    writeFileSync(OUT_MD, md);
    if (!jsonMode) console.log(`Report → ${OUT_MD}\n`);
  }

  process.exit(errors.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
