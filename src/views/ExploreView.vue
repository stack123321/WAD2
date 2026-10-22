<template>
  
  <div class="nearby-page">
    <div class="content">
    <div class="main-col">
    <section class="head">
      <h1 class="cards-title">Spots near {{ hangout.hangout?.midpoint_name }}</h1>
      <div class="head-actions">
        <GooglePlacesToggle />
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

    <p v-if="hangout.loading" class="text-secondary" role="status">Loading hangout…</p>
    <p v-else-if="!hasMidpoint" class="text-secondary" role="status">
      This hangout doesn't have a midpoint yet. Choose a midpoint before looking for nearby spots.
    </p>
    <p v-else-if="!googlePlacesEnabled" class="text-secondary" role="status">
      Google Places is off. Turn it on to find nearby spots. This preference is saved on this device.
    </p>
    <p v-else-if="loadingSpots" class="text-secondary" role="status">Finding spots near {{ hangout.hangout.midpoint_name }}…</p>
    <p v-if="loadError || shortlistError" class="text-danger">{{ loadError || shortlistError }}</p>
    <p v-else-if="googlePlacesEnabled && hasMidpoint && !loadingSpots && !sortedSpots.length && spots.length === 0" class="text-secondary" role="status">
      No nearby spots were found. Try again later or choose another midpoint.
    </p>
    <p v-else-if="hasMidpoint && !loadingSpots && spots.length && !sortedSpots.length" class="text-secondary" role="status">
      No spots match this filter.
    </p>
    <div class="filters">
      <div class="filter-buttons">
        <button
          v-for="filter in filters"
          :key="filter.value"
          type="button"
          class="btn btn-sm"
          :class="activeFilter === filter.value ? 'btn-primary' : 'btn-outline-primary'"
          @click="activeFilter = filter.value"
        >
          {{ filter.label }}
        </button>
      </div>
    </div>
    <div class="sort-control">
      <select v-model="sortBy" class="form-select form-select-sm sort-select" aria-label="Sort spots">
        <option v-for="option in sortOptions" :key="option.value" :value="option.value">
          {{ option.label }}
        </option>
      </select>
    </div>
    <section class="cards">
      <SpotCard
        v-for="spot in sortedSpots"
        :key="spot.id"
        :id="`spot-card-${spot.id}`"
        :class="{ 'is-selected': selectedId === spot.id }"
        :name="spot.name"
        :image-url="spot.imageUrl"
        :rating="spot.rating"
        :station-distance-m="spot.stationDistanceM"
        :nearest-station-name="spot.nearestStationName"
        :price-level="spot.priceLevel"
        :tags="spot.tags"
        :added="addedIds.has(spot.id)"
        :to="{ name: 'spot-details', params: { id: route.params.id, spotId: spot.id } }"
        @add="addSpot(spot)"
      />
    </section>
    </div>
    <div class="map-shortlist-row">
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
import { computed, nextTick, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import SpotCard from '@/components/spots/SpotCard.vue'
import BaseMap from '@/components/map/BaseMap.vue'
import GooglePlacesToggle from '@/components/ui/GooglePlacesToggle.vue'
import MemberAvatar from '@/components/voting/MemberAvatar.vue'
import {
  googlePlacesEnabled,
  loadSpots,
} from '@/services/places'
import { useHangoutStore } from '@/stores/hangout'
import { useShortlist } from '@/composables/useShortlist'

const route = useRoute()
const hangout = useHangoutStore()
hangout.load(route.params.id)

const spots = ref([])
const loadError = ref('')
const loadingSpots = ref(false)
const hasMidpoint = computed(
  () =>
    hangout.hangout?.midpoint_lat != null &&
    hangout.hangout?.midpoint_lng != null,
)
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
  { label: 'Activities', value: 'activity' },
  { label: 'Restaurants', value: 'food' },
  { label: 'Outdoors', value: 'outdoor' },
]
const activeFilter = ref('all')

const radiusKm = ref(1)

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
  spots.value.filter(
    (s) =>
      (activeFilter.value === 'all' || s.category === activeFilter.value) &&
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
const sortBy = ref('match')

// Crowd level sorts quietest first
const comparators = {
  match: (a, b) => b.matchPct - a.matchPct,
  rating: (a, b) => (b.rating ?? 0) - (a.rating ?? 0),
  'price-asc': (a, b) => (a.priceLevel ?? 0) - (b.priceLevel ?? 0),
  'price-desc': (a, b) => (b.priceLevel ?? 0) - (a.priceLevel ?? 0),
  distance: (a, b) => (a.stationDistanceM ?? Infinity) - (b.stationDistanceM ?? Infinity),
  crowd: (a, b) => a.crowdLevel - b.crowdLevel,
}
const sortedSpots = computed(() => [...filteredSpots.value].sort(comparators[sortBy.value]))

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
  const pendingSpots = spots.value.filter((spot) => addedIds.has(spot.id) && !savedIds.has(spot.id))
  return [...savedSpots, ...pendingSpots]
})

