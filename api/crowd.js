// Owner: Ryan. Vercel serverless function: GET /api/crowd
// LTA DataMall platform crowd density. Needs LTA_ACCOUNT_KEY (sent as the AccountKey header).
// Docs: https://datamall.lta.gov.sg/content/datamall/en/dynamic-data.html

export default async function handler(req, res) {
  // TODO(Ryan): call the platform crowd density endpoint for each train line and reply with
  // [{ station, lat, lng, level }]
  res.status(501).json({ error: 'api/crowd not built yet' })
}
