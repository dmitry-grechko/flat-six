import type { XrayAssembly } from './xray-assemblies';

/**
 * 987 (Boxster/Cayman 2005–2012, calibrated to the 987.2 / 2009 Service
 * Introduction) X-RAY assembly set. Same `XrayAssembly` contract as the 981 —
 * GLBs + parts manifests live under /models/components/987/.
 *
 * Placement values are seeded from the 981 set: the 987 GLBs are built by the
 * same generators (identical native coordinate frames), and the two cars share
 * the mid-engine packaging — engine amidships ahead of the transaxle, twin
 * front radiators, center-exit exhaust. Run
 * `npm run gen:layout -- --gen 987` after any 987 geometry change.
 */
export const XRAY_ASSEMBLIES_987: XrayAssembly[] = [
  // Real 9A1 flat-six model — the 987.2 (2009–2012) shares the 9A1 engine
  // family with the 981; the GLB is a copy of the same downloaded model.
  // Hide the engine model's own coilPacks band in unified (see 981 note) —
  // the plugs overlay's horizontal rod coils are the single depiction there.
  { id: 'engine',    label: 'Engine',           glb: '/models/components/987/engine.glb',    manifest: '/models/components/987/engine-parts.json',    hotspot3d: '0 0.2 -0.8',   displayRadius: 0.70,
    hideInUnified: ['coilPacks'] },
  { id: 'trans',     label: 'Transaxle',         glb: '/models/components/987/trans.glb',     manifest: '/models/components/987/trans-parts.json',     hotspot3d: '0 -0.1 -1.7',  displayRadius: 0.55 },
  { id: 'exhaust',   label: 'Exhaust',           glb: '/models/components/987/exhaust.glb',   manifest: '/models/components/987/exhaust-parts.json',   hotspot3d: '0 -0.55 -1.85', displayRadius: 0.93 },
  { id: 'fbrakes',   label: 'Front Brakes',      glb: '/models/components/987/fbrakes.glb',   manifest: '/models/components/987/fbrakes-parts.json',   hotspot3d: '0 -0.17 1.5',  displayRadius: 0.49, bilateral: true, lateralOffset: 1.15,
    hideInUnified: ['brakeMasterCylinder', 'brakeBooster', 'absHydraulicControlUnit'] },
  { id: 'rbrakes',   label: 'Rear Brakes',       glb: '/models/components/987/rbrakes.glb',   manifest: '/models/components/987/rbrakes-parts.json',   hotspot3d: '0 -0.2 -1.34', displayRadius: 0.46, bilateral: true, lateralOffset: 1.15,
    hideInUnified: ['absPsmHydraulicUnit', 'brakeFluidReservoir'] },
  { id: 'cooling',   label: 'Cooling System',    glb: '/models/components/987/cooling.glb',   manifest: '/models/components/987/cooling-parts.json',   hotspot3d: '0 -0.05 1.45', displayRadius: 0.80 },
  // Car-space on the engine, EXTERNAL service items only (see 981 note): the
  // engine.glb already shows its own pan/pump — hide our duplicates in unified
  // (incl. the 987 sheet-metal panel, a child of oilSump) and keep the filter
  // console / cooler / separator / filler / sensors.
  { id: 'oil',       label: 'Oil & Lubrication', glb: '/models/components/987/oil.glb',       manifest: '/models/components/987/oil-parts.json',       hotspot3d: '0 0.18 -0.78', carSpace: true, worldScale: 0.42,
    hideInUnified: ['oilSump', 'engineOil', 'oilPump', 'oilPipe', 'oilLevelSensor'] },
  { id: 'airfilter', label: 'Air Intake',        glb: '/models/components/987/airfilter.glb', manifest: '/models/components/987/airfilter-parts.json', hotspot3d: '0 0 0', carSpace: true, worldScale: 1 },
  // Car-space on the engine (see 981 note): rod-coil banks at native x ±1.5 →
  // ±0.44 half-embedded in the heads. The 987 module additionally parks the
  // fuel-pressure regulator in the tank zone (SI: in-tank on the 987.2) — hide
  // it in unified alongside the pump/relay/filler-valve tank parts.
  { id: 'plugs',     label: 'Ignition & Fuel',   glb: '/models/components/987/plugs.glb',     manifest: '/models/components/987/plugs-parts.json',     hotspot3d: '0 0.11 -0.8', carSpace: true, worldScale: 0.29,
    hideInUnified: ['lowPressureFuelPump', 'fuelPumpRelay', 'fuelTankFillerNeckCheckValve', 'fuelPressureRegulator'] },
  { id: 'susp',      label: 'Suspension',        glb: '/models/components/987/susp.glb',      manifest: '/models/components/987/susp-parts.json',      hotspot3d: '0 0 0', carSpace: true, worldScale: 0.95 },
  { id: 'elec',      label: 'Electrical',        glb: '/models/components/987/elec.glb',      manifest: '/models/components/987/elec-parts.json',      hotspot3d: '0 0 0', carSpace: true, worldScale: 1 },
  { id: 'driveline', label: 'Driveline',         glb: '/models/components/987/driveline.glb', manifest: '/models/components/987/driveline-parts.json', hotspot3d: '0 0.05 0', carSpace: true, worldScale: 0.95 },
  { id: 'fuel',      label: 'Fuel Tank',         glb: '/models/components/987/fuel.glb',      manifest: '/models/components/987/fuel-parts.json',      hotspot3d: '0 -0.08 0.95', displayRadius: 0.55 },
];
