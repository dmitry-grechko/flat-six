import { notFound } from 'next/navigation';
import MarketingShell from '@/components/marketing/MarketingShell';
import CtaBand from '@/components/marketing/CtaBand';
import CodeList from '@/components/marketing/CodeList';
import { PageHero, Section } from '@/components/marketing/layout';
import { getFaultCodes } from '@/lib/knowledge';
import { generationLabel, isMarketingGeneration, MARKETING_GENERATIONS } from '@/lib/marketing/content';
import { pageMetadata } from '@/lib/marketing/seo';
import { chipDark } from '@/components/marketing/tokens';

export function generateStaticParams() {
  return MARKETING_GENERATIONS.map((generation) => ({ generation }));
}

export function generateMetadata({ params }: { params: { generation: string } }) {
  if (!isMarketingGeneration(params.generation)) return {};
  return pageMetadata({
    title: `${params.generation} fault codes`,
    description: `OBD-II fault codes for the ${params.generation} Boxster and Cayman — symptoms, causes, and diagnosis steps.`,
    path: `/codes/${params.generation}`,
  });
}

export default function CodesIndexPage({ params }: { params: { generation: string } }) {
  const { generation } = params;
  if (!isMarketingGeneration(generation)) notFound();
  const codes = getFaultCodes(generation);

  return (
    <MarketingShell>
      <PageHero
        watermark={generation}
        breadcrumb={[{ href: '/', label: 'HOME' }, { href: `/${generation}`, label: generation }, { label: 'FAULT CODES' }]}
        kicker="FAULT CODES"
        title={`${generation} OBD-II codes`}
        lead={`${generationLabel(generation)} — ${codes.length} codes indexed. Sign in for the full fault finder with symptom ranking.`}
        chips={
          <>
            {MARKETING_GENERATIONS.filter((g) => g !== generation).map((g) => (
              <a key={g} href={`/codes/${g}`} style={chipDark}>
                {g} codes
              </a>
            ))}
            <a href={`/${generation}`} style={{ ...chipDark, color: '#fff', borderColor: '#D5001C' }}>
              {generation} hub →
            </a>
          </>
        }
      />

      <Section pad="48px 28px 8px">
        <CodeList generation={generation} codes={codes} />
      </Section>

      <CtaBand
        title="Rank symptoms to causes in your garage."
        body="Sign in for the full fault finder — ranked causes and known issues for your exact car."
      />
    </MarketingShell>
  );
}
