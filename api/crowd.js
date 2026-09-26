// Owner: Ryan. Vercel serverless function: GET /api/crowd?at=2026-10-16T19:00:00+08:00 (at is optional, default now)
// LTA DataMall platform crowd density. Needs LTA_ACCOUNT_KEY (sent as the AccountKey header).
// Docs: https://datamall.lta.gov.sg/content/datamall/en/dynamic-data.html
//
// Replies with [{ station, lat, lng, level: 'l' | 'm' | 'h' }] — keep this shape when you add the real call.
import { sampleCrowd } from './_mocks/crowd.js'

export default async function handler(req, res) {
  const at = req.query.at ? new Date(req.query.at) : new Date()
  if (Number.isNaN(at.getTime())) {
    return res.status(400).json({ error: 'at must be a date/time, e.g. 2026-10-16T19:00:00+08:00' })
  }

  // No LTA key in .env.local → sample data, so teammates without keys can still work.
  if (!process.env.LTA_ACCOUNT_KEY) {
    return res.json(sampleCrowd(at))
  }

  // TODO(Ryan): call the real-time endpoint (or the forecast one for future times) for each train
  // line, join with station positions, and reply with the same shape. Until then, the sample.
  return res.json(sampleCrowd(at))
}
