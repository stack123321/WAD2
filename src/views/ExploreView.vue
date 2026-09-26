<script setup>
// 09 Nearby cafes & activities
// Owner: Hugo · Vet by: Matrix
// Figma frame "09". Replace the placeholder below with the real page.
import { useRoute } from 'vue-router'
import PagePlaceholder from '@/components/ui/PagePlaceholder.vue'

const route = useRoute()
</script>

<template>
  <PagePlaceholder
    number="09"
    title="Nearby cafes & activities"
    owner="Hugo"
    purpose="Filterable spot cards with match %, crowd level, add to vote shortlist."
    reads="midpoint, members' profiles"
    writes="shortlist"
    :next="{ name: 'spot-details', params: { id: route.params.id, spotId: 'demo-spot-1' } }"
    next-label="Open a spot"
  />
</template>
