// Vercel serverless function: GET /api/place-photo?name=places/<id>/photos/<ref>
// Redirects to the Google photo so the API key never reaches the browser.
import { photoUrl } from './_google.js'

export default async function handler(req, res) {
  const key = process.env.GOOGLE_PLACES_API_KEY
  const name = String(req.query.name ?? '')
  if (!key) return res.status(503).json({ error: 'GOOGLE_PLACES_API_KEY is not set' })
  if (!/^places\/[\w-]+\/photos\/[\w-]+$/.test(name)) {
    return res.status(400).json({ error: 'Need a valid photo name' })
  }

  try {
    const url = await photoUrl(key, name)
    res.setHeader('Cache-Control', 'public, max-age=3600')
    res.statusCode = 302
    res.setHeader('Location', url)
    return res.end()
  } catch (err) {
    return res.status(502).json({ error: err.message })
  }
}
