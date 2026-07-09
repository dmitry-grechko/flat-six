# Supabase setup — FLAT·SIX Porsche Garage

The app is a Next.js monolith. The only external dependency is **Supabase**
(Postgres + Auth). Everything below is a one-time setup; the schema, auth wiring,
and data layer are already in the codebase.

## 1. Create the project

1. Go to <https://supabase.com> → **New project** (free tier).
2. Pick a name + database password, choose a region near your users.
3. When it's ready, open **Project Settings → API** and copy:
   - **Project URL** (`https://<ref>.supabase.co`)
   - **anon public** key
4. Note the **Reference ID** (Project Settings → General), e.g. `abcdwxyz1234`.

## 2. Add environment variables

```bash
cp .env.local.example .env.local
```

Paste the two values into `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon public key>
```

## 3. Push the database schema

The CLI ships as a dev dependency, so use it via `npx`:

```bash
npx supabase login                       # opens a browser, one time
npx supabase link --project-ref <ref>    # links this repo to your project
npm run db:push                          # applies supabase/migrations/* to the DB
```

This creates the `profiles`, `vehicles`, `service_records`, and `service_plans`
tables with Row Level Security and the new-user trigger. Verify in the dashboard
under **Table editor** and **Authentication → Policies**.

> Migrations are applied in order. `0001_init.sql` creates the core tables;
> `0002_service_plans_and_items.sql` adds the `service_plans` table (planned work
> with parts + how-to links) and a `notes` column on `service_records`. Service
> record/plan `items` are flexible jsonb line items — see `lib/types.ts`.

## 4. Configure auth URLs (magic link)

Dashboard → **Authentication → URL Configuration**:

- **Site URL**: `http://localhost:3000` for local dev (change to your Vercel URL in
  production).
- **Redirect URLs**: add
  - `http://localhost:3000/auth/callback`
  - `https://<your-vercel-domain>/auth/callback`

Email / magic link is enabled by default on the free tier. No SMTP setup needed for
low volume (Supabase sends from its own domain, rate-limited). For higher volume,
plug a free Resend account into Authentication → Emails later.

### Branded email templates

The FLAT·SIX-styled HTML email templates live in `supabase/templates/` and are
wired in `supabase/config.toml` under `[auth.email.template.*]` (magic link,
confirmation, recovery, invite, email change). The CLI applies these to the local
stack automatically. **For the hosted project, the dashboard is the source of
truth:** open **Authentication → Email Templates**, and for each template paste the
matching file's HTML and subject. GoTrue variables (`{{ .ConfirmationURL }}`,
`{{ .Email }}`, `{{ .NewEmail }}`) are already in place.

## 5. Run it

```bash
npm run dev
```

Open <http://localhost:3000> → you'll be redirected to `/auth/login`. Enter your
email, click the magic link, and you land in the garage.

## 6. Deploy to Vercel

1. Import the repo into Vercel.
2. Add the same two env vars (`NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`) in **Project → Settings → Environment Variables**.
3. Deploy, then add the production `/auth/callback` URL to the Supabase redirect
   list (step 4) and update the Site URL.

## Notes

- The `anon` key is meant to be public — Row Level Security is what protects data, so
  users can only ever read/write their own vehicles and records.
- Reference data (components, fault library, OEM part catalog) stays in the app code
  (`lib/data.ts`, `lib/catalog.json`); it's shared and identical for everyone.
- Free projects pause after ~1 week of inactivity; restore with one click in the
  dashboard.
- `app/api/devshot` is a DEV-ONLY route for capturing 3D renders — remove before a
  public production deploy.
