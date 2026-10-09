<script setup>
// Owner: Surya. Leaflet map of Singapore with one pin per hangout member, labelled with where
// they're coming from. Used on 06 Starting points; 08 Midpoint can reuse it.
// Members without a starting point yet are skipped. The pins redraw whenever members change.
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const props = defineProps({
  // [{ user_id, display_name, avatar_color, start_label, start_lat, start_lng }]
  members: { type: Array, required: true },
  // this member's pin is drawn bigger (the logged-in user)
  highlightId: { type: String, default: null },
  // this member's pin can be dragged; the map emits "move" with the new { lat, lng }
  draggableId: { type: String, default: null },
})

const emit = defineEmits(['move'])

const SINGAPORE = [1.3521, 103.8198]
const mapEl = ref(null)
let map = null
let pins = null // Leaflet layer that holds the markers, so we can clear and redraw them
let justDragged = false // after a drag, redraw the pins but don't jump the map around

onMounted(() => {
  map = L.map(mapEl.value, {
    center: SINGAPORE,
    zoom: 11,
    minZoom: 11,
    zoomControl: false,
    maxBounds: [
      [1.144, 103.535],
      [1.494, 104.1],
    ],
  })
  L.control.zoom({ position: 'topright' }).addTo(map)
  // OneMap's free base map (no key needed)
  L.tileLayer('https://www.onemap.gov.sg/maps/tiles/Default/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution:
      '<a href="https://www.onemap.gov.sg/" target="_blank" rel="noopener">OneMap</a> &copy; contributors | <a href="https://www.sla.gov.sg/" target="_blank" rel="noopener">Singapore Land Authority</a>',
  }).addTo(map)
  pins = L.layerGroup().addTo(map)
  drawPins()
})

onBeforeUnmount(() => map?.remove())

watch(() => [props.members, props.highlightId, props.draggableId], drawPins, { deep: true })

function drawPins() {
  if (!map) return
  pins.clearLayers()

  const placed = props.members.filter((m) => m.start_lat != null && m.start_lng != null)
  for (const m of placed) {
    const marker = L.marker([m.start_lat, m.start_lng], {
      icon: pinIcon(m),
      draggable: m.user_id === props.draggableId,
      title: `${m.display_name} · ${m.start_label}`,
    })
    marker.on('dragend', () => {
      justDragged = true
      const { lat, lng } = marker.getLatLng()
      emit('move', { lat, lng })
    })
    marker.addTo(pins)
  }

  if (justDragged) {
    justDragged = false
    return
  }
  if (placed.length === 1) {
    map.setView([placed[0].start_lat, placed[0].start_lng], 14)
  } else if (placed.length > 1) {
    const bounds = placed.map((m) => [m.start_lat, m.start_lng])
    map.fitBounds(bounds, { padding: [60, 60], maxZoom: 14 })
  }
}

/** A round pin in the member's colour with their initial, plus a label chip, e.g. "Jurong East". */
function pinIcon(m) {
  const isMe = m.user_id === props.highlightId
  const size = isMe ? 40 : 34
  // avatar_color comes from the database, so only accept a real hex colour
  const color = /^#[0-9a-f]{3,8}$/i.test(m.avatar_color) ? m.avatar_color : 'var(--fp-primary)'
  return L.divIcon({
    className: '',
    html: `<div class="pin-wrap${isMe ? ' pin-me' : ''}">
        <span class="pin" style="background:${color};width:${size}px;height:${size}px">${escapeHtml(m.display_name.charAt(0))}</span>
        <span class="pin-label">${escapeHtml(shortPlace(m.start_label))}</span>
      </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

/** "Jurong East MRT (EW24 / NS1)" → "Jurong East", "4 Tampines Central 5, S529510" → "4 Tampines Central 5" */
function shortPlace(label) {
  return String(label ?? '')
    .split(',')[0]
    .replace(/\s*\(.*\)\s*$/, '')
    .replace(/\s+MRT(\s+Station)?$/i, '')
}

/** Names and labels go inside HTML, so turn < > & " into safe text first. */
function escapeHtml(text) {
  return String(text ?? '').replace(
    /[&<>"']/g,
    (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch],
  )
}
</script>

<template>
  <div
    ref="mapEl"
    class="members-map"
    role="region"
    aria-label="Map of everyone's starting points"
  ></div>
</template>

<style scoped>
.members-map {
  width: 100%;
  height: 100%;
  z-index: 0; /* keep Leaflet's panes under the navbar and dropdowns */
}

/* Leaflet adds the pins itself, outside Vue's template, so they need :deep() */
.members-map :deep(.pin-wrap) {
  display: flex;
  align-items: center;
  gap: 6px;
  width: max-content;
}

.members-map :deep(.pin) {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: 3px solid var(--fp-surface);
  box-shadow: var(--fp-shadow);
  color: var(--fp-surface);
  font-weight: 700;
  font-size: 0.85rem;
}

.members-map :deep(.pin-me .pin) {
  font-size: 1rem;
  cursor: grab;
}

.members-map :deep(.pin-label) {
  background: var(--fp-surface);
  color: var(--fp-ink);
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.2rem 0.5rem;
  border-radius: 6px;
  box-shadow: var(--fp-shadow);
  white-space: nowrap;
}

.members-map :deep(.leaflet-control-zoom) {
  border: none;
  box-shadow: var(--fp-shadow);
  border-radius: var(--fp-radius-sm);
  overflow: hidden;
  margin: 1.5rem 1.5rem 0 0;
}
</style>
