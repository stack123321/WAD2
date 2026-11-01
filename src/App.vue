<script setup>
// Nobody needs to edit this file. Add your page in src/views/ and its route in src/router/index.js.
// Pages inside a hangout (06–12, URLs /hangouts/:id/...) also get the step bar (HangoutBar) under
// the navbar, so you can move between steps from any of them.
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import NavBar from '@/components/ui/NavBar.vue'
import HangoutBar from '@/components/hangout/HangoutBar.vue'
import PageDrop from '@/components/ui/PageDrop.vue'
import { useHangoutStore } from '@/stores/hangout'

const route = useRoute()
const store = useHangoutStore()

// Load the hangout whenever we're inside one (the store skips it if it's already loaded)
watch(
  () => route.params.id,
  (id) => {
    if (id) {
      store.load(id)
    }
  },
  { immediate: true },
)

// Only show the bar once this hangout has loaded
const showHangoutBar = computed(() => {
  if (!route.params.id || !store.hangout) {
    return false
  }
  return store.hangout.id === route.params.id
})
</script>

<template>
  <NavBar />
  <HangoutBar
    v-if="showHangoutBar"
    :hangout="store.hangout"
    :members="store.members"
    :current="route.name"
  />
  <!-- each kind of page drops in from above when you go to it -->
  <PageDrop :key="route.name">
    <RouterView />
  </PageDrop>
</template>
