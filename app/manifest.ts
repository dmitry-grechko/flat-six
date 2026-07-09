import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'FLAT·SIX — Porsche Garage',
    short_name: 'FLAT·SIX',
    description:
      'A free, open-source garage for the Porsche Boxster & Cayman (987, 981, and more): 3D inspector, generation-specific specs, service history and an AI assistant.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0B0B0C',
    theme_color: '#0B0B0C',
    categories: ['automotive', 'productivity', 'utilities'],
    icons: [
      { src: '/icon.svg', type: 'image/svg+xml', sizes: 'any', purpose: 'any' },
      { src: '/icon', type: 'image/png', sizes: '32x32' },
      { src: '/apple-icon', type: 'image/png', sizes: '180x180' },
    ],
  };
}
