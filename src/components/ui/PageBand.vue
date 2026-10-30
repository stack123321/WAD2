<script setup>
// Owner: Eashvar (design catalogue A1). The deep teal band at the top of every page: the island in
// dots behind, the page's h1, a line under it, an optional back link, and room on the right for
// the page's main action or a few numbers. Put the page's content after it in a
// <div class="container fp-pull"> so the first cards hang over the band's lower edge.
// Usage: <PageBand title="Friends" lead="3 friends · 1 new request" :back="{ to: { name: 'dashboard' }, label: 'My hangouts' }">
//          <template #actions><RouterLink class="btn btn-accent" ...>…</RouterLink></template>
//        </PageBand>
// A #title slot replaces the plain h1 (for a headline with a coloured word); the default slot
// sits under the lead. size="short" leaves less room under the text (for pages whose first card
// is short); size="flat" leaves none (nothing hangs over).
import DotIsland from './DotIsland.vue'

defineProps({
  title: { type: String, default: '' },
  lead: { type: String, default: '' },
  back: { type: Object, default: null }, // { to, label }
  size: { type: String, default: 'normal' }, // normal | short | flat
})
</script>

<template>
  <section class="band" :class="`band--${size}`">
    <DotIsland class="band__island" />
    <div class="container band__inner">
      <RouterLink v-if="back" class="band__back" :to="back.to">← {{ back.label }}</RouterLink>
      <div class="band__row">
        <div class="band__text">
          <slot name="title">
            <h1 class="band__title">{{ title }}</h1>
          </slot>
          <p v-if="lead" class="band__lead">{{ lead }}</p>
          <slot />
        </div>
        <div v-if="$slots.actions" class="band__actions">
          <slot name="actions" />
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.band {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  color: #fff;
  background: linear-gradient(
    180deg,
    var(--fp-deep) 0%,
    var(--fp-deep-2) 55%,
    var(--fp-primary) 100%
  );
  padding: clamp(1.75rem, 4vw, 3rem) 0 clamp(5.5rem, 9vw, 7.5rem);
}

.band--short {
  padding-bottom: clamp(4.5rem, 7vw, 6rem);
}

.band--flat {
  padding-bottom: clamp(1.75rem, 4vw, 3rem);
}

.band__island {
  position: absolute;
  right: -8%;
  top: 50%;
  width: min(880px, 110vw);
  translate: 0 -50%;
  z-index: -1;
  mask-image: linear-gradient(90deg, transparent 0%, #000 45%);
}

.band__back {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  margin-bottom: 0.25rem;
  color: var(--fp-on-deep-muted);
  font-weight: 600;
  text-decoration: none;
}

.band__back:hover {
  color: #fff;
}

.band__row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1.25rem 2rem;
}

.band__text {
  min-width: 0;
  max-width: 48rem;
}

.band__title,
.band :slotted(h1) {
  margin: 0;
  font-size: clamp(2rem, 4.2vw, 3.4rem);
  font-weight: 800;
  line-height: 1.04;
  letter-spacing: -0.035em;
  overflow-wrap: anywhere;
}

.band__lead {
  margin: 0.75rem 0 0;
  max-width: 40rem;
  font-size: clamp(1rem, 1.3vw, 1.15rem);
  color: var(--fp-on-deep);
}

.band__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
}

.band__title,
.band__lead,
.band__actions {
  animation: rise 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) both;
}

.band__lead {
  animation-delay: 60ms;
}

.band__actions {
  animation-delay: 120ms;
}

@keyframes rise {
  from {
    opacity: 0;
    translate: 0 16px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .band__title,
  .band__lead,
  .band__actions {
    animation: none;
  }
}
</style>
