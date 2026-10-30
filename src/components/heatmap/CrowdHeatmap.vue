<script setup>
// Owner: Ryan
// crowd heat map for 08 and /crowds: station circles, time slider, and on 08 the midpoint pin and starting points
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import L from 'leaflet' // the map library
import { createOneMap } from '@/components/map/oneMap' // sets up the shared onemap map of singapore
import { getCrowdLevels } from '@/services/crowd'
import { avatarColor } from '@/utils/avatarColor'
import { escapeHtml } from '@/utils/escapeHtml' // names go inside the pins' html

const props = defineProps({
  // the group's midpoint as { name, lat, lng }, or null when there isn't one (the /crowds page)
  midpoint: { type: Object, default: null },
  // on 08 the midpoint pin can be dragged, it emits "move" with the dropped { lat, lng }
  draggable: { type: Boolean, default: false },
  // everyone's starting points, [{ user_id, display_name, avatar_color, start_label, start_lat, start_lng }]
  members: { type: Array, default: () => [] },
  // (surya) a station being previewed on 08's station tabs, { name, lat, lng }, or null: the map
  // moves there and shows a light pin
  preview: { type: Object, default: null },
})

// tells the parent where the midpoint pin was dropped, and (surya) when "back to midpoint" is pressed.
// (Eashvar) "levels" hands the parent every station's level and the slider's time after each load,
// so /crowds can list the busiest and quietest beside the map
const emit = defineEmits(['move', 'recenter', 'levels'])

// leaflet objects are plain variables, not refs, because leaflet owns them and vue doesn't need to watch them
let map = null
let midpointMarker = null
let previewMarker = null // (surya) the light pin for a previewed station
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
  const hour = Math.floor(slot.value / 2) // 2 slots per hour, so slot 37 is hour 18
  const minutes = slot.value % 2 === 0 ? '00' : '30' // even slots are on the hour, odd ones half past
  const suffix = hour < 12 ? 'am' : 'pm'
  const hour12 = hour % 12 === 0 ? 12 : hour % 12 // 0 and 12 both show as 12, 18 shows as 6
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
// it runs when the slider is let go (@change), not on every small move, so dragging doesn't send dozens of requests.
async function loadCrowd() {
  loading.value = true
  error.value = ''
  try {
    // every station with its level at that time
    stations.value = await getCrowdLevels(slotToDate(slot.value))
    drawCircles()
    emit('levels', { stations: stations.value, time: timeLabel.value })
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

// (surya) the previewed station: a light pin with its name, and the map moves there.
// no preview: remove the pin and go back to the midpoint
function drawPreview() {
  if (previewMarker) {
    previewMarker.remove()
    previewMarker = null
  }
  if (!props.preview) {
    recenter()
    return
  }
  previewMarker = L.marker([props.preview.lat, props.preview.lng], {
    icon: L.divIcon({
      className: '',
      html: '<span class="preview-pin"></span>',
      iconSize: [24, 24],
      iconAnchor: [12, 24], // the tip sits on the station
    }),
  })
    .bindTooltip(`Preview: ${escapeHtml(props.preview.name)}`, {
      permanent: true,
      direction: 'top',
      offset: [0, -24],
    })
    .addTo(map)
  map.setView([props.preview.lat, props.preview.lng], 14)
}

// (surya) "back to midpoint": the prof scrolled the map away and couldn't get back
function recenter() {
  if (map && props.midpoint) {
    map.setView([props.midpoint.lat, props.midpoint.lng], 14)
  }
}

function backToMidpoint() {
  recenter()
  emit('recenter') // the page puts the station tabs back on the midpoint
}

// everyone's starting point: round pin in their colour with their initial (like 06), hover or tap for name and origin
function drawMembers() {
  memberPins.clearLayers() // remove the old pins first
  for (let m of props.members) {
    if (m.start_lat == null || m.start_lng == null) {
      continue // no starting point yet
    }
    // the saved colour if it looks like #0E7C6B, otherwise one picked from the name
    const color = avatarColor(m.avatar_color, m.display_name)
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

// leaflet draws into a real div on the page, so the map can only be made once vue has put that div on screen.
// it also has to be removed when the page closes, otherwise coming back would try to draw a second map into the same spot.
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

// leaflet doesn't know about vue, so when the props change these watchers redraw the map by hand.
// (surya) a station tab was tapped (or put back), so show it on the map
watch(
  () => props.preview,
  () => {
    if (map) drawPreview()
  },
)

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
      <div class="map-box">
        <div id="crowd-map"></div>
        <!-- (surya) back to the midpoint after moving the map around -->
        <button v-if="midpoint" type="button" class="recenter-btn" @click="backToMidpoint">
          ⌖ Back to midpoint
        </button>
      </div>

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
/* (surya) the map box, so the "back to midpoint" button can sit on top of the map */
.map-box {
  position: relative;
}

.recenter-btn {
  position: absolute;
  top: 10px; /* top left: the zoom buttons are top right, the map credits along the bottom */
  left: 10px;
  z-index: 500; /* above the map tiles */
  min-height: 44px;
  padding: 0 0.9rem;
  border: 1px solid var(--fp-border);
  border-radius: 999px;
  background: var(--fp-surface);
  color: var(--fp-ink);
  box-shadow: var(--fp-shadow);
  font-size: 0.875rem;
  font-weight: 600;
}

/* (surya) the previewed station's pin: a lighter, dashed version of the midpoint pin */
:deep(.preview-pin) {
  display: block;
  width: 24px;
  height: 24px;
  border: 3px dashed var(--fp-primary);
  border-radius: 50% 50% 50% 0;
  background: color-mix(in srgb, var(--fp-primary) 25%, var(--fp-surface));
  transform: rotate(-45deg);
}

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
  background: var(--fp-midpoint); /* blue, stands out from the green circles */
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
  color: #fff;
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

/* bigger zoom buttons on phones, so they're easy to tap */
@media (max-width: 767px) {
  :deep(.leaflet-control-zoom a) {
    width: 44px;
    height: 44px;
    line-height: 44px;
    font-size: 22px;
  }
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
