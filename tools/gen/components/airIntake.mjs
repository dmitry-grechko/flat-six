// 981 Boxster/Cayman flat-six AIR INTAKE SYSTEM — FULL PART COVERAGE BUILD.
//
// Factory layout (WM 242519 / 244601): ambient air enters BOTH rear-quarter
// side scoops into a pair of air cleaner housings (one per side). Each housing
// is an elongated curved duct — rectangular scoop mouth → expanding filter
// section → circular outlet neck with screw-type clamp and rubber sleeve.
// Corrugated flow ducts from both housings merge at a SINGLE central throttle
// housing, then feed the intake-air distributors / plenums (one per bank) whose
// runners supply the three cylinders of that bank. A resonance/tuning flap
// actuator switches runner length; MAP & IAT sensors and a crankcase breather /
// PCV line tap into the plenum.
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
  hotspot3d: '0 0.55 -0.55',
};

const HALF_PI = Math.PI / 2;

export function build() {
  const air = group('airIntake');
  const add = (m, p = air) => { p.add(m); return m; };

  // Inline sensor material (dark grey moulded connector body).
  const sensorMat = { color: 0x2a2d33, metalness: 0.35, roughness: 0.55 };
  // Three cylinder Z positions per bank (rear engine bay).
  const cylZ = [0.55, 0.0, -0.55];

  // Central throttle housing (WM 244601: singular "throttle housing" fed by
  // plural "air cleaner housings" via rubber sleeve).
  const TB = { x: 0, y: 0.5, z: -0.9 };

  // ====================================================================
  // AIR CLEANER HOUSINGS — one elongated curved duct per side scoop.
  // WM 242519 Fig 1/2: rectangular outboard mouth → boxy filter section →
  // circular neck with clamp + rubber sleeve into the flow duct.
  // ====================================================================

  // --- Air Filter Box / Airbox (x2, one per bank) — PRIMARY node 'airFilterBoxAirbox'
  const airbox = group('airFilterBoxAirbox');
  // --- Air Filters (x2) — PRIMARY node 'airFilters' (the two filter assemblies)
  const airFilters = group('airFilters');

  for (const [dir, sk] of [[1, 'R'], [-1, 'L']]) {
    // Path centres along the housing (outboard scoop → inboard neck).
    const mouthX = dir * 1.95;
    const filterX = dir * 1.35;
    const neckX = dir * 0.72;
    const hy = 0.48;
    const hz = -0.08;

    const box1 = group(`airbox_${sk}`);

    // 1) Wide vertical rectangular scoop mouth (outboard).
    add(at(box(`airboxMouth_${sk}`, 0.18, 0.42, 0.28, 'intake'), mouthX, hy, hz), box1);

    // 2) Transition duct (mouth → filter box), slightly tapered inboard.
    add(at(box(`airboxTransition_${sk}`, 0.42, 0.34, 0.26, 'intake'), dir * 1.68, hy + 0.02, hz - 0.02), box1);

    // 3) Expanding filter housing (boxier mid-section — holds the panel).
    add(at(box(`airboxHousing_${sk}`, 0.55, 0.38, 0.48, 'intake'), filterX, hy + 0.04, hz - 0.04), box1);
    add(at(box(`airboxLid_${sk}`, 0.57, 0.06, 0.5, 'cover'), filterX, hy + 0.26, hz - 0.04), box1);

    // 4) Taper toward circular outlet neck.
    add(at(box(`airboxTaper_${sk}`, 0.36, 0.28, 0.28, 'intake'), dir * 1.02, hy + 0.02, hz - 0.1), box1);

    // 5) Circular neck (housing outlet into rubber sleeve).
    add(rot(at(cyl(`airboxNeck_${sk}`, 0.11, 0.12, 0.16, 'intake', 18), neckX, hy, hz - 0.14), 0, 0, HALF_PI), box1);

    // Screw-type clamp (WM yellow callout) + short corrugated rubber sleeve.
    add(rot(at(torus(`airboxClamp_${sk}`, 0.125, 0.018, 'steel', 10, 20), neckX - dir * 0.02, hy, hz - 0.14), 0, 0, HALF_PI), box1);
    add(rot(at(cyl(`airboxRubberSleeve_${sk}`, 0.115, 0.115, 0.12, 'rubber', 16), neckX - dir * 0.14, hy, hz - 0.16), 0, 0, HALF_PI), box1);

    airbox.add(box1);

    // Panel filter seated in the mid filter-box section (oriented along duct).
    const panel = makePanel({ node: `airFilterElement_${sk}`, w: 0.42, h: 0.36, d: 0.12 });
    at(panel, filterX, hy + 0.04, hz - 0.04);
    rot(panel, 0, dir * 0.15, 0);
    airFilters.add(panel);

    // Mounting grommets under the filter section (luggage-compartment fasteners).
    const grommets = group(`airboxMountingGrommet_${sk}`);
    for (let i = 0; i < 3; i++) {
      add(at(cyl(`grommet_${sk}_${i}`, 0.05, 0.05, 0.07, 'rubber', 12),
        filterX + dir * (i - 1) * 0.12, hy - 0.22, hz + (i - 1) * 0.14), grommets);
    }
    airbox.add(grommets);

    // Air guide at the scoop mouth — steers scoop air into the rectangular inlet.
    add(rot(at(box(`airGuide_${sk}`, 0.28, 0.02, 0.35, 'cover'), mouthX + dir * 0.08, hy + 0.08, hz + 0.18), 0.35, dir * 0.2, 0), box1);
  }
  // Contract nodes (single named instances).
  add(at(cyl('airboxMountingGrommet', 0.05, 0.05, 0.07, 'rubber', 12), 1.35, 0.26, -0.08), airbox);
  add(rot(at(box('airGuide', 0.28, 0.02, 0.32, 'cover'), 1.95, 0.56, 0.12), 0.35, 0.15, 0), airbox);
  air.add(airbox);

  // Single named air filter element node (contract node 'airFilterElement')
  const filterElement = makePanel({ node: 'airFilterElement', w: 0.4, h: 0.34, d: 0.11 });
  at(filterElement, 0, 0.52, -0.1);
  airFilters.add(filterElement);
  air.add(airFilters);

  // ====================================================================
  // RAM-AIR / SCOOP INLETS — short snorkels aligned with each housing mouth
  // (scoop → housing). No long contradictory aft snorkels.
  // ====================================================================

  // --- Ram Air / Intake Snorkel Duct (x2) — PRIMARY node 'ramAirSnorkelDuct'
  const ramAir = group('ramAirSnorkelDuct');
  for (const [dir, sk] of [[1, 'R'], [-1, 'L']]) {
    add(tube(`ramAirSnorkel_${sk}`, [
      [dir * 2.05, 0.42, 0.05],    // outboard side-scoop mouth
      [dir * 2.0, 0.45, -0.02],
      [dir * 1.95, 0.48, -0.08],   // into rectangular housing inlet
    ], 0.1, 'rubber', 18, 12), ramAir);
  }
  air.add(ramAir);

  // --- Intake Ducts / Snorkel Tubes (x2) — PRIMARY node 'intakeDuctsSnorkelTubes'
  // Short scoop-to-housing lips (same path family as the CAD inlet), not long
  // aft bay snorkels fighting the elongated housing.
  const intakeDucts = group('intakeDuctsSnorkelTubes');
  for (const [dir, sk] of [[1, 'R'], [-1, 'L']]) {
    add(tube(`intakeDuctSnorkel_${sk}`, [
      [dir * 2.02, 0.38, -0.02],
      [dir * 1.92, 0.46, -0.06],
      [dir * 1.78, 0.5, -0.08],
    ], 0.09, 'rubber', 16, 12), intakeDucts);
  }
  air.add(intakeDucts);

  // ====================================================================
  // SENSORS in the housing outlet / measurement tube — MAF + IAT.
  // Placed on each bank's circular neck before the merge to throttle.
  // ====================================================================

  // --- Mass Airflow Sensors / MAF (x2) — PRIMARY node 'massAirflowSensorsMaf'
  const maf = group('massAirflowSensorsMaf');
  for (const [dir, sk] of [[1, 'R'], [-1, 'L']]) {
    const mx = dir * 0.55, my = 0.48, mz = -0.35;
    add(rot(at(cyl(`mafSensorHousing_${sk}`, 0.1, 0.1, 0.22, 'intake', 18), mx, my, mz), 0, 0, HALF_PI), maf);
    add(at(box(`mafElement_${sk}`, 0.07, 0.12, 0.09, sensorMat), mx, my + 0.14, mz), maf);
  }
  add(rot(at(cyl('mafSensorHousing', 0.09, 0.09, 0.2, 'intake', 16), 0, 0.48, -0.55), 0, 0, HALF_PI), maf);
  air.add(maf);

  // --- Intake Air Temperature Sensors (x2) — PRIMARY node 'intakeAirTemperatureSensors'
  const iat = group('intakeAirTemperatureSensors');
  for (const [dir, sk] of [[1, 'R'], [-1, 'L']]) {
    add(at(cyl(`iatSensor_${sk}`, 0.022, 0.022, 0.1, sensorMat, 10), dir * 0.55, 0.6, -0.32), iat);
  }
  air.add(iat);

  // ====================================================================
  // HOUSING → CENTRAL THROTTLE ducts (corrugated rubber flow ducts).
  // Both banks merge at the singular throttle housing (WM 244601).
  // ====================================================================

  // --- Airbox-to-Throttle Body Duct, Bank 1 — PRIMARY node 'airboxToThrottleBodyDuctBank1'
  add(tube('airboxToThrottleBodyDuctBank1', [
    [0.58, 0.48, -0.28],         // R housing / MAF outlet
    [0.4, 0.5, -0.5],
    [0.22, 0.5, -0.7],
    [0.08, 0.5, -0.85],          // into central throttle
  ], 0.1, 'rubber', 24, 14));

  // --- Airbox-to-Throttle Body Duct, Bank 2 — PRIMARY node 'airboxToThrottleBodyDuctBank2'
  add(tube('airboxToThrottleBodyDuctBank2', [
    [-0.58, 0.48, -0.28],        // L housing / MAF outlet
    [-0.4, 0.5, -0.5],
    [-0.22, 0.5, -0.7],
    [-0.08, 0.5, -0.85],         // into central throttle
  ], 0.1, 'rubber', 24, 14));

  // ====================================================================
  // THROTTLE HOUSING — one central unit (WM singular "throttle housing").
  // PRIMARY 'throttleBody' is the visible housing; 'throttleBodyBank2' is a
  // minimal contract stub co-located so the parts list stays intact.
  // ====================================================================
  const tb = group('throttleBody');
  add(rot(at(cyl('throttleBore_C', 0.13, 0.13, 0.28, 'cast', 22), TB.x, TB.y, TB.z), HALF_PI, 0, 0), tb);
  // Butterfly disc inside the bore
  add(rot(at(cyl('throttleButterfly_C', 0.11, 0.11, 0.015, 'steel', 18), TB.x, TB.y, TB.z), 0, 0.3, 0), tb);
  // Drive-by-wire motor / position-sensor housing
  add(at(box('throttleMotor_C', 0.14, 0.12, 0.11, sensorMat), TB.x + 0.16, TB.y + 0.04, TB.z), tb);
  // Rubber sleeve toward the intake-air distributor (WM leak-test sleeve)
  add(rot(at(cyl('intakeManifoldRubberSleeve_C', 0.125, 0.125, 0.16, 'rubber', 18), TB.x, TB.y, TB.z - 0.2), HALF_PI, 0, 0), tb);
  // Clamp ring on the throttle inlet (merge of L+R ducts)
  add(rot(at(torus('throttleInletClamp', 0.14, 0.02, 'steel', 10, 20), TB.x, TB.y, TB.z + 0.12), HALF_PI, 0, 0), tb);
  air.add(tb);

  // Contract stub — keep node present, visually negligible at the same housing.
  const tb2 = group('throttleBodyBank2');
  add(at(box('throttleBodyBank2Stub', 0.04, 0.04, 0.04, 'cast'), TB.x - 0.02, TB.y - 0.02, TB.z), tb2);
  air.add(tb2);

  // Single named rubber sleeve node (contract sub node 'intakeManifoldRubberSleeve')
  add(rot(at(cyl('intakeManifoldRubberSleeve', 0.12, 0.12, 0.14, 'rubber', 16), TB.x, TB.y, TB.z - 0.22), HALF_PI, 0, 0));

  // Throttle body adapter / flange (sub node 'throttleBodyAdapterBank1')
  add(rot(at(torus('throttleBodyAdapterBank1', 0.145, 0.028, 'cast', 10, 20), TB.x, TB.y, TB.z - 0.28), HALF_PI, 0, 0));

  // ====================================================================
  // INTAKE MANIFOLD / PLENUM (variable geometry) — one black-plastic plenum
  // per bank with three curved runners down to that bank's heads.
  // Fed from the central throttle via short distributor boots.
  // ====================================================================
  function makeManifold(node, dir, sk) {
    const px = dir * 0.45, py = 0.5, pz = -1.35;   // plenum centre
    const man = group(node);
    // Central plenum / air distributor box
    add(at(box(`plenumBody_${sk}`, 0.4, 0.3, 1.4, 'plenum'), px, py, pz), man);
    add(at(box(`plenumPlChamber_${sk}`, 0.36, 0.26, 1.3, 'intake'), px, py + 0.02, pz), man);

    // Short boot from central throttle toward this bank's distributor inlet
    add(tube(`throttleToDistributor_${sk}`, [
      [dir * 0.06, TB.y, TB.z - 0.25],
      [dir * 0.22, py + 0.02, -1.05],
      [px, py + 0.05, pz + 0.55],
    ], 0.08, 'rubber', 18, 12), man);

    // Three runners curving from the plenum down to the head ports of this bank
    for (let i = 0; i < 3; i++) {
      const z = cylZ[i];
      add(tube(`intakeRunner_${sk}_${i}`, [
        [px, py + 0.05, z],
        [px + dir * 0.18, py - 0.05, z],
        [px + dir * 0.32, py - 0.2, z],
        [px + dir * 0.42, py - 0.38, z],
      ], 0.06, 'runner', 18, 12), man);
      add(rot(at(torus(`runnerPort_${sk}_${i}`, 0.07, 0.018, 'intake', 8, 16), px + dir * 0.42, py - 0.4, z), 0, 0, HALF_PI), man);
    }
    air.add(man);
  }
  makeManifold('intakeManifoldBank1', 1, 'R');
  makeManifold('intakeManifoldBank2', -1, 'L');

  // Intake air distributor seal (sub node 'intakeManifoldSeal')
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

  // Resonance flap vacuum / actuator unit (sub node 'resonanceFlapVacuumUnit')
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

  add(at(cyl('intakeManifoldPressureSensor', 0.035, 0.035, 0.1, sensorMat, 12), -0.25, 0.68, -1.35));
  add(at(cyl('intakeManifoldTempSensor', 0.03, 0.03, 0.1, sensorMat, 10), 0.0, 0.68, -1.2));

  // ====================================================================
  // CRANKCASE VENTILATION — PCV valve + breather hoses to the intake pre-filter.
  // ====================================================================

  // --- Crankcase Breather / PCV Valve and Hoses — PRIMARY node 'crankcaseBretherPcvValve'
  const pcv = group('crankcaseBretherPcvValve');
  add(at(cyl('pcvValveBody', 0.05, 0.05, 0.14, 'cover', 14), 0, 0.3, -1.6), pcv);
  add(tube('pcvHose', [
    [0, 0.3, -1.55],
    [0.1, 0.45, -1.45],
    [0.2, 0.55, -1.35],
  ], 0.025, 'hose2', 22, 8), pcv);
  air.add(pcv);

  add(at(box('oilSeparatorCrankcase', 0.18, 0.22, 0.16, 'cover'), 0, 0.2, -1.85));

  // Secondary CV line back toward the R air-cleaner housing (pre-filter side).
  add(tube('crankvcaseCvLineSecondary', [
    [0, 0.2, -1.85],
    [0.35, 0.3, -1.2],
    [0.7, 0.42, -0.6],
    [1.2, 0.48, -0.2],
  ], 0.022, 'hose2', 28, 8));

  return air;
}
