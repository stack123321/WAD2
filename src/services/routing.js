// Owner: Nicole. Travel time per person and mode, via our /api/route function
// (OneMap Routing needs a token, so the call happens server-side in api/route.js).
import { centroid, fairness, nearestStations, rankAreas } from '@/utils/midpoint'

/**
 * @param {{ lat: number, lng: number }} from
 * @param {{ lat: number, lng: number }} to
 * @param {'mrt' | 'bus' | 'car' | 'walk'} mode
 * @returns {Promise<{ mins: number, cost: number, steps: Array<{ instruction: string, mins: number }> }>}
 */
export async function getRoute(from, to, mode) {
  const params = new URLSearchParams({
    fromLat: from.lat,
    fromLng: from.lng,
    toLat: to.lat,
    toLng: to.lng,
    mode,
  })
  const res = await fetch(`/api/route?${params}`)
  if (!res.ok) throw new Error(`route failed: ${res.status}`)
  return res.json()
}

/**
 * Everyone's travel time and cost to one place, each by their own mode (same order as `members`).
 * @param {Array<{ start_lat: number, start_lng: number, mode: string }>} members
 * @param {{ lat: number, lng: number }} place
 * @returns {Promise<{ travelMins: number[], travelCosts: number[] }>}
 */
export async function travelTo(members, place) {
  const routes = await Promise.all(
    members.map((m) => getRoute({ lat: m.start_lat, lng: m.start_lng }, place, m.mode)),
  )
  return { travelMins: routes.map((r) => r.mins), travelCosts: routes.map((r) => r.cost) }
}

// How many MRT stations near the middle of everyone's starting points we compare
const STATIONS_TO_TRY = 8

/**
 * The fairest MRT station for the group (07 Mode of transport):
 * 1. find the middle of everyone's starting points
 * 2. take the 8 MRT stations closest to it
 * 3. work out everyone's travel time to each, by their own mode
 * 4. rank them (fairest = shortest longest trip and smallest gap) and return them, best first
 * @param {Array} members people with a starting point and a mode
 * @param {'fairest' | 'fastest' | 'cheapest'} optimiseFor
 */
export async function rankStations(members, optimiseFor = 'fairest') {
  const middle = centroid(members.map((m) => ({ lat: m.start_lat, lng: m.start_lng })))
  if (!middle) {
    return []
  }
  const candidates = await Promise.all(
    nearestStations(middle, STATIONS_TO_TRY).map(async (station) => {
      const travel = await travelTo(members, station)
      return { ...station, ...travel }
    }),
  )
  return rankAreas(candidates, optimiseFor)
}

/**
 * Travel times and fairness for one station the user picked by dragging the pin (08 Midpoint).
 * @returns {Promise<{ name, lat, lng, travelMins, travelCosts, longest, gap, average }>}
 */
export async function scoreStation(members, station) {
  const travel = await travelTo(members, station)
  return { ...station, ...travel, ...fairness(travel.travelMins) }
}
