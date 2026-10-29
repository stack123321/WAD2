<script setup>
// 10 Spot details
// Owner: Hugo · Vet by: Matrix
// Figma frame "10". Layout is done; sections hold placeholder content until wired to live data.
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import BaseMap from '@/components/map/BaseMap.vue'
import GooglePlacesToggle from '@/components/ui/GooglePlacesToggle.vue'
import WeatherCard from '@/components/weather/WeatherCard.vue'
import { googlePlacesEnabled, loadSpot, loadSpotSummary } from '@/services/places'
import { useHangoutStore } from '@/stores/hangout'
import { useShortlist } from '@/composables/useShortlist'
import { matchScore, matchReasons } from '@/utils/matchScore'
import { willRainAt } from '@/services/weather'

const route = useRoute()
const hangout = useHangoutStore()
hangout.load(route.params.id)
const { error: shortlistError, isAdded, isMine, addSpot, removeSpot } = useShortlist(
  () => route.params.id,
)

const categoryLabels = {
  cafe: 'Cafe',
  activity: 'Activity',
  food: 'Restaurant',
  outdoor: 'Outdoors',
  shopping: 'Shopping',
}

const spot = ref(null)
const spotError = ref('')
const summary = ref(null)
const summaryLoading = ref(false)
watch(
  () => [route.params.spotId, googlePlacesEnabled.value],
  async ([id, enabled], _, onCleanup) => {
    spot.value = null
    summary.value = null
    summaryLoading.value = false
    spotError.value = ''
    if (!enabled) {
      spotError.value = 'Google Places is off. Turn it on to load spot details.'
      return
    }

    const controller = new AbortController()
    onCleanup(() => controller.abort())
    try {
      spot.value = await loadSpot(String(id), { signal: controller.signal })
    } catch (error) {
      if (!controller.signal.aborted) {
        spotError.value = `Could not load this spot: ${error.message}`
      }
      return
    }

    summaryLoading.value = true
    try {
      summary.value = await loadSpotSummary(String(id), { signal: controller.signal })
    } catch {
      // the About section falls back to Google's editorial description
    } finally {
      if (!controller.signal.aborted) summaryLoading.value = false
    }
  },
  { immediate: true },
)

const price = computed(() => {
  const level = spot.value?.priceLevel
  if (level === undefined || level === null) return null
  return level === 0 ? 'Free' : '$'.repeat(level)
})

