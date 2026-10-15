<script setup>
// Owner: Surya. Leaflet map on the OneMap base map. Tiles need no token, so this runs in the browser.
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps({
  // [lat, lng]
  center: { type: Array, required: true },
  zoom: { type: Number, default: 15 },
  // [{ id, lat, lng, label }]
  markers: { type: Array, default: () => [] },
})
const emit = defineEmits(['marker-click'])

const el = ref(null)
let map = null
let markerLayer = null

function drawMarkers() {
  markerLayer.clearLayers()
  for (const m of props.markers) {
    L.circleMarker([m.lat, m.lng], {
      radius: 9,
      color: '#fff',
      weight: 2,
      fillColor: '#0e7c6b',
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
    map.setView(props.markers.length ? [props.markers[0].lat, props.markers[0].lng] : props.center, props.zoom)
  }
}

onMounted(() => {
  map = L.map(el.value, {
    center: props.center,
    zoom: props.zoom,
    minZoom: 11,
    maxBounds: [
      [1.144, 103.535],
      [1.494, 104.502],
    ],
  })

  L.tileLayer('https://www.onemap.gov.sg/maps/tiles/Default/{z}/{x}/{y}.png', {
    detectRetina: true,
    maxZoom: 19,
    minZoom: 11,
    // OneMap terms of use require this attribution
    attribution:
      '<img src="https://www.onemap.gov.sg/web-assets/images/logo/om_logo.png" style="height:20px;width:20px;"/>&nbsp;<a href="https://www.onemap.gov.sg/" target="_blank" rel="noopener noreferrer">OneMap</a>&nbsp;&copy;&nbsp;contributors&nbsp;&#124;&nbsp;<a href="https://www.sla.gov.sg/" target="_blank" rel="noopener noreferrer">Singapore Land Authority</a>',
  }).addTo(map)

  markerLayer = L.layerGroup().addTo(map)
  drawMarkers()
})

watch(() => [props.markers, props.center], () => map && drawMarkers(), { deep: true })

onBeforeUnmount(() => map?.remove())
</script>

<template>
  <div ref="el" class="base-map"></div>
</template>

<style scoped>
.base-map {
  min-height: 240px;
  border-radius: var(--fp-radius-sm);
  z-index: 0;
}
</style>
