// Load WM-traced profiles produced by tools/gen/wm-refs/trace-silhouette.py
// JSON lives under tools/gen/wm-refs/<gen>/traces/ (gitignored PNGs; JSON ok to commit).

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../..');

export function loadTrace(relPath) {
  const abs = join(ROOT, 'tools/gen/wm-refs', relPath);
  if (!existsSync(abs)) {
    throw new Error(`WM trace missing: ${abs} — run tools/gen/wm-refs/trace-silhouette.py`);
  }
  return JSON.parse(readFileSync(abs, 'utf8'));
}

export function footprint(relPath) {
  const t = loadTrace(relPath);
  if (!t.points2d?.length) throw new Error(`No points2d in ${relPath}`);
  return t.points2d;
}

/** Map a traced XY centerline into gen space with origin + optional axis remap. */
export function centerline(relPath, {
  origin = [0, 0, 0],
  // traced plane xy → [x,y,0]; map to gen axes
  map = (x, y, z) => [x, y, z],
  scale = 1,
} = {}) {
  const t = loadTrace(relPath);
  if (!t.points3d?.length) throw new Error(`No points3d in ${relPath}`);
  return t.points3d.map(([x, y, z]) => {
    const [mx, my, mz] = map(x * scale, y * scale, z * scale);
    return [mx + origin[0], my + origin[1], mz + origin[2]];
  });
}
