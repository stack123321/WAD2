<script setup>
// 12 Final plan & itinerary
// Owner: Eashvar (routes section: Nicole) · Vet by: Ryan
// Figma frame "12". The spot is the page's headline: the confirmed spot (or, before the vote
// closes, the current leader with a "not confirmed yet" note), everyone's trip and leave-by time with the fairness gap, the backup
// spot, a Google Calendar link, a copy-to-clipboard summary, and the host's "Mark as done", which
// only works once the hangout has started. "Me" follows the same demo-mode rule as 11, and only
// current members' latest votes count. Surya's MembersMap shows everyone's starting point and
// his WeatherCard the forecast at the spot for the hangout's time; a box holds space for
// Nicole's routes.
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useHangoutStore } from '@/stores/hangout'
import { useAuthStore } from '@/stores/auth'
import { isMockHangout, markHangoutDone } from '@/services/votes'
import TripTable from '@/components/voting/TripTable.vue'
import MembersMap from '@/components/map/MembersMap.vue'
import WeatherCard from '@/components/weather/WeatherCard.vue'
import {
  calendarUrl,
  countableVotes,
  countVotes,
  formatDateTime,
  formatTime,
  leaveBy,
  modeLabel,
  pickLeader,
  runnerUp,
  tripRange,
} from '@/components/voting/voteHelpers'

const route = useRoute()
const store = useHangoutStore()
const auth = useAuthStore()

const hangoutId = route.params.id
const isMock = isMockHangout(hangoutId)

const copyMessage = ref('')
const copyFailed = ref(false)
const actionError = ref('')
const markingDone = ref(false)
const now = ref(Date.now())

let timer = null

const hangout = computed(() => store.hangout)
const status = computed(() => hangout.value?.status)
const startsAt = computed(() => hangout.value?.starts_at ?? null)
const hasStarted = computed(
  () => startsAt.value !== null && new Date(startsAt.value).getTime() <= now.value,
)

const myId = computed(() => auth.user?.id ?? (isMock ? (hangout.value?.host_id ?? null) : null))
const isHost = computed(() => myId.value !== null && myId.value === hangout.value?.host_id)

const rows = computed(() => countVotes(store.shortlist, countableVotes(store.votes, store.members)))
const confirmedSpot = computed(
  () => store.shortlist.find((s) => s.id === hangout.value?.final_shortlist_id) ?? null,
)
const isConfirmed = computed(() => confirmedSpot.value !== null)
const spot = computed(() => confirmedSpot.value ?? pickLeader(rows.value)?.spot ?? null)
const spotVotes = computed(() => rows.value.find((r) => r.spot.id === spot.value?.id)?.count ?? 0)

const backup = computed(() =>
  spot.value ? (runnerUp(rows.value, spot.value.id)?.spot ?? null) : null,
)

const weatherPlace = computed(() => {
  const lat = spot.value?.lat ?? hangout.value?.midpoint_lat
  const lng = spot.value?.lng ?? hangout.value?.midpoint_lng
  if (lat == null || lng == null) return null
  return { lat, lng, name: hangout.value?.midpoint_name ?? spot.value.name }
})

const calendarLink = computed(() => {
  if (!startsAt.value || !spot.value) return null
  return calendarUrl({
    title: `${hangout.value.name} at ${spot.value.name}`,
    startIso: startsAt.value,
    location: `${spot.value.name}, ${hangout.value.midpoint_name ?? 'Singapore'}`,
    details: backup.value ? `Backup plan: ${backup.value.name}` : 'Planned with Fairpoint',
  })
})

const summary = computed(() => {
  if (!hangout.value || !spot.value) return ''
  const lines = [hangout.value.name]
  if (startsAt.value) lines.push(`${formatDateTime(startsAt.value)} (SGT)`)
  lines.push(`Where: ${spot.value.name}, ${hangout.value.midpoint_name ?? ''}`.trim(), '')
  lines.push('Leave by:')
  for (const m of store.members) {
    if (m.travel_mins == null || !startsAt.value) continue
    const at = formatTime(leaveBy(startsAt.value, m.travel_mins))
    lines.push(`- ${m.display_name}: ${at} (${m.travel_mins} min by ${modeLabel(m.mode)})`)
  }
  const range = tripRange(store.members)
  if (range) lines.push('', `Everyone's trip is within ${range.gap} min of each other.`)
  if (backup.value) lines.push(`Backup: ${backup.value.name}`)
  return lines.join('\n')
})

