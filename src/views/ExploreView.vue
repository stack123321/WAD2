<template>
   <div
    v-if="hangout.loading"
    class="d-flex align-items-center gap-2 text-secondary p-5"
    role="status"
  >
    <span class="spinner-border spinner-border-sm" aria-hidden="true"></span>
    Loading hangout…
  </div>

  <div v-else-if="hangout.error" class="container py-5">
    <div class="alert alert-danger" role="alert">
      Couldn't load this hangout. Check the link, or go back to
      <RouterLink :to="{ name: 'dashboard' }">My hangouts</RouterLink>.
    </div>
  </div>
  <!-- reached from the step bar before a midpoint has been picked: no filters, map or shortlist to show yet -->
  <main v-else-if="noMidpoint" class="container py-4">
    <h1 class="page-title mb-3">Spots near the midpoint</h1>
    <div class="alert alert-info" role="status">
      <p class="mb-2">
        No midpoint yet. Pick one first, then Fairpoint finds cafes, activities and restaurants near it.
      </p>
      <router-link
        :to="{ name: 'midpoint', params: { id: route.params.id } }"
        class="btn btn-primary btn-sm"
      >
        Go to midpoint →
      </router-link>
    </div>
  </main>

  <div
    v-else
    class="nearby-page px-3 py-4"
    :class="{
      'is-mobile-ask-open': showMobileAsk,
      'is-mobile-view-active': activeMobileView === 'map' || activeMobileView === 'shortlist',
      'has-mobile-tabbar': auth.isLoggedIn,
    }"
  >
    <div class="content">
    <div id="explore-spots" class="main-col">
    <section class="head">
      <h1 class="cards-title page-title">Spots near {{ hangout.hangout?.midpoint_name }}</h1>
      <div v-if="activeMobileView === 'spots'" class="mobile-spots-controls">
        <button
          v-if="!askedSpots"
          type="button"
          class="mobile-filter-toggle"
          :aria-expanded="showMobileFilters"
          aria-controls="explore-filters"
          @click="toggleMobilePanel('filters')"
        >
          Filters
        </button>
        <button
          v-if="askedSpots"
          type="button"
          class="mobile-ask-reset"
          aria-label="Reset Ask results"
          @click="resetAskResults"
        >
          Reset
        </button>
        <button
          v-if="hasMidpoint"
          type="button"
          class="mobile-ask-toggle"
          :aria-expanded="showMobileAsk"
          aria-controls="explore-ask"
          :aria-label="
            askedSpots
              ? `Ask for something specific, ${askedSpots.length} found`
              : 'Ask for something specific'
          "
          @click="toggleMobilePanel('ask')"
        >
          {{ askedSpots ? `Ask · ${askedSpots.length}` : 'Ask' }}
        </button>
        <button
          v-if="shortlisted.length < 2"
          type="button"
          class="btn btn-sm btn-primary mobile-vote-action"
          disabled
        >
          Go Vote!
        </button>
        <router-link
          v-else
          :to="{ name: 'vote', params: { id: route.params.id } }"
          class="btn btn-sm btn-primary mobile-vote-action"
        >
          Go Vote!
        </router-link>
      </div>
    </section>
    <div class="mobile-toggles">
      <button
        type="button"
        class="mobile-menu-toggle"
        :aria-expanded="showMobileToggles"
        aria-controls="explore-mobile-actions"
        :aria-label="showMobileToggles ? 'Close explore menu' : 'Open explore menu'"
        @click="showMobileToggles = !showMobileToggles"
      >
        <span aria-hidden="true" class="hamburger-icon">
          <span></span>
          <span></span>
          <span></span>
        </span>
      </button>
      <div v-if="showMobileToggles" id="explore-mobile-actions" class="mobile-toggle-menu">
        <button
          type="button"
          class="mobile-view-toggle"
          :aria-expanded="activeMobileView === 'spots'"
          aria-controls="explore-spots"
          @click="selectMobileView('spots')"
        >
          Spots
        </button>
        <button
          v-if="hasMidpoint"
          type="button"
          class="mobile-view-toggle"
          :aria-expanded="activeMobileView === 'map'"
          aria-controls="explore-map-content"
          @click="selectMobileView('map')"
        >
          Map
        </button>
        <button
          type="button"
          class="mobile-view-toggle"
          :aria-expanded="activeMobileView === 'shortlist'"
          aria-controls="explore-shortlist-content"
          @click="selectMobileView('shortlist')"
        >
          Shortlist
        </button>
      </div>
    </div>
    <AskSpots
      ref="askSpots"
      v-if="hasMidpoint"
      id="explore-ask"
      class="ask-panel"
      :class="{ 'is-mobile-visible': showMobileAsk }"
      :hangout="hangout.hangout"
      :members="hangout.members"
      :memory="remembered.ask"
      @found="onAskFound"
    />
    <div
      v-if="showMobileFilters || showMobileAsk"
      class="mobile-filter-barrier"
      aria-hidden="true"
      @click="closeMobilePanel"
    />

    <p v-if="hangout.loading" class="explore-status text-secondary" role="status">Loading hangout…</p>
    <p v-else-if="!hasMidpoint" class="explore-status text-secondary" role="status">
      This hangout doesn't have a midpoint yet. Choose a midpoint before looking for nearby spots.
    </p>
    <p v-else-if="!googlePlacesEnabled" class="explore-status text-secondary" role="status">
      Google Places is off. Turn it on to find nearby spots. This preference is saved on this device.
    </p>
    <p v-else-if="loadingSpots" class="explore-status text-secondary" role="status">Finding spots near {{ hangout.hangout.midpoint_name }}…</p>
    <p v-if="loadError || shortlistError" class="explore-status text-danger">{{ loadError || shortlistError }}</p>
    <p v-else-if="!askedSpots && googlePlacesEnabled && hasMidpoint && !loadingSpots && !sortedSpots.length && spots.length === 0" class="explore-status text-secondary" role="status">
      No nearby spots were found. Try again later or choose another midpoint.
    </p>
    <p v-else-if="!askedSpots && hasMidpoint && !loadingSpots && spots.length && !sortedSpots.length" class="explore-status text-secondary" role="status">
      No spots match this filter.
    </p>
    <div v-if="!askedSpots" class="filter-menu-container">
      <button
        type="button"
        class="desktop-filter-toggle"
        :aria-expanded="showDesktopFilters"
        aria-controls="explore-filters"
        @click="toggleDesktopFilters"
      >
        Filters
      </button>
      <div
        id="explore-filters"
        class="filters"
        :class="{
          'is-mobile-visible': showMobileFilters,
          'is-desktop-visible': showDesktopFilters,
        }"
      >
        <div class="filter-buttons">
          <button
            v-for="filter in filters"
            :key="filter.value"
            type="button"
            class="btn btn-sm"
            :class="activeFilter === filter.value ? 'btn-primary' : 'btn-outline-primary'"
            @click="selectFilter(filter.value)"
          >
            {{ filter.label }}
          </button>
        </div>
        <div class="filter-options">
          <label class="match-filter">
            <input v-model="hideZeroMatches" type="checkbox" />
            <span>Hide 0% matches</span>
          </label>
          <select v-model="sortBy" class="form-select form-select-sm sort-select" aria-label="Sort spots">
            <option v-for="option in sortOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </div>
      </div>
    </div>
    <SpotCarousel ref="spotCarousel" :items="shownSpots">
      <template #default="{ item: spot }">
        <SpotCard
          :id="`spot-card-${spot.id}`"
          :class="{ 'is-selected': selectedId === spot.id }"
          :name="spot.name"
          :image-url="spot.imageUrl"
          :category="spot.category"
          :rating="spot.rating"
          :station-distance-m="spot.stationDistanceM"
          :nearest-station-name="spot.nearestStationName"
          :price-level="spot.priceLevel"
          :match-pct="spot.matchPct"
          :veto-reason="spot.vetoReason"
          :soft-veto-reasons="spot.softVetoReasons"
          :tags="spot.tags"
          :added="addedIds.has(spot.id)"
          :removable="isMine(spot.id)"
          :to="{ name: 'spot-details', params: { id: route.params.id, spotId: spot.id } }"
          @add="addSpot(spot)"
          @remove="removeSpot(spot)"
        />
      </template>
    </SpotCarousel>
    </div>
    <div
      class="map-shortlist-row"
      :class="{
        'is-mobile-map': activeMobileView === 'map',
        'is-mobile-shortlist': activeMobileView === 'shortlist',
      }"
    >
      <div class="map-section">
        <button
          type="button"
          class="mobile-collapse-toggle"
          aria-controls="explore-map-content"
          :aria-expanded="!isMapCollapsed"
          @click="isMapCollapsed = !isMapCollapsed"
        >
          Map
          <span aria-hidden="true">{{ isMapCollapsed ? '+' : '−' }}</span>
        </button>
        <div
          id="explore-map-content"
          class="map-content"
          :class="{ 'is-collapsed': isMapCollapsed }"
        >
          <BaseMap
            v-if="mapCenter && !isMapCollapsed"
            class="map"
            :center="mapCenter"
            :markers="mapMarkers"
            @marker-click="selectSpot"
          />
          <p v-else-if="!mapCenter && !isMapCollapsed" class="text-secondary p-3 mb-0">
            A midpoint is needed to show nearby spots on the map.
          </p>
          <div v-if="mapCenter && !isMapCollapsed" class="radius-slider">
            <label for="explore-radius" class="radius-label">
              Within {{ radiusKm }} km of the midpoint
            </label>
            <input
              id="explore-radius"
              v-model.number="radiusKm"
              type="range"
              class="form-range"
              min="1"
              max="3"
              step="0.5"
            />
          </div>
        </div>
      </div>
      <div class="shortlist-panel">
        <section class="shortlist">
          <h2 class="shortlist-heading">Vote Shortlist</h2>
          <button
            type="button"
            class="shortlist-toggle"
            aria-controls="explore-shortlist-content"
            :aria-expanded="!isShortlistCollapsed"
            @click="isShortlistCollapsed = !isShortlistCollapsed"
          >
            Vote Shortlist
            <span aria-hidden="true">{{ isShortlistCollapsed ? '+' : '−' }}</span>
          </button>
          <div
            id="explore-shortlist-content"
            class="shortlist-content"
            :class="{ 'is-collapsed': isShortlistCollapsed }"
          >
            <ul v-if="shortlisted.length" class="shortlist-list">
              <li v-for="spot in shortlisted" :key="spot.id" class="shortlist-item">
                <img v-if="spot.imageUrl" :src="spot.imageUrl" :alt="spot.name" class="shortlist-thumb" />
                <span v-else class="shortlist-thumb"></span>
                <span class="shortlist-name">{{ spot.name }}</span>
                <MemberAvatar
                  :name="ownerProfile(spot.id)?.display_name ?? 'Someone'"
                  :color="ownerProfile(spot.id)?.avatar_color ?? null"
                  :size="24"
                />
                <span class="visually-hidden">Added by {{ ownerProfile(spot.id)?.display_name ?? 'someone' }}</span>
                <button
                  v-if="isMine(spot.id)"
                  type="button"
                  class="shortlist-remove"
                  :aria-label="`Remove ${spot.name} from shortlist`"
                  @click="removeSpot(spot)"
                >
                  &times;
                </button>
              </li>
            </ul>
            <p v-else class="text-secondary mb-0">No spots added yet.</p>
          </div>
        </section>
        <div class="shortlist-actions">
          <button
            v-if="googlePlacesEnabled && hasMidpoint"
            type="button"
            class="btn btn-sm btn-outline-secondary"
            :disabled="loadingSpots"
            @click="refreshSpots"
          >
            Refresh spots
          </button>
          <button
            v-if="shortlisted.length < 2"
            type="button"
            class="btn btn-sm btn-primary shortlist-vote-action"
            disabled
          >
            Go Vote!
          </button>
          <router-link
            v-else
            :to="{ name: 'vote', params: { id: route.params.id } }"
            class="btn btn-sm btn-primary shortlist-vote-action"
          >
            Go Vote!
          </router-link>
        </div>
      </div>
    </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, toRef, watch } from 'vue'
