-- Owner: Surya. Photos on past hangouts (Debrief and the Past cards on 04).
-- Run once in the Supabase SQL editor.
-- Same SQL as the "Hangout photos" section at the end of supabase/schema.sql.
-- Only people in a hangout can see, add or remove its photos. The files are in a private
-- Storage bucket, so the page asks for short-lived signed links to show them.

-- 1. A private bucket for the photos: images only, at most 5 MB each (the page shrinks them first)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('hangout-photos', 'hangout-photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- 2. One row per photo. path = where the file is in the bucket: "<hangout id>/<user id>-<time>.jpg"
create table if not exists public.hangout_photos (
  id         uuid primary key default gen_random_uuid(),
  hangout_id uuid not null references public.hangouts (id) on delete cascade,
  user_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  path       text not null unique,
  created_at timestamptz not null default now()
);

create index if not exists hangout_photos_hangout on public.hangout_photos (hangout_id, created_at);

-- 3. Rules for the rows: members see them, add their own, and remove their own (the host can
--    remove any)
alter table public.hangout_photos enable row level security;

drop policy if exists "photos: members read" on public.hangout_photos;
create policy "photos: members read" on public.hangout_photos
  for select to authenticated using (public.is_member(hangout_id));

drop policy if exists "photos: members add own" on public.hangout_photos;
create policy "photos: members add own" on public.hangout_photos
  for insert to authenticated
  with check (user_id = auth.uid() and public.is_member(hangout_id));

drop policy if exists "photos: owner or host removes" on public.hangout_photos;
create policy "photos: owner or host removes" on public.hangout_photos
  for delete to authenticated
  using (user_id = auth.uid() or public.is_host(hangout_id));

-- 4. Rules for the files: the first folder of the path must be a hangout you're in. Compared as
--    text, so a made-up folder name can't cause an error.
drop policy if exists "photo files: members read" on storage.objects;
create policy "photo files: members read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'hangout-photos'
    and exists (
      select 1 from public.hangout_members m
      where m.hangout_id::text = (storage.foldername(name))[1] and m.user_id = auth.uid()
    )
  );

drop policy if exists "photo files: members upload" on storage.objects;
create policy "photo files: members upload" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'hangout-photos'
    and exists (
      select 1 from public.hangout_members m
      where m.hangout_id::text = (storage.foldername(name))[1] and m.user_id = auth.uid()
    )
  );

-- Your own files (uploaded by you), or any file in a hangout you host
drop policy if exists "photo files: owner or host removes" on storage.objects;
create policy "photo files: owner or host removes" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'hangout-photos'
    and (
      owner_id = auth.uid()::text
      or exists (
        select 1 from public.hangouts h
        where h.id::text = (storage.foldername(name))[1] and h.host_id = auth.uid()
      )
    )
  );

-- 5. Make Supabase's API notice the new table straight away
notify pgrst, 'reload schema';
