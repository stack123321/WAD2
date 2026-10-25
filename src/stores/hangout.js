// Owner: Ryan
// the hangout being planned, shared across pages 06–12 (shape = src/mocks/hangout.json)
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { getHangout } from '@/services/hangouts'
import { hasSupabase } from '@/services/supabase'

// pages 06 to 12 all show the same hangout, so it's kept here once instead of every page loading its own copy.
export const useHangoutStore = defineStore('hangout', () => {
  const hangout = ref(null) // the hangout on screen, null before the first load
  const loading = ref(false)
  const error = ref(null)

  // shortcuts, empty lists before a hangout loads so pages can loop over them safely
  const members = computed(() => (hangout.value ? hangout.value.members : []))
  const shortlist = computed(() => (hangout.value ? hangout.value.shortlist : []))
  const votes = computed(() => (hangout.value ? hangout.value.votes : []))

  let wantedId = null // the hangout asked for last, in case we move on before an older one arrives

  // load a hangout by id, fetched fresh every time a hangout page opens so it shows what
  // friends changed since ("demo" = mock data, only fetched once so demo edits are kept)
  // if i open hangout a then quickly hangout b, a's answer might arrive after b's, so wantedId makes sure only the last one asked for is shown.
  async function load(id) {
    const cached = hangout.value !== null && hangout.value.id === id // this hangout is already loaded
    if (cached && (id.startsWith('demo') || !hasSupabase)) return // demo data never changes, keep it
    wantedId = id // the one i want now

    // first visit: show the loading state. coming back: keep showing the copy we have until the fresh one arrives
    if (!cached) {
      loading.value = true
      error.value = null
    }
    try {
      const fresh = await getHangout(id)
      if (wantedId === id) hangout.value = fresh // only if nothing newer was asked for meanwhile
    } catch (e) {
      // if a refresh fails, the copy we already have is still worth showing
      if (cached) console.error("Couldn't refresh the hangout", e)
      else if (wantedId === id) error.value = e
    }
    if (wantedId === id) loading.value = false // a newer load still running keeps its own loading state
  }

  return { hangout, loading, error, members, shortlist, votes, load }
})
