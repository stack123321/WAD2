// Owner: Ryan
// the hangout being planned, shared across pages 06–12 (shape = src/mocks/hangout.json)
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { getHangout } from '@/services/hangouts'

export const useHangoutStore = defineStore('hangout', () => {
  const hangout = ref(null)
  const loading = ref(false)
  const error = ref(null)

  const members = computed(() => (hangout.value ? hangout.value.members : []))
  const shortlist = computed(() => (hangout.value ? hangout.value.shortlist : []))
  const votes = computed(() => (hangout.value ? hangout.value.votes : []))

  // load a hangout by id, skip fetch if already loaded ("demo" = mock data)
  async function load(id) {
    if (hangout.value && hangout.value.id === id) return
    loading.value = true
    error.value = null
    try {
      hangout.value = await getHangout(id)
    } catch (e) {
      error.value = e
    }
    loading.value = false
  }

  return { hangout, loading, error, members, shortlist, votes, load }
})
