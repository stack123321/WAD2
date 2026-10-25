// Owner: Ryan
// true while the screen matches a css media query, e.g. useMediaQuery('(min-width: 576px)')
import { ref, onMounted, onBeforeUnmount } from 'vue'

// css can hide something on small screens, but this lets the script know the screen size so it can skip making it at all.
export function useMediaQuery(query) {
  const mql = window.matchMedia(query) // the browser's checker for this query
  const matches = ref(mql.matches) // true or false right now

  // the browser calls this when the screen crosses the size
  function update(event) {
    matches.value = event.matches
  }

  onMounted(() => mql.addEventListener('change', update)) // start listening when the component appears
  onBeforeUnmount(() => mql.removeEventListener('change', update)) // stop when it goes, so it doesn't keep running
  return matches
}