import { useRoute } from 'vue-router'
import SpotCard from '@/components/spots/SpotCard.vue'
import BaseMap from '@/components/map/BaseMap.vue'
import MemberAvatar from '@/components/voting/MemberAvatar.vue'
import SpotCarousel from '@/components/spots/SpotCarousel.vue'
import AskSpots from '@/components/assistant/AskSpots.vue'
import {
  googlePlacesEnabled,
  loadSpots,
} from '@/services/places'
import { useHangoutStore } from '@/stores/hangout'
import { useAuthStore } from '@/stores/auth'
import { useShortlist } from '@/composables/useShortlist'
import { useExploreMemory } from '@/composables/useExploreMemory'
import {
  hardVetoReason,
  matchScore,
  matchesHangoutVibe,
  softVetoReasons,
} from '@/utils/matchScore'
import { getStationCrowd } from '@/services/crowd'
import { willRainAt } from '@/services/weather'

const route = useRoute()
const auth = useAuthStore()
const hangout = useHangoutStore()
hangout.load(route.params.id)

// Filters, sort and Ask results are kept until a different hangout is opened
const remembered = useExploreMemory(route.params.id)

const spots = ref([])
const loadError = ref('')
const loadingSpots = ref(false)
const hasMidpoint = computed(
  () =>
    hangout.hangout?.midpoint_lat != null &&
    hangout.hangout?.midpoint_lng != null,
)

