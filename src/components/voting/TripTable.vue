<script setup>
// Owner: Eashvar. "Fair for everyone" on 12 Final plan and the Debrief: the gap, longest and
// shortest trip, then one row per person with their colour, start point, mode, cost, a bar for
// how long their trip is next to the longest, and their leave-by time (starts_at − travel_mins).
// Longest/shortest are tagged only when the trips differ. With `past` (the Debrief) it drops the
// three numbers, the cost and the leave-by time, and says how fair it was instead.
import { computed } from 'vue'
import MemberAvatar from './MemberAvatar.vue'
import { formatCost, formatTime, leaveBy, modeLabel, tripRange } from './voteHelpers'

const props = defineProps({
  members: { type: Array, required: true },
  startsAt: { type: String, default: null },
  myId: { type: String, default: null },
  past: { type: Boolean, default: false },
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
      barWidth: hasTime && range.value ? (m.travel_mins / range.value.longest) * 100 : 0,
      leaveAt: hasTime && props.startsAt ? formatTime(leaveBy(props.startsAt, m.travel_mins)) : '—',
    }
  }),
)
</script>

<template>
  <section class="panel" aria-labelledby="fair-heading">
    <h2 id="fair-heading" class="panel-title mb-3">Fair for everyone</h2>

    <template v-if="range">
      <div v-if="!past" class="row g-2 text-center mb-2">
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
      <p class="small muted mb-2">
        Everyone's trip {{ past ? 'was' : 'is' }} within <strong>{{ range.gap }} min</strong> of
        each other.
        <template v-if="!past">
          Longest: {{ range.longestNames.join(', ') }}. Shortest:
          {{ range.shortestNames.join(', ') }}.
        </template>
      </p>
    </template>
    <p v-else class="small muted">
      Travel times appear once everyone has picked how they're travelling.
    </p>

    <ul class="trips list-unstyled mb-0" aria-label="Each person's trip">
      <li v-for="row in rows" :key="row.user_id" class="trip" :class="{ 'trip--me': row.isMe }">
        <MemberAvatar :name="row.display_name" :color="row.avatar_color" :size="36" />
        <div class="trip__main">
          <p class="trip__name mb-0">
            {{ row.display_name }}
            <span v-if="row.isMe" class="badge tag tag--me">You</span>
            <span v-if="row.isLongest" class="badge tag tag--long">Longest</span>
            <span v-if="row.isShortest" class="badge tag tag--short">Shortest</span>
          </p>
          <p class="trip__from small muted mb-1">
            {{ row.start_label ?? '—' }} · {{ modeLabel(row.mode) }}
            <template v-if="!past"> · {{ formatCost(row.travel_cost, row.mode) }}</template>
          </p>
          <div class="d-flex align-items-center gap-2">
            <div class="trip__bar" aria-hidden="true">
              <span
                :class="{ 'trip__fill--long': row.isLongest }"
                :style="{ width: `${row.barWidth}%` }"
              ></span>
            </div>
            <span class="trip__mins small">
              {{ row.travel_mins != null ? `${row.travel_mins} min` : '—' }}
            </span>
          </div>
        </div>
        <div v-if="!past" class="trip__times">
          <span class="trip__label">Leave by</span>
          <span class="trip__leave">{{ row.leaveAt }}</span>
        </div>
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

.panel-title {
  font-size: 1rem;
  font-weight: 700;
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

.trip {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 0.75rem;
  padding: 0.85rem 0.5rem;
  border-top: 1px solid var(--fp-border);
}

.trip--me {
  background: var(--fp-bg);
  border-radius: var(--fp-radius-sm);
  border-top-color: transparent;
}

.trip--me + .trip {
  border-top-color: transparent;
}

.trip__main {
  min-width: 0;
}

.trip__name {
  font-weight: 700;
}

.trip__from {
  overflow-wrap: anywhere;
}

.trip__bar {
  flex: 1;
  height: 6px;
  border-radius: 999px;
  background: var(--fp-border);
  overflow: hidden;
}

.trip__bar span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--fp-primary);
}

.trip__bar .trip__fill--long {
  background: var(--fp-accent);
}

.trip__times {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  text-align: right;
  white-space: nowrap;
}

.trip__mins {
  font-weight: 700;
  white-space: nowrap;
}

.trip__label {
  color: var(--fp-muted);
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.trip__leave {
  font-size: 1.05rem;
  font-weight: 800;
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
