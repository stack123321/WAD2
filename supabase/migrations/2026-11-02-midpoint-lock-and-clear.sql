-- Owner: Ryan. The host can lock the midpoint (08), and a new midpoint clears the shortlist (and
-- the votes on it) so voting starts over, because the old spots are near the old station.
-- Run once in the Supabase SQL editor. Same SQL as supabase/schema.sql.

-- (Ryan) the hangout sends live updates, so 07 and 08 see the lock and a moved midpoint without a
-- refresh (schema.sql lists it, but no migration ever added it)
do $$
begin
  alter publication supabase_realtime add table public.hangouts;
exception when duplicate_object then null;
end $$;

-- false = any member can move the midpoint, true = nobody can until the host unlocks it.
-- The host turns it on and off with a normal update ("hangouts: host edits").
alter table public.hangouts add column if not exists midpoint_locked boolean not null default false;

create or replace function public.set_midpoint(
  p_hangout uuid, p_name text, p_lat float8, p_lng float8, p_avg integer, p_gap integer,
  p_times jsonb default '[]' -- [{ "user_id": ..., "mins": 32, "cost": 1.79 }], empty = no times
) returns void
language plpgsql security definer set search_path = public as $$
declare
  locked boolean; -- the host has locked the midpoint
  moved boolean;  -- true when this is a different station from before
begin
  if not (public.is_member(p_hangout) or public.is_host(p_hangout)) then
    raise exception 'Only members of this hangout can set its midpoint';
  end if;
  select midpoint_locked, (midpoint_name is distinct from p_name) into locked, moved
  from hangouts where id = p_hangout;
  if locked then
    raise exception 'The host has locked the midpoint';
  end if;
  update hangouts
  set midpoint_name = p_name, midpoint_lat = p_lat, midpoint_lng = p_lng,
      avg_mins = p_avg, gap_mins = p_gap
  where id = p_hangout;
  -- (Ryan) a different station: its spots go, their votes with them (on delete cascade), and
  -- final_shortlist_id empties itself (on delete set null), so voting starts over
  if moved then
    delete from shortlist where hangout_id = p_hangout;
    update hangouts set status = 'collecting', vote_deadline = null
    where id = p_hangout and status in ('voting', 'confirmed');
  end if;
  -- each person's time and cost to the new midpoint (only people in this hangout)
  update hangout_members hm
  set travel_mins = round((t ->> 'mins')::numeric),
      travel_cost = (t ->> 'cost')::numeric
  from jsonb_array_elements(p_times) as t
  where hm.hangout_id = p_hangout and hm.user_id = (t ->> 'user_id')::uuid;
end;
$$;
