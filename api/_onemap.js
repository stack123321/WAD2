// Owner: Surya. Shared by the api/ functions that call OneMap (search, reverse, routing):
// the login token, and turning OneMap's address parts into the place shape page 06 uses.
// Not an endpoint (files starting with _ are skipped).
// The token lasts 3 days, so we keep it in memory and only log in again when it's about to expire.
// Docs: https://www.onemap.gov.sg/apidocs/authentication

let cached = null // { token, expiresAt } with expiresAt in ms

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
  'CPF',
  'NTUC',
  'SAFRA',
]

/**
 * OneMap's address parts → { label, address, lat, lng, postal }, the shape page 06 uses.
 * label is the building name (or the street when there isn't one); address is the short street,
 * e.g. "4 Tampines Central 5". OneMap writes "NIL" for missing parts.
 */
export function toPlace({ building, block, road, postal, lat, lng }) {
  const clean = (value) => (value && value !== 'NIL' ? value : '')
  const street = `${clean(block)} ${clean(road)}`.trim()
  const name = clean(building)
  return {
    label: titleCase(name || street),
    // without a building the label is already the street, so don't repeat it
    address: name && street ? titleCase(street) : null,
    lat: Number(lat),
    lng: Number(lng),
    postal: clean(postal) || null,
  }
}

/** "HOLLAND VILLAGE MRT STATION (CC21)" → "Holland Village MRT Station (CC21)" */
export function titleCase(text) {
  return text
    .toLowerCase()
    .split(' ')
    .map((word) => {
      const upper = word.toUpperCase()
      // keep codes like (CC21), 21A and acronyms like MRT in capitals
      if (/\d/.test(word) || ACRONYMS.includes(upper.replace(/[()]/g, ''))) return upper
      // capitalise the first letter, even after a bracket: "(car" → "(Car"
      return word.replace(/[a-z]/, (ch) => ch.toUpperCase())
    })
    .join(' ')
}

/** True when .env.local (or Vercel) has a OneMap login. Without one, functions answer with samples. */
export function hasOneMapLogin() {
  return Boolean(process.env.ONEMAP_EMAIL && process.env.ONEMAP_PASSWORD)
}

/** @returns {Promise<string>} a token for the Authorization header of OneMap calls */
export async function getOneMapToken() {
  if (cached && Date.now() < cached.expiresAt - 60 * 1000) return cached.token

  const res = await fetch('https://www.onemap.gov.sg/api/auth/post/getToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: process.env.ONEMAP_EMAIL,
      password: process.env.ONEMAP_PASSWORD,
    }),
  })
  if (!res.ok) throw new Error(`OneMap login failed: ${res.status}`)

  const data = await res.json()
  cached = { token: data.access_token, expiresAt: Number(data.expiry_timestamp) * 1000 }
  return cached.token
}
