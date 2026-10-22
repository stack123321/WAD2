<script setup>
// 04 my hangouts
// Owner: Ryan · Vet by: Eashvar
import { ref, computed, onMounted } from 'vue'
import { deleteHangout, getMyHangouts, leaveHangout, setPinned } from '@/services/hangouts'
import { useAuthStore } from '@/stores/auth'
import HangoutCard from '@/components/dashboard/HangoutCard.vue'
import WeekStrip from '@/components/dashboard/WeekStrip.vue'
import NeedsInputCard from '@/components/dashboard/NeedsInputCard.vue'
import { getHaze, getHourlyForecast } from '@/services/weather'
import { getStationCrowd } from '@/services/crowd'
import { sgDate, dayHeading } from '@/utils/dates'
import { getStatus } from '@/utils/hangoutStatus'

const hangouts = ref([])
const hours = ref([]) // hourly forecast, for the weather line on each card
const haze = ref(null) // today's haze reading, for the banner
const loading = ref(false)
const error = ref('')
const tab = ref('upcoming') // which list is showing, 'upcoming' or 'past'
const auth = useAuthStore()

const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
})

// the name they typed at sign up, or '' if nobody is logged in
const name = computed(() => {
  if (!auth.user) return ''
  return auth.user.user_metadata.display_name || ''
})

// "Good evening, Ryan!" or just "Good evening!" when don't know name
const heading = computed(() =>
  name.value ? `${greeting.value}, ${name.value}!` : `${greeting.value}!`,
)

const HALF_HOUR = 30 * 60 * 1000

// done, or its date is before today (no date set yet counts as upcoming)
function isPast(h, today) {
  if (h.status === 'done') return true
  if (!h.starts_at) return false
  return sgDate(new Date(h.starts_at)) < today
}

const upcoming = computed(() => {
  const today = sgDate(new Date())
  return hangouts.value.filter((h) => !isPast(h, today))
})
const past = computed(() => {
  const today = sgDate(new Date())
  return hangouts.value.filter((h) => isPast(h, today))
})
const pinError = ref('')

const MAX_PINS = 3
const NEEDS_CARD_MIN = 5 // the rail's "Needs your input" card only shows for a long list

// who is looking, null when nobody is logged in
const myId = computed(() => (auth.user ? auth.user.id : null))

// "4 being planned · 1 confirmed", and how many hangouts are waiting on you
const planned = computed(() => upcoming.value.filter((h) => h.status !== 'confirmed').length)
const confirmed = computed(() => upcoming.value.filter((h) => h.status === 'confirmed').length)
const needs = (h) => getStatus(h, myId.value).needsYou
const needCount = computed(() => upcoming.value.filter(needs).length)

// the amber chip filters the list to the hangouts waiting on you, click again to clear
const needsOnly = ref(false)
const filterOn = computed(() => tab.value === 'upcoming' && needsOnly.value && needCount.value > 0)

// every pinned hangout across Upcoming and Past, for the "2/3"
const pinCount = computed(() => hangouts.value.filter((h) => h.pinned).length)

// this tab's hangouts, most recent first on Past
const tabList = computed(() =>
  tab.value === 'upcoming' ? upcoming.value : [...past.value].reverse(),
)

// what is shown, after the "need your input" filter
const visible = computed(() => (filterOn.value ? tabList.value.filter(needs) : tabList.value))

// the soonest upcoming hangout that hasn't started yet, shown big on top (the list is already in date order)
// not on Past, and a hangout with no date can't be next
const upNext = computed(() => {
  if (tab.value !== 'upcoming') return null
  const now = new Date()
  return upcoming.value.find((h) => h.starts_at && new Date(h.starts_at) > now) ?? null
})

// what the sections below show: everything except the UP NEXT one
const rest = computed(() => visible.value.filter((h) => h.id !== upNext.value?.id))

