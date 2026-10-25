-- Owner: Ryan. Unread badges on Chats and Friends in the navbar, and newest-first My Chats.
-- Run once in the Supabase SQL editor.
-- Same SQL as the "Unread chats" section at the end of supabase/schema.sql.

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
