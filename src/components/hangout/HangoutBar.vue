<script setup>
// Owner: Surya. The grey band under the navbar on pages 06–12: hangout name, date, the 6 steps
// (done ones get a teal tick, the current one is black), everyone's avatars, and a black Invite
// pill that copies the hangout's invite link (for people who aren't your friends yet). Each step
// links to its page. On phones it shows "Step 3 of 6 · Midpoint" with a six-segment bar, and
// "All steps" opens the full list.
// Usage: <HangoutBar :hangout="store.hangout" :members="store.members" current="transport" />
// (current = the route name of the page you're on)
import { computed, ref } from 'vue'
import MemberAvatar from '@/components/voting/MemberAvatar.vue'

const props = defineProps({
  hangout: { type: Object, required: true }, // needs id, name, starts_at, invite_code
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

// Which step we're on: steps before it get a tick, the current one is highlighted
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

// Phones: the full step list stays folded until "All steps" is tapped
const showAllSteps = ref(false)

// Invite: copy the hangout's link. Friends who open it log in and join this hangout.
const inviteCopied = ref(false)

async function copyInvite() {
  const link = `${window.location.origin}/login?invite=${props.hangout.invite_code}`
  try {
    await navigator.clipboard.writeText(link)
    inviteCopied.value = true
    setTimeout(() => {
      inviteCopied.value = false
    }, 2000)
  } catch (error) {
    // some browsers block copying: show the link so it can be copied by hand
    console.error(error)
    window.prompt('Copy this invite link:', link)
  }
}
</script>

<template>
  <header class="hangout-bar" :class="{ 'is-open': showAllSteps }">
    <div class="bar-inner">
      <div class="title-block">
        <p class="hangout-name">{{ hangout.name }}</p>
        <p class="hangout-date">{{ startsAt }}</p>
      </div>

      <ol id="hangout-steps" class="steps" aria-label="Hangout steps">
        <template v-for="(step, i) in STEPS" :key="step.route">
          <li v-if="startsGroup(i)" class="step-group" aria-hidden="true">{{ step.group }}</li>
          <li class="step" :class="{ current: i === currentIndex, done: i < currentIndex }">
            <RouterLink
              :to="{ name: step.route, params: { id: hangout.id } }"
              class="step-link"
              :aria-current="i === currentIndex ? 'step' : null"
            >
              <span class="step-num">
                <svg
                  v-if="i < currentIndex"
                  aria-hidden="true"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <path
                    d="M5 12.5l4.5 4.5L19 7.5"
                    stroke="currentColor"
                    stroke-width="3"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
                <template v-else>{{ i + 1 }}</template>
              </span>
              {{ step.label }}
            </RouterLink>
          </li>
        </template>
      </ol>

      <!-- Phones: which step this is, a six-segment bar, and "All steps" to open the list -->
      <div v-if="currentIndex !== -1" class="step-compact">
        <p class="step-compact-label">
          <span class="fp-eyebrow">Step {{ currentIndex + 1 }} of {{ STEPS.length }} · </span>
          <span class="step-compact-name">{{ STEPS[currentIndex].label }}</span>
        </p>
        <button
          type="button"
          class="all-steps"
          aria-controls="hangout-steps"
          :aria-expanded="showAllSteps"
          @click="showAllSteps = !showAllSteps"
        >
          {{ showAllSteps ? 'Hide steps' : 'All steps' }}
        </button>
        <div class="segments" aria-hidden="true">
          <span
            v-for="(step, i) in STEPS"
            :key="step.route"
            :class="{ done: i < currentIndex, current: i === currentIndex }"
          ></span>
        </div>
      </div>

      <div class="bar-end">
        <div class="avatar-stack" :aria-label="`${members.length} members`">
          <MemberAvatar
            v-for="m in members"
            :key="m.user_id"
            :name="m.display_name"
            :color="m.avatar_color"
            :size="34"
          />
        </div>
        <button
          v-if="hangout.id !== 'demo'"
          type="button"
          class="btn btn-primary invite-btn"
          title="Copy the invite link for people who aren't your friends yet"
          @click="copyInvite"
        >
          {{ inviteCopied ? 'Link copied!' : 'Invite' }}
        </button>
      </div>
    </div>
  </header>
</template>

<style scoped>
.hangout-bar {
  background: var(--fp-surface);
  border-bottom: 1px solid var(--fp-border);
}

/* Desktop: name · steps · avatars + Invite on one row */
.bar-inner {
  display: grid;
  grid-template-columns: auto 1fr auto;
  grid-template-areas: 'title steps end';
  align-items: center;
  gap: 1rem 2rem;
  max-width: 1360px;
  margin: 0 auto;
  padding: 1.35rem clamp(1rem, 2.8vw, 2.5rem);
}

.title-block {
  grid-area: title;
  min-width: 0;
}

.hangout-name {
  margin: 0;
  font-family: var(--fp-display);
  font-weight: 700;
  font-size: 1.375rem;
  letter-spacing: -0.01em;
  line-height: 1.2;
}

.hangout-date {
  margin: 0.15rem 0 0;
  color: var(--fp-muted);
  font-size: 0.95rem;
}

.steps {
  grid-area: steps;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 0.5rem 0.9rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

/* "GET THERE", "CHOOSE", "DECIDE" only when there's room for them on one row */
.step-group {
  display: none;
  margin-left: 0.4rem;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--fp-faint);
}

.step-link {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 44px;
  color: var(--fp-muted);
  font-size: 0.9375rem;
  font-weight: 500;
  text-decoration: none;
  white-space: nowrap;
}

.step-link:hover {
  color: var(--fp-ink);
}

.step-num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1.5px solid var(--fp-chip-line);
  background: var(--fp-bg);
  color: var(--fp-faint);
  font-family: var(--fp-display);
  font-weight: 800;
  font-size: 1rem;
}

.step.done .step-link {
  color: var(--fp-ink);
}

.step.done .step-num {
  border: 0;
  background: var(--fp-primary);
  color: var(--fp-bg);
}

.step.current .step-link {
  color: var(--fp-ink);
  font-weight: 700;
}

.step.current .step-num {
  border: 0;
  background: var(--fp-ink);
  color: var(--fp-bg);
}

.bar-end {
  grid-area: end;
  display: flex;
  align-items: center;
  gap: 0.9rem;
}

.avatar-stack {
  display: flex;
  padding-left: 8px;
}

.avatar-stack > * {
  margin-left: -8px;
  border: 2px solid var(--fp-surface);
}

.invite-btn {
  white-space: nowrap;
}

.step-compact {
  display: none;
}

@media (min-width: 1500px) {
  .step-group {
    display: list-item;
    list-style: none;
  }
}

/* Tablet: name + Invite on top, the steps scroll sideways underneath */
@media (max-width: 1199.98px) {
  .bar-inner {
    grid-template-columns: 1fr auto;
    grid-template-areas:
      'title end'
      'steps steps';
    gap: 0.6rem 1rem;
    padding-block: 1.1rem 0.5rem;
  }

  .steps {
    flex-wrap: nowrap;
    justify-content: flex-start;
    overflow-x: auto;
    padding-bottom: 0.4rem;
  }
}

/* Phones: Step x of 6 and a six-segment bar; the full list opens on demand */
@media (max-width: 767.98px) {
  .bar-inner {
    grid-template-areas:
      'title end'
      'compact compact'
      'steps steps';
    padding: 0.9rem 1rem 1rem;
    gap: 0.75rem;
  }

  .hangout-name {
    font-size: 1.125rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .hangout-date {
    font-size: 0.8rem;
  }

  .avatar-stack {
    display: none;
  }

  .steps {
    display: none;
    flex-direction: column;
    align-items: stretch;
    gap: 0;
    overflow: visible;
  }

  .is-open .steps {
    display: flex;
  }

  .step-compact {
    grid-area: compact;
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: baseline;
    gap: 0.6rem;
  }

  .step-compact-label {
    margin: 0;
  }

  .step-compact-name {
    font-family: var(--fp-display);
    font-weight: 800;
    font-size: 1.2rem;
  }

  .all-steps {
    min-height: 44px;
    padding: 0;
    border: 0;
    background: none;
    color: var(--fp-primary);
    font-size: 0.85rem;
    font-weight: 700;
  }

  .segments {
    grid-column: 1 / -1;
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: 4px;
  }

  .segments span {
    height: 6px;
    border-radius: 6px;
    background: var(--fp-chip-line);
  }

  .segments .done {
    background: var(--fp-primary);
  }

  .segments .current {
    background: var(--fp-ink);
  }
}
</style>
