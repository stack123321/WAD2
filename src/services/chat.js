// Owner: Surya. Chats, stored in Supabase. Three kinds ("rooms"):
//   'hangout' → one hangout's chat (06, 09, 11, 12), in the messages table
//   'direct'  → a one to one chat between friends (My Chats), in the direct_messages table
//   'group'   → a friend group's chat (/groups/:id), in the group_messages table (Eashvar)
// New messages arrive live through Supabase Realtime, switched on for both tables in schema.sql.
import { supabase, hasSupabase } from './supabase'

// Which table each kind of chat lives in, and the column that says which hangout/chat it's for
const ROOMS = {
  hangout: { table: 'messages', column: 'hangout_id' },
  direct: { table: 'direct_messages', column: 'chat_id' },
  group: { table: 'group_messages', column: 'group_id' },
}

function roomFor(kind) {
  const room = ROOMS[kind]
  if (!room) {
    throw new Error(`Unknown chat: ${kind}`)
  }
  return room
}

/**
 * The chat's messages, oldest first (the last 100).
 * @param {string} id the hangout's (or direct chat's) id
 * @param {'hangout' | 'direct'} [kind]
 * @returns {Promise<Array<{ id, user_id, body, created_at }>>}
 */
export async function getMessages(id, kind = 'hangout') {
  // The samples ("demo", "demo-2", "demo-group-1"...) and mock mode have no database, so the
  // chat starts empty
  if (id.startsWith('demo') || !hasSupabase) {
    return []
  }
  const room = roomFor(kind)

  const { data, error } = await supabase
    .from(room.table)
    .select('id, user_id, body, created_at')
    .eq(room.column, id)
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) {
    throw error
  }
  // We asked for the newest 100; show them oldest first, like a chat
  return data.reverse()
}

/**
 * Send a message. The security rules only let people in the chat post, as themselves.
 * @param {'hangout' | 'direct'} [kind]
 * @returns {Promise<object>} the saved message
 */
export async function sendMessage(id, body, kind = 'hangout') {
  const text = body.trim()
  if (text === '') {
    throw new Error('Type a message first.')
  }
  if (text.length > 500) {
    throw new Error('Messages can be up to 500 characters.')
  }

  const room = roomFor(kind)

  const { data, error } = await supabase
    .from(room.table)
    .insert({ [room.column]: id, body: text })
    .select('id, user_id, body, created_at')
    .single()
  if (error) {
    throw error
  }
  return data
}

/**
 * Live updates: calls onMessage(message) whenever anyone posts in this chat.
 * @param {'hangout' | 'direct'} [kind]
 * @returns {() => void} call it to stop listening (when leaving the page)
 */
export function subscribeToMessages(id, onMessage, kind = 'hangout') {
  if (id.startsWith('demo') || !hasSupabase) {
    return () => {}
  }
  const room = roomFor(kind)

  const channel = supabase
    .channel(`${room.table}:${id}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: room.table,
        filter: `${room.column}=eq.${id}`,
      },
      (payload) => onMessage(payload.new),
    )
    .subscribe()
  return () => supabase.removeChannel(channel)
}
