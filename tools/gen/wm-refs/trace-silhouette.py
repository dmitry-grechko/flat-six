#!/usr/bin/env python3
"""
Trace WM CAD figure PNGs → gen-ready profiles / hose centerlines.

Uses blue CAD highlights (Porsche WM style) when present; otherwise largest
dark contour. Outputs JSON + a JS snippet for pasting into gen scripts.

  /tmp/wm-trace-venv/bin/python tools/gen/wm-refs/trace-silhouette.py \\
    --image tools/gen/wm-refs/981/engine/oil-pan-4035.png \\
    --mode footprint --name OIL_PAN_FOOTPRINT --width 2.4

  /tmp/wm-trace-venv/bin/python tools/gen/wm-refs/trace-silhouette.py \\
    --image tools/gen/wm-refs/981/cooling/coolant-hoses-3537.png \\
    --mode centerline --name HOSE_PATH --length 1.2
"""

from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path

import cv2
import numpy as np


def blue_mask(bgr: np.ndarray) -> np.ndarray:
  """Porsche WM CAD often paints the subject bright blue."""
  hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV)
  # Broad blue / cyan band
  m1 = cv2.inRange(hsv, (90, 40, 40), (140, 255, 255))
  # Also catch saturated blue in BGR space
  b, g, r = cv2.split(bgr)
  m2 = ((b.astype(np.int16) - r.astype(np.int16) > 40)
        & (b.astype(np.int16) - g.astype(np.int16) > 20)
        & (b > 80)).astype(np.uint8) * 255
  mask = cv2.bitwise_or(m1, m2)
  k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
  mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, k, iterations=2)
  mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, k, iterations=1)
  return mask


def largest_contour(mask: np.ndarray):
  cnts, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
  if not cnts:
    return None
  return max(cnts, key=cv2.contourArea)


def simplify_poly(cnt, epsilon_frac=0.008, max_pts=28):
  peri = cv2.arcLength(cnt, True)
  approx = cv2.approxPolyDP(cnt, epsilon_frac * peri, True)
  pts = approx.reshape(-1, 2).astype(float)
  # If still too dense, increase epsilon
  while len(pts) > max_pts and epsilon_frac < 0.05:
    epsilon_frac *= 1.4
    approx = cv2.approxPolyDP(cnt, epsilon_frac * peri, True)
    pts = approx.reshape(-1, 2).astype(float)
  return pts


def normalize_footprint(pts: np.ndarray, target_width: float):
  """Map image XY → gen [x,z] centered, width = target_width (X span)."""
  xs, ys = pts[:, 0], pts[:, 1]
  cx, cy = xs.mean(), ys.mean()
  # Image Y down → gen Z forward (flip Y)
  local = np.column_stack([xs - cx, -(ys - cy)])
  span = max(float(np.ptp(local[:, 0])), 1e-6)
  scale = target_width / span
  out = local * scale
  # Ensure CCW winding for THREE.Shape
  area = 0.0
  for i in range(len(out)):
    x1, y1 = out[i]
    x2, y2 = out[(i + 1) % len(out)]
    area += x1 * y2 - x2 * y1
  if area < 0:
    out = out[::-1].copy()
  return out


def skeleton_centerline(mask: np.ndarray, n_samples=10):
  """Centerline of the most elongated blue blob (avoids dual-hose zigzags)."""
  cnts, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
  if not cnts:
    return None

  # Prefer the most elongated significant component (single hose, not the pair)
  best = None
  best_score = -1
  for c in cnts:
    area = cv2.contourArea(c)
    if area < 800:
      continue
    (_, _), (w, h), _ = cv2.minAreaRect(c)
    elong = max(w, h) / max(min(w, h), 1.0)
    score = area * elong
    if score > best_score:
      best_score = score
      best = c
  if best is None:
    best = max(cnts, key=cv2.contourArea)

  single = np.zeros_like(mask)
  cv2.drawContours(single, [best], -1, 255, -1)

  # Distance-transform medial samples along PCA of the blob
  dist = cv2.distanceTransform(single, cv2.DIST_L2, 5)
  ys, xs = np.where(single > 0)
  if len(xs) < 10:
    return None
  pts = np.column_stack([xs.astype(float), ys.astype(float)])
  mean = pts.mean(axis=0)
  centered = pts - mean
  _, _, vt = np.linalg.svd(centered, full_matrices=False)
  axis = vt[0]
  t = centered @ axis
  t_min, t_max = t.min(), t.max()
  sampled = []
  for u in np.linspace(t_min, t_max, n_samples):
    band = np.abs(t - u) < (t_max - t_min) / (n_samples * 1.5)
    if not np.any(band):
      continue
    # Pick point in band with max distance-to-edge (medial)
    idx = np.where(band)[0]
    dvals = dist[ys[idx], xs[idx]]
    pick = idx[int(np.argmax(dvals))]
    sampled.append([xs[pick], ys[pick]])
  if len(sampled) < 3:
    return None
  return np.array(sampled, dtype=float)


