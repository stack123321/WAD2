<script setup>
// Owner: Surya. The bar under the navbar on pages 06–12 (Figma): hangout name, date, the 6 steps
// with the current one highlighted, and everyone's avatars. Each step links to its page.
// Usage: <HangoutBar :hangout="store.hangout" :members="store.members" current="transport" />
// (current = the route name of the page you're on)
import { computed } from 'vue'
import MemberAvatar from '@/components/voting/MemberAvatar.vue'

const props = defineProps({
  hangout: { type: Object, required: true }, // needs id, name, starts_at
  members: { type: Array, required: true }, // needs user_id, display_name, avatar_color
  current: { type: String, required: true },
})

// The 6 steps, in 3 groups that say what each part of planning is for
const STEPS = [
  { label: 'Starting points', route: 'starting-points', group: 'Get there' },
  { label: 'Transport', route: 'transport', group: 'Get there' },
  { label: 'Midpoint', route: 'midpoint', group: 'Choose' },
  { label: 'Spots', route: 'explore', group: 'Choose' },
  { label: 'Vote', route: 'vote', group: 'Decide' },
  { label: 'Final plan', route: 'final-plan', group: 'Decide' },
]

// True for the first step of each group, where the group's name is shown
function startsGroup(i) {
  return i === 0 || STEPS[i - 1].group !== STEPS[i].group
}

// Which step we're on: steps before it show a ✓, the current one is highlighted
const currentIndex = computed(() => {
  let current = props.current
  // 10 Spot details is part of the "Spots" step
  if (current === 'spot-details') {
    current = 'explore'
  }
  return STEPS.findIndex((step) => step.route === current)
})

// "Fri 16 Oct · 7 PM"
const startsAt = computed(() => {
  if (!props.hangout.starts_at) {
    return ''
  }
  const date = new Date(props.hangout.starts_at)
  const day = date
    .toLocaleDateString('en-SG', { weekday: 'short', day: 'numeric', month: 'short' })
    .replace(',', '')

  let hour = date.getHours() % 12
  if (hour === 0) {
    hour = 12
  }
  let minutes = ''
  if (date.getMinutes() !== 0) {
    minutes = ':' + String(date.getMinutes()).padStart(2, '0')
  }
  let amPm = 'PM'
  if (date.getHours() < 12) {
    amPm = 'AM'
  }
  return `${day} · ${hour}${minutes} ${amPm}`
})
</script>

<template>
  <header class="hangout-bar px-3 px-lg-5">
    <div class="d-flex align-items-center gap-2 min-w-0">
      <span class="fw-bold text-truncate">{{ hangout.name }}</span>
      <span class="date-chip">{{ startsAt }}</span>
    </div>

    <ol class="steps d-none d-xl-flex">
      <template v-for="(step, i) in STEPS" :key="step.route">
        <li v-if="startsGroup(i)" class="step-group" aria-hidden="true">{{ step.group }}</li>
        <li class="step" :class="{ current: i === currentIndex, done: i < currentIndex }">
          <RouterLink
            :to="{ name: step.route, params: { id: hangout.id } }"
            class="step-link"
            :aria-current="i === currentIndex ? 'step' : null"
          >
            <span class="step-num">{{ i < currentIndex ? '✓' : i + 1 }}</span>
            {{ step.label }}
          </RouterLink>
        </li>
      </template>
    </ol>

    <!-- Phones and tablets: the 6 steps don't fit, so just say which step this is -->
    <RouterLink
      v-if="currentIndex !== -1"
      class="step-compact d-xl-none"
      :to="{ name: STEPS[currentIndex].route, params: { id: hangout.id } }"
      aria-current="step"
    >
      <span class="step-num">{{ currentIndex + 1 }}</span>
      <span
        >Step {{ currentIndex + 1 }} of {{ STEPS.length }} · {{ STEPS[currentIndex].label }}</span
      >
    </RouterLink>

    <div class="avatar-stack d-none d-md-flex" :aria-label="`${members.length} members`">
      <MemberAvatar
        v-for="m in members"
        :key="m.user_id"
        :name="m.display_name"
        :color="m.avatar_color"
        :size="30"
      />
    </div>
  </header>
</template>

<style scoped>
.hangout-bar {
  display: flex;
  flex-wrap: wrap; /* on narrow phones the step goes onto its own line */
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem 1rem;
  min-height: 64px;
  padding-top: 0.6rem;
  padding-bottom: 0.6rem;
  background: var(--fp-surface);
  border-bottom: 1px solid var(--fp-border);
}

.min-w-0 {
  min-width: 0; /* lets text-truncate work inside a flex row */
}

.date-chip {
  flex-shrink: 0;
  background: var(--fp-bg);
  border-radius: 999px;
  padding: 0.25rem 0.75rem;
  font-size: 0.85rem;
  font-weight: 500;
}

.steps {
  align-items: center;
  list-style: none;
  margin: 0;
  padding: 0;
}

/* a short line between steps, solid once that step is done */
.step + .step::before {
  content: '';
  display: inline-block;
  width: 32px;
  height: 1px;
  margin: 0 0.75rem;
  vertical-align: middle;
  background: var(--fp-border);
}

.step.done + .step::before {
  height: 2px;
  background: var(--fp-primary);
}

/* "GET THERE", "CHOOSE", "DECIDE" before each group of steps */
.step-group {
  margin: 0 0.6rem 0 1.5rem;
  color: var(--fp-muted);
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.step-group:first-child {
  margin-left: 0;
}

.step-link {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--fp-muted);
  text-decoration: none;
  font-size: 0.9rem;
}

.step-num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: 1px solid var(--fp-border);
  font-size: 0.75rem;
}

.step.done .step-link {
  color: var(--fp-ink);
}

.step.done .step-num {
  background: var(--fp-primary);
  border-color: var(--fp-primary);
  color: var(--fp-surface);
}

.step.current .step-link {
  color: var(--fp-ink);
  font-weight: 600;
}

.step.current .step-num {
  background: var(--fp-ink);
  border-color: var(--fp-ink);
  color: var(--fp-surface);
}

/* "Step 1 of 6 · Starting points" on phones and tablets */
.step-compact {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--fp-ink);
  font-size: 0.9rem;
  font-weight: 600;
  text-decoration: none;
}

.step-compact .step-num {
  background: var(--fp-ink);
  border-color: var(--fp-ink);
  color: var(--fp-surface);
}

.avatar-stack > * + * {
  margin-left: -8px;
}
</style>
