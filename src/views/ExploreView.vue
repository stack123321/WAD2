<template>
  
  <div class="nearby-page">
    <HangoutBar
      v-if="hangout.hangout"
      :hangout="hangout.hangout"
      :members="hangout.members"
      current="explore"
    />

    <div class="content">
    <section class="head">
      <h1 class="cards-title">Spots near {{ hangout.hangout?.midpoint_name }}</h1>
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
        @add="addedIds.add(spot.id)"
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
            class="map"
            :center="mapCenter"
            :markers="mapMarkers"
            @marker-click="selectSpot"
          />
        </div>
      </div>

      <section class="shortlist">
        <h2 class="h6">Vote Shortlist</h2>
        <ul v-if="shortlisted.length" class="shortlist-list">
          <li v-for="spot in shortlisted" :key="spot.id" class="shortlist-item">
            <img v-if="spot.imageUrl" :src="spot.imageUrl" :alt="spot.name" class="shortlist-thumb" />
            <span v-else class="shortlist-thumb"></span>
            {{ spot.name }}
          </li>
        </ul>
        <p v-else class="text-secondary mb-0">No spots added yet.</p>
      </section>
    </aside>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import SpotCard from '@/components/spots/SpotCard.vue'
import BaseMap from '@/components/map/BaseMap.vue'
import HangoutBar from '@/components/hangout/HangoutBar.vue'
import spotsMock from '@/mocks/spots.json'
import { useHangoutStore } from '@/stores/hangout'

const route = useRoute()
const hangout = useHangoutStore()
hangout.load(route.params.id)

// Placeholder values until wired to the hangout store
const startsAt = '2026-10-16T19:00:00+08:00'
const formattedDate = computed(() =>
  new Date(startsAt).toLocaleString('en-SG', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }),
)

const steps = ['Starting points', 'Transport', 'Midpoint', 'Spots', 'Vote', 'Final plan']
const currentStep = 3

const people = [
  { name: 'Ryan', color: '#0E7C6B' },
  { name: 'Nicole', color: '#F2684A' },
  { name: 'Surya', color: '#6C63FF' },
  { name: 'Hugo', color: '#E0A100' },
]

// Placeholder spots until wired to the places service
const spots = ref(spotsMock)

const filters = [
  { label: 'All', value: 'all' },
  { label: 'Cafes', value: 'cafe' },
  { label: 'Activities', value: 'activity' },
  { label: 'Restaurants', value: 'restaurant' },
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
  rating: (a, b) => b.rating - a.rating,
  'price-asc': (a, b) => a.priceLevel - b.priceLevel,
  'price-desc': (a, b) => b.priceLevel - a.priceLevel,
  distance: (a, b) => a.stationDistanceM - b.stationDistanceM,
  crowd: (a, b) => a.crowdLevel - b.crowdLevel,
}
const sortedSpots = computed(() => [...filteredSpots.value].sort(comparators[sortBy.value]))

const addedIds = reactive(new Set())
const shortlisted = computed(() => spots.value.filter((s) => addedIds.has(s.id)))

const mapCenter = computed(() => [
  hangout.hangout?.midpoint_lat ?? 1.3508,
  hangout.hangout?.midpoint_lng ?? 103.8485,
])
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
