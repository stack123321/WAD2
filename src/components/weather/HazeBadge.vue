<script setup>
// Owner: Surya. "Haze · PSI 184 Unhealthy" pill, coloured by level. Used inside the weather cards.
// haze = the object from getHaze() in services/weather.js.
defineProps({
  haze: { type: Object, required: true }, // { region, psi, level, tone }
})
</script>

<template>
  <span
    class="haze-badge"
    :class="haze.tone"
    :title="`24-hour PSI in the ${haze.region} region (NEA)`"
  >
    <span class="dot" aria-hidden="true"></span>
    Haze · PSI {{ haze.psi }} {{ haze.level }}
  </span>
</template>

<style scoped>
.haze-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  border-radius: 999px;
  padding: 0.25rem 0.75rem;
  font-size: 0.8rem;
  font-weight: 500;
  white-space: nowrap;
}

.dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: currentColor;
}

.good {
  color: var(--fp-primary);
  background: color-mix(in srgb, var(--fp-primary) 12%, var(--fp-surface));
}

.moderate {
  color: color-mix(in srgb, var(--bs-yellow) 60%, var(--fp-ink));
  background: color-mix(in srgb, var(--bs-yellow) 18%, var(--fp-surface));
}

.bad {
  color: var(--bs-danger);
  background: color-mix(in srgb, var(--bs-danger) 12%, var(--fp-surface));
}
</style>
