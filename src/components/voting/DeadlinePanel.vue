<script setup>
// Owner: Eashvar. Host-only card on 11 Group voting once the vote has started: shows when voting
// closes (or when it closed) and lets the host move it, earlier or later, from a list of times that
// are still ahead (in 30 minutes up to when the hangout starts). Moving a passed deadline into the
// future opens voting again. Emits change(deadline ISO).
import { ref, watch } from 'vue'
import { formatDateTime } from './voteHelpers'

const props = defineProps({
  deadline: { type: String, default: null }, // the hangout's current vote_deadline
  closed: { type: Boolean, default: false }, // true once the deadline has passed
  options: { type: Array, required: true }, // [{ iso, label }] from changeOptions()
  saving: { type: Boolean, default: false },
})

const emit = defineEmits(['change'])

const chosen = ref('')

// after a save (or a minute ticking past a choice), clear a choice that's no longer offered
watch(
  () => [props.options, props.deadline],
  () => {
    if (!props.options.some((o) => o.iso === chosen.value)) chosen.value = ''
  },
)

function save() {
  if (chosen.value) emit('change', chosen.value)
}
</script>

<template>
  <section class="panel" aria-labelledby="deadline-heading">
    <div class="d-flex align-items-center gap-2 mb-2">
      <span class="badge host">Host</span>
      <h2 id="deadline-heading" class="h6 mb-0">Voting closes</h2>
    </div>
    <p class="small muted mb-3" aria-live="polite">
      <template v-if="!deadline">No closing time is set.</template>
      <template v-else-if="closed">Voting closed {{ formatDateTime(deadline) }} SGT.</template>
      <template v-else>Voting closes {{ formatDateTime(deadline) }} SGT.</template>
    </p>

    <template v-if="options.length">
      <label for="change-closes" class="form-label small fw-semibold mb-1">
        {{ closed ? 'Open voting again until' : 'Change it to' }}
      </label>
      <select id="change-closes" v-model="chosen" class="form-select mb-2" :disabled="saving">
        <option value="" disabled>Choose a time</option>
        <option v-for="o in options" :key="o.iso" :value="o.iso">
          {{ o.label }} ({{ formatDateTime(o.iso) }})
        </option>
      </select>
      <button
        type="button"
        class="btn btn-outline-primary w-100 fw-semibold"
        :disabled="saving || !chosen"
        @click="save"
      >
        <span v-if="saving" class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
        {{ closed ? 'Open voting again' : 'Update closing time' }}
      </button>
    </template>
    <p v-else class="small hint mb-0" role="status">
      The hangout is about to start, so the closing time can't be moved.
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
