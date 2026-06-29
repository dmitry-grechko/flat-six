import type {
  Component, Fault, ServiceRecord, Vehicle, PaintColor,
  McpTool, RagSource, SystemName,
} from './types';

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

export const COLORS: PaintColor[] = [
  { name: 'GT SILVER', hex: '#C6C8CA' }, { name: 'CARRARA WHITE', hex: '#E8E8EA' },
  { name: 'JET BLACK', hex: '#131316' }, { name: 'GUARDS RED', hex: '#D5001C' },
  { name: 'SAPPHIRE BLUE', hex: '#27364E' }, { name: 'RACING YELLOW', hex: '#EFC03B' },
  { name: 'AGATE GREY', hex: '#5B5F63' }, { name: 'AMARANTH', hex: '#7A2230' },
];

export const ENGINES = ['2.7 L Flat-Six', '3.4 L Flat-Six (S)', '3.4 L Flat-Six (GTS)', '3.8 L Flat-Six (Spyder)'];
export const TRANS = ['6-Speed Manual', '7-Speed PDK'];

// view/ix/iy come from the mockup's VIEWMAP (hotspot positions on the 2D cutaways).
export const COMPONENTS: Component[] = [
  { id: 'cooling', label: 'Front Radiators & Condenser', sub: 'Cooling system', system: 'Cooling', diff: 2, time: '~40 min',
    part: 'Radiator 981.106.034 (L/R)', spec: 'G40 coolant (pink) · ~22 L system', interval: 'Coolant 4 yr · inspect yearly', torque: 'Hose clamp 4 Nm',
    notes: 'Twin radiators sit behind the front bumper with the A/C condenser. They clog with debris — check fins and drains each spring.',
    steps: ['Lift front, remove underbody tray', 'Inspect fins for leaves/stone damage', 'Pressure-test system to 1.5 bar', 'Check expansion tank level cold', 'Refit tray to 9 Nm'],
    view: 'front', ix: 14, iy: 54 },
  { id: 'battery', label: 'Auxiliary Battery', sub: 'Electrical · front trunk', system: 'Electrical', diff: 1, time: '~20 min',
    part: 'AGM 12 V 70 Ah (PN 999.611.071)', spec: 'Located under frunk floor panel', interval: 'Replace 4–6 yr', torque: 'Terminal clamp 6 Nm',
    notes: 'Use a memory-saver before disconnect to keep convenience settings. Negative off first, positive on first.',
    steps: ['Open frunk, lift floor panel', 'Connect memory saver to OBD', 'Disconnect negative then positive', 'Swap battery, refit clamps to 6 Nm', 'Re-register battery if AGM type'],
    view: 'front', ix: 19, iy: 41 },
  { id: 'fbrakes', label: 'Front Brakes', sub: 'Pads · discs · fluid', system: 'Brakes', diff: 3, time: '~90 min',
    part: 'Pads 981.351.939.01 · Discs 981.351.045 (S)', spec: '315 mm discs (S) · 4-pot fixed caliper', interval: 'Inspect yearly · fluid 2 yr', torque: 'Wheel bolts 130 Nm · caliper 85 Nm',
    notes: 'Wear sensor on the front left. Keep the dust boot clean and lube guide pins. Bed pads in over 200 miles.',
    steps: ['Loosen wheel bolts, lift & support', 'Remove wheel, retaining clip & pins', 'Lever pistons back, fit new pads', 'Reset wear sensor if triggered', 'Torque wheel bolts to 130 Nm in star'],
    view: 'front', ix: 21, iy: 66 },
  { id: 'steering', label: 'Electromechanical Steering', sub: 'EPS rack & track rods', system: 'Steering', diff: 4, time: 'shop',
    part: 'Track rod end 981.347.082', spec: 'Electric assist — no hydraulic fluid', interval: 'Inspect boots & ends yearly', torque: 'Track rod end 100 Nm',
    notes: 'No fluid to service. Watch for split rack boots and play in the track-rod ends; alignment after any rod work.',
    steps: ['Inspect rack boots for splits/grease', 'Check track-rod end play by hand', 'Verify steering-angle sensor codes', 'Replace ends in pairs if worn', 'Four-wheel alignment after'],
    view: 'front', ix: 25, iy: 56 },
  { id: 'cabinfilter', label: 'Cabin / Pollen Filter', sub: 'HVAC intake', system: 'HVAC', diff: 1, time: '~15 min',
    part: 'PN 991.572.219.01 (carbon)', spec: 'Activated-carbon element', interval: 'Yearly / 20k mi', torque: 'n/a — clip-in',
    notes: 'Behind the frunk firewall cover. A clogged filter is the #1 cause of weak airflow and musty A/C.',
    steps: ['Open frunk, remove firewall trim', 'Release filter cover clips', 'Slide out old element (note airflow arrow)', 'Vacuum housing', 'Fit new filter, refit cover'],
    view: 'front', ix: 31, iy: 42 },
  { id: 'top', label: 'Soft Top & Cockpit', sub: 'Convertible mechanism', system: 'Body', diff: 2, time: '~30 min',
    part: 'Microswitch 981.561.135 · hyd. fluid Pentosin', spec: 'Electro-hydraulic, ~9 s cycle', interval: 'Lube rails yearly', torque: 'n/a',
    notes: 'Tops stall from low hydraulic fluid or a sticky microswitch. Keep drains clear and rails lightly greased.',
    steps: ['Cycle top with ignition on', 'Listen for pump cavitation (low fluid)', 'Inspect microswitches at latches', 'Clean & grease guide rails', 'Clear top-of-windscreen drains'],
    view: 'front', ix: 45, iy: 35 },
  { id: 'fuel', label: 'Fuel System', sub: 'Pump · filter · DFI', system: 'Fuel', diff: 3, time: '~90 min',
    part: 'Pump/filter module 981.620.087.00', spec: '64 L tank · DFI ~200 bar rail', interval: 'Filter lifetime — inspect', torque: 'Pump flange ring 60 Nm',
    notes: 'Filter is integrated in the in-tank pump module. Relieve fuel pressure before opening any high-pressure union.',
    steps: ['Relieve rail pressure (pull pump fuse, run dry)', 'Access pump under frunk/cabin floor', 'Disconnect quick-connects carefully', 'Replace module, new seal ring', 'Prime and leak-check at 200 bar'],
    view: 'front', ix: 45, iy: 51 },
  { id: 'airfilter', label: 'Air Filter & Intake', sub: 'Engine induction', system: 'Engine', diff: 1, time: '~20 min',
    part: 'PN 981.110.131.00 (panel)', spec: 'Single panel element', interval: '6 yr / 40k (yearly if tracked)', torque: 'Airbox screws 4 Nm',
    notes: 'Airbox sits in the engine bay under the rear lid. Quick win for breathing; pairs with throttle-body clean.',
    steps: ['Open rear engine lid', 'Release airbox lid clips/screws', 'Lift out panel filter', 'Wipe housing clean', 'Fit new element, reseat lid'],
    view: 'rear', ix: 60, iy: 37 },
  { id: 'plugs', label: 'Spark Plugs & Coils', sub: 'Ignition · flat-six', system: 'Engine', diff: 3, time: '~2 hr',
    part: 'NGK 95170 · PN 999.170.225.90 (×6)', spec: 'Gap 0.8 mm · 6 cyl', interval: '4 yr / 40k mi', torque: 'Plug 30 Nm · coil bolt 9 Nm',
    notes: 'Access is tight through the engine bay sides. Anti-seize lightly, do not over-torque the alloy heads.',
    steps: ['Remove rear lid & intake covers', 'Unbolt coil packs (9 Nm), label cylinders', 'Remove plugs with 14 mm thin-wall socket', 'Gap-check & fit new plugs to 30 Nm', 'Refit coils, clear adaptation'],
    view: 'rear', ix: 66, iy: 44 },
  { id: 'oil', label: 'Engine Oil & Filter', sub: 'Lubrication · flat-six', system: 'Engine', diff: 1, time: '~45 min',
    part: 'Mahle OX 366D · PN 9A1.107.225.00', spec: 'Mobil 1 0W-40 · 7.5 L w/ filter', interval: 'Yearly / 10k mi', torque: 'Drain plug 50 Nm · cap 25 Nm',
    notes: 'Mid-mounted DFI six. Drain from below; filter cap is on top via the lid. Use a new crush washer every time.',
    steps: ['Warm engine, lift & level the car', 'Remove underbody panel, drain via 8 mm hex', 'New crush washer, drain plug to 50 Nm', 'Swap OX 366D element under 24 mm cap (25 Nm)', 'Refill 7.5 L 0W-40, verify on iPM', 'Reset oil-service interval'],
    view: 'rear', ix: 62, iy: 57 },
  { id: 'belt', label: 'Accessory Drive Belt', sub: 'Serpentine / poly-V', system: 'Engine', diff: 3, time: '~60 min',
    part: 'PN 999.192.082.50', spec: 'Poly-V, auto-tensioned', interval: '6 yr / 60k mi', torque: 'Tensioner bolt 43 Nm',
    notes: 'Drives alternator and A/C. Inspect for glazing and cracks; squeal usually means tensioner or pulley bearing.',
    steps: ['Open rear lid, note belt routing', 'Release auto-tensioner with 1/2" bar', 'Slip old belt off pulleys', 'Route new belt per diagram', 'Confirm tensioner seats, spin check'],
    view: 'rear', ix: 55, iy: 52 },
  { id: 'coolant', label: 'Coolant Expansion Tank', sub: 'Cooling reservoir', system: 'Cooling', diff: 1, time: '~15 min',
    part: 'Tank 981.106.147 · cap 996.106.447', spec: 'G40 pink · cold level mid-mark', interval: 'Cap & level yearly', torque: 'n/a',
    notes: 'A weak cap causes slow pressure loss. Check level cold; never open hot. Brown crust = mixing old coolant.',
    steps: ['Check level cold at seam mark', 'Inspect cap seal for cracks', 'Top up with G40 only', 'Squeeze hoses for brittleness', 'Bleed if air introduced'],
    view: 'rear', ix: 57, iy: 35 },
  { id: 'trans', label: 'PDK / Manual Gearbox', sub: 'Transaxle · rear-mounted', system: 'Transmission', diff: 4, time: '~2.5 hr',
    part: 'PDK fluid 999.917.547.00 · filter 981.307.115', spec: 'PDK ~7.5 L ATF · Manual 75W-90 (~2.8 L)', interval: 'PDK 4 yr/40k (factory 120k)', torque: 'Drain/fill 45 Nm',
    notes: 'Sooner-than-factory PDK fluid + filter is cheap insurance against mechatronic wear. Manual gear oil is simpler.',
    steps: ['Lift & level, warm to temp', 'Drain transaxle, measure quantity', 'Replace PDK filter / clean magnet', 'Refill exact amount via fill port', 'Fill plug to 45 Nm, road-test shifts'],
    view: 'rear', ix: 76, iy: 51 },
  { id: 'rbrakes', label: 'Rear Brakes', sub: 'Pads · discs', system: 'Brakes', diff: 3, time: '~80 min',
    part: 'Pads 981.352.939.01 · Discs 981.352.045', spec: '299 mm discs · integrated park brake', interval: 'Inspect yearly', torque: 'Wheel bolts 130 Nm · caliper 85 Nm',
    notes: 'Drum-in-hat parking brake. Retract pistons squarely; release park brake fully before service.',
    steps: ['Loosen bolts, lift & support rear', 'Release park brake, remove caliper', 'Fit new pads, lube pins', 'Seat caliper, torque 85 Nm', 'Wheel bolts 130 Nm in star'],
    view: 'rear', ix: 83, iy: 67 },
  { id: 'exhaust', label: 'Exhaust & Sport System', sub: 'Cats · muffler · PSE', system: 'Exhaust', diff: 3, time: '~90 min',
    part: 'Rear muffler 981.111.025 · PSE valve', spec: 'Vacuum-actuated valve (PSE)', interval: 'Inspect yearly', torque: 'Clamp nut 23 Nm · hanger 23 Nm',
    notes: 'Check for blowing gaskets at the cat joints and split rubber hangers. PSE valve sticks if vacuum line perishes.',
    steps: ['Inspect from cats rearward for leaks', 'Check hangers & heat shields', 'Test PSE valve open/close vacuum', 'Replace gaskets at flanges', 'Clamp nuts to 23 Nm'],
    view: 'rear', ix: 72, iy: 72 },
  { id: 'wheels', label: 'Wheels & Tyres', sub: 'Rims · tyres · TPMS', system: 'Wheels', diff: 1, time: '~30 min',
    part: '235/40ZR19 fr · 265/40ZR19 rr (S, N-rated)', spec: 'Pressures 2.4 / 2.9 bar (cold)', interval: 'Rotate & inspect / check pressures', torque: 'Wheel bolts 130 Nm',
    notes: 'Run N-spec tyres for correct handling. Square setup means no cross rotation; check inner-edge wear from camber.',
    steps: ['Check cold pressures 2.4/2.9 bar', 'Inspect tread depth & inner edge', 'Reset TPMS after changes', 'Torque bolts to 130 Nm in star', 'Re-torque after 50 miles'],
    view: 'front', ix: 15, iy: 73 },
];

