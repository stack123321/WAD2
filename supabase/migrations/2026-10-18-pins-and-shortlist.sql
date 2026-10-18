-- Owner: Matrix. Run once in Supabase → SQL Editor to bring the live database up to schema.sql.
-- Safe to run again: every step checks whether it's already done.
-- (schema.sql already has these changes, so a brand-new database doesn't need this file.)

-- 1. Pinned hangouts (Ryan, 04 My hangouts). Per person: it's on your own hangout_members row,
--    which "members: edit own row" already lets you update.
alter table public.hangout_members
  add column if not exists pinned boolean not null default false;

-- 2. Shortlist: the host can remove any spot, not just their own (Hugo, 09 "Remove")
drop policy if exists "shortlist: adder removes" on public.shortlist;
drop policy if exists "shortlist: adder or host removes" on public.shortlist;
create policy "shortlist: adder or host removes" on public.shortlist
  for delete to authenticated using (added_by = auth.uid() or public.is_host(hangout_id));

-- 3. Shortlist: at most 3 spots per person per hangout (Hugo, 09 "2 of 3 added").
--    The lock makes two quick "Add" clicks wait for each other, so both can't slip in as the 3rd.
create or replace function public.enforce_shortlist_limit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform pg_advisory_xact_lock(hashtext(new.hangout_id::text), hashtext(new.added_by::text));
  if (select count(*) from public.shortlist
      where hangout_id = new.hangout_id and added_by = new.added_by) >= 3 then
    raise exception 'You can only add 3 spots to the shortlist';
  end if;
  return new;
end $$;

drop trigger if exists shortlist_limit on public.shortlist;
create trigger shortlist_limit before insert on public.shortlist
  for each row execute function public.enforce_shortlist_limit();

-- 4. Make Supabase's API notice the new column straight away
notify pgrst, 'reload schema';