// The hangout has loaded but nobody has picked a midpoint yet, so there is nothing to search around
const noMidpoint = computed(
  () => hangout.hangout !== null && !hangout.loading && !hasMidpoint.value,
)

// Rain forecast for the hangout's start time near the midpoint, for matchScore's weather veto.
// One call covers every spot (they're all close to the midpoint), refreshed when the hangout's
// time or place changes.
const raining = ref(false)
const crowdLevel = ref(null)
watch(
  () => [hangout.hangout?.midpoint_lat, hangout.hangout?.midpoint_lng, hangout.hangout?.starts_at],
  async ([lat, lng, startsAt]) => {
    if (lat == null || lng == null || !startsAt) {
      raining.value = false
      return
    }
    try {
      const forecast = await willRainAt(lat, lng, startsAt)
      raining.value = forecast?.rain ?? false
    } catch {
      raining.value = false
    }
  },
  { immediate: true },
)

// Crowd level at the midpoint during the hangout, shared by every nearby spot because
// the Places search is centred around that station.
watch(
  () => [hangout.hangout?.midpoint_name, hangout.hangout?.starts_at],
  async ([stationName, startsAt]) => {
    crowdLevel.value = null
    if (!stationName || !startsAt) return
    try {
      crowdLevel.value = await getStationCrowd(stationName, new Date(startsAt))
    } catch (error) {
      console.error('Could not load crowd level', error)
    }
  },
  { immediate: true },
)

