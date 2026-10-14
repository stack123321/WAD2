// Owner: Surya. Vercel serverless function: GET /api/reverse?lat=1.3117&lng=103.7961
// Reverse geocoding: the name of the place at a point, for when you drag your pin on page 06
// (and for "use my current location"). Needs the OneMap token, like api/search.js.
// Docs: https://www.onemap.gov.sg/apidocs/reversegeocode
//
// Replies with the nearest address within 100 m: { label, address, lat, lng, postal },
// where lat/lng are the point you asked about (not the building's). Replies null if there's
// nothing nearby, e.g. a point in the sea.
import axios from 'axios'
import sampleAddresses from '../src/mocks/addresses.json' with { type: 'json' }
import { getOneMapToken, hasOneMapLogin, toPlace } from './_onemap.js'

const REVERSE_URL = 'https://www.onemap.gov.sg/api/public/revgeocode'

export default async function handler(req, res) {
  const lat = Number(req.query.lat)
  const lng = Number(req.query.lng)

  // Part (a) Validation
  if (req.query.lat == null || req.query.lng == null || isNaN(lat) || isNaN(lng)) {
    return res.status(400).json({ error: 'Need lat and lng' })
  }
  // a box around Singapore: anything outside can't be a starting point
  if (lat < 1.15 || lat > 1.48 || lng < 103.6 || lng > 104.1) {
    return res.status(400).json({ error: 'That point is outside Singapore' })
  }

  // No OneMap login in .env.local → the nearest sample place instead
  if (!hasOneMapLogin()) {
    return res.json(reverseSample(lat, lng))
  }

  // Part (b) Ask OneMap
  try {
    const token = await getOneMapToken()
    const response = await axios.get(REVERSE_URL, {
      params: { location: `${lat},${lng}`, buffer: 100, addressType: 'All', otherFeatures: 'N' },
      headers: { Authorization: token },
    })

    const found = response.data.GeocodeInfo
    if (!found || found.length === 0) {
      return res.json(null)
    }

    // OneMap doesn't sort by distance, so find the closest one ourselves
    let nearest = found[0]
    let nearestDist = Infinity
    for (const r of found) {
      const dist = (Number(r.LATITUDE) - lat) ** 2 + (Number(r.LONGITUDE) - lng) ** 2
      if (dist < nearestDist) {
        nearest = r
        nearestDist = dist
      }
    }

    const place = toPlace({
      building: nearest.BUILDINGNAME,
      block: nearest.BLOCK,
      road: nearest.ROAD,
      postal: nearest.POSTALCODE,
      lat: lat,
      lng: lng,
    })
    return res.json(place)
  } catch (error) {
    console.error('[api/reverse]', error.message)
    return res.status(502).json({ error: 'OneMap reverse geocode failed: ' + error.message })
  }
}

function reverseSample(lat, lng) {
  let nearest = sampleAddresses[0]
  let nearestDist = Infinity
  for (const a of sampleAddresses) {
    const dist = (a.lat - lat) ** 2 + (a.lng - lng) ** 2
    if (dist < nearestDist) {
      nearest = a
      nearestDist = dist
    }
  }
  return { label: `Near ${nearest.label}`, address: null, lat: lat, lng: lng, postal: null }
}
