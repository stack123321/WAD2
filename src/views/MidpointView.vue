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
  return {
    name: store.hangout.midpoint_name,
    lat: store.hangout.midpoint_lat,
    lng: store.hangout.midpoint_lng,
  }
})
</script>

<template>
  <main class="container py-4">
    <h1 class="h3 mb-3">Midpoint + crowd heat map</h1>
    <div v-if="midpoint" class="row g-4">
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
  </main>
</template>
