<script setup>
// 06 Starting points
// Owner: Surya · Vet by: Nicole
// Figma frame "06". Each member searches for where they're coming from (MRT, address or postal
// code, via OneMap) and everyone's pin shows on the shared map. Your own pin can be dragged.
// Reads: hangout_members · Writes: my start_label, start_lat, start_lng
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useHangoutStore } from '@/stores/hangout'
import { useAuthStore } from '@/stores/auth'
import { searchAddress } from '@/services/onemap'
import MembersMap from '@/components/map/MembersMap.vue'

const route = useRoute()
const store = useHangoutStore()
const auth = useAuthStore()

// Until login works, the demo treats you as Surya, starting from Holland Village.
const myId = computed(() => auth.user?.id ?? 'u-surya')
const DEMO_START = { label: 'Holland Village MRT', lat: 1.3117, lng: 103.7961 }

const me = computed(() => store.members.find((m) => m.user_id === myId.value) ?? null)
const hasStart = (m) => m.start_lat != null && m.start_lng != null
const readyCount = computed(() => store.members.filter(hasStart).length)

// The 6 steps inside a hangout, for the progress bar at the top
const STEPS = [
  { label: 'Starting points', route: 'starting-points' },
  { label: 'Transport', route: 'transport' },
  { label: 'Midpoint', route: 'midpoint' },
  { label: 'Spots', route: 'explore' },
  { label: 'Vote', route: 'vote' },
  { label: 'Final plan', route: 'final-plan' },
]
const CURRENT_STEP = 0

/** "Fri 16 Oct · 7 PM" */
const startsAt = computed(() => {
  if (!store.hangout?.starts_at) return ''
  const d = new Date(store.hangout.starts_at)
  const day = d.toLocaleDateString('en-SG', { weekday: 'short', day: 'numeric', month: 'short' })
  const hour = d.getHours() % 12 || 12
  const mins = d.getMinutes() ? ':' + String(d.getMinutes()).padStart(2, '0') : ''
  return `${day.replace(',', '')} · ${hour}${mins} ${d.getHours() < 12 ? 'AM' : 'PM'}`
})

onMounted(async () => {
  const firstLoad = store.hangout?.id !== route.params.id
  await store.load(route.params.id)
  // Only on the first load, so a start you pick here isn't reset when you come back to this page
  if (firstLoad && route.params.id === 'demo' && me.value) setMyStart(DEMO_START)
})

// ── Search box ──
const query = ref('')
const results = ref([])
const searching = ref(false)
const searchError = ref('')
const activeIndex = ref(0) // result highlighted with the arrow keys
let timer = null
let latestSearch = 0 // ignore answers to older searches that arrive late

const showResults = computed(() => query.value.trim().length >= 2)
// Your row in "Your group" shows "Editing" while you're searching, or until you've picked a start
const editing = computed(() => query.value.trim() !== '' || (me.value && !hasStart(me.value)))

// Wait until the user stops typing for 300 ms, then search
watch(query, (text) => {
  clearTimeout(timer)
  searchError.value = ''
  activeIndex.value = 0
  if (text.trim().length < 2) {
    results.value = []
    searching.value = false
    return
  }
  searching.value = true
  timer = setTimeout(() => runSearch(text), 300)
})

async function runSearch(text) {
  const searchId = ++latestSearch
  try {
    const found = await searchAddress(text)
    if (searchId !== latestSearch) return
    results.value = found
  } catch (err) {
    if (searchId !== latestSearch) return
    results.value = []
    searchError.value = "Search isn't working right now. Try again in a moment."
    console.error(err)
  } finally {
    if (searchId === latestSearch) searching.value = false
  }
}

/** "4 Tampines Central 5, S529510" under each result */
function placeDetail(place) {
  return [place.address, place.postal ? 'S' + place.postal : null].filter(Boolean).join(', ')
}

function moveDown() {
  if (results.value.length) activeIndex.value = (activeIndex.value + 1) % results.value.length
}

function moveUp() {
  if (results.value.length) {
    activeIndex.value = (activeIndex.value - 1 + results.value.length) % results.value.length
  }
}

