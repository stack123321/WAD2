<script setup>
// 05 Create hangout & invite
// Owner: Matrix · Vet by: Hugo
// Figma frame "05". Replace the placeholder below with the real page.
import PagePlaceholder from '@/components/ui/PagePlaceholder.vue'
</script>

<template>
  <PagePlaceholder
    number="05"
    title="Create hangout & invite"
    owner="Matrix"
    purpose="Name, date/time, vibe, invite link, member list."
    writes="hangouts, my hangout_members row (invite link adds a member row)"
    :next="{ name: 'starting-points', params: { id: 'demo' } }"
    next-label="Create"
  />
</template>
