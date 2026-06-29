import { registerClient } from '@/lib/oauth';
import { corsJson, corsPreflight } from '@/lib/oauth/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Dynamic Client Registration (RFC 7591). Claude posts its redirect URI(s) and a
 * client name; we mint a public client_id (PKCE, no secret) and store it.
 */
export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return corsJson({ error: 'invalid_client_metadata', error_description: 'Body must be JSON.' }, 400);
  }

  const redirectUris = Array.isArray(body.redirect_uris)
    ? (body.redirect_uris as unknown[]).filter((u): u is string => typeof u === 'string')
    : [];

  if (redirectUris.length === 0) {
    return corsJson(
      { error: 'invalid_redirect_uri', error_description: 'At least one redirect_uri is required.' },
      400,
    );
  }

  // Only public clients are supported (PKCE). Reject anything else explicitly.
  const authMethod =
    typeof body.token_endpoint_auth_method === 'string'
      ? body.token_endpoint_auth_method
      : 'none';
  if (authMethod !== 'none') {
    return corsJson(
      {
        error: 'invalid_client_metadata',
        error_description: 'Only public clients (token_endpoint_auth_method=none) are supported.',
      },
      400,
    );
  }

  const client = await registerClient({
    redirect_uris: redirectUris,
    client_name: typeof body.client_name === 'string' ? body.client_name : undefined,
    grant_types: Array.isArray(body.grant_types)
      ? (body.grant_types as unknown[]).filter((g): g is string => typeof g === 'string')
      : undefined,
  });

  return corsJson(
    {
      client_id: client.client_id,
      client_name: client.client_name,
      redirect_uris: client.redirect_uris,
      grant_types: client.grant_types,
      response_types: ['code'],
      token_endpoint_auth_method: client.token_endpoint_auth_method,
    },
    201,
  );
}

export function OPTIONS() {
  return corsPreflight();
}
