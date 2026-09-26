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

/** Hangouts the logged-in user is a member of, newest first. Used by 04 Dashboard. */
export async function getMyHangouts() {
  if (!hasSupabase) return [structuredClone(mockHangout)]
  // TODO(Matrix): select hangouts joined through hangout_members for the current user
  return []
}

/**
 * Create a hangout and add the host as its first member. Used by 05 Create hangout.
 * @param {{ name: string, starts_at: string, vibe: string[] }} input
 * @returns {Promise<object>} the new hangout row (includes invite_code)
 */
export async function createHangout(input) {
  if (!hasSupabase) return { ...structuredClone(mockHangout), ...input }
  // TODO(Matrix): insert into hangouts, then insert the host's hangout_members row
  throw new Error('createHangout not built yet')
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
