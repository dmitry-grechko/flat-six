import type { BodyType } from './types';

export interface ModelCredit {
  title: string;
  author: string;
  source: string;   // model page
  license: string;
  licenseUrl: string;
}

const CC_BY = 'CC BY 4.0';
const CC_BY_URL = 'http://creativecommons.org/licenses/by/4.0/';

const CC_BY_NC_SA = 'CC BY-NC-SA 4.0';
const CC_BY_NC_SA_URL = 'http://creativecommons.org/licenses/by-nc-sa/4.0/';

// Third-party 3D models used for the exterior, attributed per their CC-BY licence.
export const MODEL_CREDITS: Record<BodyType, ModelCredit> = {
  boxster: {
    title: '2015 Porsche Boxster GTS (718)',
    author: 'Ddiaz Design',
    source: 'https://skfb.ly/przTS',
    license: CC_BY,
    licenseUrl: CC_BY_URL,
  },
  cayman: {
    title: '2014 Porsche Cayman S (981)',
    author: 'Ddiaz Design',
    source: 'https://skfb.ly/p8vC9',
    license: CC_BY,
    licenseUrl: CC_BY_URL,
  },
  // ⚠ CC BY-NC-SA 4.0 (NonCommercial + ShareAlike) — like the Spyder below,
  // unlike the CC-BY models. FLAT·SIX is non-commercial so NC is fine;
  // redistributed derivatives must stay under the same CC BY-NC-SA licence.
  'cayman-gt4-981': {
    title: '2015 Porsche Cayman GT4',
    author: 'OUTPISTON',
    source: 'https://skfb.ly/pBVJw',
    license: CC_BY_NC_SA,
    licenseUrl: CC_BY_NC_SA_URL,
  },
  'cayman-987': {
    title: 'Porsche Cayman 987',
    author: 'Mona x Supercars',
    source: 'https://skfb.ly/oQzBB',
    license: CC_BY,
    licenseUrl: CC_BY_URL,
  },
  // Boxster 987 reuses the Cayman 987 GLB (no dedicated Boxster model), so it
  // shares that model's attribution.
  'boxster-987': {
    title: 'Porsche Cayman 987 (shown for Boxster 987)',
    author: 'Mona x Supercars',
    source: 'https://skfb.ly/oQzBB',
    license: CC_BY,
    licenseUrl: CC_BY_URL,
  },
  // ⚠ CC BY-NC-SA 4.0 (NonCommercial + ShareAlike) — unlike the CC-BY models
  // above. FLAT·SIX is non-commercial, so NC is fine; redistributed derivatives
  // of this model must stay under the same CC BY-NC-SA licence.
  'spyder-987': {
    title: '2010 Porsche Boxster Spyder',
    author: 'Ddiaz Design',
    source: 'https://skfb.ly/pBAu9',
    license: CC_BY_NC_SA,
    licenseUrl: CC_BY_NC_SA_URL,
  },
  // CC BY 4.0 — the same permissive, commercial-friendly licence as the
  // Boxster/Cayman models above (attribution required, no NonCommercial term).
  'audi-a4-b9': {
    title: 'Audi a4 2017',
    author: 'davidthe19th',
    source: 'https://skfb.ly/pwU8o',
    license: CC_BY,
    licenseUrl: CC_BY_URL,
  },
};

export const MODEL_CREDIT_LIST = Object.values(MODEL_CREDITS);

export interface ImageCredit {
  title: string;
  author: string;     // who to credit
  source: string;     // where it was obtained
  license: string;    // usage basis
}

// Reference cutaway illustrations used in the 2D garage explorer.
// Attribution retained in NOTICE-style credit objects for the in-app overlay.
const CUTAWAY_LICENSE = 'Editorial reference · third-party rights reserved';

export const CUTAWAY_CREDIT: ImageCredit = {
  title: '981 whole-car cutaway',
  author: 'Community recolour',
  source: 'https://rennlist.com/forums/981-forum/1350212-porsche-cutaway-drawings.html',
  license: CUTAWAY_LICENSE,
};

export const ENGINE_CUTAWAY_CREDIT: ImageCredit = {
  title: 'Flat-six engine cutaway',
  author: 'Reference illustration',
  source: 'https://conceptbunny.com/porsche-boxster-engine/',
  license: CUTAWAY_LICENSE,
};

// ── 987 (2005–2012) reference illustrations ──
const PRESS_SOURCE = 'https://newsroom.porsche.com';

export const CUTAWAY_987_CREDIT: ImageCredit = {
  title: '987 whole-car cutaway',
  author: 'Reference illustration',
  source: PRESS_SOURCE,
  license: CUTAWAY_LICENSE,
};

