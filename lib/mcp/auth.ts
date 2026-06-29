import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Result of resolving a Bearer token to a Supabase identity for the garage MCP
 * tools. On success it carries a Supabase client whose every request includes
 * the user's JWT, so Row Level Security scopes all reads/writes to that user.
 */
export interface AuthedUser {
  userId: string;
  email: string | null;
  supabase: SupabaseClient;
}

/** Error message shown by garage tools when no/invalid token is supplied. */
export const AUTH_REQUIRED_MESSAGE =
  'This tool needs your garage account. Connect with an Authorization: Bearer <token> ' +
  'header (your Supabase access token — copy it from Settings → MCP). Knowledge tools work without it.';

/**
 * Build a Supabase client authenticated as the bearer-token holder and confirm
 * the token resolves to a real user. Returns null when there is no token or the
 * token is invalid/expired, so callers can return AUTH_REQUIRED_MESSAGE.
 *
 * The client forwards the JWT on every request (global Authorization header), so
 * Postgres RLS sees auth.uid() = the token's user and scopes rows automatically.
 */
export async function resolveUser(token: string | undefined): Promise<AuthedUser | null> {
  if (!token) return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;

  const supabase = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) return null;

  return { userId: user.id, email: user.email ?? null, supabase };
}

let _publicClient: SupabaseClient | null = null;

/**
 * Anonymous Supabase client for OPEN tools that read world-readable reference
 * data (e.g. the parts catalog, protected by a `using (true)` RLS read policy).
 * Returns null when Supabase env vars are absent so callers can fall back to the
 * static catalog. Memoized — no per-call auth.
 */
export function publicClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  if (!_publicClient) {
    _publicClient = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _publicClient;
}
