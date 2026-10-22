<script setup>
// Owner: Surya. Leaflet map of Singapore with one pin per hangout member, labelled with where
// they're coming from. Used on 06 Starting points. The map itself comes from createOneMap().
// Members without a starting point yet are skipped. The pins redraw whenever members change.
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import L from 'leaflet'
import { isInSingapore } from '@/services/onemap'
import { createOneMap } from './oneMap'
import { avatarColor } from '@/utils/avatarColor'

const props = defineProps({
  // [{ user_id, display_name, avatar_color, start_label, start_lat, start_lng }]
  members: { type: Array, required: true },
  // this member's pin is drawn bigger (the logged-in user)
  highlightId: { type: String, default: null },
  // a soft "Rough middle so far" dot: { lat, lng }, or null to hide it
  middle: { type: Object, default: null },
  // this member's pin can be dragged; the map emits "move" with the new { lat, lng },
  // or "outside" (and puts the pin back) if it was dropped outside Singapore
  draggableId: { type: String, default: null },
})

const emit = defineEmits(['move', 'outside'])

const mapEl = ref(null) // the <div> the map is drawn in
let map = null
let pins = null // Leaflet layer that holds the markers, so we can clear and redraw them
let stopMap = null // removes the map when leaving the page
let justDragged = false // after a drag, redraw the pins but don't move the map around

// Part (a) Create the map once the <div> is on the page
onMounted(() => {
  const created = createOneMap(mapEl.value, { zoomTopRight: true })
  map = created.map
  stopMap = created.stop
  pins = L.layerGroup().addTo(map)
  drawPins()
})

// Remove the map when we leave the page
onBeforeUnmount(() => {
  if (stopMap) {
    stopMap()
  }
})

// Redraw whenever anyone's starting point changes (deep: also notices changes inside each member)
watch(() => [props.members, props.highlightId, props.draggableId, props.middle], drawPins, {
  deep: true,
})

// Part (b) Draw one pin per member who has a starting point
function drawPins() {
  if (!map) {
    return
  }
  pins.clearLayers()

  const placed = []
  for (const m of props.members) {
    if (m.start_lat != null && m.start_lng != null) {
      placed.push(m)
    }
  }

  for (const m of placed) {
    const marker = L.marker([m.start_lat, m.start_lng], {
      icon: pinIcon(m),
      draggable: m.user_id === props.draggableId,
      title: `${m.display_name} · ${m.start_label}`,
    })
    // When a drag ends, tell the parent where the pin is now
    marker.on('dragend', () => {
      const position = marker.getLatLng()

      // Validation: a starting point must be in Singapore. If not, put the pin back where it was.
      if (!isInSingapore(position.lat, position.lng)) {
        marker.setLatLng([m.start_lat, m.start_lng])
        emit('outside')
        return
      }

      justDragged = true
      emit('move', { lat: position.lat, lng: position.lng })
    })
    marker.addTo(pins)
  }

  // The rough middle of everyone so far (a preview: 08 Midpoint picks the real fair spot)
  if (props.middle) {
    L.marker([props.middle.lat, props.middle.lng], {
      icon: L.divIcon({
        className: '',
        html: '<div class="middle-wrap"><span class="middle-dot"></span><span class="middle-label">Rough middle so far</span></div>',
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      }),
      interactive: false, // just a picture: it can't be clicked or dragged
      zIndexOffset: -100, // stays under people's pins
    }).addTo(pins)
  }

  // Zoom to fit everyone, except right after a drag (the map would jump while you're adjusting)
  if (justDragged) {
    justDragged = false
    return
  }
  if (placed.length === 1) {
    map.setView([placed[0].start_lat, placed[0].start_lng], 14)
  } else if (placed.length > 1) {
    const points = []
    for (const m of placed) {
      points.push([m.start_lat, m.start_lng])
    }
    map.fitBounds(points, { padding: [60, 60], maxZoom: 14 })
  }
}

// Part (c) What each pin looks like
// A round pin in the member's colour with their initial, plus a label chip, e.g. "Jurong East".
function pinIcon(m) {
  const isHighlighted = m.user_id === props.highlightId
  let size = 34
  let wrapClass = 'pin-wrap'
  if (isHighlighted) {
    size = 40
    wrapClass = 'pin-wrap pin-me'
  }

  // the saved colour if it looks like #0E7C6B, otherwise one picked from the name
  const color = avatarColor(m.avatar_color, m.display_name)

  const initial = escapeHtml(m.display_name.charAt(0))
  const place = escapeHtml(shortPlace(m.start_label))

  return L.divIcon({
    className: '',
    html: `<div class="${wrapClass}">
        <span class="pin" style="background:${color};width:${size}px;height:${size}px">${initial}</span>
        <span class="pin-label">${place}</span>
      </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2], // the pin's centre sits on the exact spot
  })
}

// "Jurong East MRT (EW24 / NS1)" → "Jurong East", "4 Tampines Central 5, S529510" → "4 Tampines Central 5"
function shortPlace(label) {
  let text = String(label ?? '').split(',')[0]

  const bracket = text.indexOf(' (')
  if (bracket !== -1) {
    text = text.slice(0, bracket)
  }
  if (text.endsWith(' MRT Station')) {
    text = text.slice(0, -' MRT Station'.length)
  } else if (text.endsWith(' MRT')) {
    text = text.slice(0, -' MRT'.length)
  }
  return text
}

// Names and labels go inside HTML, so turn < > & " ' into safe text first
function escapeHtml(text) {
  return String(text ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
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
.members-map :deep(.middle-wrap) {
  display: flex;
  align-items: center;
  gap: 6px;
  width: max-content;
}

.members-map :deep(.middle-dot) {
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  border: 3px dashed var(--fp-primary);
  border-radius: 50%;
  background: color-mix(in srgb, var(--fp-primary) 25%, transparent);
}

.members-map :deep(.middle-label) {
  padding: 0.15rem 0.45rem;
  border-radius: 6px;
  background: color-mix(in srgb, var(--fp-primary) 90%, black);
  color: var(--fp-surface);
  font-size: 0.7rem;
  font-weight: 600;
  white-space: nowrap;
}

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
  color: #fff;
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
