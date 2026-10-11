// Owner: Ryan. Vercel serverless function: GET /api/crowd?at=2026-10-16T19:00:00+08:00 (at is optional, default now)
// LTA DataMall platform crowd density. Needs LTA_ACCOUNT_KEY (sent as the AccountKey header).
// Docs: https://datamall.lta.gov.sg/content/datamall/en/dynamic-data.html
//
// Replies with [{ station, lat, lng, level: 'l' | 'm' | 'h' }]
import axios from 'axios'
import { sampleCrowd } from './_mocks/crowd.js'
import { STATIONS } from './_data/stations.js'

const LTA = 'https://datamall2.mytransport.sg/ltaodataservice'
const TRAIN_LINES = ['NSL', 'EWL', 'NEL', 'CCL', 'DTL', 'TEL', 'CEL', 'CGL', 'BPL', 'SLRT', 'PLRT']
const RANK = { l: 1, m: 2, h: 3 }
const HALF_HOUR = 30 * 60 * 1000

export default async function handler(req, res) {
  const at = req.query.at ? new Date(req.query.at) : new Date()
  if (Number.isNaN(at.getTime())) {
    return res.status(400).json({ error: 'at must be a date/time, e.g. 2026-10-16T19:00:00+08:00' })
  }

  // No LTA key in .env.local → sample data, so teammates without keys can still work.
  if (!process.env.LTA_ACCOUNT_KEY) {
    return res.json(sampleCrowd(at))
  }

  // Within half an hour of now → real-time levels; otherwise → LTA's forecast
  const isNow = Math.abs(at.getTime() - Date.now()) < HALF_HOUR

  try {
    let crowd = []
    for (let line of TRAIN_LINES) {
      const readings = isNow ? await getRealTime(line) : await getForecast(line, at)
      for (let reading of readings) {
        addReading(crowd, reading)
      }
    }
    return res.json(crowd)
  } catch (error) {
    if (error.response) console.log('LTA replied with', error.response.status)
    else console.log('Could not reach LTA:', error.message)
    return res.json(sampleCrowd(at))
  }
}

// One train line's current levels → [{ code: 'NS1', level: 'm' }, ...]
async function getRealTime(line) {
  const response = await axios.get(`${LTA}/PCDRealTime`, {
    params: { TrainLine: line },
    headers: { AccountKey: process.env.LTA_ACCOUNT_KEY },
  })
  return response.data.value.map((r) => ({ code: r.Station, level: r.CrowdLevel }))
}

// One train line's forecast for the half-hour slot that contains `at`.
// LTA only forecasts today, so any other day finds no slot and gives no readings.
async function getForecast(line, at) {
  const response = await axios.get(`${LTA}/PCDForecast`, {
    params: { TrainLine: line },
    headers: { AccountKey: process.env.LTA_ACCOUNT_KEY },
  })
  let readings = []
  for (let day of response.data.value) {
    for (let station of day.Stations) {
      const slot = station.Interval.find((i) => {
        const start = new Date(i.Start).getTime()
        return at.getTime() >= start && at.getTime() < start + HALF_HOUR
      })
      if (slot) readings.push({ code: station.Station, level: slot.CrowdLevel })
    }
  }
  return readings
}

// Adds one reading to the list. An interchange (e.g. NS1 + EW24) shows once, at its busiest level.
function addReading(crowd, reading) {
  const place = STATIONS[reading.code]
  if (!place || !RANK[reading.level]) return // station not in our table, or blank level
  const existing = crowd.find((c) => c.station === place.name)
  if (!existing) {
    crowd.push({ station: place.name, lat: place.lat, lng: place.lng, level: reading.level })
  } else if (RANK[reading.level] > RANK[existing.level]) {
    existing.level = reading.level
  }
}
