<script setup>
// Owner: Ryan
// crowd heat map for all of singapore, from "crowds right now" on 04 (same map as 08, no midpoint)
import CrowdHeatmap from '@/components/heatmap/CrowdHeatmap.vue'
import PageBand from '@/components/ui/PageBand.vue'
</script>

<template>
  <main>
    <PageBand
      title="Crowds at MRT stations"
      lead="Move the slider to see how busy each station gets today. Tap or hover over a circle for its name."
      :back="{ to: { name: 'dashboard' }, label: 'My hangouts' }"
    />
    <div class="container fp-pull">
      <CrowdHeatmap />
    </div>
  </main>
</template>
