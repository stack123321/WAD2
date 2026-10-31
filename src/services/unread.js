// Owner: Ryan
// unread chat messages, for the badge on Chats in the navbar and the counts and order on My Chats
// (each person's "read up to" time per chat lives in the chat_reads table, see supabase/schema.sql)
import { supabase, hasSupabase } from './supabase'

// [{ chat_id, unread, last_at }] for every chat with messages: how many I haven't seen, and when
// the newest one was sent (My Chats puts the newest first).
// chat_id is the hangout's id for a hangout chat, the direct chat's id for a one to one chat, or
// the group's id for a group chat (Eashvar).
export async function getChatSummary() {
  // the demo chats start empty, so nothing is ever unread
  if (!hasSupabase) {
    return []
  }
  const { data, error } = await supabase.rpc('chat_summary')
  if (error) {
    throw error
  }
  return data
}

// I've seen everything in this chat up to now (the database uses its own clock, not the phone's)
export async function markChatRead(chatId) {
  if (!hasSupabase || chatId.startsWith('demo')) {
    return
  }
  const { error } = await supabase.rpc('mark_chat_read', { p_chat: chatId })
  if (error) {
    throw error
  }
}

// calls onChange() whenever a message is posted in any chat I'm in, or someone sends me a friend
// request. The security rules only send me rows I'm allowed to read, so no filter is needed.
// returns a function to stop listening (when logging out)
export function subscribeToAlerts(myId, onChange) {
  if (!hasSupabase) {
    return () => {}
  }
  // a channel is a live connection: supabase pushes each new row to the browser the moment it is saved, so there's no need to keep asking.
  const channel = supabase
    .channel(`alerts:${myId}`) // a name for this connection, one per user
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, onChange)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'direct_messages' },
      onChange,
    )
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'group_messages' },
      onChange,
    )
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'friendships',
        filter: `addressee_id=eq.${myId}`, // only requests sent to me
      },
      onChange,
    )
    .subscribe() // start listening
  return () => supabase.removeChannel(channel) // the caller keeps this and runs it to stop listening
}
