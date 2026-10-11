// Owner: Surya. Vercel serverless function: GET /api/reverse?lat=1.3117&lng=103.7961
// Reverse geocoding: the name of the place at a point, for when you drag your pin on page 06
// (and for "use my current location"). Needs the OneMap token, like api/search.js.
// Docs: https://www.onemap.gov.sg/apidocs/reversegeocode
//
// Replies with the nearest address within 100 m: { label, address, lat, lng, postal },
// where lat/lng are the point you asked about (not the building's). Replies null if there's
// nothing nearby, e.g. a point in the sea.
import sampleAddresses from '../src/mocks/addresses.json' with { type: 'json' }
import { getOneMapToken, hasOneMapLogin, toPlace } from './_onemap.js'

// A box around Singapore, to reject points that can't be a starting point
const SG = { minLat: 1.15, maxLat: 1.48, minLng: 103.6, maxLng: 104.1 }

export default async function handler(req, res) {
  const lat = Number(req.query.lat)
  const lng = Number(req.query.lng)
  if (Number.isNaN(lat) || Number.isNaN(lng) || req.query.lat == null || req.query.lng == null) {
    return res.status(400).json({ error: 'Need lat and lng' })
  }
  if (lat < SG.minLat || lat > SG.maxLat || lng < SG.minLng || lng > SG.maxLng) {
    return res.status(400).json({ error: 'That point is outside Singapore' })
  }

  // No OneMap login in .env.local → the nearest sample place instead
  if (!hasOneMapLogin()) return res.json(reverseSample(lat, lng))

  const url = new URL('https://www.onemap.gov.sg/api/public/revgeocode')
  url.search = new URLSearchParams({
    location: `${lat},${lng}`,
    buffer: '100', // metres to look around the point
    addressType: 'All',
    otherFeatures: 'N',
  })

  try {
    const token = await getOneMapToken()
    const onemap = await fetch(url, { headers: { Authorization: token } })
    if (!onemap.ok) throw new Error(`OneMap reverse geocode failed: ${onemap.status}`)

    const data = await onemap.json()
    const found = data.GeocodeInfo ?? []
    if (found.length === 0) return res.json(null)

    // OneMap doesn't sort by distance, so pick the closest one ourselves
    const nearest = closest(found, lat, lng, (r) => [Number(r.LATITUDE), Number(r.LONGITUDE)])
    const place = toPlace({
      building: nearest.BUILDINGNAME,
      block: nearest.BLOCK,
      road: nearest.ROAD,
      postal: nearest.POSTALCODE,
      lat,
      lng,
    })
    return res.json(place)
  } catch (err) {
    console.error('[api/reverse]', err.message)
    return res.status(502).json({ error: err.message })
  }
}

/** The item nearest (lat, lng). position(item) → [lat, lng]. */
function closest(items, lat, lng, position) {
  let best = items[0]
  let bestDist = Infinity
  for (const item of items) {
    const [itemLat, itemLng] = position(item)
    const d = (itemLat - lat) ** 2 + (itemLng - lng) ** 2
    if (d < bestDist) {
      best = item
      bestDist = d
    }
  }
  return best
}

function reverseSample(lat, lng) {
  const near = closest(sampleAddresses, lat, lng, (a) => [a.lat, a.lng])
  return { label: `Near ${near.label}`, address: null, lat, lng, postal: null }
}
