// Owner: Surya. OneMap Search: address / MRT / postal code autocomplete for 06 Starting points.
// Docs: https://www.onemap.gov.sg/apidocs/

/**
 * @param {string} query what the user typed, e.g. "Tampines MRT" or "529510"
 * @returns {Promise<Array<{ label: string, lat: number, lng: number, postal: string }>>}
 */
export async function searchAddress(_query) {
  // TODO(Surya) (drop the _ from _query once you use it): call the OneMap search endpoint and map each result to { label, lat, lng, postal }
  return []
}
