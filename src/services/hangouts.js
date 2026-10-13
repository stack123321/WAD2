// Owner: Matrix. Create, join and read hangouts and their members.
// Views call these functions; they never call supabase or fetch directly.
import { supabase, hasSupabase } from './supabase'
import mockHangout from '@/mocks/hangout.json'

/**
 * One hangout joined with its members, shortlist and votes (same shape as src/mocks/hangout.json).
 * @param {string} id hangout uuid, or "demo" for the mock
 */
export async function getHangout(id) {
  if (id === 'demo' || !hasSupabase) return structuredClone(mockHangout)

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
  if (!hasSupabase) return [structuredClone(mockHangout)]

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
