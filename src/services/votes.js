// Owner: Eashvar. Votes for 11 Group voting, including live updates (Supabase Realtime).
import { supabase, hasSupabase } from './supabase'

/** Cast or change my vote (one row per person per hangout). */
export async function castVote(hangoutId, userId, shortlistId) {
  if (!hasSupabase) return
  const { error } = await supabase.from('votes').upsert({
    hangout_id: hangoutId,
    user_id: userId,
    shortlist_id: shortlistId,
    voted_at: new Date().toISOString(),
  })
  if (error) throw error
}

/** All votes for a hangout. */
export async function getVotes(hangoutId) {
  if (!hasSupabase) return []
  const { data, error } = await supabase.from('votes').select('*').eq('hangout_id', hangoutId)
  if (error) throw error
  return data
}

/**
 * Call onChange whenever anyone votes in this hangout.
 * @returns {() => void} call this in onUnmounted to stop listening
 */
export function subscribeToVotes(hangoutId, onChange) {
  if (!hasSupabase) return () => {}
  const channel = supabase
    .channel(`votes:${hangoutId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'votes', filter: `hangout_id=eq.${hangoutId}` },
      (payload) => onChange(payload),
    )
    .subscribe()
  return () => supabase.removeChannel(channel)
}
