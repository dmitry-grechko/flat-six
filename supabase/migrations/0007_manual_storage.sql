-- Private Supabase Storage bucket for the 981 factory workshop manual PDF.
-- The PDF is © Porsche — not world-readable. Authenticated garage users may
-- download via signed URLs; uploads are service-role only (npm run manual:upload).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'workshop-manual',
  'workshop-manual',
  false,
  524288000,  -- 500 MB
  array['application/pdf']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Authenticated users can read (required for createSignedUrl + download).
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'workshop_manual_read_authed'
  ) then
    create policy "workshop_manual_read_authed" on storage.objects
      for select to authenticated
      using (bucket_id = 'workshop-manual');
  end if;
end $$;

-- No INSERT/UPDATE/DELETE policies for authenticated — uploads via service role only.
