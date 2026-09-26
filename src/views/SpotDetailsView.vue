<script setup>
// 10 Spot details
// Owner: Hugo · Vet by: Matrix
// Figma frame "10". Replace the placeholder below with the real page.
import { useRoute } from 'vue-router'
import PagePlaceholder from '@/components/ui/PagePlaceholder.vue'

const route = useRoute()
</script>

<template>
  <PagePlaceholder
    number="10"
    title="Spot details"
    owner="Hugo"
    purpose="Why it fits, hours, crowd forecast chart, weather, travel time per friend."
    reads="one shortlist row + live place data"
    :next="{ name: 'vote', params: { id: route.params.id } }"
    next-label="Go to vote"
  />
</template>
