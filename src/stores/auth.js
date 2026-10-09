// Owner: Matrix. Who is logged in, shared by every page.
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { supabase, hasSupabase } from '@/services/supabase'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null) // Supabase auth user, or null when logged out
  const ready = ref(!hasSupabase) // true once we know whether someone is logged in

  const isLoggedIn = computed(() => user.value !== null)

  function init() {
    if (!hasSupabase) return
    supabase.auth.getSession().then(({ data }) => {
      user.value = data.session?.user ?? null
      ready.value = true
    })
    supabase.auth.onAuthStateChange((_event, session) => {
      user.value = session?.user ?? null
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

  // Redirects away to Google, then back to `redirectTo`.
  async function signInWithGoogle(redirectTo) {
    if (!hasSupabase) return mockLogin('demo@fairpoint.sg', 'Demo')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    })
    if (error) throw error
  }

  async function resetPassword(email) {
    if (!hasSupabase) return
    const { error } = await supabase.auth.resetPasswordForEmail(email)
    if (error) throw error
  }

  return {
    user,
    ready,
    isLoggedIn,
    init,
    signIn,
    signUp,
    signInWithGoogle,
    resetPassword,
    signOut,
  }
})
