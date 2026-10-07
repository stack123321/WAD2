<script setup>
// Owner: Eashvar. One shortlisted spot on 11 Group voting, with its vote button.
import { computed } from 'vue'

const props = defineProps({
  spot: { type: Object, required: true },
  count: { type: Number, default: 0 },
  selected: { type: Boolean, default: false }, // true when this is my current vote
  disabled: { type: Boolean, default: false },
})

const emit = defineEmits(['vote'])

const price = computed(() => (props.spot.price_level ? '$'.repeat(props.spot.price_level) : null))
</script>

<template>
  <article
    class="candidate h-100"
    :class="{ 'candidate--selected': selected }"
    :aria-labelledby="`spot-${spot.id}`"
  >
    <div class="d-flex justify-content-between align-items-start gap-2">
      <h3 :id="`spot-${spot.id}`" class="h6 mb-1">{{ spot.name }}</h3>
      <span v-if="spot.match_pct != null" class="badge match">{{ spot.match_pct }}% match</span>
    </div>

    <p class="meta small mb-3">
      <span class="text-capitalize">{{ spot.category }}</span>
      <template v-if="spot.rating">
        · <span aria-hidden="true">★</span><span class="visually-hidden">Rating</span>
        {{ spot.rating }}
      </template>
      <template v-if="price">
        · <span aria-hidden="true">{{ price }}</span>
        <span class="visually-hidden">Price level {{ spot.price_level }} of 4</span>
      </template>
    </p>

    <div class="d-flex align-items-center gap-2">
      <span class="small me-auto">{{ count }} {{ count === 1 ? 'vote' : 'votes' }}</span>
      <span v-if="selected" class="badge your-vote">✓ Your vote</span>
      <button
        type="button"
        class="btn btn-sm"
        :class="selected ? 'btn-primary' : 'btn-outline-primary'"
        :aria-pressed="selected"
        :disabled="disabled"
        @click="emit('vote', spot.id)"
      >
        Vote<span class="visually-hidden"> for {{ spot.name }}</span>
      </button>
    </div>
  </article>
</template>

<style scoped>
.candidate {
  background: var(--fp-surface);
  border: 1px solid var(--fp-border);
  border-radius: var(--fp-radius);
  box-shadow: var(--fp-shadow);
  padding: 1rem 1.25rem;
}

/* My choice: thicker teal border, plus the "Your vote" badge so it isn't colour alone */
.candidate--selected {
  border-color: var(--fp-primary);
  box-shadow: 0 0 0 1px var(--fp-primary);
}

.meta {
  color: var(--fp-muted);
}

.match {
  background: var(--fp-bg);
  color: var(--fp-primary);
}

.your-vote {
  background: var(--fp-primary);
  color: var(--fp-surface);
}
</style>
