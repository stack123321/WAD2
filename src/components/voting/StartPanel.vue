<script setup>
// Owner: Eashvar. Host-only card on 11 Group voting while the hangout is still collecting: the host
// picks when voting closes (05 no longer asks) and presses "Start the vote" to open voting for
// everyone. It's disabled, with a hint, until there's at least one shortlisted spot, or when no
// closing time is left before the hangout starts. Emits start(deadline ISO).
import { ref, watch } from 'vue'
import { defaultCloseOption, formatDateTime } from './voteHelpers'

const props = defineProps({
  spotCount: { type: Number, required: true },
  options: { type: Array, required: true }, // [{ iso, label }] from closeOptions()
  exploreTo: { type: Object, required: true },
  starting: { type: Boolean, default: false },
})

const emit = defineEmits(['start'])

const chosen = ref(defaultCloseOption(props.options))

// keep a valid choice selected if the list changes (a minute ticking past a closing time)
watch(
  () => props.options,
  (options) => {
    if (!options.some((o) => o.iso === chosen.value)) chosen.value = defaultCloseOption(options)
  },
)
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

    <template v-if="options.length">
      <label for="vote-closes" class="form-label small fw-semibold mb-1">Voting closes</label>
      <select id="vote-closes" v-model="chosen" class="form-select mb-3" :disabled="starting">
        <option v-for="o in options" :key="o.iso" :value="o.iso">{{ o.label }}</option>
      </select>
    </template>

    <button
      type="button"
      class="btn btn-primary w-100 fw-semibold"
      :disabled="starting || spotCount === 0 || !chosen"
      @click="emit('start', chosen)"
    >
      <span v-if="starting" class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
      Start the vote <span aria-hidden="true">→</span>
    </button>

    <p v-if="spotCount === 0" class="small hint mt-2 mb-0" role="status">
      Add at least one spot first.
      <RouterLink :to="exploreTo">Find nearby spots</RouterLink>
    </p>
    <p v-else-if="!chosen" class="small hint mt-2 mb-0" role="status">
      The hangout is about to start or has started, so there's no time left to vote.
    </p>
    <p v-else class="small muted mt-2 mb-0">Voting will close {{ formatDateTime(chosen) }} SGT.</p>
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

.form-select {
  min-height: 44px;
}
</style>
