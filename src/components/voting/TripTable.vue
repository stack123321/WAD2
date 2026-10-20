<script setup>
// Owner: Eashvar. "Who leaves when" on 12 Final plan: one line on how fair the trips are (the gap
// between the longest and shortest), then a table of each person's leave-by time
// (starts_at − travel_mins), start point, mode, trip time and cost. Your row is shaded, longest and
// shortest are tagged only when the trips differ, and on phones each row folds onto two lines
// (who and leave-by, then from · how · cost).
import { computed } from 'vue'
import MemberAvatar from './MemberAvatar.vue'
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
  <section class="trips" aria-labelledby="fair-heading">
    <h2 id="fair-heading" class="trips-title">Who leaves when</h2>
    <p v-if="range" class="fair-line">
      Everyone's trip is within <strong>{{ range.gap }} min</strong> of each other. Longest:
      {{ range.longestNames.join(', ') }} ({{ range.longest }} min). Shortest:
      {{ range.shortestNames.join(', ') }} ({{ range.shortest }} min).
    </p>
    <p v-else class="fair-line">
      Travel times appear once everyone has picked how they're travelling.
    </p>

    <div class="table-scroll">
      <table class="trip-table">
        <caption class="visually-hidden">
          Each person's trip and when to leave
        </caption>
        <thead>
          <tr>
            <th scope="col">Who</th>
            <th scope="col">Leave by</th>
            <th scope="col">From</th>
            <th scope="col">How</th>
            <th scope="col" class="text-end">Cost</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.user_id" :class="{ 'row--me': row.isMe }">
            <th scope="row">
              <span class="who">
                <MemberAvatar :name="row.display_name" :color="row.avatar_color" :size="32" />
                {{ row.display_name }}
                <span v-if="row.isMe" class="tag">You</span>
                <span v-if="row.isLongest" class="tag">Longest</span>
                <span v-if="row.isShortest" class="tag">Shortest</span>
              </span>
            </th>
            <td class="leave">{{ row.leaveAt }}</td>
            <td class="soft soft--first">{{ row.start_label ?? '—' }}</td>
            <td class="soft">
              {{ modeLabel(row.mode) }}
              <template v-if="row.travel_mins != null"> · {{ row.travel_mins }} min</template>
            </td>
            <td class="soft text-end">{{ formatCost(row.travel_cost) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <p class="routes-note">Step-by-step routes for everyone are coming soon.</p>
  </section>
</template>

<style scoped>
.trips {
  padding: 2rem;
  border: 1px solid var(--fp-border);
  border-radius: var(--fp-radius-lg);
}

.trips-title {
  margin: 0;
  font-size: 1.75rem;
}

.fair-line {
  margin: 0.6rem 0 0;
  color: var(--fp-muted);
}

.fair-line strong {
  color: var(--fp-primary);
}

.table-scroll {
  margin-top: 1.25rem;
  overflow-x: auto;
}

.trip-table {
  width: 100%;
  min-width: 560px;
  border-collapse: collapse;
}

.trip-table thead th {
  padding: 0 0.5rem 0.75rem 0;
  color: var(--fp-faint);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-align: left;
  text-transform: uppercase;
}

.trip-table thead th.text-end {
  text-align: right;
}

.trip-table tbody tr {
  border-top: 1px solid var(--fp-border);
}

.trip-table tbody th,
.trip-table td {
  padding: 0.85rem 0.5rem 0.85rem 0;
  vertical-align: middle;
}

.row--me {
  background: var(--fp-surface);
}

.row--me th {
  padding-left: 0.75rem;
  border-radius: var(--fp-radius-sm) 0 0 var(--fp-radius-sm);
}

.row--me td:last-child {
  padding-right: 0.75rem;
  border-radius: 0 var(--fp-radius-sm) var(--fp-radius-sm) 0;
}

.who {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.6rem;
  font-weight: 700;
}

.tag {
  padding: 0.15rem 0.55rem;
  border-radius: var(--fp-radius-pill);
  background: var(--fp-pill);
  font-size: 0.75rem;
  font-weight: 700;
}

.leave {
  font-family: var(--fp-display);
  font-weight: 800;
  font-size: 1.25rem;
  white-space: nowrap;
}

.soft {
  color: var(--fp-muted);
  white-space: nowrap;
}

.routes-note {
  margin: 1.1rem 0 0;
  color: var(--fp-faint);
  font-size: 0.875rem;
}

/* Phones: each row folds onto two lines instead of scrolling sideways */
@media (max-width: 575.98px) {
  .trips {
    padding: 1.4rem;
  }

  .table-scroll {
    overflow: visible;
  }

  .trip-table {
    min-width: 0;
  }

  .trip-table thead {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
  }

  .trip-table tbody tr {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    padding: 0.75rem 0;
  }

  .trip-table tbody th,
  .trip-table td {
    padding: 0;
  }

  .trip-table tbody th {
    flex: 1 1 0;
    min-width: 0;
  }

  .leave {
    flex: none;
    font-size: 1.125rem;
  }

  .soft {
    flex: none;
    margin-top: 0.35rem;
    font-size: 0.875rem;
    text-align: left !important;
  }

  .soft--first {
    flex-basis: 100%;
    padding-left: 2.6rem !important;
  }

  .soft--first ~ .soft {
    padding-left: 2.6rem !important;
  }

  .soft--first ~ .soft + .soft {
    padding-left: 0 !important;
  }

  .soft--first ~ .soft + .soft::before {
    content: '\00a0\00b7\00a0';
  }

  .row--me {
    padding-inline: 0.75rem !important;
    border-radius: var(--fp-radius-sm);
  }

  .row--me th,
  .row--me td:last-child {
    padding-left: 0;
    padding-right: 0;
  }
}
</style>
