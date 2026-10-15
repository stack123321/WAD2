<script setup>
// 10 Spot details
// Owner: Hugo · Vet by: Matrix
// Figma frame "10". Layout is done; sections hold placeholder content until wired to live data.
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import BaseMap from '@/components/map/BaseMap.vue'
import GooglePlacesToggle from '@/components/ui/GooglePlacesToggle.vue'
import { googlePlacesEnabled, loadSpot } from '@/services/places'

const route = useRoute()

const categoryLabels = {
  cafe: 'Cafe',
  activity: 'Activity',
  food: 'Restaurant',
  outdoor: 'Outdoors',
}

const spot = ref(null)
const spotError = ref('')
watch(
  () => [route.params.spotId, googlePlacesEnabled.value],
  async ([id, enabled], _, onCleanup) => {
    spot.value = null
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
        <button type="button" class="btn btn-primary btn-sm">Add to Vote</button>
      </div>
    </section>

    <section class="spot__criteria card-box">
      <h2 class="h6">Criteria</h2>
      <p class="text-secondary mb-0">Why it fits the group.</p>
    </section>

    <section class="spot__crowd card-box">
      <h2 class="h6">Crowd</h2>
      <p class="text-secondary mb-0">Crowd forecast chart.</p>
    </section>

    <section class="spot__traveltime card-box">
      <h2 class="h6">Travel time</h2>
      <p class="text-secondary mb-0">Travel time per friend.</p>
    </section>

    <section class="spot__about card-box">
      <h2 class="h6">About</h2>
      <p v-if="spot?.description || spot?.address" class="text-secondary mb-0">
        {{ spot.description }}
        <span v-if="spot.address" class="d-block">{{ spot.address }}</span>
        <span v-if="spot.openNow !== null" class="d-block">{{ spot.openNow ? 'Open now' : 'Closed now' }}</span>
      </p>
      <p v-else class="text-secondary mb-0">Description and details.</p>
    </section>

    <section class="spot__weather card-box">
      <h2 class="h6">Weather</h2>
      <p class="text-secondary mb-0">Forecast for the hangout time.</p>
    </section>

    <div class="spot__space"></div>
  </main>
</template>

<style scoped>
.spot {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-areas:
    'nav nav nav'
    'preview preview preview'
    'info info info'
    'criteria crowd traveltime'
    'about weather space';
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
.spot__crowd {
  grid-area: crowd;
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
