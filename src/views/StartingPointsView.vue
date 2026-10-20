<script setup>
// 06 Starting points
// Owner: Surya · Vet by: Nicole
// Figma frame "06". Each member searches for where they're coming from (MRT, address or postal
// code, via OneMap) and everyone's pin shows on the shared map. Your own pin can be dragged.
// Host mode: if the host switched off "Friends add their own starting point" on 05 Create hangout,
// the host enters everyone's starting points here instead (Set / Change on each row).
// Reads: hangout_members · Writes: start_label, start_lat, start_lng (mine, or anyone's in host mode)
// The pieces live in components: PlaceSearch, GroupList, MembersMap. The step bar on top
// (HangoutBar) is added for every hangout page in App.vue.
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useHangoutStore } from '@/stores/hangout'
import { useAuthStore } from '@/stores/auth'
import { reverseGeocode } from '@/services/onemap'
import { getHangout, getMyHangouts, updateMemberStart } from '@/services/hangouts'
import PlaceSearch from '@/components/map/PlaceSearch.vue'
import GroupList from '@/components/start/GroupList.vue'
import PastFriends from '@/components/start/PastFriends.vue'
import HangoutChat from '@/components/start/HangoutChat.vue'
import MembersMap from '@/components/map/MembersMap.vue'
import { centroid } from '@/utils/midpoint'

const route = useRoute()
const store = useHangoutStore()
const auth = useAuthStore()

// The demo hangout has sample people, so there you're Surya (starting from Holland Village),
// even when logged in. In a real hangout you're the logged-in user.
const DEMO_START = { label: 'Holland Village MRT', lat: 1.3117, lng: 103.7961 }
const myId = computed(() => {
  if (route.params.id === 'demo' || !auth.user) {
    return 'u-surya'
  }
  return auth.user.id
})

const me = computed(() => findMember(myId.value))

function findMember(id) {
  const member = store.members.find((m) => m.user_id === id)
  if (!member) {
    return null
  }
  return member
}

function hasStart(member) {
  return member.start_lat != null && member.start_lng != null
}

// Part (a) Load the hangout
onMounted(async () => {
  const firstLoad = !store.hangout || store.hangout.id !== route.params.id
  await store.load(route.params.id)

  // Demo only, and only on the first load, so a start you picked isn't reset when you come back
  if (firstLoad && route.params.id === 'demo' && me.value) {
    setStart(me.value, DEMO_START)
  }

  loadLastPlace()

  // the page is on screen now, so we can measure how much height is left for it
  await nextTick()
  fitToScreen()
  window.addEventListener('resize', fitToScreen)
})

onUnmounted(() => window.removeEventListener('resize', fitToScreen))

// Part (l) Fill the screen: on laptops the panel and map are exactly as tall as the space under
// the step bar, so there's no empty band at the bottom. The step bar's height changes with the
// screen width, so we measure where the page starts instead of guessing a number.
const pageRow = ref(null) // the row holding the panel and the map
const fillHeight = ref('auto')

function fitToScreen() {
  if (!pageRow.value) {
    return
  }
  const top = pageRow.value.getBoundingClientRect().top + window.scrollY
  fillHeight.value = `${window.innerHeight - top}px`
}

// Part (f) "Use Holland Village MRT again": the starting point you used in your latest other
// hangout, so you can add yours with one tap
const lastPlace = ref(null)

async function loadLastPlace() {
  try {
    const hangouts = await getMyHangouts()
    let latest = null // best-so-far: the other hangout with the latest date where I added a place
    for (const h of hangouts) {
      if (h.id === route.params.id) {
        continue
      }
      const mine = h.members.find((m) => m.user_id === myId.value)
      if (!mine || mine.start_lat == null) {
        continue
      }
      if (latest === null || new Date(h.starts_at) > new Date(latest.starts_at)) {
        latest = { starts_at: h.starts_at, member: mine }
      }
    }
    if (latest) {
      lastPlace.value = {
        label: latest.member.start_label,
        lat: latest.member.start_lat,
        lng: latest.member.start_lng,
      }
    }
  } catch (error) {
    // only a shortcut: if it fails, the search box still works
    console.error(error)
  }
}

// Show the chip only for your own starting point, and only if it isn't already that place
const showLastPlace = computed(() => {
  if (!lastPlace.value || !targetIsMe.value || !me.value) {
    return false
  }
  return me.value.start_label !== lastPlace.value.label
})