function pickActive() {
  const place = results.value[activeIndex.value]
  if (place) choose(place)
}

function choose(place) {
  setMyStart(place)
  query.value = ''
  results.value = []
}

// TODO(Surya): this only changes the store, so your starting point resets when the page refreshes
// and your friends don't see it. Once Matrix is ready, add updateMyStart(hangoutId, { start_label,
// start_lat, start_lng }) to src/services/hangouts.js and call it here (ask Matrix first, it's their file).
function setMyStart(place) {
  me.value.start_label = place.label
  me.value.start_lat = place.lat
  me.value.start_lng = place.lng
}

/** You dragged your pin on the map: keep the name, move the point. */
function onPinMoved({ lat, lng }) {
  setMyStart({ label: me.value.start_label, lat, lng })
}

// ── Remind ──
// There's no notifications backend, so "Remind" copies a message with the invite link for you to
// paste into the group chat.
const copiedFor = ref(null) // user_id whose reminder was just copied

async function remind(member) {
  const link = `${window.location.origin}/login?invite=${store.hangout.invite_code}`
  const text = `Hey ${member.display_name}, add where you're coming from for "${store.hangout.name}": ${link}`
  try {
    await navigator.clipboard.writeText(text)
    copiedFor.value = member.user_id
    setTimeout(() => {
      if (copiedFor.value === member.user_id) copiedFor.value = null
    }, 2000)
  } catch (err) {
    console.error(err)
    window.prompt('Copy this reminder:', text)
  }
}
</script>

