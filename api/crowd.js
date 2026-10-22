// Owner: Ryan
// GET /api/crowd?at=<iso time, default now>, replies with [{ station, lat, lng, level: 'l' | 'm' | 'h' }], needs LTA_ACCOUNT_KEY
// docs: https://datamall.lta.gov.sg/content/datamall/en/dynamic-data.html
import axios from 'axios'
import { sampleCrowd } from './_mocks/crowd.js'
import { STATIONS } from './_data/stations.js'

const LTA = 'https://datamall2.mytransport.sg/ltaodataservice'
const TRAIN_LINES = ['NSL', 'EWL', 'NEL', 'CCL', 'DTL', 'TEL', 'CEL', 'CGL', 'BPL', 'SLRT', 'PLRT']
const RANK = { l: 1, m: 2, h: 3 }
const HALF_HOUR = 30 * 60 * 1000
const TEN_MINUTES = 10 * 60 * 1000

// lta rate-limits calls and only updates every 10 minutes, so cache answers per line: { savedAt, value }
const realTimeCache = {} // real-time levels, reused for 10 minutes
const forecastCache = {} // today's forecast, reused for half an hour

// returns this line's saved lta data if still fresh, otherwise fetches, saves and returns it
async function remember(cache, key, maxAge, load) {
  // cache is realTimeCache or forecastCache, key is the line name like 'NSL', maxAge is in milliseconds
  const saved = cache[key]
  // still fresh, so reuse it and skip lta
  if (saved && Date.now() - saved.savedAt < maxAge) {
    return saved.value
  }
  // load is the function that asks lta
  const value = await load()
  cache[key] = { savedAt: Date.now(), value: value }
  return value
}

export default async function handler(req, res) {
  // the time asked for, or now if the request has no at
  const at = req.query.at ? new Date(req.query.at) : new Date()
  if (isNaN(at.getTime())) {
    return res.status(400).json({ error: 'at must be a date/time, e.g. 2026-10-16T19:00:00+08:00' })
  }

  // no lta key, use sample data
  if (!process.env.LTA_ACCOUNT_KEY) {
    return res.json(sampleCrowd(at))
  }

  // within half an hour of now use real-time levels, otherwise lta forecast
  const isNow = Math.abs(at.getTime() - Date.now()) < HALF_HOUR

  // one answer list for all lines, filled in station by station
  let crowd = []
  for (let line of TRAIN_LINES) {
    // a failing line is skipped so the other lines still show
    try {
      // every station on this line, like [{ code: 'NS1', level: 'm' }, { code: 'NS2', level: 'l' }, ...]
      const readings = await getLine(line, at, isNow)
      for (let reading of readings) {
        // adds this station to crowd as { station, lat, lng, level }, or raises its level
        addReading(crowd, reading)
      }
    } catch (error) {
      if (error.response) console.log(`LTA replied with ${error.response.status} for ${line}`)
      else console.log(`Could not reach LTA for ${line}:`, error.message)
    }
  }

  // nothing came back, use sample data
  if (crowd.length === 0) {
    return res.json(sampleCrowd(at))
  }
  // the list sent to the browser, e.g. [{ station: 'Jurong East', lat: 1.333, lng: 103.7424, level: 'm' }, ...]
  return res.json(crowd)
}

// one line's levels: real-time first for "now", fall back to forecast if lta refuses
async function getLine(line, at, isNow) {
  if (isNow) {
    try {
      return await remember(realTimeCache, line, TEN_MINUTES, () => getRealTime(line))
    } catch (error) {
      console.log(
        `Real-time crowds unavailable for ${line} (${error.message}), using LTA's forecast instead`,
      )
    }
  }
  return getForecast(line, at)
}

// one line's current levels, as [{ code: 'NS1', level: 'm' }, ...]
async function getRealTime(line) {
  // lta's live platform crowd density endpoint, response.data.value is like [{ Station: 'NS1', CrowdLevel: 'm', ... }]
  const response = await axios.get(`${LTA}/PCDRealTime`, {
    params: { TrainLine: line },
    headers: { AccountKey: process.env.LTA_ACCOUNT_KEY },
  })
  // keep only each station's code and level
  return response.data.value.map((r) => ({ code: r.Station, level: r.CrowdLevel }))
}

// one line's forecast for the half-hour slot containing `at` (lta only forecasts today)
async function getForecast(line, at) {
  // forecast covers whole day, so cache for 30 mins
  const days = await remember(forecastCache, line, HALF_HOUR, async () => {
    const response = await axios.get(`${LTA}/PCDForecast`, {
      params: { TrainLine: line },
      headers: { AccountKey: process.env.LTA_ACCOUNT_KEY },
    })
    return response.data.value // the whole day's forecast for that line
  })
  let readings = []
  for (let day of days) {
    for (let station of day.Stations) {
      // this station's half-hour slot that contains at
      const slot = station.Interval.find((i) => {
        const start = new Date(i.Start).getTime()
        return at.getTime() >= start && at.getTime() < start + HALF_HOUR
      })
      // add this station's reading if a slot matched, otherwise skip it
      if (slot) readings.push({ code: station.Station, level: slot.CrowdLevel })
    }
  }
  return readings // e.g. [{ code: 'NS1', level: 'm' }, { code: 'NS2', level: 'l' }]
}

// adds one { code, level } reading to crowd, an interchange has two codes but one name so it keeps the busier level
function addReading(crowd, reading) {
  // look the code up in stations.js to get the station's name and position
  const place = STATIONS[reading.code]
  // skip a station we don't know or a level that isn't l, m or h
  if (!place || !RANK[reading.level]) return
  // is a station with this name already in crowd, like the other code of an interchange
  const existing = crowd.find((c) => c.station === place.name)
  if (!existing) {
    // first time we see it, so add it
    crowd.push({ station: place.name, lat: place.lat, lng: place.lng, level: reading.level })
  } else if (RANK[reading.level] > RANK[existing.level]) {
    // seen already, so only raise the level if this one is busier
    existing.level = reading.level
  }
}
