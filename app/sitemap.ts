import type { MetadataRoute } from 'next';
import {
  allCodeParams,
  allGuideParams,
  MARKETING_GENERATIONS,
} from '@/lib/marketing/content';
import { FEATURE_PAGES } from '@/lib/marketing/features';

const SITE_URL = 'https://www.flat-six.org';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE_URL}/legal`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/guides`, lastModified: now, changeFrequency: 'weekly', priority: 0.85 },
    { url: `${SITE_URL}/codes`, lastModified: now, changeFrequency: 'weekly', priority: 0.85 },
  ];

  for (const feature of FEATURE_PAGES) {
    entries.push({
      url: `${SITE_URL}/features/${feature.slug}`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.85,
    });
  }

  for (const generation of MARKETING_GENERATIONS) {
    entries.push({
      url: `${SITE_URL}/${generation}`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.9,
    });
    entries.push({
      url: `${SITE_URL}/codes/${generation}`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    });
  }

  for (const { generation, slug } of allGuideParams()) {
    entries.push({
      url: `${SITE_URL}/guides/${generation}/${slug}`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.75,
    });
  }

  for (const { generation, code } of allCodeParams()) {
    entries.push({
      url: `${SITE_URL}/codes/${generation}/${code}`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.65,
    });
  }

  return entries;
}
