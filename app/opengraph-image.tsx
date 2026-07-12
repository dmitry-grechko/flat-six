import { ImageResponse } from 'next/og';
import { LOGO_DATA_URI } from './logo';

export const alt = 'FLAT·SIX — a free, open-source garage for the Boxster & Cayman (987, 981, and more)';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

// Social share card. Auto-wired by Next into openGraph.images and twitter.images.
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#0B0B0C',
          padding: 72,
          fontFamily: 'Helvetica, Arial, sans-serif',
          position: 'relative',
        }}
      >
        {/* oversized watermark */}
        <div
          style={{
            position: 'absolute',
            right: -20,
            top: -40,
            fontSize: 360,
            fontWeight: 700,
            color: '#121214',
            letterSpacing: -12,
          }}
        >
          FLAT
        </div>

        {/* brand row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LOGO_DATA_URI} width={64} height={64} alt="" />
          <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: 14, color: '#fff' }}>FLAT·SIX</div>
        </div>

        {/* headline */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 22, letterSpacing: 8, color: '#D5001C', marginBottom: 24 }}>
            FREE &amp; OPEN SOURCE · 987 · 981 · MORE
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', fontSize: 68, fontWeight: 300, color: '#fff', lineHeight: 1.08, maxWidth: 980 }}>
            <span>Every component of your mid-engine car.</span>
            <span style={{ fontWeight: 600 }}>One garage.</span>
          </div>
        </div>

        {/* footer row */}
        <div style={{ display: 'flex', alignItems: 'center', fontSize: 24, color: '#9A9AA0' }}>
          <div>3D · fault finding · service history · AI assistant</div>
          <div style={{ marginLeft: 'auto', color: '#5C5C61' }}>flat-six.org</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
