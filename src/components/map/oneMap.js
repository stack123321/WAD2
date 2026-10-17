// Owner: Surya. The one place every map in the app is set up: a Leaflet map of Singapore on
// OneMap's free base map (no key needed). Used by MembersMap (06), CrowdHeatmap (08, /crowds) and
// BaseMap (09, 10). Each map then adds its own pins on top.
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

export const SINGAPORE = [1.3521, 103.8198]

// Stop the map from scrolling away from Singapore
const BOUNDS = [
  [1.144, 103.535],
  [1.494, 104.1],
]

// OneMap's terms of use require this credit on the map
const ATTRIBUTION =
  '<a href="https://www.onemap.gov.sg/" target="_blank" rel="noopener">OneMap</a> &copy; contributors | <a href="https://www.sla.gov.sg/" target="_blank" rel="noopener">Singapore Land Authority</a>'

/**
 * Create a OneMap map of Singapore in a <div>.
 * @param {HTMLElement | string} el the <div> (or its id)
 * @param {{ center?: [number, number], zoom?: number, zoomTopRight?: boolean }} [options]
 * @returns {{ map: L.Map, stop: () => void }} stop() removes the map (call it when leaving the page)
 */
export function createOneMap(el, options = {}) {
  let center = SINGAPORE
  if (options.center) {
    center = options.center
  }
  let zoom = 11
  if (options.zoom) {
    zoom = options.zoom
  }

  const map = L.map(el, {
    center: center,
    zoom: zoom,
    minZoom: 11,
    maxBounds: BOUNDS,
    zoomControl: !options.zoomTopRight, // the default zoom buttons sit top-left
  })
  if (options.zoomTopRight) {
    L.control.zoom({ position: 'topright' }).addTo(map)
  }

  L.tileLayer('https://www.onemap.gov.sg/maps/tiles/Default/{z}/{x}/{y}.png', {
    maxZoom: 19,
    detectRetina: true,
    attribution: ATTRIBUTION,
  }).addTo(map)

  // If the map's box changes size after it's drawn (e.g. the step bar appears above it, or the
  // window is resized), tell Leaflet to measure it again. Otherwise part of the map stays grey.
  const box = typeof el === 'string' ? document.getElementById(el) : el
  const resizeWatcher = new ResizeObserver(() => map.invalidateSize())
  resizeWatcher.observe(box)

  function stop() {
    resizeWatcher.disconnect()
    map.remove()
  }

  return { map: map, stop: stop }
}
