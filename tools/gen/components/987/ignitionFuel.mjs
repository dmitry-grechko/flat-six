// Ignition & fuel system for the Porsche 987.2 (2009–2012 Boxster/Cayman),
// forked from the 981 builder and calibrated against the 2009 "Service
// Introduction" (fuel & ignition chapter):
//
//   - Ignition coils (SI doc p49/50, Figs 2_22_09 / 2_23_09): ROD-type
//     ignition modules with integral output driver — slim connector head,
//     ribbed seal collar, long rod extending into the spark-plug recess.
//     (The blocky L-shaped coil of the 981 module is replaced.)
//   - Spark plugs: SURFACE-GAP plugs with four ground electrodes arranged
//     around the ceramic insulator (SI doc p50, Fig 2_05_02).
//   - High-pressure pump (SI doc p42, Figs 2_12_09 / 2_13_09): three-piston
//     axial pump on the cylinder head of bank 1, driven by the exhaust
//     camshaft; integrated flow control valve (MS, hangs below), pressure
//     control valve, temperature compensator (TK) and 50 µm strainer.
//     40–120 bar rail pressure, ~180 l/h at 120 bar. DFI is fitted to the
//     3.4-litre S engines; the 2.9 uses intake manifold injection (MPI).
//   - High-pressure lines (SI doc p45, Fig 2_11A_09): HP feed from the pump
//     to rail bank 1 and a connecting line over to rail bank 2.
//   - Fuel pressure sensor (DS) on the BANK 2 rail (SI doc p46, Fig 2_18_09).
//   - Fuel pressure regulator (~5.0 bar) is IN THE FUEL TANK on the
//     low-pressure side (SI doc p39, Fig 2_08_09) — moved to the tank area.
//   - Injectors fastened to the head under the rails, which sit below the
//     intake system (SI doc p45); O-ring rail connection, Teflon combustion
//     seal (SI doc p47, Fig 2_20_09).
//
// Flat-six: two banks of 3 cylinders splayed left (-X) and right (+X).
// +Z = front, -Z = rear, +Y = up. Bank 1 = right (+X), Bank 2 = left (-X).
// Every primary part (tier !== 'sub') in plugs-parts.json gets a named
// mesh/group at its real location. The root group is named 'ignitionFuel'.

import { group, box, roundBox, cyl, torus, tube, at, rot } from '../../lib/primitives.mjs';

export const meta = {
  id: 'plugs',
  label: 'Ignition & Fuel',
  system: 'Engine',
  node: 'ignitionFuel',
  hotspot3d: '0 0.2 0',
  generation: '987',
};

// Inline material specs (no shared-lib edits).
const SENSOR = { color: 0x2a2d33, metalness: 0.4, roughness: 0.6 };
const RAIL = { color: 0xb0b4ba, metalness: 0.9, roughness: 0.3 };

// X offset of each bank's head from center, and the 3 cylinder Z positions.
const BANK_X = 1.5;
const CYL_Z = [0.7, 0.0, -0.7]; // front, middle, rear

// BOXER plug/coil axis (see 981 module): horizontal cylinders → the rod
// module + spark plug lie along ±X, inserted from the outboard flank pointing
// in toward the pistons (parallel to the ground). COIL_X = rod-group origin
// on that axis; STACK_Y = head-center height.
const COIL_X = 1.48;
const STACK_Y = 0.3;

