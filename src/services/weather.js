// Owner: Surya. NEA forecasts from data.gov.sg (no key needed). Weather cards on 04, 08, 10, 12.
// Docs: https://guide.data.gov.sg/ (search "2-hour weather forecast" and "24-hour weather forecast")

/**
 * 2-hour forecast for the area nearest a point.
 * @returns {Promise<{ area: string, forecast: string, validUntil: string } | null>}
 */
export async function getTwoHourForecast(_lat, _lng) {
  // TODO(Surya). Drop the _ from the parameter names once you use them.
  return null
}

/** 24-hour outlook for the week strip on 04 Dashboard. */
export async function getDayForecast() {
  // TODO(Surya)
  return null
}
