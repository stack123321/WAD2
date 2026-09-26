<script setup>
// 07 Mode of transport
// Owner: Nicole · Vet by: Surya
// Figma frame "07". Replace the placeholder below with the real page.
import { useRoute } from 'vue-router'
import PagePlaceholder from '@/components/ui/PagePlaceholder.vue'

const route = useRoute()
</script>

<template>
  <PagePlaceholder
    number="07"
    title="Mode of transport"
    owner="Nicole"
    purpose="Per-person mode (MRT/Bus/Car/Walk), optimise for fairest/fastest/cheapest, travel-time comparison, fair-midpoint algorithm."
    reads="hangout_members"
    writes="mode, travel_mins, travel_cost on members; midpoint columns on hangouts"
    :next="{ name: 'midpoint', params: { id: route.params.id } }"
    next-label="Find midpoint"
  />
</template>
