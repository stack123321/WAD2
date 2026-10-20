<script setup>
// Owner: Ryan
// small read-only map for the UP NEXT card: each member who has added a location, the fair midpoint,
// and dashed lines between them (the map itself comes from createOneMap)
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import L from 'leaflet'
import { createOneMap } from '@/components/map/oneMap'
import { readableInk } from '@/utils/color'

const props = defineProps({
  // [{ user_id, display_name, avatar_color, start_lat, start_lng }], the ones with no start point are skipped
  members: { type: Array, default: () => [] },
  // the fair midpoint as { lat, lng }, or null before there is one
  midpoint: { type: Object, default: null },
})

const mapEl = ref(null)
let map = null
let layers = null // a group holding the markers and lines, so we can clear and redraw them
let stopMap = null // removes the map when the card goes away
const justYou = ref(false) // shows "Add friends to find a fair midpoint"
let points = [] // everything on the map, so it can be fitted again when the map changes size

// names go inside html, so turn < > & " ' into safe text first
function escapeHtml(text) {
  return String(text ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function draw() {
  if (!map) return
  layers.clearLayers()

  const placed = props.members.filter((m) => m.start_lat != null && m.start_lng != null)
  points = placed.map((m) => [m.start_lat, m.start_lng])
  if (props.midpoint) points.push([props.midpoint.lat, props.midpoint.lng])
  justYou.value = placed.length === 1 && !props.midpoint

  // thin dashed lines from each member to the midpoint, under the markers
  if (props.midpoint) {
    for (let m of placed) {
      L.polyline(
        [
          [m.start_lat, m.start_lng],
          [props.midpoint.lat, props.midpoint.lng],
        ],
        {
          className: 'link-line',
          weight: 1.5,
          opacity: 0.75,
          dashArray: '5 5',
          interactive: false,
        },
      ).addTo(layers)
    }
  }

  // a small avatar for each member, the initial in their colour
  for (let m of placed) {
    const color = /^#[0-9a-f]{6}$/i.test(m.avatar_color ?? '') ? m.avatar_color : null
    const background = color ?? 'var(--fp-muted)'
    const ink = color ? readableInk(color) : 'var(--fp-surface)'
    L.marker([m.start_lat, m.start_lng], {
      interactive: false,
      icon: L.divIcon({
        className: '',
        html: `<span class="member-dot" style="background:${background};color:${ink}">${escapeHtml(m.display_name.charAt(0))}</span>`,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      }),
    }).addTo(layers)
  }

  // the midpoint pin, a teardrop with its tip on the spot
  if (props.midpoint) {
    L.marker([props.midpoint.lat, props.midpoint.lng], {
      interactive: false,
      zIndexOffset: 1000,
      icon: L.divIcon({
        className: '',
        html: '<span class="up-next-pin"></span>',
        iconSize: [28, 28],
        iconAnchor: [14, 28],
      }),
    }).addTo(layers)
  }

  fit()
}

// fit everything in view with some padding, or centre on a single point
function fit() {
  if (!map) return
  if (points.length > 1) {
    map.fitBounds(points, { padding: [32, 32], maxZoom: 15, animate: false })
  } else if (points.length === 1) {
    map.setView(points[0], 14, { animate: false })
  }
}

onMounted(() => {
  const created = createOneMap(mapEl.value)
  stopMap = created.stop
  map = created.map

  // a picture only: no zoom buttons or dragging, so scrolling the page never gets stuck on it
  map.zoomControl.remove()
  map.attributionControl.setPrefix(false) // keep OneMap's credit, drop the "Leaflet" prefix
  map.setMaxBounds(null) // a small panel needs to zoom out past the helper's Singapore bounds
  map.setMinZoom(10) // one level further out than the other maps, so a spread group fits
  map.dragging.disable()
  map.touchZoom.disable()
  map.doubleClickZoom.disable()
  map.scrollWheelZoom.disable()
  map.boxZoom.disable()
  map.keyboard.disable()

  layers = L.layerGroup().addTo(map)
  map.on('resize', fit) // the card finishes its layout after the map is made, so fit again
  draw()
})

onBeforeUnmount(() => {
  if (stopMap) stopMap()
})

watch(() => [props.members, props.midpoint], draw, { deep: true })
</script>

<template>
  <div class="map-wrap">
    <div
      ref="mapEl"
      class="map"
      role="group"
      aria-label="Map of where everyone is coming from"
    ></div>
    <span v-if="justYou" class="map-caption">Add friends to find a fair midpoint</span>
  </div>
</template>

<style scoped>
.map-wrap {
  position: relative;
  min-height: 140px;
  overflow: hidden; /* so the tiles follow the card's rounded corners */
}
.map {
  position: absolute;
  inset: 0;
  z-index: 0; /* keep leaflet's layers under the navbar and the menus */
}
.map-caption {
  position: absolute;
  left: 0.5rem;
  bottom: 1.4rem;
  z-index: 1;
  padding: 0.25rem 0.6rem;
  background: var(--fp-surface);
  border-radius: var(--fp-radius-sm);
  box-shadow: var(--fp-shadow);
  font-size: 0.8rem;
  font-weight: 600;
}
:deep(.member-dot) {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: 3px solid var(--fp-surface);
  box-shadow: var(--fp-shadow);
  font-size: 0.7rem;
  font-weight: 700;
}
:deep(.link-line) {
  stroke: var(
    --fp-muted
  ); /* leaflet draws lines as svg, so the colour is set here and not as an option */
}
:deep(.up-next-pin) {
  display: block;
  width: 28px;
  height: 28px;
  border-radius: 50% 50% 50% 0;
  transform: rotate(-45deg);
  background: var(--fp-primary);
  border: 3px solid var(--fp-surface);
  box-shadow: var(--fp-shadow);
}
/* the OneMap credit stays (their terms require it), just small and quiet */
:deep(.leaflet-control-attribution) {
  font-size: 9px;
  opacity: 0.7;
  background: color-mix(in srgb, var(--fp-surface) 70%, transparent) !important;
}
:deep(.leaflet-control-attribution a) {
  color: inherit;
}
</style>
