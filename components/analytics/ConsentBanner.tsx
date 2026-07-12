'use client';

import { setConsent } from '@/lib/analytics';

const mono = "'JetBrains Mono',monospace";
const sans = "'Helvetica Neue',Arial,sans-serif";

/** Bottom banner: analytics fires only after "Accept". */
export default function ConsentBanner({ onChoose }: { onChoose: () => void }) {
  const choose = (c: 'granted' | 'denied') => {
    setConsent(c);
    onChoose();
  };

  return (
    <div
      role="dialog"
      aria-label="Analytics consent"
      style={{
        position: 'fixed',
        left: 16,
        right: 16,
        bottom: 16,
        zIndex: 200,
        maxWidth: 720,
        margin: '0 auto',
        background: '#0B0B0C',
        color: '#fff',
        border: '1px solid #232327',
        borderRadius: 8,
        padding: '16px 18px',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        flexWrap: 'wrap',
        boxShadow: '0 20px 48px rgba(0,0,0,.4)',
      }}
    >
      <p style={{ margin: 0, flex: '1 1 320px', font: `400 13px/1.5 ${sans}`, color: '#C9C9CD' }}>
        We use privacy-friendly analytics to understand which features help owners — only if you
        allow it. No ads, no data selling. See the{' '}
        <a href="/legal#privacy" style={{ color: '#fff', textDecoration: 'underline' }}>
          privacy policy
        </a>
        .
      </p>
      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        <button
          onClick={() => choose('denied')}
          style={{
            height: 38,
            padding: '0 16px',
            borderRadius: 2,
            cursor: 'pointer',
            background: 'transparent',
            color: '#C9C9CD',
            border: '1px solid #313135',
            font: `600 11px/1 ${sans}`,
            letterSpacing: '.08em',
            textTransform: 'uppercase',
          }}
        >
          Decline
        </button>
        <button
          onClick={() => choose('granted')}
          style={{
            height: 38,
            padding: '0 18px',
            borderRadius: 2,
            cursor: 'pointer',
            background: 'var(--red, #D5001C)',
            color: '#fff',
            border: 'none',
            font: `600 11px/1 ${sans}`,
            letterSpacing: '.08em',
            textTransform: 'uppercase',
          }}
        >
          Accept
        </button>
      </div>
    </div>
  );
}
