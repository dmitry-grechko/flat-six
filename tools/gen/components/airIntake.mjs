// 981 Boxster/Cayman flat-six AIR INTAKE SYSTEM — FULL PART COVERAGE BUILD.
//
// The 981 is a mid/rear-engine flat-six: ambient air enters via rear-quarter
// cooling vents into ram-air snorkels, feeds a pair of airboxes (one per bank)
// each holding a panel air filter, passes a MAF/IAT sensor measurement tube,
// then through a flexible airbox-to-throttle-body duct into a per-bank throttle
// body, into a black-plastic variable-geometry intake manifold/plenum per bank
// whose runners feed the three cylinders of that bank. A resonance/tuning flap
// actuator (vacuum unit) switches runner length; MAP/boost & IAT sensors and a
// crankcase breather / PCV line tap into the plenum.
//
// Coordinate convention (shared with the other modules):
//   +X = right, -X = left, +Y = up, +Z = FRONT of car, -Z = REAR.
// Engine sits at the rear (z ~ 0..-1, y ~ +0.5). Bank 1 (right) = +X,
// Bank 2 (left) = -X. Each bank's three cylinders spread along Z.
//
// Every PRIMARY part (tier !== 'sub') in airfilter-parts.json appears as a named
// mesh or group; many sub-parts are emitted too, nested under per-bank groups.

import { group, box, cyl, torus, tube, at, rot } from '../lib/primitives.mjs';
import { makePanel } from './smallParts.mjs';

export const meta = {
  id: 'airfilter',
  label: 'Air Intake',
  system: 'Engine',
  node: 'airIntake',
  hotspot3d: '0 0.5 0',
};

const HALF_PI = Math.PI / 2;

