<script setup>
// Previous / numbered / Next buttons for a paged list. Hidden when there is only one page.
// Usage: <PaginationNav v-model="page" :page-count="pageCount" label="friends" />
defineProps({
  pageCount: { type: Number, required: true },
  label: { type: String, required: true }, // names the list for screen readers, e.g. "friends"
})
const page = defineModel({ type: Number, required: true })
</script>

<template>
  <nav v-if="pageCount > 1" :aria-label="`${label} pages`" class="mt-2">
    <ul class="pagination pagination-sm justify-content-center mb-0">
      <li class="page-item" :class="{ disabled: page === 1 }">
        <button
          type="button"
          class="page-link"
          :disabled="page === 1"
          :aria-label="`Previous ${label} page`"
          @click="page--"
        >
          Previous
        </button>
      </li>
      <li v-for="n in pageCount" :key="n" class="page-item" :class="{ active: n === page }">
        <button
          type="button"
          class="page-link"
          :aria-label="`${label} page ${n}`"
          :aria-current="n === page ? 'page' : undefined"
          @click="page = n"
        >
          {{ n }}
        </button>
      </li>
      <li class="page-item" :class="{ disabled: page === pageCount }">
        <button
          type="button"
          class="page-link"
          :disabled="page === pageCount"
          :aria-label="`Next ${label} page`"
          @click="page++"
        >
          Next
        </button>
      </li>
    </ul>
  </nav>
</template>
