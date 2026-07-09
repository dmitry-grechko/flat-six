// 981 Boxster/Cayman flat-six AIR INTAKE SYSTEM — FULL PART COVERAGE BUILD.
//
// Factory layout (WM 242519 / 242419 / 244601): ambient air enters BOTH rear-
// quarter side scoops into a pair of air cleaner housings. Each housing is an
// elongated curved duct (scoop mouth → filter section → circular neck). The
// serviceable air-cleaner ELEMENT (WM 242419) is a long CYLINDRICAL cartridge
// that slides into the housing — not a flat panel. Corrugated flow ducts from
// both housings merge at a SINGLE central throttle housing, then feed the
// intake-air distributors / plenums.
//
// Coordinate convention (shared with the other modules):
//   +X = right, -X = left, +Y = up, +Z = FRONT of car, -Z = REAR.
// Engine sits at the rear (z ~ 0..-1, y ~ +0.5). Bank 1 (right) = +X,
// Bank 2 (left) = -X. Each bank's three cylinders spread along Z.
//
// Every PRIMARY part (tier !== 'sub') in airfilter-parts.json appears as a named
// mesh or group; many sub-parts are emitted too, nested under per-bank groups.

import { group, box, cyl, torus, tube, at, rot } from '../lib/primitives.mjs';
import { footprint, centerline } from '../lib/wm-traces.mjs';
import { makeCylindricalAirCleaner } from './smallParts.mjs';

export const meta = {
  id: 'airfilter',
  label: 'Air Intake',
  system: 'Engine',
  node: 'airIntake',
  // Car-space packaging (side scoops → rear engine bay). Unified scene uses
  // carSpace: true so L/R housings keep their lateral positions.
  hotspot3d: '0 0 0',
};

const HALF_PI = Math.PI / 2;

// ---- WM 242519 aircleaner-4432 traces ------------------------------------
// Footprint: full side-view outline of the elongated air-cleaner housing
// (mouth → filter → neck). Centerline: the duct spine path traced along the
// same figure, mouth → neck. Both agree the housing is not flat — its
// lowest point sits at the neck (trace-space min y at the far/neck end,
// not centred), so it droops as it curves down/inboard, rather than the
// old constant `hy`. The footprint's own drop:length ratio (~0.64) is too
// steep to apply literally at gen scale (it would sink the neck well below
// the downstream MAF/throttle ducts), so we use the centerline only to
// derive the droop *shape* (tapered mouth→neck via ductDroopAt()) and cap
// the magnitude at a modest DUCT_DROOP that stays within the housing's own
// envelope; the footprint here mainly corroborates the droop's direction.
const AIRCLEANER_FOOTPRINT = footprint('981/traces/aircleaner-4432.trace.json');
const AIRCLEANER_DUCT = centerline('981/traces/aircleaner-4432-cl.trace.json');

// Normalize the traced duct centerline into (u, v) pairs: u = progress
// mouth(0)→neck(1) along the trace's own run, v = normalized droop (0..1)
// over that same run. Both are in trace space; ductDroopAt() interpolates.
const DUCT_PROFILE = (() => {
  const [fx, fy] = AIRCLEANER_DUCT[0];
  const [lx, ly] = AIRCLEANER_DUCT[AIRCLEANER_DUCT.length - 1];
  const dx = lx - fx;
  const dy = ly - fy;
  return AIRCLEANER_DUCT.map(([x, y]) => ({
    u: dx === 0 ? 0 : (x - fx) / dx,
    v: dy === 0 ? 0 : (y - fy) / dy,
  }));
})();

/** Normalized droop (0 at mouth, 1 at neck) at progress `u` (0..1) along the
 * housing's own mouth→neck run, interpolated from the traced centerline. */
