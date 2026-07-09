// Full 981 9A1 flat-six wet-sump lubrication system (id 'oil'). Replaces the
// old single-cartridge oil.glb so every PRIMARY part in oil-parts.json has a
// named mesh/group at its real location for the app to pin.
//
// Layout: +Z=front, -Z=rear, +Y=up, +X=right. Parts are arranged around an
// implied engine block centred near the origin. The sump is the largest part
// (bottom centre); sensors and the filter are kept appropriately small.
//
// WM CAD refs (981): filter underside ~3984–3986; pump sprocket/chain ~4010–4015;
// pan upper/lower + molded seal ~4035–4045; cooler bracket exploded ~4059.
//
// Primary nodes covered (tier !== 'sub'):
//   oilPump, oilFilterHousing, oilPressureSensor, oilFillerCap, oilSump,
//   oilSeparator, oilConductingHousing, oilHeatExchanger, oilLevelSensor,
//   oilTemperatureSensor, engineOil
// Sub-tier parts (galleries, inserts, gaskets, drive chain, jets, etc.) are
// modelled where convenient as nested named meshes — harmless extras.

import { group, box, roundBox, cyl, torus, tube, lathe, at, rot } from '../lib/primitives.mjs';
import { footprint } from '../lib/wm-traces.mjs';

export const meta = {
  id: 'oil',
  label: 'Oil & Lubrication',
  system: 'Engine',
  node: 'oilSystem',
  hotspot3d: '0 -0.4 0',
};

// Oil-wetted metal (warm tan-bronze sheen) for galleries / pipes / oil body.
const OIL = { color: 0x6b5a2e, metalness: 0.4, roughness: 0.5 };

// ---- WM 3984 Fig 1 oil filter cover trace --------------------------------
// Traced side-view silhouette of the spin-on filter can: narrow flat base →
// wide mid-body → tapering dome top. `filterCoverDome` below only models the
// domed COVER (the fluted grip ring / base is separate: filterHousingCap +
// filterFlute_*), so we take just the trace samples from the widest
// cross-section upward (the dome) and revolve those — the WM shape, instead
// of the previous hand-guessed profile.
//
// WM 4059 ("Overview Of Oil Cooler Bracket Component") is an exploded/overview
// figure spanning the mist separator + bracket spine + cooler + filter boss
// together (see oil-findings.md) — its traced footprint reflects that whole
// multi-part overview rather than one clean envelope, same issue as the
// exhaust silencer's exploded-view trace. We keep the existing hand-built
// WM-4059 silhouette for `oilConductingHousing` / `oilHeatExchanger` (already
// anchored consistently to the separator/filter sub-parts) and load only the
// oil-filter trace for this pass.
const OIL_FILTER_TRACE = footprint('981/traces/oil-filter-3984.trace.json');

/**
 * Build a lathe [radius, y] profile for the domed portion of a spin-on
 * cover from a traced closed-loop side silhouette. Collapses independent
 * left/right trace samples at similar heights, keeps only the widest point
 * and everything above it (the dome), then rescales to the requested
 * height/radius and closes both ends for a clean revolve.
 */
function domeProfileFromFootprint(pts, { height, maxRadius, yBase }) {
  const sorted = pts.map(([x, y]) => [Math.abs(x), y]).sort((a, b) => a[1] - b[1]);
  const merged = [];
  for (const [r, y] of sorted) {
    const last = merged[merged.length - 1];
    if (last && Math.abs(last[1] - y) < 0.03) last[0] = (last[0] + r) / 2;
    else merged.push([r, y]);
  }
  const widestIdx = merged.reduce((bi, p, i) => (p[0] > merged[bi][0] ? i : bi), 0);
  const dome = merged.slice(widestIdx);
  const yMin = dome[0][1];
  const yMax = dome[dome.length - 1][1];
  const scaleY = height / (yMax - yMin || 1);
  const scaleR = maxRadius / dome[0][0];
  const scaled = dome.map(([r, y]) => [r * scaleR, yBase + (y - yMin) * scaleY]);
  return [[0, yBase], ...scaled, [0, yBase + height]];
}