export function build() {
  const air = group('airIntake');
  const add = (m, p = air) => { p.add(m); return m; };

  // Inline sensor material (dark grey moulded connector body).
  const sensorMat = { color: 0x2a2d33, metalness: 0.35, roughness: 0.55 };
  // Three cylinder Z positions per bank (rear engine bay).
  const cylZ = [0.55, 0.0, -0.55];

  // ====================================================================
  // AIRBOX & FILTER — one airbox per bank, high in the rear engine bay.
  // Each airbox is a large box housing a panel air filter element. Ram-air
  // snorkels feed the airbox inlets; mounting grommets isolate the housing;
  // an air guide deflects bay air toward the inlet.
  // ====================================================================

  // --- Air Filter Box / Airbox (x2, one per bank) — PRIMARY node 'airFilterBoxAirbox'
  const airbox = group('airFilterBoxAirbox');
  // --- Air Filters (x2) — PRIMARY node 'airFilters' (the two filter assemblies)
  const airFilters = group('airFilters');

  for (const [dir, sk] of [[1, 'R'], [-1, 'L']]) {
    const bx = dir * 1.25, by = 0.55, bz = 0.1;
    // airbox housing shell
    const box1 = group(`airbox_${sk}`);
    add(at(box(`airboxHousing_${sk}`, 0.95, 0.5, 1.5, 'intake'), bx, by, bz), box1);
    add(at(box(`airboxLid_${sk}`, 0.97, 0.08, 1.52, 'cover'), bx, by + 0.29, bz), box1);
    airbox.add(box1);

    // panel air filter element seated inside this airbox
    // (reuse makePanel, then position the whole panel group inside the housing)
    const panel = makePanel({ node: `airFilterElement_${sk}`, w: 0.8, h: 1.3, d: 0.18 });
    at(panel, bx, by, bz);
    airFilters.add(panel);

    // airbox mounting grommets (x3 rubber buffers under the housing)
    const grommets = group(`airboxMountingGrommet_${sk}`);
    for (let i = 0; i < 3; i++) {
      add(at(cyl(`grommet_${sk}_${i}`, 0.06, 0.06, 0.08, 'rubber', 12),
        bx + dir * 0.4, by - 0.27, bz + (i - 1) * 0.55), grommets);
    }
    airbox.add(grommets);

    // air guide / deflector — a thin angled plate steering bay air to the inlet
    add(rot(at(box(`airGuide_${sk}`, 0.5, 0.02, 0.7, 'cover'), bx + dir * 0.55, by + 0.1, bz + 0.7), 0.4, dir * 0.3, 0), box1);
  }
  // a single named grommet node (contract node 'airboxMountingGrommet')
  add(at(cyl('airboxMountingGrommet', 0.06, 0.06, 0.08, 'rubber', 12), 0, 0.28, 0.95), airbox);
  // a single named air guide node (contract node 'airGuide')
  add(rot(at(box('airGuide', 0.45, 0.02, 0.6, 'cover'), 0, 0.85, 0.95), 0.5, 0, 0), airbox);
  air.add(airbox);

  // single named air filter element node (contract node 'airFilterElement')
  const filterElement = makePanel({ node: 'airFilterElement', w: 0.6, h: 0.9, d: 0.14 });
  at(filterElement, 0, 0.55, 0.1);
  airFilters.add(filterElement);
  air.add(airFilters);

  // ====================================================================
  // RAM-AIR INTAKE — snorkels from rear-quarter vents to each airbox inlet,
  // plus the longer intake ducts/snorkel tubes.
  // ====================================================================

  // --- Ram Air / Intake Snorkel Duct (x2) — PRIMARY node 'ramAirSnorkelDuct'
  const ramAir = group('ramAirSnorkelDuct');
  for (const [dir, sk] of [[1, 'R'], [-1, 'L']]) {
    add(tube(`ramAirSnorkel_${sk}`, [
      [dir * 1.95, 0.35, 1.05],   // outboard rear-quarter vent inlet
      [dir * 1.7, 0.45, 0.85],
      [dir * 1.45, 0.52, 0.6],
      [dir * 1.28, 0.55, 0.45],   // into airbox front face
    ], 0.13, 'rubber', 26, 14), ramAir);
  }
  air.add(ramAir);

  // --- Intake Ducts / Snorkel Tubes (x2) — PRIMARY node 'intakeDuctsSnorkelTubes'
  const intakeDucts = group('intakeDuctsSnorkelTubes');
  for (const [dir, sk] of [[1, 'R'], [-1, 'L']]) {
    add(tube(`intakeDuctSnorkel_${sk}`, [
      [dir * 1.9, 0.2, -0.9],     // bay inlet aft
      [dir * 1.75, 0.35, -0.5],
      [dir * 1.5, 0.5, -0.1],
      [dir * 1.28, 0.55, -0.2],   // into airbox rear face
    ], 0.12, 'rubber', 26, 14), intakeDucts);
  }
  air.add(intakeDucts);

  // ====================================================================
  // SENSORS in the airbox outlet / measurement tube — MAF + IAT.
  // ====================================================================

  // --- Mass Airflow Sensors / MAF (x2) — PRIMARY node 'massAirflowSensorsMaf'
  const maf = group('massAirflowSensorsMaf');
  for (const [dir, sk] of [[1, 'R'], [-1, 'L']]) {
    const mx = dir * 1.0, my = 0.45, mz = -0.55;
    // MAF measurement tube (sub node 'mafSensorHousing') cradling the element
    add(rot(at(cyl(`mafSensorHousing_${sk}`, 0.11, 0.11, 0.26, 'intake', 18), mx, my, mz), 0, 0, HALF_PI), maf);
    // hot-film MAF sensing element / connector plugged into the tube
    add(at(box(`mafElement_${sk}`, 0.08, 0.14, 0.1, sensorMat), mx, my + 0.16, mz), maf);
  }
  // single named housing node (contract sub node 'mafSensorHousing')
  add(rot(at(cyl('mafSensorHousing', 0.1, 0.1, 0.22, 'intake', 16), 0, 0.45, -0.55), 0, 0, HALF_PI), maf);
  air.add(maf);

  // --- Intake Air Temperature Sensors (x2) — PRIMARY node 'intakeAirTemperatureSensors'
  // Typically integrated into the MAF housing.
  const iat = group('intakeAirTemperatureSensors');
  for (const [dir, sk] of [[1, 'R'], [-1, 'L']]) {
    add(at(cyl(`iatSensor_${sk}`, 0.025, 0.025, 0.12, sensorMat, 10), dir * 1.0, 0.58, -0.5), iat);
  }
  air.add(iat);

  // ====================================================================
  // AIRBOX -> THROTTLE BODY DUCTS (flexible boots) — one per bank.
  // ====================================================================

  // --- Airbox-to-Throttle Body Duct, Bank 1 — PRIMARY node 'airboxToThrottleBodyDuctBank1'
  add(tube('airboxToThrottleBodyDuctBank1', [
    [1.0, 0.45, -0.7],          // airbox outlet (R)
    [0.85, 0.5, -0.85],
    [0.7, 0.55, -0.95],
    [0.55, 0.55, -1.0],         // throttle body inlet (R)
  ], 0.11, 'rubber', 24, 14));

  // --- Airbox-to-Throttle Body Duct, Bank 2 — PRIMARY node 'airboxToThrottleBodyDuctBank2'
  add(tube('airboxToThrottleBodyDuctBank2', [
    [-1.0, 0.45, -0.7],         // airbox outlet (L)
    [-0.85, 0.5, -0.85],
    [-0.7, 0.55, -0.95],
    [-0.55, 0.55, -1.0],        // throttle body inlet (L)
  ], 0.11, 'rubber', 24, 14));

  // ====================================================================
  // THROTTLE BODIES — one per bank, drive-by-wire butterfly between the duct
  // and the plenum. Bank 1 uses node 'throttleBody'; Bank 2 'throttleBodyBank2'.
  // ====================================================================
  function makeThrottleBody(node, dir, sk) {
    const tbx = dir * 0.5, tby = 0.55, tbz = -1.0;
    const tb = group(node);
    add(rot(at(cyl(`throttleBore_${sk}`, 0.12, 0.12, 0.22, 'cast', 20), tbx, tby, tbz), 0, 0, HALF_PI), tb);
    // butterfly disc inside the bore
    add(rot(at(cyl(`throttleButterfly_${sk}`, 0.1, 0.1, 0.015, 'steel', 18), tbx, tby, tbz), HALF_PI, 0, 0.3), tb);
    // drive-by-wire motor / position-sensor housing on the side
    add(at(box(`throttleMotor_${sk}`, 0.12, 0.12, 0.1, sensorMat), tbx + dir * 0.18, tby + 0.05, tbz), tb);
    // rubber sleeve / connector boot (sub node) to the manifold inlet
    add(rot(at(cyl(`intakeManifoldRubberSleeve_${sk}`, 0.12, 0.12, 0.14, 'rubber', 18), tbx - dir * 0.18, tby, tbz), 0, 0, HALF_PI), tb);
    air.add(tb);
  }
  makeThrottleBody('throttleBody', 1, 'R');       // Bank 1
  makeThrottleBody('throttleBodyBank2', -1, 'L');  // Bank 2

  // single named rubber sleeve node (contract sub node 'intakeManifoldRubberSleeve')
  add(rot(at(cyl('intakeManifoldRubberSleeve', 0.12, 0.12, 0.14, 'rubber', 16), 0.32, 0.55, -1.0), 0, 0, HALF_PI));

  // throttle body adapter / flange, Bank 1 (sub node 'throttleBodyAdapterBank1')
  add(rot(at(torus('throttleBodyAdapterBank1', 0.14, 0.03, 'cast', 10, 20), 0.34, 0.55, -1.0), 0, 0, HALF_PI));

  // ====================================================================
  // INTAKE MANIFOLD / PLENUM (variable geometry) — one black-plastic plenum
  // per bank with three curved runners down to that bank's heads.
  // ====================================================================
  function makeManifold(node, dir, sk) {
    const px = dir * 0.45, py = 0.5, pz = -1.35;   // plenum centre
    const man = group(node);
    // central plenum / air distributor box
    add(at(box(`plenumBody_${sk}`, 0.4, 0.3, 1.4, 'plenum'), px, py, pz), man);
    add(at(box(`plenumPlChamber_${sk}`, 0.36, 0.26, 1.3, 'intake'), px, py + 0.02, pz), man);

    // three runners curving from the plenum down to the head ports of this bank
    for (let i = 0; i < 3; i++) {
      const z = cylZ[i];
      add(tube(`intakeRunner_${sk}_${i}`, [
        [px, py + 0.05, z],          // off the plenum
        [px + dir * 0.18, py - 0.05, z],
        [px + dir * 0.32, py - 0.2, z],
        [px + dir * 0.42, py - 0.38, z], // into the (implied) head port
      ], 0.06, 'runner', 18, 12), man);
      // runner-to-head seal ring
      add(rot(at(torus(`runnerPort_${sk}_${i}`, 0.07, 0.018, 'intake', 8, 16), px + dir * 0.42, py - 0.4, z), 0, 0, HALF_PI), man);
    }
    air.add(man);
  }
  makeManifold('intakeManifoldBank1', 1, 'R');
  makeManifold('intakeManifoldBank2', -1, 'L');

  // intake air distributor seal (sub node 'intakeManifoldSeal') — flat sealing plate
  add(at(box('intakeManifoldSeal', 0.04, 0.02, 1.4, { color: 0x9aa0a6, metalness: 0.4, roughness: 0.7 }), 0, 0.1, -1.55));

  // ====================================================================
  // RESONANCE / TUNING FLAP — actuator (x2) + vacuum unit driving the flaps.
  // ====================================================================

  // --- Resonance/Tuning Flap Actuator (x2) — PRIMARY node 'intakeManifoldResonanceFlapActuator'
  const resFlap = group('intakeManifoldResonanceFlapActuator');
  for (const [dir, sk] of [[1, 'R'], [-1, 'L']]) {
    add(at(box(`resonanceFlapActuator_${sk}`, 0.16, 0.12, 0.14, sensorMat), dir * 0.45, 0.7, -1.95), resFlap);
    add(at(cyl(`resonanceFlapLever_${sk}`, 0.02, 0.02, 0.16, 'steel', 8), dir * 0.45, 0.62, -1.78), resFlap);
  }
  air.add(resFlap);

  // resonance flap vacuum / actuator unit (sub node 'resonanceFlapVacuumUnit')
  const vacUnit = group('resonanceFlapVacuumUnit');
  add(rot(at(cyl('resonanceVacuumCan', 0.09, 0.09, 0.14, sensorMat, 16), 0, 0.78, -1.95), 0, 0, HALF_PI), vacUnit);
  add(at(cyl('resonanceVacuumRod', 0.02, 0.02, 0.12, 'steel', 8), 0.1, 0.78, -1.95), vacUnit);
  air.add(vacUnit);

  // ====================================================================
  // PRESSURE / TEMP SENSORS on the plenum.
  // ====================================================================

  // --- MAP / Boost Pressure Sensor — PRIMARY node 'mapSensorBoostPressure'
  const mapSensor = group('mapSensorBoostPressure');
  add(at(cyl('mapSensorBody', 0.04, 0.04, 0.12, sensorMat, 12), 0.25, 0.68, -1.35), mapSensor);
  add(at(box('mapSensorConnector', 0.06, 0.05, 0.05, sensorMat), 0.25, 0.76, -1.35), mapSensor);
  air.add(mapSensor);

  // intake manifold pressure sensor (absolute) — sub node 'intakeManifoldPressureSensor'
  add(at(cyl('intakeManifoldPressureSensor', 0.035, 0.035, 0.1, sensorMat, 12), -0.25, 0.68, -1.35));

  // intake manifold temperature sensor (charge air) — sub node 'intakeManifoldTempSensor'
  add(at(cyl('intakeManifoldTempSensor', 0.03, 0.03, 0.1, sensorMat, 10), 0.0, 0.68, -1.2));

  // ====================================================================
  // CRANKCASE VENTILATION — PCV valve + breather hoses to the intake pre-filter.
  // ====================================================================

  // --- Crankcase Breather / PCV Valve and Hoses — PRIMARY node 'crankcaseBretherPcvValve'
  const pcv = group('crankcaseBretherPcvValve');
  add(at(cyl('pcvValveBody', 0.05, 0.05, 0.14, 'cover', 14), 0, 0.3, -1.6), pcv);
  // PCV hose tying the valve to the plenum
  add(tube('pcvHose', [
    [0, 0.3, -1.55],
    [0.1, 0.45, -1.45],
    [0.2, 0.55, -1.35],
  ], 0.025, 'hose2', 22, 8), pcv);
  air.add(pcv);

  // oil separator (sub node 'oilSeparatorCrankcase') — canister upstream of the PCV
  add(at(box('oilSeparatorCrankcase', 0.18, 0.22, 0.16, 'cover'), 0, 0.2, -1.85));

  // crankcase ventilation secondary line (sub node 'crankvcaseCvLineSecondary')
  add(tube('crankvcaseCvLineSecondary', [
    [0, 0.2, -1.85],
    [0.35, 0.3, -1.4],
    [0.7, 0.42, -1.0],
    [0.95, 0.45, -0.6],   // back to pre-filter / airbox side
  ], 0.022, 'hose2', 28, 8));

  return air;
}