// A spot with a live group match % (Component A–D + hard/soft vetoes, see src/utils/matchScore.js)
function scoreSpot(spot) {
  return {
    ...spot,
    matchPct: matchScore(spot, hangout.members, {
      vibes: hangout.hangout?.vibe,
      startAt: hangout.hangout?.starts_at,
      raining: raining.value,
      crowdLevel: crowdLevel.value,
      midpoint: hasMidpoint.value
        ? { lat: hangout.hangout.midpoint_lat, lng: hangout.hangout.midpoint_lng }
        : null,
    }),
    vetoReason: hardVetoReason(spot, hangout.members, {
      vibes: hangout.hangout?.vibe,
      startAt: hangout.hangout?.starts_at,
      raining: raining.value,
      crowdLevel: crowdLevel.value,
      midpoint: hasMidpoint.value
        ? { lat: hangout.hangout.midpoint_lat, lng: hangout.hangout.midpoint_lng }
        : null,
    }),
    softVetoReasons: softVetoReasons(spot, hangout.members, {
      vibes: hangout.hangout?.vibe,
      startAt: hangout.hangout?.starts_at,
      raining: raining.value,
      crowdLevel: crowdLevel.value,
      midpoint: hasMidpoint.value
        ? { lat: hangout.hangout.midpoint_lat, lng: hangout.hangout.midpoint_lng }
        : null,
    }),
    vibeMatch: matchesHangoutVibe(spot, hangout.hangout?.vibe ?? []),
  }
}
const scoredSpots = computed(() => spots.value.map(scoreSpot))
let spotRequestId = 0
const refreshCount = ref(0)
let forceNextLoad = false

// Fetch Google Places around the midpoint saved on this hangout (reused from cache when recent).
watch(
  () => [
    hangout.hangout?.midpoint_lat,
    hangout.hangout?.midpoint_lng,
    googlePlacesEnabled.value,
    refreshCount.value,
  ],
  async ([lat, lng, enabled], _, onCleanup) => {
    const requestId = ++spotRequestId
    spots.value = []
    loadError.value = ''
    if (!enabled || lat == null || lng == null) {
      loadingSpots.value = false
      return
    }

    const controller = new AbortController()
    onCleanup(() => controller.abort())
    loadingSpots.value = true
    try {
      const force = forceNextLoad
      forceNextLoad = false
      const results = await loadSpots(
        { lat, lng },
        { radiusM: 3000, signal: controller.signal, force },
      )
      if (requestId === spotRequestId) spots.value = results
    } catch (err) {
      if (requestId === spotRequestId) {
        loadError.value = `Could not load nearby spots: ${err.message}`
      }
    } finally {
      if (requestId === spotRequestId) loadingSpots.value = false
    }
  },
  { immediate: true },
)

function refreshSpots() {
  forceNextLoad = true
  refreshCount.value++
}

const filters = [
  { label: 'All', value: 'all' },
  { label: 'Cafes', value: 'cafe' },
  { label: 'Restaurants', value: 'food' },
  { label: 'Parks & nature', value: 'outdoor' },
  { label: 'Activities', value: 'activity' },
  { label: 'Entertainment', value: 'entertainment' },
  { label: 'Museums & culture', value: 'culture' },
  { label: 'Fitness', value: 'fitness' },
  { label: 'Shopping', value: 'shopping' },
]
const activeFilter = toRef(remembered, 'activeFilter')
const hideZeroMatches = toRef(remembered, 'hideZeroMatches')
const showMobileFilters = ref(false)
const showDesktopFilters = ref(false)
const showMobileAsk = ref(false)
const showMobileToggles = ref(false)
const activeMobileView = ref('spots')
const askSpots = ref(null)

