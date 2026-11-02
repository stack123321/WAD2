// Remembers the filters, sort and Ask results on 09 Explore while the user leaves and comes back.
// It lives in memory for the whole session and is cleared as soon as a different hangout is opened.
import { reactive } from 'vue'

const memory = reactive({ hangoutId: null })

function freshState() {
  return {
    activeFilter: 'all',
    hideZeroMatches: false,
    sortBy: 'match',
    radiusKm: 1,
    askedSpots: null,
    ask: { message: '', history: [], result: null, lastTurn: null, dietOn: [] },
  }
}

/** The remembered Explore state for this hangout (a fresh one if another hangout was open before). */
export function useExploreMemory(hangoutId) {
  if (memory.hangoutId !== hangoutId) {
    Object.assign(memory, freshState(), { hangoutId })
  }
  return memory
}
