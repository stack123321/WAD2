// Owner: Ryan. Crowd levels for the heat map on 08, via our /api/crowd function
// (LTA DataMall needs an AccountKey, so the call happens server-side in api/crowd.js).
// Until the real call is built, api/crowd.js answers with sample data.

/**
 * @param {Date} [at] the time on the heat map's slider (default: now)
 * @returns {Promise<Array<{ station: string, lat: number, lng: number, level: 'l' | 'm' | 'h' }>>}
 */
export async function getCrowdLevels(at = new Date()) {
  const res = await fetch(`/api/crowd?${new URLSearchParams({ at: at.toISOString() })}`)
  if (!res.ok) throw new Error(`crowd failed: ${res.status}`)
  return res.json()
}
