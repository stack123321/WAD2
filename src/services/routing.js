// Owner: Nicole. Travel time per person and mode, via our /api/route function
// (OneMap Routing needs a token, so the call happens server-side in api/route.js).
import { canWorkOutTrip, centroid, fairness, nearestStations, rankAreas } from '@/utils/midpoint'
import { updateMemberTrip } from '@/services/hangouts'

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

/**
 * (Eashvar) Work out one person's trip to the group's midpoint and save it, after they set their
 * starting point (06) or mode (07). Everyone's times are otherwise only saved when the midpoint is
 * found or moved, so someone who sets either later would have no "Leave by" on 12. Does nothing
 * until the group has a midpoint and they have a starting point and a mode.
 * @param {string} hangoutId
 * @param {{ midpoint_lat: number, midpoint_lng: number }} hangout
 * @param {{ user_id: string, start_lat: number, start_lng: number, mode: string }} member
 * @returns {Promise<{ mins: number, cost: number } | null>} the saved trip, or null if skipped
 */
export async function saveTrip(hangoutId, hangout, member) {
  if (!canWorkOutTrip(hangout, member)) return null
  const route = await getRoute(
    { lat: member.start_lat, lng: member.start_lng },
    { lat: hangout.midpoint_lat, lng: hangout.midpoint_lng },
    member.mode,
  )
  const mins = Math.round(route.mins)
  await updateMemberTrip(hangoutId, member.user_id, mins, route.cost)
  return { mins, cost: route.cost }
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
 * @param {(done: number, total: number) => void} [onProgress] (Surya) told after each station, for 07's progress bar
 */
export async function rankStations(members, optimiseFor = 'fairest', onProgress = () => {}) {
  const middle = centroid(members.map((m) => ({ lat: m.start_lat, lng: m.start_lng })))
  if (!middle) {
    return []
  }
  const stations = nearestStations(middle, STATIONS_TO_TRY)
  let done = 0
  onProgress(0, stations.length)
  const candidates = await Promise.all(
    stations.map(async (station) => {
      const travel = await travelTo(members, station)
      done++
      onProgress(done, stations.length) // e.g. 3 of 8 stations checked
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
