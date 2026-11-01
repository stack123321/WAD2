-- Owner: Surya. "Delete my account" on 03 Preferences.
-- Run once in the Supabase SQL editor.
-- Same SQL as the "Delete my account" section at the end of supabase/schema.sql.
-- The page can't delete a login itself (that needs the service_role key, which never goes in the
-- browser), so it calls delete_my_account(), which only ever deletes the person calling it.

-- 1. Spots you added stay in your friends' shortlists and votes, with no "added by"
alter table public.shortlist alter column added_by drop not null;
alter table public.shortlist drop constraint if exists shortlist_added_by_fkey;
alter table public.shortlist
  add constraint shortlist_added_by_fkey
  foreign key (added_by) references public.profiles (id) on delete set null;

-- 2. Delete the logged-in user. Hangouts and groups they run pass to the next person who joined,
--    so friends keep them; ones with nobody else in them are removed. Deleting the login removes
--    the profile, and with it their memberships, votes, messages, friends, chats and photo rows.
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  h record;
  g record;
  next_person uuid;
begin
  if me is null then
    raise exception 'Not logged in';
  end if;

  -- Part (a) Hangouts you host
  for h in select id from hangouts where host_id = me loop
    select user_id into next_person
      from hangout_members
      where hangout_id = h.id and user_id <> me
      order by joined_at
      limit 1;
    if next_person is null then
      delete from hangouts where id = h.id;
    else
      update hangouts set host_id = next_person where id = h.id;
    end if;
  end loop;

  -- Part (b) Friend groups you own
  for g in select id from groups where owner_id = me loop
    select user_id into next_person
      from group_members
      where group_id = g.id and user_id <> me
      order by joined_at
      limit 1;
    if next_person is null then
      delete from groups where id = g.id;
    else
      update groups set owner_id = next_person where id = g.id;
    end if;
  end loop;

  -- Part (c) The login itself (the profile and everything under it goes with it)
  delete from auth.users where id = me;
end;
$$;

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- 3. Make Supabase's API notice the new function straight away
notify pgrst, 'reload schema';
