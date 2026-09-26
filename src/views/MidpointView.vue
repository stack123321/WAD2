<script setup>
// 08 Midpoint + crowd heat map
// Owner: Ryan (heat map) + Surya (weather card) · Vet by: Eashvar
// Figma frame "08". Replace the placeholder below with the real page.
import { useRoute } from 'vue-router'
import PagePlaceholder from '@/components/ui/PagePlaceholder.vue'

const route = useRoute()
</script>

<template>
  <PagePlaceholder
    number="08"
    title="Midpoint + crowd heat map"
    owner="Ryan (heat map) + Surya (weather card)"
    purpose="Fair midpoint, alternative areas, crowd heat map with time slider, 2-hour forecast."
    reads="hangouts midpoint (crowd and weather fetched live)"
    :next="{ name: 'explore', params: { id: route.params.id } }"
    next-label="See nearby spots"
  />
</template>
