<script setup>
// 10 Spot details
// Owner: Hugo · Vet by: Matrix
// Figma frame "10". Layout is done; sections hold placeholder content until wired to live data.
import { useRoute } from 'vue-router'

const route = useRoute()
</script>

<template>
  <main class="container spot">
    <header class="spot__nav">
      <RouterLink
        class="btn btn-outline-primary btn-sm d-inline-flex align-items-center gap-2"
        :to="{ name: 'explore', params: { id: route.params.id } }"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
        Back to spots
      </RouterLink>
    </header>

    <section class="spot__preview card-box">
      <div class="preview-placeholder">Photo / map preview</div>
    </section>

    <section class="spot__info d-flex flex-wrap justify-content-between align-items-center gap-3">
      <div>
        <h1 class="h3 mb-1">Spot name</h1>
        <div class="d-flex flex-wrap align-items-center column-gap-3">
          <p class="text-secondary mb-0">Type of place</p>
          <p class="mb-0">&#9733; 4.5 · 120 reviews</p>
          <p class="text-secondary mb-0">$$</p>
          <p class="text-secondary mb-0">300 m from nearest MRT station</p>
        </div>
      </div>
      <div class="d-flex flex-wrap gap-2">
        <button type="button" class="btn btn-outline-primary btn-sm">Open Google Maps</button>
        <button type="button" class="btn btn-primary btn-sm">Add to Vote</button>
      </div>
    </section>

    <section class="spot__criteria card-box">
      <h2 class="h6">Criteria</h2>
      <p class="text-secondary mb-0">Why it fits the group.</p>
    </section>

    <section class="spot__crowd card-box">
      <h2 class="h6">Crowd</h2>
      <p class="text-secondary mb-0">Crowd forecast chart.</p>
    </section>

    <section class="spot__traveltime card-box">
      <h2 class="h6">Travel time</h2>
      <p class="text-secondary mb-0">Travel time per friend.</p>
    </section>

    <section class="spot__about card-box">
      <h2 class="h6">About</h2>
      <p class="text-secondary mb-0">Description and details.</p>
    </section>

    <section class="spot__weather card-box">
      <h2 class="h6">Weather</h2>
      <p class="text-secondary mb-0">Forecast for the hangout time.</p>
    </section>

    <div class="spot__space"></div>
  </main>
</template>

<style scoped>
.spot {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-areas:
    'nav nav nav'
    'preview preview preview'
    'info info info'
    'criteria crowd traveltime'
    'about weather space';
  gap: 1rem;
  padding-block: 1.5rem;
}

.spot__nav {
  grid-area: nav;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.spot__info {
  grid-area: info;
}
.spot__preview {
  grid-area: preview;
}
.spot__criteria {
  grid-area: criteria;
}
.spot__crowd {
  grid-area: crowd;
}
.spot__traveltime {
  grid-area: traveltime;
}
.spot__about {
  grid-area: about;
}
.spot__weather {
  grid-area: weather;
}
.spot__space {
  grid-area: space;
}

.card-box {
  background: var(--fp-surface);
  border: 1px solid var(--fp-border);
  border-radius: var(--fp-radius);
  box-shadow: var(--fp-shadow);
  padding: 1.25rem;
}

.preview-placeholder {
  display: grid;
  place-items: center;
  min-height: 240px;
  border-radius: var(--fp-radius-sm);
  background: var(--fp-bg);
  color: var(--fp-muted);
}

@media (max-width: 768px) {
  .spot {
    grid-template-columns: 1fr;
    grid-template-areas:
      'nav'
      'preview'
      'info'
      'criteria'
      'crowd'
      'traveltime'
      'about'
      'weather'
      'space';
  }
}
</style>
