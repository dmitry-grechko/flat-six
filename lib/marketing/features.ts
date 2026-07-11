export interface FeatureHighlight {
  title: string;
  body: string;
}

export interface FeatureDetail {
  eyebrow: string;
  title: string;
  body: string;
  bullets?: string[];
  image?: string;
  specTitle?: string;
  specs?: { k: string; v: string }[];
}

export interface FeatureHeroItem {
  name: string;
  sub: string;
  tag: string;
  tagType?: 'HIGH' | 'MED' | 'LOW' | 'done' | string;
}

export interface FeatureGen {
  code: string;
  name: string;
  note: string;
}

export interface FeaturePage {
  slug: string;
  title: string;
  eyebrow: string;
  headline: string;
  description: string;
  heroKicker: string;
  heroImage?: string;
  heroList?: FeatureHeroItem[];
  highlightsTitle: string;
  highlightsIntro: string;
  highlights: FeatureHighlight[];
  details: FeatureDetail[];
  gen?: FeatureGen[];
  genTitle?: string;
  ctaTitle: string;
  ctaBody: string;
  secHref?: string;
  secLabel?: string;
  relatedGenerations: string[];
}

export const FEATURE_PAGES: FeaturePage[] = [
  {
    slug: 'xray',
    title: '3D visualization',
    eyebrow: '3D visualization',
    headline: 'Outside, X-ray, and every line.',
    description:
      'Orbit a real 3D model in your colour, strip it to every assembly in X-ray, or follow coolant, fuel, air and wiring through the car — each part tied to numbers, torque and intervals for your generation.',
    heroKicker: 'X-ray · all systems, stripped',
    heroImage: '/assets/xray-full.png',
    highlightsTitle: 'Three ways to look at your car.',
    highlightsIntro: 'One model, three depths — from a clean orbit to a full teardown.',
    highlights: [
      { title: 'Orbit & recolour', body: 'Drag to spin, scroll to zoom, and switch the paint to your spec — the body repaints live.' },
      { title: 'X-ray every assembly', body: 'Peel the body away and see engine, cooling, brakes, suspension and wiring in place.' },
      { title: 'Follow the lines', body: 'Trace coolant, fuel, air and exhaust through the car, then open any system for detail.' },
    ],
    details: [
      {
        eyebrow: 'Layer 01',
        title: 'A real model, in your colour',
        body: 'Spin the car in a smooth 3D viewer and set it to your paint — the finish updates instantly, so it looks like your car and not a generic render.',
        image: '/assets/boxster-poster.png',
      },
      {
        eyebrow: 'Layer 02',
        title: 'Where every part lives',
        body: 'Switch to the systems view and watch coolant, fuel, air, exhaust and wiring light up in place. Tap any run to jump straight to its parts, torque and service interval.',
        image: '/assets/xray-systems.png',
      },
    ],
    genTitle: 'Modelled per generation.',
    gen: [
      { code: '987', name: 'Boxster & Cayman', note: 'The 987.1 and 987.2 mapped from nose to tail — including the differences that matter when you’re under the car.' },
      { code: '981', name: 'Boxster & Cayman', note: 'The 981 modelled in full, with its own routing, components and service points called out per system.' },
    ],
    ctaTitle: 'See your car from the inside out.',
    ctaBody: 'Open the 3D viewer, set your colour, and start exploring every system.',
    relatedGenerations: ['987', '981'],
  },
  {
    slug: 'fault-finding',
    title: 'Fault finding',
    eyebrow: 'Fault finding',
    headline: 'Track a fault to its cause.',
    description:
      'Pick a symptom and get the likely causes ranked for your exact generation — with the checks to run first and the part numbers to order.',
    heroKicker: 'flat-six / fault finding',
    heroList: [
      { name: 'Centre coolant pipe (plastic)', sub: 'Part 981.106.665', tag: 'HIGH', tagType: 'HIGH' },
      { name: 'Water-pump weep hole', sub: 'Part 9A1.106.011', tag: 'MED', tagType: 'MED' },
      { name: 'Expansion-tank cap seal', sub: 'Part 999.673.323', tag: 'LOW', tagType: 'LOW' },
    ],
    highlightsTitle: 'From symptom to fix.',
    highlightsIntro: 'No guessing and no generic checklists — answers scoped to your car.',
    highlights: [
      { title: 'Ranked by likelihood', body: 'Causes ordered by how common they are on your generation, not the whole model range.' },
      { title: 'The checks, in order', body: 'What to inspect first, so you confirm the cause before you spend a penny.' },
      { title: 'Parts ready to order', body: 'Exact part numbers alongside each cause, ready to drop into a plan.' },
    ],
    details: [
      {
        eyebrow: 'Generation-aware',
        title: 'It knows what breaks on your car',
        body: 'IMS and bore scoring on a 987.1, AOS and plastic coolant pipes on a 981 — the causes and their odds shift with your engine and year.',
        bullets: ['Symptom picker tuned to each generation', 'Common failure points flagged up front', 'Links straight into fault codes and guides'],
      },
      {
        eyebrow: 'Turn it into action',
        title: 'From diagnosis to a logged job',
        body: 'Once you’ve found it, push the parts and steps into a service plan, then tick it off and log it to your history when the work is done.',
        specTitle: 'flat-six / plan from fault',
        specs: [
          { k: 'Suspected cause', v: 'Coolant pipe' },
          { k: 'Part', v: '981.106.665' },
          { k: 'Add to', v: 'Service plan' },
          { k: 'Est. time', v: '4.0 h' },
        ],
      },
    ],
    ctaTitle: 'Find the fault, not just the code.',
    ctaBody: 'Pick your symptom and get causes ranked for your generation.',
    relatedGenerations: ['987', '981'],
  },
  {
    slug: 'service-history',
    title: 'Service history',
    eyebrow: 'Service history',
    headline: 'Log every job, keep the record.',
    description:
      'Record each service with a checklist, mileage and cost — DIY or shop. Edit or delete any entry, and your full history stays with the car.',
    heroKicker: 'flat-six / service history',
    heroList: [
      { name: 'Annual oil service', sub: '41,980 mi · Mobil 1 0W-40 · $182', tag: 'DIY' },
      { name: 'Brake fluid flush', sub: '39,120 mi · ATE Type 200 · $58', tag: 'DIY' },
      { name: 'Plugs & air filter', sub: '35,400 mi · 6× NGK @30 Nm · $236', tag: 'DIY' },
    ],
    highlightsTitle: 'A logbook that finally makes sense.',
    highlightsIntro: 'Everything you did, when, and what it cost — in one place.',
    highlights: [
      { title: 'DIY or shop', body: 'Log your own work or a workshop visit, with parts, torque and notes attached.' },
      { title: 'Mileage & cost', body: 'Track spend and intervals over time, so nothing sneaks up on you.' },
      { title: 'Stays with the car', body: 'Sell it on and hand over a complete, credible service record.' },
    ],
    details: [
      {
        eyebrow: 'Every detail',
        title: 'More than a date and a mileage',
        body: 'Attach the parts you used, the torque you set, receipts and notes — so future-you, or the next owner, knows exactly what was done.',
        bullets: ['Parts and quantities used', 'Torque values and fluids', 'Notes and receipts per entry'],
      },
      {
        eyebrow: 'Always accurate',
        title: 'Edit anything, any time',
        body: 'Got the mileage wrong or forgot a line item? Edit or delete any entry. Your history is yours to keep straight.',
        specTitle: 'flat-six / entry',
        specs: [
          { k: 'Job', v: 'Oil service' },
          { k: 'Mileage', v: '41,980 mi' },
          { k: 'Oil', v: 'Mobil 1 0W-40' },
          { k: 'Cost', v: '$182' },
        ],
      },
    ],
    ctaTitle: 'Give your car a proper logbook.',
    ctaBody: 'Start recording every job — it takes a minute and lasts the life of the car.',
    relatedGenerations: ['987', '981'],
  },
  {
    slug: 'service-plans',
    title: 'Service plans',
    eyebrow: 'Service plans',
    headline: 'Plan what’s coming up.',
    description:
      'Build plans for upcoming jobs with the steps and parts to order, tick things off as you go, then turn a plan into a logged service in one click.',
    heroKicker: 'flat-six / service plans',
    heroList: [
      { name: 'Order ATE Type 200 (1 L)', sub: 'Brake fluid flush · step 1', tag: 'done', tagType: 'done' },
      { name: 'Top reservoir, bleed RR → LF', sub: 'Brake fluid flush · step 2', tag: 'To do' },
      { name: 'Confirm firm pedal, log it', sub: 'Brake fluid flush · step 3', tag: 'To do' },
    ],
    highlightsTitle: 'Stay ahead of the maintenance.',
    highlightsIntro: 'Know what’s next, gather the parts, and never scramble.',
    highlights: [
      { title: 'Steps & parts', body: 'Break a job into steps with the exact parts and fluids to buy beforehand.' },
      { title: 'Tick as you go', body: 'Work through the checklist at your own pace, across a weekend or a month.' },
      { title: 'One click to history', body: 'Finish the plan and convert it into a logged service instantly.' },
    ],
    details: [
      {
        eyebrow: 'Never caught out',
        title: 'See it coming before it’s due',
        body: 'Set intervals by time or mileage and line up the next oil service, brake flush or belt job well before the deadline.',
        bullets: ['Due by date or mileage', 'Parts list ready to order', 'Carries over into your history'],
      },
      {
        eyebrow: 'From plan to done',
        title: 'Close the loop in one click',
        body: 'When the last box is ticked, turn the whole plan into a history entry — parts, notes and all — without retyping a thing.',
        specTitle: 'flat-six / plan',
        specs: [
          { k: 'Plan', v: 'Brake fluid flush' },
          { k: 'Due', v: '~Apr 2026' },
          { k: 'At', v: '44,000 mi' },
          { k: 'Progress', v: '1 / 3 done' },
        ],
      },
    ],
    ctaTitle: 'Plan the next job today.',
    ctaBody: 'Line up what’s coming and gather the parts before you’re under the car.',
    relatedGenerations: ['987', '981'],
  },
  {
    slug: 'tools',
    title: 'DIY tools',
    eyebrow: 'DIY tools',
    headline: 'Will it fit? Do the math.',
    description:
      'Save the wheels you own and check any tyre against them — rim fit, rolling diameter, speedo error, poke and clearance — plus offset, staggered-diameter and alignment calculators. Our own math, no third-party site.',
    heroKicker: 'flat-six / tools · will it fit?',
    heroList: [
      { name: 'Tyre ↔ rim', sub: '265/40R19 on 9.5J', tag: 'FITS' },
      { name: 'Rolling diameter', sub: '−4 mm vs OEM (−0.6%)', tag: 'OK' },
      { name: 'Speedo error', sub: 'reads high 0.6%', tag: 'OK' },
      { name: 'Clearance', sub: '+6 mm poke — check fender', tag: 'Watch' },
    ],
    highlightsTitle: 'Wheel & tyre math, done right.',
    highlightsIntro: 'The calculators owners actually reach for — all in one place.',
    highlights: [
      { title: 'Fitment checker', body: 'Save your disks and test any tyre against them for a proper, safe fit.' },
      { title: 'Diameter & speedo', body: 'See rolling-diameter change and exactly how far your speedo reads off.' },
      { title: 'Poke & clearance', body: 'Work out offset, poke and fender clearance before you buy.' },
    ],
    details: [
      {
        eyebrow: 'Your wheels, saved',
        title: 'Check against what you actually own',
        body: 'Store your front and rear disks once, then run any tyre size against them. No more spreadsheet, no more third-party calculators.',
        bullets: ['Front & rear saved separately', 'Any tyre size, instant verdict', 'Staggered setups handled'],
      },
      {
        eyebrow: 'Visual & precise',
        title: 'Diagrams, not just numbers',
        body: 'Every calculator shows a diagram, so you can see the change — offset, poke, diameter — and trust the figure before you commit.',
        specTitle: 'flat-six / tyre calc',
        specs: [
          { k: 'Tyre', v: '265/40R19' },
          { k: 'Rim', v: '9.5J ET45' },
          { k: 'Rolling Ø', v: '660 mm' },
          { k: 'Verdict', v: 'Fits' },
        ],
      },
    ],
    genTitle: 'Sized for your car.',
    gen: [
      { code: '987', name: 'OEM sizes on file', note: 'Factory staggered fitments for the 987, so “vs OEM” actually means your car.' },
      { code: '981', name: 'OEM sizes on file', note: '981 factory wheel and tyre specs built in, ready to compare against.' },
    ],
    ctaTitle: 'Check the fit before you buy.',
    ctaBody: 'Save your wheels and run the numbers in seconds.',
    relatedGenerations: ['987', '981'],
  },
  {
    slug: 'multi-car',
    title: 'Multi-car garage',
    eyebrow: 'Multi-car garage',
    headline: 'Run more than one car.',
    description:
      'Add every Boxster and Cayman you own — 987 or 981 — and switch between them in one click. History, plans and AI context stay scoped to the car you’re looking at.',
    heroKicker: 'flat-six / your garage',
    heroList: [
      { name: 'Boxster Spyder', sub: '987 · 2011 · 42,500 mi', tag: 'Active' },
      { name: 'Cayman S', sub: '981 · 2014 · 38,120 mi', tag: 'Switch' },
      { name: 'Add another car', sub: '987 or 981', tag: 'New' },
    ],
    highlightsTitle: 'One account, every car.',
    highlightsIntro: 'Built for the enthusiast with a garage, not just a car.',
    highlights: [
      { title: 'Switch in a click', body: 'Jump between cars instantly — the whole app follows the one you pick.' },
      { title: 'Scoped context', body: 'History, plans and AI answers always match the active car.' },
      { title: 'Any Boxster or Cayman', body: 'Mix generations — a 987 daily and a 981 weekend car, side by side.' },
    ],
    details: [
      {
        eyebrow: 'No cross-wires',
        title: 'Each car keeps its own everything',
        body: 'Every car has its own service history, plans and saved wheels. Nothing bleeds between them, so the record stays clean.',
        bullets: ['Separate history & plans per car', 'Own saved wheels & fitments', 'Specs and faults scoped to each generation'],
      },
      {
        eyebrow: 'Built to grow',
        title: 'Add the next one in seconds',
        body: 'Picked up another Cayman? Add it, set the generation, and your garage is ready — with the right specs and fault patterns already in place.',
        specTitle: 'flat-six / garage',
        specs: [
          { k: 'Cars', v: '2' },
          { k: 'Active', v: 'Boxster 987' },
          { k: 'Also', v: 'Cayman 981' },
          { k: 'Add', v: '987 / 981' },
        ],
      },
    ],
    ctaTitle: 'Bring the whole garage.',
    ctaBody: 'Add every Boxster and Cayman you own and switch in a click.',
    relatedGenerations: ['987', '981'],
  },
  {
    slug: 'ai',
    title: 'AI assistant',
    eyebrow: 'AI assistant',
    headline: 'Manage it all just by chatting.',
    description:
      'Connect your garage to Claude, OpenAI, or Gemini over MCP and simply talk to it. It logs services, looks up specs, answers fault questions and plans what’s next — updating your garage with your approval.',
    heroKicker: 'flat-six mcp · claude · openai · gemini',
    heroList: [
      { name: 'Log a service from a sentence', sub: '“Did an oil change at 42,180 mi”', tag: 'Logs' },
      { name: 'Look up a torque spec', sub: '“Drain plug torque?” → 50 Nm', tag: 'Reads' },
      { name: 'Plan the next job', sub: '“Set next oil service in 10k mi”', tag: 'Plans' },
    ],
    highlightsTitle: 'The AI you already use, plugged into your car.',
    highlightsIntro: 'No new chatbot to learn — connect the assistant you like over MCP.',
    highlights: [
      { title: 'Knows your garage', body: 'Answers draw on your car’s history, plans and generation-specific knowledge.' },
      { title: 'Acts on your garage', body: 'Logs services, builds plans and updates records — always with your approval.' },
      { title: 'Claude, OpenAI or Gemini', body: 'Bring your own model over MCP; more are on the way.' },
    ],
    details: [
      {
        eyebrow: 'Grounded answers',
        title: 'Grounded in your car, not the internet',
        body: 'The assistant uses your garage data and generation-scoped reference — so a torque figure or fluid capacity comes from verified sources, not a forum guess.',
        bullets: ['Scoped to your active car', 'Uses your history and plans', 'No made-up specs'],
      },
      {
        eyebrow: 'You stay in control',
        title: 'Nothing changes without your say-so',
        body: 'When it wants to log a job or set a plan, it shows you exactly what it will do and waits for your yes. Your garage never changes behind your back.',
        specTitle: 'flat-six / mcp',
        specs: [
          { k: 'Protocol', v: 'MCP' },
          { k: 'Claude', v: 'supported' },
          { k: 'OpenAI', v: 'supported' },
          { k: 'Gemini', v: 'supported' },
        ],
      },
    ],
    ctaTitle: 'Talk to your garage.',
    ctaBody: 'Connect your assistant over MCP and manage the car by chatting.',
    relatedGenerations: ['987', '981'],
  },
];

export function getFeature(slug: string): FeaturePage | undefined {
  return FEATURE_PAGES.find((f) => f.slug === slug);
}
