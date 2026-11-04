<script setup>
// Owner: Surya. A simple map with clickable dots (09 Nearby spots, 10 Spot details).
// The map itself comes from createOneMap() (OneMap tiles, no key needed).
import L from 'leaflet'
import { createOneMap } from '@/utils/mapSetup'
import { PIN_FILL, PIN_RING } from '@/utils/palette'
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps({
  // [lat, lng]
  center: { type: Array, required: true },
  zoom: { type: Number, default: 15 },
  // [{ id, lat, lng, label }]
  markers: { type: Array, default: () => [] },
  // extra space around the map on phones; the Explore map turns it off
  padded: { type: Boolean, default: true },
})
const emit = defineEmits(['marker-click'])

const el = ref(null)
let map = null
let markerLayer = null
let stopMap = null // removes the map when leaving the page

function drawMarkers() {
  markerLayer.clearLayers()
  for (const m of props.markers) {
    L.circleMarker([m.lat, m.lng], {
      radius: 9,
      color: PIN_RING,
      weight: 2,
      fillColor: PIN_FILL,
      fillOpacity: 1,
    })
      .bindTooltip(m.label ?? '')
      .on('click', () => emit('marker-click', m.id))
      .addTo(markerLayer)
  }
  if (props.markers.length > 1) {
    map.fitBounds(
      props.markers.map((m) => [m.lat, m.lng]),
      { padding: [24, 24], maxZoom: 16 },
    )
  } else {
    map.setView(
      props.markers.length ? [props.markers[0].lat, props.markers[0].lng] : props.center,
      props.zoom,
    )
  }
}

onMounted(() => {
  const created = createOneMap(el.value, { center: props.center, zoom: props.zoom })
  map = created.map
  stopMap = created.stop

  markerLayer = L.layerGroup().addTo(map)
  drawMarkers()
})

watch(
  () => [props.markers, props.center],
  () => map && drawMarkers(),
  { deep: true },
)

onBeforeUnmount(() => {
  if (stopMap) {
    stopMap()
  }
})
</script>

<template>
  <div ref="el" class="base-map" :class="{ 'is-padded': padded }"></div>
</template>

<style scoped>
.base-map {
  min-height: 240px;
  border-radius: var(--fp-radius-sm);
  z-index: 0;
}

/* room above and below the map to scroll past it with a thumb */
@media (max-width: 767.98px) {
  .base-map.is-padded {
    margin: 1.25rem 0;
  }
}
</style>
