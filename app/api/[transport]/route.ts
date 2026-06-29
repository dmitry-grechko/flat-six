import { createMcpHandler, withMcpAuth } from 'mcp-handler';
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
import { registerTools } from '@/lib/mcp/tools';
import { resolveUser } from '@/lib/mcp/auth';

// Supabase + the MCP SDK need Node APIs, so pin this route to the Node runtime.
export const runtime = 'nodejs';
// MCP requests are dynamic; never cache or statically optimise them.
export const dynamic = 'force-dynamic';

// Canonical deployed origin (apex redirects here). Used for the absolute icon
// URLs advertised to MCP clients so the connector shows the FLAT·SIX mark.
const SITE = 'https://www.flat-six.org';

// `serverInfo` is forwarded verbatim to the SDK's McpServer (Implementation),
// which supports title / websiteUrl / icons beyond mcp-handler's narrow types —
// hence the cast. Clients (Claude Desktop / claude.ai) render `icons` as the
// connector's icon.
const serverInfo = {
  name: 'flatsix-981-garage',
  title: 'FLAT·SIX · 981 Garage',
  version: '0.1.0',
  websiteUrl: SITE,
  icons: [
    { src: `${SITE}/icon.svg`, mimeType: 'image/svg+xml', sizes: ['any'] },
    { src: `${SITE}/icon`, mimeType: 'image/png', sizes: ['96x96'] },
    { src: `${SITE}/apple-icon`, mimeType: 'image/png', sizes: ['180x180'] },
  ],
} as { name: string; version: string };

const handler = createMcpHandler(
  (server) => {
    registerTools(server);
  },
  {
    serverInfo,
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
 * Validate the incoming Bearer token against Supabase. Returning `undefined`
 * (no token, or an invalid/expired one) makes withMcpAuth respond with
 * 401 + WWW-Authenticate pointing at our protected-resource metadata — which is
 * what makes MCP clients (Claude Desktop / claude.ai / Claude Code) actually run
 * the OAuth login instead of connecting anonymously. On a valid token the client
 * already knows who you are, so every tool (open + garage) works.
 */
const verifyToken = async (
  _req: Request,
  bearerToken?: string,
): Promise<AuthInfo | undefined> => {
  if (!bearerToken) return undefined;
  const user = await resolveUser(bearerToken);
  if (!user) return undefined; // invalid/expired → 401 → client (re)authenticates
  return {
    token: bearerToken,
    clientId: 'flatsix-bearer',
    scopes: ['garage'],
    // Surfaced for debugging; garage tools still resolve their own RLS client.
    extra: { userId: user.userId, email: user.email ?? undefined },
  };
};

const authedHandler = withMcpAuth(handler, verifyToken, {
  // Require auth so the server CHALLENGES unauthenticated clients with a 401.
  // That challenge is the trigger for the OAuth login; without it clients just
  // connect anonymously and never learn who the user is.
  required: true,
  // Points the WWW-Authenticate challenge at our discovery document (RFC 9728).
  resourceMetadataPath: '/.well-known/oauth-protected-resource',
});

export { authedHandler as GET, authedHandler as POST, authedHandler as DELETE };
