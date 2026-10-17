<script setup>
// Crowd heat map for 08 Midpoint and /crowds: one coloured circle per MRT station, a time slider
// for today, and on 08 the midpoint pin plus everyone's starting points.
// Owner: Ryan. Data: services/crowd.js → api/crowd.js → LTA DataMall.
// Looks like the other maps (06, 09, 10): OneMap tiles, kept inside Singapore, zoom buttons top right.
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import L from 'leaflet'
import { createOneMap } from '@/components/map/oneMap'
import { getCrowdLevels } from '@/services/crowd'

const props = defineProps({
  midpoint: { type: Object, default: null }, // { name, lat, lng } of the group's midpoint
  // 08 Midpoint: the midpoint pin can be dragged; the map emits "move" with the dropped { lat, lng }
  draggable: { type: Boolean, default: false },
  // 08 Midpoint: everyone's starting points, drawn like the pins on 06
  // [{ user_id, display_name, avatar_color, start_label, start_lat, start_lng }]
  members: { type: Array, default: () => [] },
})

const emit = defineEmits(['move'])

let map = null
let midpointMarker = null
let memberPins = null // a group holding everyone's starting-point pins
let stopMap = null // removes the map when leaving the page

const LEVEL_NAMES = { l: 'Low', m: 'Moderate', h: 'High' }

const slot = ref(currentSlot()) // half-hour slots today: 0 = 12:00 am, 1 = 12:30 am ... 47 = 11:30 pm
const stations = ref([])
const loading = ref(false)
const error = ref('')

let circles = null // a group holding all station circles, so we can clear them in one go

// 37 → "6:30 pm"
const timeLabel = computed(() => {
  const hour = Math.floor(slot.value / 2)
  const minutes = slot.value % 2 === 0 ? '00' : '30'
  const suffix = hour < 12 ? 'am' : 'pm'
  const hour12 = hour % 12 === 0 ? 12 : hour % 12
  return `${hour12}:${minutes} ${suffix}`
})

// True when LTA was unavailable and api/crowd.js sent sample data instead
const isSample = computed(
  () => stations.value.length > 0 && stations.value[0].station.includes('(sample)'),
)

// The slot that contains the current time
function currentSlot() {
  const now = new Date()
  return now.getHours() * 2 + (now.getMinutes() >= 30 ? 1 : 0)
}

// Slot number → a Date today at that time
function slotToDate(s) {
  const date = new Date()
  date.setHours(Math.floor(s / 2), (s % 2) * 30, 0, 0)
  return date
}

async function loadCrowd() {
  loading.value = true
  error.value = ''
  try {
    stations.value = await getCrowdLevels(slotToDate(slot.value))
    drawCircles()
  } catch (err) {
    console.log(err)
    error.value = 'Could not load crowd levels. Try again in a moment.'
  }
  loading.value = false
}

function drawCircles() {
  circles.clearLayers()
  for (let s of stations.value) {
    L.circleMarker([s.lat, s.lng], { radius: 9, className: `crowd crowd-${s.level}` })
      .bindTooltip(`${s.station}: ${LEVEL_NAMES[s.level]}`)
      .addTo(circles)
  }
}

// The midpoint pin: a teardrop marker (draggable on 08), with its station name in a tooltip
function drawMidpoint() {
  if (midpointMarker) {
    midpointMarker.remove()
    midpointMarker = null
  }
  if (!props.midpoint) {
    return
  }
  midpointMarker = L.marker([props.midpoint.lat, props.midpoint.lng], {
    draggable: props.draggable,
    zIndexOffset: 1000, // above the station circles
    icon: L.divIcon({
      className: '',
      html: '<span class="midpoint-pin"></span>',
      iconSize: [28, 28],
      iconAnchor: [14, 28], // the tip of the pin sits on the spot
    }),
  })
    .bindTooltip(`Midpoint: ${props.midpoint.name}`, {
      permanent: true,
      direction: 'top',
      offset: [0, -28],
    })
    .addTo(map)

  midpointMarker.on('dragend', () => {
    const position = midpointMarker.getLatLng()
    emit('move', { lat: position.lat, lng: position.lng })
  })
}

