import Link from 'next/link';
import MarketingShell from './MarketingShell';
import { GARAGE, mono, RED, sans } from './tokens';
import type { GenerationHubData } from '@/lib/marketing/generations';

export default function ModelPageLayout({ data }: { data: GenerationHubData }) {
  return (
    <MarketingShell active="models">
      <section style={{ position: 'relative', overflow: 'hidden', borderBottom: '1px solid #141416' }}>
        <div
          aria-hidden
          style={{
            position: 'absolute',
            right: -40,
            top: -40,
            font: `700 400px/.8 ${mono}`,
            color: '#0E0E10',
            letterSpacing: '-.05em',
            userSelect: 'none',
            pointerEvents: 'none',
          }}
        >
          {data.code}
        </div>
        <div
          style={{
            position: 'absolute',
            left: '52%',
            top: -160,
            width: 900,
            height: 600,
            background: 'radial-gradient(circle,rgba(213,0,28,.16),transparent 62%)',
            pointerEvents: 'none',
          }}
        />
        <div
          className="featureHero"
          style={{
            position: 'relative',
            maxWidth: 1200,
            margin: '0 auto',
            padding: '80px 28px 84px',
            display: 'grid',
            gridTemplateColumns: '1.02fr .98fr',
            gap: 56,
            alignItems: 'center',
          }}
        >
          <div style={{ animation: 'fadeUp .5s ease both' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 20 }}>
              <Link href="/" style={{ font: `500 13px/1 ${sans}`, color: '#6E6E73', textDecoration: 'none' }}>
                Models
              </Link>
              <span style={{ color: '#3A3A3F' }}>/</span>
              <span style={{ font: `500 13px/1 ${mono}`, letterSpacing: '.06em', color: RED }}>{data.code}</span>
            </div>
            <h1 style={{ margin: 0, font: `300 50px/1.08 ${sans}`, letterSpacing: '-.022em', color: '#fff' }}>{data.title}</h1>
            <p style={{ maxWidth: 490, margin: '24px 0 0', font: `400 17px/1.7 ${sans}`, color: '#9E9EA3' }}>{data.intro}</p>
            <div style={{ marginTop: 32 }}>
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
                Add a {data.code} to your garage <span style={{ fontFamily: mono }}>→</span>
              </Link>
            </div>
          </div>
          <div style={{ animation: 'fadeUp .6s ease both' }}>
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
                <span style={{ font: `500 12px/1 ${mono}`, letterSpacing: '.05em', color: '#8A8A8F' }}>{data.heroKicker}</span>
              </div>
              <div style={{ padding: 24 }}>
                <img
                  src={data.heroImage}
                  alt={`${data.code} 3D view`}
                  style={{ width: '100%', display: 'block', borderRadius: 6, filter: 'drop-shadow(0 20px 30px rgba(0,0,0,.5))' }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '8px 28px' }}>
        <div className="modelFacts" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 0, border: '1px solid #232327', borderRadius: 12, overflow: 'hidden', background: '#0E0E10' }}>
          {data.facts.map((f, i) => (
            <div key={f.k} style={{ padding: '22px 24px', borderRight: i < 3 ? '1px solid #232327' : undefined }}>
              <div style={{ font: `500 13px/1 ${sans}`, letterSpacing: '.02em', color: '#76767B', marginBottom: 10 }}>{f.k}</div>
              <div style={{ font: `400 18px/1.25 ${sans}`, color: '#fff' }}>{f.v}</div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '80px 28px 40px' }}>
        <h2 style={{ margin: '0 0 12px', font: `300 32px/1.14 ${sans}`, letterSpacing: '-.02em', color: '#fff' }}>{data.knowsTitle}</h2>
        <p style={{ margin: '0 0 40px', maxWidth: 600, font: `400 16px/1.65 ${sans}`, color: '#8A8A8F' }}>{data.knowsIntro}</p>
        <div className="modelKnows" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 18 }}>
          {data.knows.map((k) => (
            <Link
              key={k.href}
              href={k.href}
              className="darkCardHover"
              style={{
                display: 'block',
                background: '#121214',
                border: '1px solid #232327',
                borderRadius: 12,
                padding: 24,
                textDecoration: 'none',
                transition: 'border-color .2s, transform .2s',
              }}
            >
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(213,0,28,.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: RED }} />
              </div>
              <h3 style={{ margin: '0 0 8px', font: `500 17px/1.25 ${sans}`, color: '#fff' }}>{k.title}</h3>
              <p style={{ margin: 0, font: `400 14px/1.6 ${sans}`, color: '#8A8A8F' }}>{k.body}</p>
            </Link>
          ))}
        </div>
      </section>

      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 28px' }}>
        <h2 style={{ margin: '0 0 28px', font: `300 30px/1.14 ${sans}`, letterSpacing: '-.02em', color: '#fff' }}>{data.variantsTitle}</h2>
        <div className="twoCol" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {data.variants.map((v) => (
            <div key={v.code} style={{ background: '#121214', border: '1px solid #232327', borderRadius: 12, padding: '28px 30px', display: 'flex', gap: 22, alignItems: 'flex-start' }}>
              <div style={{ flex: 'none' }}>
                <div style={{ font: `700 26px/1 ${mono}`, color: RED }}>{v.code}</div>
                <div style={{ marginTop: 8, font: `500 12px/1 ${mono}`, color: '#76767B' }}>{v.years}</div>
              </div>
              <div>
                <div style={{ font: `500 17px/1.3 ${sans}`, color: '#fff', marginBottom: 8 }}>{v.name}</div>
                <p style={{ margin: 0, font: `400 15px/1.65 ${sans}`, color: '#8A8A8F' }}>{v.note}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ borderTop: '1px solid #141416', borderBottom: '1px solid #141416', background: '#08080A', marginTop: 44 }}>
        <div className="twoCol" style={{ maxWidth: 1200, margin: '0 auto', padding: '72px 28px', display: 'grid', gridTemplateColumns: '.9fr 1.1fr', gap: 48, alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: '0 0 12px', font: `300 30px/1.14 ${sans}`, letterSpacing: '-.02em', color: '#fff' }}>{data.modelTitle}</h2>
            <p style={{ margin: '0 0 26px', maxWidth: 440, font: `400 16px/1.65 ${sans}`, color: '#8A8A8F' }}>{data.modelIntro}</p>
            <Link href="/features/xray" style={{ font: `600 15px/1 ${sans}`, color: '#fff', textDecoration: 'none' }}>
              Explore the 3D viewer <span style={{ fontFamily: mono, color: RED }}>→</span>
            </Link>
          </div>
          <div
            style={{
              background: 'radial-gradient(120% 110% at 55% 28%,#202024,#0C0C0E)',
              border: '1px solid #232327',
              borderRadius: 12,
              overflow: 'hidden',
              boxShadow: '0 28px 64px rgba(0,0,0,.45)',
            }}
          >
            <div style={{ height: 44, borderBottom: '1px solid #232327', display: 'flex', alignItems: 'center', gap: 10, padding: '0 16px' }}>
              <span style={{ width: 9, height: 9, borderRadius: '50%', background: RED }} />
              <span style={{ font: `500 12px/1 ${mono}`, letterSpacing: '.05em', color: '#8A8A8F' }}>{data.modelKicker}</span>
            </div>
            <div style={{ padding: '28px 24px' }}>
              <img
                src={data.modelImage}
                alt={`${data.code} 3D model`}
                style={{ width: '100%', display: 'block', borderRadius: 6, filter: 'drop-shadow(0 20px 30px rgba(0,0,0,.5))' }}
              />
            </div>
          </div>
        </div>
      </section>

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
          <h2 style={{ margin: 0, font: `300 42px/1.1 ${sans}`, letterSpacing: '-.02em', color: '#fff' }}>{data.ctaTitle}</h2>
          <p style={{ margin: '22px auto 0', maxWidth: 520, font: `400 17px/1.7 ${sans}`, color: '#9E9EA3' }}>{data.ctaBody}</p>
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
