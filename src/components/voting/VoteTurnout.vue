<script setup>
// Owner: Eashvar. Turnout on 11 Group voting: "3 of 4 voted", one segment per member (teal once
// they've voted), and the default slot beside the count for who we're still waiting on.
import { computed } from 'vue'

const props = defineProps({
  votedCount: { type: Number, required: true },
  memberCount: { type: Number, required: true },
})

const segments = computed(() =>
  Array.from({ length: props.memberCount }, (_, i) => i < props.votedCount),
)
</script>

<template>
  <div>
    <div class="turnout-row">
      <p class="count mb-0" aria-live="polite">{{ votedCount }} of {{ memberCount }} voted</p>
      <p class="waiting mb-0"><slot /></p>
    </div>
    <div
      class="segments"
      role="progressbar"
      aria-label="Friends who have voted"
      :aria-valuenow="votedCount"
      aria-valuemin="0"
      :aria-valuemax="memberCount"
      :aria-valuetext="`${votedCount} of ${memberCount} voted`"
      :style="{ gridTemplateColumns: `repeat(${Math.max(memberCount, 1)}, minmax(0, 1fr))` }"
    >
      <span
        v-for="(voted, i) in segments"
        :key="i"
        class="segment"
        :class="{ 'segment--voted fp-grow': voted }"
      ></span>
    </div>
  </div>
</template>

<style scoped>
.turnout-row {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 0.25rem 1rem;
  font-size: 0.95rem;
}

.count {
  font-weight: 700;
}

.waiting {
  color: var(--fp-muted);
}

.segments {
  display: grid;
  gap: 4px;
  margin-top: 0.6rem;
}

.segment {
  height: 10px;
  border-radius: var(--fp-radius-pill);
  background: var(--fp-pill);
}

.segment--voted {
  background: var(--fp-primary);
}
</style>