export const FAULTS: Fault[] = [
  { id: 'f1', title: 'Coolant loss / sweet smell', system: 'COOLING', sev: 'MED', causes: ['Front coolant pipe joints seeping', 'Water-pump weep hole', 'Tired expansion-tank cap'], checks: ['Pressure-test to 1.5 bar', 'Inspect front pipe junction underneath', 'Check pump weep hole for stain'], parts: 'Water pump 981.106.011 · G40 coolant · cap 996.106.447' },
  { id: 'f2', title: 'Rattle on cold start (1–2 s)', system: 'ENGINE', sev: 'LOW', causes: ['Timing-chain tensioner settling', 'Normal DFI cold knock'], checks: ['Log frequency & duration', 'Stethoscope each bank', 'Verify oil level & grade'], parts: 'Chain tensioner 9A1.105.272 (if persistent)' },
  { id: 'f3', title: 'Oil mist in intake / blue smoke', system: 'ENGINE', sev: 'HIGH', causes: ['Air-Oil Separator (AOS) diaphragm failed'], checks: ['Vacuum test at oil-filler cap', 'Watch for white smoke at idle', 'Inspect breather hose for oil'], parts: 'AOS 981.107.026.04 · gasket set' },
  { id: 'f4', title: 'PDK jerky at low speed / fault lamp', system: 'TRANSMISSION', sev: 'HIGH', causes: ['Mechatronic unit fault', 'Degraded PDK fluid', 'Lost clutch adaptation'], checks: ['Read fault memory (P17xx)', 'Check fluid age & level', 'Re-run clutch adaptation'], parts: 'PDK fluid 999.917.547.00 · filter 981.307.115' },
  { id: 'f5', title: 'Convertible top stops mid-cycle', system: 'BODY', sev: 'MED', causes: ['Faulty latch microswitch', 'Low hydraulic fluid', 'Transport lock engaged'], checks: ['Cycle with ignition on, watch sequence', 'Inspect microswitches at latches', 'Check pump reservoir level'], parts: 'Microswitch 981.561.135 · Pentosin CHF' },
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
  'Tyre Rotation': ['Check cold pressures', 'Inspect tread & inner edge', 'Reset TPMS', 'Torque bolts 130 Nm', 'Re-torque after 50 mi'],
  'Custom': ['Add your first step…'],
};

/**
 * The real MCP tools exposed at /api/mcp (see app/api/[transport]/route.ts).
 * `auth: true` tools need a Supabase Bearer token; the rest are open.
 */
export const MCP_TOOLS: McpTool[] = [
  { name: 'search_981_knowledge', desc: 'Search the 981 knowledge base (faults, specs, issues, articles).' },
  { name: 'lookup_fault_code', desc: 'Resolve an OBD / fault code to causes and fixes.' },
  { name: 'get_spec', desc: 'Look up a torque value, capacity or fluid spec.' },
  { name: 'get_maintenance_schedule', desc: 'List maintenance items by system or mileage.' },
  { name: 'list_known_issues', desc: 'List documented 981 weak points by system.' },
  { name: 'find_part', desc: 'Search the OEM catalog for part numbers and torque.' },
  { name: 'get_my_vehicles', desc: 'List the vehicles in your garage.', auth: true },
  { name: 'get_service_history', desc: 'Read service records for a vehicle.', auth: true },
  { name: 'log_service_record', desc: 'Add a service record to a vehicle.', auth: true },
];

// (RAG sources are now computed from real data in components/views/SettingsMcp.tsx
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
