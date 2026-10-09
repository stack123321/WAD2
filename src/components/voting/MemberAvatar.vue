<script setup>
// Owner: Eashvar. A member's initial in a circle of their avatar_color (grey if they have none),
// sized in px. Used on 11 Group voting's cards, waiting row and feed. Decorative only: the parent
// always writes the person's name in text as well.
import { computed } from 'vue'

const props = defineProps({
  name: { type: String, required: true },
  color: { type: String, default: null },
  size: { type: Number, default: 24 },
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

.avatar--plain {
  background: var(--fp-muted);
}
</style>
