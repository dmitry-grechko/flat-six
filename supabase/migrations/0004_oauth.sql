-- OAuth 2.1 support for the MCP server.
--
-- The app acts as an OAuth Authorization Server so MCP clients (Claude Desktop /
-- claude.ai custom connectors) can log the user in and obtain tokens, instead of
-- the user pasting a short-lived Supabase JWT by hand.
--
-- Design: the tokens we issue ARE the user's Supabase session tokens (access =
-- Supabase JWT, refresh = Supabase refresh token). So Row Level Security keeps
-- scoping every garage tool to the user with no extra plumbing. These two tables
-- only hold OAuth bookkeeping; both are accessed exclusively by server routes
-- using the service-role key. RLS is enabled with NO policies, so anon and
-- authenticated roles are denied entirely and only the service role (which
-- bypasses RLS) can read/write them.

-- Dynamically-registered clients (RFC 7591). Public clients (PKCE, no secret).
create table if not exists public.oauth_clients (
  client_id                  text primary key,
  client_name                text,
  redirect_uris              text[] not null default '{}',
  grant_types                text[] not null default '{authorization_code,refresh_token}',
  token_endpoint_auth_method text   not null default 'none',
  created_at                 timestamptz not null default now()
);

-- Short-lived, single-use authorization codes. Each row carries the user's
-- Supabase session tokens captured at consent time; the token endpoint returns
-- them once and the row is marked used. Codes expire in ~60s (enforced in app
-- code); a periodic cleanup of expired/used rows is optional.
create table if not exists public.oauth_codes (
  code                 text primary key,
  client_id            text not null,
  redirect_uri         text not null,
  code_challenge       text not null,
  code_challenge_method text not null default 'S256',
  user_id              uuid not null,
  access_token         text not null,
  refresh_token        text not null,
  scope                text,
  resource             text,
  expires_at           timestamptz not null,
  used                 boolean not null default false,
  created_at           timestamptz not null default now()
);

create index if not exists oauth_codes_expires_at_idx on public.oauth_codes (expires_at);

alter table public.oauth_clients enable row level security;
alter table public.oauth_codes   enable row level security;
-- Intentionally no policies: service-role-only access.
