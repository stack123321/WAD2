<script setup>
// Owner: Eashvar. Host-only card on 11 Group voting: a "Winner" dropdown and the
// "Close vote & confirm plan" button. The parent holds the chosen winner (selectedId) so it can
// default to the live leader; this card emits select(spotId) and close(spotId). Closing is blocked,
// with a hint, until at least one person has voted (voteCount).
defineProps({
  shortlist: { type: Array, required: true },
  selectedId: { type: String, default: null },
  voteCount: { type: Number, default: 0 },
  deadlineText: { type: String, default: null },
  disabled: { type: Boolean, default: false },
  closing: { type: Boolean, default: false },
})

const emit = defineEmits(['select', 'close'])
</script>

<template>
  <section class="host-card" aria-labelledby="close-heading">
    <h2 id="close-heading" class="host-title">Close the vote.</h2>
    <p class="host-text">
      Only you see this, as the host. Lock in the winner now<template v-if="deadlineText"
        >, or let it close on its own on {{ deadlineText }} SGT</template
      >. The winner starts as the leading spot.
    </p>

    <label for="winner" class="host-field-label">Winner</label>
    <select
      id="winner"
      class="form-select host-select"
      :value="selectedId"
      :disabled="disabled || closing"
      @change="emit('select', $event.target.value)"
    >
      <option v-for="spot in shortlist" :key="spot.id" :value="spot.id">{{ spot.name }}</option>
    </select>

    <button
      type="button"
      class="btn btn-light host-btn"
      :disabled="disabled || closing || !selectedId || voteCount === 0"
      @click="emit('close', selectedId)"
    >
      <span v-if="closing" class="spinner-border spinner-border-sm" aria-hidden="true"></span>
      Close vote &amp; confirm plan
    </button>
    <p v-if="voteCount === 0" class="host-hint" role="status">
      Wait for at least one vote before closing.
    </p>
  </section>
</template>
<style scoped>
/* One black feature card per page: the thing the host most needs to tap */
.host-card {
  padding: 1.75rem;
  background: var(--fp-ink);
  color: var(--fp-bg);
  border-radius: var(--fp-radius-lg);
}

.host-title {
  margin: 0;
  color: var(--fp-bg);
  font-weight: 800;
  font-size: 1.75rem;
}

.host-text {
  margin: 0.5rem 0 1.1rem;
  color: var(--fp-on-dark-muted);
  font-size: 0.95rem;
  line-height: 1.5;
}

.host-field-label {
  display: block;
  margin-bottom: 0.4rem;
  font-size: 0.9rem;
  font-weight: 600;
}

.host-select {
  background-color: var(--fp-bg);
}

.host-btn {
  width: 100%;
  min-height: 54px;
  margin-top: 0.9rem;
  --bs-btn-bg: var(--fp-bg);
  --bs-btn-hover-bg: var(--fp-surface);
  --bs-btn-active-bg: var(--fp-surface);
  --bs-btn-disabled-bg: var(--fp-ink-hover);
  --bs-btn-disabled-color: var(--fp-on-dark-muted);
}

.host-hint {
  margin: 0.6rem 0 0;
  color: var(--fp-on-dark-muted);
  font-size: 0.875rem;
  text-align: center;
}
</style>
