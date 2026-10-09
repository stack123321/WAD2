// Owner: Surya. NEA forecasts from data.gov.sg (no key needed). Weather cards on 04, 08, 10, 12.
// Docs: https://guide.data.gov.sg/ (search "2-hour weather forecast" and "4-day weather outlook")
// data.gov.sg allows calls straight from the browser, so these don't need an api/ function.

const BASE = 'https://api-open.data.gov.sg/v2/real-time/api'
const CACHE_MS = 5 * 60 * 1000 // NEA updates every 30 min, so several cards on a page can share one call

const cache = {} // url → { at, promise }

/** GET a data.gov.sg endpoint and return its "data" part. Calls within 5 minutes reuse the answer. */
function getNea(path) {
  const url = `${BASE}/${path}`
  const hit = cache[url]
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.promise

  const promise = fetch(url).then(async (res) => {
    if (!res.ok) throw new Error(`NEA ${path} failed: ${res.status}`)
    const body = await res.json()
    if (body.code !== 0) throw new Error(`NEA ${path} failed: ${body.errorMsg}`)
    return body.data
  })
  cache[url] = { at: Date.now(), promise }
  promise.catch(() => delete cache[url]) // don't keep a failed call; try again next time
  return promise
}

/**
 * 2-hour forecast for the NEA area nearest a point.
 * @returns {Promise<{ area: string, forecast: string, rain: boolean, validUntil: string }>}
 */
export async function getTwoHourForecast(lat, lng) {
  const data = await getNea('two-hr-forecast')
  const latest = data.items[0]

  // area_metadata has each area's position; forecasts has each area's weather. Join them by name.
  const areas = data.area_metadata.map((a) => ({
    name: a.name,
    lat: a.label_location.latitude,
    lng: a.label_location.longitude,
    forecast: latest.forecasts.find((f) => f.area === a.name)?.forecast ?? 'Unknown',
  }))

  const area = nearestArea(areas, lat, lng)
  return {
    area: area.name,
    forecast: area.forecast,
    rain: isRain(area.forecast),
    validUntil: latest.valid_period.end,
  }
}

/**
 * Outlook for the next 4 days, for the week strip on 04 Dashboard.
 * @returns {Promise<Array<{ date: string, forecast: string, rain: boolean, low: number, high: number }>>}
 */
export async function getDayForecast() {
  const data = await getNea('four-day-outlook')
  return data.records[0].forecasts.map((day) => ({
    date: day.timestamp.slice(0, 10), // "2026-10-10T00:00:00+08:00" → "2026-10-10"
    forecast: day.forecast.summary, // e.g. "Afternoon thundery showers"
    rain: isRain(day.forecast.summary),
    low: day.temperature.low,
    high: day.temperature.high,
  }))
}

/** The area whose centre is closest to (lat, lng). Areas look like { name, lat, lng, ... }. */
export function nearestArea(areas, lat, lng) {
  let best = areas[0]
  let bestDist = Infinity
  for (const area of areas) {
    const d = (area.lat - lat) ** 2 + (area.lng - lng) ** 2
    if (d < bestDist) {
      best = area
      bestDist = d
    }
  }
  return best
}

/** True if a forecast text means rain, e.g. "Thundery Showers". Used for "indoor when raining". */
export function isRain(forecast) {
  return /rain|shower|thunder|drizzle/i.test(forecast)
}