// the page as sections of day groups, so the template needs one card tag
// [{ key, title, count, showDate, featured, groups: [{ key, main, sub, items }] }]
const sections = computed(() => {
  const result = []

  if (upNext.value && (!filterOn.value || needs(upNext.value))) {
    result.push({
      key: 'next',
      title: 'UP NEXT',
      count: '',
      showDate: true, // no day heading above it, so the details line carries the date
      featured: true,
      groups: [{ key: 'next', main: '', sub: '', items: [upNext.value] }],
    })
  }

  const pinned = rest.value.filter((h) => h.pinned)
  if (pinned.length > 0) {
    result.push({
      key: 'pinned',
      title: 'PINNED',
      count: `${pinCount.value}/${MAX_PINS}`,
      showDate: true, // no day heading above a pinned row, so its text line carries the date
      featured: false,
      groups: [{ key: 'pinned', main: '', sub: '', items: pinned }],
    })
  }

  // the rest, grouped under a day heading (the list is already in date order)
  const groups = []
  for (let h of rest.value.filter((x) => !x.pinned)) {
    const key = h.starts_at ? sgDate(new Date(h.starts_at)) : 'none'
    let group = groups[groups.length - 1]
    if (!group || group.key !== key) {
      const heading = h.starts_at
        ? dayHeading(new Date(h.starts_at))
        : { main: 'No date yet', sub: '' }
      group = { key: key, main: heading.main, sub: heading.sub, items: [] }
      groups.push(group)
    }
    group.items.push(h)
  }
  if (groups.length > 0) {
    result.push({
      key: 'rest',
      title: tab.value === 'upcoming' ? 'COMING UP' : 'PAST',
      count: '',
      showDate: false,
      featured: false,
      groups: groups,
    })
  }
  return result
})

