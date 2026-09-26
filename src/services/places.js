// Owner: Hugo. Cafes and activities near the midpoint for 09 and 10, via our /api/places function.
// Google Places vs OpenStreetMap Overpass is decided at the kickoff; the page code stays the same.

/**
 * @param {{ lat: number, lng: number }} centre
 * @param {{ radiusM?: number, categories?: string[] }} [options]
 * @returns {Promise<Array<{ source: 'google' | 'osm', source_place_id: string, name: string,
 *   category: string, lat: number, lng: number, rating: number | null, price_level: number | null,
 *   image_url: string | null }>>}
 */
export async function searchNearby(centre, { radiusM = 800, categories = [] } = {}) {
  const params = new URLSearchParams({
    lat: centre.lat,
    lng: centre.lng,
    radius: radiusM,
    categories: categories.join(','),
  })
  const res = await fetch(`/api/places?${params}`)
  if (!res.ok) throw new Error(`places failed: ${res.status}`)
  return res.json()
}

/** Add a place to the hangout's vote shortlist. */
export async function addToShortlist(_hangoutId, _place) {
  // TODO(Hugo) (drop the _ from the parameter names once used): insert into the shortlist table with match_pct from utils/matchScore.js
}
