-- Owner: Surya. Once the host closes the vote (or its closing time passes), nobody can vote or
-- change their vote any more, even from a page that hasn't refreshed. Before, the rules only
-- checked that you were a member. Taking a vote back ("votes: remove own") stays allowed,
-- because Leave hangout removes your vote first.
-- Run once in the Supabase SQL editor. Same SQL as supabase/schema.sql.

-- True while the hangout is voting and its closing time (if any) hasn't passed
create or replace function public.voting_open(hid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from hangouts
    where id = hid and status = 'voting' and (vote_deadline is null or vote_deadline > now())
  );
$$;

drop policy if exists "votes: cast own" on public.votes;
create policy "votes: cast own" on public.votes
  for insert to authenticated
  with check (user_id = auth.uid() and public.is_member(hangout_id) and public.voting_open(hangout_id));

drop policy if exists "votes: change own" on public.votes;
create policy "votes: change own" on public.votes
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and public.voting_open(hangout_id));

notify pgrst, 'reload schema';
