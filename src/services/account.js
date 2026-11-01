// Owner: Surya. "Delete my account" on 03 Preferences.
// Needs supabase/migrations/2026-10-31-delete-account.sql to have been run.
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
