import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Service-role Supabase client. Bypasses Row Level Security, so it is ONLY used
 * by trusted server code (the OAuth routes) for bookkeeping tables that have no
 * RLS policies (oauth_clients / oauth_codes). Never import this into client code.
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY (server-only secret — not NEXT_PUBLIC).
 */
export function createAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      'OAuth requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to be set.',
    );
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
