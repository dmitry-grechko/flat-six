// Full 981 9A1 flat-six wet-sump lubrication system (id 'oil'). Replaces the
// old single-cartridge oil.glb so every PRIMARY part in oil-parts.json has a
// named mesh/group at its real location for the app to pin.
//
// Layout: +Z=front, -Z=rear, +Y=up, +X=right. Parts are arranged around an
// implied engine block centred near the origin. The sump is the largest part
// (bottom centre); sensors and the filter are kept appropriately small.
//
// Primary nodes covered (tier !== 'sub'):
//   oilPump, oilFilterHousing, oilPressureSensor, oilFillerCap, oilSump,
//   oilSeparator, oilConductingHousing, oilHeatExchanger, oilLevelSensor,
//   oilTemperatureSensor, engineOil
// Sub-tier parts (galleries, inserts, gaskets, drive chain, jets, etc.) are
// modelled where convenient as nested named meshes — harmless extras.

import { group, box, cyl, torus, tube, at, rot } from '../lib/primitives.mjs';
import { makeCanister } from './smallParts.mjs';

export const meta = {
  id: 'oil',
  label: 'Oil & Lubrication',
  system: 'Engine',
  node: 'oilSystem',
  hotspot3d: '0 -0.4 0',
};

// Oil-wetted metal (warm tan-bronze sheen) for galleries / pipes / oil body.
const OIL = { color: 0x6b5a2e, metalness: 0.4, roughness: 0.5 };