let copyTimer = null

async function copyPlan() {
  clearTimeout(copyTimer)
  try {
    await navigator.clipboard.writeText(summary.value)
    copyFailed.value = false
    copyMessage.value = 'Plan copied. Paste it into your group chat.'
    copyTimer = setTimeout(() => {
      copyMessage.value = ''
    }, 3000)
  } catch {
    copyFailed.value = true
    copyMessage.value = "Couldn't copy automatically. Select the text below and copy it instead."
  }
}

async function markDone() {
  if (!hasStarted.value) {
    actionError.value = 'The hangout hasn’t started yet, so it can’t be marked as done.'
    return
  }
  markingDone.value = true
  actionError.value = ''
  try {
    await markHangoutDone(hangoutId)
    store.hangout.status = 'done'
  } catch (e) {
    actionError.value = `Couldn't mark the hangout as done: ${e.message}`
  } finally {
    markingDone.value = false
  }
}

onMounted(() => {
  timer = setInterval(() => {
    now.value = Date.now()
  }, 60000)
  store.load(hangoutId)
})

onUnmounted(() => clearInterval(timer))
</script>

<template>
  <main class="plan-page">
    <div v-if="store.loading" class="text-center py-5">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Loading the plan…</span>
      </div>
    </div>

    <div v-else-if="store.error" class="alert alert-danger" role="alert">
      Couldn't load this hangout. {{ store.error.message }}
    </div>

    <template v-else-if="hangout && !spot">
      <h1 class="plan-empty-title">No plan yet.</h1>
      <p class="plan-meta">Nothing has been shortlisted yet, so there's no plan to show.</p>
    </template>

    <template v-else-if="hangout">
      <div v-if="actionError" class="alert alert-danger" role="alert">{{ actionError }}</div>

      <section class="plan-hero" aria-labelledby="spot-heading">
        <p v-if="status === 'done'" class="fp-status fp-status--ok mb-0">Done</p>
        <p v-else-if="isConfirmed" class="fp-status fp-status--ok mb-0">
          Confirmed spot · {{ spotVotes }} of {{ store.members.length }} votes
        </p>
        <p v-else class="fp-status mb-0">Not confirmed yet</p>

        <h1 id="spot-heading" class="plan-title">
          {{ spot.name }}<span aria-hidden="true">.</span>
        </h1>
        <p class="plan-meta">
          <strong v-if="startsAt">{{ formatDateTime(startsAt) }}</strong>
          <template v-if="startsAt"> SGT · </template>
          <span class="text-capitalize">{{ spot.category }}</span>
          <template v-if="spot.rating">
            ·
            <svg
              class="star"
              aria-hidden="true"
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="currentColor"
            >
              <path
                d="M3.6 15.3c-.4.2-.8-.2-.7-.6l.8-4.7L.3 6.7c-.3-.3-.2-.9.3-.9l4.7-.7L7.4.8c.2-.4.8-.4 1 0l2.1 4.3 4.7.7c.5 0 .6.6.3.9l-3.4 3.3.8 4.7c.1.4-.3.8-.7.6L8 13.1z"
              /></svg
            ><span class="visually-hidden">Rating</span>
            {{ spot.rating }}
          </template>
          <template v-if="hangout.midpoint_name"> · {{ hangout.midpoint_name }}</template>
        </p>
        <p v-if="!isConfirmed" class="plan-note">
          The host hasn't closed the vote, so this is the spot with the most votes so far.
        </p>

        <div class="plan-actions">
          <button type="button" class="btn btn-secondary btn-lg" @click="copyPlan">
            Copy plan
          </button>
          <a
            v-if="calendarLink"
            class="btn btn-primary btn-lg"
            :href="calendarLink"
            target="_blank"
            rel="noopener"
          >
            Add to Google Calendar
          </a>
        </div>
        <div
          v-if="copyMessage"
          class="alert copy-alert"
          :class="copyFailed ? 'alert-warning' : 'alert-success'"
          role="status"
        >
          {{ copyMessage }}
        </div>
        <div v-if="copyFailed && copyMessage" class="copy-fallback">
          <label for="plan-text" class="form-label">Plan text</label>
          <textarea
            id="plan-text"
            class="form-control"
            rows="8"
            readonly
            :value="summary"
          ></textarea>
        </div>
      </section>

      <div class="plan-body">
        <div class="plan-main">
          <TripTable :members="store.members" :starts-at="startsAt" :my-id="myId" />

          <section class="panel" aria-labelledby="map-heading">
            <h2 id="map-heading" class="panel-title">Where everyone's coming from</h2>
            <div class="map-frame">
              <MembersMap :members="store.members" :highlight-id="myId" />
            </div>
          </section>
        </div>

        <aside class="plan-aside">
          <WeatherCard
            v-if="weatherPlace"
            :lat="weatherPlace.lat"
            :lng="weatherPlace.lng"
            :place="weatherPlace.name"
            :at="startsAt"
          />

          <section class="panel" aria-labelledby="backup-heading">
            <h2 id="backup-heading" class="side-title">Backup plan</h2>
            <div v-if="backup" class="backup">
              <span class="backup-tile" aria-hidden="true">{{ backup.name.charAt(0) }}</span>
              <div>
                <p class="backup-name">{{ backup.name }}</p>
                <p class="small-muted">The runner-up, in case {{ spot.name }} is full or closed.</p>
              </div>
            </div>
            <p v-else class="small-muted mt-2">There was only one spot, so there's no backup.</p>
          </section>

          <section
            v-if="isHost && status === 'confirmed'"
            class="panel"
            aria-labelledby="done-heading"
          >
            <h2 id="done-heading" class="side-title">After the hangout</h2>
            <button
              type="button"
              class="btn btn-primary w-100 done-btn"
              :disabled="markingDone || !hasStarted"
              @click="markDone"
            >
              Mark as done
            </button>
            <p v-if="!hasStarted" class="small-muted text-center mt-2">
              You can mark it done once the hangout has started.
            </p>
          </section>
        </aside>
      </div>

      <nav class="plan-back" aria-label="Next step">
        <RouterLink class="back-link" :to="{ name: 'dashboard' }">Back to my hangouts</RouterLink>
      </nav>
    </template>
  </main>
