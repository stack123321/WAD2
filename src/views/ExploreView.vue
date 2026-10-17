<template>
  
  <div class="nearby-page">
    <div class="content">
    <section class="head">
      <h1 class="cards-title">Spots near {{ hangout.hangout?.midpoint_name }}</h1>
      <GooglePlacesToggle />
      <button
        v-if="googlePlacesEnabled && hasMidpoint"
        type="button"
        class="btn btn-sm btn-outline-secondary"
        :disabled="loadingSpots"
        @click="refreshSpots"
      >
        Refresh spots
      </button>
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
        <select v-model="sortBy" class="form-select form-select-sm sort-select" aria-label="Sort spots">
          <option v-for="option in sortOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
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
    <p v-if="loadError" class="text-danger">{{ loadError }}</p>
    <p v-else-if="googlePlacesEnabled && hasMidpoint && !loadingSpots && !sortedSpots.length && spots.length === 0" class="text-secondary" role="status">
      No nearby spots were found. Try again later or choose another midpoint.
    </p>
    <p v-else-if="hasMidpoint && !loadingSpots && spots.length && !sortedSpots.length" class="text-secondary" role="status">
      No spots match this filter.
    </p>
    <section class="cards d-flex">
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

    <aside class="side">
      <div class="map-section">
        <button
          type="button"
          class="map-toggle"
          aria-controls="explore-map-collapse"
          :aria-expanded="isMapOpen"
          @click="isMapOpen = !isMapOpen"
        >
          {{ isMapOpen ? 'Hide map' : 'Show map' }}
          <span class="map-toggle-chevron" :class="{ open: isMapOpen }" aria-hidden="true">&#9662;</span>
        </button>
        <div id="explore-map-collapse" class="map-collapse" :class="{ open: isMapOpen }">
          <BaseMap
            v-if="mapCenter"
            class="map"
            :center="mapCenter"
            :markers="mapMarkers"
            @marker-click="selectSpot"
          />
          <p v-else class="text-secondary p-3 mb-0">A midpoint is needed to show nearby spots on the map.</p>
        </div>
      </div>

      <section class="shortlist">
        <h2 class="h6">Vote Shortlist</h2>
        <ul v-if="shortlisted.length" class="shortlist-list">
          <li v-for="spot in shortlisted" :key="spot.id" class="shortlist-item">
            <img v-if="spot.imageUrl" :src="spot.imageUrl" :alt="spot.name" class="shortlist-thumb" />
            <span v-else class="shortlist-thumb"></span>
            <span class="shortlist-name">{{ spot.name }}</span>
            <MemberAvatar
              :name="ownerOfSpot(spot)?.display_name ?? 'Someone'"
              :color="ownerOfSpot(spot)?.avatar_color ?? null"
              :size="24"
            />
            <span class="visually-hidden">Added by {{ ownerOfSpot(spot)?.display_name ?? 'someone' }}</span>
            <button
              v-if="isMine(spot)"
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
      </section>
    </aside>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import SpotCard from '@/components/spots/SpotCard.vue'
