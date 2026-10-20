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
  <section class="host-card" aria-labelledby="start-heading">
    <h2 id="start-heading" class="host-title">Start the vote.</h2>
    <p class="host-text">
      Only you see this, as the host. Nobody can vote until you start it.
      {{ spotCount === 1 ? '1 spot is' : `${spotCount} spots are` }} on the shortlist.
    </p>

    <button
      type="button"
      class="btn btn-light host-btn"
      :disabled="starting || spotCount === 0 || !deadlineText"
      @click="emit('start')"
    >
      <span v-if="starting" class="spinner-border spinner-border-sm" aria-hidden="true"></span>
      Start the vote
    </button>

    <p v-if="spotCount === 0" class="host-hint" role="status">
      Add at least one spot first.
      <RouterLink :to="exploreTo" class="host-link">Find nearby spots</RouterLink>
    </p>
    <p v-else-if="!deadlineText" class="host-hint" role="status">
      The hangout's start time has passed, so there's no time left to vote.
    </p>
    <p v-else class="host-hint">Voting will close {{ deadlineText }} SGT.</p>
  </section>
</template>
<style scoped>
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
  margin: 0.5rem 0 0;
  color: var(--fp-on-dark-muted);
  font-size: 0.95rem;
  line-height: 1.5;
}

.host-btn {
  width: 100%;
  min-height: 54px;
  margin-top: 1.1rem;
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

.host-link {
  color: var(--fp-tint);
  font-weight: 700;
}
</style>
