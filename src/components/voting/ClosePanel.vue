<script setup>
// Owner: Eashvar. Host-only card on 11 Group voting: pick the winner and close the vote.
// The parent owns the chosen winner (selectedId), so it can default to the live leader.
defineProps({
  shortlist: { type: Array, required: true },
  selectedId: { type: String, default: null },
  deadlineText: { type: String, default: null }, // e.g. "Thu, 15 Oct, 9:00 pm"
  disabled: { type: Boolean, default: false },
  closing: { type: Boolean, default: false }, // true while the close request is running
})

const emit = defineEmits(['select', 'close'])
</script>

<template>
  <section class="panel" aria-labelledby="close-heading">
    <div class="d-flex align-items-center gap-2 mb-3">
      <span class="badge host">Host</span>
      <h2 id="close-heading" class="h6 mb-0">You started this hangout</h2>
    </div>

    <label for="winner" class="form-label small fw-semibold mb-1">Winner</label>
    <select
      id="winner"
      class="form-select form-select-sm mb-3"
      :value="selectedId"
      :disabled="disabled || closing"
      @change="emit('select', $event.target.value)"
    >
      <option v-for="spot in shortlist" :key="spot.id" :value="spot.id">{{ spot.name }}</option>
    </select>

    <button
      type="button"
      class="btn btn-primary w-100 fw-semibold"
      :disabled="disabled || closing || !selectedId"
      @click="emit('close', selectedId)"
    >
      <span v-if="closing" class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
      Close vote &amp; confirm plan <span aria-hidden="true">→</span>
    </button>

    <p v-if="deadlineText" class="small muted mt-2 mb-0">
      Voting closes {{ deadlineText }} SGT. The winner starts as the leading spot.
    </p>
  </section>
</template>

<style scoped>
.panel {
  background: var(--fp-surface);
  border: 1px solid var(--fp-border);
  border-radius: var(--fp-radius);
  box-shadow: var(--fp-shadow);
  padding: 1.25rem;
}

.host {
  background: var(--fp-bg);
  color: var(--fp-primary);
  border: 1px solid var(--fp-border);
  font-weight: 600;
}

.muted {
  color: var(--fp-muted);
}
</style>
