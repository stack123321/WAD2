<script setup>
// 04 my hangouts
// Owner: Ryan · Vet by: Eashvar
import { ref, computed, onMounted } from 'vue'
import { deleteHangout, getMyHangouts, leaveHangout, setPinned } from '@/services/hangouts'
import { useAuthStore } from '@/stores/auth'
import HangoutCard from '@/components/dashboard/HangoutCard.vue'
import CrowdsNow from '@/components/heatmap/CrowdsNow.vue'
import HangoutWith from '@/components/dashboard/HangoutWith.vue'
import WeekForecast from '@/components/weather/WeekForecast.vue'

const hangouts = ref([])
const loading = ref(false)
const error = ref('')
const tab = ref('upcoming') // which list is showing, 'upcoming' or 'past'
const auth = useAuthStore()

// the name they typed at sign up, or '' if nobody is logged in
const name = computed(() => {
  if (!auth.user) return ''
  return auth.user.user_metadata.display_name || ''
})

// "Hey Ryan." or just "Hey there." when we don't know the name
const heading = computed(() => (name.value ? `Hey ${name.value}.` : 'Hey there.'))

const upcoming = computed(() => hangouts.value.filter((h) => h.status !== 'done'))
const past = computed(() => hangouts.value.filter((h) => h.status === 'done'))
const pinError = ref('')

// pinned ones first, the rest keep their order
const shown = computed(() => {
  const list = tab.value === 'upcoming' ? upcoming.value : past.value
  return list.filter((h) => h.pinned).concat(list.filter((h) => !h.pinned))
})

async function onTogglePin(hangout) {
  pinError.value = ''
  hangout.pinned = !hangout.pinned // show the change right away
  try {
    if (auth.user !== null) {
      await setPinned(hangout.id, auth.user.id, hangout.pinned)
    }
  } catch (err) {
    console.error(err)
    hangout.pinned = !hangout.pinned // saving failed, so put it back
    pinError.value = `Couldn't update the pin on "${hangout.name}".`
  }
}

// deleting (host) or leaving (other members) a hangout
const deleteError = ref('')

function isHost(hangout) {
  return auth.user !== null && hangout.host_id === auth.user.id
}

// logged in, in the hangout, but not the host
function isMember(hangout) {
  return auth.user !== null && !isHost(hangout)
}

async function onLeave(hangout) {
  deleteError.value = ''
  const sure = window.confirm(
    `Leave "${hangout.name}"? Your starting point and vote will be removed. You can rejoin with the invite link.`,
  )
  if (!sure) {
    return
  }
  try {
    await leaveHangout(hangout.id, auth.user.id)
    hangouts.value = hangouts.value.filter((h) => h.id !== hangout.id)
  } catch (err) {
    console.error(err)
    deleteError.value = `Couldn't leave "${hangout.name}": ${err.message}`
  }
}

async function onDelete(hangout) {
  deleteError.value = ''
  const sure = window.confirm(
    `Delete "${hangout.name}"? Everyone's starting points and votes for it will be deleted too. This can't be undone.`,
  )
  if (!sure) {
    return
  }
  try {
    await deleteHangout(hangout.id)
    hangouts.value = hangouts.value.filter((h) => h.id !== hangout.id)
  } catch (err) {
    console.error(err)
    deleteError.value = `Couldn't delete "${hangout.name}": ${err.message}`
  }
}

onMounted(async () => {
  loading.value = true
  try {
    hangouts.value = await getMyHangouts()
    // my pin is saved on my own member row of each hangout
    for (let h of hangouts.value) {
      h.pinned = false
      for (let m of h.members) {
        if (auth.user !== null && m.user_id === auth.user.id && m.pinned) {
          h.pinned = true
        }
      }
    }
  } catch (err) {
    console.log(err)
    error.value = 'Could not load your hangouts.'
  }
  loading.value = false
})
</script>

