// Shared "Add to vote" logic for the Explore and Spot details pages: who owns each shortlisted
// spot, the 3-spots-per-person limit, and adding/removing through the shortlist table.
import { computed, reactive, ref, watch } from 'vue'
import { addToShortlist, removeFromShortlist } from '@/services/places'
import { useHangoutStore } from '@/stores/hangout'
import { useAuthStore } from '@/stores/auth'

export const MAX_SPOTS_PER_PERSON = 3

/** @param {() => string} getHangoutId */
export function useShortlist(getHangoutId) {
  const hangout = useHangoutStore()
  const auth = useAuthStore()
  const myId = computed(() => auth.user?.id ?? 'mock-user')

  const addedIds = reactive(new Set())
  // place id -> user who added it
  const ownerOf = reactive(new Map())
  const error = ref('')

  // Spots already saved to this hangout's shortlist show as added
  watch(
    () => hangout.shortlist,
    (list) => {
      list.forEach((s) => {
        addedIds.add(s.source_place_id)
        ownerOf.set(s.source_place_id, s.added_by)
      })
    },
    { immediate: true },
  )

  const myCount = computed(() => [...ownerOf.values()].filter((id) => id === myId.value).length)
  const isAdded = (id) => addedIds.has(id)
  const isMine = (id) => ownerOf.get(id) === myId.value
  const ownerProfile = (id) => hangout.members.find((m) => m.user_id === ownerOf.get(id)) ?? null

  async function addSpot(spot) {
    if (addedIds.has(spot.id)) return
    error.value = ''
    if (myCount.value >= MAX_SPOTS_PER_PERSON) {
      error.value = `You can only add ${MAX_SPOTS_PER_PERSON} spots to the shortlist. Remove one to add another.`
      return
    }
    addedIds.add(spot.id)
    ownerOf.set(spot.id, myId.value)
    try {
      const row = await addToShortlist(getHangoutId(), {
        source: 'google',
        source_place_id: spot.id,
        name: spot.name,
        category: spot.category,
        types: spot.types,
        lat: spot.lat,
        lng: spot.lng,
        rating: spot.rating,
        price_level: spot.priceLevel,
        image_url: spot.imageUrl,
        match_pct: spot.matchPct,
      })
      if (row && hangout.hangout && !hangout.hangout.shortlist.some((s) => s.id === row.id)) {
        hangout.hangout.shortlist.push(row)
      }
    } catch (err) {
      addedIds.delete(spot.id)
      ownerOf.delete(spot.id)
      error.value = `Could not add that spot to the shortlist: ${err.message}`
    }
  }

  async function removeSpot(spot) {
    if (!addedIds.has(spot.id) || !isMine(spot.id)) return
    error.value = ''
    try {
      await removeFromShortlist(getHangoutId(), {
        source: 'google',
        source_place_id: spot.id,
        added_by: myId.value,
      })
      addedIds.delete(spot.id)
      ownerOf.delete(spot.id)
      const list = hangout.hangout?.shortlist
      const i = list ? list.findIndex((s) => s.source_place_id === spot.id) : -1
      if (i !== -1) list.splice(i, 1)
    } catch (err) {
      error.value = `Could not remove that spot from the shortlist: ${err.message}`
    }
  }

  return { addedIds, error, isAdded, isMine, ownerProfile, addSpot, removeSpot }
}