function ductDroopAt(u) {
  for (let i = 0; i < DUCT_PROFILE.length - 1; i++) {
    const a = DUCT_PROFILE[i], b = DUCT_PROFILE[i + 1];
    if (u <= b.u || i === DUCT_PROFILE.length - 2) {
      const t = b.u === a.u ? 0 : (u - a.u) / (b.u - a.u);
      return a.v + t * (b.v - a.v);
    }
  }
  return 1;
}
const DUCT_DROOP = 0.08; // gen-space Y drop at the neck (u=1), tapered by ductDroopAt(u)

export function build() {
  const air = group('airIntake');
  const add = (m, p = air) => { p.add(m); return m; };

  // Inline sensor material (dark grey moulded connector body).
  const sensorMat = { color: 0x2a2d33, metalness: 0.35, roughness: 0.55 };
  // Three cylinder Z positions per bank (rear engine bay).
  const cylZ = [0.55, 0.0, -0.55];

  // Central throttle housing (WM 244601: singular "throttle housing" fed by
  // plural "air cleaner housings" via rubber sleeve) — car-space, mid/rear bay.
  const TB = { x: 0, y: 0.42, z: -0.95 };

  // ====================================================================
  // AIR CLEANER HOUSINGS — WM 242519 elongated curved ducts at the rear
  // side scoops. WM 242419: the serviceable air-cleaner ELEMENT is a long
  // CYLINDRICAL cartridge that slides into each housing (not a flat panel).
  // ====================================================================

  const airbox = group('airFilterBoxAirbox');
  const airFilters = group('airFilters');
  const neckDroopBySide = {};

  for (const [dir, sk] of [[1, 'R'], [-1, 'L']]) {
    // Car-space path: outboard scoop → filter section → inboard neck.
    // Scoops sit just ahead of the rear axle on the quarter panels.
    const mouthX = dir * 1.05;
    const filterX = dir * 0.78;
    const neckX = dir * 0.42;
    const hy = 0.38;
    const hz = -0.55;
    const runLen = Math.abs(mouthX) - Math.abs(neckX);
    const uAt = (x) => (Math.abs(mouthX) - Math.abs(x)) / runLen;
    const yAt = (x) => hy - ductDroopAt(uAt(x)) * DUCT_DROOP;
    const hyMouth = yAt(mouthX);
    const hyTransition = yAt(dir * 0.92);
    const hyFilter = yAt(filterX);
    const hyTaper = yAt(dir * 0.58);
    const hyNeck = yAt(neckX);
    neckDroopBySide[sk] = hyNeck;

    const box1 = group(`airbox_${sk}`);

    // 1) Wide vertical rectangular scoop mouth (outboard) — WM CAD.
    add(at(box(`airboxMouth_${sk}`, 0.1, 0.2, 0.14, 'intake'), mouthX, hyMouth, hz), box1);

    // 2) Transition duct (mouth → filter section), slightly tapered inboard.
    add(at(box(`airboxTransition_${sk}`, 0.2, 0.16, 0.13, 'intake'), dir * 0.92, hyTransition + 0.01, hz - 0.02), box1);

    // 3) Expanding filter housing — holds the cylindrical cartridge (axis ≈ X).
    add(at(box(`airboxHousing_${sk}`, 0.28, 0.2, 0.22, 'intake'), filterX, hyFilter + 0.02, hz - 0.03), box1);
    // Access / luggage-compartment face (circular port the element pulls through).
    add(rot(at(cyl(`airboxLid_${sk}`, 0.11, 0.11, 0.04, 'cover', 20), filterX + dir * 0.12, hyFilter + 0.02, hz - 0.03), 0, 0, HALF_PI), box1);

    // 4) Taper toward circular outlet neck.
    add(at(box(`airboxTaper_${sk}`, 0.16, 0.14, 0.14, 'intake'), dir * 0.58, hyTaper + 0.01, hz - 0.06), box1);

    // 5) Circular neck + screw-type clamp + rubber sleeve (WM yellow callout).
    add(rot(at(cyl(`airboxNeck_${sk}`, 0.055, 0.06, 0.08, 'intake', 18), neckX, hyNeck, hz - 0.08), 0, 0, HALF_PI), box1);
    add(rot(at(torus(`airboxClamp_${sk}`, 0.065, 0.01, 'steel', 10, 20), neckX - dir * 0.01, hyNeck, hz - 0.08), 0, 0, HALF_PI), box1);
    add(rot(at(cyl(`airboxRubberSleeve_${sk}`, 0.058, 0.058, 0.06, 'rubber', 16), neckX - dir * 0.07, hyNeck, hz - 0.09), 0, 0, HALF_PI), box1);

    airbox.add(box1);

    // WM 242419 cylindrical air-cleaner element — axis along X inside housing.
    const cartridge = makeCylindricalAirCleaner({
      node: `airFilterElement_${sk}`,
      r: 0.07,
      len: 0.32,
    });
    // Local +Y of makeCylindricalAirCleaner → world ±X (slide-out toward centre).
    rot(cartridge, 0, 0, -dir * HALF_PI);
    at(cartridge, filterX, hyFilter + 0.02, hz - 0.03);
    airFilters.add(cartridge);

    // Mounting grommets / luggage-compartment fasteners (WM 4 Nm nuts).
    const grommets = group(`airboxMountingGrommet_${sk}`);
    for (let i = 0; i < 3; i++) {
      add(at(cyl(`grommet_${sk}_${i}`, 0.02, 0.02, 0.03, 'rubber', 12),
        filterX + dir * (i - 1) * 0.06, hyFilter - 0.1, hz + (i - 1) * 0.05), grommets);
    }
    airbox.add(grommets);

    add(rot(at(box(`airGuide_${sk}`, 0.12, 0.01, 0.14, 'cover'), mouthX + dir * 0.04, hyMouth + 0.04, hz + 0.08), 0.35, dir * 0.2, 0), box1);
  }

  add(at(cyl('airboxMountingGrommet', 0.02, 0.02, 0.03, 'rubber', 12), 0.78, 0.28, -0.55), airbox);
  add(rot(at(box('airGuide', 0.12, 0.01, 0.14, 'cover'), 1.05, 0.4, -0.48), 0.35, 0.15, 0), airbox);
  air.add(airbox);

  // Contract node 'airFilterElement' — co-located with the R cartridge so the
  // pin lands on real media (not a floating centre panel).
  const filterElement = makeCylindricalAirCleaner({ node: 'airFilterElement', r: 0.068, len: 0.3 });
  rot(filterElement, 0, 0, -HALF_PI);
  at(filterElement, 0.78, 0.36, -0.58);
  airFilters.add(filterElement);
  air.add(airFilters);

  // ====================================================================
  // RAM-AIR / SCOOP INLETS — short snorkels aligned with each housing mouth
  // ====================================================================

  const ramAir = group('ramAirSnorkelDuct');
  for (const [dir, sk] of [[1, 'R'], [-1, 'L']]) {
    add(tube(`ramAirSnorkel_${sk}`, [
      [dir * 1.12, 0.34, -0.42],
      [dir * 1.08, 0.36, -0.48],
      [dir * 1.05, 0.38, -0.55],
    ], 0.05, 'rubber', 18, 12), ramAir);
  }
  air.add(ramAir);

  const intakeDucts = group('intakeDuctsSnorkelTubes');
  for (const [dir, sk] of [[1, 'R'], [-1, 'L']]) {
    add(tube(`intakeDuctSnorkel_${sk}`, [
      [dir * 1.1, 0.32, -0.48],
      [dir * 1.0, 0.36, -0.52],
      [dir * 0.9, 0.38, -0.55],
    ], 0.045, 'rubber', 16, 12), intakeDucts);
  }
  air.add(intakeDucts);

  // ====================================================================
  // SENSORS — MAF + IAT on each housing neck
  // ====================================================================

  const maf = group('massAirflowSensorsMaf');
  for (const [dir, sk] of [[1, 'R'], [-1, 'L']]) {
    const mx = dir * 0.32, my = neckDroopBySide[sk], mz = -0.7;
    add(rot(at(cyl(`mafSensorHousing_${sk}`, 0.05, 0.05, 0.11, 'intake', 18), mx, my, mz), 0, 0, HALF_PI), maf);
    add(at(box(`mafElement_${sk}`, 0.035, 0.06, 0.045, sensorMat), mx, my + 0.07, mz), maf);
  }
  add(rot(at(cyl('mafSensorHousing', 0.045, 0.045, 0.1, 'intake', 16), 0, 0.4, -0.8), 0, 0, HALF_PI), maf);
  air.add(maf);

  const iat = group('intakeAirTemperatureSensors');
  for (const [dir, sk] of [[1, 'R'], [-1, 'L']]) {
    add(at(cyl(`iatSensor_${sk}`, 0.012, 0.012, 0.05, sensorMat, 10), dir * 0.32, neckDroopBySide[sk] + 0.06, -0.68), iat);
  }
  air.add(iat);

  // ====================================================================
  // HOUSING → CENTRAL THROTTLE ducts
  // ====================================================================

  add(tube('airboxToThrottleBodyDuctBank1', [
    [0.34, neckDroopBySide.R, -0.68],
    [0.22, 0.4, -0.78],
    [0.1, 0.42, -0.88],
    [0.04, TB.y, TB.z + 0.05],
  ], 0.05, 'rubber', 24, 14));

  add(tube('airboxToThrottleBodyDuctBank2', [
    [-0.34, neckDroopBySide.L, -0.68],
    [-0.22, 0.4, -0.78],
    [-0.1, 0.42, -0.88],
    [-0.04, TB.y, TB.z + 0.05],
  ], 0.05, 'rubber', 24, 14));

  // ====================================================================
  // THROTTLE HOUSING — one central unit
  // ====================================================================
  const tb = group('throttleBody');
  add(rot(at(cyl('throttleBore_C', 0.065, 0.065, 0.14, 'cast', 22), TB.x, TB.y, TB.z), HALF_PI, 0, 0), tb);
  add(rot(at(cyl('throttleButterfly_C', 0.055, 0.055, 0.008, 'steel', 18), TB.x, TB.y, TB.z), 0, 0.3, 0), tb);
  add(at(box('throttleMotor_C', 0.07, 0.06, 0.055, sensorMat), TB.x + 0.08, TB.y + 0.02, TB.z), tb);
  add(rot(at(cyl('intakeManifoldRubberSleeve_C', 0.062, 0.062, 0.08, 'rubber', 18), TB.x, TB.y, TB.z - 0.1), HALF_PI, 0, 0), tb);
  add(rot(at(torus('throttleInletClamp', 0.07, 0.01, 'steel', 10, 20), TB.x, TB.y, TB.z + 0.06), HALF_PI, 0, 0), tb);
  air.add(tb);

  const tb2 = group('throttleBodyBank2');
  add(at(box('throttleBodyBank2Stub', 0.02, 0.02, 0.02, 'cast'), TB.x - 0.01, TB.y - 0.01, TB.z), tb2);
  air.add(tb2);

  add(rot(at(cyl('intakeManifoldRubberSleeve', 0.06, 0.06, 0.07, 'rubber', 16), TB.x, TB.y, TB.z - 0.11), HALF_PI, 0, 0));
  add(rot(at(torus('throttleBodyAdapterBank1', 0.072, 0.014, 'cast', 10, 20), TB.x, TB.y, TB.z - 0.14), HALF_PI, 0, 0));

  // ====================================================================
  // INTAKE MANIFOLD / PLENUM
  // ====================================================================
  function makeManifold(node, dir, sk) {
    const px = dir * 0.28, py = 0.4, pz = -1.25;
    const man = group(node);
    add(at(box(`plenumBody_${sk}`, 0.22, 0.16, 0.7, 'plenum'), px, py, pz), man);
    add(at(box(`plenumPlChamber_${sk}`, 0.18, 0.13, 0.65, 'intake'), px, py + 0.01, pz), man);

    add(tube(`throttleToDistributor_${sk}`, [
      [dir * 0.03, TB.y, TB.z - 0.12],
      [dir * 0.12, py + 0.01, -1.05],
      [px, py + 0.02, pz + 0.28],
    ], 0.04, 'rubber', 18, 12), man);

    for (let i = 0; i < 3; i++) {
      const z = cylZ[i] * 0.55 - 1.15;
      add(tube(`intakeRunner_${sk}_${i}`, [
        [px, py + 0.02, z],
        [px + dir * 0.1, py - 0.02, z],
        [px + dir * 0.18, py - 0.1, z],
        [px + dir * 0.24, py - 0.2, z],
      ], 0.03, 'runner', 18, 12), man);
      add(rot(at(torus(`runnerPort_${sk}_${i}`, 0.035, 0.009, 'intake', 8, 16), px + dir * 0.24, py - 0.2, z), 0, 0, HALF_PI), man);
    }
    air.add(man);
  }
  makeManifold('intakeManifoldBank1', 1, 'R');
  makeManifold('intakeManifoldBank2', -1, 'L');

  add(at(box('intakeManifoldSeal', 0.02, 0.01, 0.7, { color: 0x9aa0a6, metalness: 0.4, roughness: 0.7 }), 0, 0.08, -1.4));

  // ====================================================================
  // RESONANCE / TUNING FLAP
  // ====================================================================

  const resFlap = group('intakeManifoldResonanceFlapActuator');
  for (const [dir, sk] of [[1, 'R'], [-1, 'L']]) {
    add(at(box(`resonanceFlapActuator_${sk}`, 0.08, 0.06, 0.07, sensorMat), dir * 0.28, 0.52, -1.55), resFlap);
    add(at(cyl(`resonanceFlapLever_${sk}`, 0.01, 0.01, 0.08, 'steel', 8), dir * 0.28, 0.48, -1.45), resFlap);
  }
  air.add(resFlap);

  const vacUnit = group('resonanceFlapVacuumUnit');
  add(rot(at(cyl('resonanceVacuumCan', 0.045, 0.045, 0.07, sensorMat, 16), 0, 0.55, -1.55), 0, 0, HALF_PI), vacUnit);
  add(at(cyl('resonanceVacuumRod', 0.01, 0.01, 0.06, 'steel', 8), 0.05, 0.55, -1.55), vacUnit);
  air.add(vacUnit);

  // ====================================================================
  // PRESSURE / TEMP SENSORS
  // ====================================================================

  const mapSensor = group('mapSensorBoostPressure');
  add(at(cyl('mapSensorBody', 0.02, 0.02, 0.06, sensorMat, 12), 0.15, 0.5, -1.25), mapSensor);
  add(at(box('mapSensorConnector', 0.03, 0.025, 0.025, sensorMat), 0.15, 0.54, -1.25), mapSensor);
  air.add(mapSensor);

  add(at(cyl('intakeManifoldPressureSensor', 0.018, 0.018, 0.05, sensorMat, 12), -0.15, 0.5, -1.25));
  add(at(cyl('intakeManifoldTempSensor', 0.015, 0.015, 0.05, sensorMat, 10), 0.0, 0.5, -1.15));

  // ====================================================================
  // CRANKCASE VENTILATION
  // ====================================================================

  const pcv = group('crankcaseBretherPcvValve');
  add(at(cyl('pcvValveBody', 0.025, 0.025, 0.07, 'cover', 14), 0, 0.25, -1.4), pcv);
  add(tube('pcvHose', [
    [0, 0.25, -1.38],
    [0.05, 0.32, -1.3],
    [0.12, 0.4, -1.25],
  ], 0.012, 'hose2', 22, 8), pcv);
  air.add(pcv);

  add(at(box('oilSeparatorCrankcase', 0.09, 0.11, 0.08, 'cover'), 0, 0.18, -1.55));

  add(tube('crankvcaseCvLineSecondary', [
    [0, 0.18, -1.55],
    [0.2, 0.25, -1.1],
    [0.4, 0.32, -0.8],
    [0.7, 0.36, -0.6],
  ], 0.011, 'hose2', 28, 8));

  return air;
}
