// Owner: Hugo. Google Places near the hangout midpoint for pages 09 and 10.
import { ref } from 'vue'
import { supabase } from './supabase'
import { isMockHangout } from './votes'

const GOOGLE_PLACES_ENABLED_KEY = 'fairpoint.googlePlacesEnabled'
export const googlePlacesEnabled = ref(
  typeof window !== 'undefined' && window.localStorage.getItem(GOOGLE_PLACES_ENABLED_KEY) === 'true',
)

export function setGooglePlacesEnabled(enabled) {
  googlePlacesEnabled.value = enabled
  window.localStorage.setItem(GOOGLE_PLACES_ENABLED_KEY, String(enabled))
}

/**
 * @param {{ lat: number, lng: number }} centre
 * @param {{ radiusM?: number, categories?: string[], signal?: AbortSignal }} [options]
 * @returns {Promise<Array<{ source: 'google' | 'osm', source_place_id: string, name: string,
 *   category: string, lat: number, lng: number, rating: number | null, price_level: number | null,
 *   image_url: string | null, distance_m: number }>>} nearest first
 */
export async function searchNearby(centre, { radiusM = 800, categories = [], signal } = {}) {
  if (!googlePlacesEnabled.value) throw new Error('Google Places is disabled')

  const params = new URLSearchParams({
    lat: centre.lat,
    lng: centre.lng,
    radius: radiusM,
    categories: categories.join(','),
  })
  const res = await fetch(`/api/places?${params}`, { signal })
  if (!res.ok) {
    const body = await res.json()
    throw new Error(body.error ?? `places failed: ${res.status}`)
  }
  return res.json()
}

const spotCache = new Map()

/** Camel-cased shape used by SpotCard and the spot pages. */
function toSpot(p) {
  return {
    id: p.source_place_id,
    name: p.name,
    category: p.category,
    imageUrl: p.image_url,
    lat: p.lat,
    lng: p.lng,
    rating: p.rating,
    reviewCount: p.review_count ?? 0,
    priceLevel: p.price_level,
    stationDistanceM: p.station_distance_m ?? null,
    nearestStationName: p.nearest_station_name ?? null,
    address: p.address ?? null,
    googleMapsUri: p.google_maps_uri ?? null,
    openNow: p.open_now ?? null,
    description: p.description ?? null,
    tags: p.tags ?? [],
    matchPct: 0,
    crowdLevel: 0,
  }
}

/** Live spots around the centre, ready for SpotCards. Also caches them for the details page. */
export async function loadSpots(centre, options = { radiusM: 1000 }) {
  if (!googlePlacesEnabled.value) return []
  const spots = (await searchNearby(centre, options)).map(toSpot)
  for (const s of spots) spotCache.set(s.id, s)
  return spots
}

/** One spot by Google place id, from the cache when Explore already loaded it. */
export async function loadSpot(id, { signal } = {}) {
  if (!googlePlacesEnabled.value) throw new Error('Google Places is disabled')
  if (spotCache.has(id)) return spotCache.get(id)
  const res = await fetch(`/api/places?id=${encodeURIComponent(id)}`, { signal })
  if (!res.ok) throw new Error(`place failed: ${res.status}`)
  const spot = toSpot(await res.json())
  spotCache.set(id, spot)
  return spot
}

/** Add a place to the hangout's vote shortlist (drop distance_m first; it isn't a table column). */
export async function addToShortlist(hangoutId, place) {
  if (isMockHangout(hangoutId)) return null
  const row = {
    hangout_id: hangoutId,
    source: place.source ?? 'google',
    source_place_id: place.source_place_id,
    name: place.name,
    category: place.category ?? null,
    lat: place.lat,
    lng: place.lng,
    rating: place.rating ?? null,
    price_level: place.price_level ?? null,
    image_url: place.image_url ?? null,
    match_pct: place.match_pct ?? null,
  }

  // The database default sets added_by to auth.uid(); insert only so this doesn't require an
  // UPDATE policy. The unique key makes concurrent additions safe to resolve as already added.
  const { data, error } = await supabase
    .from('shortlist')
    .insert(row)
    .select()
    .single()
  if (!error) return data
  if (error.code !== '23505') throw error

  const { data: existing, error: lookupError } = await supabase
    .from('shortlist')
    .select()
    .eq('hangout_id', hangoutId)
    .eq('source', row.source)
    .eq('source_place_id', row.source_place_id)
    .single()
  if (lookupError) throw lookupError
  return existing
}
