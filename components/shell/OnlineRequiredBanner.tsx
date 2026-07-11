'use client';

import Link from 'next/link';
import { useOffline } from '@/lib/offline/OfflineProvider';

const mono = "'JetBrains Mono',monospace";
const sans = "'Helvetica Neue',Arial,sans-serif";

/** Honest empty state for features that stay online-only in v1 (Documents, AI, manual search). */
export function OnlineRequiredBanner({
  feature,
  detail,
}: {
  feature: string;
  detail?: string;
}) {
  const { online } = useOffline();
  if (online) return null;

  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid rgba(213,0,28,.35)',
        borderRadius: 6,
        padding: '14px 16px',
        marginBottom: 14,
      }}
    >
      <div style={{ font: `600 10px/1 ${mono}`, letterSpacing: '.12em', color: '#D5001C', marginBottom: 8 }}>
        ONLINE REQUIRED
      </div>
      <p style={{ margin: 0, font: `400 14px/1.5 ${sans}`, color: '#3A3A3E' }}>
        {feature} needs a network connection
        {detail ? ` — ${detail}` : ''}. Garage history, plans, and curated fault knowledge still work
        offline from your last sync.{' '}
        <Link href="/garage" style={{ color: '#D5001C', fontWeight: 500, textDecoration: 'none' }}>
          Back to garage
        </Link>
      </p>
    </div>
  );
}
