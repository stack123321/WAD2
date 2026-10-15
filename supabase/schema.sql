-- Fairpoint database schema. Owner: Matrix.
-- DRAFT from the kickoff "data shape" suggestions: confirm at the kickoff, then run it in
-- Supabase → SQL Editor. After that, change the database only through a PR that edits this file.
--
-- Conventions: snake_case, uuid ids, lat/lng as float8, times as timestamptz (shown in SGT),
-- durations in whole minutes, money in dollars, fixed values as text + check.
-- One writer per column (see the owner comments).

-- ───────────────────────── Tables ─────────────────────────

-- One row per user, created by 02 Sign up. Edited on 03 Preferences.
create table public.profiles (
  id              uuid primary key references auth.users (id) on delete cascade,
  display_name    text not null,
  avatar_color    text,
  activities      text[] not null default '{}',
  dietary         text[] not null default '{}',
  budget          smallint check (budget between 1 and 3),
  max_travel_mins integer check (max_travel_mins > 0),
  indoor_if_rain  boolean not null default false,
  avoid_crowds    boolean not null default false,
  step_free       boolean not null default false,
  created_at      timestamptz not null default now()
);

-- Matrix creates the row (05). Nicole writes the midpoint columns (07). Eashvar writes the vote/final columns (11).
create table public.hangouts (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null,
  starts_at          timestamptz,
  vibe               text[] not null default '{}',
  host_id            uuid not null default auth.uid() references public.profiles (id),
  invite_code        text not null unique default substr(md5(gen_random_uuid()::text), 1, 8),
  status             text not null default 'collecting'
                       check (status in ('collecting', 'voting', 'confirmed', 'done')),
  optimise_for       text not null default 'fairest'
                       check (optimise_for in ('fairest', 'fastest', 'cheapest')),
  midpoint_name      text,
  midpoint_lat       float8,
  midpoint_lng       float8,
  avg_mins           integer,
  gap_mins           integer,
  vote_deadline      timestamptz,
  final_shortlist_id uuid, -- foreign key added below, after shortlist exists
  created_at         timestamptz not null default now()
);

