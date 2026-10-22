// Owner: Eashvar. Votes for 11 Group voting, including live updates (Supabase Realtime), the
// host starting the vote (11), changing when it closes (11), closing it (11) and marking the
// hangout done (12), and the
// tie-break wheel (11), which any member can spin: the database function spin_tiebreak() picks
// the winner at random, so nobody can choose it (sample hangouts pick one on the page instead).
// Every function does nothing for mock hangouts (no keys, or an id starting "demo"). Host updates
// use .select() because Row Level Security skips a non-host's update without an error.
import { supabase, hasSupabase } from './supabase'

export function isMockHangout(hangoutId) {
  return hangoutId.startsWith('demo') || !hasSupabase
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

export async function startVote(hangoutId, voteDeadline) {
  await updateHangout(hangoutId, { status: 'voting', vote_deadline: voteDeadline })
}

// Move when voting closes (earlier or later); a passed deadline moved ahead opens voting again
export async function changeVoteDeadline(hangoutId, voteDeadline) {
  await updateHangout(hangoutId, { vote_deadline: voteDeadline })
}

export async function closeVote(hangoutId, shortlistId) {
  await updateHangout(hangoutId, { status: 'confirmed', final_shortlist_id: shortlistId })
}

export async function spinTiebreak(hangoutId, tiedIds) {
  if (isMockHangout(hangoutId)) return tiedIds[Math.floor(Math.random() * tiedIds.length)]
  const { data, error } = await supabase.rpc('spin_tiebreak', { p_hangout: hangoutId })
  if (error) throw error
  return data
}

export async function markHangoutDone(hangoutId) {
  await updateHangout(hangoutId, { status: 'done' })
}

async function updateHangout(hangoutId, fields) {
  if (isMockHangout(hangoutId)) return
  const { data, error } = await supabase
    .from('hangouts')
    .update(fields)
    .eq('id', hangoutId)
    .select('id')
  if (error) throw error
  if (data.length === 0) throw new Error('Only the host can do this.')
}
