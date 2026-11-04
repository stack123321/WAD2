<script setup>
// Owner: Eashvar. Tie-break wheel on 11 Group voting: always on the page, greyed out with a lock
// until voting ends in a tie. Then it has one slice per tied spot and a legend naming each slice.
// Only the host gets the "Spin the wheel" button; everyone else is told the host spins it. The
// parent gets the winner (from the database, so everyone sees the same one) and passes it in as
// winnerId; the wheel then turns so that spot's slice stops under the pointer. The result is also
// written out in text for screen readers, and people who turn off motion get no animation.
// Emits spin.
import { computed } from 'vue'
import { joinNames } from '@/utils/joinNames'

const props = defineProps({
  spots: { type: Array, default: () => [] },
  winnerId: { type: String, default: null },
  spinning: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  locked: { type: Boolean, default: false }, // no tie to break: greyed out
  canSpin: { type: Boolean, default: false }, // only the host spins
  hostName: { type: String, default: 'the host' },
})

const emit = defineEmits(['spin'])

const COLOURS = [
  'var(--fp-primary)',
  'var(--fp-accent)',
  'var(--fp-muted)',
  'var(--fp-primary-dark)',
]

function colour(i) {
  return COLOURS[i % COLOURS.length]
}

const sliceAngle = computed(() => 360 / props.spots.length)

const LOCKED_WHEEL =
  'conic-gradient(var(--fp-border) 0deg 120deg, var(--fp-bg) 120deg 240deg, ' +
  'color-mix(in srgb, var(--fp-muted) 25%, var(--fp-surface)) 240deg 360deg)'

const background = computed(() => {
  if (props.locked) return LOCKED_WHEEL
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

// "Hawker and Coffee", or "Hawker, Coffee and Toast"
const tiedNames = computed(() => joinNames(props.spots.map((spot) => spot.name)))
</script>

<template>
  <section class="panel" :class="{ 'is-locked': locked }" aria-labelledby="spin-heading">
    <template v-if="locked">
      <h2 id="spin-heading" class="h6 mb-1">Tie-break wheel</h2>
      <p class="small mb-3">
        Only used if the top spots are tied when voting closes. {{ hostName }} (the host) spins it,
        and everyone watches.
      </p>
    </template>
    <template v-else>
      <h2 id="spin-heading" class="h6 mb-1">It's a tie!</h2>
      <p class="small muted mb-3">
        {{ tiedNames }} have the most votes.
        <template v-if="canSpin">You're the host, so you spin. Everyone sees it spin live.</template>
      </p>
    </template>

    <div class="wheel-wrap" aria-hidden="true">
      <span class="pointer"></span>
      <div class="wheel" :style="{ background, transform: `rotate(${rotation}deg)` }"></div>
    </div>

    <!-- locked: just a lock where the button goes -->
    <p v-if="locked" class="lock mt-3 mb-0">
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
        <rect x="5" y="11" width="14" height="10" rx="2" />
        <path d="M8 11V8a4 4 0 0 1 8 0v3" />
      </svg>
      <span class="visually-hidden">Locked until there's a tie</span>
    </p>

    <template v-else>
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
        v-if="!winner && canSpin"
        type="button"
        class="btn btn-primary w-100 fw-semibold"
        :disabled="disabled || spinning"
        @click="emit('spin')"
      >
        <span v-if="spinning" class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
        Spin the wheel
      </button>
      <p v-else-if="!winner" class="waiting small mb-0">
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
          <rect x="5" y="11" width="14" height="10" rx="2" />
          <path d="M8 11V8a4 4 0 0 1 8 0v3" />
        </svg>
        Only the host can spin. Waiting for {{ hostName }} to spin…
      </p>

      <p class="result mb-0" aria-live="polite">
        <template v-if="decided">
          The wheel picked <strong>{{ winner.name }}</strong
          >!
        </template>
        <template v-else-if="winner">Spinning…</template>
      </p>
    </template>
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
  border: 2px solid var(--fp-accent);
  border-radius: var(--fp-radius);
  box-shadow: var(--fp-shadow);
  padding: 1.25rem;
}

.muted {
  color: var(--fp-muted);
}

/* no tie to break: grey card, grey wheel, a lock */
.panel.is-locked {
  border: 1px solid var(--fp-border);
  background: var(--fp-bg);
  box-shadow: none;
  color: var(--fp-muted);
}

.panel.is-locked .pointer {
  border-top-color: var(--fp-border);
}

.panel.is-locked .wheel {
  box-shadow: none;
}

.lock {
  display: flex;
  justify-content: center;
}

.lock svg,
.waiting svg {
  flex-shrink: 0;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.waiting {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 0.75rem;
  border-radius: var(--fp-radius-sm);
  background: var(--fp-bg);
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

/* people who turn off motion see the wheel jump straight to the winner */
@media (prefers-reduced-motion: reduce) {
  .wheel {
    transition: none;
  }
}
</style>
