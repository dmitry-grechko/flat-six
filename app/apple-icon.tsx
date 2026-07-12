import { ImageResponse } from 'next/og';
import { LOGO_DATA_URI } from './logo';

// Apple touch icon (home-screen shortcut on iOS/iPadOS).
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';
export const dynamic = 'force-dynamic';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ display: 'flex', width: '100%', height: '100%' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={LOGO_DATA_URI} width={180} height={180} alt="" />
      </div>
    ),
    { ...size },
  );
}
