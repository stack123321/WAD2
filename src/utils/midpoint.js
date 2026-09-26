// Owner: Nicole. Pure functions for the fair-midpoint algorithm: no API calls, no Vue,
// so they are easy to test. The API calls live in services/routing.js.

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

// TODO(Nicole): pickFairestArea(candidates, members, optimiseFor) → minimise the longest trip
// and the gap between trips ('fairest'), or the average ('fastest'), or total cost ('cheapest').
