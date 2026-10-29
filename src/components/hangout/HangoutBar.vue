<script setup>
// Owner: Surya. The bar under the navbar on pages 06–12 (Figma): hangout name, date, the 6 steps
// with the current one highlighted, everyone's avatars, and an Invite button that copies the
// hangout's invite link (for people who aren't your friends yet). Each step links to its page.
// (Surya) A 💬 Chat button opens the group chat from any step, with the count of new messages.
// On 06 it opens 06's chat side panel (so the map stays in view), elsewhere the chat page.
// (Surya) The host also gets "✎ Details" before step 1 (‹ on step 1 on phones), which opens 05 in
// edit mode to change the name, date, time or vibe.
// Usage: <HangoutBar :hangout="store.hangout" :members="store.members" current="transport" />
// (current = the route name of the page you're on)
import { computed, ref } from 'vue'
import MemberAvatar from '@/components/voting/MemberAvatar.vue'
import { useAlertsStore } from '@/stores/alerts'
import { useAuthStore } from '@/stores/auth'

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

// Which step we're on: steps before it show a ✓, the current one is highlighted
const currentIndex = computed(() => {
  let current = props.current
  // 10 Spot details is part of the "Spots" step
  if (current === 'spot-details') {
    current = 'explore'
  }
  return STEPS.findIndex((step) => step.route === current)
})

// The steps either side of this one, for the ‹ › arrows (null at the first and last step)
const prevStep = computed(() => STEPS[currentIndex.value - 1] ?? null)

// (Surya) "✎ Details": only the host can change them (the demo counts as yours, like on 06)
const auth = useAuthStore()
const isHost = computed(() => {
  if (props.hangout.id.startsWith('demo')) {
    return true
  }
  return Boolean(auth.user) && props.hangout.host_id === auth.user.id
})
const onDetails = computed(() => props.current === 'edit-hangout')

// Back to the step you were on after saving (05 reads ?from=)
const detailsLink = computed(() => {
  const query = {}
  if (currentIndex.value !== -1) {
    query.from = STEPS[currentIndex.value].route
  }
  return { name: 'edit-hangout', params: { id: props.hangout.id }, query: query }
})
const nextStep = computed(() => STEPS[currentIndex.value + 1] ?? null)

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

// (Surya) Group chat: opens the chat page, which then offers "← Back to <this step>". On 06 it
// adds ?chat=1 to 06's own address instead, and 06 opens its chat panel
const alerts = useAlertsStore()
const unreadChat = computed(() => alerts.unreadIn(props.hangout.id))

const chatLink = computed(() => {
  if (props.current === 'starting-points') {
    return { name: 'starting-points', params: { id: props.hangout.id }, query: { chat: '1' } }
  }
  return { name: 'chat', params: { hangoutId: props.hangout.id }, query: { from: chatFrom.value } }
})

// The chat page only has a back button for steps, so 10 Spot details goes back as Spots
const chatFrom = computed(() => {
  if (props.current === 'spot-details') {
    return 'explore'
  }
  return props.current
})

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
  <header class="hangout-bar px-3 px-lg-5">
    <div class="name-group d-flex align-items-center gap-2 min-w-0">
      <span class="fw-bold text-truncate">{{ hangout.name }}</span>
      <span class="date-chip">{{ startsAt }}</span>
    </div>

    <ol class="steps d-none d-xl-flex">
      <!-- (Surya) host only: change the name, date, time or vibe -->
      <li v-if="isHost" class="details-step" :class="{ current: onDetails }">
        <RouterLink
          :to="detailsLink"
          class="step-link"
          :aria-current="onDetails ? 'page' : null"
          title="Hangout details: change the name, date or vibe"
          aria-label="Hangout details"
        >
          <span class="step-num" aria-hidden="true">✎</span>
          <span class="details-label">Details</span>
        </RouterLink>
      </li>
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

    <!-- Phones and tablets: the 6 steps don't fit, so say which step this is, with arrows to the steps either side -->
    <!-- (Surya) on Details itself: "✎ Details", with › to step 1 -->
    <div v-if="onDetails" class="step-nav d-flex d-xl-none align-items-center">
      <span class="step-arrow disabled" aria-hidden="true">‹</span>
      <span class="step-compact" aria-current="page">
        <span class="step-num" aria-hidden="true">✎</span>
        <span>Hangout details</span>
      </span>
      <RouterLink
        class="step-arrow"
        :to="{ name: STEPS[0].route, params: { id: hangout.id } }"
        :aria-label="`Next step: ${STEPS[0].label}`"
        >›</RouterLink
      >
    </div>

    <div v-if="currentIndex !== -1" class="step-nav d-flex d-xl-none align-items-center">
      <RouterLink
        v-if="prevStep"
        class="step-arrow"
        :to="{ name: prevStep.route, params: { id: hangout.id } }"
        :aria-label="`Previous step: ${prevStep.label}`"
        >‹</RouterLink
      >
      <!-- (Surya) step 1: ‹ goes to Details, for the host -->
      <RouterLink
        v-else-if="isHost"
        class="step-arrow"
        :to="detailsLink"
        aria-label="Previous: hangout details"
        >‹</RouterLink
      >
      <span v-else class="step-arrow disabled" aria-hidden="true">‹</span>

      <RouterLink
        class="step-compact"
        :to="{ name: STEPS[currentIndex].route, params: { id: hangout.id } }"
        aria-current="step"
      >
        <span class="step-num">{{ currentIndex + 1 }}</span>
        <span
          >Step {{ currentIndex + 1 }} of {{ STEPS.length }} · {{ STEPS[currentIndex].label }}</span
        >
      </RouterLink>

      <RouterLink
        v-if="nextStep"
        class="step-arrow"
        :to="{ name: nextStep.route, params: { id: hangout.id } }"
        :aria-label="`Next step: ${nextStep.label}`"
        >›</RouterLink
      >
      <span v-else class="step-arrow disabled" aria-hidden="true">›</span>
    </div>

    <div class="invite-group d-flex align-items-center gap-2">
      <div class="avatar-stack d-none d-md-flex" :aria-label="`${members.length} members`">
        <MemberAvatar
          v-for="m in members"
          :key="m.user_id"
          :name="m.display_name"
          :color="m.avatar_color"
          :size="30"
        />
      </div>
      <!-- (Surya) the group chat, from any step; red number = new messages -->
      <RouterLink
        class="chat-link"
        :to="chatLink"
        :aria-label="unreadChat > 0 ? `Group chat, ${unreadChat} new` : 'Group chat'"
      >
        <span aria-hidden="true">💬</span>
        <span class="chat-link__label">Chat</span>
        <span v-if="unreadChat > 0" class="chat-badge" aria-hidden="true">{{
          unreadChat > 9 ? '9+' : unreadChat
        }}</span>
      </RouterLink>
      <button
        v-if="hangout.id !== 'demo'"
        type="button"
        class="btn btn-outline-primary btn-sm invite-btn"
        title="Copy the invite link for people who aren't your friends yet"
        @click="copyInvite"
      >
        {{ inviteCopied ? 'Link copied!' : 'Invite' }}
      </button>
    </div>
  </header>
