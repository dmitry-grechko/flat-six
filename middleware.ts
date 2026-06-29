import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static, _next/image (build assets)
     * - favicon and common static asset extensions
     * - the app-router metadata icon routes (/icon, /apple-icon) which serve
     *   PNGs from extension-less paths, so the extension filter below misses them
     * - SEO metadata routes (sitemap, robots, manifest, OG/twitter images) which
     *   must be crawlable without a session
     * - the local devshot API route
     * - the MCP server (api/mcp, api/sse): authenticated per-request via Bearer
     *   token, so it must skip the session/redirect gate entirely.
     * 3D assets under /models, /assets, /render-internals.html are static and
     * excluded so they load without a session.
     */
    '/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|sitemap.xml|robots.txt|manifest.webmanifest|opengraph-image|twitter-image|models|assets|api/devshot|api/mcp|api/sse|render-internals|.*\\.(?:svg|png|jpg|jpeg|gif|webp|glb|gltf|ico|css|js|map)$).*)',
  ],
};
