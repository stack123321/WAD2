<script setup>
// Owner: Eashvar. The big spot card at the top of 12 Final plan and the Debrief: the spot's photo
// (or a tinted block with its initial when there's no photo), a small label above the name, the
// category, rating and area, then a ticket strip with the date and, for the person looking, when
// they leave and from where. Anything extra (the "not confirmed" note, the Done row) goes in the
// default slot under the strip.
import { computed } from 'vue'
import { formatDateTime } from './voteHelpers'

const props = defineProps({
  spot: { type: Object, required: true },
  label: { type: String, required: true },
  area: { type: String, default: null },
  startsAt: { type: String, default: null },
  // { at: '6:26 pm', from: 'Tampines MRT' } for the person looking, or null to leave it out
  myLeave: { type: Object, default: null },
  headingId: { type: String, default: 'spot-heading' },
})

const initial = computed(() => props.spot.name.trim().charAt(0).toUpperCase())
</script>

<template>
  <section class="hero" :aria-labelledby="headingId">
    <div class="hero__media">
      <img v-if="spot.image_url" :src="spot.image_url" :alt="`Photo of ${spot.name}`" />
      <div v-else class="hero__fallback" aria-hidden="true">
        <span class="hero__initial">{{ initial }}</span>
        <span class="hero__category text-capitalize">{{ spot.category }}</span>
      </div>
    </div>

    <div class="hero__body">
      <p class="hero__label mb-1">{{ label }}</p>
      <h2 :id="headingId" class="hero__name mb-1">{{ spot.name }}</h2>
      <p class="hero__meta mb-0">
        <span class="text-capitalize">{{ spot.category }}</span>
        <template v-if="spot.rating">
          · <span aria-hidden="true">★</span><span class="visually-hidden">Rating</span>
          {{ spot.rating }}
        </template>
        <template v-if="area"> · {{ area }}</template>
      </p>

      <dl v-if="startsAt || myLeave" class="ticket mb-0">
        <div v-if="startsAt" class="ticket__part">
          <dt>When</dt>
          <dd>{{ formatDateTime(startsAt) }} <span class="ticket__unit">SGT</span></dd>
        </div>
        <div v-if="myLeave" class="ticket__part ticket__part--you">
          <dt>You leave by</dt>
          <dd>
            {{ myLeave.at }}
            <span v-if="myLeave.from" class="ticket__unit">from {{ myLeave.from }}</span>
          </dd>
        </div>
      </dl>

      <slot />
    </div>
  </section>
</template>

<style scoped>
.hero {
  background: var(--fp-surface);
  border: 1px solid var(--fp-border);
  border-radius: var(--fp-radius);
  box-shadow: var(--fp-shadow);
  overflow: hidden;
}

.hero__media {
  height: 9.5rem;
  background: color-mix(in srgb, var(--fp-primary) 10%, var(--fp-surface));
}

.hero__media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.hero__fallback {
  height: 100%;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  color: var(--fp-primary);
  /* soft rings, like a pin's ripple on the map */
  background:
    radial-gradient(
      circle at 82% 30%,
      transparent 0 2.5rem,
      color-mix(in srgb, var(--fp-primary) 9%, transparent) 2.5rem 2.6rem,
      transparent 2.6rem 4.5rem,
      color-mix(in srgb, var(--fp-primary) 7%, transparent) 4.5rem 4.6rem,
      transparent 4.6rem
    ),
    color-mix(in srgb, var(--fp-primary) 10%, var(--fp-surface));
}

.hero__initial {
  font-size: 3.5rem;
  font-weight: 800;
  line-height: 1;
}

.hero__category {
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.hero__body {
  padding: 1.25rem;
}

.hero__label {
  color: var(--fp-primary);
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.hero__name {
  font-size: 1.6rem;
  font-weight: 800;
  line-height: 1.2;
  overflow-wrap: anywhere;
}

.hero__meta {
  color: var(--fp-muted);
}

.ticket {
  display: grid;
  grid-template-columns: 1fr;
  margin-top: 1rem;
  border: 1px solid var(--fp-border);
  border-radius: var(--fp-radius-sm);
  background: var(--fp-bg);
}

.ticket__part {
  padding: 0.7rem 0.9rem;
}

.ticket__part + .ticket__part {
  border-top: 1px dashed var(--fp-border);
}

.ticket dt {
  color: var(--fp-muted);
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.ticket dd {
  margin: 0;
  font-weight: 700;
}

.ticket__part--you dd {
  color: var(--fp-primary);
  font-size: 1.15rem;
}

.ticket__unit {
  color: var(--fp-muted);
  font-size: 0.875rem;
  font-weight: 500;
}

@media (min-width: 576px) {
  .hero__media {
    height: 11rem;
  }

  .ticket {
    grid-template-columns: 1fr 1fr;
  }

  .ticket__part + .ticket__part {
    border-top: 0;
    border-left: 1px dashed var(--fp-border);
  }
}
</style>