</template>

<style scoped>
.plan-page {
  max-width: 1360px;
  margin: 0 auto;
  padding: 4rem clamp(1rem, 2.8vw, 2.5rem) 6rem;
}

/* The spot is the headline, centred, with the two actions right under it */
.plan-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1.5rem 0 3.5rem;
  text-align: center;
}

.plan-title {
  margin: 1.25rem 0 0;
  font-size: clamp(3.25rem, 9vw, 9.25rem);
  line-height: 0.92;
  letter-spacing: -0.03em;
  overflow-wrap: anywhere;
}

.plan-empty-title {
  margin: 0 0 1rem;
}

.plan-meta {
  margin: 1.4rem 0 0;
  color: var(--fp-muted);
  font-size: 1.3rem;
}

.plan-meta strong {
  color: var(--fp-ink);
}

.plan-note {
  margin: 0.75rem 0 0;
  color: var(--fp-muted);
  font-size: 1rem;
}

.plan-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.6rem;
  margin-top: 2rem;
}

.copy-alert {
  margin: 1.25rem 0 0;
}

.copy-fallback {
  width: min(100%, 520px);
  margin-top: 1rem;
  text-align: left;
}

.plan-body {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 1.5rem;
}

.plan-main {
  flex: 999 1 640px;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.plan-aside {
  flex: 1 1 340px;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.panel {
  padding: 1.75rem;
  border: 1px solid var(--fp-border);
  border-radius: var(--fp-radius-lg);
}

.panel-title {
  margin: 0 0 1rem;
  font-size: 1.75rem;
}

.map-frame {
  height: 18rem;
  border-radius: var(--fp-radius-sm);
  overflow: hidden;
}

.backup {
  display: flex;
  align-items: center;
  gap: 0.9rem;
  margin-top: 0.6rem;
}

.backup-tile {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 52px;
  height: 52px;
  border-radius: var(--fp-radius-sm);
  background: var(--fp-surface);
  color: var(--fp-muted);
  font-family: var(--fp-display);
  font-weight: 800;
  font-size: 1.5rem;
}

.side-title {
  margin: 0;
  font-size: 1.15rem;
}

.backup-name {
  margin: 0;
  font-weight: 600;
  font-size: 1.0625rem;
}

.star {
  vertical-align: -1px;
}

.small-muted {
  margin-bottom: 0;
  color: var(--fp-muted);
  font-size: 0.875rem;
}

.done-btn {
  margin-top: 0.75rem;
  min-height: 52px;
}

.plan-back {
  margin-top: 3.5rem;
  text-align: center;
}

.back-link {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  font-weight: 700;
  text-decoration: none;
}
</style>
