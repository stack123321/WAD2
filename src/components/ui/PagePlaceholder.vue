<script setup>
// Temporary card shown by every page until its owner builds the real thing.
// Delete the <PagePlaceholder> from your view once you start; delete this file in Week 10.
defineProps({
  number: { type: String, required: true },
  title: { type: String, required: true },
  owner: { type: String, required: true },
  purpose: { type: String, required: true },
  reads: { type: String, default: '—' },
  writes: { type: String, default: '—' },
  next: { type: Object, default: null }, // a router location, e.g. { name: 'vote', params: { id } }
  nextLabel: { type: String, default: 'Next' },
})
</script>

<template>
  <section class="container py-5">
    <div class="placeholder-card">
      <p class="eyebrow">Page {{ number }} · owner: {{ owner }}</p>
      <h1>{{ title }}</h1>
      <p class="purpose">{{ purpose }}</p>
      <dl class="row small mb-4">
        <dt class="col-sm-2">Reads</dt>
        <dd class="col-sm-10">{{ reads }}</dd>
        <dt class="col-sm-2">Writes</dt>
        <dd class="col-sm-10">{{ writes }}</dd>
      </dl>
      <slot />
      <RouterLink v-if="next" class="btn btn-primary" :to="next">{{ nextLabel }} →</RouterLink>
    </div>
  </section>
</template>

<style scoped>
.placeholder-card {
  background: var(--fp-surface);
  border: 1px dashed var(--fp-border);
  border-radius: var(--fp-radius);
  padding: 2rem;
  max-width: 760px;
}

.eyebrow {
  color: var(--fp-accent);
  font-weight: 700;
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 0.25rem;
}

.purpose {
  color: var(--fp-muted);
}
</style>
