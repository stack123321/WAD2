// Owner: Ryan
// the hangout being planned, shared across pages 06–12 (shape = src/mocks/hangout.json)
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { getHangout } from '@/services/hangouts'
import { hasSupabase } from '@/services/supabase'

export const useHangoutStore = defineStore('hangout', () => {
  const hangout = ref(null)
  const loading = ref(false)
  const error = ref(null)

  const members = computed(() => (hangout.value ? hangout.value.members : []))
  const shortlist = computed(() => (hangout.value ? hangout.value.shortlist : []))
  const votes = computed(() => (hangout.value ? hangout.value.votes : []))

  let wantedId = null // the hangout asked for last, in case we move on before an older one arrives

  // load a hangout by id, fetched fresh every time a hangout page opens so it shows what
  // friends changed since ("demo" = mock data, only fetched once so demo edits are kept)
  async function load(id) {
    const cached = hangout.value !== null && hangout.value.id === id
    if (cached && (id.startsWith('demo') || !hasSupabase)) return
    wantedId = id

    // first visit: show the loading state. coming back: keep showing the copy we have until the fresh one arrives
    if (!cached) {
      loading.value = true
      error.value = null
    }
    try {
      const fresh = await getHangout(id)
      if (wantedId === id) hangout.value = fresh
    } catch (e) {
      // if a refresh fails, the copy we already have is still worth showing
      if (cached) console.error("Couldn't refresh the hangout", e)
      else if (wantedId === id) error.value = e
    }
    if (wantedId === id) loading.value = false
  }

  return { hangout, loading, error, members, shortlist, votes, load }
})
