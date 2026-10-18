<script setup>
// Owner: Ryan
// one hangout in the "your hangouts" list on 04 dashboard
import { computed } from 'vue'

const props = defineProps({
  hangout: { type: Object, required: true }, // same shape as src/mocks/hangout.json
  canDelete: { type: Boolean, default: false }, // true for the host => show delete button
  canLeave: { type: Boolean, default: false }, // true for other members => show leave button
})

const emit = defineEmits(['delete', 'leave', 'toggle-pin'])

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

// what the pill says, colour, where the button goes, for each stage of planning
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
        <button
          type="button"
          class="btn btn-link btn-sm pin-btn"
          :class="hangout.pinned ? 'text-primary' : 'text-muted'"
          :aria-label="hangout.pinned ? `Unpin ${hangout.name}` : `Pin ${hangout.name}`"
          :aria-pressed="!!hangout.pinned"
          @click="emit('toggle-pin', hangout)"
        >
          <svg
            v-if="hangout.pinned"
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            fill="currentColor"
            class="bi bi-pin-fill"
            viewBox="0 0 16 16"
            aria-hidden="true"
          >
            <path
              d="M4.146.146A.5.5 0 0 1 4.5 0h7a.5.5 0 0 1 .5.5c0 .68-.342 1.174-.646 1.479-.126.125-.25.224-.354.298v4.431l.078.048c.203.127.476.314.751.555C12.36 7.775 13 8.527 13 9.5a.5.5 0 0 1-.5.5h-4v4.5c0 .276-.224 1.5-.5 1.5s-.5-1.224-.5-1.5V10h-4a.5.5 0 0 1-.5-.5c0-.973.64-1.725 1.17-2.189A6 6 0 0 1 5 6.708V2.277a3 3 0 0 1-.354-.298C4.342 1.674 4 1.179 4 .5a.5.5 0 0 1 .146-.354"
            />
          </svg>
          <svg
            v-else
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            fill="currentColor"
            class="bi bi-pin"
            viewBox="0 0 16 16"
            aria-hidden="true"
          >
            <path
              d="M4.146.146A.5.5 0 0 1 4.5 0h7a.5.5 0 0 1 .5.5c0 .68-.342 1.174-.646 1.479-.126.125-.25.224-.354.298v4.431l.078.048c.203.127.476.314.751.555C12.36 7.775 13 8.527 13 9.5a.5.5 0 0 1-.5.5h-4v4.5c0 .276-.224 1.5-.5 1.5s-.5-1.224-.5-1.5V10h-4a.5.5 0 0 1-.5-.5c0-.973.64-1.725 1.17-2.189A6 6 0 0 1 5 6.708V2.277a3 3 0 0 1-.354-.298C4.342 1.674 4 1.179 4 .5a.5.5 0 0 1 .146-.354m1.58 1.408-.002-.001zm-.002-.001.002.001A.5.5 0 0 1 6 2v5a.5.5 0 0 1-.276.447h-.002l-.012.007-.054.03a5 5 0 0 0-.827.58c-.318.278-.585.596-.725.936h7.792c-.14-.34-.407-.658-.725-.936a5 5 0 0 0-.881-.61l-.012-.006h-.002A.5.5 0 0 1 10 7V2a.5.5 0 0 1 .295-.458 1.8 1.8 0 0 0 .351-.271c.08-.08.155-.17.214-.271H5.14q.091.15.214.271a1.8 1.8 0 0 0 .37.282"
            />
          </svg>
          {{ hangout.pinned ? 'Pinned' : 'Pin' }}
        </button>
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
.delete-btn,
.pin-btn {
  min-height: 44px; 
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
  margin-left: -8px; /* overlap the circles like the figma */
}
</style>
