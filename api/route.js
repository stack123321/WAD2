// Owner: Nicole. Vercel serverless function: GET /api/route?fromLat=&fromLng=&toLat=&toLng=&mode=
// Runs on the server, so it can use secret keys from process.env (never VITE_ ones).
// OneMap Routing needs a token from ONEMAP_EMAIL / ONEMAP_PASSWORD. Docs: https://www.onemap.gov.sg/apidocs/

export default async function handler(req, res) {
  // TODO(Nicole): get a OneMap token, call the routing API for req.query.mode,
  // and reply with { mins, cost, steps }
  res.status(501).json({ error: 'api/route not built yet', query: req.query })
}
