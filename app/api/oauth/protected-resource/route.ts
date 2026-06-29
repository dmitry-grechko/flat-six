import { getPublicOrigin } from 'mcp-handler';
import { protectedResourceMetadata } from '@/lib/oauth';
import { corsJson, corsPreflight } from '@/lib/oauth/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// RFC 9728 Protected Resource Metadata. Reached via a rewrite from
// /.well-known/oauth-protected-resource (Next ignores dot-folders in app/).
export function GET(req: Request) {
  return corsJson(protectedResourceMetadata(getPublicOrigin(req)));
}

export function OPTIONS() {
  return corsPreflight();
}
