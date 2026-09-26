<script setup>
// 11 Group voting
// Owner: Eashvar · Vet by: Ryan
// Figma frame "11". Replace the placeholder below with the real page.
import { useRoute } from 'vue-router'
import PagePlaceholder from '@/components/ui/PagePlaceholder.vue'

const route = useRoute()
</script>

<template>
  <PagePlaceholder
    number="11"
    title="Group voting"
    owner="Eashvar"
    purpose="Candidates with live tallies (Supabase Realtime), deadline, activity feed, host closes the vote."
    reads="shortlist, votes (realtime)"
    writes="my vote; host sets status + final spot"
    :next="{ name: 'final-plan', params: { id: route.params.id } }"
    next-label="Close vote"
  />
</template>
