import type { Metadata, Viewport } from 'next';
import './globals.css';
import Providers from './providers';

export const metadata: Metadata = {
  title: 'FLAT·SIX — 981 Garage',
  description: 'DIY maintenance OS for the Porsche Boxster / Cayman 981: interactive cutaway, real part numbers, torque specs, service log and an AI workshop assistant.',
};

export const viewport: Viewport = {
  themeColor: '#0B0B0C',
  width: 'device-width',
  initialScale: 1,
  // Allow pinch-zoom for accessibility; don't lock scale.
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
        {/* Google's <model-viewer> web component (same version as the design mockup) */}
        <script
          type="module"
          src="https://unpkg.com/@google/model-viewer@4.0.0/dist/model-viewer.min.js"
        />
      </head>
      <body><Providers>{children}</Providers></body>
    </html>
  );
}
