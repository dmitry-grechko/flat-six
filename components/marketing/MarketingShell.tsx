'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  FOOTER_FEATURES,
  NAV_FEATURES,
  NAV_MODELS,
  type NavActive,
} from '@/lib/marketing/nav';
import {
  ctaStyle,
  GARAGE,
  GITHUB_REPO,
  mono,
  pageWrap,
  RED,
  sans,
  SIGN_IN,
} from './tokens';

function navLinkStyle(active: boolean) {
  return {
    position: 'relative' as const,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    height: 68,
    padding: '0 13px',
    font: `500 14px/1 ${sans}`,
    background: 'transparent',
    border: 0,
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
    transition: 'color .15s',
    color: active ? '#fff' : '#9A9AA0',
    boxShadow: active ? 'inset 0 -2px 0 var(--red)' : undefined,
    textDecoration: 'none',
  };
}

export default function MarketingShell({
  children,
  className = '',
  active,
}: {
  children: React.ReactNode;
  className?: string;
  active?: NavActive;
}) {
  const [openMenu, setOpenMenu] = useState<'features' | 'models' | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileOpen]);

  return (
    <div className={`landing ${className}`.trim()} style={pageWrap}>
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          background: 'rgba(11,11,12,.9)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: '1px solid #1C1C1F',
        }}
      >
        <div
          className="landingNav"
          style={{
            maxWidth: 1200,
            margin: '0 auto',
            height: 68,
            padding: '0 28px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 11, textDecoration: 'none' }}>
            <div style={{ width: 13, height: 13, background: RED, flex: 'none' }} />
            <div style={{ font: `700 15px/1 ${mono}`, letterSpacing: '.26em', color: '#fff' }}>FLAT·SIX</div>
          </Link>

          <nav className="landingNavLinks" style={{ marginLeft: 30, display: 'flex', alignItems: 'center', gap: 2 }}>
            <div
              style={{ position: 'relative', height: 68 }}
              onMouseEnter={() => setOpenMenu('features')}
              onMouseLeave={() => setOpenMenu(null)}
            >
              <button type="button" className="navlink" style={navLinkStyle(active === 'features')}>
                Features <span style={{ fontSize: 10, opacity: 0.65, marginTop: 1 }}>▾</span>
              </button>
              {openMenu === 'features' && (
                <div style={{ position: 'absolute', left: -8, top: '100%', paddingTop: 9, zIndex: 120 }}>
                  <div
                    className="navDrop"
                    style={{
                      width: 582,
                      background: '#141416',
                      border: '1px solid #2A2A2E',
                      borderRadius: 14,
                      padding: 10,
                      boxShadow: '0 30px 70px rgba(0,0,0,.6)',
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: 2,
                    }}
                  >
                    {NAV_FEATURES.map((f) => (
                      <Link
                        key={f.href}
                        href={f.href}
                        className="navDropItem"
                        style={{
                          display: 'flex',
                          gap: 12,
                          alignItems: 'flex-start',
                          padding: '11px 13px',
                          borderRadius: 9,
                          transition: 'background .14s',
                          textDecoration: 'none',
                        }}
                      >
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: RED, marginTop: 6, flex: 'none', opacity: 0.85 }} />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ font: `500 15px/1.2 ${sans}`, color: '#fff' }}>{f.name}</div>
                          <div style={{ marginTop: 3, font: `400 13px/1.35 ${sans}`, color: '#8A8A8F' }}>{f.desc}</div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div
              style={{ position: 'relative', height: 68 }}
              onMouseEnter={() => setOpenMenu('models')}
              onMouseLeave={() => setOpenMenu(null)}
            >
              <button type="button" className="navlink" style={navLinkStyle(active === 'models')}>
                Models <span style={{ fontSize: 10, opacity: 0.65, marginTop: 1 }}>▾</span>
              </button>
              {openMenu === 'models' && (
                <div style={{ position: 'absolute', left: -8, top: '100%', paddingTop: 9, zIndex: 120 }}>
                  <div
                    className="navDrop"
                    style={{
                      width: 308,
                      background: '#141416',
                      border: '1px solid #2A2A2E',
                      borderRadius: 14,
                      padding: 10,
                      boxShadow: '0 30px 70px rgba(0,0,0,.6)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 2,
                    }}
                  >
                    {NAV_MODELS.map((m) => (
                      <Link
                        key={m.href}
                        href={m.href}
                        className="navDropItem"
                        style={{
                          display: 'flex',
                          gap: 14,
                          alignItems: 'center',
                          padding: '12px 13px',
                          borderRadius: 9,
                          transition: 'background .14s',
                          textDecoration: 'none',
                        }}
                      >
                        <div style={{ font: `700 24px/1 ${mono}`, color: '#fff', width: 54, flex: 'none' }}>{m.name}</div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ font: `500 14px/1.2 ${sans}`, color: '#fff' }}>{m.full}</div>
                          <div style={{ marginTop: 3, font: `400 13px/1 ${mono}`, color: '#8A8A8F' }}>{m.years}</div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <Link href="/guides" className="navlink" style={navLinkStyle(active === 'guides')}>
              Guides
            </Link>
            <Link href="/codes" className="navlink" style={navLinkStyle(active === 'faults')}>
              Fault codes
            </Link>
            <Link href="/about" className="navlink" style={navLinkStyle(active === 'about')}>
              About
            </Link>
          </nav>

          <div className="landingNavActions" style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 20 }}>
            <Link href={SIGN_IN} className="navlink hideOnMobileNav" style={{ font: `500 14px/1 ${sans}`, color: '#C9C9CD' }}>
              Sign in
            </Link>
            <Link
              href={GARAGE}
              className="cta hideOnMobileNav"
              style={{
                ...ctaStyle,
                height: 40,
                display: 'flex',
                alignItems: 'center',
                padding: '0 20px',
                font: `600 14px/1 ${sans}`,
                letterSpacing: 0,
                textTransform: 'none',
                borderRadius: 3,
              }}
            >
              Get started
            </Link>
            <button
              type="button"
              className="marketingHamburger"
              aria-label="Open menu"
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((v) => !v)}
            >
              <span />
              <span />
              <span />
            </button>
          </div>
        </div>
      </header>

      {mobileOpen && (
        <>
          <button
            type="button"
            className={`marketingDrawerBackdrop${mobileOpen ? ' open' : ''}`}
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
          />
          <div className="marketingDrawer open" role="dialog" aria-modal="true" aria-label="Site menu">
            <div style={{ padding: '20px 22px 12px', borderBottom: '1px solid #1C1C1F' }}>
              <div style={{ font: `600 10px/1 ${mono}`, letterSpacing: '.14em', color: '#6E6E73', marginBottom: 12 }}>FEATURES</div>
              {NAV_FEATURES.map((f) => (
                <Link key={f.href} href={f.href} className="marketingDrawerLink" onClick={() => setMobileOpen(false)}>
                  {f.name}
                </Link>
              ))}
            </div>
            <div style={{ padding: '16px 22px 12px', borderBottom: '1px solid #1C1C1F' }}>
              <div style={{ font: `600 10px/1 ${mono}`, letterSpacing: '.14em', color: '#6E6E73', marginBottom: 12 }}>MODELS</div>
              {NAV_MODELS.map((m) => (
                <Link key={m.href} href={m.href} className="marketingDrawerLink" onClick={() => setMobileOpen(false)}>
                  {m.name} · {m.years}
                </Link>
              ))}
            </div>
            <div style={{ padding: '16px 22px 12px', borderBottom: '1px solid #1C1C1F' }}>
              <Link href="/guides" className="marketingDrawerLink" onClick={() => setMobileOpen(false)}>Guides</Link>
              <Link href="/codes" className="marketingDrawerLink" onClick={() => setMobileOpen(false)}>Fault codes</Link>
              <Link href="/about" className="marketingDrawerLink" onClick={() => setMobileOpen(false)}>About</Link>
            </div>
            <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Link href={SIGN_IN} className="marketingDrawerLink" onClick={() => setMobileOpen(false)}>Sign in</Link>
              <Link
                href={GARAGE}
                className="cta"
                onClick={() => setMobileOpen(false)}
                style={{
                  ...ctaStyle,
                  height: 44,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 3,
                  letterSpacing: 0,
                  textTransform: 'none',
                  font: `600 14px/1 ${sans}`,
                }}
              >
                Get started
              </Link>
            </div>
          </div>
        </>
      )}

      {children}

      <footer style={{ background: '#0B0B0C', borderTop: '1px solid #1C1C1F', color: '#fff' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '64px 28px 36px' }}>
          <div className="marketingFooterGrid" style={{ display: 'grid', gridTemplateColumns: '1.7fr 1fr 1fr 1fr', gap: 40 }}>
            <div>
              <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 11, textDecoration: 'none', color: '#fff' }}>
                <div style={{ width: 13, height: 13, background: RED, flex: 'none' }} />
                <div style={{ font: `700 15px/1 ${mono}`, letterSpacing: '.26em' }}>FLAT·SIX</div>
              </Link>
              <p style={{ margin: '18px 0 0', maxWidth: 310, font: `400 15px/1.65 ${sans}`, color: '#8A8A8F' }}>
                Free &amp; open-source DIY maintenance for the Boxster &amp; Cayman — multi-car, 987, 981 &amp; more.
              </p>
              <a
                href={GITHUB_REPO}
                target="_blank"
                rel="noopener noreferrer"
                className="ghostDark"
                style={{
                  marginTop: 22,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 9,
                  height: 42,
                  padding: '0 17px',
                  border: '1px solid #2A2A2E',
                  borderRadius: 3,
                  font: `500 14px/1 ${sans}`,
                  color: '#C9C9CD',
                  textDecoration: 'none',
                }}
              >
                View on GitHub <span style={{ fontFamily: mono }}>→</span>
              </a>
            </div>
            <div>
              <div style={{ font: `600 13px/1 ${sans}`, letterSpacing: '.02em', color: '#6E6E73', marginBottom: 18 }}>Features</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {FOOTER_FEATURES.map(({ href, label }) => (
                  <Link key={href} href={href} className="navlink" style={{ font: `400 14px/1.2 ${sans}`, color: '#C9C9CD', textDecoration: 'none' }}>
                    {label}
                  </Link>
                ))}
              </div>
            </div>
            <div>
              <div style={{ font: `600 13px/1 ${sans}`, letterSpacing: '.02em', color: '#6E6E73', marginBottom: 18 }}>Models</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <Link href="/987" className="navlink" style={{ font: `400 14px/1.2 ${sans}`, color: '#C9C9CD', textDecoration: 'none' }}>987 · Boxster &amp; Cayman</Link>
                <Link href="/981" className="navlink" style={{ font: `400 14px/1.2 ${sans}`, color: '#C9C9CD', textDecoration: 'none' }}>981 · Boxster &amp; Cayman</Link>
                <Link href="/features/multi-car" className="navlink" style={{ font: `400 14px/1.2 ${sans}`, color: '#C9C9CD', textDecoration: 'none' }}>Multi-car garage</Link>
              </div>
            </div>
            <div>
              <div style={{ font: `600 13px/1 ${sans}`, letterSpacing: '.02em', color: '#6E6E73', marginBottom: 18 }}>Resources</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <Link href="/guides" className="navlink" style={{ font: `400 14px/1.2 ${sans}`, color: '#C9C9CD', textDecoration: 'none' }}>Guides</Link>
                <Link href="/codes" className="navlink" style={{ font: `400 14px/1.2 ${sans}`, color: '#C9C9CD', textDecoration: 'none' }}>Fault codes</Link>
                <Link href="/about" className="navlink" style={{ font: `400 14px/1.2 ${sans}`, color: '#C9C9CD', textDecoration: 'none' }}>About the project</Link>
                <a href={GITHUB_REPO} target="_blank" rel="noopener noreferrer" className="navlink" style={{ font: `400 14px/1.2 ${sans}`, color: '#C9C9CD', textDecoration: 'none' }}>GitHub</a>
              </div>
            </div>
          </div>
          <div
            style={{
              marginTop: 52,
              paddingTop: 24,
              borderTop: '1px solid #1C1C1F',
              display: 'flex',
              alignItems: 'center',
              gap: 18,
              flexWrap: 'wrap',
            }}
          >
            <div style={{ font: `400 13px/1 ${sans}`, color: '#6E6E73' }}>© 2026 FLAT·SIX · Themis Grove LLC</div>
            <Link href="/legal" className="navlink" style={{ font: `400 13px/1 ${sans}`, color: '#6E6E73', textDecoration: 'none' }}>
              Privacy &amp; Terms
            </Link>
            <div style={{ marginLeft: 'auto', font: `500 13px/1 ${mono}`, letterSpacing: '.04em', color: '#5C5C61' }}>
              Not affiliated with Porsche AG
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
