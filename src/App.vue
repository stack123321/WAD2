<script setup>
// Nobody needs to edit this file. Add your page in src/views/ and its route in src/router/index.js.
// Pages inside a hangout (06–12, URLs /hangouts/:id/...) also get the step bar (HangoutBar) under
// the navbar, so you can move between steps from any of them.
import { computed, watch, watchEffect } from 'vue'
import { useRoute } from 'vue-router'
import NavBar from '@/components/ui/NavBar.vue'
import HangoutBar from '@/components/hangout/HangoutBar.vue'
import PageDrop from '@/components/ui/PageDrop.vue'
import ChatPopover from '@/components/chat/ChatPopover.vue'
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

// (Surya) How far down the screen the two bars reach, so panels that stay on screen while you
// scroll (and the jump to the photos) stop just below them instead of hiding under them
watchEffect(() => {
  const top = showHangoutBar.value ? '9rem' : '5rem'
  document.documentElement.style.setProperty('--fp-sticky-top', top)
})
</script>

<template>
  <!-- (Surya) the navbar and the step bar stay at the top of the screen while the page scrolls -->
  <div class="top-bars">
    <NavBar />
    <HangoutBar
      v-if="showHangoutBar"
      :hangout="store.hangout"
      :members="store.members"
      :current="route.name"
    />
  </div>
  <!-- (Ryan) the group chat on top of the page, opened by 💬 in the step bar. It sits outside
       .top-bars so it can cover the phone tab bar when it fills the screen -->
  <ChatPopover
    v-if="showHangoutBar && store.chatOpen"
    :hangout="store.hangout"
    @close="store.chatOpen = false"
  />
  <!-- each kind of page drops in from above when you go to it -->
  <PageDrop :key="route.name">
    <RouterView />
  </PageDrop>
</template>

<style scoped>
.top-bars {
  position: sticky;
  top: 0;
  z-index: 1020; /* above the page, below the phone tab bar and pop-ups */
}
</style>
