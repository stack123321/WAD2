// Owner: Surya. Vercel serverless function: GET /api/search?q=holland
// OneMap Search needs a token (from ONEMAP_EMAIL / ONEMAP_PASSWORD), so the call happens here
// on the server instead of in the browser. Docs: https://www.onemap.gov.sg/apidocs/search
//
// Replies with up to 8 places: [{ label, address, lat, lng, postal }]. postal is null for MRT stations.
import sampleAddresses from '../src/mocks/addresses.json' with { type: 'json' }
import { getOneMapToken, hasOneMapLogin } from './_onemap.js'

const MAX_RESULTS = 8

// Short words OneMap writes in capitals that should stay in capitals
const ACRONYMS = [
  'MRT',
  'LRT',
  'HDB',
  'SMU',
  'NUS',
  'NTU',
  'SUTD',
  'SIT',
  'SUSS',
  'ITE',
  'CC',
  'YMCA',
]

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

  const token = await getOneMapToken()
  const onemap = await fetch(url, { headers: { Authorization: token } })
  if (!onemap.ok) return res.status(502).json({ error: `OneMap search failed: ${onemap.status}` })

  const data = await onemap.json()
  const places = []
  for (const r of data.results ?? []) {
    const place = toPlace(r)
    // OneMap often returns the same building once per entrance; keep the first
    if (!places.some((p) => p.label === place.label)) places.push(place)
    if (places.length === MAX_RESULTS) break
  }
  return res.json(places)
}

/** One OneMap result → { label, address, lat, lng, postal }. address is the short street, e.g. "4 Tampines Central 5". */
function toPlace(r) {
  const clean = (value) => (value && value !== 'NIL' ? value : '')
  const street = `${clean(r.BLK_NO)} ${clean(r.ROAD_NAME)}`.trim()
  const building = clean(r.BUILDING)
  return {
    label: titleCase(building || street),
    // without a building the label is already the street, so don't repeat it
    address: building && street ? titleCase(street) : null,
    lat: Number(r.LATITUDE),
    lng: Number(r.LONGITUDE),
    postal: r.POSTAL && r.POSTAL !== 'NIL' ? r.POSTAL : null,
  }
}

/** "HOLLAND VILLAGE MRT STATION (CC21)" → "Holland Village MRT Station (CC21)" */
function titleCase(text) {
  return text
    .toLowerCase()
    .split(' ')
    .map((word) => {
      const upper = word.toUpperCase()
      // keep codes like (CC21), 21A and acronyms like MRT in capitals
      if (/\d/.test(word) || ACRONYMS.includes(upper.replace(/[()]/g, ''))) return upper
      return word.charAt(0).toUpperCase() + word.slice(1)
    })
    .join(' ')
}

function searchSample(q) {
  const lower = q.toLowerCase()
  return sampleAddresses
    .filter((a) => a.label.toLowerCase().includes(lower) || a.postal?.startsWith(lower))
    .slice(0, MAX_RESULTS)
    .map((a) => ({ address: null, ...a }))
}
