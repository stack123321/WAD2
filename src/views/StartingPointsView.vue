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
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useHangoutStore } from '@/stores/hangout'
import { useAuthStore } from '@/stores/auth'
import { reverseGeocode } from '@/services/onemap'
import { getHangout, updateMemberStart } from '@/services/hangouts'
import PlaceSearch from '@/components/map/PlaceSearch.vue'
import GroupList from '@/components/start/GroupList.vue'
import PastFriends from '@/components/start/PastFriends.vue'
import HangoutChat from '@/components/start/HangoutChat.vue'
import MembersMap from '@/components/map/MembersMap.vue'

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
})

// Part (b) Host mode
// 05 Create hangout sends the host here with ?entry=host when friends don't add their own.
// TODO(Matrix): once the hangout saves this setting (e.g. a host_enters_starts column), it's read
// below too, so it still works after a refresh. Only the host may enter other people's locations
// (the demo lets you try it, although Ryan is the demo hangout's host).
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

// "your" or "Nicole's", for the placeholder and the map tip
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
    <div class="row g-0">
      <!-- Left panel: search + group -->
      <div class="col-lg-5 col-xl-4 panel p-4 p-lg-5">
        <h1 class="h3 fw-bold mb-1">Where is everyone coming from?</h1>
        <p class="text-secondary mb-4">Search an address, MRT station or postal code.</p>

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
          <PlaceSearch
            :key="target.user_id"
            class="mb-4"
            :placeholder="hasStart(target) ? 'Search a new place' : 'e.g. Holland Village'"
            :show-location="targetIsMe"
            @choose="onChoose"
            @typing="typing = $event"
          />
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

        <!-- Host only: add people from past hangouts without sending the link again -->
        <PastFriends
          v-if="isRealHost"
          class="mb-4"
          :hangout="store.hangout"
          :my-id="myId"
          @added="reloadHangout"
        />

        <!-- Group chat: everyone in this hangout, live -->
        <HangoutChat v-if="me" class="mb-4" :hangout="store.hangout" :my-id="myId" />

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
          <!-- say why the button is greyed out -->
          <p class="small text-secondary text-center mt-2 mb-0">
            Add your starting point first to continue.
          </p>
        </template>
      </div>

      <!-- Right: shared map -->
      <div class="col-lg-7 col-xl-8 map-col">
        <MembersMap
          :members="store.members"
          :highlight-id="target ? target.user_id : null"
          :draggable-id="me && target ? target.user_id : null"
          @move="onPinMoved"
          @outside="onPinOutside"
        />
        <div v-if="mapWarning" class="map-tip map-warning" role="alert">{{ mapWarning }}</div>
        <div v-else-if="target && hasStart(target)" class="map-tip">
          <span class="fw-semibold tip-word">Tip</span> Drag
          {{ targetIsMe ? 'your' : targetName }} pin to fine-tune
          {{ targetIsMe ? 'your' : 'their' }} starting point
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
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

.map-warning {
  color: var(--bs-danger);
  font-weight: 600;
}
</style>
