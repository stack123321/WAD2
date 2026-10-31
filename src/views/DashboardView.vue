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
import { getPhotos } from '@/services/photos'
import { sgDate, dayHeading } from '@/utils/dates'
import { getStatus } from '@/utils/hangoutStatus'

const hangouts = ref([]) // every hangout i'm in, in date order, from getMyHangouts()
const hours = ref([]) // hourly forecast, for the weather line on each card
const haze = ref(null) // today's haze reading, for the banner
const loading = ref(false) // true while the hangouts are loading, shows "Loading your hangouts…"
const error = ref('') // shown in red if the hangouts couldn't load
const tab = ref('upcoming') // which list is showing, 'upcoming' or 'past'
const auth = useAuthStore() // who is logged in

// "Good morning", "Good afternoon" or "Good evening" from the hour on this device
const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning' // before noon
  if (hour < 18) return 'Good afternoon' // noon to 6 pm
  return 'Good evening'
})

// the name they typed at sign up, or '' if nobody is logged in
const name = computed(() => {
  if (!auth.user) return ''
  return auth.user.user_metadata.display_name || '' // || '' in case they never gave a name
})

// "Good evening, Ryan!" or just "Good evening!" when don't know name
const heading = computed(() =>
  name.value ? `${greeting.value}, ${name.value}!` : `${greeting.value}!`,
)

const HALF_HOUR = 30 * 60 * 1000 // in milliseconds, for the crowd window below

// done, or its date is before today (no date set yet counts as upcoming)
function isPast(h, today) {
  if (h.status === 'done') return true // finished hangouts are always past
  if (!h.starts_at) return false // no date yet, so it can't be past
  return sgDate(new Date(h.starts_at)) < today // "2026-10-16" < "2026-10-20" works because the dates are text in year-month-day order
}

// the two tabs: each hangout goes in exactly one of them
const upcoming = computed(() => {
  const today = sgDate(new Date())
  return hangouts.value.filter((h) => !isPast(h, today))
})
const past = computed(() => {
  const today = sgDate(new Date())
  return hangouts.value.filter((h) => isPast(h, today))
})
const pinError = ref('') // shown in red if pinning fails or there are already 3 pins

const MAX_PINS = 3
const NEEDS_CARD_MIN = 5 // the rail's "Needs your input" card only shows for a long list

// who is looking, null when nobody is logged in
const myId = computed(() => (auth.user ? auth.user.id : null))

// "4 being planned · 1 confirmed", and how many hangouts are waiting on you
const planned = computed(() => upcoming.value.filter((h) => h.status !== 'confirmed').length)
const confirmed = computed(() => upcoming.value.filter((h) => h.status === 'confirmed').length)
const needs = (h) => getStatus(h, myId.value).needsYou // true when this hangout is waiting on me
const needCount = computed(() => upcoming.value.filter(needs).length)

// the amber chip filters the list to the hangouts waiting on you, click again to clear
const needsOnly = ref(false) // flipped by the chip
// the filter only applies on upcoming, and only while something still needs you
const filterOn = computed(() => tab.value === 'upcoming' && needsOnly.value && needCount.value > 0)

// every pinned hangout across Upcoming and Past, for the "2/3"
const pinCount = computed(() => hangouts.value.filter((h) => h.pinned).length)

// this tab's hangouts, most recent first on Past
// [...] copies the list first, because reverse() would flip the original list too.
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
  return upcoming.value.find((h) => h.starts_at && new Date(h.starts_at) > now) ?? null // the first one still in the future
})

// what the sections below show: everything except the UP NEXT one
const rest = computed(() => visible.value.filter((h) => h.id !== upNext.value?.id)) // ?. because there may be no up next

