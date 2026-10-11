<script setup>
// Owner: Surya. Search box for a place in Singapore (MRT, address or postal code) via OneMap,
// with a results list you can click or move through with ↑ ↓ and Enter. Used on 06 Starting points.
// Usage: <PlaceSearch placeholder="e.g. Holland Village" @choose="setStart" @typing="isTyping = $event" />
//   choose → the picked place { label, address, lat, lng, postal }
//   typing → true while there's text in the box, false when it's empty again
import { computed, ref, watch } from 'vue'
import { searchAddress } from '@/services/onemap'

defineProps({
  placeholder: { type: String, default: 'Search a place' },
})

const emit = defineEmits(['choose', 'typing'])

const query = ref('')
const results = ref([])
const searching = ref(false)
const searchError = ref('')
const activeIndex = ref(0) // the result highlighted with the arrow keys

const showResults = computed(() => query.value.trim().length >= 2)

// Part (a) Search as you type
// We wait until the user stops typing for 0.3 s before searching, so we don't call OneMap on
// every single key press. Each new key press cancels the timer from the one before.
let timer = null

watch(query, (text) => {
  emit('typing', text.trim() !== '')
  clearTimeout(timer)
  searchError.value = ''
  activeIndex.value = 0

  if (text.trim().length < 2) {
    results.value = []
    searching.value = false
    return
  }

  searching.value = true
  timer = setTimeout(runSearch, 300)
})

async function runSearch() {
  const searchedFor = query.value

  try {
    const found = await searchAddress(searchedFor)

    // If the user kept typing while we waited, this answer is for old text: ignore it
    if (searchedFor !== query.value) {
      return
    }
    results.value = found
  } catch (error) {
    console.error(error)
    if (searchedFor !== query.value) {
      return
    }
    results.value = []
    searchError.value = "Search isn't working right now. Try again in a moment."
  }
  searching.value = false
}

// "4 Tampines Central 5, S529510", the grey line under each result
function placeDetail(place) {
  const parts = []
  if (place.address) {
    parts.push(place.address)
  }
  if (place.postal) {
    parts.push('S' + place.postal)
  }
  return parts.join(', ')
}

// Part (b) Keyboard: ↓ and ↑ move the highlight (wrapping around), Enter picks it
function moveDown() {
  if (results.value.length === 0) {
    return
  }
  activeIndex.value = (activeIndex.value + 1) % results.value.length
}

function moveUp() {
  if (results.value.length === 0) {
    return
  }
  activeIndex.value = (activeIndex.value - 1 + results.value.length) % results.value.length
}

function pickActive() {
  const place = results.value[activeIndex.value]
  if (place) {
    choose(place)
  }
}

// Part (c) Picking a result: tell the parent, then empty the box
function choose(place) {
  emit('choose', place)
  query.value = ''
  results.value = []
}
</script>

<template>
  <div>
    <label for="place-search" class="visually-hidden">Search for a place</label>
    <div class="search-box">
      <svg class="search-icon" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
        <circle cx="7" cy="7" r="5" fill="none" stroke="currentColor" stroke-width="1.6" />
        <path d="M11 11l3.5 3.5" stroke="currentColor" stroke-width="1.6" />
      </svg>
      <input
        id="place-search"
        v-model="query"
        type="search"
        class="search-input"
        :placeholder="placeholder"
        autocomplete="off"
        role="combobox"
        aria-controls="place-results"
        :aria-expanded="showResults"
        aria-autocomplete="list"
        @keydown.down.prevent="moveDown"
        @keydown.up.prevent="moveUp"
        @keydown.enter.prevent="pickActive"
        @keydown.esc="query = ''"
      />
      <span class="onemap-tag">OneMap</span>
    </div>

    <ul v-if="showResults" id="place-results" class="results" role="listbox">
      <li v-if="searching" class="result-msg">Searching…</li>
      <li v-else-if="searchError" class="result-msg text-danger">{{ searchError }}</li>
      <li v-else-if="results.length === 0" class="result-msg">
        No places match "{{ query.trim() }}". Try an MRT name or a 6-digit postal code.
      </li>
      <template v-else>
        <li
          v-for="(place, i) in results"
          :key="place.label + '-' + i"
          class="result"
          :class="{ active: i === activeIndex }"
          role="option"
          :aria-selected="i === activeIndex"
          @mousedown.prevent="choose(place)"
          @mouseenter="activeIndex = i"
        >
          <span class="result-icon" aria-hidden="true"><span class="dot"></span></span>
          <span class="min-w-0">
            <span class="d-block fw-semibold text-truncate">{{ place.label }}</span>
            <span v-if="placeDetail(place)" class="d-block small result-sub text-truncate">
              {{ placeDetail(place) }}
            </span>
          </span>
        </li>
      </template>
    </ul>
  </div>
</template>

<style scoped>
.min-w-0 {
  min-width: 0; /* lets text-truncate work inside a flex row */
}

.search-box {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 0.75rem 0.75rem 1rem;
  border: 2px solid var(--fp-primary);
  border-radius: var(--fp-radius-sm);
  background: var(--fp-surface);
}

.search-box:focus-within {
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--fp-primary) 15%, transparent);
}

.search-icon {
  flex-shrink: 0;
  color: var(--fp-muted);
}

.search-input {
  flex-grow: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  font-size: 1.05rem;
}

.onemap-tag {
  flex-shrink: 0;
  background: var(--fp-bg);
  border-radius: 999px;
  padding: 0.25rem 0.75rem;
  font-size: 0.8rem;
  font-weight: 500;
}

.results {
  list-style: none;
  margin: 0.75rem 0 0;
  padding: 0.5rem;
  border: 1px solid var(--fp-border);
  border-radius: var(--fp-radius-sm);
  box-shadow: var(--fp-shadow);
  max-height: 340px;
  overflow-y: auto;
}

.result {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 0.65rem 0.75rem;
  border-radius: var(--fp-radius-sm);
  cursor: pointer;
}

.result.active {
  background: color-mix(in srgb, var(--fp-primary) 12%, var(--fp-surface));
}

.result-msg {
  padding: 0.65rem 0.75rem;
  font-size: 0.875rem;
  color: var(--fp-muted);
}

.result-icon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 8px;
  background: var(--fp-bg);
}

.result-icon .dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--fp-muted);
}

.result.active .result-icon {
  background: var(--fp-primary);
}

.result.active .result-icon .dot {
  background: var(--fp-surface);
}

.result-sub {
  color: var(--fp-muted);
}
</style>
