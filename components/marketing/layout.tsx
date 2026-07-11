import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';
import {
  bodyStyle,
  cardStyle,
  chipLight,
  h1Style,
  h2Style,
  kickerStyle,
  leadStyle,
  mono,
  RED,
  sans,
  severityColor,
} from './tokens';
import { generationTagline, generationYears } from '@/lib/marketing/content';

/* ============================================================
   Shared marketing layout primitives.
   Every public SEO page is built from these so the design
   reads as one system — the same dark hero, section rhythm,
   and white cards as the home landing page.
   ============================================================ */

export interface Crumb {
  href?: string;
  label: string;
}

/** Mono breadcrumb trail. Rendered inside the dark hero. */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav
      aria-label="Breadcrumb"
      style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 9, font: `500 11px/1.4 ${mono}`, letterSpacing: '.08em' }}
    >
      {items.map((it, i) => (
        <span key={`${it.label}-${i}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 9 }}>
          {it.href ? (
            <Link href={it.href} className="crumb" style={{ color: '#8A8A90', textDecoration: 'none', transition: 'color .15s' }}>
              {it.label}
            </Link>
          ) : (
            <span style={{ color: '#C9C9CD' }}>{it.label}</span>
          )}
          {i < items.length - 1 && <span style={{ color: '#48484C' }}>/</span>}
        </span>
      ))}
    </nav>
  );
}

/**
 * The single hero used across every marketing page.
 * Dark, with the big "FLAT" (or contextual) watermark, an optional
 * breadcrumb, kicker, title, lead, chips and actions.
 */
export function PageHero({
  kicker,
  title,
  lead,
  breadcrumb,
  chips,
  actions,
  size = 'lg',
  watermark = 'FLAT',
}: {
  kicker?: string;
  title: ReactNode;
  lead?: ReactNode;
  breadcrumb?: Crumb[];
  chips?: ReactNode;
  actions?: ReactNode;
  size?: 'lg' | 'md';
  watermark?: string;
}) {
  const lg = size === 'lg';
  return (
    <section style={{ position: 'relative', background: '#0B0B0C', color: '#fff', overflow: 'hidden' }}>
      <div
        aria-hidden
        style={{
          position: 'absolute',
          right: -36,
          top: lg ? 20 : -24,
          font: `700 ${lg ? 260 : 190}px/.8 ${mono}`,
          color: '#121214',
          letterSpacing: '-.04em',
          userSelect: 'none',
          pointerEvents: 'none',
        }}
      >
        {watermark}
      </div>
      <div style={{ position: 'relative', maxWidth: 1200, margin: '0 auto', padding: lg ? '80px 28px 68px' : '52px 28px 44px' }}>
        {breadcrumb && <Breadcrumbs items={breadcrumb} />}
        {kicker && <div style={{ ...kickerStyle, color: RED, marginTop: breadcrumb ? 22 : 0, marginBottom: 14 }}>{kicker}</div>}
        <h1 style={{ ...h1Style, fontSize: lg ? 50 : 36, maxWidth: 760 }}>{title}</h1>
        {lead && <p style={{ ...leadStyle, maxWidth: 620, margin: '22px 0 0' }}>{lead}</p>}
        {chips && <div style={{ marginTop: 26, display: 'flex', gap: 10, flexWrap: 'wrap' }}>{chips}</div>}
        {actions && <div style={{ marginTop: 32, display: 'flex', gap: 13, flexWrap: 'wrap' }}>{actions}</div>}
      </div>
    </section>
  );
}

type SectionWidth = 'wide' | 'mid' | 'narrow';
const WIDTHS: Record<SectionWidth, number> = { wide: 1200, mid: 940, narrow: 760 };

/** Consistent light content section. */
export function Section({
  children,
  width = 'wide',
  pad = '64px 28px',
  tone = 'light',
  style,
}: {
  children: ReactNode;
  width?: SectionWidth;
  pad?: string;
  tone?: 'light' | 'dark';
  style?: CSSProperties;
}) {
  const dark = tone === 'dark';
  const inner = (
    <div style={{ maxWidth: WIDTHS[width], margin: '0 auto', padding: pad, ...style }}>{children}</div>
  );
  if (!dark) return <section>{inner}</section>;
  return <section style={{ background: '#0B0B0C', color: '#fff' }}>{inner}</section>;
}

/** Kicker + h2 (+ optional sub / trailing action) header for a section. */
export function SectionHeading({
  kicker,
  title,
  sub,
  action,
  titleSize = 30,
}: {
  kicker?: string;
  title: ReactNode;
  sub?: ReactNode;
  action?: ReactNode;
  titleSize?: number;
}) {
  return (
    <div style={{ marginBottom: 24 }}>
      {kicker && <div style={kickerStyle}>{kicker}</div>}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
        <h2 style={{ ...h2Style, fontSize: titleSize }}>{title}</h2>
        {action}
      </div>
      {sub && <p style={{ ...bodyStyle, maxWidth: 620, margin: '14px 0 0' }}>{sub}</p>}
    </div>
  );
}

/** Uppercase red text link with a mono arrow — the standard "read more" affordance. */
export function ArrowLink({ href, label, tone = 'red' }: { href: string; label: string; tone?: 'red' | 'muted' }) {
  return (
    <Link
      href={href}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        font: `600 11px/1 ${sans}`,
        letterSpacing: '.1em',
        textTransform: 'uppercase',
        color: tone === 'red' ? RED : '#6E6E73',
        textDecoration: 'none',
      }}
    >
      {label} <span style={{ fontFamily: mono }}>→</span>
    </Link>
  );
}

/** White card list of feature benefits with red checkmarks. */
export function CheckList({ items }: { items: string[] }) {
  return (
    <div style={{ ...cardStyle, padding: '6px 22px' }}>
      {items.map((item, i) => (
        <div
          key={item}
          style={{ display: 'flex', gap: 14, alignItems: 'flex-start', padding: '15px 0', borderTop: i ? '1px solid #F0F0F1' : 'none' }}
        >
          <span
            aria-hidden
            style={{ marginTop: 1, width: 18, height: 18, flexShrink: 0, borderRadius: 3, background: RED, color: '#fff', font: `600 11px/18px ${sans}`, textAlign: 'center' }}
          >
            ✓
          </span>
          <span style={{ font: `400 15px/1.5 ${sans}`, color: '#0B0B0C' }}>{item}</span>
        </div>
      ))}
    </div>
  );
}

/** Generation cards (987 / 981) — reused on feature pages and elsewhere. */
export function GenerationCards({ generations }: { generations: string[] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 16 }}>
      {generations.map((g) => (
        <Link
          key={g}
          href={`/${g}`}
          className="fcard"
          style={{ ...cardStyle, display: 'block', padding: '26px 24px', textDecoration: 'none', transition: 'border-color .15s, transform .15s' }}
        >
          <div style={{ font: `600 34px/1 ${sans}`, color: '#0B0B0C', letterSpacing: '-.02em' }}>{g}</div>
          <div style={{ marginTop: 8, font: `500 11px/1 ${mono}`, color: RED }}>{generationYears(g)}</div>
          <div style={{ marginTop: 12, font: `400 14px/1.5 ${sans}`, color: '#6E6E73' }}>{generationTagline(g)}</div>
        </Link>
      ))}
    </div>
  );
}

/** A feature summary card (used on generation hubs). */
export function FeatureCard({ href, kicker, title, description }: { href: string; kicker: string; title: string; description: string }) {
  return (
    <Link
      href={href}
      className="fcard"
      style={{ ...cardStyle, display: 'block', padding: '22px 20px', textDecoration: 'none', transition: 'border-color .15s, transform .15s' }}
    >
      <div style={{ font: `600 10px/1 ${mono}`, letterSpacing: '.12em', color: RED }}>{kicker}</div>
      <div style={{ marginTop: 12, font: `400 18px/1.25 ${sans}`, color: '#0B0B0C' }}>{title}</div>
      <div style={{ marginTop: 8, font: `400 13px/1.55 ${sans}`, color: '#6E6E73' }}>{description}</div>
    </Link>
  );
}

/** A known-issue card with a severity badge. */
export function IssueCard({ severity, title, description }: { severity: string; title: string; description: string }) {
  const color = severityColor(severity);
  return (
    <div style={{ ...cardStyle, padding: '18px 20px' }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'baseline', flexWrap: 'wrap' }}>
        <span style={{ font: `600 9px/1 ${mono}`, letterSpacing: '.08em', color, border: `1px solid ${color}`, padding: '4px 7px', borderRadius: 2 }}>
          {severity.toUpperCase()}
        </span>
        <span style={{ font: `400 17px/1.3 ${sans}`, color: '#0B0B0C' }}>{title}</span>
      </div>
      <p style={{ ...bodyStyle, margin: '10px 0 0', fontSize: 14 }}>{description}</p>
    </div>
  );
}

/** A guide/article link card. */
export function GuideCard({ href, title, meta }: { href: string; title: string; meta?: string }) {
  return (
    <Link
      href={href}
      className="fcard"
      style={{ ...cardStyle, display: 'block', padding: '18px 20px', textDecoration: 'none', transition: 'border-color .15s, transform .15s' }}
    >
      <div style={{ font: `400 16px/1.35 ${sans}`, color: '#0B0B0C' }}>{title}</div>
      {meta && <div style={{ marginTop: 8, font: `500 10px/1 ${mono}`, color: '#9A9AA0' }}>{meta}</div>}
    </Link>
  );
}

export { chipLight };