// the page is built as a list of sections (up next, pinned, then the rest by day), so the template only needs one loop and one card tag.
// each section holds groups, and each group is one day heading with its hangouts under it.
// [{ key, title, count, showDate, featured, groups: [{ key, main, sub, items }] }]
const sections = computed(() => {
  const result = []

  // 1. up next, unless the filter is on and it doesn't need me
  if (upNext.value && (!filterOn.value || needs(upNext.value))) {
    result.push({
      key: 'next',
      title: 'UP NEXT',
      count: '',
      showDate: true, // no day heading above it, so the details line carries the date
      featured: true, // the big card with the map
      groups: [{ key: 'next', main: '', sub: '', items: [upNext.value] }], // one group, no heading
    })
  }

  // 2. pinned, with "2/3" beside the title
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

  // 3. the rest, grouped under a day heading (the list is already in date order)
  // because the list is sorted, hangouts on the same day sit next to each other, so each one only needs to check the last group.
  const groups = []
  for (let h of rest.value.filter((x) => !x.pinned)) {
    const key = h.starts_at ? sgDate(new Date(h.starts_at)) : 'none' // which day this hangout is on
    let group = groups[groups.length - 1] // the last group made so far
    if (!group || group.key !== key) {
      // a new day: make its heading, e.g. { main: 'Tomorrow', sub: 'Thu 22 Oct' }
      const heading = h.starts_at
        ? dayHeading(new Date(h.starts_at))
        : { main: 'No date yet', sub: '' }
      group = { key: key, main: heading.main, sub: heading.sub, items: [] }
      groups.push(group)
    }
    group.items.push(h) // add the hangout under its day
  }
  if (groups.length > 0) {
    result.push({
      key: 'rest',
      title: tab.value === 'upcoming' ? 'COMING UP' : 'PAST',
      count: '',
      showDate: false, // the day heading already says the date
      featured: false,
      groups: groups,
    })
  }
  return result
})

// the pin changes on screen straight away and is saved in the background, so the page feels instant.
// if saving fails, the pin is flipped back so the screen matches the database again.
async function onTogglePin(hangout) {
  pinError.value = ''
  if (!hangout.pinned && pinCount.value >= MAX_PINS) {
    // pinning a 4th one: stop and explain
    pinError.value = `You can pin up to ${MAX_PINS} hangouts. Unpin one first.`
    return
  }
  hangout.pinned = !hangout.pinned // show the change right away
  try {
    if (auth.user !== null) {
      await setPinned(hangout.id, auth.user.id, hangout.pinned) // save it on my member row
    }
  } catch (err) {
    console.error(err)
    hangout.pinned = !hangout.pinned // saving failed, so put it back
    pinError.value = `Couldn't update the pin on "${hangout.name}".`
  }
}

// deleting (host) or leaving (other members) a hangout
const deleteError = ref('')

// the person who made the hangout
function isHost(hangout) {
  return auth.user !== null && hangout.host_id === auth.user.id
}

// logged in, in the hangout, but not the host
function canLeave(hangout) {
  return auth.user !== null && !isHost(hangout)
}

// remove me from the hangout, then drop it from the list
async function doLeave(hangout) {
  deleteError.value = ''
  try {
    await leaveHangout(hangout.id, auth.user.id)
    hangouts.value = hangouts.value.filter((h) => h.id !== hangout.id) // keep every hangout except this one
  } catch (err) {
    console.error(err)
    deleteError.value = `Couldn't leave "${hangout.name}": ${err.message}`
  }
}

// delete the hangout for everyone, then drop it from the list
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
// there is one dialog for the whole page, so it needs to remember which hangout and which action it is asking about.
const confirmAction = ref(null) // { kind: 'leave' | 'delete', hangout }

function askLeave(hangout) {
  confirmAction.value = { kind: 'leave', hangout: hangout }
}

function askDelete(hangout) {
  confirmAction.value = { kind: 'delete', hangout: hangout }
}