// Part (g) Group chat opens from the 💬 button instead of taking up space on the page
const showChat = ref(false)
const chatCloseBtn = ref(null) // the ✕ button, so we can move the keyboard focus into the panel

async function openChat() {
  showChat.value = true
  await nextTick() // wait until the panel is on the page
  if (chatCloseBtn.value) {
    chatCloseBtn.value.focus()
  }
}

// Part (h) "Add friends" starts folded away (most people add friends when creating the hangout)
const showAddFriends = ref(false)

// Part (b) Host mode
// 05 Create hangout sends the host here with ?entry=host when friends don't add their own.
// Only the host may enter other people's locations (the demo lets anyone try it).
// host_enters_starts: read once the hangout saves this setting (not in the database yet).
const hostMode = computed(() => {
  if (!store.hangout) {
    return false
  }
  const isHost = store.hangout.host_id === myId.value || route.params.id === 'demo'
  const turnedOn = route.query.entry === 'host' || store.hangout.host_enters_starts === true
  return isHost && turnedOn
})

// The logged-in host of a real (saved) hangout: can add friends from past hangouts
const isRealHost = computed(() => {
  if (!store.hangout || !auth.user || route.params.id === 'demo') {
    return false
  }
  return store.hangout.host_id === auth.user.id
})

// After adding someone, get the hangout again so they appear in Your group and on the map.
// (store.load skips hangouts it already has, so fetch it here and put the fresh copy in the store.)
async function reloadHangout() {
  try {
    store.hangout = await getHangout(route.params.id)
  } catch (error) {
    console.error(error)
  }
}

// Whose starting point the search box and the draggable pin are setting:
// you (targetId is null), or in host mode the friend you picked with Set / Change.
const targetId = ref(null)

const target = computed(() => {
  if (targetId.value === null) {
    return me.value
  }
  return findMember(targetId.value)
})

const targetIsMe = computed(() => target.value !== null && target.value.user_id === myId.value)

// "your" or "Nicole's", for the map tip
const targetName = computed(() => {
  if (targetIsMe.value) {
    return 'your'
  }
  return `${target.value.display_name}'s`
})

// Part (c) Which row shows "Editing"
// A friend you picked, or you while you're typing or until you've added yours.
const typing = ref(false)

const editingId = computed(() => {
  if (!target.value) {
    return null
  }
  if (!targetIsMe.value || typing.value || !hasStart(target.value)) {
    return target.value.user_id
  }
  return null
})

// Part (d) Setting and saving a starting point
// setStart changes it on screen straight away (in the store). saveStart then saves it to the
// database, so it's still there after a refresh and friends see it when they open the page.
function setStart(member, place) {
  member.start_label = place.label
  member.start_lat = place.lat
  member.start_lng = place.lng
}

const saveStatus = ref('') // '', 'saving', 'saved' or 'error'
const failedMember = ref(null) // whose save failed, for "Try again"

async function saveStart(member) {
  // The demo hangout isn't saved anywhere, so don't show "Saved"
  if (route.params.id === 'demo') {
    return
  }

  saveStatus.value = 'saving'
  try {
    await updateMemberStart(route.params.id, member.user_id, {
      label: member.start_label,
      lat: member.start_lat,
      lng: member.start_lng,
    })
    saveStatus.value = 'saved'
    failedMember.value = null
    setTimeout(() => {
      if (saveStatus.value === 'saved') {
        saveStatus.value = ''
      }
    }, 2000)
  } catch (error) {
    console.error(error)
    saveStatus.value = 'error'
    failedMember.value = member
  }
}

// Picked a place in the search box (or "Use my current location")
function onChoose(place) {
  const member = target.value
  setStart(member, place)
  saveStart(member)
  // remember it in your recent places (only your own starting points)
  if (member.user_id === myId.value) {
    rememberPlace(place)
  }

  // In host mode, move on to the next friend who still has no starting point (or back to you)
  if (hostMode.value) {
    const next = store.members.find((m) => !hasStart(m))
    if (next) {
      startEditing(next)
    } else {
      startEditing(me.value)
    }
  }
}

