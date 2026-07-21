// Standardised service-record templates (GitHub #12).
//
// When adding a service record, the user can pick a template to pre-fill a
// bundle of operations as editable line items — "Minor service", "Major
// service", "Annual inspection" — plus the common single jobs. Templates are
// generation-keyed (like the rest of lib/): a Porsche flat-four/six set covers
// 981 / 987 / 982 / 991; unknown or non-Porsche generations get an honest
// empty list (the form falls back to a blank "Custom" start).
//
// IMPORTANT: templates describe OPERATIONS, not verified specs. Descriptions are
// deliberately generic ("refill to spec", "torque to spec") and carry no part
// numbers, quantities or torque values — those differ per generation/variant and
// must stay verified-or-hidden (see CLAUDE.md). The user fills the actuals in the
// editable line items before saving.

export interface ServiceTemplateItem {
  /** Line-item name seeded into the record, e.g. "Engine oil & filter". */
  name: string;
  /** Optional guidance seeded into the item's description (editable). */
  description?: string;
}

export interface ServiceTemplate {
  /** Stable id used as the picker key + analytics label. */
  key: string;
  /** Chip label + default record title, e.g. "Minor Service". */
  label: string;
  /** 'service' = multi-operation bundle; 'job' = single common operation. */
  kind: 'service' | 'job';
  /** One-line hint (rough interval) shown under the picker. */
  blurb: string;
  items: ServiceTemplateItem[];
}

// ---- Reusable operations (generic, no unverified specifics) ----------------
const OIL: ServiceTemplateItem = {
  name: 'Engine oil & filter',
  description: 'Drain warm, new oil filter + crush washer, refill to spec, reset the service interval.',
};
const BRAKE_FLUID: ServiceTemplateItem = {
  name: 'Brake fluid flush',
  description: 'Fresh DOT 4, bleed each corner farthest-first until clean, confirm a firm pedal.',
};
const PLUGS: ServiceTemplateItem = {
  name: 'Spark plugs',
  description: 'Renew plugs and inspect the coil packs. Light anti-seize; do not over-torque the alloy heads.',
};
const AIR_FILTER: ServiceTemplateItem = {
  name: 'Engine air filter',
  description: 'Renew the panel air-filter element; wipe out the airbox.',
};
const CABIN_FILTER: ServiceTemplateItem = {
  name: 'Cabin / pollen filter',
  description: 'Renew the cabin filter (note the airflow arrow).',
};
const BELT: ServiceTemplateItem = {
  name: 'Accessory drive belt',
  description: 'Inspect the serpentine belt; renew if cracked or glazed.',
};
const COOLANT: ServiceTemplateItem = {
  name: 'Coolant check',
  description: 'Check level + condition cold and the expansion-tank cap seal.',
};
const TYRES: ServiceTemplateItem = {
  name: 'Wheels & tyres',
  description: 'Set cold pressures to spec; check tread depth + inner-edge wear; torque wheel bolts to spec.',
};
const INSPECT_VISUAL: ServiceTemplateItem = {
  name: 'Visual inspection',
  description: 'Fluids, hoses, belts, tyres, lights, wipers — note anything to watch next time.',
};
const INSPECT_FULL: ServiceTemplateItem = {
  name: 'Full inspection',
  description: 'Suspension, brakes, exhaust and underbody — leaks, play, corrosion, secure trays/shields.',
};

// ---- Porsche flat-four/six template set (981 / 987 / 982 / 991) ------------
// Intervals in the blurbs are the well-established Boxster/Cayman/911 figures and
// hold across these generations; where a generation genuinely diverges later,
// give it its own entry in REGISTRY below.
const PORSCHE: ServiceTemplate[] = [
  // Full services (bundles) — shown first.
  {
    key: 'minor',
    label: 'Minor Service',
    kind: 'service',
    blurb: 'Yearly basics — about every 12 months / 10k mi.',
    items: [OIL, CABIN_FILTER, TYRES, INSPECT_VISUAL],
  },
  {
    key: 'major',
    label: 'Major Service',
    kind: 'service',
    blurb: 'The big one — about every 4 years / 40k mi.',
    items: [OIL, PLUGS, AIR_FILTER, CABIN_FILTER, BRAKE_FLUID, BELT, COOLANT, INSPECT_FULL],
  },
  {
    key: 'annual',
    label: 'Annual Inspection',
    kind: 'service',
    blurb: 'Yearly safety & condition check — no parts.',
    items: [
      { name: 'Brakes', description: 'Measure pad + disc thickness; inspect lines and handbrake operation.' },
      TYRES,
      { name: 'Fluids', description: 'Check engine oil, coolant, brake fluid and washer levels.' },
      { name: 'Lights & wipers', description: 'All exterior + interior lights; wiper blades and washer jets.' },
      { name: 'Underbody', description: 'Check for leaks and corrosion; secure heat shields / undertrays.' },
    ],
  },
  // Single jobs.
  { key: 'oil', label: 'Oil & Filter', kind: 'job', blurb: 'About every 12 months / 10k mi.', items: [OIL] },
  { key: 'brake-fluid', label: 'Brake Fluid', kind: 'job', blurb: 'About every 2 years.', items: [BRAKE_FLUID] },
  { key: 'plugs', label: 'Spark Plugs', kind: 'job', blurb: 'About every 4 years / 40k mi.', items: [PLUGS] },
  { key: 'wheels', label: 'Wheels & Tyres', kind: 'job', blurb: 'Pressures, condition + wheel-bolt torque.', items: [TYRES] },
];

// Generation registry. Porsche generations share the flat-four/six set; other
// marques / unknown generations return [] (the form then offers only "Custom").
const REGISTRY: Record<string, ServiceTemplate[]> = {
  '981': PORSCHE,
  '987': PORSCHE,
  '982': PORSCHE,
  '991': PORSCHE,
};

/** Service templates for a generation (empty for non-Porsche / unknown). */
export function serviceTemplatesFor(generation: string | null | undefined): ServiceTemplate[] {
  return (generation && REGISTRY[generation]) || [];
}
