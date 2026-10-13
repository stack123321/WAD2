<script setup>
// 08 Midpoint + crowd heat map
// Owner: Ryan (heat map) + Surya (weather card) · Vet by: Eashvar
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useHangoutStore } from '@/stores/hangout'
import CrowdHeatmap from '@/components/heatmap/CrowdHeatmap.vue'
import WeatherCard from '@/components/weather/WeatherCard.vue'

const route = useRoute()
const store = useHangoutStore()

onMounted(() => store.load(route.params.id))

const midpoint = computed(() => {
  if (!store.hangout) return null
  // No midpoint until page 07 has worked it out (Singapore's latitude is never 0)
  if (!store.hangout.midpoint_lat) return null
  return {
    name: store.hangout.midpoint_name,
    lat: store.hangout.midpoint_lat,
    lng: store.hangout.midpoint_lng,
  }
})
</script>

<template>
  <div
    v-if="store.loading"
    class="d-flex align-items-center gap-2 text-secondary p-5"
    role="status"
  >
    <span class="spinner-border spinner-border-sm" aria-hidden="true"></span>
    Loading hangout…
  </div>

  <div v-else-if="store.error" class="container py-5">
    <div class="alert alert-danger" role="alert">
      Couldn't load this hangout. Check the link, or go back to
      <RouterLink :to="{ name: 'dashboard' }">My hangouts</RouterLink>.
    </div>
  </div>

  <div v-else-if="store.hangout">
    <!-- The step bar comes from App.vue, which adds it to every hangout page -->
    <main class="container py-4">
      <h1 class="h3 mb-3">Midpoint + crowd heat map</h1>

      <template v-if="midpoint">
        <div class="row g-4">
          <div class="col-lg-8">
            <CrowdHeatmap :midpoint="midpoint" />
          </div>
          <div class="col-lg-4">
            <WeatherCard
              :lat="midpoint.lat"
              :lng="midpoint.lng"
              :place="midpoint.name"
              :at="store.hangout.starts_at"
            />
          </div>
        </div>
        <router-link
          :to="{ name: 'explore', params: { id: route.params.id } }"
          class="btn btn-primary mt-3"
        >
          See nearby spots
        </router-link>
      </template>

      <!-- Reached from the step bar before page 07 has found the midpoint -->
      <div v-else class="alert alert-info" role="status">
        <p class="mb-2">
          No midpoint yet. Fairpoint finds it once everyone has picked how they're travelling.
        </p>
        <router-link
          :to="{ name: 'transport', params: { id: route.params.id } }"
          class="btn btn-primary btn-sm"
        >
          Go to transport →
        </router-link>
      </div>
    </main>
  </div>
</template>