// Everyone's starting point: a round pin in their colour with their initial, like on 06.
// Hover (or tap) a pin for their name and where they're coming from.
function drawMembers() {
  memberPins.clearLayers()
  for (let m of props.members) {
    if (m.start_lat == null || m.start_lng == null) {
      continue // no starting point yet
    }
    // avatar_color comes from the database, so only use it if it looks like a colour (#0E7C6B)
    let color = 'var(--fp-primary)'
    if (m.avatar_color && m.avatar_color.startsWith('#')) {
      color = escapeHtml(m.avatar_color)
    }
    L.marker([m.start_lat, m.start_lng], {
      icon: L.divIcon({
        className: '',
        html: `<span class="member-pin" style="background:${color}">${escapeHtml(m.display_name.charAt(0))}</span>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15], // the pin's centre sits on the exact spot
      }),
    })
      .bindTooltip(`${escapeHtml(m.display_name)} · ${escapeHtml(m.start_label)}`)
      .addTo(memberPins)
  }
}

// Names go inside HTML, so turn < > & " ' into safe text first (same as MembersMap.vue on 06)
function escapeHtml(text) {
  return String(text ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

// Show the midpoint and everyone's starting points together, so you can see if it's fair.
// Without anyone placed, zoom in on the midpoint; on /crowds, stay on the whole island.
function fitToGroup() {
  let points = []
  for (let m of props.members) {
    if (m.start_lat != null && m.start_lng != null) {
      points.push([m.start_lat, m.start_lng])
    }
  }
  if (props.midpoint) {
    points.push([props.midpoint.lat, props.midpoint.lng])
  }
  if (points.length > 1) {
    map.fitBounds(points, { padding: [40, 40], maxZoom: 14 })
  } else if (props.midpoint) {
    map.setView([props.midpoint.lat, props.midpoint.lng], 14)
  }
}

onMounted(() => {
  // The shared OneMap map of Singapore (same as 06), zoom buttons top right
  const created = createOneMap('crowd-map', { zoomTopRight: true })
  map = created.map
  stopMap = created.stop

  circles = L.layerGroup().addTo(map)
  memberPins = L.layerGroup().addTo(map)

  drawMembers()
  drawMidpoint()
  fitToGroup()
  loadCrowd()
})

// Remove the map when we leave the page
onBeforeUnmount(() => {
  if (stopMap) {
    stopMap()
  }
})

// When the midpoint changes (e.g. after a drag snaps it to a station), move the pin there
watch(
  () => props.midpoint,
  () => {
    if (!map) return
    drawMidpoint()
    if (props.midpoint) {
      map.panTo([props.midpoint.lat, props.midpoint.lng])
    }
  },
  { deep: true },
)

// When anyone's starting point or travel info changes, redraw their pins (the view stays put)
watch(() => props.members, drawMembers, { deep: true })
</script>

<template>
  <div class="card">
    <div class="card-body">
      <h2 class="h5">Crowd levels at MRT stations</h2>

      <div id="crowd-map"></div>

      <label for="crowd-time" class="form-label mt-3">
        Time today: <strong>{{ timeLabel }}</strong>
      </label>
      <input
        id="crowd-time"
        type="range"
        class="form-range"
        min="0"
        max="47"
        v-model.number="slot"
        @change="loadCrowd"
      />

      <p v-if="loading" class="text-muted small mb-2">Loading crowd levels…</p>
      <p v-else-if="error" class="text-danger small mb-2">{{ error }}</p>
      <p v-else-if="stations.length === 0" class="text-muted small mb-2">
        No crowd data for this time.
      </p>
      <p v-else-if="isSample" class="text-muted small mb-2">
        LTA is unavailable, so these are sample crowd levels.
      </p>

      <div class="d-flex gap-2 small">
        <span class="badge text-bg-success">Low</span>
        <span class="badge text-bg-warning">Moderate</span>
        <span class="badge text-bg-danger">High</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
#crowd-map {
  height: 360px;
  border-radius: var(--fp-radius-sm);
  z-index: 0; /* keep Leaflet's layers under the navbar and dropdowns */
}

/* Bigger on laptops, where the map is the main thing on the page */
@media (min-width: 992px) {
  #crowd-map {
    height: 520px;
  }
}

/* The midpoint pin (Leaflet draws it, so :deep() is needed) */
:deep(.midpoint-pin) {
  display: block;
  width: 28px;
  height: 28px;
  border-radius: 50% 50% 50% 0;
  transform: rotate(-45deg);
  background: var(--fp-primary);
  border: 3px solid var(--fp-surface);
  box-shadow: var(--fp-shadow);
  cursor: grab;
}

/* Everyone's starting points (Leaflet draws them, so :deep() is needed) */
:deep(.member-pin) {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: 3px solid var(--fp-surface);
  box-shadow: var(--fp-shadow);
  color: var(--fp-surface);
  font-weight: 700;
  font-size: 0.8rem;
}

/* Zoom buttons styled like the 06 map */
:deep(.leaflet-control-zoom) {
  border: none;
  box-shadow: var(--fp-shadow);
  border-radius: var(--fp-radius-sm);
  overflow: hidden;
}

/* Leaflet creates the circles itself, so :deep() is needed for scoped styles to reach them */
:deep(.crowd) {
  stroke: var(--fp-surface);
  stroke-width: 2;
  fill-opacity: 0.85;
}
:deep(.crowd-l) {
  fill: var(--bs-success);
}
:deep(.crowd-m) {
  fill: var(--bs-warning);
}
:deep(.crowd-h) {
  fill: var(--bs-danger);
}
</style>
