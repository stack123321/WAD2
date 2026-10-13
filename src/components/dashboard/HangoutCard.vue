<script setup>
// One hangout in the "Your hangouts" list on 04 Dashboard.
// Owner: Ryan.
import { computed } from 'vue'

const props = defineProps({
  hangout: { type: Object, required: true }, // same shape as src/mocks/hangout.json
  canDelete: { type: Boolean, default: false }, // true for the host: shows a Delete button
  canLeave: { type: Boolean, default: false }, // true for other members: shows a Leave button
})

const emit = defineEmits(['delete', 'leave'])

const SG = 'Asia/Singapore'
const startsAt = computed(() => new Date(props.hangout.starts_at))

// "Fri", "16", "Oct", "7:00 pm"
const weekday = computed(() =>
  startsAt.value.toLocaleDateString('en-SG', { weekday: 'short', timeZone: SG }),
)
const day = computed(() =>
  startsAt.value.toLocaleDateString('en-SG', { day: 'numeric', timeZone: SG }),
)
const month = computed(() =>
  startsAt.value.toLocaleDateString('en-SG', { month: 'short', timeZone: SG }),
)
const time = computed(() =>
  startsAt.value.toLocaleTimeString('en-SG', { hour: 'numeric', minute: '2-digit', timeZone: SG }),
)

// "7:00 pm · Midpoint: Bishan · 4 friends"
const details = computed(() => {
  let text = time.value
  if (props.hangout.midpoint_name) text += ` · Midpoint: ${props.hangout.midpoint_name}`
  return text + ` · ${props.hangout.members.length} friends`
})

// What the pill says, its colour, and where the button goes, for each stage of planning
const status = computed(() => {
  const h = props.hangout
  const total = h.members.length
  if (h.status === 'collecting') {
    const added = h.members.filter((m) => m.start_label).length
    return {
      label: `Locations · ${added} of ${total} added`,
      badge: 'text-bg-info',
      action: 'Continue',
      page: 'starting-points',
    }
  }
  if (h.status === 'voting') {
    return {
      label: `Voting · ${h.votes.length} of ${total} voted`,
      badge: 'text-bg-warning',
      action: 'Open vote',
      page: 'vote',
    }
  }
  if (h.status === 'confirmed') {
    return { label: 'Confirmed', badge: 'text-bg-success', action: 'View plan', page: 'final-plan' }
  }
  return { label: 'Done', badge: 'text-bg-secondary', action: 'View plan', page: 'final-plan' }
})
</script>

<template>
  <div class="card">
    <div class="card-body d-flex flex-wrap align-items-center gap-3">
      <div class="date-block text-center">
        <div class="weekday">{{ weekday }}</div>
        <div class="day">{{ day }}</div>
        <div class="month">{{ month }}</div>
      </div>

      <div class="info">
        <h3 class="h6 mb-1">{{ hangout.name }}</h3>
        <p class="text-muted small mb-2">{{ details }}</p>
        <div class="d-flex align-items-center gap-2">
          <span class="badge rounded-pill" :class="status.badge">{{ status.label }}</span>
          <div class="d-flex">
            <span
              v-for="m in hangout.members"
              :key="m.user_id"
              class="avatar"
              :style="{ background: m.avatar_color }"
              :title="m.display_name"
            >
              {{ m.display_name[0] }}
            </span>
          </div>
        </div>
      </div>

      <div class="d-flex flex-column align-items-end gap-1 ms-auto">
        <router-link
          :to="{ name: status.page, params: { id: hangout.id } }"
          class="btn btn-outline-secondary btn-sm text-nowrap"
        >
          {{ status.action }}
        </router-link>
        <button
          v-if="canDelete"
          type="button"
          class="btn btn-link btn-sm text-danger delete-btn"
          :aria-label="`Delete ${hangout.name}`"
          @click="emit('delete', hangout)"
        >
          Delete
        </button>
        <button
          v-else-if="canLeave"
          type="button"
          class="btn btn-link btn-sm text-danger delete-btn"
          :aria-label="`Leave ${hangout.name}`"
          @click="emit('leave', hangout)"
        >
          Leave
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.info {
  flex: 1 1 12rem; /* grow to fill, but wrap the button below when narrower than 12rem */
}
.delete-btn {
  min-height: 44px; /* big enough to tap with a finger */
  text-decoration: none;
}

.date-block {
  width: 64px;
  padding: 8px 0;
  background: var(--fp-bg);
  border-radius: var(--fp-radius-sm);
  line-height: 1.2;
}
.weekday {
  color: var(--fp-accent);
  font-size: 0.75rem;
  text-transform: uppercase;
}
.day {
  font-size: 1.5rem;
  font-weight: 700;
}
.month {
  color: var(--fp-muted);
  font-size: 0.75rem;
  text-transform: uppercase;
}
.avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 2px solid var(--fp-surface);
  color: var(--fp-surface);
  font-size: 0.75rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
}
.avatar + .avatar {
  margin-left: -8px; /* overlap the circles like the Figma */
}
</style>
