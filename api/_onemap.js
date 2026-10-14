// Owner: Surya. Shared by the api/ functions that call OneMap (search, reverse, routing):
// the login token, and turning OneMap's address parts into the place shape page 06 uses.
// Not an endpoint (files starting with _ are skipped).
// Docs: https://www.onemap.gov.sg/apidocs/authentication
import axios from 'axios'

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

// The token lasts 3 days, so we remember it here and only log in again when it's about to expire
let savedToken = ''
let tokenExpiresAt = 0 // in milliseconds

/** True when .env.local (or Vercel) has a OneMap login. Without one, functions answer with samples. */
export function hasOneMapLogin() {
  if (process.env.ONEMAP_EMAIL && process.env.ONEMAP_PASSWORD) {
    return true
  }
  return false
}

/** @returns {Promise<string>} a token for the Authorization header of OneMap calls */
export async function getOneMapToken() {
  const oneMinute = 60 * 1000
  if (savedToken !== '' && Date.now() < tokenExpiresAt - oneMinute) {
    return savedToken
  }

  const response = await axios.post('https://www.onemap.gov.sg/api/auth/post/getToken', {
    email: process.env.ONEMAP_EMAIL,
    password: process.env.ONEMAP_PASSWORD,
  })
  savedToken = response.data.access_token
  tokenExpiresAt = Number(response.data.expiry_timestamp) * 1000 // OneMap gives seconds
  return savedToken
}

/**
 * OneMap's address parts → { label, address, lat, lng, postal }, the shape page 06 uses.
 * label is the building name (or the street when there isn't one); address is the short street,
 * e.g. "4 Tampines Central 5". OneMap writes "NIL" for missing parts.
 */
export function toPlace(parts) {
  const building = clean(parts.building)
  const street = `${clean(parts.block)} ${clean(parts.road)}`.trim()

  let label = street
  let address = null
  if (building !== '') {
    label = building
    address = street !== '' ? titleCase(street) : null
  }

  return {
    label: titleCase(label),
    address: address,
    lat: Number(parts.lat),
    lng: Number(parts.lng),
    postal: clean(parts.postal) || null,
  }
}

/** OneMap writes "NIL" when a part is missing: turn that (or nothing) into "" */
function clean(value) {
  if (!value || value === 'NIL') {
    return ''
  }
  return value
}

/** "HOLLAND VILLAGE MRT STATION (CC21)" → "Holland Village MRT Station (CC21)" */
export function titleCase(text) {
  const words = text.toLowerCase().split(' ')
  const result = []

  for (const word of words) {
    const upper = word.toUpperCase()
    const withoutBrackets = upper.replace('(', '').replace(')', '')

    if (hasDigit(word) || ACRONYMS.includes(withoutBrackets)) {
      // keep codes like (CC21), 21A and acronyms like MRT in capitals
      result.push(upper)
    } else if (word.startsWith('(')) {
      // capitalise the letter after the bracket: "(car" → "(Car"
      result.push('(' + word.charAt(1).toUpperCase() + word.slice(2))
    } else {
      result.push(word.charAt(0).toUpperCase() + word.slice(1))
    }
  }
  return result.join(' ')
}

function hasDigit(word) {
  for (const ch of word) {
    if ('0123456789'.includes(ch)) {
      return true
    }
  }
  return false
}
