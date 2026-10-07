<script setup>
// Owner: Eashvar. A member's initial in a coloured circle (11 Group voting cards, waiting row, feed).
// Decorative only: the parent always writes the person's name in text as well.
import { computed } from 'vue'

const props = defineProps({
  name: { type: String, required: true },
  color: { type: String, default: null }, // the member's avatar_color from their profile
  size: { type: Number, default: 24 }, // px
})

const initial = computed(() => props.name.charAt(0).toUpperCase())
</script>

<template>
  <span
    class="avatar"
    :class="{ 'avatar--plain': !color }"
    :style="{
      width: size + 'px',
      height: size + 'px',
      fontSize: size * 0.45 + 'px',
      backgroundColor: color,
    }"
    :title="name"
    aria-hidden="true"
    >{{ initial }}</span
  >
</template>

<style scoped>
.avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: 50%;
  border: 2px solid var(--fp-surface);
  color: var(--fp-surface);
  font-weight: 700;
  line-height: 1;
}

/* No colour saved on the profile yet */
.avatar--plain {
  background: var(--fp-muted);
}
</style>
