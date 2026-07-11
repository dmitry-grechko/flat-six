import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Offline — FLAT·SIX',
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return (
    <main
      style={{
        minHeight: '100dvh',
        background: '#ECECEE',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        fontFamily: "'Helvetica Neue', Arial, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: 420,
          background: '#fff',
          border: '1px solid #E3E3E5',
          borderRadius: 6,
          padding: 28,
        }}
      >
        <div
          style={{
            font: "600 10px/1 'JetBrains Mono',monospace",
            letterSpacing: '.16em',
            color: '#9A9AA0',
            marginBottom: 10,
          }}
        >
          OFFLINE
        </div>
        <h1 style={{ margin: '0 0 12px', fontSize: 22, fontWeight: 500, color: '#0B0B0C' }}>
          You&apos;re offline
        </h1>
        <p style={{ margin: '0 0 18px', fontSize: 14, lineHeight: 1.55, color: '#6E6E73' }}>
          Garage data, curated knowledge, and DIY tools work from your local cache when you&apos;ve
          synced once. Documents, workshop-manual search, and the AI assistant need a connection.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <Link
            href="/garage"
            style={{
              height: 36,
              padding: '0 14px',
              display: 'inline-flex',
              alignItems: 'center',
              background: '#0B0B0C',
              color: '#fff',
              textDecoration: 'none',
              font: "600 11px/1 'Helvetica Neue',Arial,sans-serif",
              letterSpacing: '.08em',
              textTransform: 'uppercase',
              borderRadius: 2,
            }}
          >
            Open garage
          </Link>
          <Link
            href="/faults"
            style={{
              height: 36,
              padding: '0 14px',
              display: 'inline-flex',
              alignItems: 'center',
              background: '#fff',
              color: '#0B0B0C',
              border: '1px solid #C9C9CD',
              textDecoration: 'none',
              font: "600 11px/1 'Helvetica Neue',Arial,sans-serif",
              letterSpacing: '.08em',
              textTransform: 'uppercase',
              borderRadius: 2,
            }}
          >
            Fault finding
          </Link>
        </div>
      </div>
    </main>
  );
}
