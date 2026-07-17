import type {
  Component, Fault, ServiceRecord, Vehicle, PaintColor,
  McpTool, RagSource, SystemName,
} from './types';
import { COMPONENTS_987 } from './data-987';

export const SYSTEMS: (SystemName | 'All')[] = [
  'All', 'Engine', 'Brakes', 'Cooling', 'Transmission', 'HVAC',
  'Electrical', 'Fuel', 'Steering', 'Exhaust', 'Wheels', 'Body',
];

export const VEHICLE: Vehicle = {
  body: 'boxster',
  vin: 'WP0CA2A89ES123456',
  model: 'Boxster S (981)',
  year: '2014',
  engine: '3.4 L Flat-Six (S)',
  trans: '7-Speed PDK',
  mileage: '42500',
  colorName: 'GT Silver Metallic',
  colorHex: '#C6C8CA',
  interiorHex: '#6E1518',
  plate: 'YT14 BXS',
};

// Factory paint offered on the 981 & 987 Boxster/Cayman (2005–2016). Swatch hexes
// are display approximations, not paint-match values. Shared across models — the
// picker is not generation-filtered today.
export const COLORS: PaintColor[] = [
  // Whites / silvers / greys
  { name: 'CARRARA WHITE', hex: '#E8E8EA' }, { name: 'CLASSIC SILVER', hex: '#BFC3C6' },
  { name: 'ARCTIC SILVER', hex: '#C6C9CC' }, { name: 'GT SILVER', hex: '#C6C8CA' },
  { name: 'PLATINUM SILVER', hex: '#B4B7BA' }, { name: 'RHODIUM SILVER', hex: '#97999C' },
  { name: 'METEOR GREY', hex: '#45484B' }, { name: 'AGATE GREY', hex: '#5B5F63' },
  // Blacks
  { name: 'JET BLACK', hex: '#131316' }, { name: 'BASALT BLACK', hex: '#1B1C1E' },
  // Blues
  { name: 'AQUA BLUE', hex: '#5E97A8' }, { name: 'SAPPHIRE BLUE', hex: '#27364E' },
  { name: 'COBALT BLUE', hex: '#22417C' }, { name: 'MIDNIGHT BLUE', hex: '#1E2A44' },
  // Reds
  { name: 'GUARDS RED', hex: '#D5001C' }, { name: 'CARMINE RED', hex: '#97011F' },
  // Carmona Red Metallic (M3W / E4) — wine metallic; display approx, not paint-match
  { name: 'CARMONA RED METALLIC', hex: '#6B1A28' },
  { name: 'AMARANTH', hex: '#7A2230' },
  // Yellows / greens / earth
  { name: 'RACING YELLOW', hex: '#EFC03B' }, { name: 'SPEED YELLOW', hex: '#F5C400' },
  { name: 'MALACHITE GREEN', hex: '#2E4A3B' }, { name: 'LIME GOLD', hex: '#7F8447' },
  { name: 'MACADAMIA', hex: '#B7A98B' }, { name: 'NORDIC GOLD', hex: '#96865F' },
  { name: 'MAHOGANY', hex: '#3C2B25' },
];

// Factory paint offered on the Audi A4 (B9, 2016–2019 — 2017 MY). Swatch hexes are
// display approximations, not paint-match values (as with COLORS). Kept separate
// from the Porsche palette so each marque shows its own colours (see colorsFor).
export const COLORS_AUDI_B9: PaintColor[] = [
  // Whites / silvers / greys
  { name: 'IBIS WHITE', hex: '#EDEEEC' }, { name: 'GLACIER WHITE METALLIC', hex: '#DFE3E4' },
  { name: 'FLORETT SILVER METALLIC', hex: '#A7ACB0' }, { name: 'MONSOON GREY METALLIC', hex: '#565B60' },
  { name: 'MANHATTAN GREY METALLIC', hex: '#3C4145' }, { name: 'DAYTONA GREY PEARL', hex: '#494D51' },
  // Blacks
  { name: 'BRILLIANT BLACK', hex: '#0E0E10' }, { name: 'MYTHOS BLACK METALLIC', hex: '#191A1C' },
  // Blues
  { name: 'ARA BLUE CRYSTAL', hex: '#16467E' }, { name: 'SCUBA BLUE METALLIC', hex: '#2C5F86' },
  { name: 'NAVARRA BLUE METALLIC', hex: '#23375F' },
  // Reds / greens
  { name: 'MATADOR RED METALLIC', hex: '#6E1622' }, { name: 'TANGO RED METALLIC', hex: '#B01B1B' },
  { name: 'GOTLAND GREEN METALLIC', hex: '#2E4A40' },
];

