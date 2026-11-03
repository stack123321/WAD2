<script setup>
// Owner: Eashvar. Host-only card on 11 Group voting: a "Winner" dropdown and the
// "Close vote & confirm plan" button. The parent holds the chosen winner (selectedId) so it can
// default to the live leader; this card emits select(spotId) and close(spotId). Closing is blocked,
// with a hint, until at least one person has voted (voteCount). Once the vote is closed (closed),
// by the host or by the wheel, it stays so the host can change the winner (currentId is the
// confirmed spot).
defineProps({
  shortlist: { type: Array, required: true },
  leaderId: { type: String, default: null },
  selectedId: { type: String, default: null },
  voteCount: { type: Number, default: 0 },
  deadlineText: { type: String, default: null },
  disabled: { type: Boolean, default: false },
  closing: { type: Boolean, default: false },
  closed: { type: Boolean, default: false },
  currentId: { type: String, default: null },
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
      class="form-select mb-3"
      :value="selectedId ?? leaderId"
      :disabled="disabled || closing"
      @change="emit('select', $event.target.value)"
    >
      <option v-if="leaderId && !closed" :value="leaderId">
        Most voted: {{ shortlist.find((spot) => spot.id === leaderId)?.name }}
      </option>
      <option v-for="spot in shortlist" :key="spot.id" :value="spot.id">{{ spot.name }}</option>
    </select>
    <button
      v-if="!closed && leaderId && selectedId !== leaderId"
      type="button"
      class="btn btn-outline-danger w-100 mb-3"
      :disabled="disabled || closing"
      @click="emit('select', leaderId)"
    >
      Use most voted spot
    </button>

    <button
      v-if="closed"
      type="button"
      class="btn btn-primary w-100 fw-semibold"
      :disabled="disabled || closing || !selectedId || selectedId === currentId"
      @click="emit('close', selectedId)"
    >
      <span v-if="closing" class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
      Change the winner
    </button>
    <button
      v-else
      type="button"
      class="btn btn-primary w-100 fw-semibold"
      :disabled="disabled || closing || !selectedId || voteCount === 0"
      @click="emit('close', selectedId)"
    >
      <span v-if="closing" class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
      Close vote &amp; confirm plan <span aria-hidden="true">→</span>
    </button>
    <p v-if="closed" class="small muted mt-2 mb-0">
      Voting is closed. Pick another spot to change the winner.
    </p>
    <p v-else-if="voteCount === 0" class="small hint mt-2 mb-0" role="status">
      Wait for at least one vote before closing.
    </p>

    <p v-if="deadlineText && !closed" class="small muted mt-2 mb-0">
      Voting closes {{ deadlineText }} SGT. The winner starts as the leading spot.
    </p>
  </section>
</template>

<style scoped>
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  min-height: 44px;
}

.form-select {
  min-height: 44px;
}

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

.hint {
  border-left: 3px solid var(--fp-accent);
  padding-left: 0.5rem;
  color: var(--fp-ink);
}
</style>
