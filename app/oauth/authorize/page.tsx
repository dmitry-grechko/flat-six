import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getClient, redirectUriAllowed, createAuthCode } from '@/lib/oauth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const mono = "'JetBrains Mono',monospace";
const sans = "'Helvetica Neue',Arial,sans-serif";
const RED = 'var(--red, #D5001C)';

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined): string => (Array.isArray(v) ? v[0] : v) ?? '';

/** Append query params to a (possibly already-queried) redirect URI. */
function withParams(redirectUri: string, params: Record<string, string>): string {
  const url = new URL(redirectUri);
  for (const [k, v] of Object.entries(params)) if (v) url.searchParams.set(k, v);
  return url.toString();
}

// ---------------------------------------------------------------------------
// Server actions
// ---------------------------------------------------------------------------

async function approve(formData: FormData) {
  'use server';
  const clientId = String(formData.get('client_id') ?? '');
  const redirectUri = String(formData.get('redirect_uri') ?? '');
  const codeChallenge = String(formData.get('code_challenge') ?? '');
  const codeChallengeMethod = String(formData.get('code_challenge_method') ?? 'S256');
  const state = String(formData.get('state') ?? '');
  const scope = String(formData.get('scope') ?? '');
  const resource = String(formData.get('resource') ?? '');

  // Re-validate (never trust the hidden fields blindly).
  const client = await getClient(clientId);
  if (!client || !redirectUriAllowed(client, redirectUri) || !codeChallenge) {
    redirect(`/oauth/authorize?error=invalid_request`);
  }

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: { session } } = await supabase.auth.getSession();
  if (!user || !session) {
    // Session vanished mid-flow — bounce through login again.
    redirect(`/auth/login`);
  }

  const code = await createAuthCode({
    clientId,
    redirectUri,
    codeChallenge,
    codeChallengeMethod,
    userId: user!.id,
    accessToken: session!.access_token,
    refreshToken: session!.refresh_token,
    scope: scope || undefined,
    resource: resource || undefined,
  });

  redirect(withParams(redirectUri, { code, state }));
}

async function deny(formData: FormData) {
  'use server';
  const redirectUri = String(formData.get('redirect_uri') ?? '');
  const state = String(formData.get('state') ?? '');
  const clientId = String(formData.get('client_id') ?? '');
  const client = await getClient(clientId);
  if (client && redirectUriAllowed(client, redirectUri)) {
    redirect(withParams(redirectUri, { error: 'access_denied', state }));
  }
  redirect('/');
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function AuthorizePage({ searchParams }: { searchParams: SP }) {
  const responseType = one(searchParams.response_type);
  const clientId = one(searchParams.client_id);
  const redirectUri = one(searchParams.redirect_uri);
  const codeChallenge = one(searchParams.code_challenge);
  const codeChallengeMethod = one(searchParams.code_challenge_method) || 'S256';
  const state = one(searchParams.state);
  const scope = one(searchParams.scope);
  const resource = one(searchParams.resource);

  // --- Validate the request before showing anything ---
  if (one(searchParams.error)) return <ErrorCard message="That authorization request was invalid. Please reconnect from your MCP client." />;
  if (responseType !== 'code') return <ErrorCard message="Unsupported response_type — only the authorization code flow is supported." />;
  if (!codeChallenge || codeChallengeMethod !== 'S256') return <ErrorCard message="This server requires PKCE (S256). Your client did not provide a valid code challenge." />;
  if (!clientId || !redirectUri) return <ErrorCard message="Missing client_id or redirect_uri." />;

  const client = await getClient(clientId);
  if (!client) return <ErrorCard message="Unknown client. Try removing and re-adding the connector so it registers again." />;
  if (!redirectUriAllowed(client, redirectUri)) return <ErrorCard message="The redirect URI does not match this client's registration." />;

  // --- Require a logged-in user; if absent, go log in and come back here ---
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    const back = `/oauth/authorize?${new URLSearchParams({
      response_type: responseType,
      client_id: clientId,
      redirect_uri: redirectUri,
      code_challenge: codeChallenge,
      code_challenge_method: codeChallengeMethod,
      ...(state ? { state } : {}),
      ...(scope ? { scope } : {}),
      ...(resource ? { resource } : {}),
    }).toString()}`;
    redirect(`/auth/login?next=${encodeURIComponent(back)}`);
  }

  const appName = client.client_name || 'An MCP client';

  return (
    <Shell>
      <Kicker>AUTHORIZE CONNECTION</Kicker>
      <h1 style={{ margin: '8px 0 0', font: `300 26px/1.2 ${sans}`, color: '#0B0B0C' }}>
        Connect <strong style={{ fontWeight: 600 }}>{appName}</strong> to your garage?
      </h1>
      <p style={{ margin: '14px 0 0', font: `400 14px/1.6 ${sans}`, color: '#6E6E73' }}>
        Signed in as <strong style={{ color: '#0B0B0C' }}>{user!.email}</strong>. Approving lets this client read and write
        your vehicles and service history through the FLAT·SIX MCP server, on your behalf.
      </p>

      <ul style={{ margin: '20px 0 0', padding: 0, listStyle: 'none', display: 'grid', gap: 10 }}>
        <Grant text="Read your vehicles, service history and plans" />
        <Grant text="Add and update service records and plans" />
        <Grant text="Look up 981 specs, fault codes and parts (open data)" />
      </ul>

      <div style={{ marginTop: 14, font: `400 12px/1.5 ${sans}`, color: '#9A9AA0' }}>
        You can revoke access any time by signing out or removing the connector. Individual reads and writes still ask for
        your approval inside your MCP client.
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 26 }}>
        <form action={approve} style={{ flex: 1 }}>
          <HiddenFields {...{ clientId, redirectUri, codeChallenge, codeChallengeMethod, state, scope, resource }} />
          <button type="submit" style={primaryBtn}>Approve &amp; connect</button>
        </form>
        <form action={deny}>
          <HiddenFields {...{ clientId, redirectUri, codeChallenge, codeChallengeMethod, state, scope, resource }} />
          <button type="submit" style={ghostBtn}>Deny</button>
        </form>
      </div>
    </Shell>
  );
}

