<script setup>
// 01 Landing
// Owner: Matrix · Vet by: Hugo
// Figma frame "01". Replace the placeholder below with the real page.
import PagePlaceholder from '@/components/ui/PagePlaceholder.vue'
</script>

<template>
  <PagePlaceholder
    number="01"
    title="Landing"
    owner="Matrix"
    purpose="Value prop, hero map preview, call to action to sign up."
    :next="{ name: 'auth', query: { mode: 'signup' } }"
    next-label="Sign up"
  />
</template>
