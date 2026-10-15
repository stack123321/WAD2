// Owner: Matrix. Create, join and read hangouts and their members.
// Views call these functions; they never call supabase or fetch directly.
import { supabase, hasSupabase } from './supabase'
import mockHangout from '@/mocks/hangout.json'
import mockHangout2 from '@/mocks/hangout-2.json'

// Two sample groups with different people, so switching between hangouts can be tried without keys
const mockHangouts = [mockHangout, mockHangout2]

/** The sample hangout with this id, or the first one if no sample has that id. */
function findMock(id) {
  return structuredClone(mockHangouts.find((h) => h.id === id) ?? mockHangout)
}

/**
 * One hangout joined with its members, shortlist and votes (same shape as src/mocks/hangout.json).
 * @param {string} id hangout uuid, or "demo" / "demo-2" for the samples
 */
export async function getHangout(id) {
  if (id.startsWith('demo') || !hasSupabase) return findMock(id)

  const { data, error } = await supabase
    .from('hangouts')
    .select(
      // "!hangout_id" tells Supabase which link to use, because hangouts.final_shortlist_id also points at shortlist
      '*, members:hangout_members(*, profile:profiles(display_name, avatar_color)), shortlist!hangout_id(*), votes(*)',
    )
    .eq('id', id)
    .single()
  if (error) throw error

  // Flatten profile fields so the shape matches the mock
  data.members = data.members.map(({ profile, ...m }) => ({ ...m, ...profile }))
  return data
}

/**
 * Hangouts the logged-in user is in (as host or member), soonest first. Used by 04 Dashboard.
 * Each one has the same shape as getHangout() (members, shortlist, votes).
 */
export async function getMyHangouts() {
  if (!hasSupabase) return mockHangouts.map((h) => structuredClone(h))

  // No filter needed: the security rules in schema.sql ("hangouts: members read") only let
  // you read hangouts you host or are a member of, so Supabase returns just yours.
  const { data, error } = await supabase
    .from('hangouts')
    .select(
      '*, members:hangout_members(*, profile:profiles(display_name, avatar_color)), shortlist!hangout_id(*), votes(*)',
    )
    .order('starts_at', { ascending: true })
  if (error) throw error

  // Flatten profile fields so each hangout matches the mock's shape, like getHangout()
  for (const hangout of data) {
    hangout.members = hangout.members.map(({ profile, ...m }) => ({ ...m, ...profile }))
  }
  return data
}

/** A short, easy-to-type invite code like "F7K2QX" (no 0/O or 1/I). */
export function makeInviteCode(length = 6) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('')
}

/**
 * Create a hangout and add the host as its first member. Used by 05 Create hangout.
 * @param {{ name: string, starts_at: string, vibe: string[], vote_deadline: string | null, invite_code: string }} input
 * @returns {Promise<object>} the new hangout row
 */
export async function createHangout(input) {
  if (!hasSupabase) return { ...structuredClone(mockHangout), ...input }

  const { data: hangout, error } = await supabase.from('hangouts').insert(input).select().single()
  if (error) throw error

  const { error: memberError } = await supabase
    .from('hangout_members')
    .insert({ hangout_id: hangout.id, user_id: hangout.host_id })
  if (memberError) throw memberError

  return hangout
}

/**
 * Save one member's starting point. Used by 06 Starting points (Surya).
 * You can save your own; in host mode the host can save anyone's. The security rules in
 * supabase/schema.sql ("members: edit own row") enforce that, not this function.
 * @param {string} hangoutId hangout uuid ("demo" is not saved)
 * @param {string} userId whose starting point it is
 * @param {{ label: string, lat: number, lng: number }} place
 */
export async function updateMemberStart(hangoutId, userId, place) {
  // The demo hangout and mock mode have no database to save to
  if (hangoutId === 'demo' || !hasSupabase) {
    return
  }

  const { data, error } = await supabase
    .from('hangout_members')
    .update({ start_label: place.label, start_lat: place.lat, start_lng: place.lng })
    .eq('hangout_id', hangoutId)
    .eq('user_id', userId)
    .select()
  if (error) {
    throw error
  }

  // If the security rules say no (e.g. not logged in, or someone else's row and you're not the
  // host), Supabase doesn't give an error: it just updates nothing. So check a row came back.
  if (data.length === 0) {
    throw new Error("You're not allowed to change this starting point.")
  }
}

/**
 * Delete a hangout. Its members, shortlist and votes go with it (on delete cascade in schema.sql).
 * Only the host can: the security rules ("hangouts: host deletes") enforce that, not this function.
 * Used by 04 Dashboard.
 */
