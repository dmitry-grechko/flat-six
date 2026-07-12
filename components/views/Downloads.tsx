'use client';

import type { CSSProperties } from 'react';
import Link from 'next/link';
import { REPO_URL, type DownloadItem } from '@/lib/downloads';
import { BetaBadge } from '@/components/shell/BetaBadge';

const mono = "'JetBrains Mono',monospace";
const sans = "'Helvetica Neue',Arial,sans-serif";

const card: CSSProperties = {
  background: '#fff',
  border: '1px solid #E3E3E5',
  borderRadius: 6,
  padding: 22,
};

const btnBase: CSSProperties = {
  height: 36,
  padding: '0 14px',
  borderRadius: 2,
  font: `600 11px/1 ${sans}`,
  letterSpacing: '.08em',
  textTransform: 'uppercase',
  cursor: 'pointer',
  border: 'none',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  textDecoration: 'none',
};

function audienceLabel(a: DownloadItem['audience']) {
  if (a === 'owners') return { text: 'For owners', color: '#D5001C', border: 'rgba(213,0,28,.35)' };
  return { text: 'Contributors / lab', color: '#9A9AA0', border: '#E3E3E5' };
}

function SoonButton({ label }: { label: string }) {
  return (
    <span
      style={{
        ...btnBase,
        background: '#F4F4F5',
        color: '#9A9AA0',
        cursor: 'default',
        border: '1px solid #E3E3E5',
      }}
      title="Packaged download not published yet — coming via GitHub Releases after testing"
    >
      {label} — soon
    </span>
  );
}

function DownloadCard({ item }: { item: DownloadItem }) {
  const chip = audienceLabel(item.audience);
  return (
    <article style={card}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
        <h2
          style={{
            margin: 0,
            font: `500 17px/1.2 ${sans}`,
            letterSpacing: '-.01em',
            color: '#0B0B0C',
          }}
        >
          {item.name}
        </h2>
        <BetaBadge tone="page" />
        {item.versionLabel && (
          <span
            style={{
              font: `600 9px/1 ${mono}`,
              letterSpacing: '.1em',
              textTransform: 'uppercase',
              color: '#0B0B0C',
              border: '1px solid #E3E3E5',
              padding: '5px 8px',
              borderRadius: 2,
            }}
          >
            {item.versionLabel}
          </span>
        )}
        <span
          style={{
            font: `600 9px/1 ${mono}`,
            letterSpacing: '.1em',
            textTransform: 'uppercase',
            color: chip.color,
            border: `1px solid ${chip.border}`,
            padding: '5px 8px',
            borderRadius: 2,
          }}
        >
          {chip.text}
        </span>
      </div>
      <div
        style={{
          font: `500 10px/1 ${mono}`,
          letterSpacing: '.1em',
          color: '#9A9AA0',
          textTransform: 'uppercase',
          marginBottom: 12,
        }}
      >
        {item.platform}
      </div>
      <p style={{ margin: '0 0 16px', font: `400 14px/1.55 ${sans}`, color: '#3A3A3E' }}>
        {item.tagline}
      </p>
      <ul
        style={{
          margin: '0 0 18px',
          padding: '0 0 0 18px',
          font: `400 13px/1.65 ${sans}`,
          color: '#6E6E73',
        }}
      >
        {item.installNotes.map((note) => (
          <li key={note} style={{ marginBottom: 4 }}>
            {note}
          </li>
        ))}
      </ul>
      {item.macNotes && item.macNotes.length > 0 && (
        <div
          style={{
            margin: '0 0 18px',
            padding: '12px 14px',
            background: '#F4F4F5',
            border: '1px solid #E3E3E5',
            borderRadius: 4,
          }}
        >
          <div
            style={{
              font: `600 10px/1 ${mono}`,
              letterSpacing: '.1em',
              color: '#6E6E73',
              marginBottom: 8,
            }}
          >
            MAC FIRST LAUNCH
          </div>
          <ul
            style={{
              margin: 0,
              padding: '0 0 0 18px',
              font: `400 13px/1.65 ${sans}`,
              color: '#3A3A3E',
            }}
          >
            {item.macNotes.map((note) => (
              <li key={note} style={{ marginBottom: 4 }}>
                {note}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {item.href ? (
          <a href={item.href} style={{ ...btnBase, background: '#D5001C', color: '#fff' }} target="_blank" rel="noreferrer">
            {item.cta}
          </a>
        ) : (
          <SoonButton label={item.cta} />
        )}
        {item.ctaMac &&
          (item.hrefMac ? (
            <a
              href={item.hrefMac}
              style={{ ...btnBase, background: '#D5001C', color: '#fff' }}
              target="_blank"
              rel="noreferrer"
            >
              {item.ctaMac}
            </a>
          ) : (
            <SoonButton label={item.ctaMac} />
          ))}
        <a
          href={REPO_URL + '/releases'}
          target="_blank"
          rel="noreferrer"
          style={{ ...btnBase, background: '#fff', color: '#0B0B0C', border: '1px solid #C9C9CD' }}
        >
          All releases
        </a>
      </div>
    </article>
  );
}

export default function Downloads({ items }: { items: DownloadItem[] }) {
  return (
    <div className="padView" style={{ padding: 28, maxWidth: 880, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ ...card, borderColor: 'rgba(213,0,28,.28)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
          <div style={{ font: `500 10px/1 ${mono}`, letterSpacing: '.16em', color: '#9A9AA0' }}>
            ONE PRODUCT
          </div>
          <BetaBadge tone="page" />
        </div>
        <p style={{ margin: 0, font: `400 14px/1.55 ${sans}`, color: '#3A3A3E' }}>
          <strong style={{ fontWeight: 600 }}>FLAT·SIX Desktop</strong> and the{' '}
          <strong style={{ fontWeight: 600 }}>PWA</strong> are the full garage. Sync garage data for
          offline use; Documents and AI stay online. In-browser{' '}
          <Link href="/obd" style={{ color: '#D5001C', textDecoration: 'none', fontWeight: 500 }}>
            Live OBD
          </Link>{' '}
          already supports USB Web Serial on desktop Chrome. Download buttons always track the latest
          GitHub Release — no manual version bump on the site.
        </p>
      </div>

      {items.map((item) => (
        <DownloadCard key={item.id} item={item} />
      ))}
    </div>
  );
}
