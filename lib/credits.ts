import type { BodyType } from './types';
import { CAR_VARIANTS, getVariant } from './models';

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

// Third-party 3D models used for the exterior, attributed per their CC licence.
// Keyed by the GLB-OWNING variant (one entry per distinct model file). Stand-in
// variants that reuse another trim's GLB resolve to that model's credit via
// modelCreditFor() — so this is Partial<Record<…>> (not every BodyType has an entry).
export const MODEL_CREDITS: Partial<Record<BodyType, ModelCredit>> = {
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

  // ── 911 (991) — 12 distinct GLBs, keyed by their owning variant. Licences
  //    confirmed by the uploader. FLAT·SIX is non-commercial, so the NC term is
  //    satisfied; redistributed derivatives of NC-SA models must keep that licence.
  'carrera-s-991-1': {
    title: 'Porsche 911 Carrera S (991)', author: 'Mona x Supercars',
    source: 'https://skfb.ly/puQyE', license: CC_BY, licenseUrl: CC_BY_URL,
  },
  // ⚠ Sketchfab source URL not provided by the uploader — author + licence confirmed.
  'gt3-991-1': {
    title: '2014 Porsche 911 GT3 (991)', author: 'Ddiaz Design',
    source: 'https://sketchfab.com/Ddiaz-design', license: CC_BY_NC_SA, licenseUrl: CC_BY_NC_SA_URL,
  },
  'turbo-991-1': {
    title: '2014 Porsche 911 Turbo (991)', author: 'Ddiaz Design',
    source: 'https://skfb.ly/pIzJW', license: CC_BY_NC_SA, licenseUrl: CC_BY_NC_SA_URL,
  },
  'gt3-rs-991-1': {
    title: '2017 Porsche 911 (991) GT3 RS', author: 'Ddiaz Design',
    source: 'https://skfb.ly/pKqWy', license: CC_BY_NC_SA, licenseUrl: CC_BY_NC_SA_URL,
  },
  'carrera-gts-991-2': {
    title: '2018 Porsche 911 Carrera GTS', author: 'Ddiaz Design',
    source: 'https://skfb.ly/pstzT', license: CC_BY, licenseUrl: CC_BY_URL,
  },
  'turbo-s-991-2': {
    title: '2016 Porsche 911 Turbo S (991.2)', author: 'Ddiaz Design',
    source: 'https://skfb.ly/pBzUB', license: CC_BY_NC_SA, licenseUrl: CC_BY_NC_SA_URL,
  },
  'turbo-s-exclusive-991-2': {
    title: '2017 Porsche 911 Turbo S Exclusive Series 991.2', author: 'Ddiaz Design',
    source: 'https://skfb.ly/pBzWY', license: CC_BY_NC_SA, licenseUrl: CC_BY_NC_SA_URL,
  },
  'gt3-rs-991-2': {
    title: '2019 Porsche 911 (991.2) GT3 RS', author: 'Ddiaz Design',
    source: 'https://skfb.ly/pKr8Z', license: CC_BY_NC_SA, licenseUrl: CC_BY_NC_SA_URL,
  },
  'gt3-rs-weissach-991-2': {
    title: '2019 Porsche 911 (991.2) GT3 RS Weissach Package', author: 'Ddiaz Design',
    source: 'https://skfb.ly/pKrVC', license: CC_BY_NC_SA, licenseUrl: CC_BY_NC_SA_URL,
  },
  'gt2-rs-clubsport-991-2': {
    title: '2019 Porsche 911 GT2 RS Clubsport 23 Salzburg', author: 'Ddiaz Design',
    source: 'https://skfb.ly/pspyP', license: CC_BY, licenseUrl: CC_BY_URL,
  },
  'speedster-991-2': {
    title: '2019 Porsche 911 Speedster (991.2)', author: 'Ddiaz Design',
    source: 'https://skfb.ly/ps7GY', license: CC_BY, licenseUrl: CC_BY_URL,
  },
  'targa-4s-991-2': {
    title: '2019 Porsche 911 Targa 4S (991.2)', author: 'Ddiaz Design',
    source: 'https://skfb.ly/ps7KB', license: CC_BY, licenseUrl: CC_BY_URL,
  },
};

/**
 * Resolve the model credit for a vehicle body. Direct hit for a GLB-owning variant;
 * a stand-in variant (which reuses another trim's GLB) resolves to that GLB's owner's
 * credit by matching the glb path. Always returns a credit (never undefined) so the
 * garage attribution line stays safe for any BodyType.
 */
const FALLBACK_CREDIT: ModelCredit = MODEL_CREDITS.boxster ?? {
  title: 'FLAT·SIX 3D model', author: 'Community', source: 'https://github.com/dmitry-grechko/flat-six',
  license: CC_BY, licenseUrl: CC_BY_URL,
};

export function modelCreditFor(body: BodyType): ModelCredit {
  const direct = MODEL_CREDITS[body];
  if (direct) return direct;
  const glb = getVariant(body).glb;
  const owner = CAR_VARIANTS.find((v) => v.glb === glb && MODEL_CREDITS[v.id]);
  return (owner && MODEL_CREDITS[owner.id]) || FALLBACK_CREDIT;
}

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
