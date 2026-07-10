// 987 Boxster/Cayman AIR INTAKE SYSTEM — forked from the 981 builder and
// reshaped against the 2009 Service Introduction (987.2) figures.
//
// Key packaging differences vs the 981 (dual scoops / dual housings):
//  - SI doc p51 (fig 2_46_09): ONE air cleaner housing, carried over from the
//    987.1, sitting on the DRIVER (left) side of the engine compartment. Air is
//    drawn through the driver-side rear-quarter scoop only. On Boxster models
//    the opening to the Helmholtz resonator (H) at the air cleaner output was
//    modified for 2009.
//  - SI doc p51–52 (figs 2_47_09 / 2_48_09): resonance intake system — a single
//    central electronic throttle valve (electronic accelerator, item 1) feeding
//    a twin-flow distribution pipe with switchable distribution-pipe flap (2)
//    and tuning flap (3), each driven by a vacuum diaphragm cell (2B/3B) via an
//    electropneumatic switching valve (2A/3A). For 2009 the formerly separate
//    resonance tube and distribution pipe were combined into ONE oval housing.
//  - SI doc p58: single hot-film MAF-7 mass air flow sensor.
//
// Coordinate convention: CAR-SPACE (assembly uses carSpace: true) —
//   +X = right, -X = left, +Y = up, +Z = FRONT of car, wheels at z ≈ ±1.5.
// Engine sits at the rear (z ~ -0.5..-1.0), head intake ports at x ±0.355.
//
// Every PRIMARY part (tier !== 'sub') in 987/airfilter-parts.json appears as a
// named mesh or group.

import { group, box, roundBox, cyl, torus, tube, at, rot } from '../../lib/primitives.mjs';

export const meta = {
  id: 'airfilter',
  label: 'Air Intake',
  system: 'Engine',
  node: 'airIntake',
  // Car-space packaging (driver-side scoop → rear engine bay). Unified scene
  // uses carSpace: true so the single left housing keeps its lateral position.
  hotspot3d: '0 0 0',
  generation: '987',
};

const HALF_PI = Math.PI / 2;

