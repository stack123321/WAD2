<script setup>
// Owner: Hugo. Card for one spot, used on 09 Explore. Emits "add" when the user shortlists it.
import { computed } from 'vue'

const props = defineProps({
  name: { type: String, required: true },
  imageUrl: { type: String, default: null },
  rating: { type: Number, default: null },
  stationDistanceM: { type: Number, default: null },
  nearestStationName: { type: String, default: null },
  // 0 (free) to 3 (pricey), matching price_level from the places API
  priceLevel: { type: Number, default: null },
  tags: { type: Array, default: () => [] },
  added: { type: Boolean, default: false },
  // Route location for the spot details page; image and name link to it when set
  to: { type: Object, default: null },
})

defineEmits(['add'])

const price = computed(() => {
  if (props.priceLevel === null) return null
  return props.priceLevel === 0 ? 'Free' : '$'.repeat(props.priceLevel)
})

const distance = computed(() => {
  const m = props.stationDistanceM
  if (m === null) return null
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${m} m`
})
</script>

<template>
  <article class="spot-card">
    <component :is="to ? 'RouterLink' : 'div'" :to="to ?? undefined" class="spot-card__image">
      <img v-if="imageUrl" :src="imageUrl" :alt="name" loading="lazy" />
      <span v-else class="spot-card__no-image">No preview</span>
    </component>

    <div class="spot-card__body">
      <div class="d-flex justify-content-between align-items-start gap-2">
        <h3 class="h6 mb-0">
          <RouterLink v-if="to" :to="to" class="spot-card__link">{{ name }}</RouterLink>
          <template v-else>{{ name }}</template>
        </h3>
        <span v-if="rating !== null" class="spot-card__rating">&#9733; {{ rating.toFixed(1) }}</span>
      </div>

      <p class="spot-card__meta mb-0">
        <span v-if="distance">
          {{ distance }} from {{ nearestStationName || 'nearest station' }}
        </span>
        <span v-if="price" class="spot-card__price">{{ price }}</span>
      </p>

      <ul v-if="tags.length" class="spot-card__tags">
        <li v-for="tag in tags" :key="tag" class="spot-card__tag">{{ tag }}</li>
      </ul>

      <button
        type="button"
        class="btn btn-sm mt-auto"
        :class="added ? 'btn-outline-primary' : 'btn-primary'"
        :disabled="added"
        @click="$emit('add')"
      >
        {{ added ? 'Added to vote' : 'Add to vote' }}
      </button>
    </div>
  </article>
</template>

<style scoped>
.spot-card {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background: var(--fp-surface);
  border: 1px solid var(--fp-border);
  border-radius: var(--fp-radius);
  box-shadow: var(--fp-shadow);
}

.spot-card__image {
  display: block;
  aspect-ratio: 16 / 9;
  background: var(--fp-bg);
}

.spot-card__link {
  color:black;
  text-decoration: none;
}

.spot-card__link:hover {
  color: var(--fp-primary);
  text-decoration: underline;
}

.spot-card__image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.spot-card__no-image {
  display: grid;
  place-items: center;
  height: 100%;
  color: var(--fp-muted);
  font-size: 0.875rem;
}

.spot-card__body {
  display: flex;
  flex-direction: column;
  flex: 1;
  gap: 0.5rem;
  padding: 1rem;
}

.spot-card__rating {
  flex-shrink: 0;
  font-weight: 600;
  font-size: 0.875rem;
}

.spot-card__meta {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  color: var(--fp-muted);
  font-size: 0.875rem;
}

.spot-card__price {
  color: var(--fp-ink);
  font-weight: 600;
}

.spot-card__tags {
  display: flex;
  flex-wrap: nowrap;
  gap: 0.375rem;
  margin: 0;
  padding: 0 0 0.25rem;
  list-style: none;
  overflow-x: auto;
}

.spot-card__tag {
  flex-shrink: 0;
  padding: 0.125rem 0.625rem;
  border-radius: 999px;
  background: var(--fp-bg);
  border: 1px solid var(--fp-border);
  font-size: 0.75rem;
  white-space: nowrap;
}
</style>
