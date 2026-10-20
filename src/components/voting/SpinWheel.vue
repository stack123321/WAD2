<script setup>
// Owner: Eashvar. Tie-break wheel on 11 Group voting: one slice per tied spot, a legend naming each
// slice, and a "Spin the wheel" button. The parent gets the winner (from the database, so everyone
// sees the same one) and passes it in as winnerId; the wheel then turns so that spot's slice stops
// under the pointer. The result is also written out in text for screen readers, and people who
// turn off motion get no animation. Emits spin.
import { computed } from 'vue'

const props = defineProps({
  spots: { type: Array, required: true },
  winnerId: { type: String, default: null },
  spinning: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  planTo: { type: Object, required: true },
})

const emit = defineEmits(['spin'])

const COLOURS = [
  'var(--fp-primary)',
  'var(--fp-ink)',
  'var(--fp-pill)',
  'var(--fp-accent)',
  'var(--fp-primary-dark)',
]

function colour(i) {
  return COLOURS[i % COLOURS.length]
}

const sliceAngle = computed(() => 360 / props.spots.length)

const background = computed(() => {
  const slices = props.spots.map(
    (spot, i) => `${colour(i)} ${i * sliceAngle.value}deg ${(i + 1) * sliceAngle.value}deg`,
  )
  return `conic-gradient(${slices.join(', ')})`
})

const rotation = computed(() => {
  const i = props.spots.findIndex((spot) => spot.id === props.winnerId)
  if (i === -1) return 0
  return 5 * 360 - (i + 0.5) * sliceAngle.value
})

const winner = computed(() => props.spots.find((spot) => spot.id === props.winnerId) ?? null)
const decided = computed(() => winner.value !== null && !props.spinning)
</script>

<template>
  <section class="panel" aria-labelledby="spin-heading">
    <h2 id="spin-heading" class="h6 mb-1">It's a tie!</h2>
    <p class="small muted mb-3">
      {{ spots.length }} spots have the most votes. Spin the wheel to pick one. Anyone in the group
      can spin, and everyone gets the same result.
    </p>

    <div class="wheel-wrap" aria-hidden="true">
      <span class="pointer"></span>
      <div class="wheel" :style="{ background, transform: `rotate(${rotation}deg)` }"></div>
    </div>

    <ul class="list-unstyled small my-3">
      <li
        v-for="(spot, i) in spots"
        :key="spot.id"
        class="d-flex align-items-center gap-2 mb-1"
        :class="{ 'fw-bold': decided && spot.id === winnerId }"
      >
        <span class="swatch" :style="{ background: colour(i) }" aria-hidden="true"></span>
        {{ spot.name }}
      </li>
    </ul>

    <button
      v-if="!winner"
      type="button"
      class="btn btn-primary w-100 fw-semibold"
      :disabled="disabled || spinning"
      @click="emit('spin')"
    >
      <span v-if="spinning" class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
      Spin the wheel
    </button>

    <p class="result mb-0" aria-live="polite">
      <template v-if="decided">
        The wheel picked <strong>{{ winner.name }}</strong
        >!
      </template>
      <template v-else-if="winner">Spinning…</template>
    </p>
    <RouterLink v-if="decided" class="btn btn-primary w-100 fw-semibold mt-3" :to="planTo">
      See the final plan
    </RouterLink>
  </section>
</template>

<style scoped>
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  min-height: 44px;
}

.panel {
  background: var(--fp-surface);
  border: 2px solid var(--fp-primary);
  border-radius: var(--fp-radius);
  padding: 1.6rem;
}

.muted {
  color: var(--fp-muted);
}

.wheel-wrap {
  position: relative;
  width: 11rem;
  height: 11rem;
  margin: 0 auto;
}

.wheel {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 4px solid var(--fp-surface);
  box-shadow: var(--fp-shadow);
  transition: transform 3s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.pointer {
  position: absolute;
  top: -0.4rem;
  left: 50%;
  z-index: 1;
  transform: translateX(-50%);
  border-left: 0.6rem solid transparent;
  border-right: 0.6rem solid transparent;
  border-top: 1rem solid var(--fp-ink);
}

.swatch {
  width: 0.9rem;
  height: 0.9rem;
  border-radius: 50%;
  flex-shrink: 0;
}

.result {
  min-height: 1.5rem;
  text-align: center;
}

@media (prefers-reduced-motion: reduce) {
  .wheel {
    transition: none;
  }
}
</style>