</template>

<style scoped>
/* (Surya) 💬 Chat: filled coral so it stands out; square with slightly rounded corners, like the
   app's other buttons */
.chat-link {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  min-height: 36px;
  padding: 0 0.75rem;
  border-radius: var(--fp-radius-sm);
  background: var(--fp-accent);
  color: var(--fp-ink);
  font-size: 0.875rem;
  font-weight: 700;
  text-decoration: none;
  white-space: nowrap;
}

.chat-link:hover {
  background: color-mix(in srgb, var(--fp-accent) 85%, #000);
  color: var(--fp-ink);
}

/* red count of new messages */
.chat-badge {
  position: absolute;
  top: -6px;
  right: -6px;
  min-width: 20px;
  height: 20px;
  padding: 0 5px;
  border: 2px solid var(--fp-surface);
  border-radius: 999px;
  background: #d93025;
  color: #fff;
  font-size: 0.7rem;
  line-height: 16px;
  text-align: center;
}

.invite-btn {
  min-height: 36px;
  white-space: nowrap;
}

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
  width: 24px; /* (Surya) was 32px, so the bar still fits on one line with Details */
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

/* (Surya) "✎ Details" before the steps, like a step without a number. Below 1440px the step bar
   only just fits on one line, so it's just the ✎ circle there (the link still says "Hangout
   details" to screen readers, and on hover) */
@media (max-width: 1439.98px) {
  .details-label {
    display: none;
  }
}

/* (Surya) laptops 1200–1439px: the full step list shows, so the avatars make way for Chat and
   Invite to stay on the same line (everyone is listed on each page anyway) */
@media (min-width: 1200px) and (max-width: 1439.98px) {
  .avatar-stack {
    display: none !important; /* over Bootstrap's d-md-flex */
  }
}

.details-step.current .step-link {
  color: var(--fp-ink);
  font-weight: 600;
}

.details-step.current .step-num {
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

.step-nav {
  gap: 0.25rem;
}

/* ‹ and › either side of "Step 3 of 6", big enough to tap */
.step-arrow {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  color: var(--fp-ink);
  font-size: 1.4rem;
  line-height: 1;
  text-decoration: none;
}

a.step-arrow:hover {
  background: var(--fp-bg);
}

.step-arrow.disabled {
  color: var(--fp-border); /* no step that way, but it keeps the label from shifting */
}

/* (Surya) phones and tablets: big enough to tap with a finger */
@media (max-width: 991.98px) {
  .chat-link {
    min-height: 44px;
  }
}

/* On phones the arrows make the step label too wide to sit beside Invite, so it gets its own line:
   name and Invite on top, then ‹ step › across the full width */
@media (max-width: 767.98px) {
  .name-group {
    order: 1;
    flex: 1 1 0; /* takes the space Invite leaves, and the name is cut with … if it is too long */
  }

  .invite-group {
    order: 2;
  }

  .step-nav {
    order: 3;
    flex: 1 1 100%;
    justify-content: space-between;
  }
}

.avatar-stack > * + * {
  margin-left: -8px;
}
</style>
