// Owner: Surya. Vercel serverless function: GET /api/search?q=holland
// OneMap Search needs a token (from ONEMAP_EMAIL / ONEMAP_PASSWORD), so the call happens here
// on the server instead of in the browser. Docs: https://www.onemap.gov.sg/apidocs/search
//
// Replies with up to 8 places: [{ label, address, lat, lng, postal }]. postal is null for MRT stations.
import axios from 'axios'
import sampleAddresses from '../src/mocks/addresses.json' with { type: 'json' }
import { getOneMapToken, hasOneMapLogin, toPlace } from './_onemap.js'

const SEARCH_URL = 'https://www.onemap.gov.sg/api/common/elastic/search'
const MAX_RESULTS = 8

export default async function handler(req, res) {
  const q = (req.query.q ?? '').trim()
  if (q.length < 2) {
    return res.json([])
  }

  // No OneMap login in .env.local → sample data, so teammates without keys can still work
  if (!hasOneMapLogin()) {
    return res.json(searchSample(q))
  }

  try {
    const token = await getOneMapToken()
    const response = await axios.get(SEARCH_URL, {
      params: { searchVal: q, returnGeom: 'Y', getAddrDetails: 'Y', pageNum: 1 },
      headers: { Authorization: token },
    })

    const places = []
    for (const r of response.data.results) {
      const place = toPlace({
        building: r.BUILDING,
        block: r.BLK_NO,
        road: r.ROAD_NAME,
        postal: r.POSTAL,
        lat: r.LATITUDE,
        lng: r.LONGITUDE,
      })

      // OneMap often returns the same building once per entrance, so skip repeats
      const alreadyAdded = places.find((p) => p.label === place.label)
      if (!alreadyAdded) {
        places.push(place)
      }
      if (places.length === MAX_RESULTS) {
        break
      }
    }
    return res.json(places)
  } catch (error) {
    // e.g. wrong OneMap password, or OneMap is down
    console.error('[api/search]', error.message)
    return res.status(502).json({ error: 'OneMap search failed: ' + error.message })
  }
}

function searchSample(q) {
  const lower = q.toLowerCase()
  const results = []
  for (const a of sampleAddresses) {
    const matchesName = a.label.toLowerCase().includes(lower)
    const matchesPostal = a.postal !== null && a.postal.startsWith(lower)
    if (matchesName || matchesPostal) {
      results.push({ label: a.label, address: null, lat: a.lat, lng: a.lng, postal: a.postal })
    }
  }
  return results.slice(0, MAX_RESULTS)
}
