// Electrical system for the 981. Procedurally builds CAD-style named meshes/groups
// so the app can pin every primary part from elec-parts.json by its `node` name.
//
// Layout (coordinate convention: +Z = front, -Z = rear, +Y = up, +X = right):
//   - Battery (batteryAgm) in the FRONT trunk with two terminal posts.
//   - Alternator + Starter on the engine at the REAR.
//   - Junction/fuse box mid-chassis.
//   - Control modules / instrument cluster / Sport Chrono spread plausibly.
//   - A wiring harness tying battery -> starter/alternator -> modules together.

import { group, box, cyl, torus, tube, sphere, at, rot } from '../lib/primitives.mjs';

// ---- Inline material specs ----
const M_CASE = { color: 0x222428, metalness: 0.2, roughness: 0.7 };     // battery case
const M_POS = { color: 0xc23535, metalness: 0.6, roughness: 0.4 };      // red + terminal
const M_NEG = { color: 0x222222, metalness: 0.6, roughness: 0.4 };      // black - terminal
const M_HOUSING = { color: 0xaab0b6, metalness: 0.9, roughness: 0.4 };  // alternator/starter
const M_MODULE = { color: 0x33414d, metalness: 0.3, roughness: 0.6 };   // control modules
const M_WIRE = { color: 0xb87333, metalness: 0.8, roughness: 0.4 };     // copper wiring
const M_RELAY = { color: 0x4a4d54, metalness: 0.4, roughness: 0.6 };    // relay/fuse box

export const meta = { id: 'elec', label: 'Electrical System', system: 'Electrical', node: 'electrical', hotspot3d: '0 0.2 0' };

