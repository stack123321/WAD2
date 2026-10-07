// Owner: Eashvar. Votes for 11 Group voting, including live updates (Supabase Realtime),
// and the host's status changes after voting (11 close vote, 12 mark as done).
import { supabase, hasSupabase } from './supabase'

/**
 * True when this hangout uses mock data: no Supabase keys, or the "demo" id.
 * Every function below does nothing in that case, so pages keep their own copy of the votes.
 */
export function isMockHangout(hangoutId) {
  return hangoutId === 'demo' || !hasSupabase
}

/** Cast or change my vote (one row per person per hangout). */
export async function castVote(hangoutId, userId, shortlistId) {
  if (isMockHangout(hangoutId)) return
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
  if (isMockHangout(hangoutId)) return []
  const { data, error } = await supabase.from('votes').select('*').eq('hangout_id', hangoutId)
  if (error) throw error
  return data
}

/**
 * Call onChange whenever anyone votes in this hangout.
 * @returns {() => void} call this in onUnmounted to stop listening
 */
export function subscribeToVotes(hangoutId, onChange) {
  if (isMockHangout(hangoutId)) return () => {}
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

/**
 * Host only: end the vote and save the winning spot. Used by 11 Group voting.
 * @param {string} shortlistId the winning shortlist row
 */
export async function closeVote(hangoutId, shortlistId) {
  await updateHangout(hangoutId, { status: 'confirmed', final_shortlist_id: shortlistId })
}

/** Host only: mark the hangout as finished. Used by 12 Final plan. */
export async function markHangoutDone(hangoutId) {
  await updateHangout(hangoutId, { status: 'done' })
}

async function updateHangout(hangoutId, fields) {
  if (isMockHangout(hangoutId)) return
  // .select() returns the updated rows. Row Level Security quietly skips the update for
  // anyone who isn't the host (no error, zero rows), so an empty result means "not allowed".
  const { data, error } = await supabase
    .from('hangouts')
    .update(fields)
    .eq('id', hangoutId)
    .select('id')
  if (error) throw error
  if (data.length === 0) throw new Error('Only the host can do this.')
}
