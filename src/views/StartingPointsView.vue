<script setup>
// 06 Starting points
// Owner: Surya · Vet by: Nicole
// Figma frame "06". Replace the placeholder below with the real page.
import { useRoute } from 'vue-router'
import PagePlaceholder from '@/components/ui/PagePlaceholder.vue'

const route = useRoute()
</script>

<template>
  <PagePlaceholder
    number="06"
    title="Starting points"
    owner="Surya"
    purpose="Address / MRT / postal search with OneMap autocomplete; member pins on the shared map."
    reads="hangout_members"
    writes="my start_label, start_lat, start_lng"
    :next="{ name: 'transport', params: { id: route.params.id } }"
  />
</template>