export async function deleteHangout(id) {
  if (id === 'demo' || !hasSupabase) {
    throw new Error("The sample hangout can't be deleted.")
  }

  const { data, error } = await supabase.from('hangouts').delete().eq('id', id).select()
  if (error) {
    throw error
  }
  // If the security rules say no, Supabase deletes nothing instead of giving an error
  if (data.length === 0) {
    throw new Error('Only the host can delete this hangout.')
  }
}

/**
 * Leave a hangout you joined (members only; the host deletes it instead). Removes your vote and
 * your member row, which holds your starting point and transport. The security rules
 * ("votes: remove own", "members: leave or host removes") only allow removing your own.
 * Used by 04 Dashboard.
 */
export async function leaveHangout(hangoutId, userId) {
  if (hangoutId === 'demo' || !hasSupabase) {
    throw new Error("You can't leave the sample hangout.")
  }

  // Your vote first, so it no longer counts once you've left
  const { error: voteError } = await supabase
    .from('votes')
    .delete()
    .eq('hangout_id', hangoutId)
    .eq('user_id', userId)
  if (voteError) {
    throw voteError
  }

  const { data, error } = await supabase
    .from('hangout_members')
    .delete()
    .eq('hangout_id', hangoutId)
    .eq('user_id', userId)
    .select()
  if (error) {
    throw error
  }
  if (data.length === 0) {
    throw new Error("You're not a member of this hangout.")
  }
}

/**
 * Everyone you've been in a hangout with: one entry per person, most hangouts together first.
 * Used by 06 Starting points ("Friends from past hangouts").
 * @param {string} myId the logged-in user, left out of the list
 * @returns {Promise<Array<{ user_id: string, display_name: string, avatar_color: string | null, together: number }>>}
 */
export async function getPastFriends(myId) {
  if (!hasSupabase) {
    return []
  }

  // No filter needed: the security rules only let you read the members of hangouts you're in
  const { data, error } = await supabase
    .from('hangout_members')
    .select('user_id, hangout_id, profile:profiles(display_name, avatar_color)')
  if (error) {
    throw error
  }

  // The same person appears once per shared hangout: keep one entry each and count the hangouts
  const friends = []
  for (const row of data) {
    if (row.user_id === myId) {
      continue
    }
    const existing = friends.find((f) => f.user_id === row.user_id)
    if (existing) {
      existing.together++
    } else {
      friends.push({
        user_id: row.user_id,
        display_name: row.profile.display_name,
        avatar_color: row.profile.avatar_color,
        together: 1,
      })
    }
  }
  friends.sort((a, b) => b.together - a.together)
  return friends
}

/**
 * Add someone to a hangout. Only the host can, and only people they've shared a hangout with
 * (security rule "members: host adds past friends" in schema.sql). Used by 06 Starting points.
 */
export async function addMember(hangoutId, userId) {
  if (hangoutId === 'demo' || !hasSupabase) {
    throw new Error("You can't add people to the sample hangout.")
  }

  const { error } = await supabase
    .from('hangout_members')
    .insert({ hangout_id: hangoutId, user_id: userId })
  if (error) {
    // 42501 = the security rules said no
    if (error.code === '42501') {
      throw new Error('Only the host can add people, and only friends from past hangouts.')
    }
    throw error
  }
}

/**
 * Save the group's midpoint (an MRT station). Any member can, through the set_midpoint database
 * function in schema.sql (normal updates to a hangout are host-only). Used by 07 and 08.
 * @param {string} hangoutId
 * @param {{ name: string, lat: number, lng: number, avgMins: number | null, gapMins: number | null }} midpoint
 */
export async function saveMidpoint(hangoutId, midpoint) {
  // The demo hangout and mock mode have no database to save to
  if (hangoutId === 'demo' || !hasSupabase) {
    return
  }

  const { error } = await supabase.rpc('set_midpoint', {
    p_hangout: hangoutId,
    p_name: midpoint.name,
    p_lat: midpoint.lat,
    p_lng: midpoint.lng,
    p_avg: midpoint.avgMins,
    p_gap: midpoint.gapMins,
  })
  if (error) {
    throw error
  }
}

/**
 * Join a hangout from an invite link (/login?invite=CODE). Uses the join_hangout
 * database function in supabase/schema.sql.
 * @returns {Promise<string>} the hangout id
 */
export async function joinByInviteCode(code) {
  if (!hasSupabase) return 'demo'
  const { data, error } = await supabase.rpc('join_hangout', { code })
  if (error) throw error
  return data
}
