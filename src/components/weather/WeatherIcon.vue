<script setup>
// Owner: Surya. Small weather picture used by the weather cards.
// kind comes from weatherKind() in services/weather.js.
// Colours use Bootstrap's palette variables (--bs-yellow etc.), so no hex codes here.
defineProps({
  kind: {
    type: String,
    default: 'partly',
    validator: (k) => ['sun', 'night', 'partly', 'cloud', 'rain', 'thunder', 'haze'].includes(k),
  },
  size: { type: Number, default: 28 },
  label: { type: String, default: '' }, // e.g. "Partly cloudy", read out by screen readers
})

// One cloud shape, drawn in a 32 × 32 box
const CLOUD = 'M9 26h15a5.5 5.5 0 0 0 0-11 7.5 7.5 0 0 0-14.3-1.8A6.4 6.4 0 0 0 9 26z'
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 32 32"
    :role="label ? 'img' : null"
    :aria-label="label || null"
    :aria-hidden="label ? null : 'true'"
  >
    <circle v-if="kind === 'sun'" class="sun" cx="16" cy="16" r="8" />

    <path v-else-if="kind === 'night'" class="moon" d="M21 5a11 11 0 1 0 7 17A9 9 0 0 1 21 5z" />

    <template v-else-if="kind === 'partly'">
      <circle class="sun" cx="12" cy="11" r="7" />
      <path class="cloud" :d="CLOUD" transform="translate(2 2)" />
    </template>

    <path v-else-if="kind === 'cloud'" class="cloud" :d="CLOUD" />

    <template v-else-if="kind === 'rain'">
      <path class="cloud-dark" :d="CLOUD" transform="translate(0 -4)" />
      <path class="drop" d="M11 25v4M16 25v4M21 25v4" />
    </template>

    <template v-else-if="kind === 'thunder'">
      <path class="cloud-dark" :d="CLOUD" transform="translate(0 -4)" />
      <path class="bolt" d="M17 21l-4 6h4l-2 5 6-7h-4l2-4z" />
    </template>

    <path v-else class="haze" d="M5 11h22M8 16h19M5 21h22M9 26h15" />
  </svg>
</template>

<style scoped>
svg {
  flex-shrink: 0;
}

.sun {
  fill: var(--bs-yellow);
}

.moon {
  fill: var(--bs-gray-500);
}

.cloud {
  fill: var(--bs-gray-300);
}

.cloud-dark {
  fill: var(--bs-gray-500);
}

.drop {
  stroke: var(--bs-blue);
  stroke-width: 2;
  stroke-linecap: round;
}

.bolt {
  fill: var(--bs-yellow);
}

.haze {
  stroke: var(--bs-gray-500);
  stroke-width: 2.4;
  stroke-linecap: round;
}
</style>
