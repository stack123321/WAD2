<script setup>
// Owner: Ryan
// wraps a page or a list, so it fades in and drops down a little from above
// Usage: <PageDrop :key="route.name"><RouterView /></PageDrop>, and in the dashboard <PageDrop :key="tab" :play="toggled">
// the key makes a new one when it changes, and a new one starts invisible and moved up
import { ref, onMounted } from 'vue'

// play="false" shows it straight away, with no drop
const props = defineProps({ play: { type: Boolean, default: true } })

const entered = ref(!props.play)

onMounted(() => {
  if (!props.play) return
  // a moment later, so the browser draws the start first and then moves to the end
  setTimeout(() => {
    entered.value = true
  }, 20)
})
</script>

<template>
  <div class="drop" :class="{ entered: entered }">
    <slot />
  </div>
</template>

<style scoped>
.drop {
  opacity: 0;
  transform: translateY(-24px);
  transition:
    opacity 0.4s,
    transform 0.4s;
}

/* transform: none, not translateY(0), so modals inside a page can still sit on the whole screen */
.drop.entered {
  opacity: 1;
  transform: none;
}
</style>
