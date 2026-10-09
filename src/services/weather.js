// Owner: Surya. Weather and haze for the weather cards on 04, 08, 10, 12 (src/components/weather/).
// Two free sources, both callable straight from the browser with no key:
//   NEA on data.gov.sg: 2-hour forecast, today's forecast, 4-day outlook, haze (PSI)
//     Docs: https://guide.data.gov.sg/ (search "weather forecast" and "PSI")
//   Open-Meteo: hourly forecast (temperature, rain chance, humidity, UV) up to 16 days ahead,
//     which NEA doesn't offer. Docs: https://open-meteo.com/en/docs

const NEA = 'https://api-open.data.gov.sg/v2/real-time/api'
const CACHE_MS = 5 * 60 * 1000 // NEA updates every 30 min, so several cards on a page can share one call
const SG_OFFSET_MS = 8 * 60 * 60 * 1000 // Singapore is always UTC+8 (no daylight saving)

const cache = {} // url → { at, promise }

/** GET a URL as JSON. Calls to the same URL within 5 minutes reuse the answer. */
function getJson(url) {
  const hit = cache[url]
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.promise

  const promise = fetch(url).then((res) => {
    if (!res.ok) throw new Error(`${url} failed: ${res.status}`)
    return res.json()
  })
  cache[url] = { at: Date.now(), promise }
  promise.catch(() => delete cache[url]) // don't keep a failed call; try again next time
  return promise
}

/** GET a data.gov.sg endpoint and return its "data" part. */
async function getNea(path) {
  const body = await getJson(`${NEA}/${path}`)
  if (body.code !== 0) throw new Error(`NEA ${path} failed: ${body.errorMsg}`)
  return body.data
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
 * Outlook for the next 4 days (starting tomorrow), for the week strip on 04 Dashboard.
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

/**
 * Today's forecast for the whole island, same shape as one day of getDayForecast().
 * @returns {Promise<{ date: string, forecast: string, rain: boolean, low: number, high: number }>}
 */
export async function getTodayForecast() {
  const data = await getNea('twenty-four-hr-forecast')
  const record = data.records[0]
  const general = record.general
  return {
    date: record.date,
    forecast: general.forecast.text, // e.g. "Partly Cloudy (Day)"
    rain: isRain(general.forecast.text),
    low: general.temperature.low,
    high: general.temperature.high,
  }
}

/**
 * Hourly forecast at a point from Open-Meteo, from today up to 16 days ahead.
 * @returns {Promise<Array<{ time: string, temp: number, rainChance: number, humidity: number,
 *   uv: number, condition: string, kind: string }>>} time is Singapore time, e.g. "2026-10-16T19:00"
 */
export async function getHourlyForecast(lat, lng) {
  const params = new URLSearchParams({
    // rounded so nearby points share one cached call (0.01° ≈ 1 km)
    latitude: lat.toFixed(2),
    longitude: lng.toFixed(2),
    hourly:
      'temperature_2m,precipitation_probability,relative_humidity_2m,uv_index,weather_code,is_day',
    timezone: 'Asia/Singapore',
    forecast_days: '16',
  })
  const data = await getJson(`https://api.open-meteo.com/v1/forecast?${params}`)
  const h = data.hourly
  return h.time.map((time, i) => {
    const condition = wmoText(h.weather_code[i])
    return {
      time,
      temp: Math.round(h.temperature_2m[i]),
      rainChance: h.precipitation_probability[i] ?? 0,
      humidity: h.relative_humidity_2m[i],
      uv: Math.round(h.uv_index[i] ?? 0),
      condition,
      kind: weatherKind(condition, h.is_day[i] === 1),
    }
  })
}

/**
 * Haze right now: the 24-hour PSI for the region (north/south/east/west/central) nearest a point.
 * Without a point, the worst region (NEA has no island-wide number).
 * NEA has no haze forecast, so this is always the latest reading.
 * @returns {Promise<{ region: string, psi: number, level: string, tone: 'good' | 'moderate' | 'bad' }>}
 */
export async function getHaze(lat, lng) {
  const data = await getNea('psi')
  const readings = data.items[0].readings.psi_twenty_four_hourly

  let region
  if (lat == null || lng == null) {
    region = Object.keys(readings).reduce((worst, r) => (readings[r] > readings[worst] ? r : worst))
  } else {
    const regions = data.regionMetadata.map((r) => ({
      name: r.name,
      lat: r.labelLocation.latitude,
      lng: r.labelLocation.longitude,
    }))
    region = nearestArea(regions, lat, lng).name
  }
  const psi = readings[region]
  return { region, psi, ...psiLevel(psi) }
}

/** NEA's PSI bands. https://www.haze.gov.sg/ */
export function psiLevel(psi) {
  if (psi <= 50) return { level: 'Good', tone: 'good' }
  if (psi <= 100) return { level: 'Moderate', tone: 'moderate' }
  if (psi <= 200) return { level: 'Unhealthy', tone: 'bad' }
  if (psi <= 300) return { level: 'Very unhealthy', tone: 'bad' }
  return { level: 'Hazardous', tone: 'bad' }
}

/** UV index → the words NEA uses. */
export function uvLevel(uv) {
  if (uv <= 2) return 'Low'
  if (uv <= 5) return 'Moderate'
  if (uv <= 7) return 'High'
  if (uv <= 10) return 'Very high'
  return 'Extreme'
}

/** A Date or ISO string → Singapore hour in Open-Meteo's format, e.g. "2026-10-16T19:00". */
export function sgHourKey(when) {
  const local = new Date(new Date(when).getTime() + SG_OFFSET_MS)
  return local.toISOString().slice(0, 13) + ':00'
}

/** "2026-10-16T19:00" → "7 PM" */
export function hourLabel(hourKey) {
  const hour = Number(hourKey.slice(11, 13))
  return `${hour % 12 || 12} ${hour < 12 ? 'AM' : 'PM'}`
}

/** A Date or ISO string → "Fri 7 PM" in Singapore time. */
export function dayTimeLabel(when) {
  const key = sgHourKey(when)
  const weekday = new Date(key.slice(0, 10) + 'T12:00:00Z').toLocaleDateString('en-SG', {
    weekday: 'short',
    timeZone: 'UTC',
  })
  return `${weekday} ${hourLabel(key)}`
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

/**
 * Which icon to draw for a forecast text (NEA's or Open-Meteo's):
 * 'sun' | 'night' | 'partly' | 'cloud' | 'rain' | 'thunder' | 'haze'
 */
export function weatherKind(forecast, isDay = true) {
  const text = forecast.toLowerCase()
  if (text.includes('thunder')) return 'thunder'
  if (isRain(text)) return 'rain'
  if (/haz|mist|fog/.test(text)) return 'haze'
  if (text.includes('partly') || text.includes('mainly clear')) return 'partly'
  if (/cloud|overcast/.test(text)) return 'cloud'
  if (text.includes('night') || !isDay) return 'night'
  return 'sun' // fair, sunny, clear, warm
}

/** Open-Meteo's weather codes (WMO) → words like NEA's. */
function wmoText(code) {
  if (code === 0) return 'Clear'
  if (code === 1) return 'Mainly clear'
  if (code === 2) return 'Partly cloudy'
  if (code === 3) return 'Cloudy'
  if (code === 45 || code === 48) return 'Fog'
  if (code >= 51 && code <= 57) return 'Drizzle'
  if (code >= 61 && code <= 67) return 'Rain'
  if (code >= 80 && code <= 82) return 'Showers'
  if (code >= 95) return 'Thundery showers'
  return 'Cloudy'
}
