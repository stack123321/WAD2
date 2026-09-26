// Owner: Surya. NEA forecasts from data.gov.sg (no key needed). Weather cards on 04, 08, 10, 12.
// Docs: https://guide.data.gov.sg/ (search "2-hour weather forecast" and "4-day weather forecast")
import sample from '@/mocks/weather.json'

/**
 * 2-hour forecast for the NEA area nearest a point.
 * @returns {Promise<{ area: string, forecast: string, rain: boolean, validUntil: string }>}
 */
export async function getTwoHourForecast(lat, lng) {
  // ── Sample data until the real call is built ──
  // TODO(Surya): fetch the 2-hour forecast; NEA also returns each area's position, so
  // nearestArea() below works on the real data too.
  const area = nearestArea(sample.areas, lat, lng)
  const validUntil = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
  return { area: area.name, forecast: area.forecast, rain: isRain(area.forecast), validUntil }
}

/**
 * Outlook for the next 4 days, for the week strip on 04 Dashboard.
 * @returns {Promise<Array<{ date: string, forecast: string, rain: boolean, low: number, high: number }>>}
 */
export async function getDayForecast() {
  // ── Sample data until the real call is built ──
  // TODO(Surya): fetch the 4-day outlook and map it to the same shape.
  return sample.outlook.map((day, i) => {
    const date = new Date(Date.now() + (i + 1) * 24 * 60 * 60 * 1000)
    return { date: date.toISOString().slice(0, 10), rain: isRain(day.forecast), ...day }
  })
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