// Factory paint offered on the 911 (991, 2011–2019) — a far wider range than the
// Boxster/Cayman, incl. the GT/special colours. Swatch hexes are display
// approximations, not paint-match values. Kept separate so the 911 shows its own
// palette (see colorsFor). Standard + metallic + special/GT groups.
export const COLORS_991: PaintColor[] = [
  // Whites / silvers / greys
  { name: 'CARRARA WHITE METALLIC', hex: '#E9EAEC' }, { name: 'WHITE', hex: '#E8E8EA' },
  { name: 'GT SILVER METALLIC', hex: '#C6C8CA' }, { name: 'RHODIUM SILVER METALLIC', hex: '#97999C' },
  { name: 'PLATINUM SILVER METALLIC', hex: '#B4B7BA' }, { name: 'AGATE GREY METALLIC', hex: '#45484B' },
  { name: 'CHALK', hex: '#C7C6BE' }, { name: 'CRAYON', hex: '#B8BBBD' },
  // Blacks
  { name: 'BLACK', hex: '#131316' }, { name: 'JET BLACK METALLIC', hex: '#17181A' },
  { name: 'BASALT BLACK METALLIC', hex: '#1B1C1E' },
  // Blues
  { name: 'SAPPHIRE BLUE METALLIC', hex: '#27364E' }, { name: 'DARK BLUE METALLIC', hex: '#1E2A44' },
  { name: 'NIGHT BLUE METALLIC', hex: '#1B2740' }, { name: 'GRAPHITE BLUE METALLIC', hex: '#2B3A4A' },
  { name: 'GENTIAN BLUE METALLIC', hex: '#1F3A6E' }, { name: 'MIAMI BLUE', hex: '#00A0C6' },
  // Reds
  { name: 'GUARDS RED', hex: '#D5001C' }, { name: 'CARMINE RED', hex: '#97011F' },
  { name: 'LAVA ORANGE', hex: '#E5501F' },
  // Yellows / greens
  { name: 'RACING YELLOW', hex: '#EFC03B' }, { name: 'AVENTURINE GREEN METALLIC', hex: '#2E4A3B' },
  { name: 'LIZARD GREEN', hex: '#7FA01E' }, { name: 'PYTHON GREEN', hex: '#6E7B2E' },
  // Earth / special
  { name: 'MAHOGANY METALLIC', hex: '#3C2B25' }, { name: 'COGNAC METALLIC', hex: '#7A4B29' },
  { name: 'ULTRAVIOLET', hex: '#5B4B8A' },
];

// Factory paint offered on the 718 (982, 2016–2024) Boxster/Cayman — its own
// era's palette (incl. the GTS/GT4/RS special colours) rather than the 981/987
// range. Swatch hexes are display approximations, not paint-match values. Kept
// separate so the 718 shows its own colours (see colorsFor).
export const COLORS_982: PaintColor[] = [
  // Whites / silvers / greys
  { name: 'WHITE', hex: '#E8E8EA' }, { name: 'CARRARA WHITE METALLIC', hex: '#E9EAEC' },
  { name: 'GT SILVER METALLIC', hex: '#C6C8CA' }, { name: 'DOLOMITE SILVER METALLIC', hex: '#B9BDC0' },
  { name: 'CRAYON', hex: '#B8BBBD' }, { name: 'CHALK', hex: '#C7C6BE' },
  { name: 'AGATE GREY METALLIC', hex: '#45484B' },
  // Blacks
  { name: 'BLACK', hex: '#131316' }, { name: 'JET BLACK METALLIC', hex: '#17181A' },
  // Blues
  { name: 'SAPPHIRE BLUE METALLIC', hex: '#27364E' }, { name: 'NIGHT BLUE METALLIC', hex: '#1B2740' },
  { name: 'GRAPHITE BLUE METALLIC', hex: '#2B3A4A' }, { name: 'GENTIAN BLUE METALLIC', hex: '#1F3A6E' },
  { name: 'MIAMI BLUE', hex: '#00A0C6' }, { name: 'SHARK BLUE', hex: '#1E7FB0' },
  { name: 'GULF BLUE', hex: '#4FA6C4' },
  // Reds
  { name: 'GUARDS RED', hex: '#D5001C' }, { name: 'CARMINE RED', hex: '#97011F' },
  { name: 'BORDEAUX RED METALLIC', hex: '#5C1A2A' }, { name: 'LAVA ORANGE', hex: '#E5501F' },
  // Yellows / greens
  { name: 'RACING YELLOW', hex: '#EFC03B' }, { name: 'SPEED YELLOW', hex: '#F5C400' },
  { name: 'PYTHON GREEN', hex: '#6E7B2E' }, { name: 'LIZARD GREEN', hex: '#7FA01E' },
];

// Per-generation paint registry. Porsche 981/987 share the base COLORS palette;
// the 718 (982) and 911 (991) each have their own; other marques register their
// own here. Unknown → COLORS.
const GENERATION_COLORS: Record<string, PaintColor[]> = {
  'audi-b9': COLORS_AUDI_B9,
  '982': COLORS_982,
  '991': COLORS_991,
};

// Preserve the historical Porsche seed colour (GT Silver) for cars with no marque
// palette, so new-vehicle defaults are unchanged for the 981/987.
const DEFAULT_COLOR_PORSCHE: PaintColor = { name: 'GT SILVER', hex: '#C6C8CA' };

/** Paint options for a generation (the Porsche COLORS palette unless a marque overrides). */
export function colorsFor(generation: string): PaintColor[] {
  return GENERATION_COLORS[generation] ?? COLORS;
}

/** Seed paint for a new vehicle of this generation (first of a marque palette; GT Silver for Porsche). */
export function defaultColor(generation: string): PaintColor {
  return GENERATION_COLORS[generation]?.[0] ?? DEFAULT_COLOR_PORSCHE;
}

// Engine + transmission options are GENERATION-SPECIFIC:
//  • 981 (2012–2016): 2.7 / 3.4 S / 3.4 GTS / 3.8 Spyder-GT4; manual or PDK (never Tiptronic).
//  • 987 (2005–2012): 2.7 (987.1) / 2.9 (987.2) / 3.4 S; manual, 5-spd Tiptronic S (987.1)
//    or 7-spd PDK (987.2, which replaced Tiptronic). PDK did NOT exist before 2009.
export const ENGINES_981 = ['2.7 L Flat-Six', '3.4 L Flat-Six (S)', '3.4 L Flat-Six (GTS)', '3.8 L Flat-Six (Spyder/GT4)'];
export const ENGINES_987 = ['2.7 L Flat-Six', '2.9 L Flat-Six', '3.4 L Flat-Six (S)'];
export const TRANS_981 = ['6-Speed Manual', '7-Speed PDK'];
export const TRANS_987 = ['5-Speed Manual', '6-Speed Manual', '5-Speed Tiptronic S', '7-Speed PDK'];