export function build() {
  const elec = group('electrical');
  const add = (m) => { elec.add(m); return m; };

  // ---------------------------------------------------------------------------
  // Battery (batteryAgm) — front trunk, two terminal posts on top.
  // ---------------------------------------------------------------------------
  const battery = group('batteryAgm');
  {
    const add2 = (m) => { battery.add(m); return m; };
    add2(at(box('case', 0.7, 0.55, 0.5, M_CASE), 0, 0, 0));
    add2(at(box('lid', 0.72, 0.08, 0.52, M_CASE), 0, 0.31, 0));
    // Red + post (right) and black - post (left), on top of the lid.
    add2(at(cyl('postPositive', 0.06, 0.07, 0.12, M_POS, 16), 0.22, 0.41, 0.16));
    add2(at(cyl('postNegative', 0.06, 0.07, 0.12, M_NEG, 16), -0.22, 0.41, 0.16));
    // Vent / hold-down detail.
    add2(at(box('holdDown', 0.78, 0.05, 0.08, M_RELAY), 0, 0.36, -0.18));
  }
  add(at(battery, 0.0, 0.0, 2.0));

  // ---------------------------------------------------------------------------
  // Alternator (alternator) — rear engine, right side, belt pulley on its face.
  // ---------------------------------------------------------------------------
  const alternator = group('alternator');
  {
    const add2 = (m) => { alternator.add(m); return m; };
    // Body laid on its side: axis along Z so the pulley faces forward.
    add2(rot(cyl('body', 0.28, 0.28, 0.5, M_HOUSING, 28), Math.PI / 2, 0, 0));
    add2(rot(cyl('rearHousing', 0.22, 0.22, 0.16, M_RELAY, 24), Math.PI / 2, 0, 0));
    at(alternator.children[1], 0, 0, -0.33);
    // Belt pulley: small torus on the front face.
    add2(rot(at(torus('pulley', 0.13, 0.05, M_HOUSING, 10, 24), 0, 0, 0.3), Math.PI / 2, 0, 0));
    add2(at(cyl('pulleyHub', 0.05, 0.05, 0.12, M_HOUSING, 16), 0, 0, 0.33));
    rot(alternator.children[3], Math.PI / 2, 0, 0);
  }
  add(at(alternator, 0.4, 0.1, -1.0));

  // ---------------------------------------------------------------------------
  // Starter motor (starterMotor) — rear, low on bellhousing, solenoid on top.
  // ---------------------------------------------------------------------------
  const starter = group('starterMotor');
  {
    const add2 = (m) => { starter.add(m); return m; };
    add2(rot(cyl('body', 0.2, 0.2, 0.42, M_HOUSING, 24), Math.PI / 2, 0, 0));
    // Pinion nose toward the flywheel (front of this part).
    add2(at(cyl('pinion', 0.08, 0.08, 0.16, M_HOUSING, 16), 0, 0, 0.28));
    rot(starter.children[1], Math.PI / 2, 0, 0);
    // Solenoid cylinder on top.
    add2(rot(at(cyl('solenoid', 0.1, 0.1, 0.3, M_RELAY, 20), 0, 0.22, 0.02), Math.PI / 2, 0, 0));
  }
  add(at(starter, -0.4, -0.25, -1.2));

  // ---------------------------------------------------------------------------
  // Junction box / fuse boxes (junctionBox) — flat box mid-chassis.
  // ---------------------------------------------------------------------------
  const junction = group('junctionBox');
  {
    const add2 = (m) => { junction.add(m); return m; };
    add2(at(box('housing', 0.6, 0.22, 0.4, M_RELAY), 0, 0, 0));
    add2(at(box('lid', 0.62, 0.06, 0.42, M_CASE), 0, 0.14, 0));
    // A couple of relay blocks + a maxi-fuse bar.
    add2(at(box('relayBlockA', 0.12, 0.1, 0.12, M_MODULE), -0.16, 0.2, 0.08));
    add2(at(box('relayBlockB', 0.12, 0.1, 0.12, M_MODULE), 0.0, 0.2, 0.08));
    add2(at(box('maxiFuse', 0.36, 0.06, 0.1, M_POS), 0.05, 0.2, -0.1));
  }
  add(at(junction, -0.55, 0.05, 0.4));

  // ---------------------------------------------------------------------------
  // Control modules — flat boxes placed plausibly.
  // ---------------------------------------------------------------------------
  // PSM module (psmModule) — chassis electronics, mid/rear.
  const psm = group('psmModule');
  {
    const add2 = (m) => { psm.add(m); return m; };
    add2(at(box('housing', 0.34, 0.1, 0.26, M_MODULE), 0, 0, 0));
    add2(at(box('connector', 0.1, 0.08, 0.04, M_RELAY), 0.12, 0, 0.15));
  }
  add(at(psm, 0.5, 0.0, -0.3));

  // BCM front (bcmFront) — front body control module, ahead of cabin.
  const bcm = group('bcmFront');
  {
    const add2 = (m) => { bcm.add(m); return m; };
    add2(at(box('housing', 0.32, 0.1, 0.24, M_MODULE), 0, 0, 0));
    add2(at(box('connector', 0.1, 0.08, 0.04, M_RELAY), -0.12, 0, 0.13));
  }
  add(at(bcm, -0.45, 0.0, 1.1));

  // Instrument cluster / combi-instrument (combiInstrument) — cabin center, dash.
  const combi = group('combiInstrument');
  {
    const add2 = (m) => { combi.add(m); return m; };
    add2(rot(box('housing', 0.5, 0.26, 0.18, M_CASE), -0.2, 0, 0));
    // Three gauge faces.
    for (let i = 0; i < 3; i++) {
      add2(rot(at(cyl(`gauge_${i}`, 0.09, 0.09, 0.03, M_MODULE, 20), (i - 1) * 0.15, 0.0, 0.1), Math.PI / 2 - 0.2, 0, 0));
    }
  }
  add(at(combi, 0.0, 0.55, 0.6));

  // Sport Chrono module (sportChronoModule) — small box, chassis electronics.
  const chronoMod = group('sportChronoModule');
  {
    const add2 = (m) => { chronoMod.add(m); return m; };
    add2(at(box('housing', 0.2, 0.07, 0.16, M_MODULE), 0, 0, 0));
    add2(at(box('connector', 0.06, 0.05, 0.03, M_RELAY), 0.08, 0, 0.09));
  }
  add(at(chronoMod, 0.3, 0.0, 0.55));

  // Sport Chrono drive-mode switch (sportChronoSwitch) — small rotary, console.
  const chronoSwitch = group('sportChronoSwitch');
  {
    const add2 = (m) => { chronoSwitch.add(m); return m; };
    add2(at(cyl('base', 0.07, 0.08, 0.04, M_CASE, 20), 0, 0, 0));
    add2(at(cyl('knob', 0.05, 0.06, 0.05, M_MODULE, 20), 0, 0.04, 0));
    add2(at(sphere('detent', 0.012, M_POS, 10), 0, 0.06, 0.04));
  }
  add(at(chronoSwitch, 0.15, 0.5, 0.45));

  // ---------------------------------------------------------------------------
  // Wiring harness — thin tube runs tying the system together (sub detail).
  // ---------------------------------------------------------------------------
  // Battery (+) -> junction box.
  add(tube('harnessBatteryToJunction', [
    [0.22, 0.45, 2.0], [0.0, 0.3, 1.2], [-0.4, 0.2, 0.6], [-0.55, 0.2, 0.4],
  ], 0.02, M_WIRE));
  // Junction box -> starter motor (heavy starter feed).
  add(tube('harnessJunctionToStarter', [
    [-0.55, 0.15, 0.4], [-0.5, -0.1, -0.3], [-0.45, -0.2, -0.9], [-0.4, -0.25, -1.2],
  ], 0.022, M_WIRE));
  // Alternator -> junction box (charge line).
  add(tube('harnessAlternatorToJunction', [
    [0.4, 0.1, -0.7], [0.2, 0.1, -0.1], [-0.2, 0.15, 0.3], [-0.55, 0.15, 0.4],
  ], 0.018, M_WIRE));
  // Junction box -> control modules signal bundle.
  add(tube('harnessJunctionToModules', [
    [-0.55, 0.1, 0.4], [0.0, 0.05, 0.5], [0.3, 0.0, 0.55], [0.5, 0.0, -0.3],
  ], 0.014, M_WIRE));

  return elec;
}