function resetAskResults() {
  askSpots.value?.showAll()
}

function toggleMobilePanel(panel) {
  const open = panel === 'ask' ? !showMobileAsk.value : !showMobileFilters.value
  showMobileAsk.value = panel === 'ask' && open
  showMobileFilters.value = panel === 'filters' && open
  showDesktopFilters.value = false
  showMobileToggles.value = false
}

function toggleDesktopFilters() {
  showDesktopFilters.value = !showDesktopFilters.value
  showMobileFilters.value = false
}

function closeMobilePanel() {
  showMobileFilters.value = false
  showMobileAsk.value = false
}

function selectMobileView(view) {
  activeMobileView.value = view
  showMobileFilters.value = false
  showMobileAsk.value = false
  showMobileToggles.value = false
}

function closeMobileFiltersOutside(event) {
  if (event.target.closest('.filters')) return
  if (event.target.closest('.mobile-filter-toggle')) {
    showDesktopFilters.value = false
    return
  }
  if (event.target.closest('.desktop-filter-toggle')) {
    showMobileFilters.value = false
    return
  }
  showMobileFilters.value = false
  showDesktopFilters.value = false
}

async function resetCarouselOnMobile() {
  if (!mobileViewport?.matches) return
  await nextTick()
  spotCarousel.value?.scrollToIndex(0)
}

async function selectFilter(filter) {
  activeFilter.value = filter
  await resetCarouselOnMobile()
}

let mobileViewport
function setDocumentScrollLock() {
  const isMobile = mobileViewport.matches
  document.documentElement.classList.toggle('explore-mobile-scroll-locked', isMobile)
  document.body.classList.toggle('explore-mobile-scroll-locked', isMobile)
  showMobileFilters.value = false
  showDesktopFilters.value = false
}

onMounted(() => {
  document.addEventListener('click', closeMobileFiltersOutside)

  mobileViewport = window.matchMedia('(max-width: 767px)')
  mobileViewport.addEventListener('change', setDocumentScrollLock)
  setDocumentScrollLock()
})

onBeforeUnmount(() => {
  document.removeEventListener('click', closeMobileFiltersOutside)
  mobileViewport?.removeEventListener('change', setDocumentScrollLock)
  document.documentElement.classList.remove('explore-mobile-scroll-locked')
  document.body.classList.remove('explore-mobile-scroll-locked')
})

const filterTypes = {
  entertainment: ['amusement_center', 'bowling_alley', 'movie_theater', 'karaoke'],
  culture: ['museum'],
  fitness: ['gym'],
}

function matchesFilter(spot) {
  if (activeFilter.value === 'all') return true
  if (filterTypes[activeFilter.value]) {
    return spot.types.some((type) => filterTypes[activeFilter.value].includes(type))
  }
  return spot.category === activeFilter.value
}

const radiusKm = toRef(remembered, 'radiusKm')

function distanceFromMidpointKm(spot) {
  const toRad = (deg) => (deg * Math.PI) / 180
  const dLat = toRad(spot.lat - hangout.hangout.midpoint_lat)
  const dLng = toRad(spot.lng - hangout.hangout.midpoint_lng)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(hangout.hangout.midpoint_lat)) *
      Math.cos(toRad(spot.lat)) *
      Math.sin(dLng / 2) ** 2
  return 6371 * 2 * Math.asin(Math.sqrt(a))
}

const filteredSpots = computed(() =>
  scoredSpots.value.filter(
    (s) =>
      matchesFilter(s) &&
      (!hideZeroMatches.value || s.matchPct > 0) &&
      (!hasMidpoint.value || distanceFromMidpointKm(s) <= radiusKm.value),
  ),
)

const sortOptions = [
  { label: 'Best group match', value: 'match' },
  { label: 'Ratings', value: 'rating' },
  { label: 'Price level (ascending)', value: 'price-asc' },
  { label: 'Price level (descending)', value: 'price-desc' },
  { label: 'Distance from station', value: 'distance' },
  { label: 'Crowd level', value: 'crowd' },
]
const sortBy = toRef(remembered, 'sortBy')

// Every sort keeps vibe-compatible spots first, then applies its selected criterion.
// Crowd level sorts quietest first.
function prioritiseVibeMatch(comparator) {
  return (a, b) => {
    if (a.vibeMatch !== b.vibeMatch) return a.vibeMatch ? -1 : 1
    return comparator(a, b)
  }
}

