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

  // (Ryan) the host's name, for "Locked by Ryan" on 07 and 08
  const hostName = computed(() => {
    if (!hangout.value) return 'the host'
    const host = hangout.value.members.find((m) => m.user_id === hangout.value.host_id)
    return host ? host.display_name : 'the host'
  })

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

  // (Ryan) a new midpoint: the old spots and their votes go, and voting starts over.
  // set_midpoint does the same in the database; this keeps the screen (and the demo hangout) in step
  function clearSpots() {
    if (!hangout.value) return
    hangout.value.shortlist = []
    hangout.value.votes = []
    hangout.value.final_shortlist_id = null
    if (hangout.value.status === 'voting' || hangout.value.status === 'confirmed') {
      hangout.value.status = 'collecting'
      hangout.value.vote_deadline = null
    }
  }

  // (Ryan) a live change to the hangout from Supabase Realtime: the lock, the midpoint, the vote status.
  // The row has only the hangout's own columns, so members, shortlist and votes are kept
  function applyChange(row) {
    if (!hangout.value) return
    if (row.midpoint_name !== hangout.value.midpoint_name) clearSpots() // set_midpoint cleared them too
    hangout.value = { ...hangout.value, ...row }
  }

  return {
    hangout,
    loading,
    error,
    members,
    shortlist,
    votes,
    hostName,
    load,
    clearSpots,
    applyChange,
  }
})
