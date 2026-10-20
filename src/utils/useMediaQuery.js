// Owner: Ryan
// true while the screen matches a css media query, e.g. useMediaQuery('(min-width: 576px)')
import { ref, onMounted, onBeforeUnmount } from 'vue'

export function useMediaQuery(query) {
  const mql = window.matchMedia(query)
  const matches = ref(mql.matches)

  function update(event) {
    matches.value = event.matches
  }

  onMounted(() => mql.addEventListener('change', update))
  onBeforeUnmount(() => mql.removeEventListener('change', update))
  return matches
}
