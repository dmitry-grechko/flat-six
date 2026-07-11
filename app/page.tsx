import Landing from '@/components/home/Landing';
import { LANDING_FAQ } from '@/lib/marketing/faq';
import { pageMetadata } from '@/lib/marketing/seo';
import { SITE_URL } from '@/components/marketing/tokens';

export const metadata = pageMetadata({
  title: 'Free Boxster & Cayman garage',
  description:
    'A free, open-source garage for the Boxster & Cayman (987, 981): 3D X-ray, fault codes, service history, DIY tools, and AI assistant.',
  path: '/',
});

const JSON_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      url: SITE_URL,
      name: 'FLAT·SIX',
      description:
        'A free, open-source garage for the Boxster & Cayman (987, 981, and more): 3D inspector, generation-specific fault finding and specs, service history, maintenance plans and an AI assistant.',
      inLanguage: 'en',
    },
    {
      '@type': 'WebApplication',
      '@id': `${SITE_URL}/#app`,
      name: 'FLAT·SIX',
      url: SITE_URL,
      applicationCategory: 'AutomotiveApplication',
      operatingSystem: 'Web',
      browserRequirements: 'Requires a modern browser with WebGL.',
      isAccessibleForFree: true,
      description:
        'Explore your Boxster or Cayman in 3D, look up generation-specific fault codes and torque specs, keep a full service history, plan maintenance, and let an AI assistant manage it over MCP.',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      featureList: [
        'Interactive 3D model (X-ray & cutaways)',
        'Generation-specific fault finding and specs',
        'Part numbers and torque specs',
        'Service history logging',
        'Maintenance planning',
        'AI assistant integration (MCP)',
      ],
      author: {
        '@type': 'Organization',
        name: 'Themis Grove LLC',
        url: SITE_URL,
      },
      license: 'https://github.com/dmitry-grechko/flat-six',
      codeRepository: 'https://github.com/dmitry-grechko/flat-six',
    },
    {
      '@type': 'FAQPage',
      '@id': `${SITE_URL}/#faq`,
      mainEntity: LANDING_FAQ.map((item) => ({
        '@type': 'Question',
        name: item.q,
        acceptedAnswer: { '@type': 'Answer', text: item.a },
      })),
    },
  ],
};

export default function Home() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
      <Landing />
    </>
  );
}