const mapCenter = computed(() =>
  hasMidpoint.value
    ? [hangout.hangout.midpoint_lat, hangout.hangout.midpoint_lng]
    : null,
)
const mapMarkers = computed(() =>
  sortedSpots.value.map((s) => ({ id: s.id, lat: s.lat, lng: s.lng, label: s.name })),
)

// Clicking a map marker scrolls the cards bar sideways to that spot's card
const selectedId = ref(null)
const isMapCollapsed = ref(false)
const isShortlistCollapsed = ref(false)
async function selectSpot(id) {
  selectedId.value = id
  await nextTick()
  document
    .getElementById(`spot-card-${id}`)
    ?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
}

</script>

<style scoped>
.nearby-page {
  min-height: 100vh;
  font-family: system-ui, sans-serif;
  background: #f5f5f5;
  color: #222;
}

.content {
  position: relative;
}

.cards-title {
  margin: 0;
  font-size: 1.5rem;
}

.filters {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.filter-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.sort-select {
  width: auto;
}

.sort-control {
  display: flex;
  justify-content: flex-start;
  margin: 4px 0 8px;
}

.head {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-right: 300px;
}

.head-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.mobile-vote-action {
  display: none;
}

.cards {
  display: flex;
  gap: 16px;
  min-width: 0;
  overflow-x: auto;
  padding-bottom: 12px;
}
.cards > * {
  flex: 0 0 280px;
}

.cards > .is-selected {
  outline: 2px solid #0e7c6b;
  outline-offset: 2px;
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
  background: #f5f5f5;
  border-radius: 10px;
}

.shortlist-actions {
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
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
  .nearby-page {
    min-height: 0;
  }

  .content {
    display: grid;
    grid-template-columns: minmax(0, 3fr) minmax(0, 1fr);
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

  .cards {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    /* max-content keeps each row at its card's full height; otherwise grid can shrink rows
       (and clip card text) below content size when this scroll area is shorter than its content. */
    grid-auto-rows: max-content;
    align-content: start;
    flex: 1;
    min-height: 0;
    overflow-x: hidden;
    overflow-y: auto;
    padding-bottom: 12px;
  }

  .cards > * {
    flex: none;
    min-width: 0;
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

@media (max-width: 767px) {
  .head {
    padding-right: 0;
  }

  .shortlist-panel {
    position: static;
    width: auto;
    min-width: 0;
    padding: 0;
    background: transparent;
  }

  .filters {
    flex-direction: column;
    align-items: stretch;
  }

  .sort-select {
    width: 100%;
  }
}

@media (max-width: 576px) {
  .content {
    display: flex;
    flex-direction: column;
  }

  .main-col {
    display: contents;
  }

  .head-actions {
    justify-content: space-between;
  }

  .mobile-vote-action {
    display: inline-flex;
  }

  .filters {
    order: 2;
  }

  .sort-control {
    order: 2;
    margin: 0 0 8px;
  }

  .cards {
    order: 3;
  }

  .map-shortlist-row {
    order: 4;
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    align-items: start;
    gap: 8px;
    margin-bottom: 16px;
  }

  .shortlist-vote-action {
    display: none;
  }

  .map-section {
    min-width: 0;
    margin-bottom: 0;
    overflow: hidden;
    background: #fff;
    border-radius: 8px;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
  }

  .mobile-collapse-toggle {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    min-height: 40px;
    padding: 8px 10px;
    border: 0;
    background: #fff;
    color: inherit;
    font: inherit;
    font-size: 0.875rem;
    font-weight: 600;
    text-align: left;
  }

  .map-content {
    padding: 0 6px 6px;
  }

  .map-content.is-collapsed {
    display: none;
  }

  .shortlist-panel {
    padding: 0;
    background: transparent;
  }

  .shortlist {
    padding: 0;
  }

  .shortlist-toggle {
    min-height: 40px;
    padding: 8px 10px;
    background: #fff;
    border-radius: 8px 8px 0 0;
    font-size: 0.875rem;
  }

  .shortlist-content {
    padding: 0 8px 8px;
    background: #fff;
  }

  .shortlist-actions {
    margin-top: 0;
    padding: 8px;
    background: #fff;
    border-radius: 0 0 8px 8px;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
  }

  .shortlist-item {
    gap: 5px;
  }

  .shortlist-thumb {
    width: 30px;
    height: 30px;
  }

  .shortlist-name {
    overflow-wrap: anywhere;
  }

  .map {
    height: 180px;
  }
}
</style>
