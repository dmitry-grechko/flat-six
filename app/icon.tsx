import { ImageResponse } from 'next/og';
import { LOGO_DATA_URI } from './logo';

// Raster PNG fallback favicon for clients that don't accept the SVG in icon.svg.
export const size = { width: 32, height: 32 };
export const contentType = 'image/png';
export const dynamic = 'force-dynamic';

export default function Icon() {
  return new ImageResponse(
    (
      <div style={{ display: 'flex', width: '100%', height: '100%' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={LOGO_DATA_URI} width={32} height={32} alt="" />
      </div>
    ),
    { ...size },
  );
}
