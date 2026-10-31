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
  vote_history    jsonb not null default '{}', -- how often they voted for each Google place type, e.g. {"cafe": 3}; written only by record_vote_history()
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
  pinned      boolean not null default false, -- Ryan (04): pinned on *this person's* My hangouts
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
  types           text[] not null default '{}', -- Google's place types, e.g. {cafe, food}
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

-- Tie-break wheel (11 Group voting, Eashvar). Any member may spin once voting is over (the deadline
-- has passed or every member has voted) and two or more spots share the most votes. The database
-- picks the winner at random from the tied spots, so nobody can choose it, then closes the vote.
-- Only votes from people who are still members count. "for update" stops two spins at once.
create function public.spin_tiebreak(p_hangout uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  h hangouts%rowtype;
  member_count integer;
  voted_count integer;
  top_count integer;
  tied_count integer;
  winner uuid;
begin
  if not (public.is_member(p_hangout) or public.is_host(p_hangout)) then
    raise exception 'Only members of this hangout can spin the wheel';
  end if;

  select * into h from hangouts where id = p_hangout for update;
  if h.status <> 'voting' then
    raise exception 'The vote is already closed';
  end if;

  select count(*) into member_count from hangout_members where hangout_id = p_hangout;
  select count(*) into voted_count
  from votes v
  join hangout_members m on m.hangout_id = v.hangout_id and m.user_id = v.user_id
  where v.hangout_id = p_hangout;
  if (h.vote_deadline is null or h.vote_deadline > now()) and voted_count < member_count then
    raise exception 'Voting is still going';
  end if;

  select max(n) into top_count
  from (
    select count(*) as n
    from votes v
    join hangout_members m on m.hangout_id = v.hangout_id and m.user_id = v.user_id
    where v.hangout_id = p_hangout
    group by v.shortlist_id
  ) as counts;

  select count(*) into tied_count
  from (
    select v.shortlist_id
    from votes v
    join hangout_members m on m.hangout_id = v.hangout_id and m.user_id = v.user_id
    where v.hangout_id = p_hangout
    group by v.shortlist_id
    having count(*) = top_count
  ) as tied;
  if top_count is null or tied_count < 2 then
    raise exception 'There is no tie to break';
  end if;

  select v.shortlist_id into winner
  from votes v
  join hangout_members m on m.hangout_id = v.hangout_id and m.user_id = v.user_id
  where v.hangout_id = p_hangout
  group by v.shortlist_id
  having count(*) = top_count
  order by random()
  limit 1;

  update hangouts set status = 'confirmed', final_shortlist_id = winner where id = p_hangout;
  return winner;
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
-- You remove spots you added; the host can remove any spot (09 "Remove")
create policy "shortlist: adder or host removes" on public.shortlist
  for delete to authenticated using (added_by = auth.uid() or public.is_host(hangout_id));

-- At most 3 shortlisted spots per person per hangout (09 shows "2 of 3 added").
-- The lock makes two quick "Add" clicks wait for each other, so both can't slip in as the 3rd spot.
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
create trigger shortlist_limit before insert on public.shortlist
  for each row execute function public.enforce_shortlist_limit();

-- Vote history: voting for a spot adds 1 to each of that spot's Google types in the voter's
-- profiles.vote_history, e.g. {"cafe": 3}. Changing the vote to another spot first subtracts 1
-- from the old spot's types (never below 0). Done in the database so it is atomic and can't be
-- skipped by the client.
create function public.record_vote_history() returns trigger
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
create trigger votes_record_history after insert or update of shortlist_id on public.votes
  for each row execute function public.record_vote_history();

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
-- The hangout itself: everyone sees the vote start, close or the wheel's winner (11, 12) live
alter publication supabase_realtime add table public.hangouts;

-- ───────────────────────── Friend groups (permanent group chat) ─────────────────────────
-- Owner: Surya. A friend group (e.g. "Uni friends") keeps one chat across all its hangouts, on
-- its own page (/groups/:id). New hangouts can be started from the group with everyone in it.
-- Self-contained: this whole section can be run on its own in the Supabase SQL editor.

create table public.groups (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(trim(name)) between 1 and 60),
  owner_id   uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.group_members (
  group_id  uuid not null references public.groups (id) on delete cascade,
  user_id   uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table public.group_messages (
  id         uuid primary key default gen_random_uuid(),
  group_id   uuid not null references public.groups (id) on delete cascade,
  user_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  body       text not null check (char_length(trim(body)) between 1 and 500),
  created_at timestamptz not null default now()
);
create index group_messages_by_group on public.group_messages (group_id, created_at);

-- Which group a hangout was started from (null for hangouts made on 05 Create hangout)
alter table public.hangouts
  add column group_id uuid references public.groups (id) on delete set null;

-- Helpers ("security definer" for the same reason as is_member above)
create function public.is_group_member(gid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from group_members where group_id = gid and user_id = auth.uid());
$$;

create function public.is_group_owner(gid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from groups where id = gid and owner_id = auth.uid());
$$;

-- True if you and `other` are in the same friend group. Lets a host add them to a hangout.
create function public.shares_group_with(other uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from group_members mine
    join group_members theirs on theirs.group_id = mine.group_id
    where mine.user_id = auth.uid() and theirs.user_id = other
  );
$$;

alter table public.groups         enable row level security;
alter table public.group_members  enable row level security;
alter table public.group_messages enable row level security;

-- groups: members read; anyone can create one (as owner); only the owner renames or deletes it
create policy "groups: members read" on public.groups
  for select to authenticated using (owner_id = auth.uid() or public.is_group_member(id));
create policy "groups: create as owner" on public.groups
  for insert to authenticated with check (owner_id = auth.uid());
create policy "groups: owner edits" on public.groups
  for update to authenticated using (owner_id = auth.uid());
create policy "groups: owner deletes" on public.groups
  for delete to authenticated using (owner_id = auth.uid());

-- group_members: members see each other. The owner adds themselves, then their friends
-- (Friends page or past hangouts). You can leave; the owner can remove people.
create policy "group members: members read" on public.group_members
  for select to authenticated using (public.is_group_member(group_id) or public.is_group_owner(group_id));
create policy "group members: owner adds" on public.group_members
  for insert to authenticated
  with check (
    public.is_group_owner(group_id)
    and (user_id = auth.uid() or public.is_friend(user_id) or public.shares_hangout_with(user_id))
  );
create policy "group members: leave or remove" on public.group_members
  for delete to authenticated using (user_id = auth.uid() or public.is_group_owner(group_id));

-- group_messages: members read and post; you delete only your own
create policy "group messages: members read" on public.group_messages
  for select to authenticated using (public.is_group_member(group_id));
create policy "group messages: members post" on public.group_messages
  for insert to authenticated
  with check (user_id = auth.uid() and public.is_group_member(group_id));
create policy "group messages: delete own" on public.group_messages
  for delete to authenticated using (user_id = auth.uid());

-- A host can also add people from their friend groups to a hangout ("Start a hangout" on a group)
drop policy "members: host adds past friends" on public.hangout_members;
create policy "members: host adds past friends" on public.hangout_members
  for insert to authenticated
  with check (
    public.is_host(hangout_id)
    and (public.shares_hangout_with(user_id) or public.is_friend(user_id)
      or public.shares_group_with(user_id))
  );

-- New group messages appear live on the group page
alter publication supabase_realtime add table public.group_messages;

-- ───────────────────────── Direct chats (one to one, My Chats) ─────────────────────────
-- Owner: Ryan. Same SQL as supabase/migrations/2026-10-20-direct-chats.sql.

-- 1. One private chat per pair of friends. The pair is stored in a fixed order (user_a < user_b)
--    so there can only ever be one row per pair.
create table if not exists public.direct_chats (
  id         uuid primary key default gen_random_uuid(),
  user_a     uuid not null references public.profiles (id) on delete cascade,
  user_b     uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  check (user_a < user_b),
  unique (user_a, user_b)
);

create table if not exists public.direct_messages (
  id         uuid primary key default gen_random_uuid(),
  chat_id    uuid not null references public.direct_chats (id) on delete cascade,
  user_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  body       text not null check (char_length(trim(body)) between 1 and 500),
  created_at timestamptz not null default now()
);
create index if not exists direct_messages_by_chat on public.direct_messages (chat_id, created_at);

-- 2. Security: only the two people in a chat can see it. Nobody inserts into direct_chats
--    directly, chats are only made by open_direct_chat() below.
alter table public.direct_chats enable row level security;
alter table public.direct_messages enable row level security;

drop policy if exists "direct chats: members read" on public.direct_chats;
create policy "direct chats: members read" on public.direct_chats
  for select to authenticated using (auth.uid() in (user_a, user_b));

drop policy if exists "direct messages: members read" on public.direct_messages;
create policy "direct messages: members read" on public.direct_messages
  for select to authenticated using (
    exists (select 1 from public.direct_chats c
            where c.id = chat_id and auth.uid() in (c.user_a, c.user_b))
  );

drop policy if exists "direct messages: members post" on public.direct_messages;
create policy "direct messages: members post" on public.direct_messages
  for insert to authenticated with check (
    user_id = auth.uid()
    and exists (select 1 from public.direct_chats c
                where c.id = chat_id and auth.uid() in (c.user_a, c.user_b))
  );

drop policy if exists "direct messages: delete own" on public.direct_messages;
create policy "direct messages: delete own" on public.direct_messages
  for delete to authenticated using (user_id = auth.uid());

-- 3. Opens your chat with an accepted friend: finds it, or makes it the first time. Returns its id.
create or replace function public.open_direct_chat(friend_id uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  a uuid := least(auth.uid(), friend_id);
  b uuid := greatest(auth.uid(), friend_id);
  chat uuid;
begin
  if not exists (
    select 1 from public.friendships
    where status = 'accepted'
      and auth.uid() in (requester_id, addressee_id)
      and friend_id in (requester_id, addressee_id)
  ) then
    raise exception 'You can only chat with friends';
  end if;
  insert into public.direct_chats (user_a, user_b) values (a, b)
    on conflict (user_a, user_b) do nothing;
  select id into chat from public.direct_chats where user_a = a and user_b = b;
  return chat;
end $$;

revoke all on function public.open_direct_chat(uuid) from public;
grant execute on function public.open_direct_chat(uuid) to authenticated;

-- 4. New messages appear live
do $$
begin
  alter publication supabase_realtime add table public.direct_messages;
exception when duplicate_object then null;
end $$;

-- 5. Make Supabase's API notice the new tables and function straight away
notify pgrst, 'reload schema';

-- ───────────────────────── Unread chats (navbar badges) ─────────────────────────
-- Owner: Ryan. Same SQL as supabase/migrations/2026-10-24-unread-chats.sql.

-- 1. How far each person has read in each chat. chat_id is a hangout's id (hangout chat) or a
--    direct chat's id (one to one chat). Both are uuids, so they never clash.
create table if not exists public.chat_reads (
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  chat_id uuid not null,
  read_at timestamptz not null default now(),
  primary key (user_id, chat_id)
);

-- 2. Security: you only see and change your own read times
alter table public.chat_reads enable row level security;

drop policy if exists "chat reads: own" on public.chat_reads;
create policy "chat reads: own" on public.chat_reads
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 3. "I've read this chat up to now". Uses the database's clock, so a phone with the wrong time
--    can't hide or bring back messages.
create or replace function public.mark_chat_read(p_chat uuid) returns void
language sql security invoker set search_path = public as $$
  insert into chat_reads (user_id, chat_id) values (auth.uid(), p_chat)
  on conflict (user_id, chat_id) do update set read_at = now();
$$;

-- 4. One row per chat that has messages: how many I haven't read (messages from other people
--    after my read time, or all of them if I have never opened the chat) and when the newest
--    message was sent, for the badges and the newest-first order on My Chats.
--    security invoker = the normal rules apply, so it only covers chats I'm in.
--    (replaces unread_counts(), an earlier version that gave only the counts)
drop function if exists public.unread_counts();

create or replace function public.chat_summary()
returns table (chat_id uuid, unread int, last_at timestamptz)
language sql stable security invoker set search_path = public as $$
  select m.hangout_id,
         (count(*) filter (where m.user_id <> auth.uid()
                           and (r.read_at is null or m.created_at > r.read_at)))::int,
         max(m.created_at)
  from messages m
  left join chat_reads r on r.chat_id = m.hangout_id and r.user_id = auth.uid()
  group by m.hangout_id
  union all
  select d.chat_id,
         (count(*) filter (where d.user_id <> auth.uid()
                           and (r.read_at is null or d.created_at > r.read_at)))::int,
         max(d.created_at)
  from direct_messages d
  left join chat_reads r on r.chat_id = d.chat_id and r.user_id = auth.uid()
  group by d.chat_id;
$$;

-- only logged-in people can call them
revoke all on function public.mark_chat_read(uuid) from public, anon;
revoke all on function public.chat_summary() from public, anon;
grant execute on function public.mark_chat_read(uuid) to authenticated;
grant execute on function public.chat_summary() to authenticated;

-- 5. Start everyone's existing chats as read, so old messages don't all show up as unread on
--    day one. Only new messages from now on count.
insert into public.chat_reads (user_id, chat_id)
  select user_id, hangout_id from public.hangout_members
  union select user_a, id from public.direct_chats
  union select user_b, id from public.direct_chats
on conflict (user_id, chat_id) do nothing;

-- 6. New friend requests reach the navbar badge straight away (messages are already live)
do $$
begin
  alter publication supabase_realtime add table public.friendships;
exception when duplicate_object then null;
end $$;

-- 7. Make Supabase's API notice the new table and functions straight away
notify pgrst, 'reload schema';

-- ───────────────────────── Hangout photos (Surya, Debrief and Past) ─────────────────────────
-- Same SQL as supabase/migrations/2026-10-30-hangout-photos.sql
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

-- ───────────────────────── Friend groups, part 2 (Eashvar) ─────────────────────────
-- Same SQL as supabase/migrations/2026-11-01-friend-groups.sql (which also re-runs the
-- "Friend groups" section above, in case it was never run). Usual starting points for each group,
-- hangouts tagged only with your own groups, and group chats in the unread badges.

-- ── Part 2. New: each person's usual starting point for the group ──
-- Copied into a new hangout planned with the group, so 06 and 07 start filled in.
alter table public.group_members add column if not exists start_label text;
alter table public.group_members add column if not exists start_lat   float8;
alter table public.group_members add column if not exists start_lng   float8;
alter table public.group_members add column if not exists mode        text;
do $$
begin
  alter table public.group_members
    add constraint group_members_mode_check check (mode in ('mrt', 'bus', 'car', 'walk'));
exception when duplicate_object then null;
end $$;

-- You change only your own usual start
drop policy if exists "group members: edit own row" on public.group_members;
create policy "group members: edit own row" on public.group_members
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- A hangout can only be tagged with a group you're in
drop policy if exists "hangouts: create as host" on public.hangouts;
create policy "hangouts: create as host" on public.hangouts
  for insert to authenticated
  with check (host_id = auth.uid() and (group_id is null or public.is_group_member(group_id)));

-- ── Part 3. Group chats in the unread badges and My Chats order (Ryan's chat_summary) ──
-- Same as before, plus group_messages. chat_reads.chat_id is the group's id for a group chat.
create or replace function public.chat_summary()
returns table (chat_id uuid, unread int, last_at timestamptz)
language sql stable security invoker set search_path = public as $$
  select m.hangout_id,
         (count(*) filter (where m.user_id <> auth.uid()
                           and (r.read_at is null or m.created_at > r.read_at)))::int,
         max(m.created_at)
  from messages m
  left join chat_reads r on r.chat_id = m.hangout_id and r.user_id = auth.uid()
  group by m.hangout_id
  union all
  select d.chat_id,
         (count(*) filter (where d.user_id <> auth.uid()
                           and (r.read_at is null or d.created_at > r.read_at)))::int,
         max(d.created_at)
  from direct_messages d
  left join chat_reads r on r.chat_id = d.chat_id and r.user_id = auth.uid()
  group by d.chat_id
  union all
  select g.group_id,
         (count(*) filter (where g.user_id <> auth.uid()
                           and (r.read_at is null or g.created_at > r.read_at)))::int,
         max(g.created_at)
  from group_messages g
  left join chat_reads r on r.chat_id = g.group_id and r.user_id = auth.uid()
  group by g.group_id;
$$;

-- Old group messages start as read, so they don't all show up as unread on day one
insert into public.chat_reads (user_id, chat_id)
  select user_id, group_id from public.group_members
on conflict (user_id, chat_id) do nothing;

-- New group messages appear live, in the chat and in the navbar badge
do $$
begin
  alter publication supabase_realtime add table public.group_messages;
exception when duplicate_object then null;
end $$;

notify pgrst, 'reload schema';