export function build() {
  const oil = group('oilSystem');
  const add = (m, p = oil) => { p.add(m); return m; };

  // ----------------------------------------------------------------------
  // OIL SUMP / PAN — largest component, bottom centre (y negative).
  // Two-piece pan: lower sump + upper sump section, with a gasket plane,
  // rear sealing flange, drain plug + crush washer.
  // ----------------------------------------------------------------------
  const sump = group('oilSump');
  add(sump);
  // main lower pan body (wide, shallow, tapered toward the bottom)
  add(at(box('sumpBody', 2.0, 0.55, 2.6, 'cast'), 0, -1.35, -0.1), sump);
  add(at(box('sumpFloor', 1.7, 0.18, 2.3, 'castDark'), 0, -1.62, -0.1), sump);
  // cast cooling/strengthening ribs on the pan floor
  for (let i = 0; i < 5; i++) {
    add(at(box(`sumpRib_${i}`, 1.6, 0.05, 0.06, 'castDark'), 0, -1.66, -1.0 + i * 0.45), sump);
  }
  // upper sump part (sub) — forms the lower crankcase enclosure
  add(at(box('oilSumpUpperPart', 2.05, 0.4, 2.6, 'cast'), 0, -0.95, -0.1), sump);
  // sump gasket (sub) — thin sealing plane between sump and upper part
  add(at(box('oilSumpGasket', 2.06, 0.03, 2.62, 'rubber'), 0, -1.12, -0.1), sump);
  // rear crankshaft sealing flange (sub) — closes the rear of the lower crankcase
  add(rot(at(cyl('sealingFlange', 0.62, 0.62, 0.12, 'cast', 28), 0, -0.85, -1.45), Math.PI / 2, 0, 0), sump);
  // drain plug + aluminium crush washer (sub) at the lowest point
  add(at(cyl('oilDrainPlug', 0.1, 0.1, 0.1, 'bolt', 6), 0.0, -1.72, 0.3), sump);
  add(at(torus('oilDrainPlugWasher', 0.11, 0.025, 'steel', 8, 20), 0.0, -1.66, 0.3), sump);

  // Engine oil (primary) — translucent-ish oil mass filling the lower sump.
  add(at(box('engineOil', 1.65, 0.28, 2.2, OIL), 0, -1.5, -0.1), oil);

  // ----------------------------------------------------------------------
  // OIL PUMP — cast housing low in the block, crank-driven, with drive chain
  // & sprocket and the suction tube reaching down into the sump.
  // ----------------------------------------------------------------------
  const pump = group('oilPump');
  add(pump);
  add(rot(at(cyl('pumpBody', 0.34, 0.34, 0.4, 'cast', 28), -0.55, -0.6, 0.6), Math.PI / 2, 0, 0), pump);
  add(rot(at(cyl('pumpCover', 0.3, 0.3, 0.08, 'castDark', 28), -0.55, -0.6, 0.82), Math.PI / 2, 0, 0), pump);
  // pump inlet boss
  add(at(cyl('pumpInletBoss', 0.12, 0.12, 0.16, 'cast', 18), -0.55, -0.85, 0.6), pump);
  // drive chain & sprocket (sub) — crank-driven simplex chain
  const chain = group('oilPumpDriveChain');
  add(chain, pump);
  add(rot(at(cyl('pumpSprocket', 0.16, 0.16, 0.06, 'steel', 24), -0.55, -0.6, 0.9), Math.PI / 2, 0, 0), chain);
  add(rot(at(cyl('crankSprocket', 0.22, 0.22, 0.06, 'steel', 24), -0.55, 0.25, 0.9), Math.PI / 2, 0, 0), chain);
  add(rot(at(torus('chainRunL', 0.45, 0.025, 'steel', 8, 40), -0.62, -0.18, 0.9), 0, Math.PI / 2, 0), chain);

  // Oil suction tube / pickup (sub) — from pump down into the sump.
  add(tube('oilSuctionTube', [
    [-0.55, -0.78, 0.6],
    [-0.5, -1.1, 0.3],
    [-0.2, -1.35, -0.1],
    [0.0, -1.45, -0.3],
  ], 0.06, 'steel', 28, 12), pump);
  // pickup screen at the tube mouth
  add(at(box('pickupScreen', 0.22, 0.05, 0.22, 'castDark'), 0.0, -1.46, -0.3), pump);

  // Oil supply pipe (sub) — rigid pipe from pump outlet up to the gallery feed.
  add(tube('oilPipe', [
    [-0.55, -0.4, 0.62],
    [-0.65, 0.0, 0.5],
    [-0.7, 0.4, 0.3],
    [-0.7, 0.6, 0.0],
  ], 0.05, 'steel', 28, 12), oil);

  // ----------------------------------------------------------------------
  // OIL-CONDUCTING HOUSING — integrated housing on the side of the block
  // routing oil between filter, cooler and galleries. Carries the filter
  // mounting interface plus the cooler bypass thermostat.
  // ----------------------------------------------------------------------
  const conduct = group('oilConductingHousing');
  add(conduct);
  add(at(box('conductBody', 0.5, 0.7, 0.5, 'cast'), 0.95, 0.05, 0.2), conduct);
  add(at(box('conductFlange', 0.12, 0.5, 0.4, 'castDark'), 0.68, 0.05, 0.2), conduct);
  // filter mount boss (where the filter housing screws on, underneath)
  add(at(cyl('filterMountBoss', 0.2, 0.2, 0.12, 'cast', 24), 0.95, -0.32, 0.2), conduct);
  // cooler bypass thermostat (sub) — small element in the housing
  add(rot(at(cyl('oilCoolerBypassThermostat', 0.08, 0.08, 0.18, 'steel', 16), 0.95, 0.2, 0.5), Math.PI / 2, 0, 0), conduct);

  // ----------------------------------------------------------------------
  // OIL FILTER HOUSING + insert — on the side of the block, BELOW the
  // conducting housing. Kept clearly SMALL (radius ~0.18) vs the sump.
  // ----------------------------------------------------------------------
  const filterHousing = group('oilFilterHousing');
  add(filterHousing);
  // outer cap/housing shell (spin-on style), small
  add(at(cyl('filterHousingShell', 0.22, 0.22, 0.52, 'cast', 28), 0.95, -0.62, 0.2), filterHousing);
  add(at(cyl('filterHousingCap', 0.18, 0.2, 0.1, 'castDark', 24), 0.95, -0.35, 0.2), filterHousing);
  // O-ring / gasket seal (sub)
  add(at(torus('oilFilterHousingORing', 0.2, 0.025, 'rubber', 10, 28), 0.95, -0.32, 0.2), filterHousing);
  // integrated pressure relief valve (sub)
  add(rot(at(cyl('oilPressureReliefValve', 0.06, 0.06, 0.16, 'steel', 14), 1.15, -0.5, 0.2), 0, 0, Math.PI / 2), filterHousing);

  // Filter element / insert (sub) — small pleated cartridge inside the housing.
  const insert = makeCanister({ node: 'oilFilterInsert', r: 0.16, h: 0.42, bodyMat: 'red', capMat: 'steel', pleats: true });
  add(at(insert, 0.95, -0.62, 0.2), filterHousing);
  // filter service set marker (sub) — co-located with the insert
  add(at(cyl('oilFilterSet', 0.17, 0.17, 0.44, 'paper', 20), 0.95, -0.62, 0.2), filterHousing);

  // ----------------------------------------------------------------------
  // OIL HEAT EXCHANGER (oil cooler) — finned oil-to-coolant block on the side.
  // ----------------------------------------------------------------------
  const cooler = group('oilHeatExchanger');
  add(cooler);
  add(at(box('coolerBody', 0.6, 0.5, 0.45, 'castDark'), 1.15, 0.55, -0.5), cooler);
  for (let i = 0; i < 9; i++) {
    add(at(box(`coolerFin_${i}`, 0.64, 0.03, 0.45, 'steel'), 1.15, 0.32 + i * 0.055, -0.5), cooler);
  }
  // coolant inlet/outlet stubs
  add(rot(at(cyl('coolerInlet', 0.07, 0.07, 0.18, 'steel', 14), 1.15, 0.78, -0.32), Math.PI / 2, 0, 0), cooler);
  add(rot(at(cyl('coolerOutlet', 0.07, 0.07, 0.18, 'steel', 14), 1.15, 0.32, -0.32), Math.PI / 2, 0, 0), cooler);

  // ----------------------------------------------------------------------
  // OIL SEPARATOR (crankcase ventilation) — canister on top/side of the block.
  // Plus the sump-mounted secondary separator (sub).
  // ----------------------------------------------------------------------
  const separator = group('oilSeparator');
  add(separator);
  add(at(cyl('separatorBody', 0.3, 0.3, 0.55, 'cover', 24), -0.7, 0.85, -0.4), separator);
  add(at(cyl('separatorCap', 0.32, 0.32, 0.08, 'cover', 24), -0.7, 1.16, -0.4), separator);
  // breather hose stub to intake
  add(tube('separatorHose', [
    [-0.7, 1.05, -0.4],
    [-0.4, 1.1, -0.1],
    [-0.1, 1.0, 0.2],
  ], 0.05, 'hose2', 24, 10), separator);
  // secondary sump separator (sub)
  add(at(cyl('oilSumpSeparator', 0.18, 0.18, 0.3, 'cover', 20), 0.4, -0.95, -0.5), separator);

  // ----------------------------------------------------------------------
  // OIL FILLER CAP & DIPSTICK — cap on top (tan/yellow), thin dipstick tube.
  // ----------------------------------------------------------------------
  const filler = group('oilFillerCap');
  add(filler);
  // filler neck + cap on top of the cam housing
  add(at(cyl('fillerNeck', 0.14, 0.14, 0.22, 'cast', 20), -0.1, 1.0, 0.55), filler);
  add(at(cyl('fillerCapBody', 0.18, 0.18, 0.12, 'oilcap', 24), -0.1, 1.16, 0.55), filler);
  add(at(cyl('fillerCapGrip', 0.2, 0.18, 0.06, 'yellow', 24), -0.1, 1.24, 0.55), filler);
  // filler neck seal (sub)
  add(at(torus('oilFillerNeckSeal', 0.15, 0.025, 'rubber', 10, 24), -0.1, 0.9, 0.55), filler);
  // dipstick tube (sub geometry) + handle
  add(tube('dipstickTube', [
    [0.25, 1.0, 0.3],
    [0.3, 0.4, 0.1],
    [0.3, -0.2, -0.1],
    [0.25, -0.8, -0.2],
  ], 0.03, 'steel', 28, 10), filler);
  add(at(cyl('dipstickHandle', 0.07, 0.07, 0.08, 'yellow', 16), 0.25, 1.06, 0.3), filler);

  // ----------------------------------------------------------------------
  // SENSORS — small cylinders on the housing / sump. Kept tiny.
  // ----------------------------------------------------------------------
  // Oil pressure sensor (primary) — on the conducting housing.
  const pSensor = group('oilPressureSensor');
  add(pSensor);
  add(rot(at(cyl('pressureSensorBody', 0.06, 0.06, 0.18, 'steel', 16), 1.18, 0.2, 0.0), 0, 0, Math.PI / 2), pSensor);
  add(rot(at(cyl('pressureSensorConn', 0.05, 0.05, 0.08, 'cover', 12), 1.32, 0.2, 0.0), 0, 0, Math.PI / 2), pSensor);

  // Oil temperature sensor (primary) — in the oil circuit on the housing.
  const tSensor = group('oilTemperatureSensor');
  add(tSensor);
  add(rot(at(cyl('tempSensorBody', 0.055, 0.055, 0.16, 'steel', 16), 1.18, -0.1, 0.0), 0, 0, Math.PI / 2), tSensor);
  add(rot(at(cyl('tempSensorConn', 0.045, 0.045, 0.07, 'cover', 12), 1.31, -0.1, 0.0), 0, 0, Math.PI / 2), tSensor);

  // Oil level sensor (primary) — capacitive sensor in the sump floor.
  const lSensor = group('oilLevelSensor');
  add(lSensor);
  add(at(cyl('levelSensorFlange', 0.12, 0.12, 0.05, 'cover', 18), -0.4, -1.62, 0.4), lSensor);
  add(at(cyl('levelSensorProbe', 0.03, 0.03, 0.45, 'steel', 12), -0.4, -1.38, 0.4), lSensor);
  add(at(cyl('levelSensorConn', 0.07, 0.07, 0.08, 'cover', 12), -0.4, -1.68, 0.4), lSensor);

  return oil;
}
