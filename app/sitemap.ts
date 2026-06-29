import type { MetadataRoute } from 'next';

const SITE_URL = 'https://www.flat-six.org';

// Only the public, indexable pages. The app itself (/garage, /history, /plans,
// /faults, /settings) is behind auth and intentionally excluded.
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    {
      url: `${SITE_URL}/`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${SITE_URL}/legal`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ];
}
