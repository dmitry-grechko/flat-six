import Link from 'next/link';
import { notFound } from 'next/navigation';
import MarketingShell from '@/components/marketing/MarketingShell';
import CtaBand from '@/components/marketing/CtaBand';
import { PageHero, Section } from '@/components/marketing/layout';
import { allCodeParams, findFaultCode, generationLabel, isMarketingGeneration } from '@/lib/marketing/content';
import { pageMetadata } from '@/lib/marketing/seo';
import { bodyStyle, cardStyle, mono, severityColor, SITE_URL } from '@/components/marketing/tokens';

export function generateStaticParams() {
  return allCodeParams();
}

export function generateMetadata({ params }: { params: { generation: string; code: string } }) {
  const fault = findFaultCode(params.generation, params.code);
  if (!fault || !isMarketingGeneration(params.generation)) return {};
  return pageMetadata({
    title: `${fault.code} — ${fault.title}`,
    description: `${fault.code} on ${params.generation}: ${fault.description.slice(0, 140)}`,
    path: `/codes/${params.generation}/${params.code.toLowerCase()}`,
    type: 'article',
  });
}

function ListSection({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div style={{ marginTop: 28 }}>
      <h2 style={{ margin: 0, font: `500 11px/1 ${mono}`, letterSpacing: '.14em', color: '#9A9AA0' }}>{title}</h2>
      <ul style={{ margin: '12px 0 0', paddingLeft: 20, ...bodyStyle }}>
        {items.map((item) => (
          <li key={item} style={{ marginBottom: 8 }}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

export default function CodeDetailPage({ params }: { params: { generation: string; code: string } }) {
  const { generation, code } = params;
  if (!isMarketingGeneration(generation)) notFound();
  const fault = findFaultCode(generation, code);
  if (!fault) notFound();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: `${fault.code} — ${fault.title}`,
    description: fault.description,
    url: `${SITE_URL}/codes/${generation}/${code.toLowerCase()}`,
    about: `${generation} ${fault.system}`,
  };

  const sevColor = severityColor(fault.severity);

  return (
    <MarketingShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <PageHero
        size="md"
        breadcrumb={[
          { href: '/', label: 'HOME' },
          { href: `/${generation}`, label: `PORSCHE ${generation}` },
          { href: `/codes/${generation}`, label: 'FAULT CODES' },
          { label: fault.code },
        ]}
        kicker={`${generation} · ${fault.system}`}
        title={fault.code}
        lead={fault.title}
        chips={
          <span style={{ font: `600 10px/1 ${mono}`, letterSpacing: '.1em', color: sevColor, border: `1px solid ${sevColor}`, padding: '7px 11px', borderRadius: 2 }}>
            {fault.severity} SEVERITY
          </span>
        }
      />

      <Section width="narrow" pad="48px 28px 8px">
        <article style={{ ...cardStyle, padding: '30px 28px' }}>
          <p style={{ ...bodyStyle, margin: 0, fontSize: 16, color: '#3A3A3E' }}>{fault.description}</p>
          <ListSection title="SYMPTOMS" items={fault.symptoms} />
          <ListSection title="LIKELY CAUSES" items={fault.causes} />
          <ListSection title="DIAGNOSIS STEPS" items={fault.diagnosis} />
          {fault.relatedParts && fault.relatedParts.length > 0 && (
            <ListSection title="RELATED PARTS" items={fault.relatedParts} />
          )}
        </article>
        <div style={{ marginTop: 24, display: 'flex', gap: 18, flexWrap: 'wrap' }}>
          <Link href={`/codes/${generation}`} style={{ font: `500 12px/1 ${mono}`, color: '#D5001C', textDecoration: 'none' }}>← All {generation} codes</Link>
          <Link href={`/${generation}`} style={{ font: `500 12px/1 ${mono}`, color: '#6E6E73', textDecoration: 'none' }}>{generation} hub</Link>
          <Link href="/features/fault-finding" style={{ font: `500 12px/1 ${mono}`, color: '#6E6E73', textDecoration: 'none' }}>Fault finding</Link>
        </div>
      </Section>

      <CtaBand
        title="Rank symptoms to causes in your garage."
        body="Sign in for the full fault finder — ranked causes and known issues for your exact car."
      />
    </MarketingShell>
  );
}
