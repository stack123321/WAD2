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

/** Hangouts the logged-in user is a member of, newest first. Used by 04 Dashboard. */
export async function getMyHangouts() {
  if (!hasSupabase) return mockHangouts.map((h) => structuredClone(h))
  // TODO(Matrix): select hangouts joined through hangout_members for the current user
  return []
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
