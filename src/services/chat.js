// Owner: Surya. Group chat inside a hangout (06 Starting points), stored in the messages table.
// New messages arrive live through Supabase Realtime, switched on for messages in schema.sql.
import { supabase, hasSupabase } from './supabase'

/**
 * The hangout's messages, oldest first (the last 100).
 * @returns {Promise<Array<{ id, hangout_id, user_id, body, created_at }>>}
 */
export async function getMessages(hangoutId) {
  // The demo hangout and mock mode have no database, so the chat starts empty
  if (hangoutId === 'demo' || !hasSupabase) {
    return []
  }

  const { data, error } = await supabase
    .from('messages')
    .select('id, hangout_id, user_id, body, created_at')
    .eq('hangout_id', hangoutId)
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) {
    throw error
  }
  // We asked for the newest 100; show them oldest first, like a chat
  return data.reverse()
}

/**
 * Send a message. The security rules only let members of the hangout post, as themselves.
 * @returns {Promise<object>} the saved message
 */
export async function sendMessage(hangoutId, body) {
  const text = body.trim()
  if (text === '') {
    throw new Error('Type a message first.')
  }
  if (text.length > 500) {
    throw new Error('Messages can be up to 500 characters.')
  }

  const { data, error } = await supabase
    .from('messages')
    .insert({ hangout_id: hangoutId, body: text })
    .select('id, hangout_id, user_id, body, created_at')
    .single()
  if (error) {
    throw error
  }
  return data
}

/**
 * Live updates: calls onMessage(message) whenever anyone posts in this hangout.
 * @returns {() => void} call it to stop listening (when leaving the page)
 */
export function subscribeToMessages(hangoutId, onMessage) {
  if (hangoutId === 'demo' || !hasSupabase) {
    return () => {}
  }
  const channel = supabase
    .channel(`messages:${hangoutId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `hangout_id=eq.${hangoutId}`,
      },
      (payload) => onMessage(payload.new),
    )
    .subscribe()
  return () => supabase.removeChannel(channel)
}
