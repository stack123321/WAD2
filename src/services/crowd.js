// Owner: Ryan. Crowd levels for the heat map on 08, via our /api/crowd function
// (LTA DataMall needs an AccountKey, so the call happens server-side in api/crowd.js).
import axios from 'axios'

/**
 * @param {Date} at the time on the heat map's slider
 * @returns {Promise<Array<{ station: string, lat: number, lng: number, level: 'l' | 'm' | 'h' }>>}
 */
export async function getCrowdLevels(at) {
  const response = await axios.get('/api/crowd', {
    params: { at: at.toISOString() },
  })
  return response.data
}
