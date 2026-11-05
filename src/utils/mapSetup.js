// Owner: Surya. The one place every map in the app is set up: a Leaflet map of Singapore on
// OneMap's free base map (no key needed). Used by MembersMap (06), CrowdHeatmap (08, /crowds) and
// BaseMap (09, 10). Each map then adds its own pins on top.
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { SEA_COLOR } from './palette'

export const SINGAPORE = [1.3521, 103.8198]

// Stop the map from scrolling away from Singapore. OneMap only has map pictures inside this box
// (west of about 103.6° there are none, which showed up as a grey strip).
const BOUNDS = [
  [1.144, 103.6],
  [1.494, 104.1],
]

// OneMap's terms of use require this credit on the map
const ATTRIBUTION =
  '<a href="https://www.onemap.gov.sg/" target="_blank" rel="noopener">OneMap</a> &copy; contributors | <a href="https://www.sla.gov.sg/" target="_blank" rel="noopener">Singapore Land Authority</a>'

/**
 * Create a OneMap map of Singapore in a <div>.
 * @param {HTMLElement | string} el the <div> (or its id)
 * @param {{ center?: [number, number], zoom?: number, zoomTopRight?: boolean, tapToInteract?: boolean }} [options]
 *   tapToInteract (default true): on phones, cover the map with "Tap to interact" until tapped
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
    maxBoundsViscosity: 1, // the edges are firm: you can't drag the map past Singapore
    zoomControl: !options.zoomTopRight, // the default zoom buttons sit top-left
  })
  if (options.zoomTopRight) {
    L.control.zoom({ position: 'topright' }).addTo(map)
  }
  map.getContainer().style.backgroundColor = SEA_COLOR

  L.tileLayer('https://www.onemap.gov.sg/maps/tiles/Default/{z}/{x}/{y}.png', {
    maxZoom: 19,
    detectRetina: true,
    attribution: ATTRIBUTION,
  }).addTo(map)

  // On phones the map covers the screen, so a swipe over it moves the map instead of the page.
  // Until it's tapped, a "Tap to interact" cover lets the swipe scroll the page; tapping outside
  // the map puts the cover back.
  const box = typeof el === 'string' ? document.getElementById(el) : el
  let removeCover = () => {}
  if (options.tapToInteract !== false) {
    const phone = window.matchMedia('(max-width: 767.98px)')
    const cover = document.createElement('button')
    cover.type = 'button'
    cover.textContent = 'Tap to interact'
    // colours from tokens.css, like the rest of the app
    cover.style.cssText =
      'position:absolute;inset:0;z-index:1200;display:none;align-items:center;justify-content:center;' +
      'width:100%;border:0;background:color-mix(in srgb, var(--fp-ink) 35%, transparent);color:var(--fp-white);' +
      'font-weight:600;font-size:1rem;cursor:pointer;touch-action:pan-y;'
    let locked = true
    // Leaflet listens for touches on the map's own div, so the cover alone doesn't stop pinch-zoom
    // or dragging; switch the map's handlers off while it is covered
    const handlers = [
      map.dragging,
      map.touchZoom,
      map.doubleClickZoom,
      map.scrollWheelZoom,
      map.boxZoom,
      map.keyboard,
    ]
    const showCover = () => {
      const covered = phone.matches && locked
      cover.style.display = covered ? 'flex' : 'none'
      for (const handler of handlers) {
        if (covered) handler.disable()
        else handler.enable()
      }
    }
    const unlock = () => {
      locked = false
      showCover()
    }
    const relock = (event) => {
      if (!box.contains(event.target)) {
        locked = true
        showCover()
      }
    }
    cover.addEventListener('click', unlock)
    document.addEventListener('pointerdown', relock)
    phone.addEventListener('change', showCover)
    // scrolling the map off screen puts the cover back
    const visibilityWatcher = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) {
        locked = true
        showCover()
      }
    })
    visibilityWatcher.observe(box)
    box.appendChild(cover)
    showCover()
    removeCover = () => {
      document.removeEventListener('pointerdown', relock)
      phone.removeEventListener('change', showCover)
      visibilityWatcher.disconnect()
      cover.remove()
    }
  }

  // If the map's box changes size after it's drawn (e.g. the step bar appears above it, or the
  // window is resized), tell Leaflet to measure it again. Otherwise part of the map stays grey.
  const resizeWatcher = new ResizeObserver(() => map.invalidateSize())
  resizeWatcher.observe(box)

  function stop() {
    removeCover()
    resizeWatcher.disconnect()
    map.remove()
  }

  return { map: map, stop: stop }
}