const comparators = {
  // Best group match must rank by the displayed percentage, including hard-vetoed 0% spots.
  match: (a, b) => b.matchPct - a.matchPct,
  rating: prioritiseVibeMatch((a, b) => (b.rating ?? 0) - (a.rating ?? 0)),
  'price-asc': prioritiseVibeMatch((a, b) => (a.priceLevel ?? 0) - (b.priceLevel ?? 0)),
  'price-desc': prioritiseVibeMatch((a, b) => (b.priceLevel ?? 0) - (a.priceLevel ?? 0)),
  distance: prioritiseVibeMatch(
    (a, b) => (a.stationDistanceM ?? Infinity) - (b.stationDistanceM ?? Infinity),
  ),
  crowd: prioritiseVibeMatch((a, b) => a.crowdLevel - b.crowdLevel),
}
const sortedSpots = computed(() => [...filteredSpots.value].sort(comparators[sortBy.value]))
const askedSpots = toRef(remembered, 'askedSpots')
const shownSpots = computed(() =>
  askedSpots.value ? askedSpots.value.map(scoreSpot) : sortedSpots.value,
)

async function onAskFound(found) {
  askedSpots.value = found
  if (found && window.matchMedia('(max-width: 767px)').matches) showMobileAsk.value = false
  await resetCarouselOnMobile()
}

const {
  addedIds,
  error: shortlistError,
  isMine,
  ownerProfile,
  addSpot,
  removeSpot,
} = useShortlist(() => route.params.id)
const shortlisted = computed(() => {
  const savedSpots = hangout.shortlist.map((savedSpot) => ({
    id: savedSpot.source_place_id,
    name: savedSpot.name,
    imageUrl: savedSpot.image_url,
  }))
  const savedIds = new Set(savedSpots.map((spot) => spot.id))
  const pendingSpots = [...spots.value, ...(askedSpots.value ?? [])].filter(
    (spot, i, all) =>
      addedIds.has(spot.id) &&
      !savedIds.has(spot.id) &&
      all.findIndex((s) => s.id === spot.id) === i,
  )
  return [...savedSpots, ...pendingSpots]
})

const mapCenter = computed(() =>
  hasMidpoint.value
    ? [hangout.hangout.midpoint_lat, hangout.hangout.midpoint_lng]
    : null,
)
const mapMarkers = computed(() =>
  shownSpots.value.map((s) => ({ id: s.id, lat: s.lat, lng: s.lng, label: s.name })),
)

// Clicking a map marker scrolls the cards bar sideways to that spot's card
const selectedId = ref(null)
const spotCarousel = ref(null)
const isMapCollapsed = ref(false)
const isShortlistCollapsed = ref(false)
async function selectSpot(id) {
  selectedId.value = id
  activeMobileView.value = 'spots'
  await nextTick()
  const index = shownSpots.value.findIndex((spot) => spot.id === id)
  if (index >= 0) spotCarousel.value?.scrollToIndex(index)
}

</script>

<style scoped>
.nearby-page {
  min-height: 100vh;
}

.content {
  position: relative;
}

.cards-title {
  margin: 0;
}

.mobile-spots-controls {
  display: none;
}

.filters {
  display: none;
  align-items: stretch;
  flex-direction: column;
  gap: 8px;
}

.filter-menu-container {
  position: relative;
  z-index: 4;
  margin: 4px 0 8px;
}

.desktop-filter-toggle {
  display: inline-flex;
  align-items: center;
  min-height: 38px;
  padding: 0 0.875rem;
  border: 1px solid var(--fp-border);
  border-radius: var(--fp-radius-sm);
  background: var(--fp-surface);
  color: var(--fp-ink);
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}

.desktop-filter-toggle[aria-expanded='true'] {
  border-color: var(--fp-primary);
  color: var(--fp-primary);
}

.filters.is-desktop-visible {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  z-index: 8;
  display: flex;
  width: min(32rem, calc(100vw - 2rem));
  padding: 14px 16px;
  border: 1px solid var(--fp-border);
  border-radius: var(--fp-radius-sm);
  background: var(--fp-surface);
  box-shadow: var(--fp-shadow);
}

.filter-options {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.filter-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.match-filter {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  font-size: 0.875rem;
  cursor: pointer;
  white-space: nowrap;
}

.match-filter input {
  margin: 0;
}

.sort-select {
  width: auto;
}

.head {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-right: 300px;
}

.mobile-vote-action {
  display:inline-flex;
  align-items:center;
  justify-content:center;
}

.mobile-toggles {
  display: none;
}

.map-section {
  margin-bottom: 16px;
}

.map-shortlist-row {
  display: contents;
}

.mobile-collapse-toggle {
  display: none;
}

.shortlist-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  font-size: 1rem;
  font-weight: 600;
  text-align: left;
  cursor: pointer;
}

.shortlist-heading {
  display: none;
}

.shortlist-content.is-collapsed {
  display: none;
}

.map {
  height: 120px;
}

.radius-slider {
  padding: 8px 4px 0;
}

.radius-label {
  display: block;
  font-size: 0.875rem;
}

