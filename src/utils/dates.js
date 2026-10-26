// Owner: Ryan
// dates in Singapore time, shared by the dashboard and the hangout card
const SG = 'Asia/Singapore'
const DAY = 24 * 60 * 60 * 1000 // one day in milliseconds (singapore has no daylight saving)

// "2026-10-16", so two dates can be compared as text
export function sgDate(date) {
  return date.toLocaleDateString('en-CA', { timeZone: SG })
}

// "Fri 16 Oct"
export function shortDate(date) {
  const weekday = date.toLocaleDateString('en-SG', { weekday: 'short', timeZone: SG })
  const day = date.toLocaleDateString('en-SG', { day: 'numeric', timeZone: SG })
  const month = date.toLocaleDateString('en-SG', { month: 'short', timeZone: SG })
  return `${weekday} ${day} ${month}`
}

// true when date falls on the day after now, in singapore time
function isTomorrow(date, now) {
  return sgDate(date) === sgDate(new Date(now.getTime() + DAY))
}

// the heading above a day's hangouts: { main: 'Tomorrow', sub: 'Thu 22 Oct' } or { main: 'Fri 23 Oct', sub: '' }
export function dayHeading(date, now = new Date()) {
  const key = sgDate(date)
  if (key === sgDate(now)) return { main: 'Today', sub: shortDate(date) }
  if (isTomorrow(date, now)) {
    return { main: 'Tomorrow', sub: shortDate(date) }
  }
  return { main: shortDate(date), sub: '' }
}

// the chip on the UP NEXT card: "Today · in 11 hours", "Today · in 25 minutes", "Tomorrow · 7:00 pm" or "In 4 days"
export function countdownLabel(date, now = new Date()) {
  const key = sgDate(date)
  const time = date.toLocaleTimeString('en-SG', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: SG,
  })
  if (key === sgDate(now)) {
    const minutes = Math.max(1, Math.round((date.getTime() - now.getTime()) / 60000))
    if (minutes < 60) return `Today · in ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`
    const hours = Math.round(minutes / 60)
    return `Today · in ${hours} ${hours === 1 ? 'hour' : 'hours'}`
  }
  if (isTomorrow(date, now)) return `Tomorrow · ${time}`
  const days = Math.round((new Date(key).getTime() - new Date(sgDate(now)).getTime()) / DAY)
  return `In ${days} days`
}