// 911 (991): 991.1 is NA (3.4 Carrera / 3.8 S·GTS / 3.8 GT3 / 4.0 GT3 RS·R);
//  991.2 Carreras are 3.0 twin-turbo; Turbo/S + GT2 RS are 3.8 twin-turbo; GT3/RS,
//  Touring, Speedster are 4.0 NA. Manual (7- or 6-spd) or PDK by trim. Engine ids
//  MUST match lib/models.ts ENG (per-variant defaults reference these strings).
export const ENGINES_991 = [
  '3.4 L Flat-Six (Carrera)',
  '3.8 L Flat-Six (Carrera S/GTS)',
  '3.0 L Twin-Turbo Flat-Six (Carrera)',
  '3.0 L Twin-Turbo Flat-Six (Carrera S/GTS)',
  '3.8 L Flat-Six (GT3)',
  '4.0 L Flat-Six (GT3/RS)',
  '3.8 L Twin-Turbo Flat-Six (Turbo/S)',
  '3.8 L Twin-Turbo Flat-Six (GT2 RS)',
];
export const TRANS_991 = ['7-Speed Manual', '6-Speed Manual', '7-Speed PDK'];

// 718 (982): the base/T run a 2.0 turbo flat-four; S/GTS a 2.5 turbo flat-four;
//  the GTS 4.0 / GT4 / Spyder / GT4 RS / Spyder RS run the NA 4.0 flat-six (three
//  states of tune — GTS 4.0 ~394 hp, GT4/Spyder ~414 hp, RS ~493 hp). 6-speed
//  manual or 7-speed PDK across the range; the GT4 RS / Spyder RS are PDK-only.
//  Engine ids MUST match lib/models.ts (per-variant defaults reference these strings).
export const ENGINES_982 = [
  '2.0 L Turbo Flat-Four',
  '2.5 L Turbo Flat-Four (S/GTS)',
  '4.0 L Flat-Six (GTS 4.0)',
  '4.0 L Flat-Six (GT4/Spyder)',
  '4.0 L Flat-Six (GT4 RS/Spyder RS)',
];
export const TRANS_982 = ['6-Speed Manual', '7-Speed PDK'];

// Back-compat aliases (default to the 981 sets).
export const ENGINES = ENGINES_981;
export const TRANS = TRANS_981;

/** Fallback generation for unknown / legacy vehicle bodies. */
export const DEFAULT_GENERATION = '981';

/** The powertrain (option lists + seed defaults) for one generation. */
export interface GenerationPowertrain {
  engines: string[];
  transmissions: string[];
  /** Seed engine for a new vehicle of this generation (an "S" everywhere today). */
  defaultEngine: string;
  /** Seed transmission — 981 → PDK; 987 → manual (valid across 987.1 + 987.2). */
  defaultTransmission: string;
}

// Per-generation powertrain registry — the single place to register a
// generation's engine/transmission options. Mirrors GENERATION_KB in
// lib/knowledge and the cutaway registry in lib/credits. Unknown generations
// fall back to DEFAULT_GENERATION, so legacy vehicles and not-yet-populated
// generations still get a valid option list. (Per-VARIANT signature powertrains
// — e.g. the GT4's manual-only 3.8 — live on CarVariant in lib/models and are
// applied by callers as `variant.defaultEngine ?? defaultEngine(gen)`.)
const GENERATION_POWERTRAIN: Record<string, GenerationPowertrain> = {
  '981': { engines: ENGINES_981, transmissions: TRANS_981, defaultEngine: '3.4 L Flat-Six (S)', defaultTransmission: '7-Speed PDK' },
  '987': { engines: ENGINES_987, transmissions: TRANS_987, defaultEngine: '3.4 L Flat-Six (S)', defaultTransmission: '6-Speed Manual' },
  // 718 (982) — seed defaults to a base 2.0 turbo / PDK; each trim carries its own
  // signature powertrain via CarVariant.defaultEngine/defaultTransmission.
  '982': { engines: ENGINES_982, transmissions: TRANS_982, defaultEngine: '2.0 L Turbo Flat-Four', defaultTransmission: '7-Speed PDK' },
  // 911 (991) — seed defaults to a 991.1 Carrera S/PDK; each trim carries its own
  // signature powertrain via CarVariant.defaultEngine/defaultTransmission.
  '991': { engines: ENGINES_991, transmissions: TRANS_991, defaultEngine: '3.8 L Flat-Six (Carrera S/GTS)', defaultTransmission: '7-Speed PDK' },
  // Audi A4 (B9) — DEV scaffold; provisional powertrain (confirm before relying).
  'audi-b9': { engines: ['2.0 TFSI'], transmissions: ['7-Speed S tronic (DSG)'], defaultEngine: '2.0 TFSI', defaultTransmission: '7-Speed S tronic (DSG)' },
};

function powertrain(generation: string): GenerationPowertrain {
  return GENERATION_POWERTRAIN[generation] ?? GENERATION_POWERTRAIN[DEFAULT_GENERATION];
}

export function enginesFor(generation: string): string[] {
  return powertrain(generation).engines;
}
export function transmissionsFor(generation: string): string[] {
  return powertrain(generation).transmissions;
}
export function defaultEngine(generation: string): string {
  return powertrain(generation).defaultEngine;
}
export function defaultTransmission(generation: string): string {
  return powertrain(generation).defaultTransmission;
}

