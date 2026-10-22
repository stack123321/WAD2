<script setup>
// Owner: Ryan
// crowd heat map for 08 and /crowds: station circles, time slider, and on 08 the midpoint pin and starting points
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import L from 'leaflet' // the map library
import { createOneMap } from '@/components/map/oneMap' // sets up the shared onemap map of singapore
import { getCrowdLevels } from '@/services/crowd'

const props = defineProps({
  // the group's midpoint as { name, lat, lng }, or null when there isn't one (the /crowds page)
  midpoint: { type: Object, default: null },
  // on 08 the midpoint pin can be dragged, it emits "move" with the dropped { lat, lng }
  draggable: { type: Boolean, default: false },
  // everyone's starting points, [{ user_id, display_name, avatar_color, start_label, start_lat, start_lng }]
  members: { type: Array, default: () => [] },
})

// tells the parent where the midpoint pin was dropped
const emit = defineEmits(['move'])

// leaflet objects are plain variables, not refs, because leaflet owns them and vue doesn't need to watch them
let map = null
let midpointMarker = null
let memberPins = null // a group holding everyone's starting-point pins
let stopMap = null // removes the map when leaving the page

// lta's level letters as words for the tooltips
const LEVEL_NAMES = { l: 'Low', m: 'Moderate', h: 'High' }

const slot = ref(currentSlot()) // half-hour slots today: 0 = 12:00 am, 1 = 12:30 am ... 47 = 11:30 pm
const stations = ref([]) // the answer from the server, one object per station
const loading = ref(false)
const error = ref('')

let circles = null // a group holding all station circles, so we can clear them in one go

// the slot as text, e.g. slot 37 is "6:30 pm"
const timeLabel = computed(() => {
  const hour = Math.floor(slot.value / 2)
  const minutes = slot.value % 2 === 0 ? '00' : '30'
  const suffix = hour < 12 ? 'am' : 'pm'
  const hour12 = hour % 12 === 0 ? 12 : hour % 12
  return `${hour12}:${minutes} ${suffix}`
})

// true when lta was unavailable and api/crowd.js sent sample data instead
const isSample = computed(
  () => stations.value.length > 0 && stations.value[0].station.includes('(sample)'),
)

// the slot that contains the current time
function currentSlot() {
  const now = new Date()
  return now.getHours() * 2 + (now.getMinutes() >= 30 ? 1 : 0)
}

// slot number to a Date today at that time
function slotToDate(s) {
  const date = new Date()
  date.setHours(Math.floor(s / 2), (s % 2) * 30, 0, 0)
  return date
}

// asks the server for the crowd at the slider's time, then draws the circles
async function loadCrowd() {
  loading.value = true
  error.value = ''
  try {
    // every station with its level at that time
    stations.value = await getCrowdLevels(slotToDate(slot.value))
    drawCircles()
  } catch (err) {
    console.log(err)
    error.value = 'Could not load crowd levels. Try again in a moment.'
  }
  loading.value = false
}

// one circle per station, coloured by its level
function drawCircles() {
  circles.clearLayers() // remove the old circles first
  for (let s of stations.value) {
    // the class makes the colour, see .crowd-l, .crowd-m and .crowd-h in the css
    L.circleMarker([s.lat, s.lng], { radius: 9, className: `crowd crowd-${s.level}` })
      .bindTooltip(`${s.station}: ${LEVEL_NAMES[s.level]}`) // station name and level on hover
      .addTo(circles) // into the circles group
  }
}

// draws the midpoint pin, a teardrop with the station name beside it, draggable on 08
function drawMidpoint() {
  if (midpointMarker) {
    // remove the old pin first, so redrawing doesn't stack pins
    midpointMarker.remove()
    midpointMarker = null
  }
  if (!props.midpoint) {
    // no midpoint, so no pin (the /crowds page)
    return
  }
  // create the pin, give it a label, then add it to the map
  midpointMarker = L.marker([props.midpoint.lat, props.midpoint.lng], {
    draggable: props.draggable, // so the pin can be picked up and moved
    zIndexOffset: 1000, // above the station circles
    // the icon is made from html instead of an image file
    icon: L.divIcon({
      className: '', // removes leaflet's default icon styling
      html: '<span class="midpoint-pin"></span>', // so the css can style the pin
      iconSize: [28, 28], // the icon's width and height
      iconAnchor: [14, 28], // the pin's tip, bottom middle, sits on the exact spot
    }),
  })
    .bindTooltip(`Midpoint: ${props.midpoint.name}`, {
      permanent: true, // keep the name visible
      direction: 'top', // above the pin
      offset: [0, -28], // and a little higher so it clears the pin
    })
    .addTo(map)

  // when the pin is dropped, tell the parent its new position
  midpointMarker.on('dragend', () => {
    const position = midpointMarker.getLatLng()
    emit('move', { lat: position.lat, lng: position.lng })
  })
}

