import type { MetadataRoute } from 'next';

const SITE_URL = 'https://www.flat-six.org';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Auth-gated app routes, auth flow, OAuth and APIs shouldn't be indexed.
        disallow: ['/garage', '/history', '/plans', '/faults', '/settings', '/auth/', '/api/', '/oauth/'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
