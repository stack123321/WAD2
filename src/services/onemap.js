// Owner: Surya. OneMap search for 06 Starting points.
// OneMap needs a login token, so the real OneMap calls are in api/search.js and api/reverse.js
// (they run on the server). These functions just ask those api/ functions.
import axios from 'axios'

/**
 * Search for a place by name, address or postal code.
 * @param {string} query what the user typed, e.g. "Tampines MRT" or "529510"
 * @returns {Promise<Array<{ label: string, address: string | null, lat: number, lng: number, postal: string | null }>>}
 */
export async function searchAddress(query) {
  const q = query.trim()
  if (q.length < 2) {
    return []
  }

  const response = await axios.get('/api/search', { params: { q: q } })
  return response.data
}

/**
 * True if a point is inside a box around Singapore. Same box as api/reverse.js checks on the server.
 * Used before asking OneMap about a point (current location, dragged pin).
 */
export function isInSingapore(lat, lng) {
  return lat >= 1.15 && lat <= 1.48 && lng >= 103.6 && lng <= 104.1
}

/**
 * The name of the place at a point, e.g. after dragging your pin.
 * @returns {Promise<{ label: string, address: string | null, lat: number, lng: number, postal: string | null } | null>}
 *   null when there's no address nearby (e.g. a point in the sea)
 */
export async function reverseGeocode(lat, lng) {
  const response = await axios.get('/api/reverse', { params: { lat: lat, lng: lng } })
  return response.data
}