// everyone's starting point: round pin in their colour with their initial (like 06), hover or tap for name and origin
function drawMembers() {
  memberPins.clearLayers() // remove the old pins first
  for (let m of props.members) {
    if (m.start_lat == null || m.start_lng == null) {
      continue // no starting point yet
    }
    // avatar_color comes from the database, so only use it if it looks like a colour (#0E7C6B)
    let color = 'var(--fp-primary)'
    if (m.avatar_color && m.avatar_color.startsWith('#')) {
      color = escapeHtml(m.avatar_color)
    }
    // a coloured circle with the first letter of the name, escaped because it goes into html
    L.marker([m.start_lat, m.start_lng], {
      icon: L.divIcon({
        className: '',
        html: `<span class="member-pin" style="background:${color}">${escapeHtml(m.display_name.charAt(0))}</span>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15], // the pin's centre sits on the exact spot
      }),
    })
      .bindTooltip(`${escapeHtml(m.display_name)} · ${escapeHtml(m.start_label)}`) // name and origin on hover
      .addTo(memberPins) // into the group, so clearLayers can remove all the pins at once
  }
}

// names go inside html, so turn < > & " ' into safe text first
function escapeHtml(text) {
  return String(text ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

// where the map first looks: all the points together, or just the midpoint, or the whole island on /crowds
function fitToGroup() {
  let points = [] // a list of [lat, lng] pairs
  for (let m of props.members) {
    if (m.start_lat != null && m.start_lng != null) {
      points.push([m.start_lat, m.start_lng])
    }
  }
  if (props.midpoint) {
    points.push([props.midpoint.lat, props.midpoint.lng])
  }
  if (points.length > 1) {
    // two or more points, zoom to fit them all, 40px from the edges and not too close
    map.fitBounds(points, { padding: [40, 40], maxZoom: 14 })
  } else if (props.midpoint) {
    // only the midpoint, centre on it at a fixed zoom
    map.setView([props.midpoint.lat, props.midpoint.lng], 14)
  }
}

// runs once the page has the #crowd-map div, which is when leaflet can draw into it
onMounted(() => {
  // the shared onemap map of singapore (same as 06), zoom buttons top right
  const created = createOneMap('crowd-map', { zoomTopRight: true })
  map = created.map
  stopMap = created.stop

  // one group for the station circles and one for the members' pins, so each can be cleared at once
  circles = L.layerGroup().addTo(map)
  memberPins = L.layerGroup().addTo(map)

  drawMembers() // pins for the starting points we already have
  drawMidpoint() // the midpoint pin
  fitToGroup() // point the camera at them
  loadCrowd() // ask the server for the crowd levels
})

// remove the map when we leave the page
onBeforeUnmount(() => {
  if (stopMap) {
    stopMap() // disconnects the resize watcher and removes the map
  }
})

// the midpoint changed, e.g. after a drag snaps it to a station, so redraw the pin and pan to it
watch(
  () => props.midpoint,
  () => {
    if (!map) return // the map isn't created yet
    drawMidpoint()
    if (props.midpoint) {
      // slide the view to the new midpoint
      map.panTo([props.midpoint.lat, props.midpoint.lng])
    }
  },
  { deep: true }, // also fires when something inside the object changes
)

// a member's start point or travel info changed, so redraw the pins and leave the zoom alone
watch(() => props.members, drawMembers, { deep: true })
</script>

<template>
  <div class="card">
    <div class="card-body">
      <h2 class="h5">Crowd levels at MRT stations</h2>

      <!-- an empty box, leaflet draws the map into it in onMounted, its height is in the css -->
      <div id="crowd-map"></div>

      <label for="crowd-time" class="form-label mt-3">
        Time today: <strong>{{ timeLabel }}</strong>
      </label>
      <!-- the slider, v-model updates slot as you drag and the crowd reloads when you let go -->
      <input
        id="crowd-time"
        type="range"
        class="form-range"
        min="0"
        max="47"
        v-model.number="slot"
        @change="loadCrowd"
      />

      <!-- one message at a time: loading, error, no data, or sample data -->
      <p v-if="loading" class="text-muted small mb-2">Loading crowd levels…</p>
      <p v-else-if="error" class="text-danger small mb-2">{{ error }}</p>
      <p v-else-if="stations.length === 0" class="text-muted small mb-2">
        No crowd data for this time.
      </p>
      <p v-else-if="isSample" class="text-muted small mb-2">
        LTA is unavailable, so these are sample crowd levels.
      </p>

      <!-- the legend, colours match the circles in the css below -->
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
  z-index: 0; /* keep leaflet's layers under the navbar and dropdowns */
}

/* bigger on laptops, map is the main thing */
@media (min-width: 992px) {
  #crowd-map {
    height: 520px;
  }
}

/* the midpoint pin, a square with three round corners rotated into a teardrop, :deep() because leaflet draws it */
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

/* everyone's starting points, a round pin with their initial, :deep() because leaflet draws them */
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

/* zoom buttons styled like the 06 map */
:deep(.leaflet-control-zoom) {
  border: none;
  box-shadow: var(--fp-shadow);
  border-radius: var(--fp-radius-sm);
  overflow: hidden;
}

/* the station circles, drawCircles gives each one the class .crowd and .crowd-l, .crowd-m or .crowd-h */
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
