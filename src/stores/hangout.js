// Owner: Ryan. The hangout the user is currently planning, shared across pages 06–12,
// so each page doesn't reload it. Shape = src/mocks/hangout.json.
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { getHangout } from '@/services/hangouts'

export const useHangoutStore = defineStore('hangout', () => {
  const hangout = ref(null)
  const loading = ref(false)
  const error = ref(null)

  const members = computed(() => hangout.value?.members ?? [])
  const shortlist = computed(() => hangout.value?.shortlist ?? [])
  const votes = computed(() => hangout.value?.votes ?? [])

  /** Load a hangout by id (skips the fetch if it's already loaded). Use id "demo" for mock data. */
  async function load(id, { force = false } = {}) {
    if (!force && hangout.value?.id === id) return
    loading.value = true
    error.value = null
    try {
      hangout.value = await getHangout(id)
    } catch (e) {
      error.value = e
    } finally {
      loading.value = false
    }
  }

  return { hangout, loading, error, members, shortlist, votes, load }
})
