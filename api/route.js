// Owner: Nicole. Vercel serverless function: GET /api/route?fromLat=&fromLng=&toLat=&toLng=&mode=
// Runs on the server, so it can use secret keys from process.env (never VITE_ ones).
// OneMap Routing needs a token from ONEMAP_EMAIL / ONEMAP_PASSWORD. Docs: https://www.onemap.gov.sg/apidocs/
//
// Replies with { mins, cost, steps: [{ instruction, mins }] } — keep this shape when you add the real call.
import { sampleRoute, MODE_NAMES } from './_mocks/route.js'

export default async function handler(req, res) {
  const from = { lat: Number(req.query.fromLat), lng: Number(req.query.fromLng) }
  const to = { lat: Number(req.query.toLat), lng: Number(req.query.toLng) }
  const mode = req.query.mode

  if ([from.lat, from.lng, to.lat, to.lng].some(Number.isNaN) || !MODE_NAMES.includes(mode)) {
    return res
      .status(400)
      .json({ error: `Need fromLat, fromLng, toLat, toLng and mode (${MODE_NAMES.join(' / ')})` })
  }

  // No OneMap login in .env.local → sample data, so teammates without keys can still work.
  if (!process.env.ONEMAP_EMAIL || !process.env.ONEMAP_PASSWORD) {
    return res.json(sampleRoute(from, to, mode))
  }

  // TODO(Nicole): get a OneMap token, call the routing API for this mode, and reply with
  // { mins, cost, steps }. Until then, answer with the sample.
  return res.json(sampleRoute(from, to, mode))
}
