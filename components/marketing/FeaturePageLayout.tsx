import Link from 'next/link';
import MarketingShell from './MarketingShell';
import { GARAGE, mono, RED, sans } from './tokens';
import type { FeaturePage } from '@/lib/marketing/features';

function tagStyle(tagType?: string): React.CSSProperties {
  const base: React.CSSProperties = {
    font: `600 11px/1 ${mono}`,
    letterSpacing: '.06em',
    padding: '5px 8px',
    borderRadius: 3,
    flex: 'none',
  };
  if (tagType === 'HIGH') return { ...base, background: RED, color: '#fff' };
  if (tagType === 'MED') return { ...base, background: '#7A2A30', color: '#E7A6AC' };
  if (tagType === 'LOW') return { ...base, background: '#2A2A2F', color: '#9A9AA0' };
  if (tagType === 'done') return { ...base, background: RED, color: '#fff' };
  return { ...base, background: 'rgba(213,0,28,.14)', color: RED };
}

function HeroVisual({ feature }: { feature: FeaturePage }) {
  if (feature.heroImage) {
    return (
      <div
        style={{
          background: 'radial-gradient(120% 110% at 55% 28%,#202024,#0C0C0E)',
          border: '1px solid #232327',
          borderRadius: 12,
          overflow: 'hidden',
          boxShadow: '0 34px 80px rgba(0,0,0,.55)',
        }}
      >
        <div style={{ height: 44, borderBottom: '1px solid #232327', display: 'flex', alignItems: 'center', gap: 10, padding: '0 16px' }}>
          <span style={{ width: 9, height: 9, borderRadius: '50%', background: RED }} />
          <span style={{ font: `500 12px/1 ${mono}`, letterSpacing: '.05em', color: '#8A8A8F' }}>{feature.heroKicker}</span>
        </div>
        <div style={{ padding: 22 }}>
          <img src={feature.heroImage} alt={feature.headline} style={{ width: '100%', display: 'block', borderRadius: 6, filter: 'drop-shadow(0 20px 30px rgba(0,0,0,.5))' }} />
        </div>
      </div>
    );
  }

  const list = feature.heroList ?? [];
  return (
    <div style={{ background: '#0E0E10', border: '1px solid #232327', borderRadius: 12, overflow: 'hidden', boxShadow: '0 30px 70px rgba(0,0,0,.5)' }}>
      <div style={{ height: 44, borderBottom: '1px solid #202024', display: 'flex', alignItems: 'center', gap: 10, padding: '0 16px' }}>
        <span style={{ width: 9, height: 9, borderRadius: '50%', background: RED }} />
        <span style={{ font: `500 12px/1 ${mono}`, letterSpacing: '.05em', color: '#8A8A8F' }}>{feature.heroKicker}</span>
      </div>
      <div style={{ padding: '10px 18px 16px' }}>
        {list.map((row, i) => {
          const tag = tagStyle(row.tagType ?? row.tag);
          return (
            <div
              key={row.name}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '14px 0',
                borderTop: i > 0 ? '1px solid #1A1A1E' : undefined,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ font: `400 15px/1.25 ${sans}`, color: '#EDEDEF' }}>{row.name}</div>
                <div style={{ marginTop: 4, font: `500 12px/1.3 ${mono}`, color: '#6E6E73' }}>{row.sub}</div>
              </div>
              <span style={tagStyle(row.tagType ?? row.tag)}>{row.tag}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function FeaturePageLayout({ feature }: { feature: FeaturePage }) {
  const highlightCols = feature.highlights.length === 4 ? 4 : 3;

  return (
    <MarketingShell active="features">
      <section style={{ position: 'relative', overflow: 'hidden', borderBottom: '1px solid #141416' }}>
        <div
          style={{
            position: 'absolute',
            left: '54%',
            top: -160,
            width: 900,
            height: 640,
            background: 'radial-gradient(circle,rgba(213,0,28,.17),transparent 62%)',
            pointerEvents: 'none',
          }}
        />
        <div
          className="featureHero"
          style={{
            position: 'relative',
            maxWidth: 1200,
            margin: '0 auto',
            padding: '80px 28px 88px',
            display: 'grid',
            gridTemplateColumns: '1.02fr .98fr',
            gap: 56,
            alignItems: 'center',
          }}
        >
          <div style={{ animation: 'fadeUp .5s ease both' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 20 }}>
              <Link href="/#features" style={{ font: `500 13px/1 ${sans}`, color: '#6E6E73', textDecoration: 'none' }}>
                Features
              </Link>
              <span style={{ color: '#3A3A3F' }}>/</span>
              <span style={{ font: `500 13px/1 ${sans}`, letterSpacing: '.06em', color: RED }}>{feature.eyebrow}</span>
            </div>
            <h1 style={{ margin: 0, font: `300 50px/1.08 ${sans}`, letterSpacing: '-.022em', color: '#fff' }}>{feature.headline}</h1>
            <p style={{ maxWidth: 490, margin: '24px 0 0', font: `400 17px/1.7 ${sans}`, color: '#9E9EA3' }}>{feature.description}</p>
            <div style={{ marginTop: 32, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              <Link
                href={GARAGE}
                className="cta"
                style={{
                  height: 50,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '0 26px',
                  background: RED,
                  color: '#fff',
                  borderRadius: 3,
                  font: `600 15px/1 ${sans}`,
                  textDecoration: 'none',
                }}
              >
                Start your garage <span style={{ fontFamily: mono }}>→</span>
              </Link>
              <Link
                href={feature.secHref ?? '/#features'}
                className="ghostDark"
                style={{
                  height: 50,
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '0 24px',
                  background: 'transparent',
                  color: '#D6D6DA',
                  border: '1px solid #313135',
                  borderRadius: 3,
                  font: `600 15px/1 ${sans}`,
                  textDecoration: 'none',
                }}
              >
                {feature.secLabel ?? 'Back to features'}
              </Link>
            </div>
          </div>
          <div style={{ animation: 'fadeUp .6s ease both' }}>
            <HeroVisual feature={feature} />
          </div>
        </div>
      </section>

      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '86px 28px 40px' }}>
        <h2 style={{ margin: '0 0 12px', font: `300 32px/1.14 ${sans}`, letterSpacing: '-.02em', color: '#fff' }}>{feature.highlightsTitle}</h2>
        <p style={{ margin: '0 0 40px', maxWidth: 560, font: `400 16px/1.65 ${sans}`, color: '#8A8A8F' }}>{feature.highlightsIntro}</p>
        <div className="featureHighlights" style={{ display: 'grid', gridTemplateColumns: `repeat(${highlightCols},1fr)`, gap: 18 }}>
          {feature.highlights.map((h) => (
            <div key={h.title} className="darkCardHover" style={{ background: '#121214', border: '1px solid #232327', borderRadius: 12, padding: '26px 26px 28px' }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(213,0,28,.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: RED }} />
              </div>
              <h3 style={{ margin: '0 0 9px', font: `500 18px/1.25 ${sans}`, color: '#fff' }}>{h.title}</h3>
              <p style={{ margin: 0, font: `400 15px/1.65 ${sans}`, color: '#8A8A8F' }}>{h.body}</p>
            </div>
          ))}
        </div>
      </section>

      {feature.details.map((d, i) => (
        <section key={d.title} style={{ maxWidth: 1200, margin: '0 auto', padding: '44px 28px' }}>
          <div className="featureDetail" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 52, alignItems: 'center' }}>
            <div style={{ order: i % 2 === 1 ? 2 : 1 }}>
              <div style={{ font: `500 13px/1 ${sans}`, letterSpacing: '.12em', color: RED, marginBottom: 15 }}>{d.eyebrow}</div>
              <h3 style={{ margin: '0 0 16px', font: `400 27px/1.18 ${sans}`, color: '#fff' }}>{d.title}</h3>
              <p style={{ margin: 0, maxWidth: 460, font: `400 16px/1.7 ${sans}`, color: '#9A9AA0' }}>{d.body}</p>
              {d.bullets && (
                <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {d.bullets.map((b) => (
                    <div key={b} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, font: `400 15px/1.5 ${sans}`, color: '#C9C9CD' }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: RED, flex: 'none', marginTop: 7 }} />
                      {b}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ order: i % 2 === 1 ? 1 : 2 }}>
              {d.image && (
                <div style={{ background: 'radial-gradient(120% 120% at 55% 30%,#1C1C20,#0C0C0E)', border: '1px solid #232327', borderRadius: 12, overflow: 'hidden', padding: 20 }}>
                  <img src={d.image} alt={d.title} style={{ width: '100%', display: 'block', borderRadius: 6 }} />
                </div>
              )}
              {d.specs && (
                <div style={{ background: '#0E0E10', border: '1px solid #232327', borderRadius: 12, overflow: 'hidden' }}>
                  <div style={{ height: 42, borderBottom: '1px solid #202024', display: 'flex', alignItems: 'center', gap: 9, padding: '0 15px' }}>
                    <span style={{ width: 9, height: 9, borderRadius: '50%', background: RED }} />
                    <span style={{ font: `500 12px/1 ${mono}`, letterSpacing: '.05em', color: '#8A8A8F' }}>{d.specTitle}</span>
                  </div>
                  <div style={{ padding: '6px 18px 12px' }}>
                    {d.specs.map((s, si) => (
                      <div
                        key={s.k}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 16,
                          padding: '13px 0',
                          borderTop: si > 0 ? '1px solid #1A1A1E' : undefined,
                        }}
                      >
                        <span style={{ font: `400 14px/1.3 ${sans}`, color: '#9A9AA0' }}>{s.k}</span>
                        <span style={{ font: `500 13px/1.3 ${mono}`, color: '#EDEDEF', textAlign: 'right' }}>{s.v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      ))}

      {feature.gen && feature.gen.length > 0 && (
        <section style={{ borderTop: '1px solid #141416', borderBottom: '1px solid #141416', background: '#08080A', marginTop: 44 }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', padding: '64px 28px' }}>
            <h2 style={{ margin: '0 0 32px', font: `300 30px/1.14 ${sans}`, letterSpacing: '-.02em', color: '#fff' }}>{feature.genTitle}</h2>
            <div className="twoCol" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              {feature.gen.map((g) => (
                <div key={g.code} style={{ background: '#121214', border: '1px solid #232327', borderRadius: 12, padding: '26px 28px', display: 'flex', gap: 20, alignItems: 'flex-start' }}>
                  <div style={{ font: `700 30px/1 ${mono}`, color: RED, flex: 'none' }}>{g.code}</div>
                  <div>
                    <div style={{ font: `500 16px/1.3 ${sans}`, color: '#fff', marginBottom: 7 }}>{g.name}</div>
                    <p style={{ margin: 0, font: `400 15px/1.65 ${sans}`, color: '#8A8A8F' }}>{g.note}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <section style={{ position: 'relative', overflow: 'hidden', borderTop: '1px solid #141416' }}>
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%,-50%)',
            width: 1000,
            height: 480,
            background: 'radial-gradient(circle,rgba(213,0,28,.16),transparent 60%)',
            pointerEvents: 'none',
          }}
        />
        <div style={{ position: 'relative', maxWidth: 860, margin: '0 auto', padding: '92px 28px', textAlign: 'center' }}>
          <h2 style={{ margin: 0, font: `300 42px/1.1 ${sans}`, letterSpacing: '-.02em', color: '#fff' }}>{feature.ctaTitle}</h2>
          <p style={{ margin: '22px auto 0', maxWidth: 520, font: `400 17px/1.7 ${sans}`, color: '#9E9EA3' }}>{feature.ctaBody}</p>
          <div style={{ marginTop: 32, display: 'flex', justifyContent: 'center' }}>
            <Link
              href={GARAGE}
              className="cta"
              style={{
                height: 54,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 11,
                padding: '0 32px',
                background: RED,
                color: '#fff',
                borderRadius: 3,
                font: `600 16px/1 ${sans}`,
                textDecoration: 'none',
              }}
            >
              Start your garage <span style={{ fontFamily: mono }}>→</span>
            </Link>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