<template>
  <div v-if="store.loading" class="d-flex align-items-center gap-2 text-secondary p-5">
    <span class="spinner-border spinner-border-sm" aria-hidden="true"></span>
    Loading hangout…
  </div>

  <div v-else-if="store.error" class="container py-5">
    <div class="alert alert-danger" role="alert">
      Couldn't load this hangout. Check the link, or go back to
      <RouterLink :to="{ name: 'dashboard' }">My hangouts</RouterLink>.
    </div>
  </div>

  <div v-else-if="store.hangout" class="planner">
    <!-- Hangout bar: name, date, steps, who's in it -->
    <header class="hangout-bar px-3 px-lg-5">
      <div class="d-flex align-items-center gap-2 min-w-0">
        <span class="fw-bold text-truncate">{{ store.hangout.name }}</span>
        <span class="date-chip">{{ startsAt }}</span>
      </div>

      <ol class="steps d-none d-xl-flex">
        <li
          v-for="(step, i) in STEPS"
          :key="step.route"
          class="step"
          :class="{ current: i === CURRENT_STEP }"
        >
          <RouterLink
            :to="{ name: step.route, params: { id: route.params.id } }"
            class="step-link"
            :aria-current="i === CURRENT_STEP ? 'step' : null"
          >
            <span class="step-num">{{ i + 1 }}</span>
            {{ step.label }}
          </RouterLink>
        </li>
      </ol>

      <div class="avatar-stack d-none d-md-flex" :aria-label="`${store.members.length} members`">
        <span
          v-for="m in store.members"
          :key="m.user_id"
          class="avatar avatar-sm"
          :style="{ backgroundColor: m.avatar_color }"
          :title="m.display_name"
        >
          {{ m.display_name.charAt(0) }}
        </span>
      </div>
    </header>

    <div class="row g-0 planner-body">
      <!-- Left panel: search + group -->
      <div class="col-lg-5 col-xl-4 panel p-4 p-lg-5">
        <h1 class="h3 fw-bold mb-1">Where is everyone coming from?</h1>
        <p class="text-secondary mb-4">Search an address, MRT station or postal code.</p>

        <div v-if="!me" class="alert alert-warning small" role="alert">
          You're not a member of this hangout, so you can't add a starting point.
        </div>

        <div v-else class="mb-4">
          <label for="start-search" class="visually-hidden">Search for your starting point</label>
          <div class="search-box">
            <svg class="search-icon" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
              <circle cx="7" cy="7" r="5" fill="none" stroke="currentColor" stroke-width="1.6" />
              <path d="M11 11l3.5 3.5" stroke="currentColor" stroke-width="1.6" />
            </svg>
            <input
              id="start-search"
              v-model="query"
              type="search"
              class="search-input"
              :placeholder="hasStart(me) ? 'Change your starting point' : 'e.g. Holland Village'"
              autocomplete="off"
              role="combobox"
              aria-controls="start-results"
              :aria-expanded="showResults"
              aria-autocomplete="list"
              @keydown.down.prevent="moveDown"
              @keydown.up.prevent="moveUp"
              @keydown.enter.prevent="pickActive"
              @keydown.esc="query = ''"
            />
            <span class="onemap-tag">OneMap</span>
          </div>

          <ul v-if="showResults" id="start-results" class="results" role="listbox">
            <li v-if="searching" class="result-msg">Searching…</li>
            <li v-else-if="searchError" class="result-msg text-danger">{{ searchError }}</li>
            <li v-else-if="results.length === 0" class="result-msg">
              No places match "{{ query.trim() }}". Try an MRT name or a 6-digit postal code.
            </li>
            <template v-else>
              <li
                v-for="(place, i) in results"
                :key="place.label + '-' + i"
                class="result"
                :class="{ active: i === activeIndex }"
                role="option"
                :aria-selected="i === activeIndex"
                @mousedown.prevent="choose(place)"
                @mouseenter="activeIndex = i"
              >
                <span class="result-icon" aria-hidden="true"><span class="dot"></span></span>
                <span class="min-w-0">
                  <span class="d-block fw-semibold text-truncate">{{ place.label }}</span>
                  <span v-if="placeDetail(place)" class="d-block small result-sub text-truncate">
                    {{ placeDetail(place) }}
                  </span>
                </span>
              </li>
            </template>
          </ul>
        </div>

        <div class="d-flex justify-content-between align-items-baseline mb-2">
          <h2 class="h6 fw-bold mb-0">Your group</h2>
          <span class="small text-secondary"
            >{{ readyCount }} of {{ store.members.length }} added</span
          >
        </div>

        <ul class="list-unstyled mb-4">
          <li
            v-for="m in store.members"
            :key="m.user_id"
            class="member"
            :class="{ editing: m.user_id === myId && editing }"
          >
            <span class="avatar" :style="{ backgroundColor: m.avatar_color }">
              {{ m.display_name.charAt(0) }}
            </span>
            <div class="min-w-0 flex-grow-1">
              <div class="fw-semibold">
                {{ m.display_name }}<span v-if="m.user_id === myId"> (you)</span>
              </div>
              <div v-if="m.user_id === myId && editing" class="small text-secondary">Choosing…</div>
              <div v-else-if="hasStart(m)" class="small text-secondary text-truncate">
                {{ m.start_label }}
              </div>
              <div v-else class="small text-secondary">Waiting for {{ m.display_name }}…</div>
            </div>

            <span v-if="m.user_id === myId && editing" class="editing-tag">Editing</span>
            <span v-else-if="hasStart(m)" class="check" aria-label="Added">✓</span>
            <button v-else type="button" class="btn btn-link btn-sm remind" @click="remind(m)">
              {{ copiedFor === m.user_id ? 'Copied!' : 'Remind' }}
            </button>
          </li>
        </ul>

        <RouterLink
          v-if="me && hasStart(me)"
          class="btn btn-primary btn-lg w-100"
          :to="{ name: 'transport', params: { id: route.params.id } }"
        >
          Next: choose transport →
        </RouterLink>
        <button v-else class="btn btn-primary btn-lg w-100" type="button" disabled>
          Next: choose transport →
        </button>
      </div>

      <!-- Right: shared map -->
      <div class="col-lg-7 col-xl-8 map-col">
        <MembersMap
          :members="store.members"
          :highlight-id="myId"
          :draggable-id="me ? myId : null"
          @move="onPinMoved"
        />
        <div v-if="me && hasStart(me)" class="map-tip">
          <span class="fw-semibold tip-word">Tip</span> Drag your pin to fine-tune your starting
          point
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.min-w-0 {
  min-width: 0; /* lets text-truncate work inside a flex row */
}

/* ── Hangout bar ── */
.hangout-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  min-height: 64px;
  background: var(--fp-surface);
  border-bottom: 1px solid var(--fp-border);
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

