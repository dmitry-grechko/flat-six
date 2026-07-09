// Electrical system for the 981. Procedurally builds CAD-style named meshes/groups
// so the app can pin every primary part from elec-parts.json by its `node` name.
//
// Built in CAR SPACE (same frame as susp/driveline / flow-systems waypoints):
//   +X = right (passenger on LHD), −X = left (driver), +Y = up, +Z = front.
// Unified scene places this GLB with carSpace: true (no normalize/recenter).
//
// Layout (unified scene: +X = screen-right when viewed from the front):
//   - Battery (batteryAgm) — front trunk, passenger side (−X), well forward.
//   - Fuse/relay carrier (junctionBox) — driver side (+X) kick panel near column.
//   - Cabin particle filter — next to the battery (−X) in the HVAC / frunk bulkhead.
//   - Alternator + Starter on the engine at the REAR.
//   - Control modules / instrument cluster / Sport Chrono spread plausibly.

import { group, box, cyl, torus, tube, sphere, at, rot } from '../lib/primitives.mjs';
import { makePanel } from './smallParts.mjs';

const M_CASE = { color: 0x222428, metalness: 0.2, roughness: 0.7 };
const M_POS = { color: 0xc23535, metalness: 0.6, roughness: 0.4 };
const M_NEG = { color: 0x222222, metalness: 0.6, roughness: 0.4 };
const M_HOUSING = { color: 0xaab0b6, metalness: 0.9, roughness: 0.4 };
const M_MODULE = { color: 0x33414d, metalness: 0.3, roughness: 0.6 };
const M_WIRE = { color: 0xb87333, metalness: 0.8, roughness: 0.4 };
const M_RELAY = { color: 0x4a4d54, metalness: 0.4, roughness: 0.6 };

export const meta = {
  id: 'elec',
  label: 'Electrical System',
  system: 'Electrical',
  node: 'electrical',
  hotspot3d: '0 0 0',
};