// view/ix/iy come from the mockup's VIEWMAP (hotspot positions on the 2D cutaways).
export const COMPONENTS: Component[] = [
  { id: 'cooling', label: 'Front Radiators & Condenser', sub: 'Cooling system', system: 'Cooling', diff: 2, time: '~40 min',
    part: 'Radiators 991.106.131.03 (L) / 991.106.132.03 (R) · centre 991.106.138.02', spec: 'G40 coolant (pink) · ~22 L system', interval: 'Coolant 4 yr · inspect yearly', torque: 'Hose clamp 4 Nm',
    notes: 'Twin radiators sit behind the front bumper with the A/C condenser. They clog with debris — check fins and drains each spring.',
    steps: ['Lift front, remove underbody tray', 'Inspect fins for leaves/stone damage', 'Pressure-test system to 1.5 bar', 'Check expansion tank level cold', 'Refit tray to 9 Nm'],
    view: 'front', ix: 14, iy: 54 },
  { id: 'battery', label: 'Auxiliary Battery', sub: 'Electrical · front trunk', system: 'Electrical', diff: 1, time: '~20 min',
    part: 'AGM 12 V 70 Ah (PN 999.611.070.12)', spec: 'Located under frunk floor panel', interval: 'Replace 4–6 yr', torque: 'Terminal clamp 6 Nm',
    notes: 'Use a memory-saver before disconnect to keep convenience settings. Negative off first, positive on first.',
    steps: ['Open frunk, lift floor panel', 'Connect memory saver to OBD', 'Disconnect negative then positive', 'Swap battery, refit clamps to 6 Nm', 'Re-register battery if AGM type'],
    view: 'front', ix: 19, iy: 41 },
  { id: 'fbrakes', label: 'Front Brakes', sub: 'Pads · discs · fluid', system: 'Brakes', diff: 3, time: '~90 min',
    part: 'Pads 981.351.939.00 · discs 981.351.401.01 (L) / 981.351.402.01 (R) · S pads 991.351.939.00', spec: '315 mm discs (S) · 4-pot fixed caliper', interval: 'Inspect yearly · fluid 2 yr', torque: 'Wheel bolts 160 Nm · caliper 85 Nm',
    notes: 'Wear sensor on the front left. Keep the dust boot clean and lube guide pins. Bed pads in over 200 miles.',
    steps: ['Loosen wheel bolts, lift & support', 'Remove wheel, retaining clip & pins', 'Lever pistons back, fit new pads', 'Reset wear sensor if triggered', 'Torque wheel bolts to 160 Nm in star'],
    view: 'front', ix: 21, iy: 66 },
  { id: 'steering', label: 'Electromechanical Steering', sub: 'EPS rack & track rods', system: 'Steering', diff: 4, time: 'shop',
    part: 'Track rod end 991.347.131.00 · inner tie rod 991.347.322.00', spec: 'Electric assist — no hydraulic fluid', interval: 'Inspect boots & ends yearly', torque: 'Track rod end 100 Nm',
    notes: 'No fluid to service. Watch for split rack boots and play in the track-rod ends; alignment after any rod work.',
    steps: ['Inspect rack boots for splits/grease', 'Check track-rod end play by hand', 'Verify steering-angle sensor codes', 'Replace ends in pairs if worn', 'Four-wheel alignment after'],
    view: 'front', ix: 25, iy: 56 },
  { id: 'cabinfilter', label: 'Cabin / Pollen Filter', sub: 'HVAC intake', system: 'HVAC', diff: 1, time: '~15 min',
    part: 'PN 9P1.819.631 (carbon)', spec: 'Activated-carbon element', interval: 'Yearly / 20k mi', torque: 'n/a — clip-in',
    notes: 'Behind the frunk firewall cover. A clogged filter is the #1 cause of weak airflow and musty A/C.',
    steps: ['Open frunk, remove firewall trim', 'Release filter cover clips', 'Slide out old element (note airflow arrow)', 'Vacuum housing', 'Fit new filter, refit cover'],
    view: 'front', ix: 31, iy: 42 },
  { id: 'top', label: 'Soft Top & Cockpit', sub: 'Convertible mechanism', system: 'Body', diff: 2, time: '~30 min',
    part: 'Microswitch 981.561.944.00 · hyd. fluid Pentosin', spec: 'Electro-hydraulic, ~9 s cycle', interval: 'Lube rails yearly', torque: 'n/a',
    notes: 'Tops stall from low hydraulic fluid or a sticky microswitch. Keep drains clear and rails lightly greased.',
    steps: ['Cycle top with ignition on', 'Listen for pump cavitation (low fluid)', 'Inspect microswitches at latches', 'Clean & grease guide rails', 'Clear top-of-windscreen drains'],
    view: 'front', ix: 45, iy: 35 },
  { id: 'fuel', label: 'Fuel System', sub: 'Pump · filter · DFI', system: 'Fuel', diff: 3, time: '~90 min',
    part: 'Pump/filter module 991.620.141.01 · sender 991.620.833.01', spec: '64 L tank · DFI ~200 bar rail', interval: 'Filter lifetime — inspect', torque: 'Pump flange ring 60 Nm',
    notes: 'Filter is integrated in the in-tank pump module. Relieve fuel pressure before opening any high-pressure union.',
    steps: ['Relieve rail pressure (pull pump fuse, run dry)', 'Access pump under frunk/cabin floor', 'Disconnect quick-connects carefully', 'Replace module, new seal ring', 'Prime and leak-check at 200 bar'],
    view: 'front', ix: 45, iy: 51 },
  { id: 'airfilter', label: 'Air Filter & Intake', sub: 'Engine induction', system: 'Engine', diff: 1, time: '~20 min',
    part: 'PN 981.110.130.00 (panel)', spec: 'Single panel element', interval: '6 yr / 40k (yearly if tracked)', torque: 'Airbox screws 4 Nm',
    notes: 'Airbox sits in the engine bay under the rear lid. Quick win for breathing; pairs with throttle-body clean.',
    steps: ['Open rear engine lid', 'Release airbox lid clips/screws', 'Lift out panel filter', 'Wipe housing clean', 'Fit new element, reseat lid'],
    view: 'rear', ix: 15, iy: 52 },
  { id: 'plugs', label: 'Spark Plugs & Coils', sub: 'Ignition · flat-six', system: 'Engine', diff: 3, time: '~2 hr',
    part: 'Bosch FGR-5-NQE-04 · PN 999.170.151.90 (×6)', spec: 'Gap 0.8 mm · 6 cyl', interval: '4 yr / 40k mi', torque: 'Plug 30 Nm · coil bolt 9 Nm',
    notes: 'Access is tight through the engine bay sides. Anti-seize lightly, do not over-torque the alloy heads.',
    steps: ['Remove rear lid & intake covers', 'Unbolt coil packs (9 Nm), label cylinders', 'Remove plugs with 14 mm thin-wall socket', 'Gap-check & fit new plugs to 30 Nm', 'Refit coils, clear adaptation'],
    view: 'rear', ix: 26, iy: 42 },
  { id: 'oil', label: 'Engine Oil & Filter', sub: 'Lubrication · flat-six', system: 'Engine', diff: 1, time: '~45 min',
    part: 'Mahle OX 366D · PN 9A1.107.224.00', spec: 'Mobil 1 0W-40 · 7.5 L w/ filter', interval: 'Yearly / 10k mi', torque: 'Drain plug 50 Nm · cap 25 Nm',
    notes: 'Mid-mounted DFI six. Drain from below; filter cap is on top via the lid. Use a new crush washer every time.',
    steps: ['Warm engine, lift & level the car', 'Remove underbody panel, drain via 8 mm hex', 'New crush washer, drain plug to 50 Nm', 'Swap OX 366D element under 24 mm cap (25 Nm)', 'Refill 7.5 L 0W-40, verify on iPM', 'Reset oil-service interval'],
    view: 'rear', ix: 52, iy: 24 },
  { id: 'belt', label: 'Accessory Drive Belt', sub: 'Serpentine / poly-V', system: 'Engine', diff: 3, time: '~60 min',
    part: 'PN 9A1.102.218.00 (Contitech / Gates 6PK1768)', spec: 'Poly-V, auto-tensioned', interval: '6 yr / 60k mi', torque: 'Tensioner bolt 43 Nm',
    notes: 'Drives alternator and A/C. Inspect for glazing and cracks; squeal usually means tensioner or pulley bearing.',
    steps: ['Open rear lid, note belt routing', 'Release auto-tensioner with 1/2" bar', 'Slip old belt off pulleys', 'Route new belt per diagram', 'Confirm tensioner seats, spin check'],
    view: 'rear', ix: 13, iy: 34 },
  { id: 'coolant', label: 'Coolant Expansion Tank', sub: 'Cooling reservoir', system: 'Cooling', diff: 1, time: '~15 min',
    part: 'Tank 981.106.147.04 · cap 996.106.447.04', spec: 'G40 pink · cold level mid-mark', interval: 'Cap & level yearly', torque: 'n/a',
    notes: 'A weak cap causes slow pressure loss. Check level cold; never open hot. Brown crust = mixing old coolant.',
    steps: ['Check level cold at seam mark', 'Inspect cap seal for cracks', 'Top up with G40 only', 'Squeeze hoses for brittleness', 'Bleed if air introduced'],
    view: 'rear', ix: 46, iy: 12 },
  { id: 'trans', label: 'PDK / Manual Gearbox', sub: 'Transaxle · rear-mounted', system: 'Transmission', diff: 4, time: '~2.5 hr',
    part: 'PDK gear oil 000.043.305.49 (75W-90) · clutch fluid 000.043.305.13 (Pentosin FFL-3) · filter integral to PDK oil pan (ZF)', spec: 'PDK gear oil ~2.8 L 75W-90 + separate FFL-3 clutch fluid · Manual 75W-90 (~2.8 L)', interval: 'PDK 4 yr/40k (factory 120k)', torque: 'Drain/fill 45 Nm',
    notes: 'Two separate PDK fluids: 75W-90 gear oil (mechanical/diff side) and Pentosin FFL-3 clutch/control fluid (PIWIS-guided fill). The filter is built into the oil pan — replace the pan (ZF/OEM) rather than a standalone filter. Manual gear oil is simpler.',
    steps: ['Lift & level, warm to temp', 'Drain transaxle, measure quantity', 'Replace PDK oil pan (integral filter) & clean magnet', 'Refill exact amount via fill port', 'Fill plug to 45 Nm, road-test shifts'],
    view: 'rear', ix: 60, iy: 52 },
  { id: 'rbrakes', label: 'Rear Brakes', sub: 'Pads · discs', system: 'Brakes', diff: 3, time: '~80 min',
    part: 'Pads 987.352.939.01 · discs 987.352.401.01', spec: '299 mm discs · integrated park brake', interval: 'Inspect yearly', torque: 'Wheel bolts 160 Nm · caliper 85 Nm',
    notes: 'Drum-in-hat parking brake. Retract pistons squarely; release park brake fully before service.',
    steps: ['Loosen bolts, lift & support rear', 'Release park brake, remove caliper', 'Fit new pads, lube pins', 'Seat caliper, torque 85 Nm', 'Wheel bolts 160 Nm in star'],
    view: 'front', ix: 83, iy: 67 },
  { id: 'exhaust', label: 'Exhaust & Sport System', sub: 'Cats · muffler · PSE', system: 'Exhaust', diff: 3, time: '~90 min',
    part: 'Rear muffler 981.111.922 · PSE valve', spec: 'Vacuum-actuated valve (PSE)', interval: 'Inspect yearly', torque: 'Clamp nut 23 Nm · hanger 23 Nm',
    notes: 'Check for blowing gaskets at the cat joints and split rubber hangers. PSE valve sticks if vacuum line perishes.',
    steps: ['Inspect from cats rearward for leaks', 'Check hangers & heat shields', 'Test PSE valve open/close vacuum', 'Replace gaskets at flanges', 'Clamp nuts to 23 Nm'],
    view: 'rear', ix: 80, iy: 56 },
  { id: 'wheels', label: 'Wheels & Tyres', sub: 'Rims · tyres · TPMS', system: 'Wheels', diff: 1, time: '~30 min',
    part: '235/40ZR19 fr · 265/40ZR19 rr (S, N-rated)', spec: 'Pressures 2.4 / 2.9 bar (cold)', interval: 'Rotate & inspect / check pressures', torque: 'Wheel bolts 160 Nm',
    notes: 'Run N-spec tyres for correct handling. Square setup means no cross rotation; check inner-edge wear from camber.',
    steps: ['Check cold pressures 2.4/2.9 bar', 'Inspect tread depth & inner edge', 'Reset TPMS after changes', 'Torque bolts to 160 Nm in star', 'Re-torque after 50 miles'],
    view: 'front', ix: 15, iy: 73 },
  { id: 'fusebox', label: 'Front Fuse & Relay Carrier', sub: 'E-box · frunk', system: 'Electrical', diff: 1, time: '~10 min',
    part: 'Carrier 991.610.105.00 · mini fuses', spec: 'Main + comfort carriers under frunk trim', interval: 'Inspect when diagnosing electrics', torque: 'n/a',
    notes: 'Driver-side frunk e-box holds high-current fuses and relays. Label every pull; a blown main fuse often looks like a dead car.',
    steps: ['Open frunk, lift carpet / cover', 'Identify fuse from lid diagram', 'Pull with plastic tweezers, check continuity', 'Refit cover fully seated', 'Clear related DTCs if set'],
    view: 'front', ix: 28, iy: 48 },
  { id: 'brakefluid', label: 'Brake Fluid Reservoir', sub: 'Master cylinder · ABS', system: 'Brakes', diff: 2, time: '~45 min',
    part: 'DOT 4 (P/N 000.043.210.82) · reservoir 997.355.013.01', spec: 'DOT 4 / Class 6 · level between MIN/MAX', interval: 'Fluid 2 yr', torque: 'Bleed nipples 10 Nm',
    notes: 'Reservoir sits on the master cylinder in the frunk. Dark fluid or a low level with a firm pedal still means a flush is due.',
    steps: ['Check level cold, top with DOT 4 only', 'Connect pressure bleeder if flushing', 'Bleed calipers farthest-first', 'Verify ABS pump cycle if equipped', 'Road-test pedal feel'],
    view: 'front', ix: 36, iy: 50 },
  { id: 'washer', label: 'Washer Reservoir', sub: 'Front service bay', system: 'Body', diff: 1, time: '~10 min',
    part: 'Reservoir 991.528.703.00 · pump PAB.955.651', spec: '~3 L · freeze-rated mix', interval: 'Top up as needed', torque: 'n/a',
    notes: 'Neck is under the frunk side trim. A dead pump is usually the connector or a clogged jet, not the bottle.',
    steps: ['Open frunk, locate filler neck', 'Top with washer mix (not plain water in winter)', 'Test jets and aim', 'Listen for pump if no spray', 'Clear clogged jets with a pin'],
    view: 'front', ix: 22, iy: 38 },
  { id: 'suspension', label: 'Front Struts & Arms', sub: 'MacPherson · ARB', system: 'Steering', diff: 4, time: 'shop',
    part: 'Strut 981.343.041.04 · control arm 991.341.043.01', spec: 'MacPherson front · hydraulic bushings', interval: 'Inspect yearly / after track', torque: 'Strut top 80 Nm · arm bolts 90 Nm + 90°',
    notes: 'Clunks over bumps are often drop-link or arm bushings. Alignment required after any arm or strut work.',
    steps: ['Road-test for clunk / pull', 'Inspect boots, drop-links, arm bushings', 'Check spring perch for corrosion', 'Replace worn links in pairs', 'Four-wheel alignment after'],
    view: 'front', ix: 18, iy: 62 },
  { id: 'dme', label: 'DME / Engine ECU', sub: 'Engine management', system: 'Electrical', diff: 4, time: 'shop',
    part: 'DME 991.618.602.03 (variant-specific)', spec: 'Bosch MED · under rear lid / firewall', interval: 'Software as needed', torque: 'Bracket bolts 9 Nm',
    notes: 'Coding is VIN-locked. After battery work some adaptations need a drive cycle; flashing is dealer/PIWIS territory.',
    steps: ['Confirm codes with a capable scanner', 'Check power/ground at the ECU connector', 'Inspect for water ingress at the connector', 'Do not swap ECUs without coding', 'Clear adaptations after legitimate repairs'],
    view: 'rear', ix: 33, iy: 18 },
  { id: 'throttle', label: 'Throttle Body & Plenum', sub: 'Drive-by-wire', system: 'Engine', diff: 2, time: '~40 min',
    part: 'Throttle body 997.605.115.01 (Bosch 0280750474) · cleaner', spec: 'Electronic TB · adaptation required', interval: 'Clean 40k / if idle rough', torque: 'TB bolts 9 Nm',
    notes: 'Carbon on the butterfly causes unstable idle. After cleaning, run throttle adaptation with a scan tool.',
    steps: ['Remove intake tube to TB', 'Clean butterfly & bore (TB-safe cleaner)', 'Do not force the flap open hard', 'Refit tube, clear adaptations', 'Idle-learn with scan tool'],
    view: 'rear', ix: 40, iy: 36 },
  { id: 'undertray', label: 'Engine Undertray', sub: 'Underbody panels', system: 'Body', diff: 1, time: '~20 min',
    part: 'Centre undertray 991.504.603.00', spec: 'Plastic shields · push-pins + bolts', interval: 'Inspect after track / kerbs', torque: 'Shield bolts 9 Nm',
    notes: 'Missing trays upset underbody airflow and expose the oil pan. Refit every pin — loose trays shred on the motorway.',
    steps: ['Lift and support safely', 'Inspect trays for cracks / missing pins', 'Replace damaged fasteners', 'Torque bolts to 9 Nm', 'Confirm clearance to exhaust'],
    view: 'front', ix: 68, iy: 78 },
  { id: 'pse', label: 'Sport Exhaust Valve', sub: 'PSE vacuum actuator', system: 'Exhaust', diff: 2, time: '~30 min',
    part: 'PSE actuator 991.111.381.02 / .385.01 · solenoid 7PP.906.283.F', spec: 'Vacuum-actuated flap in muffler', interval: 'Inspect yearly', torque: 'Clamp 23 Nm',
    notes: 'If Sport mode is quiet, check the vacuum line and diaphragm before condemning the muffler.',
    steps: ['Select Sport, listen for flap', 'Inspect vacuum hose to the actuator', 'Apply hand vacuum to test diaphragm', 'Replace hose or valve as needed', 'Confirm open/close with Sport toggle'],
    view: 'rear', ix: 87, iy: 66 },
];

