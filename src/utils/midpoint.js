// Owner: Nicole. Pure functions for the fair-midpoint algorithm: no API calls, no Vue,
// so they are easy to test. The API calls live in services/routing.js.
import { STATIONS } from '../../api/_data/stations.js'

// Every MRT station once (interchanges like Bishan NS17 / CC15 appear once), from Ryan's station
// list. LRT stations are left out, so the midpoint is always an MRT station.
const MRT_LINES = ['NS', 'EW', 'NE', 'CC', 'CE', 'DT', 'TE', 'CG']

export const MRT_STATIONS = []
for (const code of Object.keys(STATIONS)) {
  const line = code.replace(/\d.*$/, '') // "NS17" → "NS"
  const station = STATIONS[code]
  const alreadyAdded = MRT_STATIONS.find((s) => s.name === station.name)
  if (MRT_LINES.includes(line) && !alreadyAdded) {
    MRT_STATIONS.push({ name: station.name, lat: station.lat, lng: station.lng })
  }
}

/**
 * The MRT stations closest to a point, nearest first.
 * @param {{ lat: number, lng: number }} point
 * @param {number} count how many to return
 */
export function nearestStations(point, count) {
  const withDistance = MRT_STATIONS.map((s) => ({
    ...s,
    distance: (s.lat - point.lat) ** 2 + (s.lng - point.lng) ** 2,
  }))
  withDistance.sort((a, b) => a.distance - b.distance)
  return withDistance.slice(0, count)
}

/**
 * Plain geographic centre of the starting points. A first guess only: the real algorithm
 * scores candidate areas by travel time, not distance.
 * @param {Array<{ lat: number, lng: number }>} points
 */
export function centroid(points) {
  if (points.length === 0) return null
  let latSum = 0
  let lngSum = 0
  for (const p of points) {
    latSum += p.lat
    lngSum += p.lng
  }
  return { lat: latSum / points.length, lng: lngSum / points.length }
}

/**
 * How fair one candidate area is for the group.
 * @param {number[]} travelMins one travel time per person to this candidate
 * @returns {{ longest: number, gap: number, average: number }}
 */
export function fairness(travelMins) {
  const longest = Math.max(...travelMins)
  const shortest = Math.min(...travelMins)
  let totalMins = 0
  for (const mins of travelMins) {
    totalMins += mins
  }
  const average = totalMins / travelMins.length
  return { longest, gap: longest - shortest, average: Math.round(average) }
}

/**
 * Everyone's time and cost to one station, saved with the midpoint so 12 can show "Leave by".
 * @param {Array<{ user_id: string }>} members in the same order as the station's travelMins
 * @param {{ travelMins: number[], travelCosts: number[] }} station
 * @returns {Array<{ user_id: string, mins: number, cost: number }>}
 */
export function timesFor(members, station) {
  const times = []
  members.forEach((m, i) => {
    times.push({ user_id: m.user_id, mins: station.travelMins[i], cost: station.travelCosts[i] })
  })
  return times
}

/**
 * Score every candidate area and sort best first.
 * @param {Array<{ name: string, lat: number, lng: number, travelMins: number[], travelCosts: number[] }>} candidates
 *   travelMins / travelCosts: one entry per person, in the same order as the members
 * @param {'fairest' | 'fastest' | 'cheapest'} optimiseFor
 */
export function rankAreas(candidates, optimiseFor = 'fairest') {
  const scored = candidates.map((c) => {
    const f = fairness(c.travelMins)
    let totalCost = 0
    for (const cost of c.travelCosts) {
      totalCost += cost
    }
    let score
    if (optimiseFor === 'fastest') score = f.average
    else if (optimiseFor === 'cheapest') score = totalCost
    else score = f.longest + f.gap // fairest: short longest trip AND trips close together
    return { ...c, ...f, totalCost, score }
  })
  // Lower score wins; on a tie, the lower average time wins
  return scored.sort((a, b) => a.score - b.score || a.average - b.average)
}
