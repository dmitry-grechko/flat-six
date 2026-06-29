# FLAT·SIX MCP Server

FLAT·SIX exposes a real **Streamable-HTTP MCP server** so you can drive your 981
garage from Claude — look up specs and fault codes, search the OEM parts catalog,
and (with auth) read and write your own service history.

- **Endpoint:** `/api/mcp`
  - Local: `http://localhost:3000/api/mcp`
  - Deployed: `https://flat-six.org/api/mcp`
- **Transport:** HTTP (Streamable). Built on [`mcp-handler`](https://github.com/vercel/mcp-handler) `v1.1.0`.
- **Auth:** **OAuth 2.1** (authorization code + PKCE, dynamic client registration).
  Just paste the endpoint URL into Claude — it discovers the OAuth server, opens a
  FLAT·SIX sign-in window, and manages/refreshes the token for you. Knowledge
  tools also work with **no auth**.

There's no token to copy by hand anymore. (A manual `Authorization: Bearer
<supabase-access-token>` still works for the MCP Inspector — get it from
**Settings → CLAUDE / MCP INTEGRATION → TOKEN** — but it expires in ~1 hour.)

---

## Tools

### Open (no auth)
| Tool | Purpose |
| --- | --- |
| `search_981_knowledge` | Full-text search across the 981 knowledge base (faults, specs, maintenance, known issues, articles). |
| `lookup_fault_code` | Resolve an OBD / fault code (e.g. `P0011`) to meaning, causes and fixes. |
| `get_spec` | Look up a torque value, capacity, fluid grade or other spec. |
| `get_maintenance_schedule` | List maintenance items, optionally filtered by system or due mileage. |
| `list_known_issues` | List documented 981 weak points, optionally by system. |
| `find_part` | Search the OEM parts catalog (name / part number / keyword) for part numbers and torque. |

### Authenticated (Bearer token required, RLS-scoped to you)
| Tool | Purpose |
| --- | --- |
| `get_my_vehicles` | List the vehicles in your garage. |
| `get_service_history` | List service records for a vehicle (defaults to your primary vehicle). |
| `log_service_record` | Add a service record to a vehicle. |

If a garage tool is called without a valid token it returns a clear "connect with
a Bearer token" message; the open tools keep working regardless.

---

## Connect from Claude Desktop / claude.ai

1. **Settings → Connectors → Add custom connector**
2. URL = `https://flat-six.org/api/mcp`
3. Click **Connect** → a FLAT·SIX sign-in window opens → approve.

That's the whole flow. Claude registers itself (DCR), runs the OAuth login, and
stores + refreshes the token automatically. Use the **deployed HTTPS URL** here —
these surfaces don't accept `localhost`.

---

## Connect from Claude Code

OAuth (all tools — recommended):
```bash
claude mcp add --transport http flatsix https://flat-six.org/api/mcp
```
On first use Claude Code runs the same OAuth sign-in in your browser.

Open knowledge tools only (skip the login):
```bash
claude mcp add --transport http flatsix https://flat-six.org/api/mcp
# …then just don't authenticate when prompted
```

Manual token instead of OAuth (Inspector-style):
```bash
claude mcp add --transport http flatsix \
  https://flat-six.org/api/mcp \
  --header "Authorization: Bearer <supabase-access-token>"
```

Verify with `claude mcp list`, then ask Claude e.g. *"what's the wheel bolt torque
on a 981?"* (open) or *"log an oil change on my Boxster at 43,000 miles"* (auth).

---

## Local testing with MCP Inspector

```bash
npx @modelcontextprotocol/inspector
```

In the Inspector UI:
1. Transport: **Streamable HTTP**
2. URL: `http://localhost:3000/api/mcp`
3. (Optional) add an `Authorization` header `Bearer <token>` to exercise the
   garage tools.
4. Connect → list tools → call them.

---

## Deploy / setup (one-time)

The OAuth flow needs two things beyond the base Supabase setup:

1. **Service-role key.** Add `SUPABASE_SERVICE_ROLE_KEY` (Supabase → Settings →
   API → `service_role`) to your Vercel project env **and** `.env.local`. It's a
   server-only secret — never `NEXT_PUBLIC`. The OAuth routes use it to manage the
   `oauth_clients` / `oauth_codes` tables.
2. **Migration.** Apply `supabase/migrations/0004_oauth.sql` with `npm run db:push`
   (creates those two tables; RLS on, no policies → service-role-only).

That's it — `flat-six.org` already serves the discovery documents at
`/.well-known/oauth-protected-resource` and `/.well-known/oauth-authorization-server`.

## How auth works (implementation note)

**OAuth 2.1, with the issued tokens *being* the user's Supabase session.** This
keeps Row Level Security as the single source of truth — the resource server never
learns a second identity.

1. Claude fetches `/.well-known/oauth-protected-resource` → finds the auth server
   (`/.well-known/oauth-authorization-server`).
2. Claude self-registers (`POST /api/oauth/register`, DCR) → gets a `client_id`.
3. Browser opens `/oauth/authorize` (PKCE). If there's no session it redirects to
   `/auth/login?next=…` (magic link) and returns. The user approves on a consent
   screen; we mint a single-use code (60 s TTL) bound to the PKCE challenge and the
   user's Supabase access + refresh tokens (`lib/oauth` → `oauth_codes`).
4. Claude exchanges the code at `POST /api/oauth/token` (verifying PKCE) and gets
   back the **Supabase access token** as `access_token` and the **Supabase refresh
   token** as `refresh_token`. Refresh grants delegate straight to Supabase.
5. Claude calls `/api/mcp` with `Authorization: Bearer <access_token>`. The route
   wraps the handler with `withMcpAuth(handler, verifyToken, { required: false })`;
   garage tools read `extra.authInfo?.token` → `lib/mcp/auth.ts → resolveUser`
   builds an RLS-scoped Supabase client. Open tools ignore auth entirely.

Because the access token is a normal Supabase JWT, nothing in `resolveUser` or the
tools changed — OAuth just removes the manual copy-paste and the 1-hour cliff
(Claude refreshes automatically).