.filters {
  margin-top: 4px;
}

.shortlist {
  align-self: start;
  padding: 12px 16px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
}

.shortlist-panel {
  position: absolute;
  top: 0;
  right: 0;
  z-index: 1;
  width: 280px;
  padding: 10px;
  background: #f6f4ef;
  border-radius: 10px;
}

.shortlist-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}
.shortlist-actions > .btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1.2;
}

.shortlist-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 120px;
  overflow-y: auto;
  margin: 0;
  padding: 0;
  list-style: none;
}

.shortlist-name {
  flex: 1;
  min-width: 0;
}

.shortlist-remove {
  padding: 0 6px;
  border: 0;
  background: none;
  color: #dc3545;
  font-size: 1.25rem;
  font-weight: 700;
  line-height: 1;
  cursor: pointer;
}

.shortlist-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.shortlist-thumb {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: 6px;
  object-fit: cover;
  background: #e0e0e0;
}

@media (min-width: 768px) {
  .shortlist-toggle {
    display: none;
  }

  .shortlist-heading {
    display: block;
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
  }

  .shortlist-content.is-collapsed {
    display: block;
  }

  .nearby-page {
    min-height: 0;
  }

  .content {
    display: grid;
    grid-template-columns: minmax(0, 3fr) minmax(240px, 1fr); /* the map column never gets narrower than 240px */
    gap: 16px;
    height: calc(100vh - 120px);
    min-height: 480px;
  }

  .main-col {
    display: flex;
    flex-direction: column;
    min-width: 0;
    min-height: 0;
  }

  .head {
    padding-right: 0;
  }

  .filters {
    margin-bottom: 8px;
  }

  .map-shortlist-row {
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-width: 0;
    min-height: 0;
  }

  .map-section {
    margin-bottom: 0;
  }

  .map {
    width: 100%;
    height: auto;
    aspect-ratio: 1 / 1;
  }

  .shortlist-panel {
    position: static;
    display: flex;
    flex-direction: column;
    flex: 1;
    width: auto;
    min-height: 0;
    padding: 0;
    background: transparent;
  }

  .shortlist {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
    align-self: stretch;
  }

  .shortlist-content {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
  }

  .shortlist-list {
    max-height: none;
    overflow-y: visible;
  }
}

