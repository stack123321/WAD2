// Owner: Ryan
// dates in singapore time, shared by the dashboard and the hangout card.
// a phone set to another time zone would otherwise show the wrong day, so every function here asks for singapore time.
const SG = 'Asia/Singapore' // the time zone name the browser understands
const DAY = 24 * 60 * 60 * 1000 // one day in milliseconds (singapore has no daylight saving)

// "2026-10-16", so two dates can be compared as text
export function sgDate(date) {
  return date.toLocaleDateString('en-CA', { timeZone: SG }) // en-CA writes dates as year-month-day
}

// "Fri 16 Oct"
export function shortDate(date) {
  const weekday = date.toLocaleDateString('en-SG', { weekday: 'short', timeZone: SG }) // "Fri"
  const day = date.toLocaleDateString('en-SG', { day: 'numeric', timeZone: SG }) // "16"
  const month = date.toLocaleDateString('en-SG', { month: 'short', timeZone: SG }) // "Oct"
  // built from 3 parts because asking for all 3 at once adds a comma ("Fri, 16 Oct")
  return `${weekday} ${day} ${month}`
}

// true when date falls on the day after now, in singapore time
function isTomorrow(date, now) {
  return sgDate(date) === sgDate(new Date(now.getTime() + DAY)) // compare with now plus one day
}

// the heading above a day's hangouts: { main: 'Tomorrow', sub: 'Thu 22 Oct' } or { main: 'Fri 23 Oct', sub: '' }
// now has a default so tests can pass in a fixed time
export function dayHeading(date, now = new Date()) {
  const key = sgDate(date) // the hangout's day as "2026-10-16"
  if (key === sgDate(now)) return { main: 'Today', sub: shortDate(date) } // same day as now
  if (isTomorrow(date, now)) {
    return { main: 'Tomorrow', sub: shortDate(date) }
  }
  return { main: shortDate(date), sub: '' } // any other day: just the date, no second line
}

// the chip on the UP NEXT card: "Today · in 11 hours", "Today · in 25 minutes", "Tomorrow · 7:00 pm" or "In 4 days"
export function countdownLabel(date, now = new Date()) {
  const key = sgDate(date)
  // "7:00 pm", only shown for tomorrow
  const time = date.toLocaleTimeString('en-SG', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: SG,
  })
  if (key === sgDate(now)) {
    // today: count down in minutes, at least 1 so it never says "in 0 minutes"
    const minutes = Math.max(1, Math.round((date.getTime() - now.getTime()) / 60000))
    if (minutes < 60) return `Today · in ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}` // "1 minute", not "1 minutes"
    const hours = Math.round(minutes / 60) // an hour or more away: round to whole hours
    return `Today · in ${hours} ${hours === 1 ? 'hour' : 'hours'}`
  }
  if (isTomorrow(date, now)) return `Tomorrow · ${time}`
  // further away: whole days between the two dates, counted from midnight so the time of day doesn't matter
  const days = Math.round((new Date(key).getTime() - new Date(sgDate(now)).getTime()) / DAY)
  return `In ${days} days`
}
