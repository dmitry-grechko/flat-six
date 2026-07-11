'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { KnowledgeArticle } from '@/lib/knowledge';
import { GITHUB_ISSUES, mono, RED, sans } from '@/components/marketing/tokens';

const CATEGORIES = ['All', 'Maintenance', 'Engine', 'Cooling', 'Brakes', 'Drivetrain', 'Wheels & tyres'] as const;

function articleCategory(article: KnowledgeArticle): string {
  const tags = article.tags.map((t) => t.toLowerCase());
  if (tags.some((t) => t.includes('brake'))) return 'Brakes';
  if (tags.some((t) => t.includes('cool') || t.includes('coolant') || t.includes('water'))) return 'Cooling';
  if (tags.some((t) => t.includes('engine') || t.includes('oil') || t.includes('ims') || t.includes('plug'))) return 'Engine';
  if (tags.some((t) => t.includes('pdk') || t.includes('clutch') || t.includes('trans'))) return 'Drivetrain';
  if (tags.some((t) => t.includes('wheel') || t.includes('tyre') || t.includes('tire') || t.includes('align'))) return 'Wheels & tyres';
  if (tags.some((t) => t.includes('maint') || t.includes('service') || t.includes('fluid'))) return 'Maintenance';
  return 'Maintenance';
}

function articleLevel(article: KnowledgeArticle): string {
  const t = article.title.toLowerCase();
  if (t.includes('ims') || t.includes('coolant pipe') || t.includes('centre coolant')) return 'Hard';
  if (t.includes('plug') || t.includes('aos') || t.includes('pdk') || t.includes('pump')) return 'Moderate';
  if (t.includes('fitment') || t.includes('alignment') || t.includes('spec')) return 'Reference';
  return 'Easy';
}

export default function GuidesIndex({ articles }: { articles: { generation: string; article: KnowledgeArticle }[] }) {
  const [cat, setCat] = useState<(typeof CATEGORIES)[number]>('All');

  const guides = useMemo(() => {
    const mapped = articles.map(({ generation, article }) => ({
      generation,
      href: `/guides/${generation}/${article.id}`,
      title: article.title,
      desc: article.body.slice(0, 120).trim() + (article.body.length > 120 ? '…' : ''),
      cat: articleCategory(article),
      level: articleLevel(article),
      gen: generation,
      time: article.tags.includes('reference') ? 'Reference' : 'Guide',
    }));
    if (cat === 'All') return mapped;
    return mapped.filter((g) => g.cat === cat);
  }, [articles, cat]);

  return (
    <>
      <section style={{ position: 'relative', overflow: 'hidden', borderBottom: '1px solid #141416' }}>
        <div style={{ position: 'absolute', left: '50%', top: -150, transform: 'translateX(-50%)', width: 900, height: 520, background: 'radial-gradient(circle,rgba(213,0,28,.15),transparent 62%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', maxWidth: 1200, margin: '0 auto', padding: '80px 28px 56px', animation: 'fadeUp .5s ease both' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 20 }}>
            <span style={{ width: 24, height: 2, background: RED }} />
            <span style={{ font: `500 13px/1 ${sans}`, letterSpacing: '.14em', color: RED }}>Guides</span>
          </div>
          <h1 style={{ margin: 0, font: `300 50px/1.08 ${sans}`, letterSpacing: '-.022em', color: '#fff', maxWidth: 760 }}>
            DIY guides, written for these cars.
          </h1>
          <p style={{ maxWidth: 600, margin: '24px 0 0', font: `400 17px/1.7 ${sans}`, color: '#9E9EA3' }}>
            Generation-scoped articles on engines, fluids, transmissions, and common issues — the same knowledge that powers fault finding and the AI assistant.
          </p>
        </div>
      </section>

      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 28px 90px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap', marginBottom: 28 }}>
          <div className="guideFilters" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCat(c)}
                style={{
                  font: `500 13px/1 ${sans}`,
                  padding: '9px 15px',
                  borderRadius: 20,
                  cursor: 'pointer',
                  transition: 'all .15s',
                  border: `1px solid ${cat === c ? RED : '#2A2A2E'}`,
                  background: cat === c ? RED : 'transparent',
                  color: cat === c ? '#fff' : '#C9C9CD',
                }}
              >
                {c}
              </button>
            ))}
          </div>
          <div style={{ font: `500 13px/1 ${mono}`, color: '#6E6E73' }}>{guides.length} guides</div>
        </div>

        <div className="guidesGrid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 18 }}>
          {guides.map((g) => (
            <Link
              key={g.href}
              href={g.href}
              className="darkCardHover"
              style={{
                display: 'flex',
                flexDirection: 'column',
                background: '#121214',
                border: '1px solid #232327',
                borderRadius: 12,
                padding: '24px 24px 22px',
                textDecoration: 'none',
                transition: 'border-color .2s, transform .2s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 16 }}>
                <span style={{ font: `600 11px/1 ${mono}`, letterSpacing: '.06em', color: RED, background: 'rgba(213,0,28,.13)', padding: '5px 8px', borderRadius: 3 }}>{g.cat}</span>
                <span style={{ font: `500 11px/1 ${mono}`, letterSpacing: '.06em', color: '#9A9AA0', background: '#1E1E22', padding: '5px 8px', borderRadius: 3 }}>{g.level}</span>
              </div>
              <h3 style={{ margin: '0 0 9px', font: `500 18px/1.28 ${sans}`, color: '#fff' }}>{g.title}</h3>
              <p style={{ margin: '0 0 18px', font: `400 14px/1.6 ${sans}`, color: '#8A8A8F' }}>{g.desc}</p>
              <div style={{ marginTop: 'auto', paddingTop: 16, borderTop: '1px solid #202024', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <span style={{ font: `500 12px/1 ${mono}`, color: '#76767B' }}>{g.gen}</span>
                <span style={{ font: `500 12px/1 ${mono}`, color: '#9A9AA0' }}>{g.time}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section style={{ borderTop: '1px solid #141416', background: '#08080A' }}>
        <div className="twoCol" style={{ maxWidth: 1200, margin: '0 auto', padding: '72px 28px', display: 'grid', gridTemplateColumns: '1.2fr .8fr', gap: 48, alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: '0 0 16px', font: `300 32px/1.14 ${sans}`, letterSpacing: '-.02em', color: '#fff' }}>Done a job? Write it up.</h2>
            <p style={{ margin: 0, maxWidth: 520, font: `400 16px/1.7 ${sans}`, color: '#9A9AA0' }}>
              The best guides come from owners who&apos;ve actually turned the wrenches. If you&apos;ve done a job on your car, turn it into a guide the next owner can follow.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <a href={GITHUB_ISSUES} target="_blank" rel="noopener noreferrer" className="cta" style={{ height: 48, display: 'inline-flex', alignItems: 'center', gap: 9, padding: '0 22px', background: RED, color: '#fff', borderRadius: 3, font: `600 15px/1 ${sans}`, textDecoration: 'none' }}>
              Contribute a guide <span style={{ fontFamily: mono }}>→</span>
            </a>
            <Link href="/about" className="ghostDark" style={{ height: 48, display: 'inline-flex', alignItems: 'center', padding: '0 22px', background: 'transparent', color: '#D6D6DA', border: '1px solid #313135', borderRadius: 3, font: `600 15px/1 ${sans}`, textDecoration: 'none' }}>
              About the project
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
