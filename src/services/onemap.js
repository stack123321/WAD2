// Owner: Surya. OneMap Search: address / MRT / postal code autocomplete for 06 Starting points.
// Docs: https://www.onemap.gov.sg/apidocs/
import sampleAddresses from '@/mocks/addresses.json'

/**
 * @param {string} query what the user typed, e.g. "Tampines MRT" or "529510"
 * @returns {Promise<Array<{ label: string, lat: number, lng: number, postal: string | null }>>}
 */
export async function searchAddress(query) {
  const q = query.trim().toLowerCase()
  if (q.length < 2) return []

  // ── Sample data until the real call is built ──
  // TODO(Surya): call the OneMap search endpoint and map each result to { label, lat, lng, postal }.
  // Keep the same shape so page 06 doesn't change.
  return sampleAddresses
    .filter((a) => a.label.toLowerCase().includes(q) || a.postal?.startsWith(q))
    .slice(0, 8)
}
