import Landing from '@/components/home/Landing';

const SITE_URL = 'https://www.flat-six.org';

// Structured data so search engines understand what FLAT·SIX is: a free,
// open-source web app for Porsche 981 maintenance.
const JSON_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      url: SITE_URL,
      name: 'FLAT·SIX',
      description:
        'A free, open-source garage for the Porsche 981 Boxster & Cayman: 3D inspector, real part numbers and torque specs, service history, maintenance plans and an AI assistant.',
      inLanguage: 'en',
    },
    {
      '@type': 'WebApplication',
      '@id': `${SITE_URL}/#app`,
      name: 'FLAT·SIX — 981 Garage',
      url: SITE_URL,
      applicationCategory: 'AutomotiveApplication',
      operatingSystem: 'Web',
      browserRequirements: 'Requires a modern browser with WebGL.',
      isAccessibleForFree: true,
      description:
        'Explore your Porsche 981 in 3D and factory cutaways, look up part numbers and torque specs, keep a full service history, plan maintenance, and let an AI assistant manage it over MCP.',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      featureList: [
        'Interactive 3D model and factory cutaways',
        'Real OEM part numbers and torque specs',
        'Service history logging',
        'Maintenance planning',
        'Fault finding',
        'AI assistant integration (MCP)',
      ],
      author: {
        '@type': 'Person',
        name: 'Dmitry Grechko',
        url: 'https://github.com/dmitry-grechko',
      },
      license: 'https://github.com/dmitry-grechko/flat-six',
      codeRepository: 'https://github.com/dmitry-grechko/flat-six',
    },
  ],
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />
      <Landing />
    </>
  );
}
