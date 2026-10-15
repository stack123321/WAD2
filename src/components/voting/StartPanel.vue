<script setup>
// Owner: Eashvar. Host-only card on 11 Group voting while the hangout is still collecting: a
// "Start the vote" button that opens voting for everyone. It's disabled, with a hint, until there's
// at least one shortlisted spot, or if the hangout's start time has already passed (no deadline
// left to vote by). Emits start.
defineProps({
  spotCount: { type: Number, required: true },
  deadlineText: { type: String, default: null },
  exploreTo: { type: Object, required: true },
  starting: { type: Boolean, default: false },
})

const emit = defineEmits(['start'])
</script>

<template>
  <section class="panel" aria-labelledby="start-heading">
    <div class="d-flex align-items-center gap-2 mb-2">
      <span class="badge host">Host</span>
      <h2 id="start-heading" class="h6 mb-0">Ready to vote?</h2>
    </div>
    <p class="small muted mb-3">
      Nobody can vote until you start it.
      {{ spotCount === 1 ? '1 spot is' : `${spotCount} spots are` }} on the shortlist.
    </p>

    <button
      type="button"
      class="btn btn-primary w-100 fw-semibold"
      :disabled="starting || spotCount === 0 || !deadlineText"
      @click="emit('start')"
    >
      <span v-if="starting" class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
      Start the vote <span aria-hidden="true">→</span>
    </button>

    <p v-if="spotCount === 0" class="small hint mt-2 mb-0" role="status">
      Add at least one spot first.
      <RouterLink :to="exploreTo">Find nearby spots</RouterLink>
    </p>
    <p v-else-if="!deadlineText" class="small hint mt-2 mb-0" role="status">
      The hangout's start time has passed, so there's no time left to vote.
    </p>
    <p v-else class="small muted mt-2 mb-0">Voting will close {{ deadlineText }} SGT.</p>
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

.hint {
  border-left: 3px solid var(--fp-accent);
  padding-left: 0.5rem;
  color: var(--fp-ink);
}
</style>
