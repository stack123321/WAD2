<script setup>
// 06 Starting points
// Owner: Surya · Vet by: Nicole
// Figma frame "06". Each member searches for where they're coming from (MRT, address or postal
// code, via OneMap) and everyone's pin shows on the shared map. Your own pin can be dragged.
// Reads: hangout_members · Writes: my start_label, start_lat, start_lng
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

const me = computed(() => store.members.find((m) => m.user_id === myId.value) ?? null)
const hasStart = (m) => m.start_lat != null && m.start_lng != null

// Your row in "Your group" shows "Editing" while you're searching, or until you've picked a start
const typing = ref(false)
const editing = computed(() => typing.value || (me.value !== null && !hasStart(me.value)))

onMounted(async () => {
  const firstLoad = store.hangout?.id !== route.params.id
  await store.load(route.params.id)
  // Only on the first load, so a start you pick here isn't reset when you come back to this page
  if (firstLoad && route.params.id === 'demo' && me.value) setMyStart(DEMO_START)
})

// TODO(Surya): this only changes the store, so your starting point resets when the page refreshes
// and your friends don't see it. Once Matrix is ready, add updateMyStart(hangoutId, { start_label,
// start_lat, start_lng }) to src/services/hangouts.js and call it here (ask Matrix first, it's their file).
function setMyStart(place) {
  me.value.start_label = place.label
  me.value.start_lat = place.lat
  me.value.start_lng = place.lng
}

// You dragged your pin on the map: move the point straight away, then look up the new spot's name.
let latestMove = 0 // if you drag again before the name arrives, ignore the older answer

async function onPinMoved({ lat, lng }) {
  const moveId = ++latestMove
  setMyStart({ label: 'Finding address…', lat, lng })
  try {
    const place = await reverseGeocode(lat, lng)
    if (moveId !== latestMove) return
    setMyStart({ label: place?.label ?? 'Dropped pin', lat, lng })
  } catch (err) {
    console.error(err)
    if (moveId === latestMove) setMyStart({ label: 'Dropped pin', lat, lng })
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
        <PlaceSearch
          v-else
          class="mb-4"
          :placeholder="hasStart(me) ? 'Change your starting point' : 'e.g. Holland Village'"
          @choose="setMyStart"
          @typing="typing = $event"
        />

        <GroupList class="mb-4" :hangout="store.hangout" :my-id="myId" :editing="editing" />

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
.panel {
  background: var(--fp-surface);
  border-right: 1px solid var(--fp-border);
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
