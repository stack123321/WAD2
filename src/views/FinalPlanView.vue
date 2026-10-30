<script setup>
// 12 Final plan & itinerary
// Owner: Eashvar (routes section: Nicole) · Vet by: Ryan
// Figma frame "12". Shows the confirmed spot (or, before the vote closes, the current leader with
// a "not confirmed yet" note), everyone's trip and leave-by time with the fairness gap, the backup
// spot, a Google Calendar link, a copy-to-clipboard summary, and the host's "Mark as done", which
// only works once the hangout has started. "Me" follows the same demo-mode rule as 11, and only
// current members' latest votes count. Surya's MembersMap shows everyone's starting point and
// his WeatherCard the forecast at the spot for the hangout's time (until the hangout starts); a
// line under the map holds space for Nicole's routes. (Design catalogue A1) The band says the
// answer ("You're going to …") with when, your leave-by time and the gap. On phones the cards reorder so the map
// comes straight after the spot.
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useHangoutStore } from '@/stores/hangout'
import { useAuthStore } from '@/stores/auth'
import { isMockHangout, markHangoutDone } from '@/services/votes'
import PageBand from '@/components/ui/PageBand.vue'
import SpotHero from '@/components/voting/SpotHero.vue'
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
const backup = computed(() =>
  spot.value ? (runnerUp(rows.value, spot.value.id)?.spot ?? null) : null,
)

// "You leave by" on the spot card, for the person looking
const myLeave = computed(() => {
  const me = store.members.find((m) => m.user_id === myId.value)
  if (!me || me.travel_mins == null || !startsAt.value) return null
  return { at: formatTime(leaveBy(startsAt.value, me.travel_mins)), from: me.start_label ?? null }
})

// The band: the answer in words, then when / you leave by / the gap
const bandTitle = computed(() => {
  if (!spot.value) return 'Final plan & itinerary'
  return isConfirmed.value ? `You're going to ${spot.value.name}` : `So far it's ${spot.value.name}`
})
const range = computed(() => tripRange(store.members))

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
  <main>
    <PageBand :title="bandTitle">
      <dl v-if="spot && (startsAt || myLeave || range)" class="ticket">
        <div v-if="startsAt">
          <dt>When</dt>
          <dd>{{ formatDateTime(startsAt) }}</dd>
        </div>
        <div v-if="myLeave">
          <dt>You leave by</dt>
          <dd class="ticket__you">
            {{ myLeave.at }}
            <span v-if="myLeave.from" class="ticket__from">from {{ myLeave.from }}</span>
          </dd>
        </div>
        <div v-if="range">
          <dt>Fair for everyone</dt>
          <dd>{{ range.gap }} min gap</dd>
        </div>
      </dl>
    </PageBand>

    <div class="container fp-pull">
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

        <div class="plan-layout">
          <div class="plan-col">
            <SpotHero
              class="slot-hero"
              :spot="spot"
              :label="isConfirmed ? 'Confirmed spot' : 'Current leader'"
              :area="hangout.midpoint_name"
            >
              <p v-if="!isConfirmed" class="not-confirmed small mt-3 mb-0">
                Not confirmed yet. The host hasn't closed the vote, so this is the spot with the
                most votes so far.
              </p>
              <p v-if="status === 'done'" class="done-row mt-3 mb-0">
                <span class="badge done">✓ Done</span>
                <RouterLink :to="{ name: 'debrief', params: { id: hangoutId } }">
                  See how it went →
                </RouterLink>
              </p>
            </SpotHero>

            <TripTable
              class="slot-trips"
              :members="store.members"
              :starts-at="startsAt"
              :my-id="myId"
            />

            <section class="panel backup slot-backup" aria-labelledby="backup-heading">
              <div class="backup__thumb" aria-hidden="true">
                {{ backup ? backup.name.trim().charAt(0).toUpperCase() : '–' }}
              </div>
              <div>
                <h2 id="backup-heading" class="backup__label mb-0">Backup plan</h2>
                <template v-if="backup">
                  <p class="fw-semibold mb-0">{{ backup.name }}</p>
                  <p class="small muted mb-0">
                    The runner-up, in case {{ spot.name }} is full or closed.
                  </p>
                </template>
                <p v-else class="small muted mb-0">
                  There was only one spot, so there's no backup.
                </p>
              </div>
            </section>
          </div>

          <div class="plan-col">
            <section class="panel slot-map" aria-labelledby="map-heading">
              <h2 id="map-heading" class="panel-title mb-2">Where everyone's coming from</h2>
              <div class="map-frame">
                <MembersMap :members="store.members" :highlight-id="myId" />
              </div>
              <p class="small muted mt-2 mb-0">Step-by-step routes for everyone are coming soon.</p>
            </section>

            <WeatherCard
              v-if="weatherPlace && !hasStarted"
              class="slot-weather"
              :lat="weatherPlace.lat"
              :lng="weatherPlace.lng"
              :place="weatherPlace.name"
              :at="startsAt"
            />

            <section class="panel slot-share" aria-labelledby="actions-heading">
              <h2 id="actions-heading" class="panel-title mb-3">Save and share</h2>
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
                  :disabled="markingDone || !hasStarted"
                  @click="markDone"
                >
                  Mark as done
                </button>
              </div>
              <p
                v-if="isHost && status === 'confirmed' && !hasStarted"
                class="small muted mt-2 mb-0"
              >
                You can mark it done once the hangout has started.
              </p>
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
    </div>
  </main>
