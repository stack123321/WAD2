// Vercel serverless function:
//   GET /api/places?lat=&lng=&radius=3000&categories=cafe,food,activity,outdoor
//   GET /api/places?id=<google place id>
//   GET /api/places?id=<google place id>&summary=1  -> { text, disclosure } or null (AI summary)
// Uses Google Places API (New) with GOOGLE_PLACES_API_KEY.
//
// Replies with shortlist-shaped places, nearest first:
// [{ source, source_place_id, name, category, lat, lng, rating, review_count, price_level, image_url,
//    distance_m, address, google_maps_uri, open_now, description, tags,
//    nearest_station_name, station_distance_m }]
import { nearbyPlaces, placeById, placeSummary } from './_google.js'

export default async function handler(req, res) {
  const key = process.env.GOOGLE_PLACES_API_KEY

  if (req.query.id && req.query.summary) {
    if (!key) return res.status(503).json({ error: 'GOOGLE_PLACES_API_KEY is not set' })
    try {
      return res.json(await placeSummary(key, String(req.query.id)))
    } catch (err) {
      return res.status(502).json({ error: err.message })
    }
  }

  if (req.query.id) {
    if (!key) return res.status(503).json({ error: 'GOOGLE_PLACES_API_KEY is not set' })
    try {
      return res.json(await placeById(key, String(req.query.id)))
    } catch (err) {
      return res.status(502).json({ error: err.message })
    }
  }

  const centre = { lat: Number(req.query.lat), lng: Number(req.query.lng) }
  const radiusM = Number(req.query.radius ?? 3000)
  const categories = req.query.categories ? req.query.categories.split(',').filter(Boolean) : []

  if (Number.isNaN(centre.lat) || Number.isNaN(centre.lng) || Number.isNaN(radiusM)) {
    return res.status(400).json({ error: 'Need lat and lng (and optionally radius in metres)' })
  }

  if (!key) return res.status(503).json({ error: 'GOOGLE_PLACES_API_KEY is not set' })

  try {
    return res.json(await nearbyPlaces(key, centre, radiusM, categories))
  } catch (err) {
    return res.status(502).json({ error: err.message })
  }
}
