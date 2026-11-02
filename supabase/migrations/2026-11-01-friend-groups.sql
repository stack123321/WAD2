-- Friend groups, brought back (Eashvar). Run once in Supabase → SQL Editor. Safe to run again.
-- Same SQL as the "Friend groups, part 2" section at the end of supabase/schema.sql.
--
-- A friend group (e.g. "Uni friends") has its own chat, a list of the hangouts planned with it,
-- and each person's usual starting point. "Plan a hangout with this group" on /groups/:id opens
-- 05 with everyone ticked and fills in their usual starting points.
--
-- Part 1 is Surya's original "Friend groups" SQL (schema.sql), written so it can run again: we
-- don't know if it was ever run, since the pages were taken out on 21 Oct.

-- ── Part 1. The groups, their members and their chat ──
create table if not exists public.groups (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(trim(name)) between 1 and 60),
  owner_id   uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.group_members (
  group_id  uuid not null references public.groups (id) on delete cascade,
  user_id   uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table if not exists public.group_messages (
  id         uuid primary key default gen_random_uuid(),
  group_id   uuid not null references public.groups (id) on delete cascade,
  user_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  body       text not null check (char_length(trim(body)) between 1 and 500),
  created_at timestamptz not null default now()
);
create index if not exists group_messages_by_group on public.group_messages (group_id, created_at);

-- Which group a hangout was planned with (null for hangouts made the normal way on 05)
alter table public.hangouts
  add column if not exists group_id uuid references public.groups (id) on delete set null;

create or replace function public.is_group_member(gid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from group_members where group_id = gid and user_id = auth.uid());
$$;

create or replace function public.is_group_owner(gid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from groups where id = gid and owner_id = auth.uid());
$$;

create or replace function public.shares_group_with(other uuid) returns boolean
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

drop policy if exists "groups: members read" on public.groups;
create policy "groups: members read" on public.groups
  for select to authenticated using (owner_id = auth.uid() or public.is_group_member(id));
drop policy if exists "groups: create as owner" on public.groups;
create policy "groups: create as owner" on public.groups
  for insert to authenticated with check (owner_id = auth.uid());
drop policy if exists "groups: owner edits" on public.groups;
create policy "groups: owner edits" on public.groups
  for update to authenticated using (owner_id = auth.uid());
drop policy if exists "groups: owner deletes" on public.groups;
create policy "groups: owner deletes" on public.groups
  for delete to authenticated using (owner_id = auth.uid());

drop policy if exists "group members: members read" on public.group_members;
create policy "group members: members read" on public.group_members
  for select to authenticated using (public.is_group_member(group_id) or public.is_group_owner(group_id));
drop policy if exists "group members: owner adds" on public.group_members;
create policy "group members: owner adds" on public.group_members
  for insert to authenticated
  with check (
    public.is_group_owner(group_id)
    and (user_id = auth.uid() or public.is_friend(user_id) or public.shares_hangout_with(user_id))
  );
drop policy if exists "group members: leave or remove" on public.group_members;
create policy "group members: leave or remove" on public.group_members
  for delete to authenticated using (user_id = auth.uid() or public.is_group_owner(group_id));

drop policy if exists "group messages: members read" on public.group_messages;
create policy "group messages: members read" on public.group_messages
  for select to authenticated using (public.is_group_member(group_id));
drop policy if exists "group messages: members post" on public.group_messages;
create policy "group messages: members post" on public.group_messages
  for insert to authenticated
  with check (user_id = auth.uid() and public.is_group_member(group_id));
drop policy if exists "group messages: delete own" on public.group_messages;
create policy "group messages: delete own" on public.group_messages
  for delete to authenticated using (user_id = auth.uid());

-- The host can add people from their groups to a hangout, as well as friends and past hangout mates
drop policy if exists "members: host adds past friends" on public.hangout_members;
create policy "members: host adds past friends" on public.hangout_members
  for insert to authenticated
  with check (
    public.is_host(hangout_id)
    and (public.shares_hangout_with(user_id) or public.is_friend(user_id)
      or public.shares_group_with(user_id))
  );

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
