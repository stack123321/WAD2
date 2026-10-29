// Google Places API (New) helpers for api/places.js and api/assistant.js. Not an endpoint (files starting with _ are skipped).
import { STATIONS } from './_data/stations.js'
import { distanceKm } from './_mocks/geo.js'

const BASE = 'https://places.googleapis.com/v1'

const CATEGORY_TYPES = {
  cafe: ['cafe', 'coffee_shop', 'bakery', 'dessert_shop'],
  food: ['restaurant', 'meal_takeaway', 'food_court'],
  activity: ['amusement_center', 'bowling_alley', 'movie_theater', 'museum', 'karaoke', 'gym'],
  outdoor: ['park'],
  shopping: ['shopping_mall', 'department_store', 'clothing_store', 'book_store'],
}
const ALL_CATEGORIES = Object.keys(CATEGORY_TYPES)

const PRICE_LEVELS = {
  PRICE_LEVEL_FREE: 0,
  PRICE_LEVEL_INEXPENSIVE: 1,
  PRICE_LEVEL_MODERATE: 2,
  PRICE_LEVEL_EXPENSIVE: 3,
  PRICE_LEVEL_VERY_EXPENSIVE: 4,
}

const FIELDS = [
  'id',
  'displayName',
  'location',
  'rating',
  'userRatingCount',
  'priceLevel',
  'photos',
  'types',
  'primaryType',
  'formattedAddress',
  'googleMapsUri',
  'currentOpeningHours.openNow',
  'regularOpeningHours.periods',
  'accessibilityOptions.wheelchairAccessibleEntrance',
  'editorialSummary',
  'outdoorSeating',
  'goodForGroups',
  'servesVegetarianFood',
  'reservable',
]

async function google(path, key, { body, fields }) {
  const res = await fetch(`${BASE}${path}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': key,
      'X-Goog-FieldMask': fields,
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error(`Google Places ${res.status}: ${await res.text()}`)
  return res.json()
}

function nearestStation(point) {
  let best = null
  for (const s of Object.values(STATIONS)) {
    const d = distanceKm(point, s)
    if (!best || d < best.d) best = { name: s.name, d }
  }
  return best && { name: best.name, distance_m: Math.round(best.d * 1000) }
}

function categoryOf(types = [], fallback) {
  for (const cat of ALL_CATEGORIES) {
    if (types.some((t) => CATEGORY_TYPES[cat].includes(t))) return cat
  }
  return fallback ?? 'activity'
}

function tagsOf(p) {
  const tags = []
  if (p.outdoorSeating) tags.push('Outdoor seating')
  if (p.goodForGroups) tags.push('Good for groups')
  if (p.servesVegetarianFood) tags.push('Vegetarian options')
  if (p.reservable) tags.push('Reservations')
  return tags
}

function toPlace(p, centre, fallbackCategory) {
  const lat = p.location.latitude
  const lng = p.location.longitude
  const station = nearestStation({ lat, lng })
  return {
    source: 'google',
    source_place_id: p.id,
    name: p.displayName?.text ?? 'Unnamed place',
    category: categoryOf(p.types, fallbackCategory),
    types: p.types ?? [],
    primary_type: p.primaryType ?? null,
    lat,
    lng,
    rating: p.rating ?? null,
    review_count: p.userRatingCount ?? 0,
    price_level: PRICE_LEVELS[p.priceLevel] ?? null,
    image_url: p.photos?.[0] ? `/api/place-photo?name=${encodeURIComponent(p.photos[0].name)}` : null,
    distance_m: centre ? Math.round(distanceKm(centre, { lat, lng }) * 1000) : null,
    address: p.formattedAddress ?? null,
    google_maps_uri: p.googleMapsUri ?? null,
    open_now: p.currentOpeningHours?.openNow ?? null,
    opening_hours: p.regularOpeningHours?.periods?.length
      ? { periods: p.regularOpeningHours.periods }
      : null,
    wheelchair_accessible: p.accessibilityOptions?.wheelchairAccessibleEntrance ?? null,
    description: p.editorialSummary?.text ?? null,
    tags: tagsOf(p),
    nearest_station_name: station?.name ?? null,
    station_distance_m: station?.distance_m ?? null,
  }
}

/** Nearby places for each requested category (all categories when none), nearest first. */
export async function nearbyPlaces(key, centre, radiusM, categories) {
  const wanted = categories.filter((c) => CATEGORY_TYPES[c])
  const cats = wanted.length ? wanted : ALL_CATEGORIES
  // Each request is capped at 20 results, so one request per type, ranked by distance, keeps the
  // results dense around the centre instead of spread thinly over the whole radius.
  const queries = cats.flatMap((cat) => CATEGORY_TYPES[cat].map((type) => ({ cat, type })))
  const results = await Promise.all(
    queries.map(async ({ cat, type }) => {
      const data = await google('/places:searchNearby', key, {
        fields: FIELDS.map((f) => `places.${f}`).join(','),
        body: {
          includedTypes: [type],
          maxResultCount: 20,
          rankPreference: 'DISTANCE',
          locationRestriction: {
            circle: {
              center: { latitude: centre.lat, longitude: centre.lng },
              radius: Math.min(radiusM, 30000),
            },
          },
        },
      })
      return (data.places ?? []).map((p) => toPlace(p, centre, cat))
    }),
  )
  const seen = new Set()
  return results
    .flat()
    .filter((p) => !seen.has(p.source_place_id) && seen.add(p.source_place_id))
    .sort((a, b) => a.distance_m - b.distance_m)
}

/**
 * Places matching a free-text search (e.g. "halal prata") within radiusM of the centre, nearest
 * first. Text Search can only lean towards a circle, so it's asked for the nearest matches and
 * any outside the circle are dropped here.
 */
export async function textSearch(key, centre, radiusM, query) {
  const data = await google('/places:searchText', key, {
    fields: FIELDS.map((f) => `places.${f}`).join(','),
    body: {
      textQuery: query,
      pageSize: 20,
      rankPreference: 'DISTANCE',
      locationBias: {
        circle: {
          center: { latitude: centre.lat, longitude: centre.lng },
          radius: Math.min(radiusM, 50000),
        },
      },
    },
  })
  return (data.places ?? [])
    .map((p) => toPlace(p, centre))
    .filter((p) => p.distance_m <= radiusM)
    .sort((a, b) => a.distance_m - b.distance_m)
}

export async function placeById(key, id) {
  const data = await google(`/places/${encodeURIComponent(id)}`, key, { fields: FIELDS.join(',') })
  return toPlace(data, null)
}

/** Google's AI-generated summary of a place, or null when Google has none for it. */
export async function placeSummary(key, id) {
  const data = await google(`/places/${encodeURIComponent(id)}`, key, {
    fields: 'generativeSummary',
  })
  const text = data.generativeSummary?.overview?.text
  if (!text) return null
  return {
    text,
    disclosure: data.generativeSummary.disclosureText?.text ?? 'Summarized with Gemini',
  }
}

/** Resolves a photo resource name to a short-lived image URL that doesn't contain the API key. */
export async function photoUrl(key, name, maxWidthPx = 640) {
  const data = await google(`/${name}/media?maxWidthPx=${maxWidthPx}&skipHttpRedirect=true`, key, {
    fields: 'name,photoUri',
  })
  return data.photoUri
}