export function build() {
  const air = group('airIntake');
  const add = (m, p = air) => { p.add(m); return m; };

  // Inline sensor material (dark grey moulded connector body).
  const sensorMat = { color: 0x2a2d33, metalness: 0.35, roughness: 0.55 };

  // Layout anchors (car-space).
  const SCOOP = { x: -1.05, y: 0.32, z: -0.5 };  // driver-side rear-quarter scoop
  const AB = { x: -0.66, y: 0.44, z: -0.72 };    // air cleaner housing centre
  const MAF = { x: -0.4, y: 0.46, z: -0.665 };   // MAF-7 at the housing outlet
  const TB = { x: 0, y: 0.45, z: -0.62 };        // central electronic throttle
  const DP = { x: 0, y: 0.4, z: -0.74 };         // distribution pipe centre

  // Engine head intake ports in car-space (from engine.glb normalize mapping).
  // Runners must terminate here so manifolds don't float in empty air.
  const HEAD_PORTS = {
    R: [[0.355, 0.2, -0.823], [0.355, 0.2, -0.692], [0.355, 0.2, -0.561]],
    L: [[-0.355, 0.2, -0.823], [-0.355, 0.2, -0.692], [-0.355, 0.2, -0.561]],
  };

  // ====================================================================
  // AIR CLEANER — SI doc p51: single housing (carried over from the 987.1)
  // on the driver side of the engine compartment, fed by the left quarter
  // scoop. Translucent shell so the panel element reads inside.
  // ====================================================================

  const airbox = group('airFilterBoxAirbox');

  // Main chamber + service lid.
  add(at(roundBox('airboxBody', 0.36, 0.24, 0.34, 'intakeShell', 3), AB.x, AB.y, AB.z), airbox);
  add(at(roundBox('airboxLid', 0.34, 0.05, 0.32, 'intake', 2), AB.x, AB.y + 0.14, AB.z), airbox);

  // Inlet elbow — the moulded trunk from the body-side duct into the housing
  // base (the large black elbow in fig 2_46_09).
  add(tube('airboxInletElbow', [
    [-0.94, 0.33, -0.55],
    [-0.86, 0.36, -0.62],
    [-0.78, 0.4, -0.68],
    [-0.72, 0.42, -0.71],
  ], 0.065, 'intake', 20, 14), airbox);

  // Outlet neck toward the MAF (+X, inboard), with clamp and rubber sleeve.
  add(rot(at(cyl('airboxNeck', 0.05, 0.055, 0.09, 'intake', 18), -0.48, 0.46, -0.67), 0, 0, HALF_PI), airbox);
  add(rot(at(torus('airboxClamp', 0.06, 0.01, 'steel', 10, 20), -0.445, 0.46, -0.67), 0, 0, HALF_PI), airbox);
  add(rot(at(cyl('airboxRubberSleeve', 0.055, 0.055, 0.05, 'rubber', 16), -0.45, 0.46, -0.67), 0, 0, HALF_PI), airbox);

  // Helmholtz resonator (H) at the air cleaner output — SI doc p51: opening
  // size/position modified on the 2009 Boxster models for intake noise.
  const helm = group('helmholtzResonator');
  add(rot(at(cyl('helmholtzCan', 0.05, 0.05, 0.14, 'intake', 18), -0.56, 0.34, -0.57), HALF_PI, 0, 0), helm);
  add(tube('helmholtzNeck', [
    [-0.58, 0.4, -0.63],
    [-0.57, 0.37, -0.6],
    [-0.56, 0.35, -0.58],
  ], 0.026, 'intake', 10, 10), helm);
  airbox.add(helm);

  // Mounting grommets / anti-vibration buffers under the housing.
  const grommets = group('airboxMountingGrommet');
  for (let i = 0; i < 3; i++) {
    add(at(cyl(`grommet_${i}`, 0.02, 0.02, 0.03, 'rubber', 12),
      AB.x + (i - 1) * 0.12, AB.y - 0.15, AB.z + (i - 1) * 0.04), grommets);
  }
  airbox.add(grommets);

  // Air guide / deflector at the quarter-panel opening.
  add(rot(at(box('airGuide', 0.12, 0.01, 0.16, 'cover'), -1.02, 0.4, -0.44), 0.3, -0.2, 0), airbox);

  air.add(airbox);

  // Serviceable element — flat panel cartridge inside the housing (the 987
  // air cleaner uses a panel element, unlike the 981's cylindrical cartridges).
  const airFilters = group('airFilters');
  const filterElement = group('airFilterElement');
  add(at(box('elementFrame', 0.3, 0.045, 0.28, 'rubber'), AB.x, AB.y + 0.02, AB.z), filterElement);
  add(at(box('elementMedia', 0.28, 0.035, 0.26, 'paper'), AB.x, AB.y + 0.02, AB.z), filterElement);
  for (let i = 0; i < 6; i++) {
    add(at(box(`elementPleat_${i}`, 0.018, 0.042, 0.25, 'paper'), AB.x - 0.115 + i * 0.046, AB.y + 0.024, AB.z), filterElement);
  }
  airFilters.add(filterElement);
  air.add(airFilters);

  // ====================================================================
  // SCOOP & BODY-SIDE DUCT — driver-side rear quarter only.
  // ====================================================================

  const ramAir = group('ramAirSnorkelDuct');
  add(at(box('scoopMouth', 0.06, 0.16, 0.2, 'cover'), SCOOP.x - 0.01, SCOOP.y, SCOOP.z), ramAir);
  add(tube('ramAirSnorkel', [
    [SCOOP.x, SCOOP.y, SCOOP.z],
    [-1.0, 0.33, -0.53],
    [-0.97, 0.33, -0.545],
  ], 0.055, 'rubber', 12, 12), ramAir);
  air.add(ramAir);

  const intakeDucts = group('intakeDuctsSnorkelTubes');
  add(tube('intakeDuctSnorkel', [
    [-0.99, 0.33, -0.535],
    [-0.96, 0.33, -0.55],
    [-0.93, 0.33, -0.555],
  ], 0.05, 'rubber', 10, 12), intakeDucts);
  air.add(intakeDucts);

  // ====================================================================
  // SENSORS — single hot-film MAF-7 (SI doc p58) at the housing outlet,
  // IAT integrated into the MAF housing.
  // ====================================================================

  const maf = group('massAirflowSensorsMaf');
  add(rot(at(cyl('mafSensorHousing', 0.045, 0.045, 0.11, 'intake', 18), MAF.x, MAF.y, MAF.z), 0, 0, HALF_PI), maf);
  add(at(box('mafElement', 0.035, 0.055, 0.04, sensorMat), MAF.x, MAF.y + 0.06, MAF.z), maf);
  air.add(maf);

  const iat = group('intakeAirTemperatureSensors');
  add(at(cyl('iatSensor', 0.012, 0.012, 0.045, sensorMat, 10), MAF.x + 0.03, MAF.y + 0.05, MAF.z + 0.01), iat);
  air.add(iat);

  // ====================================================================
  // INTAKE TUBE — the single corrugated duct from the MAF to the central
  // throttle valve (there is no second bank duct on the 987).
  // ====================================================================

  add(tube('airboxToThrottleBodyDuctBank1', [
    [-0.34, 0.46, -0.66],
    [-0.22, 0.475, -0.63],
    [-0.1, 0.475, -0.615],
    [TB.x, TB.y + 0.01, TB.z + 0.02],
  ], 0.05, 'rubber', 24, 14));
  // corrugation rings so the duct reads as the moulded bellows in fig 2_47_09
  for (const [rx, ry, rz] of [[-0.26, 0.472, -0.638], [-0.2, 0.475, -0.628], [-0.14, 0.476, -0.62]]) {
    add(rot(at(torus(`intakeTubeRib_${Math.round(-rx * 100)}`, 0.055, 0.008, 'rubber', 8, 18), rx, ry, rz), 0, HALF_PI, 0));
  }

  // ====================================================================
  // THROTTLE VALVE — one central electronic accelerator (fig 2_48_09 item 1)
  // mounted on the front of the distribution pipe.
  // ====================================================================

  const tb = group('throttleBody');
  add(rot(at(cyl('throttleBore_C', 0.06, 0.06, 0.13, 'cast', 22), TB.x, TB.y, TB.z), HALF_PI, 0, 0), tb);
  add(rot(at(cyl('throttleButterfly_C', 0.05, 0.05, 0.008, 'steel', 18), TB.x, TB.y, TB.z), 0, 0.3, 0), tb);
  add(at(box('throttleMotor_C', 0.07, 0.055, 0.05, sensorMat), TB.x + 0.08, TB.y, TB.z), tb);
  add(rot(at(torus('throttleInletClamp', 0.065, 0.01, 'steel', 10, 20), TB.x, TB.y, TB.z + 0.055), HALF_PI, 0, 0), tb);
  air.add(tb);

  // Rubber coupling + adapter flange between throttle and distribution pipe.
  add(rot(at(cyl('intakeManifoldRubberSleeve', 0.058, 0.058, 0.06, 'rubber', 16), TB.x, TB.y - 0.02, TB.z - 0.065), HALF_PI, 0, 0));
  add(rot(at(torus('throttleBodyAdapterBank1', 0.068, 0.012, 'cast', 10, 20), TB.x, TB.y - 0.03, TB.z - 0.095), HALF_PI, 0, 0));

  // ====================================================================
  // DISTRIBUTION PIPE & RESONANCE TUBE — 987.2: the formerly separate
  // resonance tube and distribution pipe combined into ONE oval housing
  // between the manifolds (SI doc p51), with longitudinal partition panel
  // (twin-flow), distribution-pipe flap and tuning flap.
  // ====================================================================

  const dp = group('distributionPipe');
  const dpBody = rot(at(cyl('distributionPipeBody', 0.1, 0.1, 0.46, 'intake', 24), DP.x, DP.y, DP.z), 0, 0, HALF_PI);
  dpBody.scale.y = 0.72; // oval cross-section (fig 2_47_09 centre part)
  add(dpBody, dp);
  // throttle → pipe transition
  add(rot(at(cyl('distributionPipeInlet', 0.07, 0.09, 0.08, 'intake', 18), DP.x, DP.y + 0.01, DP.z + 0.09), HALF_PI, 0, 0), dp);
  // longitudinal partition panel (twin-flow: banks connect/disconnect via flap)
  add(at(box('distributionPartition', 0.44, 0.006, 0.1, 'plenum'), DP.x, DP.y, DP.z), dp);
  // distribution-pipe flap (item 2, half-oval) — closed below ~3,800 rpm (3.4 DFI)
  add(rot(at(cyl('distributionPipeFlap', 0.055, 0.055, 0.006, 'steel', 18), DP.x + 0.06, DP.y, DP.z), 0, 0, HALF_PI), dp);
  // resonance tube run along the back of the housing
  add(rot(at(cyl('resonanceTube', 0.05, 0.05, 0.4, 'intake', 18), DP.x, DP.y - 0.09, DP.z - 0.05), 0, 0, HALF_PI), dp);
  // tuning flap (item 3) — opens above ~5,300 rpm (3.4 DFI)
  add(rot(at(cyl('tuningFlap', 0.042, 0.042, 0.006, 'steel', 16), DP.x - 0.05, DP.y - 0.09, DP.z - 0.05), 0, 0, HALF_PI), dp);
  air.add(dp);

  // Flap actuation — vacuum diaphragm cells (2B/3B) + electropneumatic
  // switching valves (2A/3A) hung under the distribution pipe (fig 2_48_09).
  const resFlap = group('intakeManifoldResonanceFlapActuator');
  for (const [ox, nm] of [[-0.1, 'tuning'], [0.1, 'distribution']]) {
    add(rot(at(cyl(`${nm}FlapDiaphragmCell`, 0.035, 0.035, 0.05, sensorMat, 16), DP.x + ox, DP.y - 0.16, DP.z - 0.02), HALF_PI, 0, 0), resFlap);
    add(at(box(`${nm}FlapSwitchingValve`, 0.035, 0.03, 0.03, sensorMat), DP.x + ox, DP.y - 0.1, DP.z + 0.06), resFlap);
    add(at(cyl(`${nm}FlapLinkRod`, 0.006, 0.006, 0.06, 'steel', 8), DP.x + ox, DP.y - 0.12, DP.z - 0.03), resFlap);
  }
  air.add(resFlap);

  const vacUnit = group('resonanceFlapVacuumUnit');
  add(rot(at(cyl('resonanceVacuumCan', 0.04, 0.04, 0.06, sensorMat, 16), 0, DP.y - 0.05, DP.z - 0.15), 0, 0, HALF_PI), vacUnit);
  add(at(cyl('resonanceVacuumRod', 0.008, 0.008, 0.05, 'steel', 8), 0.04, DP.y - 0.07, DP.z - 0.13), vacUnit);
  air.add(vacUnit);

  // ====================================================================
  // INTAKE MANIFOLDS — resonance manifolds with integrated resonance /
  // acoustic chambers (SI doc p52); runners terminate on engine head ports.
  // ====================================================================

  function makeManifold(node, dir, sk) {
    const ports = HEAD_PORTS[sk];
    const px = dir * 0.22;
    const py = 0.32;
    const pz = -0.69;
    const man = group(node);
    add(at(box(`plenumBody_${sk}`, 0.18, 0.14, 0.55, 'plenumShell'), px, py, pz), man);
    add(at(box(`plenumChamber_${sk}`, 0.15, 0.11, 0.5, 'intakeShell'), px, py + 0.01, pz), man);
    // resonance chamber cap in the upper part of the manifold (987.2 redesign)
    add(at(roundBox(`plenumResonanceChamber_${sk}`, 0.14, 0.05, 0.4, 'intake', 2), px, py + 0.09, pz), man);

    // distribution pipe end → manifold neck
    add(tube(`distributorToManifold_${sk}`, [
      [dir * 0.2, DP.y, DP.z],
      [dir * 0.22, 0.38, -0.72],
      [px, py + 0.05, pz + 0.08],
    ], 0.045, 'intake', 14, 12), man);

    for (let i = 0; i < 3; i++) {
      const [hx, hy, hz] = ports[i];
      add(tube(`intakeRunner_${sk}_${i}`, [
        [px, py - 0.02, hz],
        [px + dir * 0.05, py - 0.04, hz],
        [(px + hx) * 0.5, (py + hy) * 0.5, hz],
        [hx - dir * 0.02, hy, hz],
        [hx, hy, hz],
      ], 0.028, 'runner', 18, 12), man);
      add(rot(at(torus(`runnerPort_${sk}_${i}`, 0.032, 0.008, 'intake', 8, 16), hx, hy, hz), 0, 0, HALF_PI), man);
    }
    air.add(man);
  }
  makeManifold('intakeManifoldBank1', 1, 'R');
  makeManifold('intakeManifoldBank2', -1, 'L');

  add(at(box('intakeManifoldSeal', 0.02, 0.01, 0.55, { color: 0x9aa0a6, metalness: 0.4, roughness: 0.7 }), 0, 0.12, -0.69));

  // ====================================================================
  // MANIFOLD-MOUNTED SENSORS
  // ====================================================================

  const mapSensor = group('mapSensorBoostPressure');
  add(at(cyl('mapSensorBody', 0.02, 0.02, 0.055, sensorMat, 12), 0.13, 0.44, -0.72), mapSensor);
  add(at(box('mapSensorConnector', 0.03, 0.025, 0.025, sensorMat), 0.13, 0.48, -0.72), mapSensor);
  air.add(mapSensor);

  add(at(cyl('intakeManifoldPressureSensor', 0.018, 0.018, 0.05, sensorMat, 12), -0.13, 0.44, -0.72));
  add(at(cyl('intakeManifoldTempSensor', 0.015, 0.015, 0.05, sensorMat, 10), 0.05, 0.44, -0.66));

  // ====================================================================
  // CRANKCASE VENTILATION — breather returns to the intake tract; secondary
  // line runs to the pre-filter side of the (left) air cleaner.
  // ====================================================================

  const pcv = group('crankcaseBretherPcvValve');
  add(at(cyl('pcvValveBody', 0.025, 0.025, 0.07, 'cover', 14), 0, 0.22, -0.85), pcv);
  add(tube('pcvHose', [
    [0, 0.22, -0.83],
    [0.03, 0.3, -0.78],
    [0.05, 0.37, -0.75],
  ], 0.012, 'hose2', 22, 8), pcv);
  air.add(pcv);

  add(at(box('oilSeparatorCrankcase', 0.09, 0.11, 0.08, 'cover'), 0, 0.15, -1.0));

  add(tube('crankvcaseCvLineSecondary', [
    [0, 0.15, -1.0],
    [-0.2, 0.25, -0.9],
    [-0.45, 0.35, -0.8],
    [-0.6, 0.42, -0.74],
  ], 0.011, 'hose2', 28, 8));

  return air;
}