/**
 * Cutaway components per generation. Mirrors the registries in lib/knowledge
 * (GENERATION_KB) and the powertrain registry above. Unknown / null generations
 * fall back to the 981 set.
 */
const GENERATION_COMPONENTS: Record<string, Component[]> = {
  '981': COMPONENTS,
  '987': COMPONENTS_987,
};

export function componentsForGeneration(generation: string | null | undefined): Component[] {
  return GENERATION_COMPONENTS[generation ?? DEFAULT_GENERATION] ?? GENERATION_COMPONENTS[DEFAULT_GENERATION];
}

export const FAULTS: Fault[] = [
  { id: 'f1', title: 'Coolant loss / sweet smell', system: 'COOLING', sev: 'MED', causes: ['Front coolant pipe joints seeping', 'Water-pump weep hole', 'Tired expansion-tank cap'], checks: ['Pressure-test to 1.5 bar', 'Inspect front pipe junction underneath', 'Check pump weep hole for stain'], parts: 'Water pump 981.106.011 · G40 coolant · cap 996.106.447' },
  { id: 'f2', title: 'Rattle on cold start (1–2 s)', system: 'ENGINE', sev: 'LOW', causes: ['Timing-chain tensioner settling', 'Normal DFI cold knock'], checks: ['Log frequency & duration', 'Stethoscope each bank', 'Verify oil level & grade'], parts: 'Chain tensioner 9A1.105.272 (if persistent)' },
  { id: 'f3', title: 'Oil mist in intake / blue smoke', system: 'ENGINE', sev: 'HIGH', causes: ['Air-Oil Separator (AOS) diaphragm failed'], checks: ['Vacuum test at oil-filler cap', 'Watch for white smoke at idle', 'Inspect breather hose for oil'], parts: 'AOS 981.107.026.04 · gasket set' },
  { id: 'f4', title: 'PDK jerky at low speed / fault lamp', system: 'TRANSMISSION', sev: 'HIGH', causes: ['Mechatronic unit fault', 'Degraded PDK fluid', 'Lost clutch adaptation'], checks: ['Read fault memory (P17xx)', 'Check fluid age & level', 'Re-run clutch adaptation'], parts: 'PDK gear oil 000.043.305.49 · clutch fluid 000.043.305.13 (FFL-3) · filter integral to PDK pan' },
  { id: 'f5', title: 'Convertible top stops mid-cycle', system: 'BODY', sev: 'MED', causes: ['Faulty latch microswitch', 'Low hydraulic fluid', 'Transport lock engaged'], checks: ['Cycle with ignition on, watch sequence', 'Inspect microswitches at latches', 'Check pump reservoir level'], parts: 'Microswitch 981.561.944.01 · Pentosin CHF' },
  { id: 'f6', title: 'Knock over bumps (front end)', system: 'SUSPENSION', sev: 'MED', causes: ['Worn drop links', 'Control-arm bushings', 'Strut top mount'], checks: ['Bounce test each corner', 'Lever drop links for play', 'Check tie-rod & ball-joint play'], parts: 'Drop link 981.341.085 · control arm 981.341.147' },
];