const distance = computed(() => {
  const m = spot.value?.stationDistanceM
  if (m === undefined || m === null) return null
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${m} m`
})

// Rain forecast for the hangout's start time near the midpoint, for matchScore's weather veto.
const raining = ref(false)
watch(
  () => [
    hangout.hangout?.midpoint_lat,
    hangout.hangout?.midpoint_lng,
    hangout.hangout?.starts_at,
  ],
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

const matchContext = computed(() => ({
  vibes: hangout.hangout?.vibe,
  startAt: hangout.hangout?.starts_at,
  raining: raining.value,
  midpoint:
    hangout.hangout?.midpoint_lat != null && hangout.hangout?.midpoint_lng != null
      ? { lat: hangout.hangout.midpoint_lat, lng: hangout.hangout.midpoint_lng }
      : null,
}))

// This spot's group match % and the reasons behind it (src/utils/matchScore.js), for the
// "Criteria" section below.
const matchPct = computed(() =>
  spot.value ? matchScore(spot.value, hangout.members, matchContext.value) : null,
)
const matchTone = computed(() => {
  if (matchPct.value === null) return null
  if (matchPct.value >= 70) return 'good'
  if (matchPct.value >= 40) return 'ok'
  return 'poor'
})
const reasons = computed(() =>
  spot.value ? matchReasons(spot.value, hangout.members, matchContext.value) : [],
)
</script>

<template>
  <main class="container spot">
    <header class="spot__nav">
      <RouterLink
        class="btn btn-outline-primary btn-sm d-inline-flex align-items-center gap-2"
        :to="{ name: 'explore', params: { id: route.params.id } }"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
        Back to exploring
      </RouterLink>
      <GooglePlacesToggle />
    </header>

    <p v-if="spotError" class="spot__error text-secondary" role="status">{{ spotError }}</p>

    <section class="spot__preview card-box">
      <div v-if="googlePlacesEnabled && spot?.imageUrl" class="preview-image">
        <img :src="spot.imageUrl" :alt="spot.name" />
      </div>
      <BaseMap
        v-else-if="spot"
        class="preview-map"
        :center="[spot.lat, spot.lng]"
        :markers="[{ id: spot.id, lat: spot.lat, lng: spot.lng, label: spot.name }]"
      />
      <div v-else class="preview-placeholder">Photo / map preview</div>
    </section>

    <section class="spot__info d-flex flex-wrap justify-content-between align-items-center gap-3">
      <div>
        <h1 class="h3 mb-1">{{ spot?.name ?? 'Spot not found' }}</h1>
        <div v-if="spot" class="d-flex flex-wrap align-items-center column-gap-3">
          <p class="text-secondary mb-0">{{ categoryLabels[spot.category] ?? spot.category }}</p>
          <p v-if="spot.rating !== null" class="mb-0">&#9733; {{ spot.rating.toFixed(1) }} · {{ spot.reviewCount }} reviews</p>
          <p v-if="price" class="text-secondary mb-0">{{ price }}</p>
          <p v-if="distance" class="text-secondary mb-0">{{ distance }} from nearest MRT station</p>
        </div>
      </div>
      <div class="d-flex flex-wrap gap-2">
        <a
          v-if="spot?.googleMapsUri"
          class="btn btn-outline-primary btn-sm"
          :href="spot.googleMapsUri"
          target="_blank"
          rel="noopener"
        >
          Open Google Maps
        </a>
        <template v-if="spot">
          <button
            v-if="isAdded(spot.id) && isMine(spot.id)"
            type="button"
            class="btn btn-outline-danger btn-sm"
            @click="removeSpot(spot)"
          >
            Remove from Vote
          </button>
          <button
            v-else
            type="button"
            class="btn btn-sm"
            :class="isAdded(spot.id) ? 'btn-outline-primary' : 'btn-primary'"
            :disabled="isAdded(spot.id)"
            @click="addSpot(spot)"
          >
            {{ isAdded(spot.id) ? 'Added to vote' : 'Add to Vote' }}
          </button>
        </template>
      </div>
    </section>
    <p v-if="shortlistError" class="spot__error text-danger">{{ shortlistError }}</p>

    <section class="spot__about card-box">
      <h2 class="h6">About</h2>
      
      <p v-if="spot?.description && !summary" class="text-secondary mb-2">{{ spot.description }}</p>
      <p v-if="spot?.address || spot?.openNow != null" class="text-secondary mb-0">
        <span v-if="spot.address" class="d-block">{{ spot.address }}</span>
        <span v-if="spot.openNow !== null" class="d-block">{{ spot.openNow ? 'Open now' : 'Closed now' }}</span>
      </p>
      <p v-if="summaryLoading" class="text-secondary mb-2" role="status">Summarising this spot…</p>
      <template v-else-if="summary">
        <p class="mb-1">{{ summary.text }}</p>
        <p class="text-secondary small mb-2">{{ summary.disclosure }}</p>
      </template>
      <p v-if="!spot" class="text-secondary mb-0">Description and details.</p>
    </section>


    <section class="spot__traveltime card-box">
      <h2 class="h6">Travel time</h2>
      <p class="text-secondary mb-0">Travel time per friend.</p>
    </section>

    
    <section class="spot__criteria card-box">
      <div class="d-flex align-items-center justify-content-between gap-2">
        <h2 class="h6 mb-0">Criteria</h2>
        <span
          v-if="matchPct !== null"
          class="criteria__score"
          :class="`criteria__score--${matchTone}`"
        >
          {{ matchPct }}% match
        </span>
      </div>
      <p v-if="!spot" class="text-secondary mb-0">Why it fits the group.</p>
      <p v-else-if="!reasons.length" class="text-secondary mb-0">
        Add members with preferences to see why this spot fits (or doesn't).
      </p>
      <ul v-else class="criteria__list">
        <li
          v-for="(reason, i) in reasons"
          :key="i"
          class="criteria__item"
          :class="`criteria__item--${reason.tone}`"
        >
          {{ reason.text }}
        </li>
      </ul>
    </section>

    <section class="spot__weather card-box">
      <h2 class="h6">Weather</h2>
      <WeatherCard
        v-if="spot"
        :lat="spot.lat"
        :lng="spot.lng"
        :place="spot.name"
        :at="hangout.hangout?.starts_at ?? null"
      />
      <p v-else class="text-secondary mb-0">Forecast for the hangout time.</p>
    </section>

    <div class="spot__space"></div>
  </main>
</template>

<style scoped>
.spot {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  grid-template-areas:
    'nav nav'
    'preview preview'
    'info info'
    'about traveltime'
    'criteria weather';
  gap: 1rem;
  padding-block: 1.5rem;
}

.spot__nav {
  grid-area: nav;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.spot__info {
  grid-area: info;
}
.spot__preview {
  grid-area: preview;
}
.spot__criteria {
  grid-area: criteria;
}

.spot__traveltime {
  grid-area: traveltime;
}
.spot__about {
  grid-area: about;
}
.spot__weather {
  grid-area: weather;
}
.spot__space {
  grid-area: space;
}

.card-box {
  background: var(--fp-surface);
  border: 1px solid var(--fp-border);
  border-radius: var(--fp-radius);
  box-shadow: var(--fp-shadow);
  padding: 1.25rem;
}

.criteria__score {
  flex-shrink: 0;
  padding: 0.125rem 0.625rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
}

.criteria__score--good {
  background: #e3f6ec;
  color: #0e7c3f;
}

.criteria__score--ok {
  background: #fdf2d7;
  color: #a16207;
}

.criteria__score--poor {
  background: #fbe4e4;
  color: #b42318;
}

.criteria__list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin: 0.75rem 0 0;
  padding: 0;
  list-style: none;
}

.criteria__item {
  position: relative;
  padding-left: 1.1rem;
  font-size: 0.875rem;
}

.criteria__item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0.4em;
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
}

.criteria__item--good::before {
  background: #0e7c3f;
}

.criteria__item--warn::before {
  background: #a16207;
}

.criteria__item--bad::before {
  background: #b42318;
}

.criteria__item--neutral::before {
  background: var(--fp-muted);
}

.preview-image img {
  display: block;
  width: 100%;
  max-height: 360px;
  object-fit: cover;
  border-radius: var(--fp-radius-sm);
}

.preview-map {
  height: 360px;
}

.preview-placeholder {
  display: grid;
  place-items: center;
  min-height: 240px;
  border-radius: var(--fp-radius-sm);
  background: var(--fp-bg);
  color: var(--fp-muted);
}

@media (max-width: 768px) {
  .spot {
    grid-template-columns: 1fr;
    grid-template-areas:
      'nav'
      'preview'
      'info'
      'criteria'
      'crowd'
      'traveltime'
      'about'
      'weather'
      'space';
  }
}
</style>
