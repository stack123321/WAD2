// Owner: Surya. OneMap Search: address / MRT / postal code autocomplete for 06 Starting points.
// OneMap Search needs a token, so the real call lives in api/search.js (server side) and this
// function just asks it. Without ONEMAP_EMAIL / ONEMAP_PASSWORD in .env.local, api/search.js
// answers with the sample places in src/mocks/addresses.json.

/**
 * @param {string} query what the user typed, e.g. "Tampines MRT" or "529510"
 * @returns {Promise<Array<{ label: string, address: string | null, lat: number, lng: number, postal: string | null }>>}
 */
export async function searchAddress(query) {
  const q = query.trim()
  if (q.length < 2) return []

  const res = await fetch(`/api/search?${new URLSearchParams({ q })}`)
  if (!res.ok) throw new Error(`search failed: ${res.status}`)
  return res.json()
}
