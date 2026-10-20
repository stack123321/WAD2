-- Owner: Ryan (My Chats, Friends "Chat" button). Run once in Supabase → SQL Editor.
-- Safe to run again: every step checks whether it's already done.
-- (schema.sql has the same section, so a brand-new database doesn't need this file.)

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
