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
  const sum = points.reduce((acc, p) => ({ lat: acc.lat + p.lat, lng: acc.lng + p.lng }), {
    lat: 0,
    lng: 0,
  })
  return { lat: sum.lat / points.length, lng: sum.lng / points.length }
}

/**
 * How fair one candidate area is for the group.
 * @param {number[]} travelMins one travel time per person to this candidate
 * @returns {{ longest: number, gap: number, average: number }}
 */
export function fairness(travelMins) {
  const longest = Math.max(...travelMins)
  const shortest = Math.min(...travelMins)
  const average = travelMins.reduce((a, b) => a + b, 0) / travelMins.length
  return { longest, gap: longest - shortest, average: Math.round(average) }
}

/** Areas we test as possible midpoints. Coordinates are the MRT stations (approximate). */
export const CANDIDATE_AREAS = [
  { name: 'Bishan', lat: 1.3508, lng: 103.8485 },
  { name: 'Toa Payoh', lat: 1.3327, lng: 103.8474 },
  { name: 'Novena', lat: 1.3204, lng: 103.8438 },
  { name: 'Serangoon', lat: 1.3498, lng: 103.8737 },
  { name: 'Dhoby Ghaut', lat: 1.299, lng: 103.8455 },
  { name: 'Buona Vista', lat: 1.3072, lng: 103.79 },
]

/**
 * Score every candidate area and sort best first.
 * @param {Array<{ name: string, lat: number, lng: number, travelMins: number[], travelCosts: number[] }>} candidates
 *   travelMins / travelCosts: one entry per person, in the same order as the members
 * @param {'fairest' | 'fastest' | 'cheapest'} optimiseFor
 */
export function rankAreas(candidates, optimiseFor = 'fairest') {
  const scored = candidates.map((c) => {
    const f = fairness(c.travelMins)
    const totalCost = c.travelCosts.reduce((a, b) => a + b, 0)
    let score
    if (optimiseFor === 'fastest') score = f.average
    else if (optimiseFor === 'cheapest') score = totalCost
    else score = f.longest + f.gap // fairest: short longest trip AND trips close together
    return { ...c, ...f, totalCost, score }
  })
  // Lower score wins; on a tie, the lower average time wins
  return scored.sort((a, b) => a.score - b.score || a.average - b.average)
}

/** The single best area, or null if there are no candidates. */
export function pickFairestArea(candidates, optimiseFor = 'fairest') {
  return rankAreas(candidates, optimiseFor)[0] ?? null
}