// the dialog's title, text and red button, worded for leave or delete
const confirmCopy = computed(() => {
  const a = confirmAction.value
  if (!a) return { title: '', text: '', button: '' } // nothing asked yet
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

// the red button was pressed: do what was asked
async function confirmNow() {
  const a = confirmAction.value
  if (!a) return
  confirmAction.value = null // clear it first, so a double click can't run it twice
  if (a.kind === 'leave') await doLeave(a.hangout)
  else await doDelete(a.hangout)
}

// the haze banner: shown once for the whole page, and stays closed for this visit once dismissed
// sessionStorage remembers the dismiss until the tab is closed, and try/catch is needed because some browsers block storage.
const hazeDismissed = ref(false)
try {
  hazeDismissed.value = sessionStorage.getItem('fp-haze-dismissed') === '1' // '1' means closed earlier this visit
} catch (err) {
  console.log(err) // storage can be blocked, the banner just shows again
}

// only for unhealthy haze, and only if not closed
const showHaze = computed(
  () => haze.value !== null && haze.value.tone === 'bad' && !hazeDismissed.value,
)

// the ✕ on the banner
function dismissHaze() {
  hazeDismissed.value = true // hide it now
  try {
    sessionStorage.setItem('fp-haze-dismissed', '1') // and remember it for this visit
  } catch (err) {
    console.log(err)
  }
}

// weather for the cards: one forecast and one haze reading for the whole island, shared by every card
// asking once for the whole page saves one call per card.

async function loadWeather() {
  // the weather is extra, so if it fails the cards just show no weather chip
  try {
    hours.value = await getHourlyForecast(1.3521, 103.8198) // the middle of singapore
  } catch (err) {
    console.log(err)
  }
  // a separate try, so a haze failure doesn't lose the forecast
  try {
    haze.value = await getHaze()
  } catch (err) {
    console.log(err)
  }
}

// crowd level at each hangout's midpoint station, { hangoutId: 'l' | 'm' | 'h' }
const crowds = ref({})

// only for hangouts starting within 30 minutes of now, the same window api/crowd.js treats as "now", so lta's live readings are used and its rate-limited forecast is never called from here
async function loadCrowds() {
  const now = new Date()
  for (let h of hangouts.value) {
    if (!h.midpoint_name || !h.starts_at || h.status === 'done') continue // no station, no time, or over: skip
    const start = new Date(h.starts_at)
    if (Math.abs(start - now) >= HALF_HOUR) continue // more than 30 minutes before or after now: skip
    try {
      const level = await getStationCrowd(h.midpoint_name, start)
      if (level) crowds.value[h.id] = level // null means lta has no real reading, so no chip
    } catch (err) {
      console.log(err) // the crowd is extra, so no chip if it fails
    }
  }
}

// (surya) photos on past hangouts, { hangoutId: [photo, ...] }, loaded in one request for all of them
const photos = ref({})

async function loadPhotos() {
  const ids = past.value.map((h) => h.id)
  if (ids.length === 0) return
  try {
    const result = {}
    for (let p of await getPhotos(ids)) {
      result[p.hangout_id] = [...(result[p.hangout_id] ?? []), p]
    }
    photos.value = result
  } catch (err) {
    console.log(err) // photos are extra, so the cards just show none
  }
}

// runs once when the page opens
onMounted(async () => {
  loadWeather() // not awaited, so the hangouts don't wait for the weather
  loading.value = true
  try {
    hangouts.value = await getMyHangouts()
    // my pin is saved on my own member row of each hangout
    // pins are per person, so each hangout copies my own pin onto itself to make the list easy to sort and count.
    for (let h of hangouts.value) {
      h.pinned = false
      for (let m of h.members) {
        if (m.user_id === myId.value && m.pinned) h.pinned = true // my row says pinned
      }
    }
  } catch (err) {
    console.log(err)
    error.value = 'Could not load your hangouts.'
  }
  loading.value = false
  loadCrowds() // not awaited, the chips appear when the levels arrive
  loadPhotos() // not awaited either
})
</script>

<template>
  <main class="container-fluid px-3 py-4 page">
    <div class="content">
      <!-- header: greeting, start button, counts and the upcoming/past toggle -->
      <div class="mb-3">
        <div class="d-flex flex-wrap align-items-center justify-content-between gap-3">
          <h1 class="h2 fw-semibold mb-0">{{ heading }}</h1>
          <!-- d-none d-md-inline-flex: hidden on phones, where the tab bar has the + button instead -->
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
          <!-- the amber chip: click to show only what needs you, aria-pressed tells screen readers it's a toggle -->
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
          <!-- the two tabs, the active one is solid green -->
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

      <!-- haze banner: a long sentence on wider screens, a short one on phones -->
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

      <!-- one message at most: loading, the load error, or an empty tab -->
      <p v-if="loading" class="text-muted">Loading your hangouts…</p>
      <p v-else-if="error" class="text-danger">{{ error }}</p>
      <p v-else-if="tabList.length === 0" class="text-muted">
        {{
          tab === 'upcoming'
            ? 'No hangouts yet. Press Start planning to make one.'
            : 'No past hangouts yet.'
        }}
      </p>

      <!-- errors from the card menus, role="alert" so screen readers announce them -->
      <p v-if="deleteError" class="text-danger" role="alert">{{ deleteError }}</p>
      <p v-if="pinError" class="text-danger" role="alert">{{ pinError }}</p>

      <!-- three loops from the sections computed: section, then day group, then hangout -->
      <!-- one box around every card, so hovering any card can fade the others -->
      <div class="card-list">
        <section v-for="s in sections" :key="s.key" class="mb-4">
          <h2 class="section-label">
            {{ s.title }} <span v-if="s.count">{{ s.count }}</span>
          </h2>
          <div v-for="g in s.groups" :key="g.key" class="mb-3">
            <!-- day heading, e.g. "Tomorrow Thu 22 Oct", left out for up next and pinned -->
            <h3 v-if="g.main" class="day-label">
              <strong>{{ g.main }}</strong> <span class="text-muted">{{ g.sub }}</span>
            </h3>
            <div v-for="h in g.items" :key="h.id" class="mb-2">
              <!-- the card gets everything it shows as props, and tells this page about menu clicks with events -->
              <HangoutCard
                :hangout="h"
                :show-date="s.showDate"
                :featured="s.featured"
                :my-id="myId"
                :hours="hours"
                :crowd="crowds[h.id] ?? null"
                :can-delete="isHost(h)"
                :can-leave="canLeave(h)"
                :past="tab === 'past'"
                :photos="photos[h.id] ?? []"
                @delete="askDelete"
                @leave="askLeave"
                @toggle-pin="onTogglePin"
              />
            </div>
          </div>
        </section>
      </div>
    </div>

    <!-- wide screens only: the week and what needs you, beside the list -->
    <aside v-if="upcoming.length > 0" class="rail" aria-label="This week">
      <WeekStrip :hangouts="upcoming" :my-id="myId" />
      <NeedsInputCard v-if="upcoming.length >= NEEDS_CARD_MIN" :hangouts="upcoming" :my-id="myId" />
    </aside>

    <!-- confirm leaving or deleting, opened by the card's menu item -->
    <!-- bootstrap opens and closes it (data-bs-toggle and data-bs-dismiss), vue only fills in the words -->
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
            <!-- closes the dialog and runs the action -->
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
/* hovering a card: every card fades, then the one under the pointer comes back */
@media (hover: hover) {
  .card-list:hover .hangout {
    opacity: 0.45;
  }
  .card-list .hangout:hover {
    opacity: 1;
  }
}
.content {
  max-width: 1040px; /* rows never stretch wider than this */
  margin: 0 auto; /* centred */
}
.start-btn {
  min-height: 44px; /* easy to tap */
}
.toggle-btn {
  min-height: 44px;
}
/* the amber "need your input" chip */
.need-chip {
  position: relative; /* so the ::after tap area below is placed around it */
  display: inline-flex;
  align-items: center;
  min-height: 32px;
  padding: 0 0.75rem;
  border: 1px solid var(--bs-warning-border-subtle);
  border-radius: 999px; /* fully round ends */
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
/* while the filter is on, the chip turns solid amber */
.need-chip[aria-pressed='true'] {
  background: var(--bs-warning);
  border-color: var(--bs-warning);
}
/* the ✕ on the haze banner */
.dismiss {
  flex: none; /* never squashed by the text */
  width: 44px;
  height: 44px;
  margin: -0.375rem 0; /* pulls it up and down so the banner doesn't grow taller */
  color: inherit;
}
/* "UP NEXT", "PINNED", "COMING UP" */
.section-label {
  margin-bottom: 0.75rem;
  color: var(--fp-muted);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.08em; /* spaced-out capitals */
}
.section-label span {
  margin-left: 0.25rem; /* the "2/3" beside pinned */
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
    flex: 1; /* upcoming and past split the width evenly */
  }
}
.rail {
  display: none; /* hidden until the screen is wide enough, below */
}

/* xxl 1400: the list keeps its 1040px and the rail sits beside it */
@media (min-width: 1400px) {
  .page {
    display: grid;
    grid-template-columns: minmax(0, 1040px) 340px; /* list column, then a 340px rail */
    gap: 1.75rem;
    justify-content: center;
  }
  .content {
    margin: 0; /* the grid centres it now */
  }
  .rail {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    position: sticky; /* stays in view while the list scrolls */
    top: 1rem;
    align-self: start; /* needed for sticky inside a grid */
  }
}
</style>
