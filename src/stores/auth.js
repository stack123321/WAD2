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

  // TODO(Matrix): signUp(email, password, displayName) and signIn(email, password)

  return { user, ready, isLoggedIn, init, signOut }
})
