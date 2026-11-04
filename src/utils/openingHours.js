// Opening hours on one day, from Google's opening-hours periods.

const SG_OFFSET_MS = 8 * 60 * 60 * 1000

/** The date shifted to Singapore time, so the UTC getters read Singapore's clock. */
function toSingapore(date) {
  return new Date(new Date(date).getTime() + SG_OFFSET_MS)
}

function formatTime({ hour, minute }) {
  const suffix = hour >= 12 ? 'pm' : 'am'
  const hour12 = hour % 12 || 12
  return `${hour12}:${String(minute).padStart(2, '0')} ${suffix}`
}

/**
 * Opening hours on the date's weekday (Singapore time), from Google's opening-hours periods.
 * Returns null when there is no data, otherwise a list like ['9:00 am – 5:00 pm'] (empty if closed).
 */
export function openingHoursOn(openingHours, date) {
  const periods = openingHours?.periods
  if (!periods?.length) return null

  if (periods.some((p) => p.open && !p.close)) return ['Open 24 hours']

  const day = toSingapore(date).getUTCDay()
  return periods
    .filter((p) => p.open?.day === day && p.close)
    .map((p) => `${formatTime(p.open)} – ${formatTime(p.close)}`)
}
