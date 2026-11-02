<script setup>
// Owner: Eashvar. One hangout on a friend group's page (/groups/:id): the date, the name, who's
// coming and where it's up to. The status and the step it opens come from utils/hangoutStatus.js,
// the same as the dashboard's cards, so the two never disagree.
import { computed } from 'vue'
import MemberAvatar from '@/components/voting/MemberAvatar.vue'
import { getStatus } from '@/utils/hangoutStatus'

const props = defineProps({
  hangout: { type: Object, required: true }, // same shape as src/mocks/hangout.json
  myId: { type: String, default: null },
  groupSize: { type: Number, default: 0 }, // how many people are in the group, for "4 of 5 going"
})

const status = computed(() => getStatus(props.hangout, props.myId))

// the date as a calendar block: "OCT" over "16"
const day = computed(() => {
  if (!props.hangout.starts_at) {
    return null
  }
  const d = new Date(props.hangout.starts_at)
  const sg = { timeZone: 'Asia/Singapore' }
  return {
    month: d.toLocaleDateString('en-SG', { ...sg, month: 'short' }),
    date: d.toLocaleDateString('en-SG', { ...sg, day: 'numeric' }),
    full: d.toLocaleString('en-SG', {
      ...sg,
      weekday: 'short',
      hour: 'numeric',
      minute: '2-digit',
    }),
  }
})

// "4 of 5 going" when someone sat it out, otherwise "4 going"
const going = computed(() => {
  const n = props.hangout.members.length
  if (props.groupSize > n) {
    return `${n} of ${props.groupSize} going`
  }
  return `${n} going`
})

// where the hangout ended up, once a place is chosen
const place = computed(() => {
  const h = props.hangout
  const spot = (h.shortlist ?? []).find((s) => s.id === h.final_shortlist_id)
  if (spot) {
    return spot.name
  }
  return h.midpoint_name ? `Near ${h.midpoint_name}` : ''
})

const TONE_TEXT = {
  amber: 'text-warning-emphasis',
  grey: 'text-secondary',
  green: 'text-success-emphasis',
}
</script>

<template>
  <article class="row-card">
    <div class="cal" aria-hidden="true">
      <template v-if="day">
        <span class="cal__month">{{ day.month }}</span>
        <span class="cal__date">{{ day.date }}</span>
      </template>
      <span v-else class="cal__month">TBC</span>
    </div>

    <div class="info">
      <h3 class="name">
        <!-- stretched-link: a tap anywhere on the row opens the hangout -->
        <RouterLink
          class="stretched-link text-reset text-decoration-none"
          :to="{ name: status.page, params: { id: hangout.id } }"
        >
          {{ hangout.name }}
        </RouterLink>
      </h3>
      <p class="meta">
        <template v-if="day">{{ day.full }} · </template>{{ going
        }}<template v-if="place"> · {{ place }}</template>
      </p>
      <div class="foot">
        <span class="avatars">
          <MemberAvatar
            v-for="m in hangout.members.slice(0, 5)"
            :key="m.user_id"
            :name="m.display_name"
            :color="m.avatar_color"
            :size="24"
          />
        </span>
        <span class="status" :class="TONE_TEXT[status.tone]">{{ status.text }}</span>
      </div>
    </div>

    <span class="go" aria-hidden="true">→</span>
  </article>
</template>

<style scoped>
.row-card {
  position: relative; /* for the stretched link */
  display: flex;
  align-items: center;
  gap: 0.9rem;
  padding: 0.85rem 0.25rem;
  min-height: 44px;
}

.row-card + .row-card {
  border-top: 1px solid var(--fp-border);
}

.row-card:hover .name,
.row-card:focus-within .name {
  color: var(--fp-primary);
}

.cal {
  flex: 0 0 3.25rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 3.25rem;
  border-radius: var(--fp-radius-sm);
  background: var(--fp-bg);
  border: 1px solid var(--fp-border);
  line-height: 1.1;
}

.cal__month {
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--fp-primary);
}

.cal__date {
  font-size: 1.25rem;
  font-weight: 800;
  color: var(--fp-ink);
}

.info {
  flex: 1;
  min-width: 0;
}

.name {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.meta {
  margin: 0.1rem 0 0.4rem;
  font-size: 0.875rem;
  color: var(--fp-muted);
}

.foot {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.avatars {
  display: flex;
}

.avatars > * + * {
  margin-left: -6px;
}

.status {
  font-size: 0.85rem;
  font-weight: 600;
}

.go {
  color: var(--fp-muted);
  font-size: 1.1rem;
}
</style>
