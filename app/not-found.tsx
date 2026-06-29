import Link from 'next/link';

const mono = "'JetBrains Mono',monospace";
const sans = "'Helvetica Neue',Arial,sans-serif";
const RED = 'var(--red, #D5001C)';

const CAUSES = [
  { cause: 'The address was mistyped', likely: 'High' },
  { cause: 'The page moved to another bay', likely: 'Med' },
  { cause: 'This route never existed', likely: 'Low' },
];

// Branded 404. Next sets the 404 status automatically; this renders inside the
// root layout (fonts + theme already applied).
export default function NotFound() {
  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#0B0B0C',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        overflow: 'hidden',
        position: 'relative',
        fontFamily: sans,
      }}
    >
      {/* oversized watermark */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%,-50%)',
          font: `700 460px/.8 ${mono}`,
          color: '#121214',
          userSelect: 'none',
          pointerEvents: 'none',
          letterSpacing: '-.04em',
          whiteSpace: 'nowrap',
        }}
      >
        404
      </div>

      <div style={{ position: 'relative', width: '100%', maxWidth: 540, textAlign: 'center' }}>
        {/* brand */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 11, marginBottom: 30 }}>
          <span style={{ width: 11, height: 11, background: RED }} />
          <span style={{ font: `700 13px/1 ${mono}`, letterSpacing: '.3em', color: '#fff' }}>FLAT·SIX</span>
        </div>

        <div style={{ font: `500 11px/1 ${mono}`, letterSpacing: '.24em', color: RED, marginBottom: 18 }}>
          ERR · P0404 · ROUTE NOT FOUND
        </div>
        <h1 style={{ margin: 0, font: `300 44px/1.08 ${sans}`, letterSpacing: '-.02em' }}>
          This page took<br />a wrong turn.
        </h1>
        <p style={{ margin: '20px auto 0', maxWidth: 400, font: `400 15px/1.65 ${sans}`, color: '#9A9AA0' }}>
          We couldn&rsquo;t find that part in the catalog. Let&rsquo;s get you back on the road.
        </p>

        {/* diagnostic card (fault-finding style) */}
        <div
          style={{
            margin: '30px auto 0',
            maxWidth: 380,
            textAlign: 'left',
            background: '#141416',
            border: '1px solid #232327',
            borderRadius: 6,
            padding: '14px 16px',
          }}
        >
          <div style={{ font: `500 9px/1 ${mono}`, letterSpacing: '.14em', color: '#76767B', marginBottom: 10 }}>
            LIKELY CAUSES
          </div>
          {CAUSES.map((c, i) => (
            <div
              key={c.cause}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '9px 0',
                borderTop: i ? '1px solid #1F1F22' : 'none',
              }}
            >
              <span style={{ font: `500 11px/1 ${mono}`, color: '#5C5C61', width: 18 }}>{String(i + 1).padStart(2, '0')}</span>
              <span style={{ flex: 1, font: `400 13.5px/1.4 ${sans}`, color: '#E6E6E8' }}>{c.cause}</span>
              <span
                style={{
                  font: `600 8px/1 ${mono}`,
                  letterSpacing: '.08em',
                  padding: '4px 7px',
                  borderRadius: 2,
                  color: c.likely === 'High' ? '#fff' : c.likely === 'Med' ? '#E0A53B' : '#7FBF98',
                  background:
                    c.likely === 'High' ? RED : c.likely === 'Med' ? 'rgba(199,119,0,.18)' : 'rgba(30,142,78,.18)',
                }}
              >
                {c.likely.toUpperCase()}
              </span>
            </div>
          ))}
        </div>

        {/* actions */}
        <div style={{ marginTop: 30, display: 'flex', gap: 13, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link
            href="/"
            style={{
              height: 50,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              padding: '0 26px',
              background: RED,
              color: '#fff',
              borderRadius: 2,
              font: `600 12px/1 ${sans}`,
              letterSpacing: '.1em',
              textTransform: 'uppercase',
            }}
          >
            Back to home <span style={{ fontFamily: mono }}>→</span>
          </Link>
          <Link
            href="/garage"
            style={{
              height: 50,
              display: 'inline-flex',
              alignItems: 'center',
              padding: '0 24px',
              background: 'transparent',
              color: '#C9C9CD',
              border: '1px solid #313135',
              borderRadius: 2,
              font: `600 12px/1 ${sans}`,
              letterSpacing: '.1em',
              textTransform: 'uppercase',
            }}
          >
            Open the garage
          </Link>
        </div>
      </div>
    </main>
  );
}
