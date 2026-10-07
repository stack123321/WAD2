<script setup>
// 12 Final plan & itinerary
// Owner: Eashvar (routes section: Nicole) · Vet by: Ryan
// Figma frame "12". The confirmed spot, everyone's trip side by side (the fairness promise),
// leave-by times, calendar and share, the backup plan, and the host marks the hangout done.
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useHangoutStore } from '@/stores/hangout'
import { useAuthStore } from '@/stores/auth'
import { isMockHangout, markHangoutDone } from '@/services/votes'
import TripTable from '@/components/voting/TripTable.vue'
import {
  calendarUrl,
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

const hangout = computed(() => store.hangout)
const status = computed(() => hangout.value?.status)
const startsAt = computed(() => hangout.value?.starts_at ?? null)

// Same rule as 11 Group voting: in demo mode nobody is logged in, so "me" falls back to the
// host (Ryan in the mock) so "Mark as done" can be tried without keys.
const myId = computed(() => auth.user?.id ?? (isMock ? (hangout.value?.host_id ?? null) : null))
const isHost = computed(() => myId.value !== null && myId.value === hangout.value?.host_id)

// The spot: the host's confirmed choice, or (before the vote is closed) the current leader
const rows = computed(() => countVotes(store.shortlist, store.votes))
const confirmedSpot = computed(
  () => store.shortlist.find((s) => s.id === hangout.value?.final_shortlist_id) ?? null,
)
const isConfirmed = computed(() => confirmedSpot.value !== null)
const spot = computed(() => confirmedSpot.value ?? pickLeader(rows.value)?.spot ?? null)
const backup = computed(() =>
  spot.value ? (runnerUp(rows.value, spot.value.id)?.spot ?? null) : null,
)

const calendarLink = computed(() => {
  if (!startsAt.value || !spot.value) return null
  return calendarUrl({
    title: `${hangout.value.name} at ${spot.value.name}`,
    startIso: startsAt.value,
    location: `${spot.value.name}, ${hangout.value.midpoint_name ?? 'Singapore'}`,
    details: backup.value ? `Backup plan: ${backup.value.name}` : 'Planned with Fairpoint',
  })
})

// Plain-text plan for the group chat
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
  clearTimeout(copyTimer) // a second click shouldn't be hidden early by the first click's timer
  try {
    await navigator.clipboard.writeText(summary.value)
    copyFailed.value = false
    copyMessage.value = 'Plan copied. Paste it into your group chat.'
    copyTimer = setTimeout(() => {
      copyMessage.value = ''
    }, 3000)
  } catch {
    // Some browsers block the clipboard; the message stays and the text is shown to copy by hand
    copyFailed.value = true
    copyMessage.value = "Couldn't copy automatically. Select the text below and copy it instead."
  }
}

async function markDone() {
  markingDone.value = true
  actionError.value = ''
  try {
    await markHangoutDone(hangoutId)
    // Update the store ourselves, as 11 does after closing the vote (works in demo mode too)
    store.hangout.status = 'done'
  } catch (e) {
    actionError.value = `Couldn't mark the hangout as done: ${e.message}`
  } finally {
    markingDone.value = false
  }
}

// After 11 closes the vote the store already holds the result, so this doesn't fetch again
onMounted(() => store.load(hangoutId))
</script>

