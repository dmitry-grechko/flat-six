/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // model-viewer is a web component loaded from CDN; nothing to transpile.

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

export default nextConfig;
