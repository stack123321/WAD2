// Owner: Hugo. Vercel serverless function: GET /api/places?lat=&lng=&radius=800&categories=cafe,food
// Google Places needs GOOGLE_PLACES_API_KEY; OpenStreetMap Overpass needs no key.
//
// Replies with shortlist-shaped places, nearest first:
// [{ source, source_place_id, name, category, lat, lng, rating, price_level, image_url, distance_m }]
// Keep this shape when you add the real call.
import { samplePlaces } from './_mocks/places.js'

export default async function handler(req, res) {
  const centre = { lat: Number(req.query.lat), lng: Number(req.query.lng) }
  const radiusM = Number(req.query.radius ?? 800)
  const categories = req.query.categories ? req.query.categories.split(',').filter(Boolean) : []

  if (Number.isNaN(centre.lat) || Number.isNaN(centre.lng) || Number.isNaN(radiusM)) {
    return res.status(400).json({ error: 'Need lat and lng (and optionally radius in metres)' })
  }

  // TODO(Hugo): once the team picks Google Places or OpenStreetMap, call it here and map each
  // result to the shape above. Until then, answer with the sample.
  return res.json(samplePlaces(centre, { radiusM, categories }))
}
