// Owner: Surya. Weather and haze for the weather cards on 04, 08, 10, 12 (src/components/weather/).
// Two free sources, both callable straight from the browser with no key:
//   NEA on data.gov.sg: 2-hour forecast, today's forecast, 4-day outlook, haze (PSI)
//     Docs: https://guide.data.gov.sg/ (search "weather forecast" and "PSI")
//   Open-Meteo: hourly forecast (temperature, rain chance, humidity, UV) up to 16 days ahead,
//     which NEA doesn't have. Docs: https://open-meteo.com/en/docs
import axios from 'axios'

const NEA_URL = 'https://api-open.data.gov.sg/v2/real-time/api'
const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast'

/** GET a data.gov.sg endpoint and return its "data" part. */
async function getNea(path) {
  const response = await axios.get(`${NEA_URL}/${path}`)
  // NEA's own success flag is code 0
  if (response.data.code !== 0) {
    throw new Error(`NEA ${path} failed: ${response.data.errorMsg}`)
  }
  return response.data.data
}

// Part (a) 2-hour forecast
/**
 * 2-hour forecast for the NEA area nearest a point.
 * @returns {Promise<{ area: string, forecast: string, rain: boolean, validUntil: string }>}
 */
export async function getTwoHourForecast(lat, lng) {
  const data = await getNea('two-hr-forecast')
  const latest = data.items[0]

  // NEA gives the areas' positions and their forecasts in two separate lists, so join them by name
  const areas = []
  for (const a of data.area_metadata) {
    const match = latest.forecasts.find((f) => f.area === a.name)
    areas.push({
      name: a.name,
      lat: a.label_location.latitude,
      lng: a.label_location.longitude,
      forecast: match ? match.forecast : 'Unknown',
    })
  }

  const area = nearestArea(areas, lat, lng)
  return {
    area: area.name,
    forecast: area.forecast,
    rain: isRain(area.forecast),
    validUntil: latest.valid_period.end,
  }
}

// Part (b) 4-day outlook
/**
 * Outlook for the next 4 days, for the week strip on 04 Dashboard and 05 New hangout.
 * NEA issues it in the afternoon, so before then the first day can be TODAY, not tomorrow.
 * @returns {Promise<Array<{ date: string, forecast: string, rain: boolean, low: number, high: number }>>}
 */
export async function getDayForecast() {
  const data = await getNea('four-day-outlook')

  const days = []
  for (const day of data.records[0].forecasts) {
    days.push({
      date: day.timestamp.slice(0, 10), // "2026-10-10T00:00:00+08:00" → "2026-10-10"
      forecast: day.forecast.summary, // e.g. "Afternoon thundery showers"
      rain: isRain(day.forecast.summary),
      low: day.temperature.low,
      high: day.temperature.high,
    })
  }
  return days
}

// Part (c) Today's forecast
/**
 * Today's forecast for the whole island, same shape as one day of getDayForecast().
 * @returns {Promise<{ date: string, forecast: string, rain: boolean, low: number, high: number }>}
 */
export async function getTodayForecast() {
  const data = await getNea('twenty-four-hr-forecast')
  const record = data.records[0]
  const forecastText = record.general.forecast.text // e.g. "Partly Cloudy (Day)"

  // record.date is the day NEA issued it: after about 11 pm that's yesterday, even though the
  // forecast is for today. So use Singapore's date right now instead ("2026-10-21").
  const todaySg = sgHourKey(new Date()).slice(0, 10)

  return {
    date: todaySg,
    forecast: forecastText,
    rain: isRain(forecastText),
    low: record.general.temperature.low,
    high: record.general.temperature.high,
  }
}

// Part (d) Hourly forecast (Open-Meteo)
/**
 * Hourly forecast at a point, from today up to 16 days ahead.
 * @returns {Promise<Array<{ time: string, temp: number, rainChance: number, humidity: number,
 *   uv: number, condition: string, kind: string }>>} time is Singapore time, e.g. "2026-10-16T19:00"
 */