export const RECORDS: ServiceRecord[] = [
  { id: 'r1', date: '2025-09-12', mileage: 41980, title: 'Annual Oil Service', system: 'Engine', diy: true, cost: '£182', items: [{ name: 'Engine oil', description: 'Mobil 1 0W-40 · 7.5 L' }, { name: 'Oil filter', partNumber: 'OX 366D' }, { name: 'Service reset' }] },
  { id: 'r2', date: '2025-03-04', mileage: 39120, title: 'Brake Fluid Flush', system: 'Brakes', diy: true, cost: '£58', items: [{ name: 'Brake fluid', description: 'ATE Type 200' }, { name: 'Bled 4 corners' }] },
  { id: 'r3', date: '2024-08-20', mileage: 35400, title: 'Plugs & Air Filter', system: 'Engine', diy: true, cost: '£236', items: [{ name: 'Spark plugs', description: '6× NGK @ 30 Nm' }, { name: 'Panel air filter' }] },
  { id: 'r4', date: '2024-02-10', mileage: 31050, title: 'PDK Service', system: 'Transmission', diy: false, cost: '£520', items: [{ name: 'PDK fluid & filter' }, { name: 'Indy specialist' }] },
];

export const REC_TEMPLATES: Record<string, string[]> = {
  'Oil & Filter': ['Drain engine oil (warm)', 'Replace Mahle OX 366D filter', 'New drain-plug crush washer', 'Refill 7.5 L Mobil 1 0W-40', 'Verify level on iPM', 'Reset oil-service interval'],
  'Brake Fluid': ['Top reservoir with fresh fluid', 'Bleed RR caliper', 'Bleed LR caliper', 'Bleed RF caliper', 'Bleed LF caliper', 'Confirm firm pedal'],
  'Spark Plugs': ['Remove rear lid & covers', 'Unbolt 6 coil packs', 'Remove & gap-check plugs', 'Fit 6 new plugs @ 30 Nm', 'Refit coils @ 9 Nm', 'Clear adaptation'],
  'Tyre Rotation': ['Check cold pressures', 'Inspect tread & inner edge', 'Reset TPMS', 'Torque bolts 160 Nm', 'Re-torque after 50 mi'],
  'Custom': ['Add your first step…'],
};

