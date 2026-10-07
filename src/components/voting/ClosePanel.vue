<script setup>
// Owner: Eashvar. Host-only box on 11 Group voting: pick the winner and close the vote.
// The parent owns the chosen winner (selectedId), so it can default to the live leader.
defineProps({
  shortlist: { type: Array, required: true },
  selectedId: { type: String, default: null },
  disabled: { type: Boolean, default: false },
  closing: { type: Boolean, default: false }, // true while the close request is running
})

const emit = defineEmits(['select', 'close'])
</script>

<template>
  <section class="panel" aria-labelledby="close-heading">
    <h2 id="close-heading" class="h5">Close the vote</h2>
    <p class="small muted">
      Only the host sees this. The winner starts as the leading spot, and you can change it before
      closing.
    </p>
    <label for="winner" class="form-label small fw-semibold">Winner</label>
    <select
      id="winner"
      class="form-select mb-3"
      :value="selectedId"
      :disabled="disabled || closing"
      @change="emit('select', $event.target.value)"
    >
      <option v-for="spot in shortlist" :key="spot.id" :value="spot.id">{{ spot.name }}</option>
    </select>
    <button
      type="button"
      class="btn btn-primary w-100"
      :disabled="disabled || closing || !selectedId"
      @click="emit('close', selectedId)"
    >
      <span v-if="closing" class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
      Close vote
    </button>
  </section>
</template>

<style scoped>
.panel {
  background: var(--fp-surface);
  border: 2px solid var(--fp-primary);
  border-radius: var(--fp-radius);
  box-shadow: var(--fp-shadow);
  padding: 1.25rem;
}

.muted {
  color: var(--fp-muted);
}
</style>