// Host mode: Set / Change on a friend's row (or Done, which goes back to you)
function startEditing(member) {
  if (member.user_id === myId.value) {
    targetId.value = null
  } else {
    targetId.value = member.user_id
  }
  // the search box starts empty for the new person, so nobody is "typing" any more
  typing.value = false
}

// Part (e) Dragging a pin
// Move the pin straight away, then ask OneMap for the name of the new spot.
async function onPinMoved(position) {
  const member = target.value // whose pin it was, even if you pick someone else while waiting
  setStart(member, { label: 'Finding address…', lat: position.lat, lng: position.lng })

  try {
    const place = await reverseGeocode(position.lat, position.lng)

    // If the pin was dragged again while we waited, this answer is for the old spot: ignore it
    if (member.start_lat !== position.lat || member.start_lng !== position.lng) {
      return
    }

    if (place) {
      member.start_label = place.label
    } else {
      member.start_label = 'Dropped pin' // nothing nearby, e.g. in the sea
    }
  } catch (error) {
    console.error(error)
    member.start_label = 'Dropped pin'
  }
  // Save once we know the name (not while it still says "Finding address…")
  saveStart(member)
}

// Validation: the map puts the pin back and tells us when it's dropped outside Singapore.
// Show a message on the map for 4 seconds.
const mapWarning = ref('')

function onPinOutside() {
  mapWarning.value = 'Starting points must be in Singapore, so the pin went back.'
  setTimeout(() => {
    mapWarning.value = ''
  }, 4000)
}

// Part (i) Recent places: your last 3 starting points, shown when you tap the empty search box.
// Saved in this browser (localStorage), separately for each account.
const MAX_RECENT = 3
const recentPlaces = ref(loadRecentPlaces())

function recentKey() {
  return `fairpoint-recent-places-${myId.value}`
}

function loadRecentPlaces() {
  try {
    const saved = JSON.parse(localStorage.getItem(recentKey()))
    if (Array.isArray(saved)) {
      return saved
    }
  } catch (error) {
    console.error(error) // e.g. private browsing blocks localStorage
  }
  return []
}

// Newest first, no repeats, only 3
function rememberPlace(place) {
  const others = []
  for (const old of recentPlaces.value) {
    if (old.label !== place.label) {
      others.push(old)
    }
  }
  const newest = { label: place.label, lat: place.lat, lng: place.lng }
  recentPlaces.value = [newest, ...others].slice(0, MAX_RECENT)
  try {
    localStorage.setItem(recentKey(), JSON.stringify(recentPlaces.value))
  } catch (error) {
    console.error(error)
  }
}

// Part (j) Rough middle so far: the average position of everyone who has added a place (2 or more).
// Only a preview to show why we ask; 08 Midpoint picks the real fair spot by travel time.
const roughMiddle = computed(() => {
  const points = []
  for (const m of store.members) {
    if (hasStart(m)) {
      points.push({ lat: m.start_lat, lng: m.start_lng })
    }
  }
  if (points.length < 2) {
    return null
  }
  return centroid(points)
})

