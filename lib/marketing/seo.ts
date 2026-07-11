import type { Metadata } from 'next';
import { SITE_URL } from '@/components/marketing/tokens';

export function pageMetadata({
  title,
  description,
  path,
  type = 'website',
}: {
  title: string;
  description: string;
  path: string;
  type?: 'website' | 'article';
}): Metadata {
  const url = `${SITE_URL}${path}`;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type,
      url,
      title: `${title} · FLAT·SIX`,
      description,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} · FLAT·SIX`,
      description,
    },
  };
}
