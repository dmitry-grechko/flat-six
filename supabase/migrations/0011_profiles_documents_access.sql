-- Per-user gate for factory document preview (PDF library + deep links).
-- Default OFF for new sign-ups. Existing users are grandfathered ON below.
-- Embeddings / manual search are unaffected — this only controls viewing PDFs.

alter table public.profiles
  add column if not exists documents_access boolean not null default false;

comment on column public.profiles.documents_access is
  'When true, user may open /manual PDF library and document deep links. Default false for new accounts.';

-- Grandfather everyone who already has an account.
update public.profiles
set documents_access = true
where documents_access = false;