const FILTER_COVER_PROFILE = domeProfileFromFootprint(OIL_FILTER_TRACE, {
  height: 0.45, maxRadius: 0.2, yBase: -0.28,
});

export function build() {
  const oil = group('oilSystem');
  const add = (m, p = oil) => { p.add(m); return m; };

  // ----------------------------------------------------------------------
  // OIL SUMP / PAN — two-piece: lower sump + upper frame (WM ~4035–4045).
  // Molded seal lip between halves; pickup/strainer visible in lower cavity.
  // ----------------------------------------------------------------------
  const sump = group('oilSump');
  add(sump);
  // lower pan body — shallow cast bowl with tapered floor (WM pan lower)
  add(at(roundBox('sumpBody', 2.0, 0.48, 2.55, 'cast', 3), 0, -1.38, -0.1), sump);
  add(at(roundBox('sumpFloor', 1.65, 0.14, 2.2, 'castDark', 2), 0, -1.62, -0.1), sump);
  // cast cooling/strengthening ribs on the pan floor
  for (let i = 0; i < 5; i++) {
    add(at(box(`sumpRib_${i}`, 1.55, 0.04, 0.055, 'castDark'), 0, -1.68, -1.0 + i * 0.45), sump);
  }
  // lower-pan flange lip (outer rim where molded seal seats)
  add(at(box('sumpLowerFlange', 2.08, 0.06, 2.62, 'cast'), 0, -1.12, -0.1), sump);

  // upper sump part (sub) — frame with central void (WM Fig 9 ~4045)
  add(at(roundBox('oilSumpUpperPart', 2.1, 0.38, 2.65, 'cast', 3), 0, -0.9, -0.1), sump);
  // inner void suggestion (thinner inset) so upper reads as a frame, not a solid slab
  add(at(box('sumpUpperVoid', 1.35, 0.42, 1.7, 'castDark'), 0, -0.9, -0.05), sump);
  // molded seal lip (sub) — perimeter gasket plane between upper/lower (WM ~4036)
  add(at(box('oilSumpGasket', 2.12, 0.035, 2.68, 'rubber'), 0, -1.12, -0.1), sump);
  // raised seal bead along flange edge
  add(at(box('sumpSealBeadOuter', 2.14, 0.02, 2.7, 'rubber'), 0, -1.1, -0.1), sump);

  // rear crankshaft sealing flange (sub)
  add(rot(at(cyl('sealingFlange', 0.62, 0.62, 0.12, 'cast', 28), 0, -0.85, -1.45), Math.PI / 2, 0, 0), sump);
  // drain plug + aluminium crush washer (sub) at the lowest point
  add(at(cyl('oilDrainPlug', 0.1, 0.1, 0.1, 'bolt', 6), 0.0, -1.72, 0.3), sump);
  add(at(torus('oilDrainPlugWasher', 0.11, 0.025, 'steel', 8, 20), 0.0, -1.66, 0.3), sump);

  // Engine oil (primary) — translucent-ish oil mass filling the lower sump.
  add(at(box('engineOil', 1.6, 0.26, 2.15, OIL), 0, -1.5, -0.1), oil);

  // ----------------------------------------------------------------------
  // OIL PUMP — cast housing + sprocket with lightening holes + chain stub
  // toward crank (WM ~4010–4015).
  // ----------------------------------------------------------------------
  const pump = group('oilPump');
  add(pump);
  add(rot(at(cyl('pumpBody', 0.34, 0.34, 0.4, 'cast', 28), -0.55, -0.6, 0.6), Math.PI / 2, 0, 0), pump);
  add(rot(at(cyl('pumpCover', 0.3, 0.3, 0.08, 'castDark', 28), -0.55, -0.6, 0.82), Math.PI / 2, 0, 0), pump);
  // pump inlet boss
  add(at(cyl('pumpInletBoss', 0.12, 0.12, 0.16, 'cast', 18), -0.55, -0.85, 0.6), pump);
  // oil pressure control valve boss on pump face (WM ~4015)
  add(rot(at(cyl('pumpPressureValveBoss', 0.07, 0.07, 0.14, 'steel', 14), -0.55, -0.45, 0.78), Math.PI / 2, 0, 0), pump);

  // drive chain & sprocket (sub) — holed sprocket + chain run toward crank
  const chain = group('oilPumpDriveChain');
  add(chain, pump);
  add(rot(at(cyl('pumpSprocket', 0.2, 0.2, 0.055, 'steel', 28), -0.55, -0.6, 0.92), Math.PI / 2, 0, 0), chain);
  add(rot(at(cyl('pumpSprocketHub', 0.07, 0.07, 0.07, 'bolt', 16), -0.55, -0.6, 0.96), Math.PI / 2, 0, 0), chain);
  // six lightening holes (WM ~4010 Fig 1)
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const hx = -0.55 + Math.cos(a) * 0.12;
    const hy = -0.6 + Math.sin(a) * 0.12;
    add(rot(at(cyl(`pumpSprocketHole_${i}`, 0.035, 0.035, 0.07, 'castDark', 10), hx, hy, 0.92), Math.PI / 2, 0, 0), chain);
  }
  // crank sprocket stub + chain runs upward toward crank
  add(rot(at(cyl('crankSprocket', 0.22, 0.22, 0.06, 'steel', 24), -0.55, 0.28, 0.92), Math.PI / 2, 0, 0), chain);
  add(rot(at(torus('chainRunL', 0.48, 0.022, 'steel', 8, 40), -0.62, -0.16, 0.92), 0, Math.PI / 2, 0), chain);
  add(rot(at(torus('chainRunR', 0.48, 0.022, 'steel', 8, 40), -0.48, -0.16, 0.92), 0, Math.PI / 2, 0), chain);
  // short chain stub segments toward crank (visual continuity)
  add(at(box('chainStubUp', 0.04, 0.55, 0.05, 'steel'), -0.55, -0.15, 0.98), chain);

  // Oil suction tube / pickup (sub) — from pump down into the sump (WM ~4042).
  add(tube('oilSuctionTube', [
    [-0.55, -0.78, 0.6],
    [-0.5, -1.1, 0.3],
    [-0.2, -1.35, -0.1],
    [0.0, -1.45, -0.3],
  ], 0.06, 'steel', 28, 12), pump);
  // pickup strainer screen at the tube mouth
  add(at(cyl('pickupScreen', 0.14, 0.14, 0.06, 'castDark', 16), 0.0, -1.46, -0.3), pump);
  add(at(box('pickupStrainer', 0.24, 0.04, 0.24, 'steel'), 0.0, -1.48, -0.3), pump);

  // Oil supply pipe (sub) — rigid pipe from pump outlet up to the gallery feed.
  add(tube('oilPipe', [
    [-0.55, -0.4, 0.62],
    [-0.65, 0.0, 0.5],
    [-0.7, 0.4, 0.3],
    [-0.7, 0.6, 0.0],
  ], 0.05, 'steel', 28, 12), oil);

  // ----------------------------------------------------------------------
  // OIL-CONDUCTING HOUSING / COOLER BRACKET SPINE (WM ~4059 item 1)
  // Long cast bracket: mist separator end → cooler pad → filter housing end.
  // ----------------------------------------------------------------------
  const conduct = group('oilConductingHousing');
  add(conduct);
  // main spine along +X / slight -Z (bracket body)
  add(at(roundBox('conductBody', 0.42, 0.55, 1.35, 'cast', 3), 1.0, 0.15, -0.15), conduct);
  add(at(box('conductFlange', 0.1, 0.48, 1.1, 'castDark'), 0.76, 0.12, -0.1), conduct);
  // cooler mounting pad (recessed flat on spine)
  add(at(box('coolerMountPad', 0.38, 0.08, 0.55, 'castDark'), 1.05, 0.42, -0.35), conduct);
  // filter mount boss at bracket end (underside, angled interface)
  add(at(cyl('filterMountBoss', 0.22, 0.22, 0.1, 'cast', 24), 1.05, -0.18, 0.35), conduct);
  // cooler bypass thermostat (sub)
  add(rot(at(cyl('oilCoolerBypassThermostat', 0.08, 0.08, 0.18, 'steel', 16), 1.05, 0.28, 0.35), Math.PI / 2, 0, 0), conduct);

  // ----------------------------------------------------------------------
  // OIL FILTER HOUSING — cartridge cover on underside, ~45° mount
  // (WM ~3984 Fig 1: domed cover + fluted grip near base; ~3985 element).
  // ----------------------------------------------------------------------
  const filterHousing = group('oilFilterHousing');
  add(filterHousing);
  // tilt group: pitch ~45° down/out from bracket end
  const filterTilt = group('oilFilterTilt');
  add(at(filterTilt, 1.05, -0.35, 0.4), filterHousing);
  rot(filterTilt, -Math.PI / 4, 0, 0.15);

  // fixed housing cup (open toward cover)
  add(at(cyl('filterHousingShell', 0.2, 0.2, 0.18, 'cast', 28), 0, 0.22, 0), filterTilt);
  // fluted/faceted grip ring near base of cover (WM ~3984)
  add(at(cyl('filterHousingCap', 0.21, 0.21, 0.1, 'castDark', 12), 0, 0.08, 0), filterTilt);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    add(at(box(`filterFlute_${i}`, 0.035, 0.1, 0.04, 'castDark'), Math.cos(a) * 0.2, 0.08, Math.sin(a) * 0.2), filterTilt);
  }
  // domed cylindrical cover body — profile traced from WM 3984 Fig 1
  add(at(lathe('filterCoverDome', FILTER_COVER_PROFILE, 'cast', 28), 0, -0.12, 0), filterTilt);
  // O-ring / gasket seal (sub) near open end of cover
  add(at(torus('oilFilterHousingORing', 0.195, 0.022, 'rubber', 10, 28), 0, 0.16, 0), filterTilt);
  // integrated pressure relief valve (sub)
  add(rot(at(cyl('oilPressureReliefValve', 0.055, 0.055, 0.14, 'steel', 14), 0.22, 0.05, 0), 0, 0, Math.PI / 2), filterTilt);

  // Filter element / insert (sub) — pleated cartridge visible inside cover (WM ~3985)
  const insert = group('oilFilterInsert');
  add(at(insert, 0, -0.08, 0), filterTilt);
  add(at(cyl('filterInsertCore', 0.14, 0.14, 0.38, 'paper', 20), 0, 0, 0), insert);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    add(at(box(`filterPleat_${i}`, 0.025, 0.34, 0.05, 'paper'), Math.cos(a) * 0.145, 0, Math.sin(a) * 0.145), insert);
  }
  add(at(cyl('filterInsertCap', 0.13, 0.13, 0.04, 'steel', 16), 0, 0.2, 0), insert);
  // filter service set marker (sub)
  add(at(cyl('oilFilterSet', 0.155, 0.155, 0.4, 'paper', 18), 0, -0.08, 0), filterTilt);

  // ----------------------------------------------------------------------
  // OIL HEAT EXCHANGER — rectangular oil/water cooler + dual pipe stubs
  // on bracket pad (WM ~4059 item 6).
  // ----------------------------------------------------------------------
  const cooler = group('oilHeatExchanger');
  add(cooler);
  add(at(roundBox('coolerBody', 0.55, 0.32, 0.48, 'castDark', 3), 1.08, 0.62, -0.35), cooler);
  // plate-stack suggestion (not tall finned block — WM is a compact rectangular HX)
  for (let i = 0; i < 5; i++) {
    add(at(box(`coolerPlate_${i}`, 0.52, 0.025, 0.46, 'steel'), 1.08, 0.5 + i * 0.045, -0.35), cooler);
  }
  // dual coolant/oil pipe stubs (WM ~4059 — two stubs on cooler face)
  add(at(cyl('coolerInlet', 0.065, 0.065, 0.16, 'steel', 14), 0.95, 0.82, -0.22), cooler);
  add(at(cyl('coolerOutlet', 0.065, 0.065, 0.16, 'steel', 14), 1.2, 0.82, -0.22), cooler);
  add(at(torus('coolerInletFlange', 0.075, 0.018, 'cast', 8, 16), 0.95, 0.74, -0.22), cooler);
  add(at(torus('coolerOutletFlange', 0.075, 0.018, 'cast', 8, 16), 1.2, 0.74, -0.22), cooler);

  // ----------------------------------------------------------------------
  // OIL SEPARATOR — mist separator canister on cooler-bracket end
  // (WM ~4059 item 2) + sump-mounted secondary separator (sub).
  // ----------------------------------------------------------------------
  const separator = group('oilSeparator');
  add(separator);
  // primary mist separator on bracket (canister / slight cone)
  add(at(cyl('separatorBody', 0.22, 0.26, 0.42, 'cover', 24), 1.05, 0.55, 0.45), separator);
  add(at(cyl('separatorCap', 0.24, 0.24, 0.07, 'cover', 24), 1.05, 0.8, 0.45), separator);
  add(at(cyl('separatorNeck', 0.1, 0.1, 0.1, 'cast', 16), 1.05, 0.32, 0.45), separator);
  // breather hose stub to intake
  add(tube('separatorHose', [
    [1.05, 0.75, 0.45],
    [0.6, 0.9, 0.2],
    [0.1, 0.95, -0.1],
  ], 0.045, 'hose2', 24, 10), separator);
  // secondary sump separator (sub) — air/oil separator on pan (WM ~4041)
  add(at(cyl('oilSumpSeparator', 0.16, 0.16, 0.28, 'cover', 20), 0.45, -0.95, -0.55), separator);
  add(at(box('sumpSeparatorFlange', 0.28, 0.04, 0.22, 'cast'), 0.45, -1.1, -0.55), separator);

  // ----------------------------------------------------------------------
  // OIL FILLER CAP & DIPSTICK — cap on top (tan/yellow), thin dipstick tube.
  // ----------------------------------------------------------------------
  const filler = group('oilFillerCap');
  add(filler);
  add(at(cyl('fillerNeck', 0.14, 0.14, 0.22, 'cast', 20), -0.1, 1.0, 0.55), filler);
  add(at(cyl('fillerCapBody', 0.18, 0.18, 0.12, 'oilcap', 24), -0.1, 1.16, 0.55), filler);
  add(at(cyl('fillerCapGrip', 0.2, 0.18, 0.06, 'yellow', 24), -0.1, 1.24, 0.55), filler);
  add(at(torus('oilFillerNeckSeal', 0.15, 0.025, 'rubber', 10, 24), -0.1, 0.9, 0.55), filler);
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
  const pSensor = group('oilPressureSensor');
  add(pSensor);
  add(rot(at(cyl('pressureSensorBody', 0.06, 0.06, 0.18, 'steel', 16), 1.22, 0.2, 0.05), 0, 0, Math.PI / 2), pSensor);
  add(rot(at(cyl('pressureSensorConn', 0.05, 0.05, 0.08, 'cover', 12), 1.36, 0.2, 0.05), 0, 0, Math.PI / 2), pSensor);

  const tSensor = group('oilTemperatureSensor');
  add(tSensor);
  add(rot(at(cyl('tempSensorBody', 0.055, 0.055, 0.16, 'steel', 16), 1.22, -0.05, 0.05), 0, 0, Math.PI / 2), tSensor);
  add(rot(at(cyl('tempSensorConn', 0.045, 0.045, 0.07, 'cover', 12), 1.35, -0.05, 0.05), 0, 0, Math.PI / 2), tSensor);

  const lSensor = group('oilLevelSensor');
  add(lSensor);
  add(at(cyl('levelSensorFlange', 0.12, 0.12, 0.05, 'cover', 18), -0.4, -1.62, 0.4), lSensor);
  add(at(cyl('levelSensorProbe', 0.03, 0.03, 0.45, 'steel', 12), -0.4, -1.38, 0.4), lSensor);
  add(at(cyl('levelSensorConn', 0.07, 0.07, 0.08, 'cover', 12), -0.4, -1.68, 0.4), lSensor);

  return oil;
}
