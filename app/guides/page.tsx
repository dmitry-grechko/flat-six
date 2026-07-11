import MarketingShell from '@/components/marketing/MarketingShell';
import GuidesIndex from '@/components/marketing/GuidesIndex';
import { getArticles } from '@/lib/knowledge';
import { MARKETING_GENERATIONS } from '@/lib/marketing/content';
import { pageMetadata } from '@/lib/marketing/seo';

export const metadata = pageMetadata({
  title: 'Guides',
  description: '987 and 981 Boxster & Cayman maintenance guides — engines, fluids, known issues, PDK vs manual, and more.',
  path: '/guides',
});

export default function GuidesIndexPage() {
  const articles = MARKETING_GENERATIONS.flatMap((generation) =>
    getArticles(generation).map((article) => ({ generation, article })),
  );

  return (
    <MarketingShell active="guides">
      <GuidesIndex articles={articles} />
    </MarketingShell>
  );
}
