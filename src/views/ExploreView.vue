<template>
  <div class="nearby-page">

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

    <section class="cards">
      <SpotCard
        v-for="(spot, i) in sortedSpots"
        :key="spot.id"
        :style="{ gridColumn: (i % 3) + 1, gridRow: Math.floor(i / 3) + 2 }"
        :name="spot.name"
        :image-url="spot.imageUrl"
        :rating="spot.rating"
        :station-distance-m="spot.stationDistanceM"
        :price-level="spot.priceLevel"
        :tags="spot.tags"
        :added="addedIds.has(spot.id)"
        :to="{ name: 'spot-details', params: { id: route.params.id, spotId: spot.id } }"
        @add="addedIds.add(spot.id)"
      />
    </section>

    <aside class="side">
      <BaseMap class="map" :center="mapCenter" :markers="mapMarkers" />

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
import { computed, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import SpotCard from '@/components/spots/SpotCard.vue'
import BaseMap from '@/components/map/BaseMap.vue'
import spotsMock from '@/mocks/spots.json'
import { useHangoutStore } from '@/stores/hangout'

const route = useRoute()
const hangout = useHangoutStore()
hangout.load(route.params.id)

// The hangout name, date, steps and avatars are in the shared step bar (HangoutBar, added in App.vue)

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
</script>

<style scoped>
.nearby-page {
  min-height: 100vh;
  font-family: system-ui, sans-serif;
  background: #f5f5f5;
  color: #222;
}

.content {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  align-content: start;
  gap: 16px;
  margin: 16px;
}

.info {
  padding: 12px 16px;
  background: #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
}

.info {
  box-sizing: border-box;
  height: 64px;
}

.cards-title {
  grid-column: 1 / -1;
  margin: 0;
  font-size: 1.5rem;
}

.filters {
  grid-column: 1 / -1;
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
.info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  flex-wrap: nowrap;
}

.info-name {
  font-weight: 700;
  white-space: nowrap;
}

.info-date {
  font-weight: 600;
  white-space: nowrap;
}

.steps {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: 0.8125rem;
  color: #888;
}

.step {
  display: flex;
  align-items: center;
  gap: 6px;
}

/* Connector line between steps */
.step + .step::before {
  content: '';
  width: 24px;
  height: 2px;
  background: #ddd;
}

.step.done + .step::before,
.step.current::before {
  background: #0e7c6b;
}

.step-dot {
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #e0e0e0;
  font-size: 0.75rem;
  font-weight: 600;
}

.step.done .step-dot,
.step.current .step-dot {
  background: #0e7c6b;
  color: #fff;
}

.step.current .step-label {
  color: #222;
  font-weight: 600;
}

.people {
  display: flex;
  margin: 0;
  padding: 0;
  list-style: none;
}

.avatar {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  margin-left: -6px;
  border: 2px solid #fff;
  border-radius: 50%;
  color: #fff;
  font-size: 0.75rem;
  font-weight: 600;
}

.avatar:first-child {
  margin-left: 0;
}

@media (max-width: 768px) {
  .step:not(.current) .step-label {
    display: none;
  }
}

.head {
  grid-column: 1 / 4;
  grid-row: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Cards and the side panel are placed on the page grid so the map shares the first card row's height */
.cards,
.side {
  display: contents;
}

.map {
  grid-column: 4;
  grid-row: 2;
}

.shortlist {
  grid-column: 4;
  grid-row: 3;
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
</style>
