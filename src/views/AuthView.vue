<script setup>
// 02 Log in / Sign up
// Owner: Matrix · Vet by: Hugo
// Figma frame "02". Replace the placeholder below with the real page.
import PagePlaceholder from '@/components/ui/PagePlaceholder.vue'
</script>

<template>
  <PagePlaceholder
    number="02"
    title="Log in / Sign up"
    owner="Matrix"
    purpose="Supabase Auth: email + password (Google sign-in if agreed). Invited friends land here from an invite link."
    writes="profiles (new row)"
    :next="{ name: 'preferences' }"
    next-label="Continue"
  />
</template>
