<script setup>
// Owner: Eashvar. "Fair for everyone" on 12 Final plan: the gap, longest and shortest trip,
// then a table of each person's start point, mode, trip time, cost and leave-by time
// (starts_at − travel_mins). Longest/shortest rows are tagged only when the trips differ, and
// on phones the From and Cost columns move under the person's name.
import { computed } from 'vue'
import { formatCost, formatTime, leaveBy, modeLabel, tripRange } from './voteHelpers'

const props = defineProps({
  members: { type: Array, required: true },
  startsAt: { type: String, default: null },
  myId: { type: String, default: null },
})

const range = computed(() => tripRange(props.members))

const rows = computed(() =>
  props.members.map((m) => {
    const hasTime = m.travel_mins != null
    const differs = range.value !== null && range.value.gap > 0
    return {
      ...m,
      isMe: m.user_id === props.myId,
      isLongest: hasTime && differs && m.travel_mins === range.value.longest,
      isShortest: hasTime && differs && m.travel_mins === range.value.shortest,
      leaveAt: hasTime && props.startsAt ? formatTime(leaveBy(props.startsAt, m.travel_mins)) : '—',
    }
  }),
)
</script>

<template>
  <section class="panel" aria-labelledby="fair-heading">
    <h2 id="fair-heading" class="h5 mb-3">Fair for everyone</h2>

    <template v-if="range">
      <div class="row g-2 text-center mb-2">
        <div class="col-4">
          <div class="stat stat--gap">
            <p class="stat__value mb-0">{{ range.gap }} min</p>
            <p class="stat__label mb-0">gap</p>
          </div>
        </div>
        <div class="col-4">
          <div class="stat">
            <p class="stat__value mb-0">{{ range.longest }} min</p>
            <p class="stat__label mb-0">longest</p>
          </div>
        </div>
        <div class="col-4">
          <div class="stat">
            <p class="stat__value mb-0">{{ range.shortest }} min</p>
            <p class="stat__label mb-0">shortest</p>
          </div>
        </div>
      </div>
      <p class="small muted mb-3">
        Everyone's trip is within <strong>{{ range.gap }} min</strong> of each other. Longest:
        {{ range.longestNames.join(', ') }}. Shortest: {{ range.shortestNames.join(', ') }}.
      </p>
    </template>
    <p v-else class="small muted">
      Travel times appear once everyone has picked how they're travelling.
    </p>

    <table class="table align-middle mb-0">
      <caption class="visually-hidden">
        Each person's trip and when to leave
      </caption>
      <thead>
        <tr class="small">
          <th scope="col">Who</th>
          <th scope="col" class="d-none d-md-table-cell">From</th>
          <th scope="col">Mode</th>
          <th scope="col" class="text-end">Trip</th>
          <th scope="col" class="d-none d-md-table-cell text-end">Cost</th>
          <th scope="col" class="text-end">Leave by</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in rows" :key="row.user_id" :class="{ 'row--me': row.isMe }">
          <th scope="row" class="fw-semibold">
            {{ row.display_name }}
            <span v-if="row.isMe" class="badge tag tag--me">You</span>
            <span v-if="row.isLongest" class="badge tag tag--long">Longest</span>
            <span v-if="row.isShortest" class="badge tag tag--short">Shortest</span>
            <span class="d-block d-md-none small muted fw-normal">
              {{ row.start_label ?? '—' }} · {{ formatCost(row.travel_cost, row.mode) }}
            </span>
          </th>
          <td class="d-none d-md-table-cell">{{ row.start_label ?? '—' }}</td>
          <td>{{ modeLabel(row.mode) }}</td>
          <td class="text-end text-nowrap">
            {{ row.travel_mins != null ? `${row.travel_mins} min` : '—' }}
          </td>
          <td class="d-none d-md-table-cell text-end">
            {{ formatCost(row.travel_cost, row.mode) }}
          </td>
          <td class="text-end text-nowrap fw-semibold">{{ row.leaveAt }}</td>
        </tr>
      </tbody>
    </table>
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

.stat {
  background: var(--fp-bg);
  border-radius: var(--fp-radius-sm);
  padding: 0.75rem 0.25rem;
}

.stat--gap {
  background: var(--fp-primary);
  color: var(--fp-surface);
}

.stat__value {
  font-size: 1.25rem;
  font-weight: 800;
}

.stat__label {
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.table {
  --bs-table-bg: transparent;
}

.row--me {
  --bs-table-bg: var(--fp-bg);
}

.tag {
  font-weight: 600;
}

.tag--me {
  background: var(--fp-primary);
  color: var(--fp-surface);
}

.tag--long {
  background: var(--fp-accent);
  color: var(--fp-surface);
}

.tag--short {
  background: var(--fp-bg);
  color: var(--fp-ink);
  border: 1px solid var(--fp-border);
}
</style>
