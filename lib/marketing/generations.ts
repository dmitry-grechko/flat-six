export interface ModelVariant {
  code: string;
  years: string;
  name: string;
  note: string;
}

export interface ModelKnows {
  title: string;
  body: string;
  href: string;
}

export interface GenerationHubData {
  code: string;
  title: string;
  intro: string;
  heroImage: string;
  heroKicker: string;
  facts: { k: string; v: string }[];
  knowsTitle: string;
  knowsIntro: string;
  knows: ModelKnows[];
  variantsTitle: string;
  variants: ModelVariant[];
  modelTitle: string;
  modelIntro: string;
  modelKicker: string;
  modelImage: string;
  ctaTitle: string;
  ctaBody: string;
}

export const GENERATION_HUBS: Record<string, GenerationHubData> = {
  '981': {
    code: '981',
    title: 'The 981, in full.',
    intro:
      'The mid-engine sweet spot — a lighter, sharper roadster and coupe with the 9A1 flat-six. Modelled end to end, with fault patterns and DIY tools tuned to the generation.',
    heroImage: '/assets/boxster-poster.png',
    heroKicker: '981 · 3D model',
    facts: [
      { k: 'Years', v: '2012–2016' },
      { k: 'Body', v: 'Roadster · coupe' },
      { k: 'Engine', v: '2.7–3.8 flat-six' },
      { k: 'Variants', v: 'base · S · GTS · GT4' },
    ],
    knowsTitle: 'What FLAT·SIX knows about the 981.',
    knowsIntro:
      'Everything is scoped to the generation — so the specs, faults and guides you see are the ones that actually apply to your car.',
    knows: [
      { title: 'Fault codes', body: '200 indexed codes with generation-specific context and links into fault finding.', href: '/codes/981' },
      { title: 'Fault patterns', body: 'Coolant pipes, AOS and water-pump wear ranked for the 981.', href: '/features/fault-finding' },
      { title: '3D & systems', body: 'Orbit the car and trace coolant, fuel and air, mapped for this gen.', href: '/features/xray' },
      { title: 'Fitment tools', body: 'Stock staggered wheel and tyre sizes on file for the DIY tools.', href: '/features/tools' },
    ],
    variantsTitle: 'From base to GT4.',
    variants: [
      {
        code: '981',
        years: '2012–2016',
        name: 'Roadster & coupe',
        note: '2.7 base and 3.4 S with the 9A1 direct-injection flat-six, electromechanical steering and a stiffer, lighter chassis.',
      },
      {
        code: 'GT4',
        years: '2015–2016',
        name: 'GT4 & Spyder',
        note: 'The 3.8-litre, more focused end of the range — the enthusiast’s pick, and a modern classic.',
      },
    ],
    modelTitle: 'See the 981 in 3D.',
    modelIntro: 'Orbit the car in your colour, strip it to every assembly, and follow the lines through the chassis — built for this generation.',
    modelKicker: '981 · 3D model',
    modelImage: '/assets/boxster-poster.png',
    ctaTitle: 'Put your 981 in the garage.',
    ctaBody: 'Add your car, pick the exact variant, and everything scopes to it — free.',
  },
  '987': {
    code: '987',
    title: 'The 987, mapped end to end.',
    intro:
      'The first roadster and coupe to get the full FLAT·SIX treatment — every system in 3D, generation-specific fault patterns, and DIY tools tuned to the generation that gave us the IMS debate.',
    heroImage: '/assets/cayman-987-poster.png',
    heroKicker: '987 · 3D model',
    facts: [
      { k: 'Years', v: '2005–2012' },
      { k: 'Body', v: 'Roadster · coupe' },
      { k: 'Engine', v: '2.7–3.4 flat-six' },
      { k: 'Variants', v: '987.1 · 987.2' },
    ],
    knowsTitle: 'What FLAT·SIX knows about the 987.',
    knowsIntro:
      'Everything is scoped to the generation — so the specs, faults and guides you see are the ones that actually apply to your car.',
    knows: [
      { title: 'Fault codes', body: '200 indexed codes with generation-specific context and links into fault finding.', href: '/codes/987' },
      { title: 'Fault patterns', body: 'IMS, bore scoring and AOS ranked the way they really fail on a 987.', href: '/features/fault-finding' },
      { title: '3D & systems', body: 'Orbit the car and trace every line, mapped for this generation.', href: '/features/xray' },
      { title: 'Fitment tools', body: 'Stock wheel and tyre sizes on file for the DIY tools.', href: '/features/tools' },
    ],
    variantsTitle: 'Two generations under one code.',
    variants: [
      {
        code: '987.1',
        years: '2005–2008',
        name: 'The M96 / M97 era',
        note: 'The IMS-bearing and bore-scoring years. Beautiful to drive, and worth knowing inside out before you buy or service one.',
      },
      {
        code: '987.2',
        years: '2009–2012',
        name: 'The 9A1 refresh',
        note: 'New direct-injection engines with no IMS bearing, plus available PDK — a big step in reliability and pace.',
      },
    ],
    modelTitle: 'See the 987 in 3D.',
    modelIntro: 'Orbit the car in your colour, strip it to every assembly, and follow the lines through the chassis — built for this generation.',
    modelKicker: '987 · 3D model',
    modelImage: '/assets/cayman-987-poster.png',
    ctaTitle: 'Put your 987 in the garage.',
    ctaBody: 'Add your car, pick the exact variant, and everything scopes to it — free.',
  },
};