// Part (k) Personal status line, e.g. "You're set. Waiting for Ryan and Nicole."
const statusLine = computed(() => {
  if (!me.value) {
    return ''
  }
  if (!hasStart(me.value)) {
    return 'Add where you’re coming from to continue.'
  }
  const waiting = []
  for (const m of store.members) {
    if (!hasStart(m)) {
      waiting.push(m.display_name)
    }
  }
  if (waiting.length === 0) {
    return 'Everyone’s in. Choose your transport next.'
  }
  if (waiting.length === 1) {
    return `You’re set. Waiting for ${waiting[0]}.`
  }
  const last = waiting[waiting.length - 1]
  return `You’re set. Waiting for ${waiting.slice(0, -1).join(', ')} and ${last}.`
})
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

  <div v-else-if="store.hangout">
    <div ref="pageRow" class="row g-0 fill-row" :style="{ '--fill-height': fillHeight }">
      <!-- Left panel: search + group -->
      <div class="col-lg-5 col-xl-4 panel p-4 p-lg-5">
        <div class="d-flex justify-content-between align-items-start gap-3">
          <h1 class="h3 fw-bold mb-1">Where is everyone coming from?</h1>
          <!-- Group chat opens in a side panel -->
          <button
            v-if="me"
            type="button"
            class="chat-icon"
            aria-label="Open group chat"
            title="Group chat"
            :aria-expanded="showChat"
            aria-controls="chat-panel"
            @click="openChat"
          >
            💬
          </button>
        </div>
        <!-- Personal status: what you need to do, or who you're waiting for -->
        <p v-if="me" class="status-line mb-1">Hi {{ me.display_name }} 👋 {{ statusLine }}</p>
        <p class="text-secondary mb-4">
          Search an address, MRT station or postal code. We use everyone’s starting point to find a
          spot that’s fair for all.
        </p>

        <div v-if="!me" class="alert alert-warning small" role="alert">
          You're not a member of this hangout, so you can't add a starting point.
        </div>
        <template v-else>
          <p v-if="hostMode" class="host-note small">
            You're entering everyone's starting points. Pick a friend below with
            <strong>Set</strong>, then search for where they're coming from.
          </p>
          <div v-if="!targetIsMe" class="d-flex justify-content-between align-items-baseline mb-2">
            <span class="fw-semibold">Setting {{ target.display_name }}'s starting point</span>
            <button
              type="button"
              class="btn btn-link btn-sm p-0 done-link"
              @click="startEditing(me)"
            >
              Done
            </button>
          </div>
          <div class="mb-4">
            <PlaceSearch
              :key="target.user_id"
              :placeholder="hasStart(target) ? 'Search a new place' : 'e.g. Holland Village'"
              :show-location="targetIsMe"
              :recent-places="targetIsMe ? recentPlaces : []"
              @choose="onChoose"
              @typing="typing = $event"
            />
            <!-- One tap: the place you started from last time -->
            <button
              v-if="showLastPlace"
              type="button"
              class="again-chip"
              @click="onChoose(lastPlace)"
            >
              📍 Use {{ lastPlace.label }} again
            </button>
          </div>
        </template>

        <!-- Saving to the database -->
        <p v-if="saveStatus === 'saving'" class="save-status small text-secondary">Saving…</p>
        <p v-else-if="saveStatus === 'saved'" class="save-status small save-ok">✓ Saved</p>
        <p v-else-if="saveStatus === 'error'" class="save-status small text-danger" role="alert">
          Couldn't save {{ failedMember.display_name }}'s starting point, so friends won't see it
          yet.
          <button
            type="button"
            class="btn btn-link btn-sm p-0 ms-1 retry-link"
            @click="saveStart(failedMember)"
          >
            Try again
          </button>
        </p>

        <GroupList
          class="mb-4"
          :hangout="store.hangout"
          :my-id="myId"
          :editing-id="editingId"
          :host-mode="hostMode"
          @select="startEditing"
        />

        <!-- Next comes straight after the group: you only need YOUR starting point to continue -->
        <RouterLink
          v-if="me && hasStart(me)"
          class="btn btn-primary btn-lg w-100"
          :to="{ name: 'transport', params: { id: route.params.id } }"
        >
          Next: choose transport →
        </RouterLink>
        <template v-else>
          <button class="btn btn-primary btn-lg w-100" type="button" disabled>
            Next: choose transport →
          </button>
        </template>
        <!-- say what's needed, and that nobody has to wait for friends -->
        <p class="small text-secondary text-center mt-2 mb-4">
          <template v-if="me && hasStart(me)">Your friends can add theirs later.</template>
          <template v-else
            >Add your starting point to continue. Friends can add theirs later.</template
          >
        </p>

        <!-- Host only: add more people, folded away (most are added when creating the hangout) -->
        <div v-if="isRealHost">
          <button
            type="button"
            class="btn btn-link add-toggle"
            :aria-expanded="showAddFriends"
            aria-controls="add-friends"
            @click="showAddFriends = !showAddFriends"
          >
            {{ showAddFriends ? 'Hide add friends ▴' : '+ Add friends ▾' }}
          </button>
          <PastFriends
            v-if="showAddFriends"
            id="add-friends"
            class="mt-2"
            :hangout="store.hangout"
            :my-id="myId"
            @added="reloadHangout"
          />
        </div>
      </div>

      <!-- Right: shared map -->
      <div class="col-lg-7 col-xl-8 map-col">
        <MembersMap
          :members="store.members"
          :highlight-id="target ? target.user_id : null"
          :draggable-id="me && target ? target.user_id : null"
          :middle="roughMiddle"
          @move="onPinMoved"
          @outside="onPinOutside"
        />
        <div v-if="mapWarning" class="map-tip map-warning" role="alert">{{ mapWarning }}</div>
        <div v-else-if="target && hasStart(target)" class="map-tip">
          <span class="fw-semibold tip-word">Tip</span> Drag {{ targetName }} pin to fine-tune
          {{ targetIsMe ? 'your' : 'their' }} starting point
        </div>
      </div>
    </div>

    <!-- Group chat panel: slides in from the side, closes with ✕, Esc or a tap outside -->
    <template v-if="me && showChat">
      <div class="chat-backdrop" @click="showChat = false"></div>
      <aside
        id="chat-panel"
        class="chat-panel"
        role="dialog"
        aria-label="Group chat"
        @keydown.esc="showChat = false"
      >
        <button
          ref="chatCloseBtn"
          type="button"
          class="btn-close chat-close"
          aria-label="Close chat"
          @click="showChat = false"
        ></button>
        <HangoutChat :hangout="store.hangout" :my-id="myId" :height="420" />
      </aside>
    </template>
  </div>
