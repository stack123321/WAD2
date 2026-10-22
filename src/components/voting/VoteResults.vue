<script setup>
// Owner: Eashvar. The final vote on the debrief: one row per shortlisted spot, most votes first,
// with a bar, the count and who voted for it. The spot the group went to is marked "Picked".
import { computed } from 'vue'
import MemberAvatar from './MemberAvatar.vue'

const props = defineProps({
  rows: { type: Array, required: true }, // [{ spot, count }] from countVotes()
  votersBySpot: { type: Object, required: true }, // spot id → [{ userId, name, color }]
  finalId: { type: String, default: null },
})

const total = computed(() => props.rows.reduce((sum, row) => sum + row.count, 0))

const ranked = computed(() =>
  [...props.rows]
    .sort(
      (a, b) => b.count - a.count || (b.spot.id === props.finalId) - (a.spot.id === props.finalId),
    )
    .map((row) => ({
      ...row,
      picked: row.spot.id === props.finalId,
      percent: total.value === 0 ? 0 : Math.round((row.count / total.value) * 100),
      voters: props.votersBySpot[row.spot.id] ?? [],
    })),
)
</script>

<template>
  <ol class="results list-unstyled mb-0">
    <li v-for="row in ranked" :key="row.spot.id" class="result" :class="{ picked: row.picked }">
      <div class="d-flex flex-wrap align-items-center gap-2">
        <span class="name">{{ row.spot.name }}</span>
        <span v-if="row.picked" class="badge picked-badge">Picked</span>
        <span class="count ms-auto">
          {{ row.count }} {{ row.count === 1 ? 'vote' : 'votes' }}
        </span>
      </div>
      <div
        class="progress mt-2"
        role="progressbar"
        :aria-label="row.spot.name"
        :aria-valuenow="row.count"
        aria-valuemin="0"
        :aria-valuemax="total"
        :aria-valuetext="`${row.count} of ${total} votes`"
      >
        <div class="progress-bar" :style="{ width: row.percent + '%' }"></div>
      </div>
      <div v-if="row.voters.length" class="voters d-flex align-items-center gap-2 mt-2">
        <span class="d-flex stack">
          <MemberAvatar
            v-for="voter in row.voters"
            :key="voter.userId"
            :name="voter.name"
            :color="voter.color"
            :size="22"
          />
        </span>
        <span class="small muted">{{ row.voters.map((v) => v.name).join(', ') }}</span>
      </div>
    </li>
  </ol>
</template>

<style scoped>
.result {
  padding: 0.85rem 1rem;
  border: 1px solid var(--fp-border);
  border-radius: var(--fp-radius-sm);
}

.result + .result {
  margin-top: 0.6rem;
}

.result.picked {
  border-color: var(--fp-primary);
  background: color-mix(in srgb, var(--fp-primary) 6%, var(--fp-surface));
}

.name {
  font-weight: 700;
}

.picked-badge {
  background: var(--fp-primary);
  color: var(--fp-surface);
}

.count {
  font-weight: 600;
  white-space: nowrap;
}

.progress {
  height: 8px;
  background: var(--fp-bg);
}

.progress-bar {
  background: var(--fp-muted);
}

.picked .progress-bar {
  background: var(--fp-primary);
}

.stack > :not(:first-child) {
  margin-left: -6px;
}

.muted {
  color: var(--fp-muted);
}
</style>
