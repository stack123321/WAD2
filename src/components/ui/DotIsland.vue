<script setup>
// Owner: Eashvar (design catalogue A1). The island of Singapore drawn in dots, for the background of
// PageBand and the landing page. A few dots light up coral in turn, like people setting off from
// all over. Decorative only (aria-hidden); the outline is rough (26 points), not a map.
// Usage: <DotIsland class="..." /> (size and place it with CSS; it keeps its 2:1 shape)
const OUTLINE = [
  [103.605, 1.325],
  [103.64, 1.36],
  [103.67, 1.4],
  [103.7, 1.43],
  [103.73, 1.445],
  [103.77, 1.455],
  [103.8, 1.465],
  [103.83, 1.47],
  [103.86, 1.45],
  [103.88, 1.43],
  [103.91, 1.42],
  [103.95, 1.4],
  [103.99, 1.39],
  [104.03, 1.37],
  [104.02, 1.33],
  [103.98, 1.32],
  [103.93, 1.305],
  [103.88, 1.295],
  [103.86, 1.275],
  [103.83, 1.265],
  [103.8, 1.27],
  [103.76, 1.285],
  [103.72, 1.3],
  [103.68, 1.3],
  [103.64, 1.305],
  [103.605, 1.31],
]
const LNG = [103.58, 104.06]
const LAT = [1.24, 1.49]
const STEP = 0.0062

// true if [lng, lat] is inside the outline (ray casting)
function inside(lng, lat) {
  let hit = false
  for (let i = 0, j = OUTLINE.length - 1; i < OUTLINE.length; j = i++) {
    const [xi, yi] = OUTLINE[i]
    const [xj, yj] = OUTLINE[j]
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) hit = !hit
  }
  return hit
}

// worked out once: a dot every STEP degrees inside the island, about one in 28 lit
const dots = []
for (let lat = LAT[0]; lat <= LAT[1]; lat += STEP) {
  for (let lng = LNG[0]; lng <= LNG[1]; lng += STEP) {
    if (!inside(lng, lat)) continue
    const n = dots.length + 1
    dots.push({
      x: (((lng - LNG[0]) / (LNG[1] - LNG[0])) * 1000).toFixed(1),
      y: (((LAT[1] - lat) / (LAT[1] - LAT[0])) * 500).toFixed(1),
      lit: n % 28 === 0,
      delay: `${((n * 37) % 48) / 10}s`,
    })
  }
}
</script>

<template>
  <svg class="dot-island" viewBox="0 0 1000 500" aria-hidden="true" focusable="false">
    <circle
      v-for="(d, i) in dots"
      :key="i"
      :cx="d.x"
      :cy="d.y"
      :r="d.lit ? 3.2 : 2.6"
      :class="{ lit: d.lit }"
      :style="d.lit ? { animationDelay: d.delay } : null"
    />
  </svg>
</template>

<style scoped>
.dot-island circle {
  fill: #fff;
  opacity: 0.16;
}

.dot-island circle.lit {
  fill: var(--fp-accent);
  opacity: 0;
  animation: twinkle 4.8s ease-in-out infinite;
}

@keyframes twinkle {
  0%,
  100% {
    opacity: 0;
  }
  45%,
  55% {
    opacity: 0.95;
  }
}

@media (prefers-reduced-motion: reduce) {
  .dot-island circle.lit {
    animation: none;
    opacity: 0.6;
  }
}
</style>
