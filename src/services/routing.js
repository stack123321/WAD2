// Owner: Nicole. Travel time per person and mode, via our /api/route function
// (OneMap Routing needs a token, so the call happens server-side in api/route.js).

/**
 * @param {{ lat: number, lng: number }} from
 * @param {{ lat: number, lng: number }} to
 * @param {'mrt' | 'bus' | 'car' | 'walk'} mode
 * @returns {Promise<{ mins: number, cost: number, steps: Array<object> }>}
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
