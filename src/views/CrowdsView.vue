<script setup>
// Crowds
// Owner: Ryan
// crowd heat map for all of singapore (same map as 08, no midpoint), reached only by typing /crowds
import CrowdHeatmap from '@/components/heatmap/CrowdHeatmap.vue'
</script>

<template>
  <main class="container py-4">
    <RouterLink :to="{ name: 'dashboard' }" class="small">← My hangouts</RouterLink>
    <h1 class="page-title mt-2 mb-1">Crowds at MRT stations</h1>
    <p class="text-muted mb-3">
      Move the slider to see how busy each station gets today. Tap or hover over a circle for its
      name.
    </p>
    <CrowdHeatmap />
  </main>
</template>
