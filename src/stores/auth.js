// Owner: Matrix. Who is logged in, shared by every page.
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { supabase, hasSupabase } from '@/services/supabase'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null) // Supabase auth user, or null when logged out
  const ready = ref(!hasSupabase) // true once we know whether someone is logged in

  const isLoggedIn = computed(() => user.value !== null)

  // Make sure a logged-in user has a profile row (their name for friends, groups and hangouts).
  // Sign-up only creates it when Supabase logs them straight in; with email confirmation on, it
  // was only made once they saved Preferences, so people who skipped that couldn't send friend
  // requests or be found. This adds the row if it's missing and never overwrites an existing one.
  async function ensureProfile(authUser) {
    if (!hasSupabase || !authUser) return
    const name = authUser.user_metadata?.display_name || authUser.email?.split('@')[0] || 'Friend'
    const { error } = await supabase
      .from('profiles')
      .upsert({ id: authUser.id, display_name: name }, { onConflict: 'id', ignoreDuplicates: true })
    if (error) console.error("Couldn't create your profile", error)
  }

  function init() {
    if (!hasSupabase) return
    supabase.auth.getSession().then(({ data }) => {
      user.value = data.session?.user ?? null
      ready.value = true
      ensureProfile(user.value)
    })
    supabase.auth.onAuthStateChange((event, session) => {
      user.value = session?.user ?? null
      // Back from the confirmation email, or logged in in another tab. Supabase asks for no other
      // Supabase calls inside this callback, so the profile check runs just after it.
      if (event === 'SIGNED_IN') {
        setTimeout(() => ensureProfile(session?.user), 0)
      }
      // Someone opened the "Forgot password" email link. If Supabase sent them somewhere other
      // than the reset screen (e.g. the redirect URL isn't allowed yet), send them there.
      if (event === 'PASSWORD_RECOVERY' && !window.location.search.includes('mode=reset')) {
        window.location.assign('/login?mode=reset')
      }
    })
  }

  async function signOut() {
    if (hasSupabase) await supabase.auth.signOut()
    user.value = null
  }

  // Without Supabase keys, log in a stand-in user so every page can still be clicked through.
  function mockLogin(email, displayName) {
    user.value = { id: 'mock-user', email, user_metadata: { display_name: displayName } }
  }

  async function signIn(email, password) {
    if (!hasSupabase) return mockLogin(email, email.split('@')[0])
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    user.value = data.user
    await ensureProfile(data.user)
  }

  // Returns true when the user must confirm their email before they can log in.
  async function signUp(email, password, displayName) {
    if (!hasSupabase) {
      mockLogin(email, displayName)
      return false
    }
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      // Bring them back to this exact page (keeping any ?invite=) after confirming their email
      options: { data: { display_name: displayName }, emailRedirectTo: window.location.href },
    })
    if (error) throw error
    if (!data.session) return true

    user.value = data.user
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({ id: data.user.id, display_name: displayName })
    if (profileError) throw profileError
    return false
  }

  // Emails a link that logs them in and opens the "Set a new password" screen (02 ?mode=reset)
  async function resetPassword(email) {
    if (!hasSupabase) return
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login?mode=reset`,
    })
    if (error) throw error
  }

  // Used by the reset screen, once the email link has logged them in
  async function updatePassword(password) {
    if (!hasSupabase) return
    const { error } = await supabase.auth.updateUser({ password })
    if (error) throw error
  }

  return {
    user,
    ready,
    isLoggedIn,
    init,
    signIn,
    signUp,
    resetPassword,
    updatePassword,
    signOut,
  }
})
