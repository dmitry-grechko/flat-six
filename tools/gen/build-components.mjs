#!/usr/bin/env node
// Procedural 3D component pipeline for the Porsche 981 maintenance app.
//
// Runs headless (no WebGL/GUI): builds named THREE.Group/Mesh hierarchies from
// pure-math geometry, serializes each to a self-contained .glb, writes a
// ModelManifestEntry[] manifest the app reads, then re-opens and validates every
// GLB before exiting.
//
//   npm run gen:components
//
// To add a component, see tools/gen/README.md.

import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

import { writeGLB } from './lib/glb-writer.mjs';

import * as engine from './components/engine.mjs';
import * as transaxle from './components/transaxle.mjs';
import * as exhaust from './components/exhaust.mjs';
import * as frontBrake from './components/frontBrake.mjs';
import * as rearBrake from './components/rearBrake.mjs';
import * as coolingRadiator from './components/coolingRadiator.mjs';
import * as oilSystem from './components/oilSystem.mjs';
import * as airIntake from './components/airIntake.mjs';
import * as ignitionFuel from './components/ignitionFuel.mjs';
import * as suspension from './components/suspension.mjs';
import * as electrical from './components/electrical.mjs';
import * as driveline from './components/driveline.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', '..', 'public', 'models', 'components');
const PUBLIC_PREFIX = '/models/components';

// Registry: each item is { meta, build }. Add new ones here.
const COMPONENTS = [
  engine,
  transaxle,
  exhaust,
  frontBrake,
  rearBrake,
  coolingRadiator,
  oilSystem,
  airIntake,
  ignitionFuel,
  suspension,
  electrical,
  driveline,
];

// ---- Verify a written GLB by re-parsing it. ----
function verifyGLB(filePath) {
  const buf = readFileSync(filePath);
  if (buf.readUInt32LE(0) !== 0x46546c67) throw new Error('bad magic (not glTF)');
  if (buf.readUInt32LE(4) !== 2) throw new Error('not glTF v2');
  const total = buf.readUInt32LE(8);
  if (total !== buf.length) throw new Error(`length mismatch: header ${total} vs file ${buf.length}`);

  const jsonLen = buf.readUInt32LE(12);
  const jsonType = buf.readUInt32LE(16);
  if (jsonType !== 0x4e4f534a) throw new Error('first chunk not JSON');
  const json = JSON.parse(buf.slice(20, 20 + jsonLen).toString('utf8'));

  const meshes = (json.meshes || []).length;
  const nodes = (json.nodes || []).length;
  if (meshes <= 0) throw new Error('meshes <= 0');
  if (nodes <= 0) throw new Error('nodes <= 0');
  const named = (json.nodes || []).filter((n) => n.name && n.name.length).length;
  if (named === 0) throw new Error('no named nodes');

  // validate accessor min/max present on POSITION
  for (const m of json.meshes) {
    for (const p of m.primitives) {
      const pos = json.accessors[p.attributes.POSITION];
      if (!pos.min || !pos.max) throw new Error('POSITION accessor missing min/max');
    }
  }
  return { meshes, nodes, named, bytes: buf.length };
}

function fmtBytes(b) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(2)} MB`;
}

async function main() {
  if (!existsSync(OUT_DIR)) throw new Error(`output dir missing: ${OUT_DIR}`);

  const manifest = [];
  const rows = [];

  for (const comp of COMPONENTS) {
    const { meta, build } = comp;
    if (!meta || !build) throw new Error(`component missing meta/build: ${JSON.stringify(meta)}`);

    const root = build();
    if (root.name !== meta.node) {
      // keep manifest node name authoritative
      root.name = meta.node;
    }
    const fileName = `${meta.id}.glb`;
    const filePath = join(OUT_DIR, fileName);

    const stats = writeGLB(root, filePath);
    const v = verifyGLB(filePath);

    manifest.push({
      id: meta.id,
      label: meta.label,
      system: meta.system,
      glb: `${PUBLIC_PREFIX}/${fileName}`,
      node: meta.node,
      ...(meta.hotspot3d ? { hotspot3d: meta.hotspot3d } : {}),
    });

    rows.push({
      file: fileName,
      nodes: v.nodes,
      meshes: v.meshes,
      size: fmtBytes(v.bytes),
      ok: 'OK',
    });
  }

  const manifestPath = join(OUT_DIR, 'manifest.json');
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');

  // ---- Summary table ----
  const pad = (s, n) => String(s).padEnd(n);
  console.log('\nGenerated 3D components:\n');
  console.log(pad('FILE', 22) + pad('NODES', 8) + pad('MESHES', 8) + pad('SIZE', 12) + 'STATUS');
  console.log('-'.repeat(58));
  for (const r of rows) {
    console.log(pad(r.file, 22) + pad(r.nodes, 8) + pad(r.meshes, 8) + pad(r.size, 12) + r.ok);
  }
  console.log('-'.repeat(58));
  console.log(`${rows.length} components -> ${OUT_DIR}`);
  console.log(`manifest -> ${manifestPath}\n`);
}

main().catch((err) => {
  console.error('\ngen:components FAILED:', err.message);
  console.error(err.stack);
  process.exit(1);
});
