'use client';

import { useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { DOWNLOADS, REPO_URL, type DownloadItem } from '@/lib/downloads';
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

function CopyCommand({ command }: { command: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      style={{ ...btnBase, background: '#0B0B0C', color: '#fff' }}
      onClick={() => {
        void navigator.clipboard.writeText(command).then(() => {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1600);
        });
      }}
    >
      {copied ? 'Copied' : 'Copy command'}
    </button>
  );
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
  const isOwner = item.audience === 'owners';
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
        <span
          style={{
            font: `600 9px/1 ${mono}`,
            letterSpacing: '.1em',
            textTransform: 'uppercase',
            color: isOwner ? '#D5001C' : '#9A9AA0',
            border: `1px solid ${isOwner ? 'rgba(213,0,28,.35)' : '#E3E3E5'}`,
            padding: '5px 8px',
            borderRadius: 2,
          }}
        >
          {isOwner ? 'For owners' : 'Contributors / lab'}
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
      {item.command && (
        <code
          style={{
            display: 'block',
            marginBottom: 14,
            font: `500 12px/1.4 ${mono}`,
            background: '#F4F4F5',
            padding: '10px 12px',
            borderRadius: 3,
            color: '#0B0B0C',
            overflowX: 'auto',
          }}
        >
          {item.command}
        </code>
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
        {item.command && item.audience === 'contributors' && <CopyCommand command={item.command} />}
        <a
          href={REPO_URL}
          target="_blank"
          rel="noreferrer"
          style={{ ...btnBase, background: '#fff', color: '#0B0B0C', border: '1px solid #C9C9CD' }}
        >
          Source on GitHub
        </a>
      </div>
    </article>
  );
}

export default function Downloads() {
  return (
    <div className="padView" style={{ padding: 28, maxWidth: 880, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ ...card, borderColor: 'rgba(213,0,28,.28)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
          <div style={{ font: `500 10px/1 ${mono}`, letterSpacing: '.16em', color: '#9A9AA0' }}>
            COMPANION APPS
          </div>
          <BetaBadge tone="page" />
        </div>
        <p style={{ margin: 0, font: `400 14px/1.55 ${sans}`, color: '#3A3A3E' }}>
          <strong style={{ fontWeight: 600 }}>Track Desktop</strong> is the owner path (Windows + Mac) —
          live OBD without a terminal. <strong style={{ fontWeight: 600 }}>Track PWA</strong> is the same
          Track UI installable from Chrome. The OBD Bridge is for contributors / lab only. In-browser{' '}
          <Link href="/obd" style={{ color: '#D5001C', textDecoration: 'none', fontWeight: 500 }}>
            Live OBD
          </Link>{' '}
          already covers USB ELM327 on desktop Chrome/Edge via Web Serial. Installers land on GitHub
          Releases after testing — buttons say “soon” until then.
        </p>
      </div>

      {DOWNLOADS.map((item) => (
        <DownloadCard key={item.id} item={item} />
      ))}
    </div>
  );
}
