-- Keeps track of what each user votes for. Run once in Supabase → SQL Editor.
-- Safe to run again: every step checks whether it's already done.
-- (schema.sql has the same changes, so a brand-new database doesn't need this file.)

-- 1. profiles.vote_history: how often the user voted for each Google place type, e.g.
--    {"cafe": 3, "restaurant": 1}. If the column was already made by hand as "vote-history",
--    it is renamed so the data is kept.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'vote-history'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'vote_history'
  ) then
    alter table public.profiles rename column "vote-history" to vote_history;
  end if;
end $$;

alter table public.profiles add column if not exists vote_history jsonb;
update public.profiles set vote_history = '{}' where vote_history is null;
alter table public.profiles
  alter column vote_history set default '{}',
  alter column vote_history set not null;

-- 2. shortlist.types: Google's place types for the spot (the app fills it when a spot is added).
alter table public.shortlist add column if not exists types text[] not null default '{}';

-- 3. Voting for a spot adds 1 to each of its types. Changing the vote to another spot first
--    subtracts 1 from the old spot's types (never below 0).
create or replace function public.record_vote_history() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  place_type text;
begin
  if tg_op = 'UPDATE' then
    if old.shortlist_id = new.shortlist_id then
      return new;
    end if;
    for place_type in select unnest(types) from shortlist where id = old.shortlist_id loop
      update profiles
      set vote_history = jsonb_set(
        vote_history,
        array[place_type],
        to_jsonb(greatest(coalesce((vote_history ->> place_type)::integer, 0) - 1, 0))
      )
      where id = new.user_id;
    end loop;
  end if;
  for place_type in select unnest(types) from shortlist where id = new.shortlist_id loop
    update profiles
    set vote_history = jsonb_set(
      vote_history,
      array[place_type],
      to_jsonb(coalesce((vote_history ->> place_type)::integer, 0) + 1)
    )
    where id = new.user_id;
  end loop;
  return new;
end $$;

drop trigger if exists votes_record_history on public.votes;
create trigger votes_record_history after insert or update of shortlist_id on public.votes
  for each row execute function public.record_vote_history();
