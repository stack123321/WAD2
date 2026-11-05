// Owner: Surya. "Delete my account" on 03 Preferences, and unique names on 02 Sign up.
// Needs the delete-account and unique-names database functions (SQL kept outside this repo).
import { supabase, hasSupabase } from './supabase'

const PHOTO_BUCKET = 'hangout-photos'

/**
 * Delete the logged-in user's account and data. Hangouts and groups they run pass to the next
 * person who joined (done by delete_my_account() in the database).
 * @param {string} userId
 */
export async function deleteMyAccount(userId) {
  // Without keys nothing is saved, so only forget the stand-in preferences
  if (!hasSupabase) {
    localStorage.removeItem('fairpoint:mock-profile')
    return
  }

  // Part (a) Remove your photo files first: the database can't delete Storage files itself.
  // If this fails, carry on; only the files are left behind, nobody can see them.
  try {
    const { data, error } = await supabase
      .from('hangout_photos')
      .select('path')
      .eq('user_id', userId)
    if (error) {
      throw error
    }
    const paths = data.map((p) => p.path)
    if (paths.length > 0) {
      const { error: removeError } = await supabase.storage.from(PHOTO_BUCKET).remove(paths)
      if (removeError) {
        throw removeError
      }
    }
  } catch (err) {
    console.error(err)
  }

  // Part (b) Delete the account itself
  const { error } = await supabase.rpc('delete_my_account')
  if (error) {
    throw error
  }
}

/**
 * The name to use for `name`: the name itself if nobody has it, or the next free one with a
 * number on the end (Ryan → Ryan1 → … → Ryan9999). "Ryan" and "ryan" count as the same.
 * @param {string} name
 * @returns {Promise<string | null>} null when every number is taken
 */
export async function freeName(name) {
  // Without keys there are no other accounts, so every name is free
  if (!hasSupabase) {
    return name.trim()
  }
  const { data, error } = await supabase.rpc('free_name', { base: name })
  if (error) {
    throw error
  }
  return data
}

/**
 * True when `name` is free to use, i.e. the database gave the same name back.
 * @param {string} name
 * @param {string | null} free what freeName() returned
 */
export function isSameName(name, free) {
  return free !== null && free.toLowerCase() === name.trim().toLowerCase()
}
