// Owner: Ryan
// crowd levels for the heat map on 08 via /api/crowd (lta needs an AccountKey, so the call happens server-side)
import axios from 'axios'

// at: slider time (Date), gives back [{ station, lat, lng, level }]
export async function getCrowdLevels(at) {
  const response = await axios.get('/api/crowd', {
    params: { at: at.toISOString() },
  })
  return response.data
}
