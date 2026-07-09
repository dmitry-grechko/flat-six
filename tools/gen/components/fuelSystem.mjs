// Fuel system (id 'fuel') — tank, pump, sender, EVAP, filler, under-shield.
// WM 20 Fuel Supply: Overview Of Fuel Tank Component (~4310).
// Car-space-ish packaging: tank low ahead of cabin (z≈+0.9), filler to side.
// Coordinate: +Z front, -Z rear, +Y up, +X right.

import { group, box, roundBox, cyl, tube, torus, at, rot } from '../lib/primitives.mjs';

export const meta = {
  id: 'fuel',
  label: 'Fuel Tank & Supply',
  system: 'Fuel',
  node: 'fuelSystem',
  hotspot3d: '0 -0.1 0.9',
};

const TANK = { color: 0x3b3f45, metalness: 0.35, roughness: 0.65 };
const PLASTIC = { color: 0x2a2d33, metalness: 0.2, roughness: 0.75 };
const LINE = { color: 0x4a5058, metalness: 0.7, roughness: 0.45 };

export function build() {
  const fuel = group('fuelSystem');
  const add = (m, p = fuel) => { p.add(m); return m; };

  // 1. Fuel tank — irregular low tank (WM overview -1-)
  const tank = group('fuelTank');
  add(at(roundBox('fuelTankBody', 0.72, 0.28, 0.55, TANK), 0, 0, 0), tank);
  add(at(roundBox('fuelTankShoulder', 0.5, 0.16, 0.22, TANK), 0.08, 0.12, -0.18), tank);
  add(at(cyl('fuelTankSenderPort', 0.12, 0.12, 0.04, 'cast', 16), -0.12, 0.16, 0.05), tank);
  fuel.add(at(tank, 0, -0.05, 0.95));

  // 13. Protective pan + 14. straps
  const pan = group('fuelTankProtectivePan');
  add(at(box('fuelTankProtectivePan_tray', 0.78, 0.04, 0.6, 'castDark'), 0, 0, 0), pan);
  add(at(box('fuelTankStrap_L', 0.04, 0.06, 0.62, 'steel'), -0.28, 0.04, 0), pan);
  add(at(box('fuelTankStrap_R', 0.04, 0.06, 0.62, 'steel'), 0.28, 0.04, 0), pan);
  fuel.add(at(pan, 0, -0.22, 0.95));

  // 3–5. Level sender + locking ring + in-tank pump
  const sender = group('fuelLevelSender');
  add(at(cyl('fuelLevelSender_body', 0.08, 0.08, 0.18, PLASTIC, 14), 0, 0, 0), sender);
  add(at(box('fuelLevelSender_floatArm', 0.22, 0.02, 0.02, 'steel'), 0.12, -0.06, 0), sender);
  add(at(cyl('fuelLevelSender_float', 0.04, 0.04, 0.05, PLASTIC, 10), 0.22, -0.08, 0), sender);
  fuel.add(at(sender, -0.12, 0.12, 1.0));

  add(rot(at(torus('fuelSenderLockRing', 0.13, 0.02, 'steel', 8, 24), -0.12, 0.18, 1.0), Math.PI / 2, 0, 0));

  const pump = group('fuelPump');
  add(at(cyl('fuelPump_body', 0.07, 0.07, 0.22, PLASTIC, 14), 0, 0, 0), pump);
  add(at(cyl('fuelPump_inlet', 0.03, 0.03, 0.08, 'cast', 10), 0, -0.12, 0), pump);
  fuel.add(at(pump, 0.1, 0.02, 0.88));

  // 6–7. Carbon canister + leakage diagnosis (US/Canada packaging)
  const canister = group('carbonCanister');
  add(at(box('carbonCanister_body', 0.22, 0.16, 0.28, PLASTIC), 0, 0, 0), canister);
  add(at(cyl('leakageDiagnosisUnit', 0.04, 0.04, 0.08, 'cover', 10), 0.1, 0.1, 0.05), canister);
  fuel.add(at(canister, 0.35, 0.15, 0.75));

  // 9–11. Filler neck + cap (right side)
  const filler = group('fuelFillerNeck');
  add(tube('fuelFillerNeck_pipe', [
    [0.85, 0.35, 1.15],
    [0.55, 0.2, 1.05],
    [0.25, 0.08, 0.98],
    [0.05, 0.02, 0.95],
  ], 0.035, 'cast', 20, 10), filler);
  add(at(cyl('fuelTankCap', 0.055, 0.055, 0.04, 'cover', 16), 0.88, 0.38, 1.16), filler);
  fuel.add(filler);

  // 8 / 15 / 16. Vent + supply lines toward engine
  add(tube('tankVentLine', [
    [0.35, 0.22, 0.75],
    [0.2, 0.3, 0.4],
    [0.1, 0.25, 0.0],
    [0.05, 0.2, -0.5],
  ], 0.012, 'hose', 24, 8));

  add(tube('fuelLinesToEngine', [
    [0.05, -0.05, 0.85],
    [-0.05, -0.15, 0.4],
    [-0.1, -0.2, 0.0],
    [-0.15, -0.15, -0.5],
    [-0.2, 0.05, -0.85],
  ], 0.014, LINE, 28, 8));

  add(tube('freshAirLine', [
    [0.45, 0.18, 0.7],
    [0.5, 0.25, 0.3],
    [0.4, 0.2, -0.2],
  ], 0.01, 'hose', 18, 6));

  return fuel;
}
