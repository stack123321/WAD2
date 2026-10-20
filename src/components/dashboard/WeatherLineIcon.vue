<script setup>
// Owner: Ryan
// 14px line icon for the weather line on a hangout card, kind comes from weatherKind() in services/weather.js
defineProps({
  kind: {
    type: String,
    default: 'cloud',
    validator: (k) => ['sun', 'night', 'partly', 'cloud', 'rain', 'thunder', 'haze'].includes(k),
  },
  size: { type: Number, default: 14 },
})
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.7"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <template v-if="kind === 'sun'">
      <circle cx="12" cy="12" r="4" />
      <path
        d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4"
      />
    </template>
    <path v-else-if="kind === 'night'" d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z" />
    <template v-else-if="kind === 'partly'">
      <circle cx="8" cy="8" r="3" />
      <path d="M8 2v1.5M2 8h1.5M3.8 3.8l1 1M12.2 3.8l-1 1" />
      <path d="M9 20h8.5a3.5 3.5 0 0 0 .5-6.96A4.8 4.8 0 0 0 9.2 14 3 3 0 0 0 9 20z" />
    </template>
    <template v-else-if="kind === 'rain'">
      <path d="M7 15h9.5a4 4 0 0 0 .6-7.96A5.5 5.5 0 0 0 6.4 8 3.5 3.5 0 0 0 7 15z" />
      <path d="M8 18.5v1.5M12 18.5v1.5M16 18.5v1.5" />
    </template>
    <template v-else-if="kind === 'thunder'">
      <path d="M7 14h9.5a4 4 0 0 0 .6-7.96A5.5 5.5 0 0 0 6.4 7 3.5 3.5 0 0 0 7 14z" />
      <path d="M12.5 14l-2.5 4h3l-2 4" />
    </template>
    <template v-else-if="kind === 'haze'">
      <path d="M4 8h16M6 12h12M4 16h16M8 20h8" />
    </template>
    <path v-else d="M7 18h9.5a4 4 0 0 0 .6-7.96A5.5 5.5 0 0 0 6.4 11 3.5 3.5 0 0 0 7 18z" />
  </svg>
</template>
