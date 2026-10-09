// Owner: Matrix. Read and save the logged-in user's preferences (the profiles table).
// Views call these functions; they never call supabase directly.
import { supabase, hasSupabase } from './supabase'

const MOCK_KEY = 'fairpoint:mock-profile'

/** What a brand-new profile starts with (matches the column defaults in supabase/schema.sql). */
export const defaultPreferences = {
  activities: [],
  dietary: [],
  budget: 2,
  max_travel_mins: 45,
  indoor_if_rain: false,
  avoid_crowds: false,
  step_free: false,
}

/**
 * The user's profile row, or the defaults if they don't have one yet.
 * @param {string} userId
 */
export async function getProfile(userId) {
  if (!hasSupabase) {
    const saved = localStorage.getItem(MOCK_KEY)
    return { ...defaultPreferences, ...(saved ? JSON.parse(saved) : {}) }
  }

  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
  if (error) throw error
  return { ...defaultPreferences, ...data }
}

/**
 * Create or update the user's profile row.
 * @param {string} userId
 * @param {string} displayName needed when the row doesn't exist yet (column is not null)
 * @param {typeof defaultPreferences} prefs
 */
export async function saveProfile(userId, displayName, prefs) {
  if (!hasSupabase) {
    localStorage.setItem(MOCK_KEY, JSON.stringify(prefs))
    return
  }

  const { error } = await supabase
    .from('profiles')
    .upsert({ id: userId, display_name: displayName, ...prefs })
  if (error) throw error
}
