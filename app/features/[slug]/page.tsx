import { notFound } from 'next/navigation';
import FeaturePageLayout from '@/components/marketing/FeaturePageLayout';
import { FEATURE_PAGES, getFeature } from '@/lib/marketing/features';
import { pageMetadata } from '@/lib/marketing/seo';

export function generateStaticParams() {
  return FEATURE_PAGES.map((f) => ({ slug: f.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }) {
  const feature = getFeature(params.slug);
  if (!feature) return {};
  return pageMetadata({
    title: feature.title,
    description: feature.description,
    path: `/features/${feature.slug}`,
  });
}

export default function FeaturePage({ params }: { params: { slug: string } }) {
  const feature = getFeature(params.slug);
  if (!feature) notFound();
  return <FeaturePageLayout feature={feature} />;
}
