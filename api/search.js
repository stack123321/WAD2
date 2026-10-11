// Owner: Surya. Vercel serverless function: GET /api/search?q=holland
// OneMap Search needs a token (from ONEMAP_EMAIL / ONEMAP_PASSWORD), so the call happens here
// on the server instead of in the browser. Docs: https://www.onemap.gov.sg/apidocs/search
//
// Replies with up to 8 places: [{ label, address, lat, lng, postal }]. postal is null for MRT stations.
import sampleAddresses from '../src/mocks/addresses.json' with { type: 'json' }
import { getOneMapToken, hasOneMapLogin, toPlace } from './_onemap.js'

const MAX_RESULTS = 8

export default async function handler(req, res) {
  const q = (req.query.q ?? '').trim()
  if (q.length < 2) return res.json([])

  // No OneMap login in .env.local → sample data, so teammates without keys can still work.
  if (!hasOneMapLogin()) return res.json(searchSample(q))

  const url = new URL('https://www.onemap.gov.sg/api/common/elastic/search')
  url.search = new URLSearchParams({
    searchVal: q,
    returnGeom: 'Y',
    getAddrDetails: 'Y',
    pageNum: '1',
  })

  try {
    const token = await getOneMapToken()
    const onemap = await fetch(url, { headers: { Authorization: token } })
    if (!onemap.ok) throw new Error(`OneMap search failed: ${onemap.status}`)

    const data = await onemap.json()
    const places = []
    for (const r of data.results ?? []) {
      const place = toPlace({
        building: r.BUILDING,
        block: r.BLK_NO,
        road: r.ROAD_NAME,
        postal: r.POSTAL,
        lat: r.LATITUDE,
        lng: r.LONGITUDE,
      })
      // OneMap often returns the same building once per entrance; keep the first
      if (!places.some((p) => p.label === place.label)) places.push(place)
      if (places.length === MAX_RESULTS) break
    }
    return res.json(places)
  } catch (err) {
    // e.g. wrong OneMap password, or OneMap is down
    console.error('[api/search]', err.message)
    return res.status(502).json({ error: err.message })
  }
}

function searchSample(q) {
  const lower = q.toLowerCase()
  return sampleAddresses
    .filter((a) => a.label.toLowerCase().includes(lower) || a.postal?.startsWith(lower))
    .slice(0, MAX_RESULTS)
    .map((a) => ({ address: null, ...a }))
}
