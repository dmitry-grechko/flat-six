import { createHash, randomBytes } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * OAuth 2.1 authorization-server helpers for the MCP server.
 *
 * The app is both the resource server (/api/mcp) and a thin authorization server.
 * Tokens issued here ARE the user's Supabase session tokens, so resource access
 * stays scoped by Supabase RLS with no extra mapping. This module holds the
 * metadata builders, PKCE verification, and the client/code store.
 */

export const SCOPES = ['garage'] as const;
export const SCOPE_STRING = SCOPES.join(' ');

/** RFC 9728 — Protected Resource Metadata for /api/mcp. */
export function protectedResourceMetadata(origin: string) {
  return {
    resource: `${origin}/api/mcp`,
    authorization_servers: [origin],
    scopes_supported: [...SCOPES],
    bearer_methods_supported: ['header'],
    resource_documentation: `${origin}/settings`,
  };
}

/** RFC 8414 — Authorization Server Metadata. */
export function authServerMetadata(origin: string) {
  return {
    issuer: origin,
    authorization_endpoint: `${origin}/oauth/authorize`,
    token_endpoint: `${origin}/api/oauth/token`,
    registration_endpoint: `${origin}/api/oauth/register`,
    response_types_supported: ['code'],
    response_modes_supported: ['query'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    code_challenge_methods_supported: ['S256'],
    token_endpoint_auth_methods_supported: ['none'],
    scopes_supported: [...SCOPES],
  };
}

// ---------------------------------------------------------------------------
// PKCE
// ---------------------------------------------------------------------------

/** Verify an RFC 7636 S256 PKCE challenge against the verifier. */
export function verifyPkceS256(verifier: string, challenge: string): boolean {
  if (!verifier || !challenge) return false;
  const hashed = createHash('sha256').update(verifier).digest('base64url');
  return timingSafeEqualStr(hashed, challenge);
}

function timingSafeEqualStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

/** Best-effort `exp` (seconds since epoch) from a Supabase access JWT. */
export function jwtExpiresIn(accessToken: string, fallback = 3600): number {
  try {
    const payload = JSON.parse(
      Buffer.from(accessToken.split('.')[1], 'base64url').toString('utf8'),
    );
    if (typeof payload.exp === 'number') {
      const secs = payload.exp - Math.floor(Date.now() / 1000);
      if (secs > 0) return secs;
    }
  } catch {
    /* not a JWT we can read — fall through */
  }
  return fallback;
}

// ---------------------------------------------------------------------------
// Client registration (DCR — RFC 7591)
// ---------------------------------------------------------------------------

export interface OAuthClient {
  client_id: string;
  client_name: string | null;
  redirect_uris: string[];
  grant_types: string[];
  token_endpoint_auth_method: string;
}

export async function registerClient(input: {
  redirect_uris: string[];
  client_name?: string;
  grant_types?: string[];
}): Promise<OAuthClient> {
  const admin = createAdminClient();
  const client_id = `mcp_${randomToken(18)}`;
  const row = {
    client_id,
    client_name: input.client_name ?? null,
    redirect_uris: input.redirect_uris,
    grant_types: input.grant_types?.length
      ? input.grant_types
      : ['authorization_code', 'refresh_token'],
    token_endpoint_auth_method: 'none',
  };
  const { error } = await admin.from('oauth_clients').insert(row);
  if (error) throw new Error(`Failed to register client: ${error.message}`);
  return row;
}

export async function getClient(clientId: string): Promise<OAuthClient | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from('oauth_clients')
    .select('*')
    .eq('client_id', clientId)
    .maybeSingle();
  return (data as OAuthClient) ?? null;
}

/** A registered redirect_uri must match exactly (no wildcards). */
export function redirectUriAllowed(client: OAuthClient, redirectUri: string): boolean {
  return client.redirect_uris.includes(redirectUri);
}

// ---------------------------------------------------------------------------
// Authorization codes
// ---------------------------------------------------------------------------

const CODE_TTL_SECONDS = 60;

export async function createAuthCode(input: {
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  userId: string;
  accessToken: string;
  refreshToken: string;
  scope?: string;
  resource?: string;
}): Promise<string> {
  const admin = createAdminClient();
  const code = randomToken(32);
  const expires_at = new Date(Date.now() + CODE_TTL_SECONDS * 1000).toISOString();
  const { error } = await admin.from('oauth_codes').insert({
    code,
    client_id: input.clientId,
    redirect_uri: input.redirectUri,
    code_challenge: input.codeChallenge,
    code_challenge_method: input.codeChallengeMethod,
    user_id: input.userId,
    access_token: input.accessToken,
    refresh_token: input.refreshToken,
    scope: input.scope ?? SCOPE_STRING,
    resource: input.resource ?? null,
    expires_at,
  });
  if (error) throw new Error(`Failed to create auth code: ${error.message}`);
  return code;
}

export interface ConsumedCode {
  client_id: string;
  redirect_uri: string;
  code_challenge: string;
  code_challenge_method: string;
  user_id: string;
  access_token: string;
  refresh_token: string;
  scope: string | null;
  expires_at: string;
}

/**
 * Atomically claim a code: flips used=false → true and returns the row only if it
 * was previously unused. Returns null if missing or already redeemed (replay).
 */
export async function consumeAuthCode(code: string): Promise<ConsumedCode | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from('oauth_codes')
    .update({ used: true })
    .eq('code', code)
    .eq('used', false)
    .select('*')
    .maybeSingle();
  return (data as ConsumedCode) ?? null;
}

// ---------------------------------------------------------------------------
// Refresh grant — delegate straight to Supabase.
// ---------------------------------------------------------------------------

export async function refreshSupabaseSession(refreshToken: string): Promise<{
  access_token: string;
  refresh_token: string;
} | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  const supabase = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });
  if (error || !data.session) return null;
  return {
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  };
}
