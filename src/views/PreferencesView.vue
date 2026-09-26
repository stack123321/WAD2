<script setup>
// 03 User preferences
// Owner: Matrix · Vet by: Hugo
// Figma frame "03". Replace the placeholder below with the real page.
import PagePlaceholder from '@/components/ui/PagePlaceholder.vue'
</script>

<template>
  <PagePlaceholder
    number="03"
    title="User preferences"
    owner="Matrix"
    purpose="Activities, dietary, budget, max travel time, indoor if rain, avoid crowds, step-free."
    reads="profiles"
    writes="profiles"
    :next="{ name: 'dashboard' }"
    next-label="Save and continue"
  />
</template>
