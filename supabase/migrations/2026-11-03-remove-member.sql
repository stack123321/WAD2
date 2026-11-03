-- Owner: Surya. The host removes someone from a hangout on step 0 Details.
-- Their vote goes too: the votes rules only let people delete their own vote, so a plain delete
-- from the page would leave it counted. Their starting point and transport are on their member
-- row, so they go with it. Spots they added and their chat messages stay for everyone.
-- Run once in the Supabase SQL editor. Same SQL as supabase/schema.sql.

create or replace function public.remove_member(p_hangout uuid, p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_host(p_hangout) then
    raise exception 'Only the host can remove people';
  end if;
  if p_user = auth.uid() then
    raise exception 'You can''t remove yourself as the host';
  end if;
  delete from votes where hangout_id = p_hangout and user_id = p_user;
  delete from hangout_members where hangout_id = p_hangout and user_id = p_user;
end;
$$;

revoke execute on function public.remove_member(uuid, uuid) from public, anon;
grant execute on function public.remove_member(uuid, uuid) to authenticated;

notify pgrst, 'reload schema';
