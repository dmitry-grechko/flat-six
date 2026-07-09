// Ignition & direct-injection fuel system for the Porsche 981 (9A1 flat-six DFI).
//
// Horizontally-opposed flat-six: two banks of 3 cylinders splayed left (-X) and
// right (+X). +Z = front, -Z = rear, +Y = up. Engine centered near origin.
//   Bank 1 = right (+X)   Bank 2 = left (-X)
//
// WM CAD refs (981): ignition coils bank 4-6 ~4614 (L-shaped bodies, yellow
// top connectors, single base screw); DFI injector exploded ~4450 (spring
// clamp, angled connector, 3-ridge bellows, O-rings, Teflon tip).
//
// Every primary part (tier !== 'sub') in plugs-parts.json gets a named mesh/group
// at its real location so the app can pin it. Selected sub-parts (plugs,
// injectors, regulator, rail pressure sensor, injector seals) are also placed
// for realism. The root group is named 'ignitionFuel'.

import { group, box, roundBox, cyl, torus, at, rot } from '../lib/primitives.mjs';

export const meta = {
  id: 'plugs',
  label: 'Ignition & Fuel',
  system: 'Engine',
  node: 'ignitionFuel',
  hotspot3d: '0 0.2 0',
};

// Inline material specs (no shared-lib edits).
const SENSOR = { color: 0x2a2d33, metalness: 0.4, roughness: 0.6 };
const RAIL = { color: 0xb0b4ba, metalness: 0.9, roughness: 0.3 };

// X offset of each bank's head from center, and the 3 cylinder Z positions.
const BANK_X = 1.5;
const CYL_Z = [0.7, 0.0, -0.7]; // front, middle, rear

// Build the coil-on-plug + spark-plug + injector stack for one cylinder.
// Coils: blocky L / stepped housings (WM ~4614) — not capsules.
// Injectors: longer nozzle, angled connector, bellows ridges, spring clamp (WM ~4450).
function cylinderStack(bankSign, z, idx, coilGroup, plugGroup, hwGroup, injGroup, sealGroup, railY) {
  const x = bankSign * BANK_X;
  const tag = `${bankSign > 0 ? 'b1' : 'b2'}_${idx}`;
  const yawSign = bankSign;

  // --- Ignition coil: L-shaped / stepped housing (WM 4614 Fig 1) ---
  // Upper blocky body + narrower stalk into plug well; yellow connector on top;
  // single fastening screw on base flange tab.
  const coilLocal = group(`coilAsm_${tag}`);
  at(coilLocal, x, 0.52, z);
  rot(coilLocal, 0, 0, yawSign * 0.12);
  coilGroup.add(coilLocal);

  // main rectangular body (thick upper block)
  coilLocal.add(at(roundBox(`coilBody_${tag}`, 0.28, 0.22, 0.32, 'cover', 2), 0, 0.12, 0));
  // stepped lower shoulder (L step toward outboard)
  coilLocal.add(at(box(`coilStep_${tag}`, 0.2, 0.12, 0.26, 'cover'), bankSign * 0.04, -0.02, 0));
  // stalk / boot into spark-plug well
  coilLocal.add(at(cyl(`coilBoot_${tag}`, 0.075, 0.095, 0.34, 'rubber', 14), 0, -0.28, 0));
  // triangular-ish mount flange tab at base of block
  coilLocal.add(at(box(`coilFlange_${tag}`, 0.1, 0.04, 0.14, 'cover'), bankSign * 0.14, -0.08, 0));

  // yellow cable plug on top (WM 4614 label 2)
  coilLocal.add(at(box(`coilConn_${tag}`, 0.12, 0.1, 0.14, 'yellow'), bankSign * 0.02, 0.28, 0));
  coilLocal.add(at(box(`coilConnLock_${tag}`, 0.08, 0.04, 0.08, 'yellow'), bankSign * 0.02, 0.34, 0));

  // --- Coil mounting hardware: single M6 at base flange (WM 4614 label 3) ---
  hwGroup.add(at(cyl(`coilBolt_${tag}`, 0.035, 0.035, 0.09, 'bolt', 8), x + bankSign * 0.14, 0.42, z));

  // --- Spark plug below the boot ---
  plugGroup.add(at(cyl(`plugBody_${tag}`, 0.06, 0.06, 0.2, 'steel', 14), x, 0.0, z));
  plugGroup.add(at(cyl(`plugHex_${tag}`, 0.08, 0.08, 0.07, 'aluDark', 6), x, 0.1, z));
  plugGroup.add(at(cyl(`plugTip_${tag}`, 0.018, 0.018, 0.09, 'steel', 8), x, -0.14, z));

  // --- DFI injector (WM 4450 exploded) ---
  // Longer nozzle, angled electrical connector, 3-ridge bellows, spring clamp.
  const injX = x - bankSign * 0.36;
  const injY = railY - 0.12;
  const injLocal = group(`injectorAsm_${tag}`);
  at(injLocal, injX, injY, z);
  rot(injLocal, 0, 0, bankSign * 0.45);
  injGroup.add(injLocal);

  // upper inlet / body
  injLocal.add(at(cyl(`injector_${tag}`, 0.048, 0.055, 0.18, SENSOR, 14), 0, 0.12, 0));
  // faceted mid body
  injLocal.add(at(cyl(`injMid_${tag}`, 0.06, 0.055, 0.1, 'aluDark', 8), 0, 0.0, 0));
  // long slender nozzle
  injLocal.add(at(cyl(`injNozzle_${tag}`, 0.028, 0.032, 0.28, 'steel', 12), 0, -0.2, 0));
  // angled electrical connector (signature L silhouette)
  const conn = at(box(`injConn_${tag}`, 0.08, 0.06, 0.14, 'cover'), bankSign * 0.08, 0.16, 0.02);
  rot(conn, 0, 0, bankSign * -0.55);
  injLocal.add(conn);
  // spring clamp at top (WM 4450 item 1)
  injLocal.add(at(torus(`injClamp_${tag}`, 0.055, 0.012, 'steel', 6, 16), 0, 0.22, 0));
  injLocal.add(at(box(`injClampArm_${tag}`, 0.04, 0.03, 0.08, 'steel'), bankSign * 0.05, 0.24, 0));
  // bellows with 3 ridges (WM 4450 item 4)
  for (let r = 0; r < 3; r++) {
    injLocal.add(at(torus(`injBellow_${tag}_${r}`, 0.05, 0.012, 'rubber', 6, 14), 0, -0.06 - r * 0.035, 0));
  }

  // --- Injector seals: upper O-ring + Teflon tip (WM 4450 items 2, 7) ---
  sealGroup.add(at(torus(`injSealHi_${tag}`, 0.05, 0.012, 'rubber', 8, 18), injX, railY + 0.02, z));
  sealGroup.add(at(torus(`injSealLo_${tag}`, 0.035, 0.012, 'rubber', 8, 18), injX - bankSign * 0.08, railY - 0.38, z));
}

