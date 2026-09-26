// Owner: Hugo. Vercel serverless function: GET /api/places?lat=&lng=&radius=&categories=
// Google Places needs GOOGLE_PLACES_API_KEY; OpenStreetMap Overpass needs no key.

export default async function handler(req, res) {
  // TODO(Hugo): search near (lat, lng) and reply with shortlist-shaped places
  res.status(501).json({ error: 'api/places not built yet', query: req.query })
}