import BaseMap from '@/components/map/BaseMap.vue'
import GooglePlacesToggle from '@/components/ui/GooglePlacesToggle.vue'
import MemberAvatar from '@/components/voting/MemberAvatar.vue'
import {
  addToShortlist,
  removeFromShortlist,
  googlePlacesEnabled,
  loadSpots,
} from '@/services/places'
import { useHangoutStore } from '@/stores/hangout'
import { useAuthStore } from '@/stores/auth'

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
        { radiusM: 1000, signal: controller.signal, force },
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
const filteredSpots = computed(() =>
  activeFilter.value === 'all'
    ? spots.value
    : spots.value.filter((s) => s.category === activeFilter.value),
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

const MAX_SPOTS_PER_PERSON = 3
const auth = useAuthStore()
const myId = computed(() => auth.user?.id ?? 'mock-user')

const addedIds = reactive(new Set())
// place id -> user who added it
const ownerOf = reactive(new Map())
const shortlisted = computed(() => spots.value.filter((s) => addedIds.has(s.id)))
const myCount = computed(() => [...ownerOf.values()].filter((id) => id === myId.value).length)
const isMine = (spot) => ownerOf.get(spot.id) === myId.value
const ownerOfSpot = (spot) => hangout.members.find((m) => m.user_id === ownerOf.get(spot.id)) ?? null

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

async function addSpot(spot) {
  if (addedIds.has(spot.id)) return
  loadError.value = ''
  if (myCount.value >= MAX_SPOTS_PER_PERSON) {
    loadError.value = `You can only add ${MAX_SPOTS_PER_PERSON} spots to the shortlist. Remove one to add another.`
    return
  }
  addedIds.add(spot.id)
  ownerOf.set(spot.id, myId.value)
  try {
    const row = await addToShortlist(route.params.id, {
      source: 'google',
      source_place_id: spot.id,
      name: spot.name,
      category: spot.category,
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
    loadError.value = `Could not add that spot to the shortlist: ${err.message}`
  }
}

async function removeSpot(spot) {
  if (!addedIds.has(spot.id) || !isMine(spot)) return
  loadError.value = ''
  try {
    await removeFromShortlist(route.params.id, {
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
    loadError.value = `Could not remove that spot from the shortlist: ${err.message}`
  }
}


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
async function selectSpot(id) {
  selectedId.value = id
  await nextTick()
  document
    .getElementById(`spot-card-${id}`)
    ?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
}

// Map starts collapsed on mobile, where it's shown behind a toggle; desktop always shows it expanded
const isMapOpen = ref(false)
</script>

<style scoped>
.nearby-page {
  min-height: 100vh;
  font-family: system-ui, sans-serif;
  background: #f5f5f5;
  color: #222;
}

.cards-title {
  margin: 0;
  font-size: 1.5rem;
}

.filters {
  display: flex;
  justify-content: space-between;
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

.head {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Cards and the side panel are placed on the page grid so the map shares the first card row's height */
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
.side{
  display:contents;
}

.map-section {

  display: flex;
  flex-direction: column;
}

/* Hidden on desktop, where the map is always expanded */
.map-toggle {
  display: none;
}

.map-toggle-chevron {
  display: inline-block;
  transition: transform 0.2s ease;
}

.map-toggle-chevron.open {
  transform: rotate(180deg);
}

.map-collapse {
  flex: 1;
  min-height: 0;
}

.map {
  height: 100%;
}

.shortlist {
  align-self: start;
  padding: 12px 16px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
}

.shortlist-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
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

/** d in favour of a single scrollable column; .cards and .side
/**     stay "contents" so their children can be reordered as flex items of .content */
/**  .content {
/**    display: flex;
/**    flex-direction: column;
/**    gap: 16px;
/**    margin: 12px;
/**  }
/**
/**  .head {
/**    order: 1;
/**  }
/**
/**  .filters {
/**    flex-direction: column;
/**    align-items: stretch;
/**  }
/**
/**  .sort-select {
/**    width: 100%;
/**  }
**/
  .map-section {
    display: block;
  }

  .map-toggle {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 10px 14px;
    background: #fff;
    border: none;
    border-radius: 8px;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
    font: inherit;
    font-weight: 600;
    color: inherit;
  }

  .map-collapse {
    max-height: 0;
    overflow: hidden;
    margin-top: 0;
    border-radius: 8px;
    transition:
      max-height 0.3s ease,
      margin-top 0.3s ease;
  }

  .map-collapse.open {
    max-height: 280px;
    margin-top: 12px;
  }
/**
/**  .map {
/**    height: 260px;
/**  }
/**
/**  /* Cards stack as a single scrolling column, overriding each card's desktop grid position */
/**  .cards > * {
/**    order: 3;
/**    width: 100%;
/**  }
/**
/**  .shortlist {
/**    order: 4;
/**  }
/**} **/
</style>
