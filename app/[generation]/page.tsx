import { notFound } from 'next/navigation';
import ModelPageLayout from '@/components/marketing/ModelPageLayout';
import { GENERATION_HUBS } from '@/lib/marketing/generations';
import { isMarketingGeneration, MARKETING_GENERATIONS, generationLabel } from '@/lib/marketing/content';
import { pageMetadata } from '@/lib/marketing/seo';

export function generateStaticParams() {
  return MARKETING_GENERATIONS.map((generation) => ({ generation }));
}

export function generateMetadata({ params }: { params: { generation: string } }) {
  if (!isMarketingGeneration(params.generation)) return {};
  const label = generationLabel(params.generation);
  return pageMetadata({
    title: `${params.generation} Boxster & Cayman`,
    description: `DIY maintenance tools, fault codes, and guides for the ${label} Boxster and Cayman — scoped to ${params.generation} only.`,
    path: `/${params.generation}`,
  });
}

export default function GenerationHubPage({ params }: { params: { generation: string } }) {
  const { generation } = params;
  if (!isMarketingGeneration(generation)) notFound();

  const data = GENERATION_HUBS[generation];
  if (!data) notFound();

  return <ModelPageLayout data={data} />;
}
