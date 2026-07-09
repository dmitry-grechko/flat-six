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
  // TODO(attribution): confirm the 987 model's author + licence before publishing.
  // The GLB was supplied without source/licence metadata — most free car models
  // are CC-BY and REQUIRE attribution, so this must be filled in to stay compliant.
  'cayman-987': {
    title: 'Porsche Cayman (987)',
    author: 'Attribution pending — confirm source',
    source: '',
    license: 'Unknown — verify before publishing',
    licenseUrl: '',
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