def normalize_centerline(pts: np.ndarray, length: float, plane='xz'):
  """Map image path → gen waypoints of given arc length, centered at origin."""
  # Flip Y
  local = np.column_stack([pts[:, 0], -pts[:, 1]])
  local -= local.mean(axis=0)
  diffs = np.diff(local, axis=0)
  seglen = np.sqrt((diffs ** 2).sum(axis=1))
  total = seglen.sum() or 1.0
  scale = length / total
  local *= scale
  # Re-center start at 0 for easier placement
  local -= local[0]
  if plane == 'xz':
    # [x, 0, z] — hose in horizontal plane; caller offsets Y
    return np.column_stack([local[:, 0], np.zeros(len(local)), local[:, 1]])
  if plane == 'xy':
    return np.column_stack([local[:, 0], local[:, 1], np.zeros(len(local))])
  # yz
  return np.column_stack([np.zeros(len(local)), local[:, 1], local[:, 0]])


def js_array_2d(name: str, pts: np.ndarray, decimals=3) -> str:
  rows = ',\n  '.join(
    f'[{p[0]:.{decimals}f}, {p[1]:.{decimals}f}]' for p in pts
  )
  return f'const {name} = [\n  {rows},\n];'


def js_array_3d(name: str, pts: np.ndarray, decimals=3) -> str:
  rows = ',\n  '.join(
    f'[{p[0]:.{decimals}f}, {p[1]:.{decimals}f}, {p[2]:.{decimals}f}]' for p in pts
  )
  return f'const {name} = [\n  {rows},\n];'


def main():
  ap = argparse.ArgumentParser()
  ap.add_argument('--image', required=True)
  ap.add_argument('--mode', choices=['footprint', 'centerline'], required=True)
  ap.add_argument('--name', required=True)
  ap.add_argument('--width', type=float, default=2.4, help='footprint X span in gen units')
  ap.add_argument('--length', type=float, default=1.2, help='centerline arc length')
  ap.add_argument('--plane', default='xz', choices=['xz', 'xy', 'yz'])
  ap.add_argument('--samples', type=int, default=10)
  ap.add_argument('--epsilon', type=float, default=0.01)
  ap.add_argument('--out', default=None, help='write JSON next to image or path')
  ap.add_argument('--debug', default=None, help='write debug overlay PNG')
  args = ap.parse_args()

  path = Path(args.image)
  bgr = cv2.imread(str(path))
  if bgr is None:
    sys.exit(f'Could not read {path}')

  mask = blue_mask(bgr)
  blue_area = int(cv2.countNonZero(mask))
  if blue_area < 500:
    # Fallback: threshold dark lines / filled CAD
    gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
    # Invert so dark CAD becomes white
    _, mask = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, k, iterations=2)
    print(f'# fallback dark mask (blue area was {blue_area})', file=sys.stderr)
  else:
    print(f'# blue mask area={blue_area}', file=sys.stderr)

  cnt = largest_contour(mask)
  if cnt is None or cv2.contourArea(cnt) < 200:
    sys.exit('No usable contour found')

  debug = bgr.copy()
  cv2.drawContours(debug, [cnt], -1, (0, 255, 0), 2)

  result = {'source': str(path), 'mode': args.mode, 'name': args.name}

  if args.mode == 'footprint':
    poly = simplify_poly(cnt, epsilon_frac=args.epsilon)
    for p in poly.astype(int):
      cv2.circle(debug, tuple(p), 4, (0, 0, 255), -1)
    norm = normalize_footprint(poly, args.width)
    result['points2d'] = [[round(float(x), 4), round(float(z), 4)] for x, z in norm]
    result['pointCount'] = len(norm)
    print(js_array_2d(args.name, norm))
  else:
    cl = skeleton_centerline(mask, n_samples=args.samples)
    if cl is None:
      sys.exit('Could not extract centerline')
    for p in cl.astype(int):
      cv2.circle(debug, tuple(p), 5, (0, 0, 255), -1)
    for i in range(len(cl) - 1):
      cv2.line(debug, tuple(cl[i].astype(int)), tuple(cl[i + 1].astype(int)), (255, 0, 0), 2)
    norm = normalize_centerline(cl, args.length, plane=args.plane)
    result['points3d'] = [[round(float(a), 4), round(float(b), 4), round(float(c), 4)] for a, b, c in norm]
    result['pointCount'] = len(norm)
    print(js_array_3d(args.name, norm))

  out = Path(args.out) if args.out else path.with_suffix('.trace.json')
  out.write_text(json.dumps(result, indent=2) + '\n')
  print(f'# wrote {out}', file=sys.stderr)

  if args.debug:
    cv2.imwrite(args.debug, debug)
    print(f'# debug {args.debug}', file=sys.stderr)
  else:
    dbg = path.with_name(path.stem + '-trace-debug.png')
    cv2.imwrite(str(dbg), debug)
    print(f'# debug {dbg}', file=sys.stderr)


if __name__ == '__main__':
  main()
