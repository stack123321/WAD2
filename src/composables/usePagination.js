// Splits a list into pages. `page` is kept inside the valid range when the list shrinks.
import { computed, ref } from 'vue'

export function usePagination(list, pageSize = 6) {
  const requestedPage = ref(1)
  const pageCount = computed(() => Math.max(1, Math.ceil(list.value.length / pageSize)))
  const page = computed({
    get: () => Math.min(requestedPage.value, pageCount.value),
    set: (value) => {
      requestedPage.value = value
    },
  })
  const pageItems = computed(() =>
    list.value.slice((page.value - 1) * pageSize, page.value * pageSize),
  )
  const rangeText = computed(() => {
    const first = (page.value - 1) * pageSize + 1
    const last = Math.min(page.value * pageSize, list.value.length)
    return `Showing ${first}–${last} of ${list.value.length}`
  })

  return { page, pageCount, pageItems, rangeText }
}
