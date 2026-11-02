-- Owner: Nicole (Matrix ran it). Save everyone's travel time and cost with the midpoint, so
-- "Leave by" on 12 and the Debrief isn't blank. Run once in the Supabase SQL editor.
-- Same SQL as set_midpoint in supabase/schema.sql.

-- Adding a parameter makes a second function instead of replacing it, so drop the old one first
drop function if exists public.set_midpoint(uuid, text, float8, float8, integer, integer);

create function public.set_midpoint(
  p_hangout uuid, p_name text, p_lat float8, p_lng float8, p_avg integer, p_gap integer,
  p_times jsonb default '[]' -- [{ "user_id": ..., "mins": 32, "cost": 1.79 }], empty = no times
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not (public.is_member(p_hangout) or public.is_host(p_hangout)) then
    raise exception 'Only members of this hangout can set its midpoint';
  end if;
  update hangouts
  set midpoint_name = p_name, midpoint_lat = p_lat, midpoint_lng = p_lng,
      avg_mins = p_avg, gap_mins = p_gap
  where id = p_hangout;
  -- each person's time and cost to the new midpoint (only people in this hangout)
  update hangout_members hm
  set travel_mins = round((t ->> 'mins')::numeric),
      travel_cost = (t ->> 'cost')::numeric
  from jsonb_array_elements(p_times) as t
  where hm.hangout_id = p_hangout and hm.user_id = (t ->> 'user_id')::uuid;
end;
$$;
