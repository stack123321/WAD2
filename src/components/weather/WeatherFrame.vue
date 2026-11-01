<script setup>
// Owner: Surya. The white card that every weather card sits in, so the border, shadow and padding
// live in one place. The card fills in three slots:
//   #header  → title row (title on the left, a chip on the right)
//   default  → the card's main content
//   #footer  → small print at the bottom, e.g. the data source
// Usage:
//   <WeatherFrame>
//     <template #header><h2>Weather at Bishan</h2><span>Fri 7 PM</span></template>
//     …forecast…
//     <template #footer>Source: …</template>
//   </WeatherFrame>
</script>

<template>
  <section class="weather-frame">
    <header v-if="$slots.header" class="frame-header">
      <slot name="header"></slot>
    </header>

    <slot></slot>

    <footer v-if="$slots.footer" class="frame-footer small">
      <slot name="footer"></slot>
    </footer>
  </section>
</template>

<style scoped>
.weather-frame {
  background: var(--fp-surface);
  border: 1px solid var(--fp-border);
  border-radius: var(--fp-radius);
  box-shadow: var(--fp-shadow);
  padding: 1.5rem;
}

.frame-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.frame-footer {
  color: var(--fp-muted);
  margin-top: 0.75rem;
}
</style>