export function build() {
  const elec = group('electrical');
  const add = (m) => { elec.add(m); return m; };

  // ---------------------------------------------------------------------------
  // Battery — passenger frunk (−X). Cabin filter sits adjacent.
  // ---------------------------------------------------------------------------
  const battery = group('batteryAgm');
  {
    const add2 = (m) => { battery.add(m); return m; };
    add2(at(box('case', 0.28, 0.22, 0.2, M_CASE), 0, 0, 0));
    add2(at(box('lid', 0.29, 0.03, 0.21, M_CASE), 0, 0.125, 0));
    add2(at(cyl('postPositive', 0.025, 0.028, 0.05, M_POS, 16), 0.09, 0.165, 0.06));
    add2(at(cyl('postNegative', 0.025, 0.028, 0.05, M_NEG, 16), -0.09, 0.165, 0.06));
    add2(at(box('holdDown', 0.31, 0.02, 0.03, M_RELAY), 0, 0.145, -0.07));
  }
  // Frunk bulkhead, aft of left radiator/fan (~z 1.7–1.9) and clear of the
  // expansion-tank zone — outboard so it does not sit in the rad pack.
  add(at(battery, -0.62, 0.22, 1.05));

  // ---------------------------------------------------------------------------
  // Alternator — rear engine, right side.
  // ---------------------------------------------------------------------------
  const alternator = group('alternator');
  {
    const add2 = (m) => { alternator.add(m); return m; };
    add2(rot(cyl('body', 0.11, 0.11, 0.2, M_HOUSING, 28), Math.PI / 2, 0, 0));
    add2(rot(cyl('rearHousing', 0.09, 0.09, 0.06, M_RELAY, 24), Math.PI / 2, 0, 0));
    at(alternator.children[1], 0, 0, -0.13);
    add2(rot(at(torus('pulley', 0.055, 0.02, M_HOUSING, 10, 24), 0, 0, 0.12), Math.PI / 2, 0, 0));
    add2(at(cyl('pulleyHub', 0.02, 0.02, 0.05, M_HOUSING, 16), 0, 0, 0.13));
    rot(alternator.children[3], Math.PI / 2, 0, 0);
  }
  add(at(alternator, 0.35, 0.05, -0.95));

  // ---------------------------------------------------------------------------
  // Starter — rear, low on bellhousing.
  // ---------------------------------------------------------------------------
  const starter = group('starterMotor');
  {
    const add2 = (m) => { starter.add(m); return m; };
    add2(rot(cyl('body', 0.08, 0.08, 0.17, M_HOUSING, 24), Math.PI / 2, 0, 0));
    add2(at(cyl('pinion', 0.032, 0.032, 0.06, M_HOUSING, 16), 0, 0, 0.11));
    rot(starter.children[1], Math.PI / 2, 0, 0);
    add2(rot(at(cyl('solenoid', 0.04, 0.04, 0.12, M_RELAY, 20), 0, 0.09, 0.01), Math.PI / 2, 0, 0));
  }
  add(at(starter, -0.35, -0.2, -1.15));

  // ---------------------------------------------------------------------------
  // Fuse / relay carrier — DRIVER side (+X), small panel at the A-pillar /
  // kick panel near the steering column.
  // ---------------------------------------------------------------------------
  const junction = group('junctionBox');
  {
    const add2 = (m) => { junction.add(m); return m; };
    add2(at(box('housing', 0.14, 0.06, 0.1, M_RELAY), 0, 0, 0));
    add2(at(box('lid', 0.145, 0.015, 0.105, M_CASE), 0, 0.038, 0));
    add2(at(box('relayBlockA', 0.035, 0.03, 0.035, M_MODULE), -0.035, 0.055, 0.02));
    add2(at(box('relayBlockB', 0.035, 0.03, 0.035, M_MODULE), 0.01, 0.055, 0.02));
    add2(at(box('maxiFuse', 0.08, 0.018, 0.028, M_POS), 0.01, 0.055, -0.025));
  }
  // Outboard / lower than the master cylinder (~0.35, 0.33, 1.15) so the
  // kick-panel fuse box does not merge with the brake MC on the cowl.
  add(at(junction, 0.62, 0.18, 0.95));

  // ---------------------------------------------------------------------------
  // Cabin particle filter — passenger HVAC, adjacent to battery (−X).
  // ---------------------------------------------------------------------------
  const cabinFilter = group('cabinParticleFilter');
  {
    const add2 = (m) => { cabinFilter.add(m); return m; };
    const element = makePanel({ node: 'cabinFilterElement', w: 0.32, h: 0.1, d: 0.04 });
    add2(at(element, 0, 0, 0));
    add2(at(box('cabinFilterCover', 0.34, 0.012, 0.11, M_CASE), 0, -0.035, 0));
    for (let i = 0; i < 5; i++) {
      add2(at(box(`cabinFilterSlat_${i}`, 0.3, 0.004, 0.01, M_RELAY), 0, -0.042, -0.035 + i * 0.018));
    }
    for (let i = 0; i < 3; i++) {
      add2(at(box(`cabinFilterClip_${i}`, 0.035, 0.018, 0.012, M_MODULE), -0.1 + i * 0.1, -0.048, 0.045));
    }
    add2(at(box('cabinFilterSlot', 0.36, 0.05, 0.07, M_RELAY), 0, 0.015, 0.015));
  }
  // Adjacent to battery, still clear of the radiator pack.
  add(at(cabinFilter, -0.68, 0.28, 0.92));

  // ---------------------------------------------------------------------------
  // Control modules
  // ---------------------------------------------------------------------------
  const psm = group('psmModule');
  {
    const add2 = (m) => { psm.add(m); return m; };
    add2(at(box('housing', 0.14, 0.04, 0.1, M_MODULE), 0, 0, 0));
    add2(at(box('connector', 0.04, 0.03, 0.015, M_RELAY), 0.05, 0, 0.06));
  }
  add(at(psm, 0.4, 0.0, -0.25));

  const bcm = group('bcmFront');
  {
    const add2 = (m) => { bcm.add(m); return m; };
    add2(at(box('housing', 0.13, 0.04, 0.1, M_MODULE), 0, 0, 0));
    add2(at(box('connector', 0.04, 0.03, 0.015, M_RELAY), -0.05, 0, 0.055));
  }
  add(at(bcm, -0.4, 0.0, 1.05));

  const combi = group('combiInstrument');
  {
    const add2 = (m) => { combi.add(m); return m; };
    add2(rot(box('housing', 0.2, 0.1, 0.07, M_CASE), -0.2, 0, 0));
    for (let i = 0; i < 3; i++) {
      add2(rot(at(cyl(`gauge_${i}`, 0.035, 0.035, 0.012, M_MODULE, 20), (i - 1) * 0.06, 0.0, 0.04), Math.PI / 2 - 0.2, 0, 0));
    }
  }
  add(at(combi, 0.0, 0.45, 0.55));

  const chronoMod = group('sportChronoModule');
  {
    const add2 = (m) => { chronoMod.add(m); return m; };
    add2(at(box('housing', 0.08, 0.03, 0.06, M_MODULE), 0, 0, 0));
    add2(at(box('connector', 0.025, 0.02, 0.012, M_RELAY), 0.03, 0, 0.035));
  }
  add(at(chronoMod, 0.25, 0.0, 0.5));

  const chronoSwitch = group('sportChronoSwitch');
  {
    const add2 = (m) => { chronoSwitch.add(m); return m; };
    add2(at(cyl('base', 0.028, 0.032, 0.016, M_CASE, 20), 0, 0, 0));
    add2(at(cyl('knob', 0.02, 0.024, 0.02, M_MODULE, 20), 0, 0.016, 0));
    add2(at(sphere('detent', 0.005, M_POS, 10), 0, 0.024, 0.016));
  }
  add(at(chronoSwitch, 0.12, 0.4, 0.4));

  // ---------------------------------------------------------------------------
  // Wiring harness
  // ---------------------------------------------------------------------------
  add(tube('harnessBatteryToJunction', [
    [-0.62, 0.32, 1.05], [-0.2, 0.26, 1.0], [0.25, 0.22, 0.98], [0.62, 0.22, 0.95],
  ], 0.008, M_WIRE));
  add(tube('harnessJunctionToStarter', [
    [0.62, 0.16, 0.95], [0.45, -0.05, 0.35], [0.38, -0.15, -0.5], [0.35, -0.2, -1.15],
  ], 0.009, M_WIRE));
  add(tube('harnessAlternatorToJunction', [
    [0.35, 0.05, -0.7], [0.15, 0.1, 0.15], [0.35, 0.15, 0.65], [0.62, 0.18, 0.95],
  ], 0.007, M_WIRE));
  add(tube('harnessJunctionToModules', [
    [0.62, 0.16, 0.95], [0.25, 0.1, 0.65], [-0.1, 0.04, 0.4], [-0.4, 0.0, -0.25],
  ], 0.006, M_WIRE));

  return elec;
}
