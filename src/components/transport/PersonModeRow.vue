<script setup>
// Owner: Nicole. One person's row on 07 Mode of transport: avatar, where they're coming from,
// the MRT / Bus / Car / Walk picker and their travel time. Only your own row can be clicked;
// picking a mode emits "pick" and the page saves it.
import MemberAvatar from '@/components/voting/MemberAvatar.vue'

defineProps({
  member: { type: Object, required: true },
  isMe: { type: Boolean, default: false },
  updating: { type: Boolean, default: false }, // the page is working out new times
})

const emit = defineEmits(['pick'])

const modes = ['mrt', 'bus', 'car', 'walk']
const labels = { mrt: 'MRT', bus: 'Bus', car: 'Car', walk: 'Walk' }
</script>

<template>
  <div class="person">
    <MemberAvatar :name="member.display_name" :color="member.avatar_color" :size="36" />

    <div class="who">
      <div class="name">
        {{ member.display_name }}<span v-if="isMe"> (you)</span>
      </div>
      <div class="from">From {{ member.start_label }}</div>
    </div>

    <!-- Your row: pick your mode. Friends' rows: shows what they picked (they choose it) -->
    <div class="segmented" :class="{ 'segmented--readonly': !isMe }">
      <button
        v-for="mode in modes"
        :key="mode"
        type="button"
        :class="{ active: member.mode === mode }"
        :disabled="!isMe"
        :aria-pressed="member.mode === mode"
        @click="emit('pick', mode)"
      >
        {{ labels[mode] }}
      </button>
    </div>

    <div class="time">
      <!-- A new mode can move the meeting station and change everyone's time, so every row
           waits instead of showing the old numbers -->
      <div v-if="updating" class="cost">Working out…</div>
      <template v-else-if="member.mode && member.travel_mins != null">
        <div class="mins">{{ member.travel_mins }} min</div>
        <!-- (Surya) driving shows the parking rate per hour, and says so -->
        <div v-if="member.mode === 'car'" class="cost">
          ${{ Number(member.travel_cost).toFixed(2) }}/h parking
        </div>
        <div v-else class="cost">${{ Number(member.travel_cost).toFixed(2) }} one way</div>
      </template>
      <div v-else-if="isMe" class="cost">Pick your mode</div>
      <!-- (Surya) not picked yet: show the time if they go by MRT, so nobody has to wait -->
      <template v-else-if="member.travel_mins != null">
        <div class="mins">{{ member.travel_mins }} min</div>
        <div class="cost">assuming MRT</div>
      </template>
      <div v-else class="cost">Waiting for {{ member.display_name }}</div>
    </div>
  </div>
</template>

<style scoped>
/* One white rounded card per person */
.person {
  display: flex;
  align-items: center;
  gap: 1rem;
  background: var(--fp-surface);
  border: 1px solid var(--fp-border);
  border-radius: var(--fp-radius);
  padding: 0.85rem 1.25rem;
  margin-bottom: 0.75rem;
}

.who {
  width: 150px;
}

.name {
  font-weight: 700;
}

.from,
.cost {
  color: var(--fp-muted);
  font-size: 0.8rem;
}

/* The grey pill holding MRT / Bus / Car / Walk */
.segmented {
  display: flex;
  background: var(--fp-bg);
  border-radius: var(--fp-radius-sm);
  padding: 4px;
}

.segmented button {
  border: 0;
  background: transparent;
  color: var(--fp-muted);
  font-size: 0.85rem;
  padding: 0.3rem 0.8rem;
  border-radius: 8px;
}

/* The selected mode is a white raised pill */
.segmented button.active {
  background: var(--fp-surface);
  color: var(--fp-ink);
  font-weight: 700;
  box-shadow: var(--fp-shadow);
}

/* Friends' rows: you can see what they picked, but can't click it */
.segmented--readonly button {
  cursor: default;
}

.segmented--readonly button:not(.active) {
  opacity: 0.45;
}

/* Time and cost pushed to the right edge */
.time {
  margin-left: auto;
  text-align: right;
}

.mins {
  font-weight: 800;
}

/* Phones and small tablets (below Bootstrap's md breakpoint): everything on one line doesn't
   fit, so the mode buttons move to their own full-width line under the name and time */
@media (max-width: 767.98px) {
  .person {
    flex-wrap: wrap;
    gap: 0.75rem;
    padding: 0.85rem 1rem;
  }

  .who {
    flex: 1;
    width: auto;
    min-width: 0; /* lets a long place name wrap instead of pushing the time off the card */
  }

  .segmented {
    order: 1; /* after the time, so it starts the second line */
    width: 100%;
  }

  /* 4 equal buttons, tall enough to tap (at least 44px) */
  .segmented button {
    flex: 1;
    min-height: 44px;
    font-size: 0.9rem;
  }

  .from,
  .cost {
    font-size: 0.875rem;
  }
}
</style>