/* a short line between steps */
.step + .step::before {
  content: '';
  display: inline-block;
  width: 32px;
  height: 1px;
  margin: 0 0.75rem;
  vertical-align: middle;
  background: var(--fp-border);
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

.step.current .step-link {
  color: var(--fp-ink);
  font-weight: 600;
}

.step.current .step-num {
  background: var(--fp-ink);
  border-color: var(--fp-ink);
  color: var(--fp-surface);
}

.avatar-stack .avatar + .avatar {
  margin-left: -8px;
}

/* ── Panel ── */
.panel {
  background: var(--fp-surface);
  border-right: 1px solid var(--fp-border);
}

.search-box {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 0.75rem 0.75rem 1rem;
  border: 2px solid var(--fp-primary);
  border-radius: var(--fp-radius-sm);
  background: var(--fp-surface);
}

.search-box:focus-within {
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--fp-primary) 15%, transparent);
}

.search-icon {
  flex-shrink: 0;
  color: var(--fp-muted);
}

.search-input {
  flex-grow: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  font-size: 1.05rem;
}

.onemap-tag {
  flex-shrink: 0;
  background: var(--fp-bg);
  border-radius: 999px;
  padding: 0.25rem 0.75rem;
  font-size: 0.8rem;
  font-weight: 500;
}

.results {
  list-style: none;
  margin: 0.75rem 0 0;
  padding: 0.5rem;
  border: 1px solid var(--fp-border);
  border-radius: var(--fp-radius-sm);
  box-shadow: var(--fp-shadow);
  max-height: 340px;
  overflow-y: auto;
}

.result {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 0.65rem 0.75rem;
  border-radius: var(--fp-radius-sm);
  cursor: pointer;
}

.result.active {
  background: color-mix(in srgb, var(--fp-primary) 12%, var(--fp-surface));
}

.result-msg {
  padding: 0.65rem 0.75rem;
  font-size: 0.875rem;
  color: var(--fp-muted);
}

.result-icon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 8px;
  background: var(--fp-bg);
}

.result-icon .dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--fp-muted);
}

.result.active .result-icon {
  background: var(--fp-primary);
}

.result.active .result-icon .dot {
  background: var(--fp-surface);
}

.result-sub {
  color: var(--fp-muted);
}

/* ── Your group ── */
.member {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 0.65rem 0.75rem;
  margin: 0 -0.75rem;
  border-radius: var(--fp-radius-sm);
}

.member.editing {
  background: color-mix(in srgb, var(--fp-accent) 14%, var(--fp-surface));
}

.avatar {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  color: var(--fp-surface);
  font-weight: 700;
}

.avatar-sm {
  width: 30px;
  height: 30px;
  font-size: 0.75rem;
  border: 2px solid var(--fp-surface);
}

.editing-tag {
  flex-shrink: 0;
  background: var(--fp-surface);
  color: var(--fp-accent);
  border-radius: 999px;
  padding: 0.2rem 0.7rem;
  font-size: 0.8rem;
  font-weight: 500;
}

.check {
  flex-shrink: 0;
  color: var(--fp-primary);
  font-size: 1.1rem;
}

.remind {
  flex-shrink: 0;
  color: var(--fp-primary);
  font-weight: 600;
  text-decoration: none;
}

/* ── Map ── */
.map-col {
  position: relative;
  height: 60vh; /* phones and tablets: the map sits under the panel */
}

/* Laptops: the map fills the rest of the screen beside the panel */
@media (min-width: 992px) {
  .map-col {
    height: auto;
    min-height: 640px;
  }
}

.map-tip {
  position: absolute;
  top: 1.5rem;
  left: 1.5rem;
  z-index: 1;
  max-width: calc(100% - 7rem); /* leave room for the zoom buttons */
  background: var(--fp-surface);
  border-radius: var(--fp-radius-sm);
  box-shadow: var(--fp-shadow);
  padding: 0.5rem 0.9rem;
  font-size: 0.875rem;
}

.tip-word {
  color: var(--fp-primary);
  margin-right: 0.35rem;
}
</style>
