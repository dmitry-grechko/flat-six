import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { DEMO_MODE } from '@/lib/demo';

/**
 * Paths that are reachable without a session.
 * - /auth: login / magic-link callback.
 * - /api/mcp, /api/sse: the MCP server. Claude authenticates per-request with a
 *   Bearer token (not a session cookie), so it must never be redirected to login.
 *   Open knowledge tools work with no token at all.
 * - /.well-known, /api/oauth: OAuth discovery + token/register endpoints (no
 *   session; clients authenticate via the OAuth flow itself).
 * - /oauth: the authorize/consent page gates itself (redirects to login when
 *   there is no session), so middleware must let it through to run that logic.
 */
const PUBLIC_PREFIXES = ['/auth', '/api/mcp', '/api/sse', '/.well-known', '/api/oauth', '/oauth'];

function isPublic(pathname: string): boolean {
  // The marketing landing page and the privacy/terms page are public.
  if (pathname === '/' || pathname === '/legal') return true;
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

/**
 * Refreshes the Supabase session cookie on every request and gates the app behind
 * auth: unauthenticated users are redirected to /auth/login. Called from the root
 * middleware.ts.
 */
export async function updateSession(request: NextRequest) {
  // DEMO MODE: skip Supabase entirely — never redirect to login, never touch the
  // session. Works even with no/placeholder Supabase credentials.
  if (DEMO_MODE) return NextResponse.next({ request });

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: do not run code between createServerClient and getUser() — it keeps
  // the session fresh and avoids hard-to-debug logout bugs.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!user && !isPublic(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth/login';
    return NextResponse.redirect(url);
  }

  // Signed-in users hitting the login page go straight to the garage.
  if (user && pathname === '/auth/login') {
    const url = request.nextUrl.clone();
    url.pathname = '/garage';
    return NextResponse.redirect(url);
  }

  return response;
}
