import type { Metadata, Viewport } from 'next';
import './globals.css';
import Providers from './providers';
import ServiceWorkerRegister from '@/components/pwa/ServiceWorkerRegister';
import Analytics from '@/components/analytics/Analytics';

const SITE_URL = 'https://www.flat-six.org';
const SITE_NAME = 'FLAT·SIX';
const DESCRIPTION =
  'A free, open-source garage for the Boxster & Cayman platform — 987, 981, and more. Explore your car in 3D, look up generation-specific fault codes and torque specs, keep a full service history, plan maintenance, and let an AI assistant help — all in one place.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'FLAT·SIX — Free Boxster & Cayman garage',
    template: '%s · FLAT·SIX',
  },
  description: DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: 'Themis Grove LLC', url: SITE_URL }],
  creator: 'Themis Grove LLC',
  publisher: SITE_NAME,
  keywords: [
    '987',
    '981',
    'Boxster',
    'Cayman',
    '987 maintenance',
    '981 maintenance',
    'DIY maintenance',
    'service history',
    'torque specs',
    'part numbers',
    'oil change',
    'flat-six',
    'fault finding',
    'open source',
    'free',
  ],
  category: 'automotive',
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    url: SITE_URL,
    title: 'FLAT·SIX — Free Boxster & Cayman garage',
    description: DESCRIPTION,
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FLAT·SIX — Free Boxster & Cayman garage',
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
      <body><Providers>{children}</Providers><ServiceWorkerRegister /><Analytics /></body>
    </html>
  );
}