</template>

<style scoped>
/* the ticket in the band: when, you leave by, the gap */
.ticket {
  display: grid;
  grid-template-columns: repeat(3, auto);
  width: fit-content;
  max-width: 100%;
  margin: 1.25rem 0 0;
  border-radius: 18px;
  background: rgb(255 255 255 / 0.12);
}

.ticket > div {
  padding: 0.75rem 1.25rem;
}

.ticket > div + div {
  border-left: 1px dashed rgb(255 255 255 / 0.3);
}

.ticket dt {
  color: var(--fp-on-deep-muted);
  font-size: 0.875rem;
  font-weight: 500;
}

.ticket dd {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 800;
}

.ticket__you {
  color: var(--fp-on-deep-accent);
}

.ticket__from {
  color: var(--fp-on-deep);
  font-size: 0.875rem;
  font-weight: 500;
}

@media (max-width: 575.98px) {
  .ticket {
    grid-template-columns: 1fr;
    width: 100%;
  }

  .ticket > div + div {
    border-left: 0;
    border-top: 1px dashed rgb(255 255 255 / 0.3);
  }
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  min-height: 44px;
}

/* Phones: one column, cards in the order below (the columns step aside with display: contents).
   From lg: the spot, trips and backup on the left; the map, weather and actions on the right. */
.plan-layout {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.plan-col {
  display: contents;
}

.slot-hero {
  order: 1;
}

.slot-map {
  order: 2;
}

.slot-trips {
  order: 3;
}

.slot-weather {
  order: 4;
}

.slot-share {
  order: 5;
}

.slot-backup {
  order: 6;
}

@media (min-width: 992px) {
  .plan-layout {
    display: grid;
    grid-template-columns: 7fr 5fr;
    align-items: start;
  }

  .plan-col {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }
}

.panel {
  background: var(--fp-surface);
  border: 1px solid var(--fp-border);
  border-radius: var(--fp-radius);
  box-shadow: var(--fp-shadow);
  padding: 1.25rem;
}

.panel-title {
  font-size: 1rem;
  font-weight: 700;
}

.muted {
  color: var(--fp-muted);
}

.not-confirmed {
  border-left: 3px solid var(--fp-accent);
  padding-left: 0.75rem;
  color: var(--fp-ink);
}

.done-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 0.75rem;
}

.done-row a {
  font-weight: 600;
}

.done {
  background: var(--fp-primary);
  color: var(--fp-surface);
}

.backup {
  display: flex;
  align-items: center;
  gap: 0.9rem;
  padding: 1rem 1.25rem;
}

.backup__thumb {
  flex: none;
  width: 2.75rem;
  height: 2.75rem;
  display: grid;
  place-items: center;
  border-radius: var(--fp-radius-sm);
  background: var(--fp-bg);
  color: var(--fp-muted);
  font-weight: 800;
}

.backup__label {
  color: var(--fp-muted);
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.map-frame {
  height: 16rem;
  border-radius: var(--fp-radius-sm);
  overflow: hidden;
}
</style>
