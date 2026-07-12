import withPWAInit from '@ducanh2912/next-pwa';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Electron desktop packs the standalone server output.
  output: 'standalone',
  // Allow an isolated build dir (e.g. running a second `next dev` alongside
  // another already using .next). No-op unless NEXT_DIST_DIR is set.
  distDir: process.env.NEXT_DIST_DIR || '.next',

  // The OAuth discovery documents must live under /.well-known, but Next ignores
  // dot-folders in app/. Serve them from normal route handlers via rewrites.
  async rewrites() {
    return [
      {
        source: '/.well-known/oauth-protected-resource',
        destination: '/api/oauth/protected-resource',
      },
      {
        source: '/.well-known/oauth-protected-resource/:path*',
        destination: '/api/oauth/protected-resource',
      },
      {
        source: '/.well-known/oauth-authorization-server',
        destination: '/api/oauth/authorization-server',
      },
      {
        source: '/.well-known/oauth-authorization-server/:path*',
        destination: '/api/oauth/authorization-server',
      },
    ];
  },
};

const withPWA = withPWAInit({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  // Auto-injection of the registration script does not fire in the App Router
  // build, so we register the SW ourselves in <ServiceWorkerRegister />.
  register: false,
  fallbacks: {
    document: '/offline',
  },
  // NEVER precache the workshop PDFs / Mobile Tech Library. They are multi-GB,
  // online-only (served from Supabase Storage), and precaching them would try
  // to cache ~3 GB into the service worker on install and break the PWA.
  publicExcludes: ['!mobile_tech_library/**/*', '!manual/**/*', '!noprecache/**/*'],
  workboxOptions: {
    // Keep API + auth online; cache app shell / static.
    navigateFallbackDenylist: [/^\/api\//, /^\/auth\//],
  },
});

export default withPWA(nextConfig);
