import { createMcpHandler, withMcpAuth } from 'mcp-handler';
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
import { registerTools } from '@/lib/mcp/tools';

// Supabase + the MCP SDK need Node APIs, so pin this route to the Node runtime.
export const runtime = 'nodejs';
// MCP requests are dynamic; never cache or statically optimise them.
export const dynamic = 'force-dynamic';

const handler = createMcpHandler(
  (server) => {
    registerTools(server);
  },
  {
    serverInfo: { name: 'flatsix-981-garage', version: '0.1.0' },
  },
  {
    // The dynamic route lives at app/api/[transport]/route.ts, so the transport
    // segment ("mcp") sits directly under /api → the endpoint is /api/mcp.
    basePath: '/api',
    maxDuration: 60,
    verboseLogs: process.env.NODE_ENV !== 'production',
  },
);

/**
 * Pass the incoming Bearer token straight through as authInfo.token. We do NOT
 * validate it here (required: false) so the open knowledge tools keep working
 * for unauthenticated clients; the per-user garage tools validate the token
 * against Supabase themselves (lib/mcp/auth.ts → resolveUser).
 */
const verifyToken = async (
  _req: Request,
  bearerToken?: string,
): Promise<AuthInfo | undefined> => {
  if (!bearerToken) return undefined;
  return {
    token: bearerToken,
    // The real identity + scoping is resolved per-call via Supabase RLS.
    clientId: 'flatsix-bearer',
    scopes: [],
  };
};

const authedHandler = withMcpAuth(handler, verifyToken, {
  // Auth stays optional so the open knowledge tools keep working with no token.
  // Claude Desktop / claude.ai discover the OAuth server via the protected-resource
  // metadata document and run the login flow on connect; garage tools then unlock.
  required: false,
  // Points the WWW-Authenticate challenge (emitted when a supplied token is
  // invalid/expired) at our discovery document, per RFC 9728.
  resourceMetadataPath: '/.well-known/oauth-protected-resource',
});

export { authedHandler as GET, authedHandler as POST, authedHandler as DELETE };
