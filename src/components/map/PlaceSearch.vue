<script setup>
// Owner: Surya. Search box for a place in Singapore (MRT, address or postal code) via OneMap,
// with a results list you can click or move through with ↑ ↓ and Enter. Used on 06 Starting points.
// It can also fill in where you are now with "Use my current location".
// Usage: <PlaceSearch placeholder="e.g. Holland Village" :show-location="true"
//          @choose="setStart" @typing="isTyping = $event" />
//   choose → the picked place { label, address, lat, lng, postal }
//   typing → true while there's text in the box, false when it's empty again
import { computed, ref, watch } from 'vue'
import { isInSingapore, reverseGeocode, searchAddress } from '@/services/onemap'

const props = defineProps({
  placeholder: { type: String, default: 'Search a place' },
  showLocation: { type: Boolean, default: false }, // show the "Use my current location" button
  // your last few starting points, shown when you tap the empty box: [{ label, lat, lng }]
  recentPlaces: { type: Array, default: () => [] },
})

const emit = defineEmits(['choose', 'typing'])

const query = ref('')
const results = ref([])
const searching = ref(false)
const searchError = ref('')
const postalHint = ref('') // validation message for postal codes
const activeIndex = ref(0) // the result highlighted with the arrow keys

const showResults = computed(() => query.value.trim().length >= 2)

// Recent places: shown while the box is focused and still empty
const focused = ref(false)
const showRecent = computed(
  () => focused.value && query.value.trim() === '' && props.recentPlaces.length > 0,
)

// Part (a) Search as you type
// We wait until the user stops typing for 0.3 s before searching, so we don't call OneMap on
// every single key press. Each new key press cancels the timer from the one before.
let timer = null

watch(query, (text) => {
  const trimmed = text.trim()
  emit('typing', trimmed !== '')
  clearTimeout(timer)
  searchError.value = ''
  postalHint.value = ''
  activeIndex.value = 0

  if (trimmed.length < 2) {
    results.value = []
    searching.value = false
    return
  }

  // Validation: only numbers means a postal code, and Singapore postal codes have exactly 6 digits
  if (isAllDigits(trimmed) && trimmed.length !== 6) {
    results.value = []
    searching.value = false
    if (trimmed.length < 6) {
      postalHint.value = `Postal codes have 6 digits (you've typed ${trimmed.length}).`
    } else {
      postalHint.value = 'Postal codes only have 6 digits. Check the number and try again.'
    }
    return
  }

  searching.value = true
  timer = setTimeout(runSearch, 300)
})

function isAllDigits(text) {
  for (const ch of text) {
    if (!'0123456789'.includes(ch)) {
      return false
    }
  }
  return true
}

// "Try again" after a failed search
function retrySearch() {
  searchError.value = ''
  searching.value = true
  runSearch()
}

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
    searchError.value = "Search isn't working right now. Check your internet connection."
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

// Part (d) Use my current location
// The browser asks the user for permission, then gives us their latitude and longitude.
// OneMap turns that into the nearest address (reverse geocoding), the same as dragging a pin.
const locating = ref(false)
const locationError = ref('')

function useMyLocation() {
  locationError.value = ''
  if (!navigator.geolocation) {
    locationError.value = "Your browser can't share your location. Search for your place instead."
    return
  }
  locating.value = true
  navigator.geolocation.getCurrentPosition(onLocationFound, onLocationError, {
    enableHighAccuracy: true,
    timeout: 10000, // give up after 10 seconds
  })
}

async function onLocationFound(position) {
  const lat = position.coords.latitude
  const lng = position.coords.longitude

  // Validation: the starting point must be in Singapore
  if (!isInSingapore(lat, lng)) {
    locating.value = false
    locationError.value =
      "You seem to be outside Singapore, so we can't use your location. Search for your starting point instead."
    return
  }

  let place = null
  try {
    place = await reverseGeocode(lat, lng)
  } catch (error) {
    // the name lookup failed, but we still know where they are
    console.error(error)
  }

  // Not "My current location": friends see this label under your name, so it must read well for them
  let label = 'Pinned location'
  let address = null
  let postal = null
  if (place) {
    label = place.label
    address = place.address
    postal = place.postal
  }
  emit('choose', { label: label, address: address, lat: lat, lng: lng, postal: postal })
  locating.value = false
}

function onLocationError(error) {
  locating.value = false
  if (error.code === error.PERMISSION_DENIED) {
    locationError.value =
      'Location access is blocked. Allow it in your browser settings, or search instead.'
  } else if (error.code === error.TIMEOUT) {
    locationError.value = 'Finding your location took too long. Try again, or search instead.'
  } else {
    locationError.value = "We couldn't find your location. Try again, or search instead."
  }
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
        @focus="focused = true"
        @blur="focused = false"
      />
      <span class="onemap-tag">OneMap</span>
    </div>

    <button
      v-if="showLocation"
      type="button"
      class="btn btn-link btn-sm location-btn"
      :disabled="locating"
      @click="useMyLocation"
    >
      <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
        <circle cx="8" cy="8" r="3" fill="currentColor" />
        <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="1.5" />
      </svg>
      <span v-if="locating">Finding your location…</span>
      <span v-else>Use my current location</span>
    </button>
    <p v-if="locationError" class="small text-danger mb-0" role="alert">{{ locationError }}</p>

    <!-- Recent places: tap the empty box to reuse one (@mousedown so the box doesn't lose focus first) -->
    <ul v-if="showRecent" class="results" aria-label="Recent places">
      <li class="result-msg recent-title">Recent</li>
      <li
        v-for="place in recentPlaces"
        :key="place.label"
        class="result"
        @mousedown.prevent="choose(place)"
      >
        <span class="result-icon" aria-hidden="true">🕘</span>
        <span class="min-w-0">
          <span class="d-block fw-semibold text-truncate">{{ place.label }}</span>
        </span>
      </li>
    </ul>

    <ul v-if="showResults" id="place-results" class="results" role="listbox">
      <li v-if="postalHint" class="result-msg">{{ postalHint }}</li>
      <li v-else-if="searching" class="result-msg">Searching…</li>
      <li v-else-if="searchError" class="result-msg">
        <span class="text-danger">{{ searchError }}</span>
        <button
          type="button"
          class="btn btn-link btn-sm p-0 ms-1 retry-btn"
          @mousedown.prevent="retrySearch"
        >
          Try again
        </button>
      </li>
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

.recent-title {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
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

.location-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  min-height: 44px; /* big enough to tap with a finger */
  padding: 0;
  color: var(--fp-primary);
  font-weight: 600;
  text-decoration: none;
}

.retry-btn {
  min-height: 44px; /* big enough to tap with a finger */
  padding: 0 0.6rem !important;
  color: var(--fp-primary);
  font-weight: 600;
  text-decoration: none;
}
</style>
