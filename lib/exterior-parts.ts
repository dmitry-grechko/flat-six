import type { BodyType, EnginePart, SystemName } from './types';
import { getVariant } from './models';

/**
 * Exterior-view hotspots for the Component Explorer 3D mode (X-RAY off).
 *
 * Pins use `hotspotNorm` — fractions of the model AABB half-extents from its
 * center (−1…1-ish) — so the same layout works across differently scaled GLBs.
 * Optional `node` names are used for highlight when the mesh exists (981 Boxster).
 *
 * Content is service-manual inspired: outer panels, lamps, lids, wheels — not
 * the deep mechanical cutaways covered by X-RAY / FRONT / ENGINE.
 */

type ExteriorDef = Omit<EnginePart, 'system'> & {
  system: SystemName;
  /** Generations this pin applies to. */
  generations: Array<'981' | '987'>;
  /** Body styles; omit = both boxster and cayman. Soft-top only on boxster. */
  bodyStyles?: Array<'boxster' | 'cayman' | 'sedan'>;
};

const EXTERIOR_DEFS: ExteriorDef[] = [
  {
    id: 'ext-hood',
    node: 'SM_Hood_0000.003',
    label: 'Front Lid (Frunk)',
    assembly: 'Body',
    system: 'Body',
    partNumber: '981.511.011',
    function:
      'Front luggage lid over the frunk. Houses the battery access panel, cabin-filter cover, and washer reservoir neck. Check gas struts and latch microswitch if the lid fails to stay open or the alarm complains.',
    componentId: 'battery',
    hotspotNorm: '0 0.35 0.62',
    generations: ['981', '987'],
  },
  {
    id: 'ext-front-bumper',
    node: 'SM_FrontKit_0000.003',
    label: 'Front Bumper & Radiator Inlets',
    assembly: 'Body',
    system: 'Cooling',
    partNumber: '981.505.111',
    function:
      'Front fascia with the twin radiator air inlets and fog/DRL housings. Keep the inlet screens clear of leaves — clogged fins are the usual cause of high coolant temps in traffic.',
    componentId: 'cooling',
    hotspotNorm: '0 0.05 0.85',
    generations: ['981', '987'],
  },
  {
    id: 'ext-headlamp-l',
    node: 'SM_FrontKit_0000.003',
    label: 'Headlamp (Left)',
    assembly: 'Lighting',
    system: 'Electrical',
    partNumber: '981.631.063',
    function:
      'Projector headlamp unit. Condensation usually clears after a drive; persistent moisture means a failed vent or seal. Aiming screws sit behind the frunk side liners.',
    hotspotNorm: '0.55 0.2 0.78',
    generations: ['981', '987'],
  },
  {
    id: 'ext-headlamp-r',
    node: 'SM_FrontKit_0000.003',
    label: 'Headlamp (Right)',
    assembly: 'Lighting',
    system: 'Electrical',
    partNumber: '981.631.064',
    function:
      'Projector headlamp unit (passenger side). Same condensation and aiming notes as the left lamp.',
    hotspotNorm: '-0.55 0.2 0.78',
    generations: ['981', '987'],
  },
  {
    id: 'ext-door-mirror-l',
    node: '',
    label: 'Door Mirror (Left)',
    assembly: 'Body',
    system: 'Body',
    partNumber: '981.731.015',
    function:
      'Power-fold door mirror. Check the glass heater and puddle lamp; loose glass is usually the clip behind the mirror face, not the whole housing.',
    hotspotNorm: '0.72 0.45 0.15',
    generations: ['981', '987'],
  },
  {
    id: 'ext-door-mirror-r',
    node: '',
    label: 'Door Mirror (Right)',
    assembly: 'Body',
    system: 'Body',
    partNumber: '981.731.016',
    function:
      'Power-fold door mirror (passenger side). Same heater / puddle-lamp service notes as the left.',
    hotspotNorm: '-0.72 0.45 0.15',
    generations: ['981', '987'],
  },
  {
    id: 'ext-side-intake-l',
    node: 'SM_Base_0000.003',
    label: 'Side Air Intake (Left)',
    assembly: 'Body',
    system: 'Engine',
    partNumber: null,
    function:
      'Body-side intake scoop feeding the mid-engine airbox. Keep the grille free of debris; on track cars inspect the duct foam seals for collapse.',
    componentId: 'airfilter',
    // Black plastic scoop on the rear quarter, behind the door trailing edge.
    hotspotNorm: '0.92 -0.05 -0.38',
    generations: ['981', '987'],
  },
  {
    id: 'ext-side-intake-r',
    node: 'SM_Base_0000.003',
    label: 'Side Air Intake (Right)',
    assembly: 'Body',
    system: 'Engine',
    partNumber: null,
    function:
      'Body-side intake scoop (passenger side). Same duct and grille notes as the left scoop.',
    componentId: 'airfilter',
    hotspotNorm: '-0.92 -0.05 -0.38',
    generations: ['981', '987'],
  },
  {
    id: 'ext-soft-top',
    node: 'SM_SoftTop_0000.001',
    label: 'Soft Top & Frame',
    assembly: 'Convertible',
    system: 'Body',
    partNumber: '981.561.015',
    function:
      'Electro-hydraulic convertible top. Stalls are usually low Pentosin, a sticky latch microswitch, or blocked windscreen drains. Lube the guide rails yearly.',
    componentId: 'top',
    hotspotNorm: '0 0.75 -0.2',
    generations: ['981'],
    bodyStyles: ['boxster'],
  },
  {
    id: 'ext-roof',
    node: '',
    label: 'Roof Panel & Glass',
    assembly: 'Body',
    system: 'Body',
    partNumber: null,
    function:
      'Fixed coupe roof (Cayman). Check the rear window heater grid and the roof-to-glass seal for wind noise; sunroof cars need drain-tube clearing each autumn.',
    hotspotNorm: '0 0.85 -0.05',
    generations: ['981', '987'],
    bodyStyles: ['cayman'],
  },
  {
    id: 'ext-rear-lid',
    node: 'SM_RearKit_0000.003',
    label: 'Engine Cover / Rear Lid',
    assembly: 'Body',
    system: 'Engine',
    partNumber: '981.512.011',
    function:
      'Rear lid over the mid-engine bay. Access for air filter, coils, oil filler, and coolant tank. Confirm both gas struts hold the lid and the latch releases cleanly from the cabin switch.',
    componentId: 'airfilter',
    hotspotNorm: '0 0.55 -0.55',
    generations: ['981', '987'],
  },
  {
    id: 'ext-tail-lamp-l',
    node: 'SM_RearKit_0000.003',
    label: 'Tail Lamp (Left)',
    assembly: 'Lighting',
    system: 'Electrical',
    partNumber: '981.631.411',
    function:
      'LED tail-lamp cluster. Water ingress shows as fogging; the connector sits behind the luggage-side trim. Replace as a sealed unit.',
    hotspotNorm: '0.55 0.35 -0.88',
    generations: ['981', '987'],
  },
  {
    id: 'ext-tail-lamp-r',
    node: 'SM_RearKit_0000.003',
    label: 'Tail Lamp (Right)',
    assembly: 'Lighting',
    system: 'Electrical',
    partNumber: '981.631.412',
    function:
      'LED tail-lamp cluster (passenger side). Same water-ingress and connector notes as the left.',
    hotspotNorm: '-0.55 0.35 -0.88',
    generations: ['981', '987'],
  },
  {
    id: 'ext-exhaust-tips',
    node: '',
    label: 'Exhaust Tips & Diffuser',
    assembly: 'Exhaust',
    system: 'Exhaust',
    partNumber: '981.111.025',
    function:
      'Rear muffler tips and lower diffuser. Inspect hangers and heat shields; PSE cars should hear the valve open/close with Sport mode.',
    componentId: 'exhaust',
    // Tips sit in the lower diffuser, below the license-plate panel.
    hotspotNorm: '0 -0.72 -0.98',
    generations: ['981', '987'],
  },
  {
    id: 'ext-wheel-fl',
    node: 'SM_Brake_FL_0000_Morph001_BD_HR_R.003',
    label: 'Front Wheel & Tyre (Left)',
    assembly: 'Wheels',
    system: 'Wheels',
    partNumber: null,
    function:
      'Front-left wheel, tyre, and TPMS. Check cold pressures, inner-edge camber wear, and torque wheel bolts to 130 Nm in a star pattern.',
    componentId: 'wheels',
    hotspotNorm: '0.85 0 0.45',
    generations: ['981', '987'],
  },
  {
    id: 'ext-wheel-fr',
    node: 'SM_Brake_FR_0000_Morph001_BD_HR_R.003',
    label: 'Front Wheel & Tyre (Right)',
    assembly: 'Wheels',
    system: 'Wheels',
    partNumber: null,
    function:
      'Front-right wheel, tyre, and TPMS. Same pressure and torque notes as the left front.',
    componentId: 'wheels',
    hotspotNorm: '-0.85 0 0.45',
    generations: ['981', '987'],
  },
  {
    id: 'ext-wheel-rl',
    node: 'SM_Brake_RL_0000_Morph002_BD_W_F.003',
    label: 'Rear Wheel & Tyre (Left)',
    assembly: 'Wheels',
    system: 'Wheels',
    partNumber: null,
    function:
      'Rear-left wheel and tyre. Square setups do not cross-rotate; watch inner-edge wear from negative camber.',
    componentId: 'wheels',
    hotspotNorm: '0.85 0 -0.55',
    generations: ['981', '987'],
  },
  {
    id: 'ext-wheel-rr',
    node: 'SM_Brake_RR_0000_Morph002_BD_W_F.002',
    label: 'Rear Wheel & Tyre (Right)',
    assembly: 'Wheels',
    system: 'Wheels',
    partNumber: null,
    function:
      'Rear-right wheel and tyre. Same camber-wear and TPMS notes as the left rear.',
    componentId: 'wheels',
    hotspotNorm: '-0.85 0 -0.55',
    generations: ['981', '987'],
  },
  {
    id: 'ext-windscreen',
    node: '',
    label: 'Windscreen & Washer Jets',
    assembly: 'Body',
    system: 'Body',
    partNumber: null,
    function:
      'Laminated windscreen with rain sensor and washer jets. Top-of-screen drains clog easily on Boxsters — clear them to stop water into the cabin / top mechanism.',
    componentId: 'top',
    hotspotNorm: '0 0.7 0.35',
    generations: ['981', '987'],
  },
  {
    id: 'ext-fuel-filler',
    node: '',
    label: 'Fuel Filler Door',
    assembly: 'Fuel',
    system: 'Fuel',
    partNumber: null,
    function:
      'Fuel filler flap on the right front wing. Cap seal cracks cause EVAP codes; the flap release is electric from the cabin switch.',
    componentId: 'fuel',
    hotspotNorm: '-0.9 0.35 0.35',
    generations: ['981', '987'],
  },
];

export function exteriorPartsFor(body: BodyType): EnginePart[] {
  const variant = getVariant(body);
  // Match the vehicle's ACTUAL generation — never collapse to 981. EXTERIOR_DEFS
  // only cover Porsche 981/987, so any other generation (e.g. a non-Porsche
  // marque like audi-b9) correctly matches nothing and returns [] — no Porsche
  // pins leak onto it.
  return EXTERIOR_DEFS.filter((d) => {
    if (!d.generations.includes(variant.generation as '981' | '987')) return false;
    if (d.bodyStyles && !d.bodyStyles.includes(variant.bodyStyle)) return false;
    return true;
  }).map(({ generations: _g, bodyStyles: _b, ...part }) => part);
}

/** Systems that appear in the exterior parts list (for sidebar chip counts). */
export function exteriorSystemsFor(body: BodyType): SystemName[] {
  const systems = new Set<SystemName>();
  for (const p of exteriorPartsFor(body)) systems.add(p.system);
  return Array.from(systems);
}
