import Link from 'next/link';
import { notFound } from 'next/navigation';
import MarketingShell from '@/components/marketing/MarketingShell';
import Markdown from '@/components/marketing/Markdown';
import CtaBand from '@/components/marketing/CtaBand';
import { PageHero, Section } from '@/components/marketing/layout';
import { allGuideParams, findArticle, generationLabel, isMarketingGeneration } from '@/lib/marketing/content';
import { pageMetadata } from '@/lib/marketing/seo';
import { cardStyle, chipDark, mono, SITE_URL } from '@/components/marketing/tokens';

export function generateStaticParams() {
  return allGuideParams();
}

export function generateMetadata({ params }: { params: { generation: string; slug: string } }) {
  const article = findArticle(params.generation, params.slug);
  if (!article || !isMarketingGeneration(params.generation)) return {};
  return pageMetadata({
    title: article.title,
    description: `${article.title} — ${params.generation} Boxster & Cayman guide.`,
    path: `/guides/${params.generation}/${params.slug}`,
    type: 'article',
  });
}

/** Drop the leading "# Title" — the hero already shows it. */
function stripLeadingHeading(body: string): string {
  return body.replace(/^\s*#\s+.*(?:\r?\n)+/, '');
}

export default function GuidePage({ params }: { params: { generation: string; slug: string } }) {
  const { generation, slug } = params;
  if (!isMarketingGeneration(generation)) notFound();
  const article = findArticle(generation, slug);
  if (!article) notFound();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.body.slice(0, 200),
    url: `${SITE_URL}/guides/${generation}/${slug}`,
    about: `${generation} Boxster Cayman`,
    keywords: article.tags.join(', '),
  };

  return (
    <MarketingShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <PageHero
        size="md"
        breadcrumb={[
          { href: '/', label: 'HOME' },
          { href: '/guides', label: 'GUIDES' },
          { href: `/${generation}`, label: `PORSCHE ${generation}` },
        ]}
        kicker="GUIDE"
        title={article.title}
        chips={
          <>
            <span style={{ ...chipDark, color: '#8A8A90' }}>{generationLabel(generation)}</span>
            {article.tags.slice(0, 4).map((t) => (
              <span key={t} style={chipDark}>
                {t}
              </span>
            ))}
          </>
        }
      />

      <Section width="narrow" pad="48px 28px 8px">
        <article style={{ ...cardStyle, padding: '36px 34px' }}>
          <Markdown source={stripLeadingHeading(article.body)} />
        </article>
        <div style={{ marginTop: 24, display: 'flex', gap: 18, flexWrap: 'wrap' }}>
          <Link href={`/${generation}`} style={{ font: `500 12px/1 ${mono}`, color: '#D5001C', textDecoration: 'none' }}>← {generation} hub</Link>
          <Link href="/guides" style={{ font: `500 12px/1 ${mono}`, color: '#6E6E73', textDecoration: 'none' }}>All guides</Link>
          <Link href={`/codes/${generation}`} style={{ font: `500 12px/1 ${mono}`, color: '#6E6E73', textDecoration: 'none' }}>{generation} fault codes</Link>
        </div>
      </Section>

      <CtaBand />
    </MarketingShell>
  );
}