</template>

<style scoped>
/* "Hi Surya 👋 You're set. Waiting for Ryan." */
.status-line {
  font-weight: 600;
}

/* 💬 round chat button next to the heading */
.chat-icon {
  flex-shrink: 0;
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  border: 1px solid var(--fp-border);
  border-radius: 50%;
  background: var(--fp-surface);
  font-size: 1.3rem;
  box-shadow: var(--fp-shadow);
}

.chat-icon:hover {
  border-color: var(--fp-primary);
}

/* "📍 Use Holland Village MRT again" */
.again-chip {
  display: inline-flex;
  align-items: center;
  max-width: 100%;
  min-height: 44px;
  margin-top: 0.6rem;
  padding: 0.4rem 0.9rem;
  border: 1px dashed var(--fp-primary);
  border-radius: 999px;
  background: color-mix(in srgb, var(--fp-primary) 8%, var(--fp-surface));
  color: var(--fp-primary-dark);
  font-size: 0.9rem;
  font-weight: 600;
  text-align: left;
  overflow-wrap: anywhere;
}

/* "+ Add friends ▾" */
.add-toggle {
  min-height: 44px;
  padding: 0;
  font-weight: 600;
  text-decoration: none;
}

/* Chat panel: dark backdrop + a panel on the right (full width on phones) */
.chat-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1040;
  background: rgb(0 0 0 / 0.35);
}

.chat-panel {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: 1050; /* above the map and the navbar */
  width: min(420px, 100%);
  padding: 3.25rem 1rem 1rem;
  overflow-y: auto;
  background: var(--fp-surface);
  box-shadow: -8px 0 30px rgb(0 0 0 / 0.15);
}

.chat-close {
  position: absolute;
  top: 1rem;
  right: 1rem;
  width: 44px;
  height: 44px;
  padding: 0;
}

.panel {
  background: var(--fp-surface);
  border-right: 1px solid var(--fp-border);
}

.host-note {
  background: color-mix(in srgb, var(--fp-primary) 10%, var(--fp-surface));
  border-radius: var(--fp-radius-sm);
  padding: 0.65rem 0.85rem;
  margin-bottom: 1rem;
}

.save-status {
  margin: -0.75rem 0 1rem;
}

.save-ok {
  color: var(--fp-primary);
  font-weight: 600;
}

.retry-link {
  min-height: 44px; /* big enough to tap with a finger */
  color: var(--fp-primary);
  font-weight: 600;
  text-decoration: none;
}

.done-link {
  min-height: 44px; /* big enough to tap with a finger */
  padding: 0 0.6rem !important;
  color: var(--fp-primary);
  font-weight: 600;
  text-decoration: none;
}

.map-col {
  position: relative;
  height: 60vh; /* phones and tablets: the map sits under the panel */
}

/* Laptops: the panel and map fill exactly the rest of the screen (--fill-height is measured in the
   script), like a map app. The map is always fully visible; if the panel has more in it than
   fits, only the panel scrolls. */
@media (min-width: 992px) {
  .fill-row {
    height: var(--fill-height);
  }

  .fill-row > .panel {
    height: 100%;
    overflow-y: auto;
  }

  .map-col {
    height: auto;
    min-height: 480px;
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

.map-warning {
  color: var(--bs-danger);
  font-weight: 600;
}
</style>
