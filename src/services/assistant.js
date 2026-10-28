// Owner: Eashvar. The Ask box on 09 Nearby spots ("prata for dinner, one of us is halal").
// Calls our own /api/assistant, which asks Gemini what to search for and then searches Google
// Places, so the Gemini key never reaches the browser.
import axios from 'axios'

/**
 * @param {object} input
 * @param {string} input.message what the user typed (300 characters at most)
 * @param {Array<{ role: 'user' | 'model', text: string }>} input.history earlier turns, for
 *   follow-ups like "cheaper"
 * @param {object} input.hangout the store's hangout (midpoint_name / _lat / _lng, starts_at)
 * @param {{ size: number, dietary: string[], maxPrice: number | null }} input.needs groupNeeds()
 * @returns {Promise<{ reply: string, query: string | null, places: Array<object>,
 *   suggestOtherStations: boolean, sample?: boolean }>} places are shaped like /api/places
 */
export async function askAssistant({ message, history, hangout, needs }) {
  try {
    const response = await axios.post('/api/assistant', {
      message,
      history: history.slice(-4),
      midpoint: {
        name: hangout.midpoint_name,
        lat: hangout.midpoint_lat,
        lng: hangout.midpoint_lng,
      },
      startsAt: hangout.starts_at,
      needs,
    })
    return response.data
  } catch (err) {
    throw new Error(err.response?.data?.error ?? "Couldn't reach the assistant", { cause: err })
  }
}
