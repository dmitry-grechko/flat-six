import type { Metadata, Viewport } from 'next';
import './globals.css';
import Providers from './providers';

const SITE_URL = 'https://www.flat-six.org';
const SITE_NAME = 'FLAT·SIX';
const DESCRIPTION =
  'A free, open-source garage for the Porsche 981 Boxster & Cayman. Explore your car in 3D and factory cutaways, look up real part numbers and torque specs, keep a full service history, plan maintenance, and let an AI assistant help — all in one place.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'FLAT·SIX — Free Porsche 981 Boxster & Cayman garage',
    template: '%s · FLAT·SIX',
  },
  description: DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: 'Dmitry Grechko', url: 'https://github.com/dmitry-grechko' }],
  creator: 'Dmitry Grechko',
  publisher: SITE_NAME,
  keywords: [
    'Porsche 981',
    'Boxster',
    'Cayman',
    '981 maintenance',
    'DIY maintenance',
    'service history',
    'torque specs',
    'part numbers',
    'oil change',
    'flat-six',
    'PDK',
    'fault finding',
    'open source',
    'free',
  ],
  category: 'automotive',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    url: SITE_URL,
    title: 'FLAT·SIX — Free Porsche 981 Boxster & Cayman garage',
    description: DESCRIPTION,
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FLAT·SIX — Free Porsche 981 Boxster & Cayman garage',
    description: DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
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
