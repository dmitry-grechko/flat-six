import {
  consumeAuthCode,
  refreshSupabaseSession,
  verifyPkceS256,
  jwtExpiresIn,
  SCOPE_STRING,
} from '@/lib/oauth';
import { corsJson, corsPreflight } from '@/lib/oauth/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Token endpoint (RFC 6749 §3.2). Supports:
 *  - authorization_code (with PKCE) → returns the user's Supabase session tokens
 *  - refresh_token → delegates to Supabase to mint a fresh session
 *
 * The access_token we return is a Supabase JWT; the resource server (/api/mcp)
 * validates it via resolveUser() and RLS scopes everything to the user.
 */
export async function POST(req: Request) {
  const form = await readForm(req);
  const grantType = form.get('grant_type');

  if (grantType === 'authorization_code') {
    return handleAuthorizationCode(form);
  }
  if (grantType === 'refresh_token') {
    return handleRefresh(form);
  }
  return corsJson({ error: 'unsupported_grant_type' }, 400);
}

async function handleAuthorizationCode(form: URLSearchParams): Promise<Response> {
  const code = form.get('code');
  const redirectUri = form.get('redirect_uri');
  const clientId = form.get('client_id');
  const codeVerifier = form.get('code_verifier');

  if (!code || !redirectUri || !clientId || !codeVerifier) {
    return corsJson(
      { error: 'invalid_request', error_description: 'Missing code, redirect_uri, client_id or code_verifier.' },
      400,
    );
  }

  const row = await consumeAuthCode(code);
  if (!row) {
    return corsJson({ error: 'invalid_grant', error_description: 'Code is invalid or already used.' }, 400);
  }
  if (new Date(row.expires_at).getTime() < Date.now()) {
    return corsJson({ error: 'invalid_grant', error_description: 'Code expired.' }, 400);
  }
  if (row.client_id !== clientId || row.redirect_uri !== redirectUri) {
    return corsJson({ error: 'invalid_grant', error_description: 'client_id / redirect_uri mismatch.' }, 400);
  }
  if (!verifyPkceS256(codeVerifier, row.code_challenge)) {
    return corsJson({ error: 'invalid_grant', error_description: 'PKCE verification failed.' }, 400);
  }

  return corsJson({
    access_token: row.access_token,
    token_type: 'Bearer',
    expires_in: jwtExpiresIn(row.access_token),
    refresh_token: row.refresh_token,
    scope: row.scope ?? SCOPE_STRING,
  });
}

async function handleRefresh(form: URLSearchParams): Promise<Response> {
  const refreshToken = form.get('refresh_token');
  if (!refreshToken) {
    return corsJson({ error: 'invalid_request', error_description: 'Missing refresh_token.' }, 400);
  }
  const session = await refreshSupabaseSession(refreshToken);
  if (!session) {
    return corsJson({ error: 'invalid_grant', error_description: 'Refresh token is invalid or expired.' }, 400);
  }
  return corsJson({
    access_token: session.access_token,
    token_type: 'Bearer',
    expires_in: jwtExpiresIn(session.access_token),
    refresh_token: session.refresh_token,
    scope: SCOPE_STRING,
  });
}

/** Accept both form-encoded (spec default) and JSON bodies. */
async function readForm(req: Request): Promise<URLSearchParams> {
  const contentType = req.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    const json = await req.json().catch(() => ({}));
    return new URLSearchParams(json as Record<string, string>);
  }
  const text = await req.text();
  return new URLSearchParams(text);
}

export function OPTIONS() {
  return corsPreflight();
}
