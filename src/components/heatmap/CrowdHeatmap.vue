<script setup>
// Crowd heat map for page 08: one coloured circle per MRT station, plus a time slider for today.
// Owner: Ryan. Data: services/crowd.js → api/crowd.js → LTA DataMall.
import { ref, computed, onMounted } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { getCrowdLevels } from '@/services/crowd'

const props = defineProps({
  midpoint: { type: Object, default: null }, // { name, lat, lng } of the group's midpoint
})

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

onMounted(() => {
  const map = L.map('crowd-map').setView([1.3521, 103.8198], 11) // centre of Singapore
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(map)
  circles = L.layerGroup().addTo(map)

  if (props.midpoint) {
    L.circleMarker([props.midpoint.lat, props.midpoint.lng], {
      radius: 12,
      className: 'crowd-midpoint',
    })
      .bindTooltip(`Midpoint: ${props.midpoint.name}`)
      .addTo(map)
  }

  loadCrowd()
})
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
:deep(.crowd-midpoint) {
  fill: var(--fp-primary);
  stroke: var(--fp-surface);
  stroke-width: 3;
  fill-opacity: 1;
}
</style>