/* between 768px and 991px three cards per row are too narrow, so show two */
@media (min-width: 768px) and (max-width: 991px) {
  .cards {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 767px) {
  :global(html.explore-mobile-scroll-locked),
  :global(body.explore-mobile-scroll-locked) {
    overflow: hidden;
  }

  .filter-menu-container {
    display: contents;
  }

  .desktop-filter-toggle {
    display: none;
  }

  .nearby-page.is-mobile-view-active .main-col :deep(.cards-carousel__arrow) {
    display: none;
  }

  .nearby-page {
    /*
     * Explore is rendered after the 57px navbar and the two-row 108px
     * hangout bar. The authenticated mobile tab bar is outside the page
     * flow and needs its own deduction below.
     */
    height: calc(100dvh - 57px - 108px);
    min-height: 0;
    padding: 0 !important;
    overflow: hidden;
  }

  .content {
    display: block;
    height: 100%;
  }

  .main-col {
    display: block;
    height: 100%;
  }

  .explore-status {
    position: absolute;
    z-index: 2;
    top: 50%;
    left: 50%;
    width: 85%;
    max-width: 24rem;
    margin: 0;
    transform: translate(-50%, -50%);
    text-align: center;
    pointer-events: none;
  }

  .head {
    position: absolute;
    z-index: 3;
    top: 0;
    left: 0;
    right: 0;
    align-items: flex-end;
    padding: 1rem 1rem 0;
    pointer-events: none;
  }

  .cards-title {
    max-width: calc(100% - 5rem);
    color: #fff;
    font-size: 1.25rem;
    text-align: right;
    text-shadow: 0 1px 4px rgb(0 0 0 / 70%);
  }

  .mobile-spots-controls {
    position: static;
    align-self: flex-end;
    display: flex;
    gap: 0.5rem;
    pointer-events: auto;
  }

  .mobile-vote-action {
    display: inline-flex;
  }

  .mobile-toggles {
    position: absolute;
    z-index: 6;
    top: 1rem;
    left: 1rem;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .mobile-menu-toggle {
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: rgb(0 0 0 / 45%);
    color: #fff;
    cursor: pointer;
  }

  .mobile-menu-toggle[aria-expanded='true'] {
    background: var(--fp-primary);
  }

  .hamburger-icon {
    display: grid;
    gap: 4px;
    width: 20px;
  }

  .hamburger-icon span {
    display: block;
    height: 2px;
    border-radius: 1px;
    background: currentColor;
  }

  .mobile-toggle-menu {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .mobile-filter-toggle,
  .mobile-ask-reset,
  .mobile-ask-toggle,
  .mobile-view-toggle {
    display: grid;
    place-items: center;
    min-width: 44px;
    height: 44px;
    padding: 0 1rem;
    border: 0;
    border-radius: 999px;
    background: rgb(0 0 0 / 45%);
    color: #fff;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
  }

  .mobile-filter-toggle[aria-expanded='true'],
  .mobile-ask-toggle[aria-expanded='true'],
  .mobile-view-toggle[aria-expanded='true'] {
    background: var(--fp-primary);
  }

  .nearby-page .ask-panel {
    position: absolute;
    z-index: 7;
    top: 7.5rem;
    left: 1rem;
    right: 1rem;
    display: none;
    max-height: calc(100% - 9.5rem);
    margin: 0;
    overflow-y: auto;
    box-shadow: var(--fp-shadow);
  }

  .nearby-page .ask-panel.is-mobile-visible {
    display: grid;
  }

  .mobile-filter-barrier {
    position: absolute;
    z-index: 4;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    background: transparent;
  }

  .nearby-page.is-mobile-ask-open .mobile-toggles {
    z-index: 3;
  }

  .filters {
    position: absolute;
    z-index: 6;
    left: 1rem;
    right: 1rem;
    display: none;
    flex-direction: column;
    align-items: stretch;
    padding: 14px 16px;
    border: 1px solid var(--fp-border);
    border-radius: var(--fp-radius-sm);
    background: var(--fp-surface);
    box-shadow: var(--fp-shadow);
    color: var(--fp-ink);
  }

  .filters {
    top: 6.25rem;
  }

  .filters.is-mobile-visible {
    display: flex;
  }

  .filter-buttons {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    max-height: 10rem;
    overflow-y: auto;
    padding-right: 0.25rem;
  }

  .match-filter {
    padding: 0;
  }

  .sort-select {
    width: auto;
    min-width: 0;
    flex: 1;
  }

  .filter-options {
    width: 100%;
    justify-content: space-between;
  }

  .map-shortlist-row {
    display: none;
  }

  .map-shortlist-row.is-mobile-map,
  .map-shortlist-row.is-mobile-shortlist {
    position: absolute;
    z-index: 2;
    inset: 0;
    display: block;
    overflow-y: auto;
    background: var(--fp-bg);
  }

  .map-shortlist-row.is-mobile-map .map-section {
    position: absolute;
    inset: 0;
    margin: 0;
  }

  .map-shortlist-row.is-mobile-map .shortlist-panel,
  .map-shortlist-row.is-mobile-map .map :deep(.leaflet-control-zoom) {
    display: none;
  }

  .map-shortlist-row.is-mobile-map .map-content {
    position: relative;
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .map-shortlist-row.is-mobile-map .map {
    flex: 1;
    width: 100%;
    min-height: 0;
    height: 100%;
    aspect-ratio: auto;
    border-radius: 0;
  }

  .map-shortlist-row.is-mobile-map .radius-slider {
    position: absolute;
    z-index: 1000;
    bottom: 1rem;
    right: 1rem;
    left: 1rem;
    padding: 0.75rem;
    border: 1px solid var(--fp-border);
    border-radius: var(--fp-radius-sm);
    background: var(--fp-surface);
    box-shadow: var(--fp-shadow);
  }

  .map-shortlist-row.is-mobile-shortlist .map-section {
    display: none;
  }

  .map-shortlist-row.is-mobile-map .radius-label {
    margin-bottom: 0.25rem;
  }

  .map-shortlist-row.is-mobile-shortlist .shortlist-panel {
    position: static;
    width: auto;
    min-height: 100%;
    padding: 4.5rem 1rem calc(1rem + env(safe-area-inset-bottom, 0px));
    background: transparent;
  }

  .map-shortlist-row.is-mobile-shortlist .shortlist-actions {
    justify-content: flex-end;
  }

  .map-shortlist-row.is-mobile-shortlist .shortlist-vote-action {
    margin-left: auto;
  }

  .map-shortlist-row.is-mobile-shortlist .shortlist {
    min-height: 8rem;
  }

  .map-shortlist-row.is-mobile-shortlist .shortlist-list {
    max-height: none;
    overflow: visible;
  }

  .nearby-page.has-mobile-tabbar {
    height: calc(100dvh - 57px - 108px - 52px - env(safe-area-inset-bottom, 0px));
  }

  .nearby-page.has-mobile-tabbar .map-shortlist-row.is-mobile-shortlist .shortlist-panel {
    padding-bottom: calc(1rem + 76px + env(safe-area-inset-bottom, 0px));
  }
}
</style>
