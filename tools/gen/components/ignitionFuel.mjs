// Ignition & direct-injection fuel system for the Porsche 981 (9A1 flat-six DFI).
//
// Horizontally-opposed flat-six: two banks of 3 cylinders splayed left (-X) and
// right (+X). +Z = front, -Z = rear, +Y = up. Engine centered near origin.
//   Bank 1 = right (+X)   Bank 2 = left (-X)
//
// Every primary part (tier !== 'sub') in plugs-parts.json gets a named mesh/group
// at its real location so the app can pin it. Selected sub-parts (plugs,
// injectors, regulator, rail pressure sensor, injector seals) are also placed
// for realism. The root group is named 'ignitionFuel'.

import { group, box, cyl, torus, at, rot } from '../lib/primitives.mjs';

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

// Build the coil-on-plug + spark-plug stack for one cylinder.
// Returns a small group placed by the caller; child meshes carry shared names
// across cylinders (ignitionCoils / sparkPlugs etc. are the pinned group nodes).
function cylinderStack(bankSign, z, idx, coilGroup, plugGroup, hwGroup, injGroup, sealGroup, railY) {
  const x = bankSign * BANK_X;
  // tip slightly inboard/up toward the cam cover, plug fires down into the head
  const yawSign = bankSign; // splay the coil body outward

  // --- Ignition coil pack (box) ---
  const coil = at(box(`coilBody_${bankSign > 0 ? 'b1' : 'b2'}_${idx}`, 0.26, 0.34, 0.3, 'cover'), x, 0.55, z);
  rot(coil, 0, 0, yawSign * 0.18);
  coilGroup.add(coil);

  // coil connector nub
  coilGroup.add(at(box(`coilConn_${bankSign > 0 ? 'b1' : 'b2'}_${idx}`, 0.1, 0.08, 0.12, 'cover'), x + bankSign * 0.16, 0.66, z));

  // boot reaching down toward the plug
  coilGroup.add(at(cyl(`coilBoot_${bankSign > 0 ? 'b1' : 'b2'}_${idx}`, 0.08, 0.1, 0.32, 'rubber', 14), x, 0.24, z));

  // --- Coil mounting hardware (M6 bolt) ---
  hwGroup.add(at(cyl(`coilBolt_${bankSign > 0 ? 'b1' : 'b2'}_${idx}`, 0.04, 0.04, 0.1, 'bolt', 8), x + bankSign * 0.12, 0.72, z));

  // --- Spark plug below the boot, threaded into the head ---
  plugGroup.add(at(cyl(`plugBody_${bankSign > 0 ? 'b1' : 'b2'}_${idx}`, 0.06, 0.06, 0.2, 'steel', 14), x, 0.0, z));
  plugGroup.add(at(cyl(`plugHex_${bankSign > 0 ? 'b1' : 'b2'}_${idx}`, 0.08, 0.08, 0.07, 'aluDark', 6), x, 0.1, z));
  plugGroup.add(at(cyl(`plugTip_${bankSign > 0 ? 'b1' : 'b2'}_${idx}`, 0.018, 0.018, 0.09, 'steel', 8), x, -0.14, z));

  // --- Direct injector (side-mount, into the head, fed from the rail) ---
  const inj = at(cyl(`injector_${bankSign > 0 ? 'b1' : 'b2'}_${idx}`, 0.05, 0.06, 0.26, SENSOR, 14), x - bankSign * 0.34, railY - 0.16, z);
  rot(inj, 0, 0, bankSign * 0.5);
  injGroup.add(inj);

  // --- Injector seals / O-rings (combustion-side + upper) ---
  sealGroup.add(at(torus(`injSealLo_${bankSign > 0 ? 'b1' : 'b2'}_${idx}`, 0.052, 0.014, 'rubber', 8, 18), x - bankSign * 0.4, railY - 0.27, z));
  sealGroup.add(at(torus(`injSealHi_${bankSign > 0 ? 'b1' : 'b2'}_${idx}`, 0.052, 0.014, 'rubber', 8, 18), x - bankSign * 0.28, railY - 0.05, z));
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
  // Bank 1 = right (+X), Bank 2 = left (-X).
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

  // ---- Camshaft position sensors (x4): one per cam at the FRONT of each bank's cam cover ----
  // Two cams per bank (intake/exhaust) -> 4 sensors at +Z (front).
  const camFrontZ = 1.1;
  const camSensorY = 0.55;
  camPositionSensors.add(at(cyl('camSensor_b1_intake', 0.04, 0.04, 0.16, SENSOR, 12), BANK_X + 0.18, camSensorY, camFrontZ));
  camPositionSensors.add(at(cyl('camSensor_b1_exhaust', 0.04, 0.04, 0.16, SENSOR, 12), BANK_X - 0.18, camSensorY, camFrontZ));
  camPositionSensors.add(at(cyl('camSensor_b2_intake', 0.04, 0.04, 0.16, SENSOR, 12), -(BANK_X + 0.18), camSensorY, camFrontZ));
  camPositionSensors.add(at(cyl('camSensor_b2_exhaust', 0.04, 0.04, 0.16, SENSOR, 12), -(BANK_X - 0.18), camSensorY, camFrontZ));

  // ---- Knock sensors (x2): one per bank, low on the block flank ----
  knockSensors.add(at(cyl('knockSensor_b1', 0.06, 0.06, 0.09, SENSOR, 12), BANK_X - 0.6, -0.1, 0.1));
  knockSensors.add(at(cyl('knockSensor_b2', 0.06, 0.06, 0.09, SENSOR, 12), -(BANK_X - 0.6), -0.1, 0.1));

  // ---- Crankshaft position sensor (CKP): small cylinder low-center near the crank ----
  const crankshaftPositionSensor = at(rot(cyl('crankshaftPositionSensor', 0.05, 0.05, 0.18, SENSOR, 12), Math.PI / 2, 0, 0), 0, -0.35, -0.55);
  ign.add(crankshaftPositionSensor);

  // ---- High-pressure fuel pump (cam-driven): cylinder mounted on Bank 1, front ----
  const highPressureFuelPump = group('highPressureFuelPump');
  highPressureFuelPump.add(at(cyl('hpPumpBody', 0.13, 0.13, 0.34, 'aluDark', 20), BANK_X - 0.1, 0.3, camFrontZ + 0.1));
  highPressureFuelPump.add(at(cyl('hpPumpInlet', 0.04, 0.04, 0.12, 'bolt', 12), BANK_X - 0.1, 0.5, camFrontZ + 0.1));
  ign.add(highPressureFuelPump);

  // ---- Fuel pressure regulator (sub, on the HP pump circuit): small cylinder on the pump ----
  const fuelPressureRegulator = at(cyl('fuelPressureRegulator', 0.05, 0.05, 0.12, SENSOR, 12), BANK_X - 0.24, 0.36, camFrontZ + 0.1);
  ign.add(fuelPressureRegulator);

  // ---- Fuel rail pressure sensor (sub, ~200 bar, threaded into Bank 1 rail) ----
  const fuelRailPressureSensor = at(cyl('fuelRailPressureSensor', 0.035, 0.035, 0.14, SENSOR, 12), BANK_X - 0.34, railY + 0.13, -0.85);
  ign.add(fuelRailPressureSensor);

  // ---- Low-pressure / lift fuel pump (in-tank): canister placed forward (system overview) ----
  const lowPressureFuelPump = group('lowPressureFuelPump');
  lowPressureFuelPump.add(at(cyl('lpPumpBody', 0.18, 0.18, 0.5, 'aluDark', 20), 0, -0.1, 3.4));
  lowPressureFuelPump.add(at(cyl('lpPumpOutlet', 0.04, 0.04, 0.16, 'bolt', 12), 0, 0.2, 3.4));
  ign.add(lowPressureFuelPump);

  // ---- Fuel pump relay: small box in the (front) fuse/relay carrier ----
  const fuelPumpRelay = at(box('fuelPumpRelay', 0.16, 0.18, 0.12, 'cover'), 0.5, 0.1, 3.7);
  ign.add(fuelPumpRelay);

  // ---- Fuel tank filler neck check valve: small part forward at the filler neck ----
  const fuelTankFillerNeckCheckValve = group('fuelTankFillerNeckCheckValve');
  fuelTankFillerNeckCheckValve.add(at(rot(cyl('checkValveBody', 0.07, 0.07, 0.16, 'aluDark', 14), 0, 0, Math.PI / 2), -0.8, 0.0, 3.9));
  fuelTankFillerNeckCheckValve.add(at(torus('checkValveSeal', 0.06, 0.018, 'rubber', 8, 18), -0.72, 0.0, 3.9));
  ign.add(fuelTankFillerNeckCheckValve);

  return ign;
}