-- One row per person per hangout.
create table public.hangout_members (
  hangout_id  uuid not null references public.hangouts (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  start_label text,     -- Surya (06)
  start_lat   float8,   -- Surya (06)
  start_lng   float8,   -- Surya (06)
  mode        text check (mode in ('mrt', 'bus', 'car', 'walk')), -- Nicole (07)
  travel_mins integer,  -- Nicole (07)
  travel_cost numeric(6, 2), -- Nicole (07)
  joined_at   timestamptz not null default now(),
  primary key (hangout_id, user_id)
);

-- Places the group is considering. Hugo (09).
create table public.shortlist (
  id              uuid primary key default gen_random_uuid(),
  hangout_id      uuid not null references public.hangouts (id) on delete cascade,
  added_by        uuid not null default auth.uid() references public.profiles (id),
  source          text not null check (source in ('google', 'osm')),
  source_place_id text not null,
  name            text not null,
  category        text,
  lat             float8 not null,
  lng             float8 not null,
  rating          numeric(2, 1),
  price_level     smallint,
  image_url       text,
  match_pct       smallint check (match_pct between 0 and 100), -- from Matrix's matchScore()
  created_at      timestamptz not null default now(),
  unique (hangout_id, source, source_place_id),
  unique (id, hangout_id) -- lets votes check the place belongs to the same hangout
);

alter table public.hangouts
  add constraint hangouts_final_shortlist_id_fkey
  foreign key (final_shortlist_id) references public.shortlist (id) on delete set null;

-- One vote per person per hangout; changing your vote updates the row. Eashvar (11).
create table public.votes (
  hangout_id   uuid not null references public.hangouts (id) on delete cascade,
  user_id      uuid not null references public.profiles (id) on delete cascade,
  shortlist_id uuid not null,
  voted_at     timestamptz not null default now(),
  primary key (hangout_id, user_id),
  foreign key (shortlist_id, hangout_id) references public.shortlist (id, hangout_id) on delete cascade
);

-- Friend requests (Ryan, Friends page). Pending until the other person accepts; accepted = friends.
create table public.friendships (
  requester_id uuid not null references public.profiles (id) on delete cascade,
  addressee_id uuid not null references public.profiles (id) on delete cascade,
  status       text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at   timestamptz not null default now(),
  accepted_at  timestamptz,
  primary key (requester_id, addressee_id),
  check (requester_id <> addressee_id)
);

-- One friendship per pair: stops A→B and B→A both existing
create unique index friendships_one_per_pair on public.friendships
  (least(requester_id, addressee_id), greatest(requester_id, addressee_id));

-- Group chat inside a hangout (06 Starting points). Surya.
create table public.messages (
  id         uuid primary key default gen_random_uuid(),
  hangout_id uuid not null references public.hangouts (id) on delete cascade,
  user_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  body       text not null check (char_length(trim(body)) between 1 and 500),
  created_at timestamptz not null default now()
);
create index messages_by_hangout on public.messages (hangout_id, created_at);

-- ───────────────────────── Helper functions ─────────────────────────
-- "security definer" lets these look up membership without tripping the policies below
-- (a policy on hangout_members that reads hangout_members would loop forever).

create function public.is_member(hid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from hangout_members where hangout_id = hid and user_id = auth.uid());
$$;

create function public.is_host(hid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from hangouts where id = hid and host_id = auth.uid());
$$;

-- True if you and `other` are both in at least one hangout together ("friends from past
-- hangouts" on 06). Lets a host add those people to a new hangout without an invite link.
create function public.shares_hangout_with(other uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from hangout_members mine
    join hangout_members theirs on theirs.hangout_id = mine.hangout_id
    where mine.user_id = auth.uid() and theirs.user_id = other
  );
$$;

-- True if you and `other` are accepted friends (Friends page). Lets a host add them to a hangout.
create function public.is_friend(other uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from friendships
    where status = 'accepted'
      and ((requester_id = auth.uid() and addressee_id = other)
        or (requester_id = other and addressee_id = auth.uid()))
  );
$$;

-- Find people to add on the Friends page: name contains the text, or the exact email.
-- Emails live in auth.users, which the app can't read. This returns names only, never emails.
create function public.search_people(q text)
returns table (id uuid, display_name text, avatar_color text)
language sql stable security definer set search_path = public as $$
  select p.id, p.display_name, p.avatar_color
  from profiles p
  join auth.users u on u.id = p.id
  where p.id <> auth.uid()
    and length(trim(q)) >= 2
    and (p.display_name ilike '%' || trim(q) || '%' or lower(u.email) = lower(trim(q)))
  order by p.display_name
  limit 10;
$$;

-- Invite links: /login?invite=CODE → after login, the app calls join_hangout(CODE).
-- Needed because a non-member can't read the hangout to find it by code.
create function public.join_hangout(code text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  hid uuid;
begin
  select id into hid from hangouts where invite_code = code;
  if hid is null then
    raise exception 'Invite code not found';
  end if;
  insert into hangout_members (hangout_id, user_id)
  values (hid, auth.uid())
  on conflict do nothing;
  return hid;
end;
$$;

-- Save the group's midpoint (07 "Find our midpoint", 08 dragging the pin). Any member may, not just
-- the host, but only the midpoint columns change: renaming or deleting the hangout stays host-only.
create function public.set_midpoint(
  p_hangout uuid, p_name text, p_lat float8, p_lng float8, p_avg integer, p_gap integer
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
end;
$$;

-- ───────────────────────── Row Level Security ─────────────────────────
-- Members can read their hangout. You can only edit your own member row and your own vote.
-- Only the host edits the hangout.

alter table public.profiles        enable row level security;
alter table public.hangouts        enable row level security;
alter table public.hangout_members enable row level security;
alter table public.shortlist       enable row level security;
alter table public.votes           enable row level security;
alter table public.friendships     enable row level security;

-- profiles: any logged-in user can read names and preferences (needed for group matching)
create policy "profiles: read" on public.profiles
  for select to authenticated using (true);
create policy "profiles: create own" on public.profiles
  for insert to authenticated with check (id = auth.uid());
create policy "profiles: edit own" on public.profiles
  for update to authenticated using (id = auth.uid());

-- hangouts
create policy "hangouts: members read" on public.hangouts
  for select to authenticated using (host_id = auth.uid() or public.is_member(id));
create policy "hangouts: create as host" on public.hangouts
  for insert to authenticated with check (host_id = auth.uid());
create policy "hangouts: host edits" on public.hangouts
  for update to authenticated using (host_id = auth.uid());
create policy "hangouts: host deletes" on public.hangouts
  for delete to authenticated using (host_id = auth.uid());

-- hangout_members (others join through join_hangout())
create policy "members: members read" on public.hangout_members
  for select to authenticated using (public.is_member(hangout_id));
create policy "members: host adds self" on public.hangout_members
  for insert to authenticated with check (user_id = auth.uid() and public.is_host(hangout_id));
-- The host may also add people they've shared a past hangout with (06 "Friends from past hangouts")
-- or accepted friends (Friends page "Add to hangout")
create policy "members: host adds past friends" on public.hangout_members
  for insert to authenticated
  with check (
    public.is_host(hangout_id)
    and (public.shares_hangout_with(user_id) or public.is_friend(user_id))
  );
-- Host may also update others' rows, so the transport page can save everyone's travel times.
create policy "members: edit own row" on public.hangout_members
  for update to authenticated using (user_id = auth.uid() or public.is_host(hangout_id));
create policy "members: leave or host removes" on public.hangout_members
  for delete to authenticated using (user_id = auth.uid() or public.is_host(hangout_id));

-- shortlist
create policy "shortlist: members read" on public.shortlist
  for select to authenticated using (public.is_member(hangout_id));
create policy "shortlist: members add" on public.shortlist
  for insert to authenticated with check (added_by = auth.uid() and public.is_member(hangout_id));
create policy "shortlist: adder or host removes" on public.shortlist
  for delete to authenticated using (added_by = auth.uid() or public.is_host(hangout_id));

-- votes
create policy "votes: members read" on public.votes
  for select to authenticated using (public.is_member(hangout_id));
create policy "votes: cast own" on public.votes
  for insert to authenticated with check (user_id = auth.uid() and public.is_member(hangout_id));
create policy "votes: change own" on public.votes
  for update to authenticated using (user_id = auth.uid());
create policy "votes: remove own" on public.votes
  for delete to authenticated using (user_id = auth.uid());

-- friendships (Friends page)
create policy "friendships: read own" on public.friendships
  for select to authenticated using (auth.uid() in (requester_id, addressee_id));
create policy "friendships: send" on public.friendships
  for insert to authenticated with check (requester_id = auth.uid() and status = 'pending');
create policy "friendships: accept" on public.friendships
  for update to authenticated using (addressee_id = auth.uid()) with check (status = 'accepted');
create policy "friendships: decline, cancel or unfriend" on public.friendships
  for delete to authenticated using (auth.uid() in (requester_id, addressee_id));

-- messages (hangout chat): members read and post in their hangout; you delete only your own
alter table public.messages enable row level security;
create policy "messages: members read" on public.messages
  for select to authenticated using (public.is_member(hangout_id) or public.is_host(hangout_id));
create policy "messages: members post" on public.messages
  for insert to authenticated
  with check (user_id = auth.uid() and (public.is_member(hangout_id) or public.is_host(hangout_id)));
create policy "messages: delete own" on public.messages
  for delete to authenticated using (user_id = auth.uid());

-- ───────────────────────── Realtime ─────────────────────────
-- Live vote tallies on 11, and members appearing on 06 as friends join.
alter publication supabase_realtime add table public.votes, public.hangout_members;
-- New chat messages appear live on 06
alter publication supabase_realtime add table public.messages;
