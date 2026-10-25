// Owner: Eashvar. What /api/assistant replies when GEMINI_API_KEY or GOOGLE_PLACES_API_KEY isn't
// set: three made-up "Sample spot" places a short walk from the meeting point, so the sample
// hangouts and the tests work without keys. The page only shows these for sample hangouts.
import { distanceKm } from './geo.js'

// Offsets from the meeting point, in degrees (about 250 m, 450 m and 700 m away)
const OFFSETS = [
  [0.0018, 0.0012],
  [-0.0025, 0.003],
  [0.0045, -0.0046],
]

export function sampleReply(message, midpoint) {
  const places = OFFSETS.map(([dLat, dLng], i) => {
    const lat = midpoint.lat + dLat
    const lng = midpoint.lng + dLng
    const distance = Math.round(distanceKm(midpoint, { lat, lng }) * 1000)
    return {
      source: 'google',
      source_place_id: `sample-assistant-${i + 1}`,
      name: `Sample spot ${i + 1}`,
      category: 'food',
      types: ['restaurant'],
      primary_type: 'restaurant',
      lat,
      lng,
      rating: [4.5, 4.2, 4.0][i],
      review_count: [320, 140, 85][i],
      price_level: 1,
      image_url: null,
      distance_m: distance,
      address: null,
      google_maps_uri: null,
      open_now: null,
      opening_hours: null,
      wheelchair_accessible: null,
      description: null,
      tags: i === 0 ? ['Good for groups'] : [],
      nearest_station_name: midpoint.name,
      station_distance_m: distance,
    }
  })
  return {
    reply: `Sample results for "${message}" near ${midpoint.name}. Add GEMINI_API_KEY and GOOGLE_PLACES_API_KEY to .env.local for real ones.`,
    places,
    suggestOtherStations: false,
    sample: true,
  }
}