async function onTogglePin(hangout) {
  pinError.value = ''
  if (!hangout.pinned && pinCount.value >= MAX_PINS) {
    pinError.value = `You can pin up to ${MAX_PINS} hangouts. Unpin one first.`
    return
  }
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

async function doLeave(hangout) {
  deleteError.value = ''
  try {
    await leaveHangout(hangout.id, auth.user.id)
    hangouts.value = hangouts.value.filter((h) => h.id !== hangout.id)
  } catch (err) {
    console.error(err)
    deleteError.value = `Couldn't leave "${hangout.name}": ${err.message}`
  }
}

async function doDelete(hangout) {
  deleteError.value = ''
  try {
    await deleteHangout(hangout.id)
    hangouts.value = hangouts.value.filter((h) => h.id !== hangout.id)
  } catch (err) {
    console.error(err)
    deleteError.value = `Couldn't delete "${hangout.name}": ${err.message}`
  }
}

// the card's menu item opens the confirm dialog (data-bs-toggle="modal") and tells us which one
const confirmAction = ref(null) // { kind: 'leave' | 'delete', hangout }

function askLeave(hangout) {
  confirmAction.value = { kind: 'leave', hangout: hangout }
}

function askDelete(hangout) {
  confirmAction.value = { kind: 'delete', hangout: hangout }
}

const confirmCopy = computed(() => {
  const a = confirmAction.value
  if (!a) return { title: '', text: '', button: '' }
  if (a.kind === 'leave') {
    return {
      title: `Leave "${a.hangout.name}"?`,
      text: 'Your starting point and vote will be removed. You can rejoin with the invite link.',
      button: 'Leave hangout',
    }
  }
  return {
    title: `Delete "${a.hangout.name}"?`,
    text: "Everyone's starting points and votes for it will be deleted too. This can't be undone.",
    button: 'Delete hangout',
  }
})

async function confirmNow() {
  const a = confirmAction.value
  if (!a) return
  confirmAction.value = null
  if (a.kind === 'leave') await doLeave(a.hangout)
  else await doDelete(a.hangout)
}

// the haze banner: shown once for the whole page, and stays closed for this visit once dismissed
const hazeDismissed = ref(false)
try {
  hazeDismissed.value = sessionStorage.getItem('fp-haze-dismissed') === '1'
} catch (err) {
  console.log(err) // storage can be blocked, the banner just shows again
}

const showHaze = computed(
  () => haze.value !== null && haze.value.tone === 'bad' && !hazeDismissed.value,
)

function dismissHaze() {
  hazeDismissed.value = true
  try {
    sessionStorage.setItem('fp-haze-dismissed', '1')
  } catch (err) {
    console.log(err)
  }
}

// weather for the cards: one forecast and one haze reading for the whole island, shared by every card

async function loadWeather() {
  // the weather is extra, so if it fails the cards just show no weather chip
  try {
    hours.value = await getHourlyForecast(1.3521, 103.8198)
  } catch (err) {
    console.log(err)
  }
  try {
    haze.value = await getHaze()
  } catch (err) {
    console.log(err)
  }
}

// crowd level at each hangout's midpoint station, { hangoutId: 'l' | 'm' | 'h' }
const crowds = ref({})

// only for hangouts starting within 30 minutes of now, the same window api/crowd.js treats as "now",
// so lta's live readings are used and its rate-limited forecast is never called from here
async function loadCrowds() {
  const now = new Date()
  for (let h of hangouts.value) {
    if (!h.midpoint_name || !h.starts_at || h.status === 'done') continue
    const start = new Date(h.starts_at)
    if (Math.abs(start - now) >= HALF_HOUR) continue
    try {
      const level = await getStationCrowd(h.midpoint_name, start)
      if (level) crowds.value[h.id] = level
    } catch (err) {
      console.log(err) // the crowd is extra, so no chip if it fails
    }
  }
}

onMounted(async () => {
  loadWeather() // not awaited, so the hangouts don't wait for the weather
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
  loadCrowds() // not awaited, the chips appear when the levels arrive
})
</script>

<template>
  <main class="container-fluid px-3 py-4 page">
    <div class="content">
      <div class="mb-3">
        <div class="d-flex flex-wrap align-items-center justify-content-between gap-3">
          <h1 class="h2 fw-semibold mb-0">{{ heading }}</h1>
          <router-link
            :to="{ name: 'create-hangout' }"
            class="btn btn-primary fw-semibold d-none d-md-inline-flex align-items-center start-btn"
          >
            Start planning
          </router-link>
        </div>

        <div class="d-flex flex-wrap align-items-center gap-2 mt-2">
          <span v-if="upcoming.length > 0" class="text-muted small">
            {{ planned }} being planned
          </span>
          <button
            v-if="tab === 'upcoming' && needCount > 0"
            type="button"
            class="need-chip"
            :aria-pressed="filterOn"
            @click="needsOnly = !needsOnly"
          >
            {{ needCount }} need your input
          </button>
          <span v-if="upcoming.length > 0" class="text-muted small">
            · {{ confirmed }} confirmed
          </span>
          <div class="btn-group ms-auto" role="group" aria-label="Show upcoming or past hangouts">
            <button
              type="button"
              class="btn toggle-btn"
              :class="tab === 'upcoming' ? 'btn-primary' : 'btn-outline-secondary'"
              :aria-pressed="tab === 'upcoming'"
              @click="tab = 'upcoming'"
            >
              Upcoming
            </button>
            <button
              type="button"
              class="btn toggle-btn"
              :class="tab === 'past' ? 'btn-primary' : 'btn-outline-secondary'"
              :aria-pressed="tab === 'past'"
              @click="tab = 'past'"
            >
              Past
            </button>
          </div>
        </div>
      </div>

      <div
        v-if="showHaze"
        class="alert alert-warning d-flex align-items-start gap-2 py-2 ps-3 pe-1 mb-3"
        role="status"
      >
        <p class="mb-0 flex-grow-1 pt-1">
          <span class="d-none d-sm-inline">
            Haze · PSI {{ haze.psi }} ({{ haze.level }}) right now. Indoor venues recommended.
            Source: NEA
          </span>
          <span class="d-sm-none">Haze · PSI {{ haze.psi }} · Indoor venues recommended</span>
        </p>
        <button
          type="button"
          class="btn dismiss"
          aria-label="Dismiss haze warning"
          @click="dismissHaze"
        >
          ✕
        </button>
      </div>

      <p v-if="loading" class="text-muted">Loading your hangouts…</p>
      <p v-else-if="error" class="text-danger">{{ error }}</p>
      <p v-else-if="tabList.length === 0" class="text-muted">
        {{
          tab === 'upcoming'
            ? 'No hangouts yet. Press Start planning to make one.'
            : 'No past hangouts yet.'
        }}
      </p>

      <p v-if="deleteError" class="text-danger" role="alert">{{ deleteError }}</p>
      <p v-if="pinError" class="text-danger" role="alert">{{ pinError }}</p>

      <section v-for="s in sections" :key="s.key" class="mb-4">
        <h2 class="section-label">
          {{ s.title }} <span v-if="s.count">{{ s.count }}</span>
        </h2>
        <div v-for="g in s.groups" :key="g.key" class="mb-3">
          <h3 v-if="g.main" class="day-label">
            <strong>{{ g.main }}</strong> <span class="text-muted">{{ g.sub }}</span>
          </h3>
          <div v-for="h in g.items" :key="h.id" class="mb-2">
            <HangoutCard
              :hangout="h"
              :show-date="s.showDate"
              :featured="s.featured"
              :my-id="myId"
              :hours="hours"
              :crowd="crowds[h.id] ?? null"
              :can-delete="isHost(h)"
              :can-leave="isMember(h)"
              @delete="askDelete"
              @leave="askLeave"
              @toggle-pin="onTogglePin"
            />
          </div>
        </div>
      </section>
    </div>

    <!-- wide screens only: the week and what needs you, beside the list -->
    <aside v-if="upcoming.length > 0" class="rail" aria-label="This week">
      <WeekStrip :hangouts="upcoming" :my-id="myId" />
      <NeedsInputCard v-if="upcoming.length >= NEEDS_CARD_MIN" :hangouts="upcoming" :my-id="myId" />
    </aside>

    <!-- confirm leaving or deleting, opened by the card's menu item -->
    <div
      id="confirm-modal"
      class="modal fade"
      tabindex="-1"
      aria-labelledby="confirm-title"
      aria-hidden="true"
    >
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h2 id="confirm-title" class="modal-title h5">{{ confirmCopy.title }}</h2>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close" />
          </div>
          <div class="modal-body">{{ confirmCopy.text }}</div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">
              Cancel
            </button>
            <button
              type="button"
              class="btn btn-danger"
              data-bs-dismiss="modal"
              @click="confirmNow"
            >
              {{ confirmCopy.button }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
.content {
  max-width: 1040px; /* rows never stretch wider than this */
  margin: 0 auto;
}
.start-btn {
  min-height: 44px;
}
.toggle-btn {
  min-height: 44px;
}
.need-chip {
  position: relative;
  display: inline-flex;
  align-items: center;
  min-height: 32px;
  padding: 0 0.75rem;
  border: 1px solid var(--bs-warning-border-subtle);
  border-radius: 999px;
  background: var(--bs-warning-bg-subtle);
  color: var(--bs-warning-text-emphasis);
  font-size: 0.8rem;
  font-weight: 600;
}
.need-chip::after {
  content: '';
  position: absolute;
  inset: -6px -2px; /* a 44px tap area around the 32px chip */
}
.need-chip[aria-pressed='true'] {
  background: var(--bs-warning);
  border-color: var(--bs-warning);
}
.dismiss {
  flex: none;
  width: 44px;
  height: 44px;
  margin: -0.375rem 0;
  color: inherit;
}
.section-label {
  margin-bottom: 0.75rem;
  color: var(--fp-muted);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.08em;
}
.section-label span {
  margin-left: 0.25rem;
  font-weight: 600;
}
.day-label {
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
}
/* md 768: the two buttons at the top right share one width */
@media (min-width: 768px) {
  .start-btn,
  .btn-group {
    width: 14rem;
  }
  .start-btn {
    justify-content: center;
  }
  .toggle-btn {
    flex: 1;
  }
}
.rail {
  display: none;
}

/* xxl 1400: the list keeps its 1040px and the rail sits beside it */
@media (min-width: 1400px) {
  .page {
    display: grid;
    grid-template-columns: minmax(0, 1040px) 340px;
    gap: 1.75rem;
    justify-content: center;
  }
  .content {
    margin: 0;
  }
  .rail {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    position: sticky;
    top: 1rem;
    align-self: start;
  }
}
</style>