export function build() {
  const ign = group('ignitionFuel');

  // ---- Pinned group nodes (names MUST match plugs-parts.json) ----
  const ignitionCoils = group('ignitionCoils');                 // primary
  const sparkPlugs = group('sparkPlugs');                       // sub
  const ignitionCoilMountingHardware = group('ignitionCoilMountingHardware'); // sub
  const directInjectors = group('directInjectors');             // sub
  const injectorSeals = group('injectorSeals');                 // sub
  const camPositionSensors = group('camPositionSensors');       // primary (x4)
  const knockSensors = group('knockSensors');                   // primary (x2)

  ign.add(ignitionCoils, sparkPlugs, ignitionCoilMountingHardware, directInjectors, injectorSeals, camPositionSensors, knockSensors);

  // High-pressure fuel rails — one horizontal cylinder per bank along Z.
  const railY = 0.42;
  const railLen = 1.9;
  const hpFuelRailBank1 = at(rot(cyl('hpFuelRailBank1', 0.07, 0.07, railLen, RAIL, 20), Math.PI / 2, 0, 0), BANK_X - 0.34, railY, 0);
  const hpFuelRailBank2 = at(rot(cyl('hpFuelRailBank2', 0.07, 0.07, railLen, RAIL, 20), Math.PI / 2, 0, 0), -(BANK_X - 0.34), railY, 0);
  ign.add(hpFuelRailBank1, hpFuelRailBank2);

  // Per-cylinder stacks on each bank (3 per bank).
  for (let i = 0; i < CYL_Z.length; i++) {
    cylinderStack(+1, CYL_Z[i], i, ignitionCoils, sparkPlugs, ignitionCoilMountingHardware, directInjectors, injectorSeals, railY);
    cylinderStack(-1, CYL_Z[i], i, ignitionCoils, sparkPlugs, ignitionCoilMountingHardware, directInjectors, injectorSeals, railY);
  }

  // ---- Camshaft position sensors (x4) ----
  const camFrontZ = 1.1;
  const camSensorY = 0.55;
  camPositionSensors.add(at(cyl('camSensor_b1_intake', 0.04, 0.04, 0.16, SENSOR, 12), BANK_X + 0.18, camSensorY, camFrontZ));
  camPositionSensors.add(at(cyl('camSensor_b1_exhaust', 0.04, 0.04, 0.16, SENSOR, 12), BANK_X - 0.18, camSensorY, camFrontZ));
  camPositionSensors.add(at(cyl('camSensor_b2_intake', 0.04, 0.04, 0.16, SENSOR, 12), -(BANK_X + 0.18), camSensorY, camFrontZ));
  camPositionSensors.add(at(cyl('camSensor_b2_exhaust', 0.04, 0.04, 0.16, SENSOR, 12), -(BANK_X - 0.18), camSensorY, camFrontZ));

  // ---- Knock sensors (x2) ----
  knockSensors.add(at(cyl('knockSensor_b1', 0.06, 0.06, 0.09, SENSOR, 12), BANK_X - 0.6, -0.1, 0.1));
  knockSensors.add(at(cyl('knockSensor_b2', 0.06, 0.06, 0.09, SENSOR, 12), -(BANK_X - 0.6), -0.1, 0.1));

  // ---- Crankshaft position sensor (CKP) ----
  const crankshaftPositionSensor = at(rot(cyl('crankshaftPositionSensor', 0.05, 0.05, 0.18, SENSOR, 12), Math.PI / 2, 0, 0), 0, -0.35, -0.55);
  ign.add(crankshaftPositionSensor);

  // ---- High-pressure fuel pump ----
  const highPressureFuelPump = group('highPressureFuelPump');
  highPressureFuelPump.add(at(cyl('hpPumpBody', 0.13, 0.13, 0.34, 'aluDark', 20), BANK_X - 0.1, 0.3, camFrontZ + 0.1));
  highPressureFuelPump.add(at(cyl('hpPumpInlet', 0.04, 0.04, 0.12, 'bolt', 12), BANK_X - 0.1, 0.5, camFrontZ + 0.1));
  ign.add(highPressureFuelPump);

  // ---- Fuel pressure regulator (sub) ----
  const fuelPressureRegulator = at(cyl('fuelPressureRegulator', 0.05, 0.05, 0.12, SENSOR, 12), BANK_X - 0.24, 0.36, camFrontZ + 0.1);
  ign.add(fuelPressureRegulator);

  // ---- Fuel rail pressure sensor (sub) ----
  const fuelRailPressureSensor = at(cyl('fuelRailPressureSensor', 0.035, 0.035, 0.14, SENSOR, 12), BANK_X - 0.34, railY + 0.13, -0.85);
  ign.add(fuelRailPressureSensor);

  // ---- Low-pressure / lift fuel pump ----
  const lowPressureFuelPump = group('lowPressureFuelPump');
  lowPressureFuelPump.add(at(cyl('lpPumpBody', 0.18, 0.18, 0.5, 'aluDark', 20), 0, -0.1, 3.4));
  lowPressureFuelPump.add(at(cyl('lpPumpOutlet', 0.04, 0.04, 0.16, 'bolt', 12), 0, 0.2, 3.4));
  ign.add(lowPressureFuelPump);

  // ---- Fuel pump relay ----
  const fuelPumpRelay = at(box('fuelPumpRelay', 0.16, 0.18, 0.12, 'cover'), 0.5, 0.1, 3.7);
  ign.add(fuelPumpRelay);

  // ---- Fuel tank filler neck check valve ----
  const fuelTankFillerNeckCheckValve = group('fuelTankFillerNeckCheckValve');
  fuelTankFillerNeckCheckValve.add(at(rot(cyl('checkValveBody', 0.07, 0.07, 0.16, 'aluDark', 14), 0, 0, Math.PI / 2), -0.8, 0.0, 3.9));
  fuelTankFillerNeckCheckValve.add(at(torus('checkValveSeal', 0.06, 0.018, 'rubber', 8, 18), -0.72, 0.0, 3.9));
  ign.add(fuelTankFillerNeckCheckValve);

  return ign;
}