// ---------------------------------------------------------------------------
// Presentational bits
// ---------------------------------------------------------------------------

function HiddenFields(p: {
  clientId: string; redirectUri: string; codeChallenge: string;
  codeChallengeMethod: string; state: string; scope: string; resource: string;
}) {
  return (
    <>
      <input type="hidden" name="client_id" value={p.clientId} />
      <input type="hidden" name="redirect_uri" value={p.redirectUri} />
      <input type="hidden" name="code_challenge" value={p.codeChallenge} />
      <input type="hidden" name="code_challenge_method" value={p.codeChallengeMethod} />
      <input type="hidden" name="state" value={p.state} />
      <input type="hidden" name="scope" value={p.scope} />
      <input type="hidden" name="resource" value={p.resource} />
    </>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ECECEE', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 440, background: '#fff', border: '1px solid #E3E3E5', borderRadius: 6, padding: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 22 }}>
          <div style={{ width: 11, height: 11, background: RED }} />
          <div style={{ font: `700 13px/1 ${mono}`, letterSpacing: '.26em', color: '#0B0B0C' }}>FLAT·SIX</div>
        </div>
        {children}
      </div>
    </div>
  );
}

function Kicker({ children }: { children: React.ReactNode }) {
  return <div style={{ font: `500 10px/1 ${mono}`, letterSpacing: '.18em', color: RED }}>{children}</div>;
}

function Grant({ text }: { text: string }) {
  return (
    <li style={{ display: 'flex', alignItems: 'flex-start', gap: 10, font: `400 13.5px/1.5 ${sans}`, color: '#1A1A1E' }}>
      <span style={{ color: RED, fontFamily: mono, lineHeight: 1.4 }}>›</span>
      <span>{text}</span>
    </li>
  );
}

function ErrorCard({ message }: { message: string }) {
  return (
    <Shell>
      <Kicker>AUTHORIZATION ERROR</Kicker>
      <p style={{ margin: '12px 0 0', font: `400 14px/1.6 ${sans}`, color: '#1A1A1E' }}>{message}</p>
    </Shell>
  );
}

const primaryBtn: React.CSSProperties = {
  width: '100%', height: 46, border: 'none', borderRadius: 2, cursor: 'pointer',
  background: RED, color: '#fff', font: `600 11px/1 ${sans}`, letterSpacing: '.1em', textTransform: 'uppercase',
};
const ghostBtn: React.CSSProperties = {
  height: 46, padding: '0 20px', borderRadius: 2, cursor: 'pointer',
  background: 'transparent', color: '#6E6E73', border: '1px solid #D2D2D6',
  font: `600 11px/1 ${sans}`, letterSpacing: '.1em', textTransform: 'uppercase',
};