// Build the coil-on-plug + spark-plug + injector stack for one cylinder.
// Coils: rod-type ignition modules (SI Fig 2_22_09) — connector head, ribbed
// seal collar, long slim rod into the plug recess (no tilting needed for
// removal because the module extends straight into the recess).
// Injectors: long nozzle, angled connector, bellows ridges, spring clamp.
function cylinderStack(bankSign, z, idx, coilGroup, plugGroup, hwGroup, injGroup, sealGroup, railY) {
  const x = bankSign * BANK_X;
  const tag = `${bankSign > 0 ? 'b1' : 'b2'}_${idx}`;

  // --- Rod-type ignition coil (SI Fig 2_22_09 / 2_23_09) ---
  // Local stack runs +Y (connector head) → −Y (rod/boot); rotating the group
  // −bankSign·90° about Z lays the rod HORIZONTALLY, extending straight into
  // the plug recess from the outboard flank (boxer engine).
  const coilLocal = group(`coilAsm_${tag}`);
  at(coilLocal, bankSign * COIL_X, STACK_Y, z);
  rot(coilLocal, 0, 0, -bankSign * (Math.PI / 2));
  coilGroup.add(coilLocal);

  // connector head on top (4-pin plug connection, sealed)
  coilLocal.add(at(roundBox(`coilHead_${tag}`, 0.16, 0.12, 0.2, 'cover', 2), 0, 0.3, 0));
  coilLocal.add(at(box(`coilConn_${tag}`, 0.1, 0.07, 0.12, 'plastic'), bankSign * 0.1, 0.32, 0));
  // fastening eyelet tab with single bolt
  coilLocal.add(at(box(`coilEyelet_${tag}`, 0.1, 0.03, 0.08, 'cover'), bankSign * 0.13, 0.22, 0));
  // ribbed seal collar (three discs — spray-water sealing at the recess)
  for (let r = 0; r < 3; r++) {
    coilLocal.add(at(cyl(`coilCollar_${tag}_${r}`, 0.085 - r * 0.006, 0.085 - r * 0.006, 0.025, 'aluDark', 16), 0, 0.18 - r * 0.05, 0));
  }
  // long slim rod body — magnetic core / windings / output stage inside,
  // extending down into the spark-plug recess
  coilLocal.add(at(cyl(`coilRod_${tag}`, 0.055, 0.065, 0.42, 'cover', 16), 0, -0.1, 0));
  // high-voltage plug / silicone boot tip onto the spark plug
  coilLocal.add(at(cyl(`coilBoot_${tag}`, 0.045, 0.055, 0.16, 'rubber', 14), 0, -0.38, 0));

  // --- Coil mounting hardware: single bolt at the eyelet, screwed into the
  // head's outboard face (axis along X, like the rod) ---
  hwGroup.add(at(rot(cyl(`coilBolt_${tag}`, 0.035, 0.035, 0.09, 'bolt', 8), 0, 0, Math.PI / 2), bankSign * 1.74, STACK_Y - 0.13, z));

  // --- Surface-gap spark plug inboard of the rod, same horizontal axis ---
  plugGroup.add(at(rot(cyl(`plugBody_${tag}`, 0.06, 0.06, 0.2, 'steel', 14), 0, 0, Math.PI / 2), bankSign * 1.26, STACK_Y, z));
  plugGroup.add(at(rot(cyl(`plugHex_${tag}`, 0.08, 0.08, 0.07, 'aluDark', 6), 0, 0, Math.PI / 2), bankSign * 1.36, STACK_Y, z));
  plugGroup.add(at(rot(cyl(`plugTip_${tag}`, 0.018, 0.018, 0.09, 'steel', 8), 0, 0, Math.PI / 2), bankSign * 1.12, STACK_Y, z));
  // four ground electrodes arranged around the insulator (surface-gap) —
  // ringed around the horizontal plug axis at the tip end
  for (let g = 0; g < 4; g++) {
    const ga = (g / 4) * Math.PI * 2 + Math.PI / 4;
    plugGroup.add(at(box(`plugGndEl_${tag}_${g}`, 0.05, 0.014, 0.014, 'steel'),
      bankSign * 1.06, STACK_Y + Math.cos(ga) * 0.035, z + Math.sin(ga) * 0.035));
  }

  // --- DFI injector (3.4 S engines; SI Fig 2_20_09) ---
  const injX = x - bankSign * 0.36;
  const injY = railY - 0.12;
  const injLocal = group(`injectorAsm_${tag}`);
  at(injLocal, injX, injY, z);
  rot(injLocal, 0, 0, bankSign * 0.45);
  injGroup.add(injLocal);

  // upper inlet / body (O-ring connection to the rail)
  injLocal.add(at(cyl(`injector_${tag}`, 0.048, 0.055, 0.18, SENSOR, 14), 0, 0.12, 0));
  // faceted mid body
  injLocal.add(at(cyl(`injMid_${tag}`, 0.06, 0.055, 0.1, 'aluDark', 8), 0, 0.0, 0));
  // long slender nozzle (spray-cone ~69°, bend angle ~15°)
  injLocal.add(at(cyl(`injNozzle_${tag}`, 0.028, 0.032, 0.28, 'steel', 12), 0, -0.2, 0));
  // angled electrical connector (signature L silhouette)
  const conn = at(box(`injConn_${tag}`, 0.08, 0.06, 0.14, 'cover'), bankSign * 0.08, 0.16, 0.02);
  rot(conn, 0, 0, bankSign * -0.55);
  injLocal.add(conn);
  // spring clamp at top
  injLocal.add(at(torus(`injClamp_${tag}`, 0.055, 0.012, 'steel', 6, 16), 0, 0.22, 0));
  injLocal.add(at(box(`injClampArm_${tag}`, 0.04, 0.03, 0.08, 'steel'), bankSign * 0.05, 0.24, 0));
  // corrosion-protection bellows ridges (SI Fig 2_20_09 item K)
  for (let r = 0; r < 3; r++) {
    injLocal.add(at(torus(`injBellow_${tag}_${r}`, 0.05, 0.012, 'rubber', 6, 14), 0, -0.06 - r * 0.035, 0));
  }

  // --- Injector seals: upper O-ring + spacer ring + Teflon tip seal ---
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

  // High-pressure fuel rails — one per bank, located UNDER the intake system
  // (SI doc p45); rail volume ~100 ccm each; 40–120 bar.
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

  // ---- Knock sensors (x2) — one on each crankcase side (SI doc p49) ----
  knockSensors.add(at(cyl('knockSensor_b1', 0.06, 0.06, 0.09, SENSOR, 12), BANK_X - 0.6, -0.1, 0.1));
  knockSensors.add(at(cyl('knockSensor_b2', 0.06, 0.06, 0.09, SENSOR, 12), -(BANK_X - 0.6), -0.1, 0.1));

  // ---- Crankshaft position sensor (CKP) ----
  const crankshaftPositionSensor = at(rot(cyl('crankshaftPositionSensor', 0.05, 0.05, 0.18, SENSOR, 12), Math.PI / 2, 0, 0), 0, -0.35, -0.55);
  ign.add(crankshaftPositionSensor);

  // ---- High-pressure fuel pump — three-piston pump on the bank 1 cylinder
  // head, driven by the exhaust camshaft (SI doc p42, Fig 2_13_09) ----
  const highPressureFuelPump = group('highPressureFuelPump');
  highPressureFuelPump.add(at(cyl('hpPumpBody', 0.13, 0.13, 0.28, 'aluDark', 20), BANK_X - 0.1, 0.32, camFrontZ + 0.1));
  // domed top + inlet union
  highPressureFuelPump.add(at(cyl('hpPumpDome', 0.1, 0.13, 0.08, 'alu', 20), BANK_X - 0.1, 0.5, camFrontZ + 0.1));
  highPressureFuelPump.add(at(cyl('hpPumpInlet', 0.04, 0.04, 0.12, 'bolt', 12), BANK_X - 0.1, 0.58, camFrontZ + 0.1));
  // flow control valve (MS) hanging below the pump (Fig 2_13_09 / 2_14_09)
  highPressureFuelPump.add(at(cyl('hpPumpFlowControlValve', 0.055, 0.055, 0.16, SENSOR, 14), BANK_X - 0.1, 0.12, camFrontZ + 0.16));
  highPressureFuelPump.add(at(box('hpPumpFCVConn', 0.08, 0.06, 0.08, 'cover'), BANK_X - 0.1, 0.02, camFrontZ + 0.2));
  // temperature compensator (TK) on the side
  highPressureFuelPump.add(rot(at(cyl('hpPumpTempCompensator', 0.05, 0.05, 0.1, 'alu', 12), BANK_X + 0.05, 0.32, camFrontZ + 0.1), 0, 0, Math.PI / 2));
  // mounting flange to the cylinder head
  highPressureFuelPump.add(at(box('hpPumpFlange', 0.26, 0.03, 0.2, 'aluDark'), BANK_X - 0.1, 0.18, camFrontZ + 0.02));
  ign.add(highPressureFuelPump);

  // High-pressure lines (SI Fig 2_11A_09): pump → rail bank 1, and the
  // connecting line over the engine to rail bank 2.
  ign.add(tube('hpLineToRail1', [
    [BANK_X - 0.1, 0.5, camFrontZ + 0.1],
    [BANK_X - 0.25, 0.52, camFrontZ - 0.05],
    [BANK_X - 0.34, 0.44, 0.95],
  ], 0.022, RAIL, 22, 8));
  ign.add(tube('hpConnectingLine', [
    [BANK_X - 0.34, 0.44, 0.9],
    [0.6, 0.72, 1.05],
    [-0.6, 0.72, 1.05],
    [-(BANK_X - 0.34), 0.44, 0.9],
  ], 0.022, RAIL, 28, 8));

  // ---- Fuel pressure regulator (sub) — in the FUEL TANK, low-pressure side
  // ~5.0 bar with DFI / ~4.0 bar with MPI (SI doc p39, Fig 2_08_09) ----
  const fuelPressureRegulator = at(cyl('fuelPressureRegulator', 0.05, 0.05, 0.12, SENSOR, 12), 0.3, 0.05, 3.45);
  ign.add(fuelPressureRegulator);

  // ---- Fuel rail pressure sensor (DS, sub) — on the BANK 2 rail
  // (SI doc p46, Fig 2_18_09) ----
  const fuelRailPressureSensor = at(cyl('fuelRailPressureSensor', 0.035, 0.035, 0.14, SENSOR, 12), -(BANK_X - 0.34), railY + 0.13, 0.15);
  ign.add(fuelRailPressureSensor);

  // ---- Low-pressure / lift fuel pump — in-tank pump with sucking-jet pump,
  // demand-controlled via the fuel pump control unit (SI doc p39/40) ----
  const lowPressureFuelPump = group('lowPressureFuelPump');
  lowPressureFuelPump.add(at(cyl('lpPumpBody', 0.18, 0.18, 0.5, 'aluDark', 20), 0, -0.1, 3.4));
  lowPressureFuelPump.add(at(cyl('lpPumpOutlet', 0.04, 0.04, 0.16, 'bolt', 12), 0, 0.2, 3.4));
  // sucking jet pump (fills the pump chamber — SI Fig 2_08_09 item 1A)
  lowPressureFuelPump.add(at(cyl('lpSuckingJetPump', 0.07, 0.07, 0.2, 'aluDark', 14), 0.22, -0.22, 3.4));
  ign.add(lowPressureFuelPump);

  // ---- Fuel pump control unit / relay function (right-hand side of the
  // plenum panel on DFI cars — SI doc p40, Fig 2_10_09) ----
  const fuelPumpRelay = at(box('fuelPumpRelay', 0.16, 0.18, 0.12, 'cover'), 0.5, 0.1, 3.7);
  ign.add(fuelPumpRelay);

  // ---- Fuel tank filler neck check valve ----
  const fuelTankFillerNeckCheckValve = group('fuelTankFillerNeckCheckValve');
  fuelTankFillerNeckCheckValve.add(at(rot(cyl('checkValveBody', 0.07, 0.07, 0.16, 'aluDark', 14), 0, 0, Math.PI / 2), -0.8, 0.0, 3.9));
  fuelTankFillerNeckCheckValve.add(at(torus('checkValveSeal', 0.06, 0.018, 'rubber', 8, 18), -0.72, 0.0, 3.9));
  ign.add(fuelTankFillerNeckCheckValve);

  return ign;
}