<template>
  <main class="dash">
    <h1 class="dash-title">{{ heading }}</h1>
    <p class="dash-sub">
      You have {{ upcoming.length }} {{ upcoming.length === 1 ? 'hangout' : 'hangouts' }} in
      progress.
    </p>

    <div class="dash-body">
      <div class="dash-main">
        <section class="plan-banner">
          <div class="plan-copy">
            <h2 class="plan-title">Plan a new hangout.</h2>
            <p class="plan-text">Invite friends, find a fair midpoint and vote on what to do.</p>
          </div>
          <router-link :to="{ name: 'create-hangout' }" class="btn btn-light btn-lg plan-btn">
            Start planning
          </router-link>
        </section>

        <div class="list-head">
          <h2 class="list-title">Your hangouts</h2>
          <div class="segmented" role="group" aria-label="Show upcoming or past hangouts">
            <button
              type="button"
              :class="{ on: tab === 'upcoming' }"
              :aria-pressed="tab === 'upcoming'"
              @click="tab = 'upcoming'"
            >
              Upcoming
            </button>
            <button
              type="button"
              :class="{ on: tab === 'past' }"
              :aria-pressed="tab === 'past'"
              @click="tab = 'past'"
            >
              Past
            </button>
          </div>
        </div>

        <p v-if="loading" class="text-muted">Loading your hangouts…</p>
        <p v-else-if="error" class="text-danger">{{ error }}</p>
        <p v-else-if="shown.length === 0" class="text-muted">
          {{
            tab === 'upcoming'
              ? 'No hangouts yet. Start planning one above!'
              : 'No past hangouts yet.'
          }}
        </p>

        <p v-if="deleteError" class="text-danger" role="alert">{{ deleteError }}</p>
        <p v-if="pinError" class="text-danger" role="alert">{{ pinError }}</p>

        <HangoutCard
          v-for="h in shown"
          :key="h.id"
          :hangout="h"
          :can-delete="isHost(h)"
          :can-leave="isMember(h)"
          @delete="onDelete"
          @leave="onLeave"
          @toggle-pin="onTogglePin"
        />
      </div>

      <aside class="dash-aside">
        <HangoutWith class="side-card" />
        <WeekForecast class="side-card" />
        <CrowdsNow class="side-card" />
      </aside>
    </div>
  </main>
</template>

<style scoped>
.dash {
  max-width: 1280px;
  margin: 0 auto;
  padding: 4.5rem clamp(1rem, 4vw, 3rem) 7.5rem;
}

.dash-title {
  margin: 0;
  font-size: clamp(3.5rem, 8vw, 6.5rem);
  line-height: 0.95;
  letter-spacing: -0.025em;
}

.dash-sub {
  margin: 1rem 0 0;
  color: var(--fp-muted);
  font-size: 1.25rem;
}

.dash-body {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 2rem;
  margin-top: 3.5rem;
}

.dash-main {
  flex: 999 1 620px;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.dash-aside {
  flex: 1 1 320px;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* The side cards are outlined in a hairline, so the hangouts stay the grey panels */
.dash-aside .side-card {
  padding: 1.75rem;
  background: transparent;
  border: 1px solid var(--fp-border);
  border-radius: var(--fp-radius);
}

.dash-aside .side-card :deep(.card-body) {
  padding: 0;
}

/* The one black feature card: plan something new */
.plan-banner {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: flex-end;
  gap: 1.5rem;
  padding: clamp(1.75rem, 4vw, 3rem);
  background: var(--fp-ink);
  color: var(--fp-bg);
  border-radius: var(--fp-radius-lg);
}

.plan-copy {
  max-width: 460px;
}

.plan-title {
  margin: 0;
  color: var(--fp-bg);
  font-weight: 800;
  font-size: clamp(2rem, 3.6vw, 2.75rem);
  line-height: 1.05;
  letter-spacing: -0.02em;
}

.plan-text {
  margin: 0.75rem 0 0;
  color: var(--fp-on-dark-muted);
  font-size: 1.0625rem;
  line-height: 1.5;
}

.plan-btn {
  --bs-btn-bg: var(--fp-bg);
  --bs-btn-color: var(--fp-ink);
  --bs-btn-hover-bg: var(--fp-surface);
  --bs-btn-active-bg: var(--fp-surface);
}

.list-head {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin-top: 1.5rem;
}

.list-title {
  margin: 0;
  font-size: 2rem;
}

/* Upcoming / Past: a grey track with the chosen side in black */
.segmented {
  display: inline-flex;
  padding: 4px;
  background: var(--fp-surface);
  border-radius: var(--fp-radius-pill);
}

.segmented button {
  min-height: 44px;
  padding: 0 1.25rem;
  border: 0;
  border-radius: var(--fp-radius-pill);
  background: transparent;
  color: var(--fp-ink);
  font-weight: 700;
  font-size: 0.95rem;
}

.segmented button.on {
  background: var(--fp-ink);
  color: var(--fp-bg);
}

@media (prefers-reduced-motion: no-preference) {
  .segmented button {
    transition:
      background-color 160ms var(--fp-ease),
      color 160ms var(--fp-ease);
  }
}
</style>