export const ENGINE_987_CREDIT: ImageCredit = {
  title: '987 flat-six & transaxle cutaway',
  author: 'Reference illustration',
  source: PRESS_SOURCE,
  license: CUTAWAY_LICENSE,
};

export const CYLINDER_987_CREDIT: ImageCredit = {
  title: 'Flat-six cylinder numbering',
  author: 'Reference illustration',
  source: PRESS_SOURCE,
  license: CUTAWAY_LICENSE,
};

// Dedicated 981 flat-six + transaxle engine cutaway for the ENGINE tab.
export const ENGINE_981_CREDIT: ImageCredit = {
  title: '981 flat-six & transaxle cutaway',
  author: 'Reference illustration',
  source: PRESS_SOURCE,
  license: CUTAWAY_LICENSE,
};

/** One 2D cutaway tab: the background image, its tab label, caption + credit. */
export interface CutawayImage {
  src: string;
  alt: string;
  credit: ImageCredit;
  /** Segmented-control label for this tab. */
  tabLabel: string;
  /** Stage caption shown top-left. */
  caption: string;
}

/** The two cutaway tabs (front/full + engine) available for one generation. */
interface GenerationCutaways {
  front: CutawayImage;
  engine: CutawayImage;
}

/** Fallback generation for unknown / legacy vehicle bodies. */
const DEFAULT_GENERATION = '981';

// Per-generation 2D cutaway registry — the single place to register a
// generation's cutaway tabs. Mirrors GENERATION_KB in lib/knowledge and
// GENERATION_POWERTRAIN in lib/data. The 981 reuses ONE top-down image for the
// CUTAWAY tab and a dedicated flat-six image for the ENGINE tab; the 987 has a
// distinct whole-car cutaway plus its own engine image. Unknown generations
// fall back to the 981 set.
const GENERATION_CUTAWAYS: Record<string, GenerationCutaways> = {
  '981': {
    front: { src: '/assets/cutaway-981.jpg', alt: '981 whole-car cutaway', credit: CUTAWAY_CREDIT, tabLabel: 'CUTAWAY', caption: 'FULL CUTAWAY · 981' },
    engine: { src: '/assets/engine-981.jpg', alt: '981 flat-six and transaxle cutaway', credit: ENGINE_981_CREDIT, tabLabel: 'ENGINE', caption: 'FLAT-SIX & TRANSAXLE · ENGINE CUTAWAY' },
  },
  '987': {
    front: { src: '/assets/cutaway-987.jpg', alt: '987 whole-car cutaway', credit: CUTAWAY_987_CREDIT, tabLabel: 'CUTAWAY', caption: 'FULL CUTAWAY · 987' },
    engine: { src: '/assets/engine-987.jpg', alt: '987 flat-six and transaxle cutaway', credit: ENGINE_987_CREDIT, tabLabel: 'ENGINE', caption: 'FLAT-SIX & TRANSAXLE · ENGINE CUTAWAY' },
  },
};

/**
 * Resolve the 2D cutaway image for a generation + tab. The `front` view is the
 * whole-car/full cutaway; `rear` maps to the dedicated engine cutaway. Unknown
 * generations fall back to the 981 set.
 */
export function cutawayImageFor(generation: string, view: 'front' | 'rear'): CutawayImage {
  const tabs = GENERATION_CUTAWAYS[generation] ?? GENERATION_CUTAWAYS[DEFAULT_GENERATION];
  return view === 'front' ? tabs.front : tabs.engine;
}

/** The "engine reference" figure shown in a selected Engine component's detail. */
export interface EngineRefImage {
  src: string;
  alt: string;
  credit: ImageCredit;
  label: string;
}

// Per-generation "engine reference" figure (shown in a selected Engine part's
// detail). Unknown generations fall back to the 981 flat-six reference.
const GENERATION_ENGINE_REF: Record<string, EngineRefImage> = {
  '981': { src: '/assets/engine-flat-six.jpg', alt: 'Flat-six engine cutaway', credit: ENGINE_CUTAWAY_CREDIT, label: 'FLAT-SIX REFERENCE' },
  '987': { src: '/assets/cylinder-987.jpg', alt: 'Flat-six cylinder numbering (987)', credit: CYLINDER_987_CREDIT, label: 'CYLINDER NUMBERING' },
};

export function engineRefFor(generation: string): EngineRefImage {
  return GENERATION_ENGINE_REF[generation] ?? GENERATION_ENGINE_REF[DEFAULT_GENERATION];
}
