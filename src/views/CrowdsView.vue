<script setup>
// Crowd heat map for the whole of Singapore, opened from "Crowds right now" on 04 Dashboard.
// Owner: Ryan. Same map as page 08, but with no midpoint because there's no hangout here.
import CrowdHeatmap from '@/components/heatmap/CrowdHeatmap.vue'
</script>

<template>
  <main class="container py-4">
    <router-link :to="{ name: 'dashboard' }" class="small">← My hangouts</router-link>
    <h1 class="h3 mt-2 mb-1">Crowds at MRT stations</h1>
    <p class="text-muted mb-3">
      Move the slider to see how busy each station gets today. Tap or hover over a circle for its
      name.
    </p>
    <CrowdHeatmap />
  </main>
</template>
