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

const STEPS = [
  { label: 'Starting points', route: 'starting-points' },
  { label: 'Transport', route: 'transport' },
  { label: 'Midpoint', route: 'midpoint' },
  { label: 'Spots', route: 'explore' },
  { label: 'Vote', route: 'vote' },
  { label: 'Final plan', route: 'final-plan' },
]

const currentIndex = computed(() => STEPS.findIndex((s) => s.route === props.current))

/** "Fri 16 Oct · 7 PM" */
const startsAt = computed(() => {
  if (!props.hangout.starts_at) return ''
  const d = new Date(props.hangout.starts_at)
  const day = d.toLocaleDateString('en-SG', { weekday: 'short', day: 'numeric', month: 'short' })
  const hour = d.getHours() % 12 || 12
  const mins = d.getMinutes() ? ':' + String(d.getMinutes()).padStart(2, '0') : ''
  return `${day.replace(',', '')} · ${hour}${mins} ${d.getHours() < 12 ? 'AM' : 'PM'}`
})
</script>

<template>
  <header class="hangout-bar px-3 px-lg-5">
    <div class="d-flex align-items-center gap-2 min-w-0">
      <span class="fw-bold text-truncate">{{ hangout.name }}</span>
      <span class="date-chip">{{ startsAt }}</span>
    </div>

    <ol class="steps d-none d-xl-flex">
      <li
        v-for="(step, i) in STEPS"
        :key="step.route"
        class="step"
        :class="{ current: i === currentIndex, done: i < currentIndex }"
      >
        <RouterLink
          :to="{ name: step.route, params: { id: hangout.id } }"
          class="step-link"
          :aria-current="i === currentIndex ? 'step' : null"
        >
          <span class="step-num">{{ i < currentIndex ? '✓' : i + 1 }}</span>
          {{ step.label }}
        </RouterLink>
      </li>
    </ol>

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
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  min-height: 64px;
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

.avatar-stack > * + * {
  margin-left: -8px;
}
</style>
