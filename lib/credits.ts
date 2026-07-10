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
};

export const MODEL_CREDIT_LIST = Object.values(MODEL_CREDITS);

export interface ImageCredit {
  title: string;
  author: string;     // who to credit
  source: string;     // where it was obtained
  license: string;    // usage basis
}

// Factory ghosted/phantom cutaway illustrations are © Dr. Ing. h.c. F. Porsche AG,
// distributed for editorial/press use. The whole-car cutaway used here is a
// GT Silver recolour of the official 981 Cayman press rendering by Rennlist member
// "Randy_B"; the flat-six engine cutaway is the unaltered Porsche factory drawing.
const PORSCHE_AG = '© Dr. Ing. h.c. F. Porsche AG — editorial use';

export const CUTAWAY_CREDIT: ImageCredit = {
  title: 'Porsche 981 factory cutaway (GT Silver)',
  author: 'Porsche AG · recolour by Randy_B',
  source: 'https://rennlist.com/forums/981-forum/1350212-porsche-cutaway-drawings.html',
  license: PORSCHE_AG,
};

export const ENGINE_CUTAWAY_CREDIT: ImageCredit = {
  title: 'Porsche flat-six engine cutaway',
  author: 'Porsche AG',
  source: 'https://conceptbunny.com/porsche-boxster-engine/',
  license: PORSCHE_AG,
};

// ── 987 (2005–2012 Boxster/Cayman) factory illustrations ──
// Porsche press/media cutaways, © Porsche AG, editorial use.
const PORSCHE_PRESS = 'https://newsroom.porsche.com';

export const CUTAWAY_987_CREDIT: ImageCredit = {
  title: 'Porsche Cayman S (987) factory cutaway',
  author: 'Porsche AG',
  source: PORSCHE_PRESS,
  license: PORSCHE_AG,
};

export const ENGINE_987_CREDIT: ImageCredit = {
  title: 'Porsche 987 flat-six & transaxle cutaway',
  author: 'Porsche AG',
  source: PORSCHE_PRESS,
  license: PORSCHE_AG,
};

export const CYLINDER_987_CREDIT: ImageCredit = {
  title: 'Porsche flat-six cylinder numbering',
  author: 'Porsche AG',
  source: PORSCHE_PRESS,
  license: PORSCHE_AG,
};

// Dedicated 981 flat-six + transaxle engine cutaway (press render) for the
// 981 ENGINE tab — same treatment as the 987 engine image.
export const ENGINE_981_CREDIT: ImageCredit = {
  title: 'Porsche 981 flat-six & transaxle cutaway',
  author: 'Porsche AG',
  source: PORSCHE_PRESS,
  license: PORSCHE_AG,
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

/**
 * Resolve the 2D cutaway image for a generation + tab. The 981 reuses ONE
 * top-down image for both tabs (front vs engine differ only by which hotspots
 * show); the 987 has a distinct whole-car cutaway and a dedicated engine image.
 */
export function cutawayImageFor(generation: string, view: 'front' | 'rear'): CutawayImage {
  if (generation === '987') {
    return view === 'front'
      ? {
          src: '/assets/cutaway-987.jpg',
          alt: 'Porsche Cayman S (987) factory cutaway',
          credit: CUTAWAY_987_CREDIT,
          tabLabel: 'CUTAWAY',
          caption: 'FULL CUTAWAY · 987 CAYMAN',
        }
      : {
          src: '/assets/engine-987.jpg',
          alt: 'Porsche 987 flat-six engine and transaxle cutaway',
          credit: ENGINE_987_CREDIT,
          tabLabel: 'ENGINE',
          caption: 'FLAT-SIX & TRANSAXLE · ENGINE CUTAWAY',
        };
  }
  // 981 (default): whole-car top-down cutaway for the CUTAWAY tab; a dedicated
  // flat-six + transaxle image for the ENGINE tab (same pattern as the 987).
  return view === 'front'
    ? {
        src: '/assets/cutaway-981.jpg',
        alt: 'Porsche 981 factory cutaway',
        credit: CUTAWAY_CREDIT,
        tabLabel: 'CUTAWAY',
        caption: 'FULL CUTAWAY · 981',
      }
    : {
        src: '/assets/engine-981.jpg',
        alt: 'Porsche 981 flat-six engine and transaxle cutaway',
        credit: ENGINE_981_CREDIT,
        tabLabel: 'ENGINE',
        caption: 'FLAT-SIX & TRANSAXLE · ENGINE CUTAWAY',
      };
}

/** The "engine reference" figure shown in a selected Engine component's detail. */
export interface EngineRefImage {
  src: string;
  alt: string;
  credit: ImageCredit;
  label: string;
}

export function engineRefFor(generation: string): EngineRefImage {
  if (generation === '987') {
    return {
      src: '/assets/cylinder-987.jpg',
      alt: 'Porsche flat-six cylinder numbering (987)',
      credit: CYLINDER_987_CREDIT,
      label: 'CYLINDER NUMBERING',
    };
  }
  return {
    src: '/assets/engine-flat-six.jpg',
    alt: 'Porsche flat-six engine cutaway',
    credit: ENGINE_CUTAWAY_CREDIT,
    label: 'FLAT-SIX REFERENCE',
  };
}
