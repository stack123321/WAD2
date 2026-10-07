<script setup>
// Owner: Eashvar. Live tally on 11 Group voting: a bar per spot, the leader,
// and who has and hasn't voted yet.
import { computed } from 'vue'

const props = defineProps({
  rows: { type: Array, required: true }, // [{ spot, count }]
  leaderId: { type: String, default: null }, // null when nobody has voted
  tied: { type: Boolean, default: false },
  memberStatus: { type: Array, required: true }, // [{ userId, name, hasVoted }]
})

const total = computed(() => props.memberStatus.length)
const votedCount = computed(() => props.memberStatus.filter((m) => m.hasVoted).length)
const leaderRow = computed(() => props.rows.find((row) => row.spot.id === props.leaderId) ?? null)

function percent(count) {
  return total.value === 0 ? 0 : Math.round((count / total.value) * 100)
}
</script>

<template>
  <section class="panel" aria-labelledby="tally-heading">
    <div class="d-flex justify-content-between align-items-baseline gap-2 mb-1">
      <h2 id="tally-heading" class="h5 mb-0">Live tally</h2>
      <p class="small fw-semibold mb-0" aria-live="polite">{{ votedCount }} of {{ total }} voted</p>
    </div>

    <p class="small muted mb-3">
      <template v-if="!leaderRow">No votes yet.</template>
      <template v-else-if="tied">
        Tied on {{ leaderRow.count }} votes. Ties go to the better group match:
        <strong>{{ leaderRow.spot.name }}</strong
        >.
      </template>
      <template v-else>
        Leading: <strong>{{ leaderRow.spot.name }}</strong>
      </template>
    </p>

    <ul class="list-unstyled mb-4">
      <li v-for="row in rows" :key="row.spot.id" class="mb-3">
        <div class="d-flex justify-content-between gap-2 small mb-1">
          <span>
            {{ row.spot.name }}
            <span v-if="row.spot.id === leaderId" class="badge leader">Leading</span>
          </span>
          <span class="text-nowrap">{{ row.count }} {{ row.count === 1 ? 'vote' : 'votes' }}</span>
        </div>
        <div
          class="progress"
          role="progressbar"
          :aria-label="row.spot.name"
          :aria-valuenow="row.count"
          aria-valuemin="0"
          :aria-valuemax="total"
          :aria-valuetext="`${row.count} of ${total} votes`"
        >
          <div
            class="progress-bar"
            :class="{ 'progress-bar--leader': row.spot.id === leaderId }"
            :style="{ width: percent(row.count) + '%' }"
          ></div>
        </div>
      </li>
    </ul>

    <h3 class="h6">Who's voted</h3>
    <ul class="list-unstyled d-flex flex-wrap gap-2 mb-0">
      <li
        v-for="member in memberStatus"
        :key="member.userId"
        class="chip small"
        :class="{ 'chip--voted': member.hasVoted }"
      >
        <span aria-hidden="true">{{ member.hasVoted ? '✓' : '…' }}</span>
        {{ member.name }}
        <span class="visually-hidden">{{
          member.hasVoted ? 'has voted' : 'has not voted yet'
        }}</span>
      </li>
    </ul>
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

.muted {
  color: var(--fp-muted);
}

.leader {
  background: var(--fp-accent);
  color: var(--fp-surface);
}

.progress {
  background: var(--fp-bg);
}

.progress-bar {
  background: var(--fp-primary);
}

.progress-bar--leader {
  background: var(--fp-accent);
}

.chip {
  border: 1px dashed var(--fp-border);
  border-radius: 999px;
  padding: 0.2rem 0.75rem;
  color: var(--fp-muted);
}

.chip--voted {
  border-style: solid;
  border-color: var(--fp-primary);
  color: var(--fp-ink);
}
</style>
