// Owner: Ryan. Crowd levels for the heat map on 08, via our /api/crowd function
// (LTA DataMall needs an AccountKey, so the call happens server-side in api/crowd.js).

/**
 * @returns {Promise<Array<{ station: string, lat: number, lng: number, level: 'l' | 'm' | 'h' }>>}
 */
export async function getCrowdLevels() {
  const res = await fetch('/api/crowd')
  if (!res.ok) throw new Error(`crowd failed: ${res.status}`)
  return res.json()
}
