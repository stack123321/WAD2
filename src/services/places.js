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
export async function searchNearby(centre, { radiusM = 3000, categories = [], signal } = {}) {
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

/** Camel-cased shape used by SpotCard, matchScore() and the spot pages. */
function toSpot(p) {
  return {
    id: p.source_place_id,
    name: p.name,
    category: p.category,
    types: p.types ?? [],
    primaryType: p.primary_type ?? null,
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
    openingHours: p.opening_hours ?? null,
    wheelchairAccessible: p.wheelchair_accessible ?? null,
    description: p.description ?? null,
    tags: p.tags ?? [],
    matchPct: 0,
    crowdLevel: 0,
  }
}

/** Places from the API (e.g. /api/assistant's) as spot cards, remembered for 10 Spot details. */
export function cacheSpots(places) {
  const spots = places.map(toSpot)
  for (const s of spots) spotCache.set(s.id, s)
  return spots
}

const SEARCH_CACHE_PREFIX = 'fairpoint.spots.'
const SEARCH_CACHE_TTL_MS = 20 * 60 * 1000

function searchCacheKey(centre, radiusM) {
  return `${SEARCH_CACHE_PREFIX}${centre.lat.toFixed(5)},${centre.lng.toFixed(5)},${radiusM}`
}

function readSearchCache(key) {
  try {
    const cached = JSON.parse(window.sessionStorage.getItem(key))
    if (cached && Date.now() - cached.savedAt < SEARCH_CACHE_TTL_MS) return cached.spots
  } catch {
    // unreadable entry: treat as a miss
  }
  return null
}

function writeSearchCache(key, spots) {
  try {
    window.sessionStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), spots }))
  } catch {
    // storage full or unavailable: skip caching
  }
}

/**
 * Live spots around the centre, ready for SpotCards. Results for the same centre and radius are
 * reused for 20 minutes (per tab) to save Google calls; pass force to fetch fresh ones.
 * Also caches each spot for the details page.
 */
export async function loadSpots(centre, options = { radiusM: 3000 }) {
  if (!googlePlacesEnabled.value) return []
  const key = searchCacheKey(centre, options.radiusM ?? 3000)
  let spots = options.force ? null : readSearchCache(key)
  if (!spots) {
    spots = (await searchNearby(centre, options)).map(toSpot)
    writeSearchCache(key, spots)
  }
  for (const s of spots) spotCache.set(s.id, s)
  return spots
}

const summaryCache = new Map()

/** Google's AI summary for a place ({ text, disclosure }), or null if there isn't one. */
export async function loadSpotSummary(id, { signal } = {}) {
  if (!googlePlacesEnabled.value) return null
  if (summaryCache.has(id)) return summaryCache.get(id)
  const key = `${SEARCH_CACHE_PREFIX}summary.${id}`
  const cached = readSearchCache(key)
  let summary
  if (cached) {
    summary = cached[0]
  } else {
    const res = await fetch(`/api/places?id=${encodeURIComponent(id)}&summary=1`, { signal })
    if (!res.ok) throw new Error(`summary failed: ${res.status}`)
    summary = await res.json()
    // wrapped in an array so "no summary" (null) is cached too
    writeSearchCache(key, [summary])
  }
  summaryCache.set(id, summary)
  return summary
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
    types: place.types ?? [],
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

/** Remove a place you added. Pass added_by so a host's broader delete rights never remove others' spots. */
export async function removeFromShortlist(hangoutId, place) {
  if (isMockHangout(hangoutId)) return []
  let query = supabase
    .from('shortlist')
    .delete()
    .eq('hangout_id', hangoutId)
    .eq('source', place.source ?? 'google')
    .eq('source_place_id', place.source_place_id)
  if (place.added_by) query = query.eq('added_by', place.added_by)
  const { data, error } = await query.select()
  if (error) throw error
  if (!data.length) throw new Error('Only the person who added this spot can remove it')
  return data
}
