<script setup>
// Owner: Eashvar. Turnout on 11 Group voting: "3 of 4 voted" and a bar with the % of the group
// that has voted. The default slot is the intro text shown to the left of the count. on-deep sets
// it in white for the teal band (design catalogue A1).
import { computed } from 'vue'

const props = defineProps({
  votedCount: { type: Number, required: true },
  memberCount: { type: Number, required: true },
  onDeep: { type: Boolean, default: false },
})

const percent = computed(() =>
  props.memberCount === 0 ? 0 : Math.round((props.votedCount / props.memberCount) * 100),
)
</script>

<template>
  <div :class="{ 'on-deep': onDeep }">
    <div class="d-flex flex-wrap justify-content-between align-items-baseline column-gap-3 mb-2">
      <p class="muted small mb-0"><slot /></p>
      <p class="muted small mb-0" aria-live="polite">{{ votedCount }} of {{ memberCount }} voted</p>
    </div>
    <div class="d-flex align-items-center gap-2">
      <div
        class="progress flex-grow-1"
        role="progressbar"
        aria-label="Friends who have voted"
        :aria-valuenow="votedCount"
        aria-valuemin="0"
        :aria-valuemax="memberCount"
        :aria-valuetext="`${votedCount} of ${memberCount} voted`"
      >
        <div class="progress-bar" :style="{ width: percent + '%' }"></div>
      </div>
      <span class="small fw-semibold" aria-hidden="true">{{ percent }}%</span>
    </div>
  </div>
</template>

<style scoped>
.on-deep .muted,
.on-deep span {
  color: var(--fp-on-deep);
}

.on-deep .progress {
  background: rgb(255 255 255 / 0.2);
}

.on-deep .progress-bar {
  background: var(--fp-accent);
}

.muted {
  color: var(--fp-muted);
}

.progress {
  height: 6px;
  background: var(--fp-border);
}

.progress-bar {
  background: var(--fp-primary);
}
</style>