/**
 * The real MCP tools exposed at /api/mcp (see app/api/[transport]/route.ts).
 * `auth: true` tools need a Supabase Bearer token; the rest are open.
 */
export const MCP_TOOLS: McpTool[] = [
  { name: 'search_knowledge', desc: 'Search the knowledge base (faults, specs, issues, articles) for your car generation.' },
  { name: 'lookup_fault_code', desc: 'Resolve an OBD / fault code to causes and fixes.' },
  { name: 'get_spec', desc: 'Look up a torque value, capacity or fluid spec.' },
  { name: 'get_maintenance_schedule', desc: 'List maintenance items by system or mileage.' },
  { name: 'list_known_issues', desc: 'List documented 981 weak points by system.' },
  { name: 'find_part', desc: 'Search the OEM catalog for part numbers and torque.' },
  { name: 'get_my_vehicles', desc: 'List the vehicles in your garage.', auth: true },
  { name: 'get_service_history', desc: 'Read service records for a vehicle.', auth: true },
  { name: 'log_service_record', desc: 'Add a service record to a vehicle.', auth: true },
  { name: 'get_obd_scan', desc: 'Read the latest saved OBD scan, with DTCs cross-referenced to the knowledge base.', auth: true },
];

// (RAG sources are now computed from real data in components/views/AiConnect.tsx
// using KNOWLEDGE_SOURCES + the live parts/service-history counts.)

