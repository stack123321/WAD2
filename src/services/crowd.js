// Owner: Ryan
// crowd levels for the heat map and the dashboard card via /api/crowd (lta needs a key, so the call happens server-side)
import axios from 'axios'

// at: the time to look up, now for the card or the slider time for the heat map
export async function getCrowdLevels(at) {
  // calls our own server function, which asks lta and adds each station's name and position
  const response = await axios.get('/api/crowd', {
    // at as standard text, e.g. 2026-10-16T11:00:00.000Z
    params: { at: at.toISOString() },
  })
  // each station is { station: 'Jurong East', lat: 1.333, lng: 103.742, level: 'm' }
  return response.data
}
