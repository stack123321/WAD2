-- Owner: Surya. Every name on Fairpoint is different, so friends can tell people apart in search,
-- hangouts and chats. "Ryan" and "ryan" count as the same name. If a name is taken, sign up
-- suggests the next free one: Ryan → Ryan1 → Ryan2 … up to Ryan9999.
-- Run once in the Supabase SQL editor. Same SQL as supabase/schema.sql.

-- Part (a) The next free name for `base`: base itself if nobody has it, else base1, base2 …
-- Your own name never counts as taken (so saving Preferences keeps it). null = none left.
-- Sign up calls it before an account exists, so anon can run it too.
create or replace function public.free_name(base text) returns text
language plpgsql stable security definer set search_path = public as $$
declare
  b text := trim(base);
  candidate text := trim(base);
  n integer := 0;
begin
  if b = '' then
    return null;
  end if;
  while exists (
    select 1 from profiles
    where lower(trim(display_name)) = lower(candidate) and id is distinct from auth.uid()
  ) loop
    n := n + 1;
    if n > 9999 then
      return null;
    end if;
    candidate := left(b, 46) || n; -- names stay under 50 characters with the number
  end loop;
  return candidate;
end;
$$;

revoke execute on function public.free_name(text) from public;
grant execute on function public.free_name(text) to anon, authenticated;

-- Part (b) Names already used twice: the oldest account keeps it, each later one gets the next
-- free number (e.g. a second "Ryan" becomes "Ryan1")
do $$
declare
  p record;
  n integer;
  candidate text;
begin
  for p in
    select id, display_name from (
      select id, display_name,
             row_number() over (partition by lower(trim(display_name)) order by created_at, id) as nth
      from profiles
    ) ranked
    where nth > 1
  loop
    n := 0;
    loop
      n := n + 1;
      candidate := left(trim(p.display_name), 46) || n;
      exit when not exists (select 1 from profiles where lower(trim(display_name)) = lower(candidate));
    end loop;
    update profiles set display_name = candidate where id = p.id;
  end loop;
end;
$$;

-- Part (c) The database itself refuses a name that is already taken (any capitals)
create unique index if not exists profiles_display_name_unique
  on public.profiles (lower(trim(display_name)));

notify pgrst, 'reload schema';
