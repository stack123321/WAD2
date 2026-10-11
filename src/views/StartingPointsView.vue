<script setup>
// 06 Starting points
// Owner: Surya · Vet by: Nicole
// Figma frame "06". Each member searches for where they're coming from (MRT, address or postal
// code, via OneMap) and everyone's pin shows on the shared map. Your own pin can be dragged.
// Host mode: if the host switched off "Friends add their own starting point" on 05 Create hangout,
// the host enters everyone's starting points here instead (Set / Change on each row).
// Reads: hangout_members · Writes: start_label, start_lat, start_lng (mine, or anyone's in host mode)
// The pieces live in components: HangoutBar (top bar), PlaceSearch, GroupList, MembersMap.
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useHangoutStore } from '@/stores/hangout'
import { useAuthStore } from '@/stores/auth'
import { reverseGeocode } from '@/services/onemap'
import HangoutBar from '@/components/hangout/HangoutBar.vue'
import PlaceSearch from '@/components/map/PlaceSearch.vue'
import GroupList from '@/components/start/GroupList.vue'
import MembersMap from '@/components/map/MembersMap.vue'

const route = useRoute()
const store = useHangoutStore()
const auth = useAuthStore()

// Until login works, the demo treats you as Surya, starting from Holland Village.
const myId = computed(() => auth.user?.id ?? 'u-surya')
const DEMO_START = { label: 'Holland Village MRT', lat: 1.3117, lng: 103.7961 }

const findMember = (id) => store.members.find((m) => m.user_id === id) ?? null
const me = computed(() => findMember(myId.value))
const hasStart = (m) => m.start_lat != null && m.start_lng != null

// ── Host mode ──
// 05 Create hangout sends the host here with ?entry=host when friends don't add their own.
// TODO(Matrix): once the hangout saves this setting (e.g. a host_enters_starts column), it's read
// below too, so it still works after a refresh. Only the host may enter other people's locations
// (the demo lets you try it, although Ryan is the demo hangout's host).
const isHost = computed(() => store.hangout?.host_id === myId.value || route.params.id === 'demo')
const hostMode = computed(
  () =>
    isHost.value && (route.query.entry === 'host' || store.hangout?.host_enters_starts === true),
)

// Whose starting point the search box and the draggable pin are setting: you, or (host mode)
// whichever friend you picked with Set / Change.
const targetId = ref(null) // null = you
const target = computed(() => (targetId.value ? findMember(targetId.value) : me.value))
const targetIsMe = computed(() => target.value?.user_id === myId.value)
const targetName = computed(() => (targetIsMe.value ? 'your' : `${target.value.display_name}'s`))

// The row that shows "Editing": a friend you picked, or you while searching / until you've added yours
const typing = ref(false)
const editingId = computed(() => {
  if (!target.value) return null
  if (!targetIsMe.value || typing.value || !hasStart(target.value)) return target.value.user_id
  return null
})

onMounted(async () => {
  const firstLoad = store.hangout?.id !== route.params.id
  await store.load(route.params.id)
  // Only on the first load, so a start you pick here isn't reset when you come back to this page
  if (firstLoad && route.params.id === 'demo' && me.value) setStart(me.value, DEMO_START)
})

// TODO(Surya): this only changes the store, so starting points reset when the page refreshes and
// friends don't see them. Once Matrix is ready, add updateMemberStart(hangoutId, userId, { start_label,
// start_lat, start_lng }) to src/services/hangouts.js and call it here (ask Matrix first, it's their file).
function setStart(member, place) {
  member.start_label = place.label
  member.start_lat = place.lat
  member.start_lng = place.lng
}

/** Picked a place in the search box. In host mode, move on to the next friend who still needs one. */
function onChoose(place) {
  setStart(target.value, place)
  if (!hostMode.value) return
  const next = store.members.find((m) => !hasStart(m))
  startEditing(next ?? me.value)
}

/** Host mode: Set / Change on a friend's row (or Done, which goes back to you). */
function startEditing(member) {
  targetId.value = member.user_id === myId.value ? null : member.user_id
  // the search box starts empty for the new person, so nobody is "typing" any more
  typing.value = false
}

// The pin was dragged: move it straight away, then look up the new spot's name.
let latestMove = 0 // if you drag again before the name arrives, ignore the older answer

async function onPinMoved({ lat, lng }) {
  const member = target.value // whose pin it was, even if you pick someone else meanwhile
  const moveId = ++latestMove
  setStart(member, { label: 'Finding address…', lat, lng })
  try {
    const place = await reverseGeocode(lat, lng)
    if (moveId !== latestMove) return
    setStart(member, { label: place?.label ?? 'Dropped pin', lat, lng })
  } catch (err) {
    console.error(err)
    if (moveId === latestMove) setStart(member, { label: 'Dropped pin', lat, lng })
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

  <div v-else-if="store.hangout">
    <HangoutBar :hangout="store.hangout" :members="store.members" current="starting-points" />

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
            :placeholder="
              hasStart(target) ? `Change ${targetName} starting point` : 'e.g. Holland Village'
            "
            @choose="onChoose"
            @typing="typing = $event"
          />
        </template>

        <GroupList
          class="mb-4"
          :hangout="store.hangout"
          :my-id="myId"
          :editing-id="editingId"
          :host-mode="hostMode"
          @select="startEditing"
        />

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
          :highlight-id="target ? target.user_id : null"
          :draggable-id="me && target ? target.user_id : null"
          @move="onPinMoved"
        />
        <div v-if="target && hasStart(target)" class="map-tip">
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

.done-link {
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
</style>
