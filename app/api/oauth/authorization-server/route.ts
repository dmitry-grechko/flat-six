import { getPublicOrigin } from 'mcp-handler';
import { authServerMetadata } from '@/lib/oauth';
import { corsJson, corsPreflight } from '@/lib/oauth/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// RFC 8414 Authorization Server Metadata. Reached via a rewrite from
// /.well-known/oauth-authorization-server.
export function GET(req: Request) {
  return corsJson(authServerMetadata(getPublicOrigin(req)));
}

export function OPTIONS() {
  return corsPreflight();
}