<template>
  <main class="container py-4">
    <header class="mb-4">
      <p v-if="hangout" class="eyebrow mb-1">{{ hangout.name }}</p>
      <h1 class="h2 mb-0">Final plan & itinerary</h1>
    </header>

    <div v-if="store.loading" class="text-center py-5">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Loading the plan…</span>
      </div>
    </div>

    <div v-else-if="store.error" class="alert alert-danger" role="alert">
      Couldn't load this hangout. {{ store.error.message }}
    </div>

    <div v-else-if="hangout && !spot" class="alert alert-info">
      Nothing has been shortlisted yet, so there's no plan to show.
    </div>

    <template v-else-if="hangout">
      <div v-if="actionError" class="alert alert-danger" role="alert">{{ actionError }}</div>

      <div class="row g-4">
        <div class="col-12 col-lg-7 d-flex flex-column gap-4">
          <section class="panel hero" aria-labelledby="spot-heading">
            <div class="d-flex justify-content-between align-items-start gap-2">
              <p class="label small mb-1">
                {{ isConfirmed ? 'Confirmed spot' : 'Current leader' }}
              </p>
              <span v-if="status === 'done'" class="badge done">✓ Done</span>
            </div>
            <h2 id="spot-heading" class="h4 mb-1">{{ spot.name }}</h2>
            <p class="muted mb-2">
              <span class="text-capitalize">{{ spot.category }}</span>
              <template v-if="spot.rating">
                · <span aria-hidden="true">★</span><span class="visually-hidden">Rating</span>
                {{ spot.rating }}
              </template>
              <template v-if="hangout.midpoint_name"> · {{ hangout.midpoint_name }}</template>
            </p>
            <p v-if="startsAt" class="mb-0">
              <strong>{{ formatDateTime(startsAt) }}</strong> SGT
            </p>
            <p v-if="!isConfirmed" class="not-confirmed small mt-3 mb-0">
              Not confirmed yet. The host hasn't closed the vote, so this is the spot with the most
              votes so far.
            </p>
          </section>

          <TripTable :members="store.members" :starts-at="startsAt" :my-id="myId" />

          <!-- Nicole: replace this box with the route list from components/transport/ -->
          <section class="owner-box" aria-labelledby="routes-heading">
            <h2 id="routes-heading" class="h6 mb-1">Getting there</h2>
            <p class="small mb-0">
              Each person's route. Coming from Nicole (<code>components/transport/</code>).
            </p>
          </section>
        </div>

        <div class="col-12 col-lg-5 d-flex flex-column gap-4">
          <div class="row g-3">
            <!-- Surya: replace these two boxes with the map and weather card -->
            <div class="col-12 col-md-6 col-lg-12">
              <section class="owner-box owner-box--tall h-100" aria-labelledby="map-heading">
                <h2 id="map-heading" class="h6 mb-1">Map</h2>
                <p class="small mb-0">Coming from Surya (<code>components/map/</code>).</p>
              </section>
            </div>
            <div class="col-12 col-md-6 col-lg-12">
              <section class="owner-box h-100" aria-labelledby="weather-heading">
                <h2 id="weather-heading" class="h6 mb-1">Weather</h2>
                <p class="small mb-0">Coming from Surya (<code>components/weather/</code>).</p>
              </section>
            </div>
          </div>

          <section class="panel" aria-labelledby="backup-heading">
            <h2 id="backup-heading" class="h6 mb-1">Backup plan</h2>
            <template v-if="backup">
              <p class="fw-semibold mb-0">{{ backup.name }}</p>
              <p class="small muted mb-0">
                The runner-up, in case {{ spot.name }} is full or closed.
              </p>
            </template>
            <p v-else class="small muted mb-0">There was only one spot, so there's no backup.</p>
          </section>

          <section class="panel" aria-labelledby="actions-heading">
            <h2 id="actions-heading" class="h6 mb-3">Save and share</h2>
            <div class="d-grid gap-2">
              <a
                v-if="calendarLink"
                class="btn btn-primary"
                :href="calendarLink"
                target="_blank"
                rel="noopener"
              >
                Add to Google Calendar
              </a>
              <button type="button" class="btn btn-outline-primary" @click="copyPlan">
                Copy plan
              </button>
              <button
                v-if="isHost && status === 'confirmed'"
                type="button"
                class="btn btn-outline-primary"
                :disabled="markingDone"
                @click="markDone"
              >
                Mark as done
              </button>
            </div>
            <div
              v-if="copyMessage"
              class="alert small mt-3 mb-0"
              :class="copyFailed ? 'alert-warning' : 'alert-success'"
              role="status"
            >
              {{ copyMessage }}
            </div>
            <template v-if="copyFailed && copyMessage">
              <label for="plan-text" class="form-label small fw-semibold mt-3">Plan text</label>
              <textarea
                id="plan-text"
                class="form-control small"
                rows="8"
                readonly
                :value="summary"
              ></textarea>
            </template>
          </section>
        </div>
      </div>

      <nav class="mt-4" aria-label="Next step">
        <RouterLink class="btn btn-link px-0" :to="{ name: 'dashboard' }">
          Back to my hangouts
        </RouterLink>
      </nav>
    </template>
  </main>
</template>

<style scoped>
.eyebrow {
  color: var(--fp-accent);
  font-weight: 700;
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.panel {
  background: var(--fp-surface);
  border: 1px solid var(--fp-border);
  border-radius: var(--fp-radius);
  box-shadow: var(--fp-shadow);
  padding: 1.25rem;
}

.hero {
  border-top: 4px solid var(--fp-primary);
}

.label {
  color: var(--fp-primary);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.muted {
  color: var(--fp-muted);
}

.not-confirmed {
  border-left: 3px solid var(--fp-accent);
  padding-left: 0.75rem;
  color: var(--fp-ink);
}

.done {
  background: var(--fp-primary);
  color: var(--fp-surface);
}

/* Labelled spaces for teammates' components that don't exist yet */
.owner-box {
  border: 2px dashed var(--fp-border);
  border-radius: var(--fp-radius);
  padding: 1.25rem;
  color: var(--fp-muted);
}

.owner-box--tall {
  min-height: 10rem;
}
</style>