export async function getHourlyForecast(lat, lng) {
  const response = await axios.get(OPEN_METEO_URL, {
    params: {
      latitude: lat,
      longitude: lng,
      hourly:
        'temperature_2m,precipitation_probability,relative_humidity_2m,uv_index,weather_code,is_day',
      timezone: 'Asia/Singapore',
      forecast_days: 16,
    },
  })
  const hourly = response.data.hourly

  // Open-Meteo sends one list per measurement; hour i is position i in every list
  const hours = []
  for (let i = 0; i < hourly.time.length; i++) {
    const condition = wmoText(hourly.weather_code[i])
    hours.push({
      time: hourly.time[i],
      temp: Math.round(hourly.temperature_2m[i]),
      rainChance: hourly.precipitation_probability[i] ?? 0,
      humidity: hourly.relative_humidity_2m[i],
      uv: Math.round(hourly.uv_index[i] ?? 0),
      condition: condition,
      kind: weatherKind(condition, hourly.is_day[i] === 1),
    })
  }
  return hours
}

// Part (d2) Will it rain? For the "indoor only if it rains" filter on 09 Nearby spots (Hugo)
/**
 * Whether rain is likely at a place and time, from Open-Meteo's hourly forecast.
 * @param {string | Date} [when] the hangout time; leave out for "now"
 * @param {number} [threshold] % chance of rain that counts as "likely" (default 50)
 * @returns {Promise<{ rain: boolean, chance: number, condition: string } | null>}
 *   null when that time isn't in the forecast (in the past, or more than ~16 days ahead)
 */
export async function willRainAt(lat, lng, when, threshold = 50) {
  const hours = await getHourlyForecast(lat, lng)
  let time = new Date()
  if (when) {
    time = when
  }
  const hour = hours.find((h) => h.time === sgHourKey(time))
  if (!hour) {
    return null
  }
  const rain = hour.rainChance >= threshold || isRain(hour.condition)
  return { rain: rain, chance: hour.rainChance, condition: hour.condition }
}

// Part (e) Haze
/**
 * Haze right now: the 24-hour PSI for the region (north/south/east/west/central) nearest a point.
 * Without a point, the worst region (NEA has no island-wide number).
 * NEA has no haze forecast, so this is always the latest reading.
 * @returns {Promise<{ region: string, psi: number, level: string, tone: 'good' | 'moderate' | 'bad' }>}
 */
export async function getHaze(lat, lng) {
  const data = await getNea('psi')
  const readings = data.items[0].readings.psi_twenty_four_hourly // { north: 127, south: 162, ... }

  let region = ''
  if (lat == null || lng == null) {
    // no point given: use the region with the highest PSI
    for (const name of Object.keys(readings)) {
      if (region === '' || readings[name] > readings[region]) {
        region = name
      }
    }
  } else {
    const regions = []
    for (const r of data.regionMetadata) {
      regions.push({ name: r.name, lat: r.labelLocation.latitude, lng: r.labelLocation.longitude })
    }
    region = nearestArea(regions, lat, lng).name
  }

  const psi = readings[region]
  const band = psiLevel(psi)
  return { region: region, psi: psi, level: band.level, tone: band.tone }
}

// ── Helpers ──

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
  // Singapore is always 8 hours ahead of UTC, so add 8 hours and read the UTC time
  const sgTime = new Date(new Date(when).getTime() + 8 * 60 * 60 * 1000)
  return sgTime.toISOString().slice(0, 13) + ':00'
}

/** "2026-10-16T19:00" → "7 PM" */
export function hourLabel(hourKey) {
  const hour = Number(hourKey.slice(11, 13))
  let hour12 = hour % 12
  if (hour12 === 0) hour12 = 12
  if (hour < 12) return `${hour12} AM`
  return `${hour12} PM`
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
    const dist = (area.lat - lat) ** 2 + (area.lng - lng) ** 2
    if (dist < bestDist) {
      best = area
      bestDist = dist
    }
  }
  return best
}

/** True if a forecast text means rain, e.g. "Thundery Showers". Used for "indoor when raining". */
export function isRain(forecast) {
  const text = forecast.toLowerCase()
  return (
    text.includes('rain') ||
    text.includes('shower') ||
    text.includes('thunder') ||
    text.includes('drizzle')
  )
}

/**
 * Which icon to draw for a forecast text (NEA's or Open-Meteo's):
 * 'sun' | 'night' | 'partly' | 'cloud' | 'rain' | 'thunder' | 'haze'
 */
export function weatherKind(forecast, isDay = true) {
  const text = forecast.toLowerCase()
  if (text.includes('thunder')) return 'thunder'
  if (isRain(text)) return 'rain'
  if (text.includes('haz') || text.includes('mist') || text.includes('fog')) return 'haze'
  if (text.includes('partly') || text.includes('mainly clear')) return 'partly'
  if (text.includes('cloud') || text.includes('overcast')) return 'cloud'
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
