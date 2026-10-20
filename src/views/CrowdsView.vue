<script setup>
// Owner: Ryan
// crowd heat map for all of singapore, from "crowds right now" on 04 (same map as 08, no midpoint)
import CrowdHeatmap from '@/components/heatmap/CrowdHeatmap.vue'
</script>

<template>
  <main class="container py-4">
    <router-link :to="{ name: 'dashboard' }" class="small">← My hangouts</router-link>
    <h1 class="mt-2 mb-3">Crowds at MRT stations.</h1>
    <p class="text-muted mb-3">
      Move the slider to see how busy each station gets today. Tap or hover over a circle for its
      name.
    </p>
    <CrowdHeatmap />
  </main>
</template>