export const DIFF_LABELS = ['Beginner', 'Beginner', 'Intermediate', 'Advanced', 'Specialist'];

export function diffDots(diff: number): string {
  return '●'.repeat(diff) + '○'.repeat(5 - diff);
}

export function fmtMiles(n: number | string, units: 'mi' | 'km' = 'mi'): string {
  const num = parseInt(String(n).replace(/[^0-9]/g, '')) || 0;
  const v = units === 'km' ? Math.round(num * 1.60934) : num;
  return v.toLocaleString('en-US') + ' ' + units;
}

/**
 * Format a maintenance-interval string in the chosen distance unit. Intervals are
 * free text mixing time and distance ("Yearly / 20k mi", "4 yr / 40k",
 * "PDK 4 yr/40k (factory 120k)"), so we convert only the mileage tokens — "…k mi",
 * "… mi", and the bare "Nk" thousands shorthand — and leave time (yr) alone.
 * No-op for 'mi'.
 */
export function formatInterval(interval: string, units: 'mi' | 'km' = 'mi'): string {
  if (units !== 'km') return interval;
  const kmFromMi = (mi: number) => mi * 1.60934;
  const num = (s: string) => parseFloat(s.replace(/,/g, '')) || 0;
  return interval
    // "20k mi" → thousands of miles → thousands of km
    .replace(/(\d[\d,]*(?:\.\d+)?)\s*k\s*mi\b/gi, (_, n) => `${Math.round(kmFromMi(num(n) * 1000) / 1000)}k km`)
    // "44,000 mi" → miles → km
    .replace(/(\d[\d,]*)\s*mi\b/gi, (_, n) => `${Math.round(kmFromMi(num(n))).toLocaleString('en-US')} km`)
    // bare "40k" / "120k" (thousands of miles, no unit) → thousands of km, keep "k"
    .replace(/(\d[\d,]*(?:\.\d+)?)\s*k\b(?!\s*(?:km|mi))/gi, (_, n) => `${Math.round(kmFromMi(num(n) * 1000) / 1000)}k`);
}
